// Reduction trajectory UI (0.9.0): frozen-record movement on the active
// reduction card, from the actual stored numbers.

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
import { createCalculationRecordsStore } from '../../src/application/persistence/calculation-record.ts';
import { freezeCalculation } from '../../src/application/persistence/calculation-record.ts';
import { createReductionRecordsStore } from '../../src/application/progress/reduction-record.ts';
import type { ReductionPlan, UseEvent } from '../../src/domain/reduction/reduction-engine.ts';
import type { CalculationRecord } from '../../src/application/persistence/calculation-record.ts';
import { PROFILE_SCHEMA_VERSION } from '../../src/domain/schemas/profile.ts';
import { calculateTolerance } from '../../src/domain/tolerance/tolerance-engine.ts';
import { TOLERANCE_POLICY_V3 } from '../../src/domain/policies/tolerance-policy-v3.ts';

const AT = toInstant(1787184000000);
const DAY_MS = 24 * 60 * 60 * 1000;
const clock = fixedClock(AT);

function renderApp(storage: StorageAdapter = createMemoryStorage()) {
  return render(<App storage={storage} clock={clock} />);
}

function toleranceProfile(useDays: number): UseProfileInput {
  return {
    goal: 'tolerance_reset',
    breakRequested: true,
    postBreakMode: null,
    thcUseDaysLast30: { value: useDays, provenance: 'user_estimate' },
    sessionsPerUseDay: { value: 1, provenance: 'user_estimate' },
    products: ['flower'],
    routes: ['smoking'],
    lastUseAt: { value: new Date(AT - 2 * DAY_MS).toISOString(), provenance: 'user_estimate' },
    currentPatternDuration: { value: '1_to_6_months', provenance: 'user_estimate' },
    previousBreaks: [],
  };
}

function seedProfileAndRecord(storage: StorageAdapter, profile: UseProfileInput, runId = 'run-1'): void {
  createQuestionnaireSnapshotStore(storage).save({
    schemaVersion: QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION,
    snapshot: { kind: 'use_profile', profile },
    updatedAt: AT,
    runId,
  });
  createResultViewStore(storage).save({ schemaVersion: RESULT_VIEW_SCHEMA_VERSION, status: 'acknowledged', updatedAt: AT });
  const frozen = freezeCalculation(runId, { kind: 'use_profile', profile }, AT);
  seedRecords(storage, [frozen]);
}

function seedRecords(storage: StorageAdapter, records: readonly CalculationRecord[]): void {
  createCalculationRecordsStore(storage).save({
    schemaVersion: 'calculation-records-v1',
    records: [...records],
    corrupt: [],
  });
}

/** A real frozen tolerance record at `at` with the profile's use-days. */
function recordAt(id: string, at: number, useDays: number, calculatedAt = toInstant(at)): CalculationRecord {
  const profile: UseProfileInput = {
    ...toleranceProfile(useDays),
    lastUseAt: { value: new Date(calculatedAt - 2 * DAY_MS).toISOString(), provenance: 'user_estimate' },
  };
  const result = calculateTolerance(profile, TOLERANCE_POLICY_V3, calculatedAt);
  if (result.kind !== 'tolerance_result') throw new Error('expected tolerance_result');
  return {
    id,
    schemaVersion: 'calculation-record-v1',
    calculatedAt,
    inputSchemaVersion: PROFILE_SCHEMA_VERSION,
    policyVersion: 'tolerance-v3',
    snapshot: { kind: 'use_profile', profile },
    result: { type: 'tolerance', value: result },
  };
}

