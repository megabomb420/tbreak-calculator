// 0.11.0 regression tests: completed Today state system.
//
// Covers the target-reached vs beyond-plan distinction, the interrupted
// preserved-progress note, and companion/check-in separation
// symptoms step. Presentation-only; no engine/domain behaviour is asserted.

import { fireEvent, render, screen, within } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/ui/app.tsx';
import { INTERRUPTED_CARD } from '../../src/ui/break-copy.ts';
import { RESET_MODE, RESET_EVIDENCE } from '../../src/ui/recovery-copy.ts';
import { createMemoryStorage, type StorageAdapter } from '../../src/infrastructure/storage/storage-adapter.ts';
import { fixedClock } from '../../src/infrastructure/clock.ts';
import { toInstant, type Instant } from '../../src/domain/schemas/time.ts';
import type { UseProfileInput } from '../../src/domain/schemas/profile.ts';
import type { RawAnswerSnapshot } from '../../src/application/questionnaire/snapshot.ts';
import {
  createQuestionnaireSnapshotStore,
  QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION,
} from '../../src/application/progress/questionnaire-snapshot.ts';
import { createResultViewStore, RESULT_VIEW_SCHEMA_VERSION } from '../../src/application/progress/result-view.ts';
import {
  createBreakAttemptsStore,
  type StoredAttempt,
} from '../../src/application/progress/break-attempt-record.ts';
import { createTrackingRecordsStore, type StoredTrack } from '../../src/application/progress/tracking-record.ts';
import { createCalculationRecordsStore, freezeCalculation } from '../../src/application/persistence/calculation-record.ts';

const AT: Instant = toInstant(1787184000000); // 2026-08-20T00:00:00Z
const clock = fixedClock(AT);

function renderApp(storage: StorageAdapter = createMemoryStorage()) {
  return render(<App storage={storage} clock={clock} />);
}

function profile(lastUseAt: string): UseProfileInput {
  return {
    goal: 'tolerance_reset',
    breakRequested: true,
    postBreakMode: null,
    thcUseDaysLast30: { value: 10, provenance: 'user_estimate' },
    sessionsPerUseDay: { value: 1, provenance: 'user_estimate' },
    products: ['flower'],
    routes: ['smoking'],
    lastUseAt: { value: lastUseAt, provenance: 'user_estimate' },
    previousBreaks: [],
  };
}

function seedSnapshot(storage: StorageAdapter, snapshot: RawAnswerSnapshot): void {
  createQuestionnaireSnapshotStore(storage).save({
    schemaVersion: QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION,
    snapshot,
    updatedAt: AT,
  });
  createResultViewStore(storage).save({
    schemaVersion: RESULT_VIEW_SCHEMA_VERSION,
    status: 'acknowledged',
    updatedAt: AT,
  });
}

function seedAttempt(storage: StorageAdapter, attempt: StoredAttempt): void {
  createBreakAttemptsStore(storage).save({ schemaVersion: 'break-attempts-v1', attempts: [attempt] });
}

function activeAttempt(overrides: Partial<StoredAttempt> = {}): StoredAttempt {
  return {
    id: 'attempt-1',
    status: 'active',
    calculationRecordId: 'run-1',
    targetDurationDays: 4,
    postBreakMode: 'occasional',
    startedAt: AT,
    // Anchor three days before AT => abstinence day 4 at AT.
    segments: [{ startedFromLastUseAt: toInstant(1786924800000), endedAt: null, endReason: null }],
    postBreakPlan: { mode: 'occasional', maxUseDaysPerWeek: 2 },
    preparation: null,
    completionAcknowledged: false,
    createdAt: AT,
    updatedAt: AT,
    ...overrides,
  };
}

const REACHED_NOTE = /reached your 4-day planning target.*not proof that tolerance has fully reset/i;
const EXTENDED_NOTE = /past your \d+-day plan.*does not estimate further recovery/i;

