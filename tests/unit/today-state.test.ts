import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyTodayFacts,
  liveTimingState,
  resolveTodayState,
  type TodayFacts,
  type TodayPrimaryState,
} from '../../src/application/shell/today-state.ts';
import type { BreakAttemptStatus } from '../../src/domain/breaks/break-attempt.ts';
import type { AbstinenceTrackStatus } from '../../src/domain/breaks/abstinence-track.ts';
import type { QuestionnaireProgressRecord } from '../../src/application/progress/questionnaire-progress.ts';
import { toInstant } from '../../src/domain/schemas/time.ts';

const DRAFT: QuestionnaireProgressRecord = {
  schemaVersion: 'questionnaire-draft-v2',
  answeredSteps: 3,
  updatedAt: toInstant(1787184000000),
  currentStep: 'Q3',
  answers: { goal: 'tolerance_reset', thcUseDaysLast30: 10, lastUseAt: '2026-08-18T12:00:00Z' },
};

function facts(overrides: Partial<TodayFacts> = {}): TodayFacts {
  return { ...emptyTodayFacts(), ...overrides };
}

function attempt(status: BreakAttemptStatus): TodayFacts['attempt'] {
  return { status };
}

function tracking(status: AbstinenceTrackStatus): TodayFacts['tracking'] {
  return { status };
}

describe('Today router: primary state precedence (UX_SPEC 3.2)', () => {
  it('resolves first-launch when nothing is stored at all', () => {
    const view = resolveTodayState(facts());
    assert.equal(view.primary, 'first-launch');
    assert.equal(view.resume, 'none');
  });

  it('treats a persisted draft as data (returning user, no-profile)', () => {
    const view = resolveTodayState(facts({ draft: DRAFT }));
    assert.equal(view.primary, 'no-profile');
  });

  it('resolves no-profile for returning users who never finished a questionnaire', () => {
    const view = resolveTodayState(facts({ hasAnyData: true }));
    assert.equal(view.primary, 'no-profile');
  });

  it('resolves detection-only only when no profile or tracking exists', () => {
    assert.equal(resolveTodayState(facts({ detectionOnly: true })).primary, 'detection-only');
    // Once a profile or tracking exists, those states win (detection -> History).
    assert.equal(
      resolveTodayState(facts({ detectionOnly: true, hasProfile: true })).primary,
      'profile-no-break',
    );
    assert.equal(
      resolveTodayState(facts({ detectionOnly: true, tracking: tracking('tracking') })).primary,
      'abstinence-tracking',
    );
  });

  it('resolves profile-no-break for a saved result with no active attempt', () => {
    assert.equal(resolveTodayState(facts({ hasAnyData: true, hasProfile: true })).primary, 'profile-no-break');
  });

  it('keeps live tracking above profile-no-break', () => {
    const view = resolveTodayState(facts({ hasAnyData: true, hasProfile: true, tracking: tracking('tracking') }));
    assert.equal(view.primary, 'abstinence-tracking');
  });

  it('gives an active break precedence over tracking and profile', () => {
    const view = resolveTodayState(
      facts({ hasAnyData: true, hasProfile: true, tracking: tracking('tracking'), attempt: attempt('active') }),
    );
    assert.equal(view.primary, 'active-break');
  });

  it('gives an interrupted attempt precedence over everything else', () => {
    const view = resolveTodayState(
      facts({ hasProfile: true, attempt: attempt('interrupted_time_needed') }),
    );
    assert.equal(view.primary, 'interrupted');
  });

  it('treats paused open-ended tracking as interrupted too (timing suspended)', () => {
    const view = resolveTodayState(facts({ hasProfile: true, tracking: tracking('interrupted_time_needed') }));
    assert.equal(view.primary, 'interrupted');
    assert.equal(liveTimingState(facts({ tracking: tracking('interrupted_time_needed') })), true);
  });

  it('shows completed-break until acknowledged; acknowledged attempts leave Today', () => {
    const unacknowledged = resolveTodayState(facts({ hasProfile: true, tracking: tracking('tracking'), attempt: attempt('completed') }));
    assert.equal(unacknowledged.primary, 'completed-break');
    // An acknowledged completed attempt is excluded from facts by the loader,
    // so Today falls back to the profile state.
    const acknowledged = resolveTodayState(facts({ hasAnyData: true, hasProfile: true }));
    assert.equal(acknowledged.primary, 'profile-no-break');
  });

  it('lets planned and ended attempts fall through to the profile state', () => {
    assert.equal(resolveTodayState(facts({ hasProfile: true, attempt: attempt('planned') })).primary, 'profile-no-break');
    assert.equal(resolveTodayState(facts({ hasProfile: true, attempt: attempt('ended') })).primary, 'profile-no-break');
    assert.equal(
      resolveTodayState(facts({ hasAnyData: true, attempt: attempt('completed') })).primary,
      'completed-break',
    );
  });

  it('lets ended tracking fall through to the profile state', () => {
    assert.equal(resolveTodayState(facts({ hasProfile: true, tracking: tracking('ended') })).primary, 'profile-no-break');
  });
});

