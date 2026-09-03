// Deterministic tests for the active-reduction domain engine
// (src/domain/reduction/reduction-engine.ts).

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { toInstant, type Instant } from '../../src/domain/schemas/time.ts';
import type { ProductKind, Route } from '../../src/domain/schemas/enums.ts';
import {
  dayKeyForInstant,
  dayKeyMinus,
  derivePlanState,
  distinctUseDaysInWindow,
  MILLIS_PER_DAY,
  observedPattern,
  sessionsOnDay,
  statusAfterEvents,
  suggestedReductionLimits,
  todayKey,
  type ReductionBaseline,
  type ReductionLimits,
  type ReductionPlanStatus,
  type ThcStrategy,
  type UseEvent,
} from '../../src/domain/reduction/reduction-engine.ts';

const UTC = 0;
const NOW: Instant = toInstant(Date.parse('2026-06-10T12:00:00.000Z')); // a fixed "today"
const DAY_MS = MILLIS_PER_DAY;

let eventSeq = 0;
function eventAt(
  usedAt: number,
  product: ProductKind = 'flower',
  route: Route = 'smoking',
): UseEvent {
  eventSeq += 1;
  return { id: `e${eventSeq}`, usedAt: toInstant(usedAt), product, route, createdAt: toInstant(usedAt) };
}

function eventDaysAgo(daysAgo: number, hourUtc = 20): UseEvent {
  return eventAt(NOW - daysAgo * DAY_MS - (12 - hourUtc) * 60 * 60 * 1000);
}

const NO_STRATEGY: ThcStrategy = { avoidConcentrates: false, lowerPotency: false, lowerAmount: false };

function limits(days: number, sessions: number): ReductionLimits {
  return { maxUseDaysPerWeek: days, maxSessionsPerUseDay: sessions };
}

function state(events: readonly UseEvent[], plan: { limits: ReductionLimits; strategy?: ThcStrategy }) {
  return derivePlanState(events, plan.limits, plan.strategy ?? NO_STRATEGY, NOW, UTC);
}

describe('reduction engine: local calendar days', () => {
  it('maps a UTC instant to the local calendar day under a fixed offset', () => {
    const instant: Instant = toInstant(Date.parse('2026-06-10T22:30:00.000Z'));
    assert.equal(dayKeyForInstant(instant, 0), '2026-06-10');
    // UTC+2: 22:30 + 2h crosses midnight into the 11th.
    assert.equal(dayKeyForInstant(instant, 120), '2026-06-11');
    // UTC-5: still the 10th.
    assert.equal(dayKeyForInstant(instant, -300), '2026-06-10');
  });

  it('derives today and past window day keys deterministically', () => {
    assert.equal(todayKey(NOW, UTC), '2026-06-10');
    assert.equal(dayKeyMinus('2026-06-10', 6, UTC), '2026-06-04');
    assert.equal(dayKeyMinus('2026-06-10', 0, UTC), '2026-06-10');
  });
});