function basePlan(overrides: Partial<ReductionPlan> = {}): ReductionPlan {
  return {
    id: 'plan-1',
    origin: 'direct',
    status: 'active',
    startedAt: AT,
    updatedAt: AT,
    limits: { maxUseDaysPerWeek: 7, maxSessionsPerUseDay: 3 },
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

function eventAt(daysAgo: number, seq: number): UseEvent {
  const usedAt = toInstant(AT - daysAgo * DAY_MS);
  return { id: `ev-${seq}`, usedAt, product: 'flower', route: 'smoking', createdAt: usedAt };
}

function seedPlan(storage: StorageAdapter, plan: ReductionPlan): void {
  createReductionRecordsStore(storage).save({ schemaVersion: 'reduction-records-v2', plans: [plan] });
}

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

describe('reduction trajectory on the active card', () => {
  it('renders actual movement from the adaptive record versus the pre-plan record', () => {
    const storage = createMemoryStorage();
    // Realistic timeline: the questionnaire ran before the plan, and the plan
    // started well before "now" (fixed clock).
    const PRE = toInstant(AT - 50 * DAY_MS);
    const PLAN_START = toInstant(AT - 45 * DAY_MS);
    const preProfile = toleranceProfile(10);
    createQuestionnaireSnapshotStore(storage).save({
      schemaVersion: QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION,
      snapshot: { kind: 'use_profile', profile: preProfile },
      updatedAt: PRE,
      runId: 'run-1',
    });
    createResultViewStore(storage).save({ schemaVersion: RESULT_VIEW_SCHEMA_VERSION, status: 'acknowledged', updatedAt: PRE });
    const pre = recordAt('run-1', AT - 50 * DAY_MS, 10, PRE);
    seedRecords(storage, [pre]);
    // Full 30-day coverage (first event 31 days ago) with an escalated real
    // pattern: logging a session today adds a distinct 19th use day.
    const events: UseEvent[] = [eventAt(31, 1)];
    for (let i = 1; i <= 18; i += 1) events.push(eventAt(i, i + 1));
    seedPlan(storage, basePlan({ id: 'plan-1', startedAt: PLAN_START, updatedAt: AT, events }));
    renderApp(storage);
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('reduction-active');

    logFlowerUse();
    const after = createCalculationRecordsStore(storage).load().records;
    expect(after.length).toBe(2);
    const adaptive = after[0]!;
    const baseline = after[1]!;
    const currentUse = adaptive.snapshot.kind === 'use_profile' ? adaptive.snapshot.profile.thcUseDaysLast30.value : null;
    const baselineUse = baseline.snapshot.kind === 'use_profile' ? baseline.snapshot.profile.thcUseDaysLast30.value : null;
    expect(currentUse).not.toBeNull();
    expect(baselineUse).toBe(10);
    const targetCurrent = adaptive.result.value.kind === 'tolerance_result' ? adaptive.result.value.preferredTargetDays : null;
    const targetBaseline = baseline.result.value.kind === 'tolerance_result' ? baseline.result.value.preferredTargetDays : null;
    expect(targetCurrent).not.toBeNull();
    expect(targetBaseline).not.toBeNull();

    const card = screen.getByTestId('reduction-card');
    const trajectory = screen.getByTestId('reduction-trajectory');
    expect(trajectory.getAttribute('data-state')).toBe('moved');
    expect(card.textContent).toContain('Your tracked use is now in a different planning band.');
    expect(trajectory.textContent).toContain(`Started reduction: ${baselineUse}/30 use days · plan target ${targetBaseline} days`);
    expect(trajectory.textContent).toContain(`Current tracked: ${currentUse}/30 use days · plan target ${targetCurrent} days`);
  });

  it('renders nothing with a single frozen record', () => {
    const storage = createMemoryStorage();
    seedProfileAndRecord(storage, toleranceProfile(10));
    seedPlan(storage, basePlan({ events: [] }));
    renderApp(storage);
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('reduction-active');
    expect(screen.queryByTestId('reduction-trajectory')).toBeNull();
  });

  it('shows the neutral same-band line when the newest record keeps the older band and target', () => {
    const storage = createMemoryStorage();
    seedProfileAndRecord(storage, toleranceProfile(10));
    // A second post-plan record with the identical profile: same band/target.
    const second = recordAt('run-2', AT + DAY_MS, 10, toInstant(AT + DAY_MS));
    const first = createCalculationRecordsStore(storage).load().records[0]!;
    seedRecords(storage, [second, first]);
    seedPlan(storage, basePlan({ events: [] }));
    renderApp(storage);
    const trajectory = screen.getByTestId('reduction-trajectory');
    expect(trajectory.getAttribute('data-state')).toBe('same-band');
    expect(trajectory.textContent).toContain('Your tracked profile is currently in the same planning band.');
  });
});
