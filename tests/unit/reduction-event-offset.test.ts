// A logged session's local calendar day is fixed by the UTC offset that was in
// force where it was logged (UseEvent.utcOffsetMinutes, 0.29.0). Before that
// field existed, every event was grouped with whatever offset the caller
// happened to pass, so a later daylight-saving change could move a past session
// — and therefore a use day and a breach day — onto another day.
//
// The instants below are the Europe/Berlin transitions: 2026-03-29 03:00 CET
// springs forward to CEST (+60 -> +120), 2026-10-25 03:00 CEST falls back to CET
// (+120 -> +60). They are absolute instants, so these cases are offset-agnostic
// and run under any host timezone.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createMemoryStorage } from '../../src/infrastructure/storage/storage-adapter.ts';
import { toInstant, type Instant } from '../../src/domain/schemas/time.ts';
import type { ProductKind, Route } from '../../src/domain/schemas/enums.ts';
import {
  dayKeyOfEvent,
  derivePlanState,
  distinctUseDaysInDayRange,
  type ReductionLimits,
  type ReductionPlan,
  type ThcStrategy,
  type UseEvent,
} from '../../src/domain/reduction/reduction-engine.ts';
import {
  createReductionRecordsStore,
  REDUCTION_RECORDS_SCHEMA_VERSION,
} from '../../src/application/progress/reduction-record.ts';

const CET = 60; // UTC+1, before the spring change
const CEST = 120; // UTC+2, after it

/** 2026-03-28 23:30 local at CET — the day the spring change would steal. */
const LATE_BEFORE_SPRING: Instant = toInstant(Date.parse('2026-03-28T22:30:00.000Z'));
/** 2026-03-29 01:30 local at CEST — the next local day, 90 minutes later. */
const EARLY_AFTER_SPRING: Instant = toInstant(Date.parse('2026-03-29T00:30:00.000Z'));
/** Midday on 2026-03-29 local at CEST, after both sessions. */
const AFTER_SPRING: Instant = toInstant(Date.parse('2026-03-29T10:00:00.000Z'));

const NO_STRATEGY: ThcStrategy = { avoidConcentrates: false, lowerPotency: false, lowerAmount: false };

function limits(maxUseDaysPerWeek: number, maxSessionsPerUseDay: number): ReductionLimits {
  return { maxUseDaysPerWeek, maxSessionsPerUseDay };
}

let seq = 0;
function eventAt(
  usedAt: Instant,
  utcOffsetMinutes?: number,
  product: ProductKind = 'flower',
  route: Route = 'smoking',
): UseEvent {
  seq += 1;
  const base: UseEvent = {
    id: `e${seq}`,
    usedAt,
    product,
    route,
    createdAt: usedAt,
  };
  return utcOffsetMinutes === undefined ? base : { ...base, utcOffsetMinutes };
}