describe('Today router: questionnaire resume placement (UX_SPEC 3.2)', () => {
  it('renders no resume card without a draft', () => {
    assert.equal(resolveTodayState(facts({ hasProfile: true })).resume, 'none');
  });

  it('keeps an active or interrupted attempt primary and places resume secondary', () => {
    for (const status of ['active', 'interrupted_time_needed'] as const) {
      const view = resolveTodayState(facts({ attempt: attempt(status), draft: DRAFT }));
      assert.equal(view.resume, 'secondary', status);
      assert.equal(view.primary, status === 'active' ? 'active-break' : 'interrupted');
    }
  });

  it('keeps live or paused tracking primary and places resume secondary', () => {
    for (const status of ['tracking', 'interrupted_time_needed'] as const) {
      const view = resolveTodayState(facts({ tracking: tracking(status), draft: DRAFT }));
      assert.equal(view.resume, 'secondary', status);
      assert.equal(liveTimingState(facts({ tracking: tracking(status) })), true, status);
    }
  });

  it('lets the resume card replace the primary state card otherwise', () => {
    const cases: TodayFacts[] = [
      facts({ draft: DRAFT }), // no-profile (draft is data)
      facts({ hasAnyData: true, draft: DRAFT }), // no-profile
      facts({ detectionOnly: true, draft: DRAFT }), // detection-only
      facts({ hasProfile: true, draft: DRAFT }), // profile-no-break
      facts({ attempt: attempt('planned'), draft: DRAFT }), // planned attempt
      facts({ tracking: tracking('ended'), draft: DRAFT }), // ended tracking
    ];
    for (const input of cases) {
      const view = resolveTodayState(input);
      assert.equal(view.resume, 'replaces-primary', view.primary);
    }
  });

  it('keeps a completed-unacknowledged card primary so acknowledgement stays reachable', () => {
    const view = resolveTodayState(facts({ attempt: attempt('completed'), draft: DRAFT }));
    assert.equal(view.primary, 'completed-break');
    assert.equal(view.resume, 'secondary');
  });

  it('is deterministic for equal facts', () => {
    const a = resolveTodayState(facts({ hasProfile: true, draft: DRAFT }));
    const b = resolveTodayState(facts({ hasProfile: true, draft: DRAFT }));
    assert.deepEqual(a, b);
  });
});

describe('Today router: every documented state is reachable', () => {
  const reachable: Array<{ facts: TodayFacts; expected: TodayPrimaryState }> = [
    { facts: facts(), expected: 'first-launch' },
    { facts: facts({ hasAnyData: true }), expected: 'no-profile' },
    { facts: facts({ detectionOnly: true }), expected: 'detection-only' },
    { facts: facts({ hasProfile: true }), expected: 'profile-no-break' },
    { facts: facts({ tracking: tracking('tracking') }), expected: 'abstinence-tracking' },
    { facts: facts({ attempt: attempt('active') }), expected: 'active-break' },
    { facts: facts({ attempt: attempt('interrupted_time_needed') }), expected: 'interrupted' },
    { facts: facts({ tracking: tracking('interrupted_time_needed') }), expected: 'interrupted' },
    { facts: facts({ attempt: attempt('completed') }), expected: 'completed-break' },
  ];
  for (const { facts: input, expected } of reachable) {
    it(`reaches ${expected}`, () => {
      assert.equal(resolveTodayState(input).primary, expected);
    });
  }
});
