// Post-break outcome capture UI (0.9.0): one 0-10 rating offered exactly once
// after a completed break and a real return to THC.

import { fireEvent, render, screen, within } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/ui/app.tsx';
import { createMemoryStorage, type StorageAdapter } from '../../src/infrastructure/storage/storage-adapter.ts';
import { fixedClock } from '../../src/infrastructure/clock.ts';
import { toInstant } from '../../src/domain/schemas/time.ts';
import type { UseProfileInput } from '../../src/domain/schemas/profile.ts';
import {
  createQuestionnaireSnapshotStore,
  QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION,
} from '../../src/application/progress/questionnaire-snapshot.ts';
import { createResultViewStore, RESULT_VIEW_SCHEMA_VERSION } from '../../src/application/progress/result-view.ts';
import { createBreakAttemptsStore, type StoredAttempt } from '../../src/application/progress/break-attempt-record.ts';
import { createBreakOutcomeStore } from '../../src/application/progress/break-outcome.ts';
import { createPreviousBreaksStore } from '../../src/application/persistence/previous-break-store.ts';
import { createCalculationRecordsStore } from '../../src/application/persistence/calculation-record.ts';
import { freezeCalculation } from '../../src/application/persistence/calculation-record.ts';
import { createReductionRecordsStore } from '../../src/application/progress/reduction-record.ts';
import type { ReductionPlan } from '../../src/domain/reduction/reduction-engine.ts';
import { scoreAnchors } from '../../src/domain/recovery/outcome-capture.ts';

const AT = toInstant(1787184000000); // fixed instant (UTC noon)
const clock = fixedClock(AT);

function renderApp(storage: StorageAdapter = createMemoryStorage()) {
  return render(<App storage={storage} clock={clock} />);
}

function toleranceProfile(overrides: Partial<UseProfileInput> = {}): UseProfileInput {
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
    ...overrides,
  };
}

function seedAcknowledgedProfile(storage: StorageAdapter, profile: UseProfileInput, runId = 'run-1'): void {
  createQuestionnaireSnapshotStore(storage).save({
    schemaVersion: QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION,
    snapshot: { kind: 'use_profile', profile },
    updatedAt: AT,
    runId,
  });
  createResultViewStore(storage).save({ schemaVersion: RESULT_VIEW_SCHEMA_VERSION, status: 'acknowledged', updatedAt: AT });
  const frozen = freezeCalculation(runId, { kind: 'use_profile', profile }, AT);
  createCalculationRecordsStore(storage).save({
    schemaVersion: 'calculation-records-v1',
    records: [frozen],
    corrupt: [],
  });
}

function completedAttempt(overrides: Partial<StoredAttempt> = {}): StoredAttempt {
  return {
    id: 'attempt-1',
    status: 'completed',
    calculationRecordId: 'run-1',
    targetDurationDays: 21,
    postBreakMode: 'occasional',
    startedAt: AT,
    segments: [{ startedFromLastUseAt: AT, endedAt: AT, endReason: 'completed' }],
    postBreakPlan: { mode: 'occasional', maxUseDaysPerWeek: 2 },
    preparation: null,
    completionAcknowledged: false,
    createdAt: AT,
    updatedAt: AT,
    ...overrides,
  };
}

function seedAttempt(storage: StorageAdapter, attempt: StoredAttempt): void {
  createBreakAttemptsStore(storage).save({ schemaVersion: 'break-attempts-v1', attempts: [attempt] });
}

function seedPlan(storage: StorageAdapter, plan: ReductionPlan): void {
  createReductionRecordsStore(storage).save({ schemaVersion: 'reduction-records-v2', plans: [plan] });
}

function basePlan(overrides: Partial<ReductionPlan> = {}): ReductionPlan {
  return {
    id: 'plan-1',
    origin: 'direct',
    status: 'active',
    startedAt: AT,
    updatedAt: AT,
    limits: { maxUseDaysPerWeek: 3, maxSessionsPerUseDay: 1 },
    strategy: { avoidConcentrates: false, lowerPotency: false, lowerAmount: false },
    baseline: {
      thcUseDaysLast30: 10,
      sessionsPerUseDay: 1,
      products: ['flower'],
      routes: ['smoking'],
      currentPatternDuration: '1_to_6_months',
    },
    events: [],
    ...overrides,
  };
}

/** Opens the reduction quick-log and saves a "now" flower session. */
function logFlowerUse(): void {
  fireEvent.click(screen.getByTestId('log-use-cta'));
  const sheet = screen.getByTestId('log-use');
  const chip = within(sheet)
    .getAllByTestId('log-product')
    .find((el) => el.getAttribute('data-value') === 'flower');
  if (chip === undefined) throw new Error('no flower chip');
  fireEvent.click(chip);
  fireEvent.click(within(sheet).getByTestId('log-use-save'));
}

