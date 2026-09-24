// Target boundaries and interrupted states on the Today card.

import { render, screen, within } from '@testing-library/preact';
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

  it('keeps the day on the first screen and the long material one tap away', () => {
    const storage = createMemoryStorage();
    seedSnapshot(storage, { kind: 'use_profile', profile: profile('2026-08-17T00:00:00Z') });
    seedAttempt(storage, activeAttempt());
    renderApp(storage);
    // Open, because the day is not a set of drawers: the stage, the topic and
    // its action, and the experiences around that topic.
    for (const id of ['today-stage', 'daily-support', 'today-experiences']) {
      const node = screen.getByTestId(id);
      expect(node.tagName).toBe('SECTION');
      expect(screen.getByTestId('advice-action').textContent?.length ?? 0).toBeGreaterThan(0);
      expect(screen.getByTestId('advice-why')).toBeTruthy();
    }
    // Behind one tap each, because they are long: the guide's remaining steps,
    // the symptom list and break management. The timeline stays open — it is
    // where the day sits in the plan.
    for (const id of ['advice-more', 'stage-may-notice', 'today-manage']) {
      const node = screen.getByTestId(id);
      expect(node.tagName).toBe('DETAILS');
      expect(node.hasAttribute('open')).toBe(false);
    }
    expect(screen.getByTestId('today-timeline').tagName).toBe('SECTION');
    expect(screen.getByTestId('today-timeline').querySelector('h3')?.textContent).toBe('Your break timeline');
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


});