describe('reduction engine: session vs use-day semantics', () => {
  it('counts several sessions on one day as one use day', () => {
    const events = [
      eventAt(NOW - 3 * 3600e3, 'flower', 'smoking'),
      eventAt(NOW - 2 * 3600e3, 'flower', 'smoking'),
      eventAt(NOW - 3600e3, 'vape', 'vaping'),
    ];
    assert.equal(distinctUseDaysInWindow(events, NOW, UTC), 1);
    assert.equal(sessionsOnDay(events, todayKey(NOW, UTC), UTC), 3);
    const planState = state(events, { limits: limits(3, 1) });
    assert.equal(planState.todayUsed, true);
    assert.equal(planState.todaySessions, 3);
    assert.equal(planState.rollingUseDays, 1);
    assert.equal(planState.sessionsExceededToday, true);
  });

  it('increments use days only when a new local day has an event', () => {
    const events = [
      eventDaysAgo(1),
      eventAt(NOW - 60e3), // today
    ];
    assert.equal(distinctUseDaysInWindow(events, NOW, UTC), 2);
    const planState = state(events, { limits: limits(3, 1) });
    assert.equal(planState.rollingUseDays, 2);
  });

  it('counts a rolling 7-day window ending today', () => {
    const events = [eventDaysAgo(6), eventDaysAgo(4), eventDaysAgo(2), eventDaysAgo(0)];
    assert.equal(distinctUseDaysInWindow(events, NOW, UTC), 4);
    // An event 8 days ago is outside the rolling window.
    const outside = eventDaysAgo(8);
    assert.equal(distinctUseDaysInWindow([...events, outside], NOW, UTC), 4);
  });

  it('exceeds the weekly use-day cap on the tipping day (one breach day)', () => {
    const events = [eventDaysAgo(6), eventDaysAgo(5), eventDaysAgo(4), eventDaysAgo(3)];
    assert.equal(distinctUseDaysInWindow(events, NOW, UTC), 4);
    const planState = state(events, { limits: limits(3, 1) });
    assert.equal(planState.useDaysExceeded, true);
    // The 4th distinct use day pushes the rolling count over the cap; that
    // single day is the breach, so review is not yet recommended.
    assert.equal(planState.breaches.length, 1);
    assert.equal(planState.reviewRecommended, false);
  });

  it('two days inside the window over the weekly cap recommend review', () => {
    // 5 distinct use days in the window with a cap of 3: both the window
    // ending at day -3 and the window ending at day -2 count >= 4 use days,
    // so two distinct days breach the weekly cap.
    const events = [eventDaysAgo(6), eventDaysAgo(5), eventDaysAgo(4), eventDaysAgo(3), eventDaysAgo(2)];
    const planState = state(events, { limits: limits(3, 1) });
    assert.equal(planState.reviewRecommended, true);
    assert.equal(planState.breaches.length, 2);
  });
});

describe('reduction engine: breaches and review rule', () => {
  it('one session-limit breach does not recommend review', () => {
    const events = [eventAt(NOW - 3600e3), eventAt(NOW - 60e3)];
    const planState = state(events, { limits: limits(3, 1) });
    assert.equal(planState.sessionsExceededToday, true);
    assert.equal(planState.breaches.length, 1);
    assert.equal(planState.reviewRecommended, false);
  });

  it('two distinct breach days inside the rolling window recommend review', () => {
    // Day -1: two sessions (session breach). Day 0: two sessions (session breach).
    const events = [eventDaysAgo(1), eventDaysAgo(1), eventAt(NOW - 3600e3), eventAt(NOW - 60e3)];
    const planState = state(events, { limits: limits(3, 1) });
    assert.equal(planState.reviewRecommended, true);
  });

  it('an old breach ages out of the rolling window', () => {
    // Two breach days 8 and 9 days ago are outside the 7-day window.
    const oldBreachA = eventAt(NOW - 9 * DAY_MS + 60e3);
    const oldBreachB = eventAt(NOW - 8 * DAY_MS + 60e3);
    const planState = state([oldBreachA, oldBreachB], { limits: limits(3, 1) });
    assert.equal(planState.rollingUseDays, 0);
    assert.equal(planState.reviewRecommended, false);
    assert.equal(planState.breaches.length, 0);
  });

  it('detects a strategy breach when concentrate is logged against avoid-concentrates', () => {
    const concentrate: UseEvent = { ...eventAt(NOW - 3600e3, 'concentrate', 'dabbing') };
    const planState = derivePlanState(
      [concentrate],
      limits(3, 1),
      { avoidConcentrates: true, lowerPotency: false, lowerAmount: false },
      NOW,
      UTC,
    );
    assert.equal(planState.strategyExceededToday, true);
    assert.equal(planState.reviewRecommended, false);
  });

  it('statusAfterEvents moves active to review_recommended and back', () => {
    const active: ReductionPlanStatus = 'active';
    const twoBreaches = [
      eventDaysAgo(1),
      eventDaysAgo(1),
      eventAt(NOW - 3600e3),
      eventAt(NOW - 60e3),
    ];
    const after = statusAfterEvents(
      active,
      state(twoBreaches, { limits: limits(3, 1) }),
    );
    assert.equal(after, 'review_recommended');
    const healed = statusAfterEvents(
      after,
      state([eventDaysAgo(1)], { limits: limits(3, 1) }),
    );
    assert.equal(healed, 'active');
    const paused = statusAfterEvents(
      'paused',
      state(twoBreaches, { limits: limits(3, 1) }),
    );
    assert.equal(paused, 'paused');
  });
});

