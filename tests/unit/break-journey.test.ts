import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { presentBreakOutlook } from '../../src/application/presentation/break-outlook.ts';
import { presentBreakJourney } from '../../src/application/presentation/break-journey.ts';
import { abstinenceDayAt } from '../../src/domain/breaks/break-time.ts';
import { toInstant, type Instant } from '../../src/domain/schemas/time.ts';
import type { ExposureContext } from '../../src/domain/guidance/break-outlook.ts';
import type { DailyCheckin } from '../../src/domain/schemas/profile.ts';

const EXPOSURE: ExposureContext = {
  useDaysLast30: 10,
  sessionsPerUseDay: null,
  products: [],
  routes: [],
  currentPatternDuration: null,
};

function journeyFor(
  targetDays: number | null,
  currentDay: number | null,
  opts: {
    readonly openEnded?: boolean;
    readonly checkins?: readonly DailyCheckin[];
    readonly lastUseAt?: Instant | null;
    readonly preview?: boolean;
  } = {},
) {
  const outlook = presentBreakOutlook({
    targetDays,
    openEnded: opts.openEnded ?? false,
    currentDay,
    exposure: EXPOSURE,
    checkins: opts.checkins ?? [],
    lastUseAt: opts.lastUseAt ?? null,
  });
  return presentBreakJourney(outlook, { preview: opts.preview });
}

function checkin(recordedAt: string): DailyCheckin {
  return {
    recordedAt,
    craving: null,
    sleep: null,
    irritability: null,
    anxiety: null,
    appetite: null,
    usedThc: false,
    usedAt: null,
    note: null,
  };
}

describe('break journey legs', () => {
  it('covers exactly the plan span for a 7-day target, all upcoming in preview', () => {
    const journey = journeyFor(7, null);
    assert.equal(journey.preview, true);
    assert.equal(journey.targetDays, 7);
    assert.deepEqual(
      journey.legs.map((leg) => [leg.id, leg.fromDay, leg.toDay]),
      [
        ['days_1_3', 1, 1],
        ['days_2_6', 2, 6],
        ['days_7_14', 7, 7],
      ],
    );
    assert.ok(journey.legs.every((leg) => leg.status === 'preview'));
  });

  it('covers exactly Days 1–28 for a 28-day target with no beyond-28 leg', () => {
    const journey = journeyFor(28, null);
    assert.deepEqual(
      journey.legs.map((leg) => leg.id),
      ['days_1_3', 'days_2_6', 'days_7_14', 'days_14_21', 'days_21_28'],
    );
    assert.equal(journey.legs[journey.legs.length - 1]?.toDay, 28);
  });

  it('keeps the same path with no target for open-ended tracking', () => {
    const journey = journeyFor(null, null, { openEnded: true });
    assert.equal(journey.targetDays, null);
    assert.equal(journey.openEnded, true);
    assert.deepEqual(
      journey.legs.map((leg) => leg.id),
      ['days_1_3', 'days_2_6', 'days_7_14', 'days_14_21', 'days_21_28'],
    );
  });

  it('forces preview even when the result carries an elapsed day', () => {
    const journey = journeyFor(14, 5, { preview: true });
    assert.equal(journey.currentDay, null);
    assert.ok(journey.legs.every((leg) => leg.status === 'preview'));
  });

  it('positions past / current / future legs around the live day', () => {
    const journey = journeyFor(21, 9);
    assert.equal(journey.preview, false);
    assert.deepEqual(
      journey.legs.map((leg) => leg.status),
      ['past', 'past', 'current', 'future', 'future'],
    );
    const current = journey.legs.find((leg) => leg.status === 'current');
    assert.equal(current?.id, 'days_7_14');
    assert.ok(current !== undefined && current.fromDay <= 9 && 9 <= current.toDay);
  });

  it('marks every leg past once the live day is beyond the target', () => {
    const journey = journeyFor(21, 24);
    assert.ok(journey.legs.every((leg) => leg.status === 'past'));
  });

  it('carries saved check-ins onto their exact past days', () => {
    const anchor = toInstant(Date.UTC(2026, 0, 10, 12, 0, 0));
    const recorded = '2026-01-12T12:00:00.000Z';
    const day = abstinenceDayAt(toInstant(Date.parse(recorded)), anchor);
    const journey = journeyFor(21, 6, {
      checkins: [checkin(recorded)],
      lastUseAt: anchor,
    });
    const markers = journey.legs.flatMap((leg) => leg.days);
    const marked = markers.filter((marker) => marker.hasCheckin);
    assert.deepEqual(marked.map((marker) => marker.day), [day]);
    assert.equal(markers.length, 21);
  });
});
