// Active reduction plan — end-to-end UI coverage (0.8.0).
//
// Proves the deterministic behaviours users see: plan creation from the
// cut-down summary, quick THC-use logging with correct session/use-day
// semantics, live plan-state feedback, the review rule after two breach days,
// post-break takeover for occasional/reduced modes, and limit recommit. Session
// logging deliberately does not create or rewrite tolerance calculations.

import { fireEvent, render, screen, within } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/ui/app.tsx';
import { FIRST_LAUNCH } from '../../src/ui/copy.ts';
import { createMemoryStorage, type StorageAdapter } from '../../src/infrastructure/storage/storage-adapter.ts';
import { fixedClock } from '../../src/infrastructure/clock.ts';
import { toInstant } from '../../src/domain/schemas/time.ts';
import type { UseProfileInput } from '../../src/domain/schemas/profile.ts';
import {
  createQuestionnaireSnapshotStore,
  QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION,
} from '../../src/application/progress/questionnaire-snapshot.ts';
import { createResultViewStore, RESULT_VIEW_SCHEMA_VERSION } from '../../src/application/progress/result-view.ts';
import {
  createReductionRecordsStore,
} from '../../src/application/progress/reduction-record.ts';
import { createBreakAttemptsStore, type StoredAttempt } from '../../src/application/progress/break-attempt-record.ts';
import { createCalculationRecordsStore } from '../../src/application/persistence/calculation-record.ts';
import { freezeCalculation } from '../../src/application/persistence/calculation-record.ts';
import type { ReductionLimits, ReductionPlan, UseEvent } from '../../src/domain/reduction/reduction-engine.ts';

const AT = toInstant(1787184000000); // fixed instant (UTC noon)
const DAY_MS = 24 * 60 * 60 * 1000;
function renderApp(storage: StorageAdapter = createMemoryStorage(), at = AT) {
  return render(<App storage={storage} clock={fixedClock(at)} />);
}

/** Marks a stored use_profile snapshot + acknowledged result-view. */
function seedProfile(storage: StorageAdapter, profile: UseProfileInput, runId = 'run-1'): void {
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

function reductionProfile(overrides: Partial<UseProfileInput> = {}): UseProfileInput {
  return {
    goal: 'reduction',
    breakRequested: false,
    postBreakMode: null,
    thcUseDaysLast30: { value: 10, provenance: 'user_estimate' },
    sessionsPerUseDay: { value: 1, provenance: 'user_estimate' },
    products: ['flower'],
    routes: ['smoking'],
    lastUseAt: { value: null, provenance: 'missing' },
    currentPatternDuration: { value: '6_to_24_months', provenance: 'user_estimate' },
    previousBreaks: [],
    ...overrides,
  };
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
    lastUseAt: { value: new Date(AT - 2 * DAY_MS).toISOString(), provenance: 'user_estimate' },
    currentPatternDuration: { value: '1_to_6_months', provenance: 'user_estimate' },
    previousBreaks: [],
    ...overrides,
  };
}

function eventAt(daysAgo: number, product: 'flower' | 'vape' | 'concentrate' = 'flower', seq: number): UseEvent {
  const usedAt = toInstant(AT - daysAgo * DAY_MS);
  return {
    id: `ev-${seq}`,
    usedAt,
    product,
    route: product === 'flower' ? 'smoking' : product === 'vape' ? 'vaping' : 'dabbing',
    createdAt: usedAt,
  };
}

function seedPlan(storage: StorageAdapter, plan: ReductionPlan): void {
  createReductionRecordsStore(storage).save({ schemaVersion: 'reduction-records-v2', plans: [plan] });
}

function basePlan(overrides: Partial<ReductionPlan> = {}): ReductionPlan {
  const limits: ReductionLimits = { maxUseDaysPerWeek: 3, maxSessionsPerUseDay: 1 };
  return {
    id: 'plan-1',
    origin: 'direct',
    status: 'active',
    startedAt: AT,
    updatedAt: AT,
    limits,
    strategy: { avoidConcentrates: false, lowerPotency: false, lowerAmount: false },
    baseline: {
      thcUseDaysLast30: 10,
      sessionsPerUseDay: 1,
      products: ['flower'],
      routes: ['smoking'],
      currentPatternDuration: '6_to_24_months',
    },
    events: [],
    ...overrides,
  };
}

function attemptsOf(storage: StorageAdapter): StoredAttempt[] {
  return createBreakAttemptsStore(storage).load()?.attempts ?? [];
}

