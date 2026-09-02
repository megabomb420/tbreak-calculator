import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildTodayFacts } from '../../src/application/break/today-model.ts';
import { emptySessionState, type BreakSessionState } from '../../src/application/break/break-session.ts';
import type { TodayFacts } from '../../src/application/shell/today-state.ts';
import { MILLIS_PER_DAY, toInstant, type Instant } from '../../src/domain/schemas/time.ts';

const C0: Instant = toInstant(1787184000000);
const ANCHOR: Instant = toInstant(C0 - 3 * MILLIS_PER_DAY);

function attemptState(
  status: 'planned' | 'active' | 'interrupted_time_needed' | 'completed' | 'ended',
  acknowledged = false,
): BreakSessionState {
  const base = emptySessionState();
  return {
    ...base,
    attempts: [
      {
        id: 'attempt-1',
        status,
        calculationRecordId: 'calc-1',
        targetDurationDays: 21,
        postBreakMode: 'occasional',
        startedAt: C0,
        segments: status === 'planned' ? [] : [{ startedFromLastUseAt: ANCHOR, endedAt: null, endReason: null }],
        postBreakPlan: { mode: 'occasional', maxUseDaysPerWeek: 2 },
        completionAcknowledged: acknowledged,
        createdAt: C0,
        updatedAt: C0,
      },
    ],
  };
}

function trackState(status: 'tracking' | 'interrupted_time_needed' | 'ended'): BreakSessionState {
  const base = emptySessionState();
  return {
    ...base,
    tracking: [
      {
        id: 'track-1',
        calculationRecordId: 'calc-1',
        status,
        startedAt: C0,
        segments: status === 'ended'
          ? [{ startedFromLastUseAt: ANCHOR, endedAt: C0, endReason: 'user_ended' }]
          : [{ startedFromLastUseAt: ANCHOR, endedAt: null, endReason: null }],
        createdAt: C0,
        updatedAt: C0,
      },
    ],
  };
}

function build(session: BreakSessionState, snapshotFacts: Partial<Pick<TodayFacts, 'hasAnyData' | 'hasProfile' | 'detectionOnly'>> = { hasAnyData: true, hasProfile: true }) {
  return buildTodayFacts({ snapshotFacts, attempts: session.attempts, tracking: session.tracking, draft: null });
}

describe('Today facts from records', () => {
  it('maps a live active attempt to the active-break fact', () => {
    const facts = build(attemptState('active'));
    assert.deepEqual(facts.attempt, { status: 'active' });
    assert.equal(facts.tracking, null);
  });

  it('maps live tracking to the tracking fact', () => {
    const facts = build(trackState('tracking'));
    assert.deepEqual(facts.tracking, { status: 'tracking' });
    assert.equal(facts.attempt, null);
  });

  it('excludes acknowledged completed attempts and ended attempts', () => {
    const acknowledged = build(attemptState('completed', true));
    assert.equal(acknowledged.attempt, null);
    const ended = build(attemptState('ended'));
    assert.equal(ended.attempt, null);
  });

  it('keeps an unacknowledged completed attempt visible for the completion card', () => {
    const facts = build(attemptState('completed'));
    assert.deepEqual(facts.attempt, { status: 'completed' });
  });

  it('excludes ended tracking from the tracking fact', () => {
    const facts = build(trackState('ended'));
    assert.equal(facts.tracking, null);
  });

  it('keeps paused tracking visible so the router can surface interrupted', () => {
    const facts = build(trackState('interrupted_time_needed'));
    assert.deepEqual(facts.tracking, { status: 'interrupted_time_needed' });
  });

  it('merges snapshot facts with a draft', () => {
    const draft = {
      schemaVersion: 'questionnaire-draft-v2' as const,
      answeredSteps: 2,
      updatedAt: C0,
      currentStep: 'Q2' as const,
      answers: { goal: 'tolerance_reset' as const },
    };
    const facts = buildTodayFacts({
      snapshotFacts: { hasAnyData: true, detectionOnly: true },
      attempts: [],
      tracking: [],
      draft,
    });
    assert.equal(facts.detectionOnly, true);
    assert.equal(facts.draft, draft);
    assert.equal(facts.attempt, null);
  });

  it('produces an empty first-launch fact set when nothing is stored', () => {
    const facts = buildTodayFacts({ snapshotFacts: {}, attempts: [], tracking: [], draft: null });
    assert.deepEqual(facts, {
      hasAnyData: false,
      attempt: null,
      tracking: null,
      hasProfile: false,
      detectionOnly: false,
      draft: null,
    });
  });

  it('is deterministic for equal records', () => {
    const a = build(attemptState('active'));
    const b = build(attemptState('active'));
    assert.deepEqual(a, b);
  });
});