describe('reduction engine: timezone boundary', () => {
  it('does not duplicate or drop events across a calendar boundary', () => {
    // Two sessions 22:00 UTC; at UTC+3 the earlier one is day X, later crosses
    // into day X+1 — they become two use days, never one duplicated day.
    const first = eventAt(Date.parse('2026-06-10T20:00:00.000Z'));
    const second = eventAt(Date.parse('2026-06-10T22:30:00.000Z'));
    const offset = 180; // UTC+3
    assert.equal(dayKeyForInstant(first.usedAt, offset), '2026-06-10');
    assert.equal(dayKeyForInstant(second.usedAt, offset), '2026-06-11');
    const planState = derivePlanState(
      [first, second],
      limits(7, 1),
      NO_STRATEGY,
      toInstant(Date.parse('2026-06-11T02:00:00.000Z')),
      offset,
    );
    assert.equal(planState.todaySessions, 1);
    assert.equal(planState.rollingUseDays, 2);
  });
});

describe('reduction engine: starting-limit heuristic', () => {
  it('suggests bounded day caps derived from the current pattern', () => {
    const heavy: ReductionBaseline = {
      thcUseDaysLast30: 27,
      sessionsPerUseDay: 3,
      products: ['flower'],
      routes: ['smoking'],
      currentPatternDuration: '5_plus_years',
    };
    const suggestion = suggestedReductionLimits(heavy);
    assert.ok(suggestion.maxUseDaysPerWeek >= 1 && suggestion.maxUseDaysPerWeek <= 7);
    // 27/30 -> ~7 days/week current -> suggestion roughly half (>= 3).
    assert.ok(suggestion.maxUseDaysPerWeek >= 3 && suggestion.maxUseDaysPerWeek < 7);
    assert.equal(suggestion.maxSessionsPerUseDay, 1);
  });
});

describe('reduction engine: observed pattern provenance', () => {
  it('derives exact use days/sessions/products from events over 30 local days', () => {
    const events: UseEvent[] = [];
    // 10 distinct use days over the last 12 days; two sessions on one day.
    for (let daysAgo = 12; daysAgo >= 1; daysAgo -= 1) {
      events.push(eventDaysAgo(daysAgo));
    }
    events.push(eventAt(NOW - 3600e3, 'concentrate', 'dabbing'));
    events.push(eventAt(NOW - 60e3, 'concentrate', 'dabbing'));
    const observed = observedPattern(events, NOW, UTC);
    assert.equal(observed.useDaysLast30, 13);
    assert.equal(observed.sufficientForProfile, true);
    assert.equal(observed.hasFullThirtyDayCoverage, false);
    assert.ok(observed.products.includes('concentrate'));
    assert.ok(observed.routes.includes('dabbing'));
    assert.equal(observed.lastUseAt, NOW - 60e3);
  });

  it('flags full 30-day coverage only once tracked history spans 30 days', () => {
    const events = [eventAt(NOW - 31 * DAY_MS), eventAt(NOW - 5 * DAY_MS)];
    const observed = observedPattern(events, NOW, UTC);
    assert.equal(observed.hasFullThirtyDayCoverage, true);
  });
});