describe('active reduction plan', () => {
  it('starts a cut-down plan from the profile summary with suggested limits', () => {
    const storage = createMemoryStorage();
    seedProfile(storage, reductionProfile());
    renderApp(storage);
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('profile-no-break');
    fireEvent.click(screen.getByTestId('start-reduction-plan'));
    const sheet = screen.getByTestId('reduction-start-sheet');
    expect(sheet.textContent ?? '').toMatch(/Recent pattern/);
    expect(sheet.textContent ?? '').toMatch(/Plan cap/);
    fireEvent.click(screen.getByTestId('reduction-start-save'));
    expect(screen.queryByTestId('reduction-start-sheet')).toBeNull();
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('reduction-active');
    const plans = createReductionRecordsStore(storage).load().plans;
    expect(plans.length).toBe(1);
    expect(plans[0]?.origin).toBe('direct');
    // 10 days/30 -> ~3 days/week current -> suggestion of 2 days/week, 1 session.
    expect(plans[0]?.limits).toEqual({ maxUseDaysPerWeek: 2, maxSessionsPerUseDay: 1 });
  });

  it('logs use quickly; two sessions on one day count as one use day and exceed the day cap', () => {
    const storage = createMemoryStorage();
    seedProfile(storage, reductionProfile());
    seedPlan(storage, basePlan({ limits: { maxUseDaysPerWeek: 7, maxSessionsPerUseDay: 1 } }));
    renderApp(storage);
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('reduction-active');

    fireEvent.click(screen.getByTestId('log-use-cta'));
    let sheet = screen.getByTestId('log-use');
    fireEvent.click(within(sheet).getByTestId('log-use-save'));
    expect(screen.queryByTestId('log-use')).toBeNull();
    expect(screen.getByTestId('reduction-sessions-value').textContent).toBe('1of 1');

    fireEvent.click(screen.getByTestId('log-use-cta'));
    sheet = screen.getByTestId('log-use');
    // The previous product and route are already prefilled; one tap saves.
    fireEvent.click(within(sheet).getByTestId('log-use-save'));
    expect(screen.getByTestId('reduction-sessions-value').textContent).toBe('2of 1');
    expect(screen.getByTestId('reduction-sessions-status').textContent).toMatch(/session cap passed/i);
    // Two sessions on the same local day are ONE use day, not two.
    expect(screen.getByTestId('reduction-use-days-value').textContent).toBe('1of 7');
    const plans = createReductionRecordsStore(storage).load().plans;
    expect(plans[0]?.events.length).toBe(2);
  });

  it('recommends a pause after two breach days and pause/end work', () => {
    const storage = createMemoryStorage();
    seedProfile(storage, reductionProfile());
    seedPlan(
      storage,
      basePlan({
        limits: { maxUseDaysPerWeek: 7, maxSessionsPerUseDay: 1 },
        events: [
          eventAt(1, 'flower', 1),
          eventAt(1, 'flower', 2),
          eventAt(0, 'flower', 3),
          eventAt(0, 'flower', 4),
        ],
      }),
    );
    renderApp(storage);
    const card = screen.getByTestId('reduction-card');
    expect(card.getAttribute('data-status')).toBe('review_recommended');
    expect(screen.getByTestId('reduction-review')).toBeTruthy();
    fireEvent.click(screen.getByTestId('reduction-pause-cta'));
    expect(
      createReductionRecordsStore(storage).load().plans[0]?.status,
    ).toBe('paused');
    expect(screen.getByTestId('reduction-paused')).toBeTruthy();
    // End with confirmation.
    fireEvent.click(screen.getByTestId('reduction-end'));
    fireEvent.click(screen.getByTestId('confirm-action'));
    expect(createReductionRecordsStore(storage).load().plans[0]?.status).toBe('ended');
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('profile-no-break');
  });

  it('hands Today to the same tracker after an occasional-mode break completes', () => {
    const storage = createMemoryStorage();
    seedProfile(storage, toleranceProfile(), 'run-1');
    const completed: StoredAttempt = {
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
    };
    createBreakAttemptsStore(storage).save({ schemaVersion: 'break-attempts-v1', attempts: [completed] });
    renderApp(storage);
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('completed-break');
    fireEvent.click(screen.getByTestId('acknowledge-complete'));
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('reduction-active');
    const plans = createReductionRecordsStore(storage).load().plans;
    expect(plans.length).toBe(1);
    expect(plans[0]?.origin).toBe('post_break');
    expect(plans[0]?.limits.maxUseDaysPerWeek).toBe(2);
  });

  it('recommit edits the live limits from the plan card', () => {
    const storage = createMemoryStorage();
    seedProfile(storage, reductionProfile());
    seedPlan(storage, basePlan());
    renderApp(storage);
    fireEvent.click(screen.getByTestId('reduction-edit'));
    const sheet = screen.getByTestId('reduction-start-sheet');
    fireEvent.click(within(sheet).getByTestId('limit-days-inc'));
    fireEvent.click(screen.getByTestId('reduction-start-save'));
    expect(createReductionRecordsStore(storage).load().plans[0]?.limits.maxUseDaysPerWeek).toBe(4);
    expect(screen.getByTestId('reduction-use-days-value').textContent).toBe('0of 4');
  });

  it('logging a session never creates or rewrites a tolerance calculation', () => {
    const storage = createMemoryStorage();
    seedProfile(storage, toleranceProfile());
    const baseline = {
      thcUseDaysLast30: 10,
      sessionsPerUseDay: 1,
      products: ['flower'] as const,
      routes: ['smoking'] as const,
      currentPatternDuration: '1_to_6_months',
    };
    // Full 30-day coverage (first event 31 days ago) with an escalated real
    // pattern: 18 distinct use days in the last 30 + an extra one today.
    const events: UseEvent[] = [eventAt(31, 'flower', 1)];
    for (let i = 1; i <= 18; i += 1) {
      events.push(eventAt(i, 'flower', i + 1));
    }
    seedPlan(storage, basePlan({ limits: { maxUseDaysPerWeek: 7, maxSessionsPerUseDay: 3 }, baseline, events }));
    renderApp(storage);
    const before = createCalculationRecordsStore(storage).load();
    expect(before.records).toHaveLength(1);
    fireEvent.click(screen.getByTestId('log-use-cta'));
    const sheet = screen.getByTestId('log-use');
    fireEvent.click(within(sheet).getByTestId('log-use-save'));
    expect(createCalculationRecordsStore(storage).load()).toEqual(before);
    expect(createReductionRecordsStore(storage).load().plans[0]?.events).toHaveLength(events.length + 1);
    expect(screen.getByTestId('today-view').getAttribute('data-primary')).toBe('reduction-active');
  });

  it('keeps break-recommendation recalculation out of the active cut-down card', () => {
    const storage = createMemoryStorage();
    seedProfile(storage, toleranceProfile());
    seedPlan(storage, basePlan({ events: [eventAt(0, 'flower', 1)] }));
    renderApp(storage);
    expect(screen.queryByTestId('reduction-refresh-cta')).toBeNull();
    expect(screen.queryByTestId('reduction-refresh')).toBeNull();
    expect(screen.getByTestId('reduction-edit')).toBeTruthy();
    expect(createCalculationRecordsStore(storage).load().records).toHaveLength(1);
  });
});


