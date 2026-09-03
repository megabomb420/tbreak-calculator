import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveBreakOutlook,
  deriveDayOutlook,
  exposureTone,
  outlookDayCount,
  windowIdsOverlappingSpan,
  type ExposureContext,
} from '../../src/domain/guidance/break-outlook.ts';
import { presentBreakOutlook } from '../../src/application/presentation/break-outlook.ts';
import { calculateTolerance } from '../../src/domain/tolerance/tolerance-engine.ts';
import { TOLERANCE_POLICY_V1 } from '../../src/domain/policies/tolerance-policy-v1.ts';
import { sampleProfile, C0 } from '../helpers.ts';
import { toInstant } from '../../src/domain/schemas/time.ts';

function exposure(overrides: Partial<ExposureContext> = {}): ExposureContext {
  return {
    useDaysLast30: 10,
    sessionsPerUseDay: null,
    products: [],
    routes: [],
    currentPatternDuration: null,
    ...overrides,
  };
}

describe('break outlook span', () => {
  it('emits exactly Days 1–7 / 1–14 / 1–21 / 1–28 with no duplicates or gaps', () => {
    for (const target of [7, 14, 21, 28] as const) {
      const outlook = deriveBreakOutlook({
        targetDays: target,
        openEnded: false,
        exposure: exposure(),
      });
      assert.equal(outlook.days.length, target);
      assert.deepEqual(
        outlook.days.map((day) => day.day),
        Array.from({ length: target }, (_, index) => index + 1),
      );
      assert.equal(new Set(outlook.days.map((day) => day.day)).size, target);
      assert.equal(outlookDayCount({ targetDays: target, openEnded: false }), target);
    }
  });

  it('preserves overlapping evidence windows on shared days', () => {
    const day2 = deriveDayOutlook(2, 'typical');
    assert.deepEqual(day2.windowIds, ['days_1_3', 'days_2_6']);
    const day14 = deriveDayOutlook(14, 'typical');
    assert.ok(day14.windowIds.includes('days_7_14'));
    assert.ok(day14.windowIds.includes('days_14_21'));
    const day21 = deriveDayOutlook(21, 'typical');
    assert.ok(day21.windowIds.includes('days_14_21'));
    assert.ok(day21.windowIds.includes('days_21_28'));
    assert.deepEqual(windowIdsOverlappingSpan(1, 7), ['days_1_3', 'days_2_6', 'days_7_14']);
  });

  it('marks the current day on an already-abstinent preview', () => {
    const view = presentBreakOutlook({
      targetDays: 14,
      openEnded: false,
      currentDay: 5,
      preview: true,
      exposure: exposure(),
    });
    assert.equal(view.days[4]?.status, 'current');
    assert.equal(view.days[0]?.status, 'past');
    assert.equal(view.days[5]?.status, 'future');
    assert.equal(view.currentDay, 5);
  });

  it('keeps open-ended tracking at 28 inspectable days without a finish percentage', () => {
    const outlook = deriveBreakOutlook({
      targetDays: null,
      openEnded: true,
      exposure: exposure(),
    });
    assert.equal(outlook.days.length, 28);
    assert.equal(outlook.openEnded, true);
    assert.equal(outlook.targetDays, null);
    const dumped = JSON.stringify(outlook);
    assert.doesNotMatch(dumped, /\d+\s*%/);
    assert.doesNotMatch(dumped, /reset percentage/i);
  });

  it('marks day 1 current after an interrupted plan restarts from a new last use', () => {
    const view = presentBreakOutlook({
      targetDays: 21,
      openEnded: false,
      currentDay: 1,
      preview: false,
      planned: false,
      exposure: exposure(),
    });
    assert.equal(view.days[0]?.status, 'current');
    assert.equal(view.days.slice(1).every((day) => day.status === 'future'), true);
    assert.equal(view.days.length, 21);
  });

  it('marks past / current / future on an active plan and maps a stored check-in to that day', () => {
    const lastUseAt = toInstant(1_786_924_800_000); // 2026-08-17
    const view = presentBreakOutlook({
      targetDays: 14,
      openEnded: false,
      currentDay: 4,
      preview: false,
      planned: false,
      exposure: exposure(),
      lastUseAt,
      checkins: [
        {
          recordedAt: '2026-08-19T12:00:00Z',
          craving: 7,
          sleep: 4,
          irritability: null,
          anxiety: null,
          appetite: null,
          usedThc: false,
          usedAt: null,
          note: null,
        },
      ],
    });
    assert.equal(view.days[0]?.status, 'past');
    assert.equal(view.days[3]?.status, 'current');
    assert.equal(view.days[4]?.status, 'future');
    const day3 = view.days.find((day) => day.day === 3);
    assert.equal(day3?.checkin?.craving, 7);
    assert.equal(day3?.checkin?.sleep, 4);
    assert.equal(day3?.checkin?.hasAnyRating, true);
    assert.equal(view.days[0]?.checkin, null);
  });

  it('derives outlook for a legacy profile with no duration without rewriting numeric results', () => {
    const profile = sampleProfile();
    const result = calculateTolerance(profile, TOLERANCE_POLICY_V1, C0);
    const outlook = deriveBreakOutlook({
      targetDays: result.preferredTargetDays,
      openEnded: false,
      exposure: exposure({
        useDaysLast30: 20,
        sessionsPerUseDay: 1,
        products: ['flower'],
        routes: ['smoking'],
        currentPatternDuration: null,
      }),
    });
    assert.deepEqual(result.recommendedRangeDays, { min: 14, max: 21 });
    assert.equal(outlook.days.length, 21);
    assert.equal(outlook.tone, 'typical');
    assert.equal(outlook.personalisationNote, null);
  });
});

describe('exposure tone does not change numeric ranges', () => {
  it('uses lighter copy for a short infrequent pattern and heavier copy for long daily concentrate use', () => {
    const light = deriveDayOutlook(
      3,
      exposureTone(
        exposure({
          useDaysLast30: 2,
          currentPatternDuration: 'under_1_month',
        }),
      ),
    );
    const heavy = deriveDayOutlook(
      3,
      exposureTone(
        exposure({
          useDaysLast30: 30,
          sessionsPerUseDay: 3,
          products: ['concentrate'],
          routes: ['dabbing'],
          currentPatternDuration: '5_plus_years',
        }),
      ),
    );
    assert.equal(light.tone, 'lighter');
    assert.equal(heavy.tone, 'heavier');
    assert.match(light.mayNotice[0] ?? '', /less typical/);
    assert.match(heavy.mayNotice[0] ?? '', /more plausible/);
  });
});
