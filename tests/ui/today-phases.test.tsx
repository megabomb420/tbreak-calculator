// 0.11.0 regression tests: completed Today state system.
//
// Covers the target-reached vs beyond-plan distinction, the interrupted
// preserved-progress note, and the support-focus line on the check-in
// symptoms step. Presentation-only; no engine/domain behaviour is asserted.

import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/ui/app.tsx';
import { INTERRUPTED_CARD } from '../../src/ui/break-copy.ts';
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
import { COMPANION_PERSONALISATION_VERSION } from '../../src/application/questionnaire/companion.ts';

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
  it('shows the target-reached state exactly on the plan target day', () => {
    const storage = createMemoryStorage();
    seedSnapshot(storage, { kind: 'use_profile', profile: profile('2026-08-17T00:00:00Z') });
    seedAttempt(storage, activeAttempt({ targetDurationDays: 4 }));
    renderApp(storage);
    const view = screen.getByTestId('today-view');
    expect(view.getAttribute('data-primary')).toBe('active-break');
    // Day 4 of a 4-day plan is "reached", distinct from any later day.
    expect(view.getAttribute('data-phase')).toBe('reached');
    expect(screen.getByTestId('break-phase-eyebrow').textContent).toBe('Plan target reached');
    expect(screen.getByTestId('break-day-label').textContent).toBe('Day 4 of 4');
    const note = screen.getByTestId('plan-target-note');
    expect(note.getAttribute('data-state')).toBe('reached');
    expect(note.textContent ?? '').toMatch(REACHED_NOTE);
  });

  it('shows a distinct beyond-plan state once the day passes the target', () => {
    const storage = createMemoryStorage();
    seedSnapshot(storage, { kind: 'use_profile', profile: profile('2026-08-17T00:00:00Z') });
    seedAttempt(storage, activeAttempt({ targetDurationDays: 3 }));
    renderApp(storage);
    const view = screen.getByTestId('today-view');
    expect(view.getAttribute('data-phase')).toBe('extended');
    expect(screen.getByTestId('break-phase-eyebrow').textContent).toBe('Beyond the plan');
    expect(screen.getByTestId('break-day-label').textContent).toBe('Day 4 · 3-day plan');
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

  it('adds the support-focus line and leads with the matching symptom slider on the check-in', () => {
    const storage = createMemoryStorage();
    const snapshot: RawAnswerSnapshot = {
      kind: 'use_profile',
      profile: profile('2026-08-17T00:00:00Z'),
      companion: { schemaVersion: COMPANION_PERSONALISATION_VERSION, supportFocus: 'sleep' },
    };
    seedSnapshot(storage, snapshot);
    seedAttempt(storage, activeAttempt());
    renderApp(storage);
    fireEvent.click(screen.getByTestId('checkin-cta'));
    expect(screen.getByTestId('checkin-flow')).toBeTruthy();
    fireEvent.click(screen.getByTestId('add-symptoms'));
    const flow = screen.getByTestId('checkin-flow');
    expect(flow.getAttribute('data-screen')).toBe('symptoms');
    const focusLine = screen.getByTestId('checkin-focus-line');
    expect(focusLine.textContent ?? '').toMatch(/Your focus · Sleep/);
    // The support-focus-related field leads the slider list.
    const fields = [...flow.querySelectorAll('[data-testid^="symptom-"]')]
      .map((el) => el.getAttribute('data-testid'))
      .filter((id) => id !== null && /^symptom-(craving|sleep|irritability|anxiety|appetite)$/.test(id));
    expect(fields[0]).toBe('symptom-sleep');
  });
});