describe('cut-down continuity and history', () => {
  it('uses one setup sheet from the result and persists optional guardrails', () => {
    const storage = createMemoryStorage();
    seedProfile(storage, reductionProfile({ thcUseDaysLast30: { value: 25, provenance: 'user_estimate' } }));
    renderApp(storage);
    fireEvent.click(screen.getByTestId('view-result'));
    expect(screen.queryByTestId('limit-days')).toBeNull();
    fireEvent.click(screen.getByTestId('setup-reduction-plan'));
    expect(screen.getByTestId('limit-days').textContent).toBe('5');
    expect(screen.getByTestId('limit-sessions').textContent).toBe('1');
    fireEvent.click(screen.getByTestId('limit-sessions-inc'));
    fireEvent.click(screen.getByText('Optional guardrails'));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Avoid concentrates' }));
    fireEvent.click(screen.getByTestId('reduction-start-save'));
    const plan = createReductionRecordsStore(storage).load().plans[0];
    expect(plan?.limits).toEqual({ maxUseDaysPerWeek: 5, maxSessionsPerUseDay: 2 });
    expect(plan?.strategy.avoidConcentrates).toBe(true);
  });

  it('shows ended reduction plans and corrects sessions without changing saved calculations', () => {
    const storage = createMemoryStorage();
    seedProfile(storage, reductionProfile());
    seedPlan(storage, basePlan({ status: 'ended', events: [eventAt(0, 'flower', 1), eventAt(0, 'vape', 2)] }));
    const before = createCalculationRecordsStore(storage).load();
    renderApp(storage);
    fireEvent.click(screen.getByRole('button', { name: 'History', exact: true }));
    const row = screen.getAllByTestId('history-row').find((el) => el.getAttribute('data-kind') === 'reduction')!;
    expect(row.textContent).toMatch(/Ended.*2 sessions logged/);
    fireEvent.click(row);
    expect(screen.getAllByTestId('use-history-row')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: /Remove Flower/ }));
    fireEvent.click(screen.getByTestId('confirm-dialog-action'));
    expect(screen.getAllByTestId('use-history-row')).toHaveLength(1);
    expect(createReductionRecordsStore(storage).load().plans[0]?.status).toBe('ended');
    expect(createCalculationRecordsStore(storage).load()).toEqual(before);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('reduction-history')).toBeNull();
    expect(screen.getByTestId('history-view')).toBeTruthy();
    expect(document.activeElement?.getAttribute('data-kind')).toBe('reduction');
    // Main navigation remains available while a history page is open.
    fireEvent.click(screen.getAllByTestId('history-row').find((el) => el.getAttribute('data-kind') === 'calculation')!);
    expect(screen.queryByTestId('limit-days')).toBeNull();
    expect(screen.getByRole('button', { name: 'Today', exact: true }).closest('[inert]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Today', exact: true }));
    expect(screen.getByTestId('today-view')).toBeTruthy();
  });
});