describe('outcome capture prompt', () => {
  it('shows the capture sheet exactly once after a completed break and a logged return', () => {
    const storage = createMemoryStorage();
    seedAcknowledgedProfile(storage, toleranceProfile());
    seedAttempt(storage, completedAttempt());
    renderApp(storage);
    // Completed-break card, then acknowledgement hands Today to the post-break
    // reduction tracker (occasional mode).
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('completed-break');
    fireEvent.click(screen.getByTestId('acknowledge-complete'));
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('reduction-active');
    expect(screen.queryByTestId('outcome-capture')).toBeNull();

    logFlowerUse();
    expect(screen.getByTestId('outcome-capture')).toBeTruthy();
    expect(within(screen.getByTestId('outcome-capture')).getByText(/reduce your tolerance/i)).toBeTruthy();
    expect(screen.getByTestId('outcome-anchor-zero').textContent).toBe(scoreAnchors().zero);
    expect(screen.getByTestId('outcome-anchor-ten').textContent).toBe(scoreAnchors().ten);

    // Close without answering and log again: nothing was marked yet, so the
    // prompt is offered again.
    fireEvent.click(within(screen.getByTestId('outcome-capture')).getByRole('button', { name: 'Close outcome capture' }));
    expect(screen.queryByTestId('outcome-capture')).toBeNull();
    logFlowerUse();
    expect(screen.getByTestId('outcome-capture')).toBeTruthy();

    // Save a score now; afterwards the attempt is captured and never prompts.
    fireEvent.input(screen.getByTestId('outcome-capture-score'), { target: { value: '8' } });
    fireEvent.click(screen.getByTestId('outcome-capture-save'));
    expect(screen.queryByTestId('outcome-capture')).toBeNull();
    logFlowerUse();
    expect(screen.queryByTestId('outcome-capture')).toBeNull();

    const marks = createBreakOutcomeStore(storage).load().marks;
    expect(marks).toHaveLength(1);
    expect(marks[0]).toEqual({ attemptId: 'attempt-1', status: 'captured', updatedAt: AT });
    const previous = createPreviousBreaksStore(storage).load().records;
    expect(previous).toHaveLength(1);
    expect(previous[0]?.durationDays).toBe(21);
    expect(previous[0]?.toleranceReductionScore).toBe(8);
    expect(previous[0]?.sourceAttemptId).toBe('attempt-1');
    expect(previous[0]?.endedAt).toBe(new Date(AT).toISOString());
  });

  it('skip persists a skipped mark and the prompt never returns', () => {
    const storage = createMemoryStorage();
    seedAcknowledgedProfile(storage, toleranceProfile());
    seedAttempt(storage, completedAttempt());
    renderApp(storage);
    fireEvent.click(screen.getByTestId('acknowledge-complete'));
    logFlowerUse();
    expect(screen.getByTestId('outcome-capture')).toBeTruthy();
    fireEvent.click(screen.getByTestId('outcome-capture-skip'));
    expect(screen.queryByTestId('outcome-capture')).toBeNull();

    logFlowerUse();
    expect(screen.queryByTestId('outcome-capture')).toBeNull();
    const marks = createBreakOutcomeStore(storage).load().marks;
    expect(marks).toHaveLength(1);
    expect(marks[0]?.status).toBe('skipped');
    expect(marks[0]?.attemptId).toBe('attempt-1');
    // No PreviousBreak is written for a skip.
    expect(createPreviousBreaksStore(storage).load().records).toHaveLength(0);
  });

  it('never prompts a user who chose continued abstinence', () => {
    const storage = createMemoryStorage();
    seedAcknowledgedProfile(storage, toleranceProfile());
    seedPlan(storage, basePlan());
    seedAttempt(
      storage,
      completedAttempt({
        postBreakMode: 'continue_abstinence',
        postBreakPlan: { mode: 'continue_abstinence' },
        completionAcknowledged: true,
      }),
    );
    renderApp(storage);
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('reduction-active');
    logFlowerUse();
    expect(screen.queryByTestId('outcome-capture')).toBeNull();
    expect(createBreakOutcomeStore(storage).load().marks).toHaveLength(0);
    expect(createPreviousBreaksStore(storage).load().records).toHaveLength(0);
  });

  it('does not re-prompt when a capture mark already exists before the return', () => {
    const storage = createMemoryStorage();
    seedAcknowledgedProfile(storage, toleranceProfile());
    seedPlan(storage, basePlan());
    seedAttempt(
      storage,
      completedAttempt({ postBreakPlan: { mode: 'occasional', maxUseDaysPerWeek: 2 }, completionAcknowledged: true }),
    );
    createBreakOutcomeStore(storage).save({
      schemaVersion: 'break-outcome-marks-v1',
      marks: [{ attemptId: 'attempt-1', status: 'captured', updatedAt: AT }],
    });
    renderApp(storage);
    logFlowerUse();
    expect(screen.queryByTestId('outcome-capture')).toBeNull();
    expect(createBreakOutcomeStore(storage).load().marks).toHaveLength(1);
  });
});