describe('Today phase states (0.11)', () => {
  it('shows target reached only after the full target duration has elapsed', () => {
    const storage = createMemoryStorage();
    seedSnapshot(storage, { kind: 'use_profile', profile: profile('2026-08-17T00:00:00Z') });
    seedAttempt(storage, activeAttempt({ targetDurationDays: 4, segments: [{ startedFromLastUseAt: toInstant(AT - 4 * 86400000), endedAt: null, endReason: null }] }));
    renderApp(storage);
    const view = screen.getByTestId('today-view');
    expect(view.getAttribute('data-primary')).toBe('active-break');
    // At four full elapsed days, completion and the reached message agree.
    expect(view.getAttribute('data-phase')).toBe('reached');
    expect(screen.getByTestId('break-phase-eyebrow').textContent).toBe('Plan target reached');
    expect(screen.getByTestId('break-day-label').textContent).toBe('Day 5 · 4-day plan');
    const note = screen.getByTestId('plan-target-note');
    expect(note.getAttribute('data-state')).toBe('reached');
    expect(note.textContent ?? '').toMatch(REACHED_NOTE);
  });

  it('shows a distinct beyond-plan state once the day passes the target', () => {
    const storage = createMemoryStorage();
    seedSnapshot(storage, { kind: 'use_profile', profile: profile('2026-08-17T00:00:00Z') });
    seedAttempt(storage, activeAttempt({ targetDurationDays: 2 }));
    renderApp(storage);
    const view = screen.getByTestId('today-view');
    expect(view.getAttribute('data-phase')).toBe('extended');
    expect(screen.getByTestId('break-phase-eyebrow').textContent).toBe('Beyond the plan');
    expect(screen.getByTestId('break-day-label').textContent).toBe('Day 4 · 2-day plan');
    const note = screen.getByTestId('plan-target-note');
    expect(note.getAttribute('data-state')).toBe('extended');
    expect(note.textContent ?? '').toMatch(EXTENDED_NOTE);
  });

  it('marks the interrupted card as calm and recoverable with progress preserved', () => {
    const storage = createMemoryStorage();
    seedSnapshot(storage, { kind: 'use_profile', profile: profile('2026-08-17T00:00:00Z') });
    seedAttempt(storage, activeAttempt({ status: 'interrupted_time_needed' }));
    renderApp(storage);
    const view = screen.getByTestId('today-view');
    expect(view.getAttribute('data-primary')).toBe('interrupted');
    expect(screen.getByTestId('state-interrupted').textContent ?? '').toMatch(new RegExp(INTERRUPTED_CARD.preserved.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    expect(screen.getByTestId('confirm-when-cta')).toBeTruthy();
  });

  it('renders Today without the page-level decorative interval background (0.11.1)', () => {
    const storage = createMemoryStorage();
    seedSnapshot(storage, { kind: 'use_profile', profile: profile('2026-08-17T00:00:00Z') });
    seedAttempt(storage, activeAttempt());
    renderApp(storage);
    // No page-level orbit wallpaper behind the Today content; the phase state
    // attribute that drives card copy is still present.
    expect(screen.getByTestId('today-view').getAttribute('data-phase')).toBe('approaching');
    expect(screen.queryByTestId('mark-complete-cta')).toBeNull();
    expect(document.querySelector('.interval-field')).toBeNull();
    expect(document.querySelector('.interval-field-orbit')).toBeNull();
    // The active card and its primary action still render.
    expect(screen.getByTestId('state-active-break')).toBeTruthy();
    expect(screen.getByTestId('checkin-cta')).toBeTruthy();
  });

  it('keeps the check-in symptom flow independent from companion preferences', () => {
    const storage = createMemoryStorage();
    const snapshot: RawAnswerSnapshot = {
      kind: 'use_profile',
      profile: profile('2026-08-17T00:00:00Z'),
    };
    seedSnapshot(storage, snapshot);
    seedAttempt(storage, activeAttempt());
    renderApp(storage);
    fireEvent.click(screen.getByTestId('add-symptoms'));
    const flow = screen.getByTestId('checkin-flow');
    expect(flow.getAttribute('data-screen')).toBe('symptoms');
    expect(screen.queryByTestId('checkin-focus-line')).toBeNull();
    const fields = [...flow.querySelectorAll('[data-testid^="symptom-"]')]
      .map((el) => el.getAttribute('data-testid'))
      .filter((id) => id !== null && /^symptom-(craving|sleep|irritability|anxiety|appetite)$/.test(id));
    expect(fields[0]).toBe('symptom-craving');
  });
});

// Regression: the Recovery outlook stays reachable while a calculated break is
// the primary Today card. It is the frozen record's own view behind a closed
// disclosure, so Today reads as the practical card by default.
describe('Recovery outlook on the active-break card', () => {
  function toleranceProfile(): UseProfileInput {
    return {
      goal: 'tolerance_reset',
      breakRequested: true,
      postBreakMode: null,
      thcUseDaysLast30: { value: 10, provenance: 'user_estimate' },
      sessionsPerUseDay: { value: 1, provenance: 'user_estimate' },
      products: ['flower'],
      routes: ['smoking'],
      lastUseAt: { value: new Date(AT - 2 * 86400000).toISOString(), provenance: 'user_estimate' },
      currentPatternDuration: { value: '1_to_6_months', provenance: 'user_estimate' },
      previousBreaks: [],
    };
  }

  /** Acknowledged use profile with its frozen calculation record (run-1). */
  function seedCalculatedBreak(
    storage: StorageAdapter,
    mutate?: (record: ReturnType<typeof freezeCalculation>) => ReturnType<typeof freezeCalculation>,
  ): void {
    const snapshot = { kind: 'use_profile' as const, profile: toleranceProfile() };
    createQuestionnaireSnapshotStore(storage).save({
      schemaVersion: QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION,
      snapshot,
      updatedAt: AT,
      runId: 'run-1',
    });
    createResultViewStore(storage).save({
      schemaVersion: RESULT_VIEW_SCHEMA_VERSION,
      status: 'acknowledged',
      updatedAt: AT,
    });
    const frozen = freezeCalculation('run-1', snapshot, AT);
    createCalculationRecordsStore(storage).save({
      schemaVersion: 'calculation-records-v1',
      records: [mutate === undefined ? frozen : mutate(frozen)],
      corrupt: [],
    });
  }

  function seedTrack(storage: StorageAdapter, track: StoredTrack): void {
    createTrackingRecordsStore(storage).save({ schemaVersion: 'tracking-records-v1', records: [track] });
  }

  it('opens the frozen outlook from a calculated break that is running now', () => {
    const storage = createMemoryStorage();
    seedCalculatedBreak(storage);
    seedAttempt(storage, activeAttempt({
      segments: [{ startedFromLastUseAt: toInstant(AT - 2 * 86400000), endedAt: null, endReason: null }],
    }));
    renderApp(storage);
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('active-break');
    const card = screen.getByTestId('state-active-break');
    // The outlook opens as its own sheet from the footer, never inline on the
    // card: the card's last block is the preparation button.
    expect(within(card).queryByTestId('today-outlook')).toBeNull();
    const opener = within(card).getByTestId('open-outlook');
    expect(opener.textContent).toBe(RESET_MODE.reset);
    expect(document.activeElement).not.toBe(opener);
    fireEvent.click(opener);
    const sheet = screen.getByTestId('today-outlook');
    expect(sheet.getAttribute('role')).toBe('dialog');
    expect(within(sheet).getByTestId('reset-window-value').textContent).toBe('About 1–2 weeks');
    expect(within(sheet).getByTestId('reset-target-day').textContent).toBe('7 days');
    const evidence = within(sheet).getByTestId('reset-evidence');
    expect(evidence.hasAttribute('open')).toBe(false);
    fireEvent.click(within(evidence).getByText(RESET_EVIDENCE.summary));
    expect(evidence.hasAttribute('open')).toBe(true);
    expect(evidence.textContent).toMatch(/D'Souza/i);
  });

  it('shows no outlook for a chosen-duration break, which owns no record', () => {
    const storage = createMemoryStorage();
    seedCalculatedBreak(storage);
    seedAttempt(storage, activeAttempt({ calculationRecordId: null, targetSource: 'chosen' }));
    renderApp(storage);
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('active-break');
    expect(screen.getByTestId('break-day-label').textContent).toBe('Day 4 of 4');
    expect(screen.queryByTestId('today-outlook')).toBeNull();
    expect(screen.queryByTestId('open-outlook')).toBeNull();
  });

  it('shows no outlook on an open-ended tracking plan', () => {
    const storage = createMemoryStorage();
    seedCalculatedBreak(storage);
    seedTrack(storage, {
      id: 'track-1',
      calculationRecordId: 'run-1',
      status: 'tracking',
      startedAt: AT,
      segments: [{ startedFromLastUseAt: toInstant(AT - 2 * 86400000), endedAt: null, endReason: null }],
      preparation: null,
      createdAt: AT,
      updatedAt: AT,
    });
    renderApp(storage);
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('abstinence-tracking');
    expect(screen.getByTestId('state-abstinence-tracking')).toBeTruthy();
    expect(screen.queryByTestId('today-outlook')).toBeNull();
    expect(screen.queryByTestId('open-outlook')).toBeNull();
    expect(screen.queryByTestId('open-timeline')).toBeNull();
  });

  it('renders the stored v1 outlook for a break owning a pre-v3 record', () => {
    const storage = createMemoryStorage();
    seedCalculatedBreak(storage, (frozen) => {
      const { recoveryOutlookVersion: _recoveryOutlookVersion, ...legacy } = frozen;
      return {
        ...legacy,
        policyVersion: 'tolerance-v1',
        result: { type: 'tolerance', value: { ...frozen.result.value, policyVersion: 'tolerance-v1' } },
      };
    });
    seedAttempt(storage, activeAttempt());
    renderApp(storage);
    fireEvent.click(screen.getByTestId('open-outlook'));
    const sheet = screen.getByTestId('today-outlook');
    expect(within(sheet).getByTestId('reset-v1-historical')).toBeTruthy();
    expect(within(sheet).getByTestId('reset-target-day').textContent).toBe('Day 7');
    // The running plan is live, so it never carries the History context label.
    expect(within(sheet).queryByTestId('reset-context-label')).toBeNull();
  });
});

// 0.31.0: Today is a daily helper. One card acts, the stage, the experiences,
// the timeline and the outlook open on demand, and the person's own plan is the
// action the card leads with.
describe('Today shows one job', () => {
  function seedLiveBreak(overrides: Partial<StoredAttempt> = {}): StorageAdapter {
    const storage = createMemoryStorage();
    seedSnapshot(storage, { kind: 'use_profile', profile: profile('2026-08-17T00:00:00Z') });
    seedAttempt(storage, activeAttempt(overrides));
    return storage;
  }

  it('renders one support card and keeps the stage, the experiences and the journey on demand', () => {
    renderApp(seedLiveBreak());
    const card = screen.getByTestId('state-active-break');
    expect(screen.getAllByTestId('support-card')).toHaveLength(1);
    expect(screen.getByTestId('support-card').getAttribute('data-area')).toBe('cravings');
    // The old stack is gone: no per-area essays, no duplicated practice article
    // and no carousel inside the card.
    expect(screen.queryByTestId('advice-cravings')).toBeNull();
    expect(screen.queryByTestId('advice-routine')).toBeNull();
    expect(within(screen.getByTestId('daily-support')).queryByTestId('community-tip')).toBeNull();
    expect(within(card).queryByTestId('daily-timeline')).toBeNull();
    expect(within(card).queryByTestId('break-journey')).toBeNull();
    expect(document.querySelector('.result-lens-orbit')).toBeNull();
    // Depth is one tap away: the stage block, the experiences and the journey.
    const stage = screen.getByTestId('today-stage');
    expect(stage.hasAttribute('open')).toBe(false);
    expect(within(stage).getByTestId('guidance-headline')).toBeTruthy();
    expect(within(stage).getByTestId('guidance-may-notice')).toBeTruthy();
    fireEvent.click(within(screen.getByTestId('today-experiences')).getByText('Experiences'));
    const community = screen.getByTestId('community-tip');
    expect(community.textContent).toContain('Personal experience');
    expect(within(community).getAllByRole('link')[0]!.getAttribute('href')).toContain('reddit.com/r/Petioles/comments/');
    fireEvent.click(screen.getByTestId('open-timeline'));
    expect(within(screen.getByTestId('timeline-sheet')).getByTestId('break-journey')).toBeTruthy();
  });

  it('writes the urge plan through the app’s own preparation writer and uses it on the card', () => {
    const storage = seedLiveBreak();
    renderApp(storage);
    const opener = screen.getByTestId('edit-preparation');
    expect(opener.textContent).toBe('Set a plan for urges');
    fireEvent.click(opener);
    const sheet = screen.getByTestId('preparation-sheet');
    expect(sheet.getAttribute('role')).toBe('dialog');
    expect(within(sheet).getByTestId('preparation-card')).toBeTruthy();
    fireEvent.click(within(sheet).getByTestId('trigger-weekend'));
    fireEvent.input(within(sheet).getByTestId('replacement-action'), { target: { value: 'make tea' } });
    const stored = createBreakAttemptsStore(storage).load()!.attempts[0]!.preparation;
    expect(stored?.triggerIds).toContain('weekend');
    expect(stored?.replacementAction).toBe('make tea');
    fireEvent.click(within(sheet).getByTestId('preparation-done'));
    expect(screen.queryByTestId('preparation-sheet')).toBeNull();
    // The card now leads with the person's own replacement instead of advice.
    expect(screen.getByTestId('support-action').textContent).toContain('Try your plan first');
    expect(screen.getByTestId('support-action').textContent).toContain('make tea');
    expect(screen.getByTestId('support-trigger').textContent).toContain('You flagged');
    expect(screen.getByTestId('edit-preparation').textContent).toBe('Edit your plan');
  });

  it('leaves the interrupted card without the support stack', () => {
    const storage = createMemoryStorage();
    seedSnapshot(storage, { kind: 'use_profile', profile: profile('2026-08-17T00:00:00Z') });
    seedAttempt(storage, activeAttempt({ status: 'interrupted_time_needed' }));
    renderApp(storage);
    expect(screen.getByTestId('state-interrupted')).toBeTruthy();
    expect(screen.queryByTestId('support-card')).toBeNull();
    expect(screen.queryByTestId('today-stage')).toBeNull();
    expect(document.querySelector('.result-lens-orbit')).toBeNull();
  });
});