describe('reduction engine: the offset a session was logged at', () => {
  it('keeps a session on the local day its own offset puts it on', () => {
    const logged = eventAt(LATE_BEFORE_SPRING, CET);
    assert.equal(dayKeyOfEvent(logged, CET), '2026-03-28');
    // Regrouped with the offset in force today it would slip to the 29th.
    assert.equal(dayKeyOfEvent(logged, CEST), '2026-03-28');
  });

  it('groups a row written before the field existed with the offset the caller passes', () => {
    const legacy = eventAt(LATE_BEFORE_SPRING);
    assert.equal(legacy.utcOffsetMinutes, undefined);
    assert.equal(dayKeyOfEvent(legacy, CET), '2026-03-28');
    assert.equal(dayKeyOfEvent(legacy, CEST), '2026-03-29');
  });

  it('keeps two sessions on opposite sides of the change on two use days', () => {
    const events = [
      eventAt(LATE_BEFORE_SPRING, CET),
      eventAt(EARLY_AFTER_SPRING, CEST),
    ];
    const state = derivePlanState(events, limits(1, 2), NO_STRATEGY, AFTER_SPRING, CEST);
    assert.equal(state.rollingUseDays, 2);
    assert.equal(state.useDaysExceeded, true);
    // The breach is the day the rolling count tips over, and it is named by the
    // sessions' own local day, not by the day today's offset would give them.
    assert.deepEqual(
      state.breaches.map((breach) => breach.dayKey),
      ['2026-03-29'],
    );
  });

  it('still merges them into one use day when the rows carry no offset', () => {
    const events = [eventAt(LATE_BEFORE_SPRING), eventAt(EARLY_AFTER_SPRING)];
    const state = derivePlanState(events, limits(1, 2), NO_STRATEGY, AFTER_SPRING, CEST);
    assert.equal(state.rollingUseDays, 1);
    assert.equal(state.breaches.length, 0);
  });

  it('counts distinct use days inside a day-key range', () => {
    const events = [
      eventAt(LATE_BEFORE_SPRING, CET),
      eventAt(EARLY_AFTER_SPRING, CEST),
    ];
    assert.equal(distinctUseDaysInDayRange(events, '2026-03-28', '2026-03-29', CEST), 2);
    assert.equal(distinctUseDaysInDayRange(events, '2026-03-29', '2026-03-29', CEST), 1);
    // The range test reads each event's own day, so the caller's offset cannot
    // pull the 28th's session into a range that starts on the 29th.
    assert.equal(distinctUseDaysInDayRange(events, '2026-03-29', '2026-03-29', CET), 1);
  });
});

describe('reduction records: the persisted offset', () => {
  function plan(events: readonly UseEvent[]): ReductionPlan {
    return {
      id: 'plan-1',
      origin: 'direct',
      status: 'active',
      startedAt: toInstant(Date.parse('2026-03-20T10:00:00.000Z')),
      updatedAt: AFTER_SPRING,
      limits: limits(2, 2),
      strategy: NO_STRATEGY,
      baseline: {
        thcUseDaysLast30: 8,
        sessionsPerUseDay: 2,
        products: ['flower'],
        routes: ['smoking'],
        currentPatternDuration: null,
      },
      events,
    };
  }

  it('round-trips a plan whose events carry their offset', () => {
    const adapter = createMemoryStorage();
    const store = createReductionRecordsStore(adapter);
    store.save({
      schemaVersion: REDUCTION_RECORDS_SCHEMA_VERSION,
      plans: [plan([eventAt(LATE_BEFORE_SPRING, CET)])],
    });
    const loaded = store.load();
    assert.equal(loaded.plans.length, 1);
    const loadedEvent = loaded.plans[0]?.events[0];
    assert.ok(loadedEvent !== undefined);
    assert.equal(loadedEvent.utcOffsetMinutes, CET);
    assert.equal(dayKeyOfEvent(loadedEvent, CEST), '2026-03-28');
  });

  it('loads a stored plan whose events predate the field', () => {
    const adapter = createMemoryStorage();
    adapter.setItem(
      'tbreak.reduction-records.v2',
      JSON.stringify({
        schemaVersion: REDUCTION_RECORDS_SCHEMA_VERSION,
        plans: [plan([eventAt(LATE_BEFORE_SPRING)])],
      }),
    );
    const loaded = createReductionRecordsStore(adapter).load();
    assert.equal(loaded.plans.length, 1);
    assert.equal(loaded.plans[0]?.events[0]?.utcOffsetMinutes, undefined);
  });

  it('refuses an impossible stored offset without touching the other plans', () => {
    const adapter = createMemoryStorage();
    const store = createReductionRecordsStore(adapter);
    store.save({
      schemaVersion: REDUCTION_RECORDS_SCHEMA_VERSION,
      plans: [plan([eventAt(LATE_BEFORE_SPRING, CET)])],
    });
    const raw = JSON.parse(adapter.getItem('tbreak.reduction-records.v2') as string);
    raw.plans[0].events[0].utcOffsetMinutes = 1441; // beyond UTC+14
    adapter.setItem('tbreak.reduction-records.v2', JSON.stringify(raw));
    assert.equal(store.load().plans.length, 0);
  });
});
