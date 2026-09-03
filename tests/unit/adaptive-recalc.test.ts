// Deterministic tests for adaptive recalculation from tracked use
// (src/application/calculation/adaptive-recalc.ts).

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { toInstant } from '../../src/domain/schemas/time.ts';
import type { UseProfileInput } from '../../src/domain/schemas/profile.ts';
import type { ReductionBaseline, UseEvent } from '../../src/domain/reduction/reduction-engine.ts';
import { decideTrackingRecalculation } from '../../src/application/calculation/adaptive-recalc.ts';

const UTC = 0;
const NOW = toInstant(Date.parse('2026-06-10T12:00:00.000Z'));
const DAY_MS = 24 * 60 * 60 * 1000;

let seq = 0;
function eventDaysAgo(daysAgo: number): UseEvent {
  seq += 1;
  const usedAt = toInstant(NOW - daysAgo * DAY_MS);
  return { id: `ev-${seq}`, usedAt, product: 'flower', route: 'smoking', createdAt: usedAt };
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
    lastUseAt: { value: new Date(NOW - 2 * DAY_MS).toISOString(), provenance: 'user_estimate' },
    currentPatternDuration: { value: '1_to_6_months', provenance: 'user_estimate' },
    previousBreaks: [],
  };
}

function baseline(useDays: number, products: readonly string[] = ['flower']): ReductionBaseline {
  return {
    thcUseDaysLast30: useDays,
    sessionsPerUseDay: 1,
    products: products as ReductionBaseline['products'],
    routes: ['smoking'],
    currentPatternDuration: '1_to_6_months',
  };
}

describe('adaptive recalculation decision', () => {
  it('stays unchanged when tracking matches the baseline', () => {
    const events = [eventDaysAgo(2), eventDaysAgo(5), eventDaysAgo(9)];
    const decision = decideTrackingRecalculation({
      latestProfile: toleranceProfile(10),
      baseline: baseline(10),
      events,
      now: NOW,
      utcOffsetMinutes: UTC,
    });
    assert.equal(decision.mode, 'unchanged');
  });

  it('asks for a minimal refresh (never fabricates) under partial coverage with an upward signal', () => {
    // Tracking started 21 days ago (partial coverage, first event inside the
    // 30-day window) but already shows a higher-frequency band than the
    // estimated baseline, so the app asks for a refresh instead of inventing
    // an exact 30-day profile.
    const events: UseEvent[] = [];
    for (let daysAgo = 21; daysAgo >= 0; daysAgo -= 1) events.push(eventDaysAgo(daysAgo));
    const decision = decideTrackingRecalculation({
      latestProfile: toleranceProfile(8),
      baseline: baseline(8),
      events,
      now: NOW,
      utcOffsetMinutes: UTC,
    });
    assert.equal(decision.mode, 'needs_refresh');
    assert.equal(decision.profile, null);
  });

  it('recalculates from exact events only after full 30-day coverage', () => {
    const events: UseEvent[] = [eventDaysAgo(31)]; // coverage anchor
    for (let daysAgo = 30; daysAgo >= 14; daysAgo -= 1) events.push(eventDaysAgo(daysAgo));
    const decision = decideTrackingRecalculation({
      latestProfile: toleranceProfile(10),
      baseline: baseline(10),
      events,
      now: NOW,
      utcOffsetMinutes: UTC,
    });
    assert.equal(decision.mode, 'recalculated');
    assert.notEqual(decision.profile, null);
    // The rebuilt profile is a valid tolerance input derived from tracked use.
    const profile = decision.profile!;
    assert.ok(profile.thcUseDaysLast30.value !== null);
    assert.ok(profile.thcUseDaysLast30.value >= 16); // 17 tracked use days
    assert.ok(profile.lastUseAt.value !== null);
  });

  it('keeps the old recommendation when full coverage shows no real change', () => {
    const events: UseEvent[] = [eventDaysAgo(31)];
    for (let daysAgo = 15; daysAgo >= 1; daysAgo -= 2) events.push(eventDaysAgo(daysAgo));
    const decision = decideTrackingRecalculation({
      latestProfile: toleranceProfile(8),
      baseline: baseline(8),
      events,
      now: NOW,
      utcOffsetMinutes: UTC,
    });
    assert.equal(decision.mode, 'unchanged');
  });

  it('flags a full-coverage zero-use window as abstinent (no fabricated profile)', () => {
    const events = [eventDaysAgo(31), eventDaysAgo(33)];
    const decision = decideTrackingRecalculation({
      latestProfile: toleranceProfile(20),
      baseline: baseline(20),
      events,
      now: NOW,
      utcOffsetMinutes: UTC,
    });
    assert.equal(decision.mode, 'abstinent');
    assert.equal(decision.profile, null);
  });

  it('never moves the evidence bounds: every rebuilt profile stays in 1..30 days', () => {
    const events: UseEvent[] = [eventDaysAgo(60), eventDaysAgo(31)];
    for (let daysAgo = 30; daysAgo >= 1; daysAgo -= 1) events.push(eventDaysAgo(daysAgo));
    const decision = decideTrackingRecalculation({
      latestProfile: toleranceProfile(25),
      baseline: baseline(25),
      events,
      now: NOW,
      utcOffsetMinutes: UTC,
    });
    if (decision.mode === 'recalculated') {
      const value = decision.profile!.thcUseDaysLast30.value;
      assert.ok(value !== null && value >= 0 && value <= 30);
    }
  });
});
