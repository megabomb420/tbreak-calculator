import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateTolerance } from '../../src/domain/tolerance/tolerance-engine.ts';
import { TOLERANCE_POLICY_V3 } from '../../src/domain/policies/tolerance-policy-v3.ts';
import { validateAndNormalizeProfile } from '../../src/domain/validation/profile-validation.ts';
import { presentToleranceResult } from '../../src/application/presentation/result-presentation.ts';
import { presentCalculationRecord } from '../../src/application/history/present-calculation.ts';
import {
  CALCULATION_RECORD_VERSION,
  type CalculationRecord,
} from '../../src/application/persistence/calculation-record.ts';
import { applyAnswer, isFlowComplete, resolvedPath } from '../../src/application/questionnaire/engine.ts';
import { finishQuestionnaire } from '../../src/application/questionnaire/snapshot.ts';
import { sampleProfile, userValue, absent, C0 } from '../helpers.ts';
import type { UseProfileInput } from '../../src/domain/schemas/profile.ts';
import type { CurrentPatternDurationBand } from '../../src/domain/schemas/enums.ts';
import type { ToleranceResult } from '../../src/domain/schemas/result.ts';

const LAST_USE = '2026-08-19T22:00:00Z';
const TARGET_LIMITATION = 'heuristic_duration_target_within_range_v3';

function withDuration(profile: UseProfileInput, band: CurrentPatternDurationBand | null): UseProfileInput {
  return {
    ...profile,
    currentPatternDuration:
      band === null ? { value: null, provenance: 'missing' } : userValue(band),
  };
}

function resultOf(profile: UseProfileInput): ToleranceResult {
  return calculateTolerance(profile, TOLERANCE_POLICY_V3, C0);
}

/** Infrequent-use base (1–3 days / 30). */
function infrequentProfile(duration: CurrentPatternDurationBand | null): UseProfileInput {
  return withDuration(
    sampleProfile({
      thcUseDaysLast30: userValue(2),
      sessionsPerUseDay: userValue(1),
      products: ['flower'],
      routes: ['smoking'],
    }),
    duration,
  );
}

/** Regular non-daily base (4–15 days / 30). */
function regularProfile(duration: CurrentPatternDurationBand | null): UseProfileInput {
  return withDuration(
    sampleProfile({
      thcUseDaysLast30: userValue(10),
      sessionsPerUseDay: userValue(1),
      products: ['flower'],
      routes: ['smoking'],
    }),
    duration,
  );
}

/** Daily/heavy base (26–30 days / 30). */
function dailyProfile(duration: CurrentPatternDurationBand | null): UseProfileInput {
  return withDuration(
    sampleProfile({
      thcUseDaysLast30: userValue(27),
      sessionsPerUseDay: userValue(1),
      products: ['flower'],
      routes: ['smoking'],
    }),
    duration,
  );
}

describe('current-pattern duration moves the planning target inside the evidence range (tolerance-v3)', () => {
  it('infrequent: a recent pattern selects the lower anchor, a 5+ year pattern the upper anchor', () => {
    const recent = resultOf(infrequentProfile('under_1_month'));
    const long = resultOf(infrequentProfile('5_plus_years'));
    assert.equal(recent.kind, 'tolerance_result');
    assert.equal(long.kind, 'tolerance_result');
    assert.deepEqual(recent.recommendedRangeDays, { min: 2, max: 7 });
    assert.deepEqual(recent.recommendedRangeDays, long.recommendedRangeDays);
    assert.equal(recent.preferredTargetDays, 2);
    assert.equal(long.preferredTargetDays, 7);
    assert.ok(recent.limitations.includes(TARGET_LIMITATION));
    assert.equal(long.limitations.includes(TARGET_LIMITATION), false);
  });

  it('regular non-daily: recent selects 7, long-established selects 14 inside the same 7–14 range', () => {
    const recent = resultOf(regularProfile('under_1_month'));
    const long = resultOf(regularProfile('5_plus_years'));
    assert.deepEqual(recent.recommendedRangeDays, { min: 7, max: 14 });
    assert.deepEqual(recent.recommendedRangeDays, long.recommendedRangeDays);
    assert.equal(recent.preferredTargetDays, 7);
    assert.equal(long.preferredTargetDays, 14);
  });

  it('daily: recent selects the lower anchor 21, long-established the upper anchor 28', () => {
    const recent = resultOf(dailyProfile('under_1_month'));
    const long = resultOf(dailyProfile('5_plus_years'));
    assert.deepEqual(recent.recommendedRangeDays, { min: 21, max: 28 });
    assert.deepEqual(recent.recommendedRangeDays, long.recommendedRangeDays);
    assert.equal(recent.preferredTargetDays, 21);
    assert.equal(long.preferredTargetDays, 28);
  });

  it('1–6 months behaves like a recently established pattern (lower anchor)', () => {
    const fewMonths = resultOf(dailyProfile('1_to_6_months'));
    const underOneMonth = resultOf(dailyProfile('under_1_month'));
    assert.equal(fewMonths.kind, 'tolerance_result');
    if (fewMonths.kind !== 'tolerance_result') return;
    assert.equal(fewMonths.preferredTargetDays, 21);
    assert.equal(fewMonths.preferredTargetDays, underOneMonth.preferredTargetDays);
  });

  it('6–24 months and 2–5 years behave like established patterns (upper anchor)', () => {
    const oneToTwoYears = resultOf(dailyProfile('6_to_24_months'));
    const fewYears = resultOf(dailyProfile('2_to_5_years'));
    const fivePlus = resultOf(dailyProfile('5_plus_years'));
    assert.equal(oneToTwoYears.kind, 'tolerance_result');
    if (oneToTwoYears.kind !== 'tolerance_result') return;
    assert.equal(oneToTwoYears.preferredTargetDays, 28);
    assert.equal(fewYears.preferredTargetDays, 28);
    assert.equal(fivePlus.preferredTargetDays, 28);
  });

  it('daily + multiple sessions keeps 21-28; tier 4 never moves and recent never exceeds it', () => {
    const established = resultOf(
      sampleProfile({
        thcUseDaysLast30: userValue(28),
        sessionsPerUseDay: userValue(3),
        currentPatternDuration: userValue('5_plus_years'),
      }),
    );
    const recent = resultOf(
      sampleProfile({
        thcUseDaysLast30: userValue(28),
        sessionsPerUseDay: userValue(3),
        currentPatternDuration: userValue('under_1_month'),
      }),
    );
    assert.equal(established.kind, 'tolerance_result');
    assert.equal(recent.kind, 'tolerance_result');
    if (established.kind !== 'tolerance_result' || recent.kind !== 'tolerance_result') return;
    assert.deepEqual(established.recommendedRangeDays, { min: 21, max: 28 });
    assert.deepEqual(recent.recommendedRangeDays, { min: 21, max: 28 });
    assert.ok(established.drivers.includes('multiple_sessions_per_day'));
    assert.ok(recent.drivers.includes('multiple_sessions_per_day'));
    assert.equal(established.preferredTargetDays, 28);
    assert.equal(recent.preferredTargetDays, 21);
    // Intensity is present on a tier-4 profile but cannot raise the band, so
    // the v3 intensity limitation is NOT emitted for either profile.
    assert.equal(recent.limitations.includes('heuristic_frequency_intensity_v3'), false);
    assert.equal(established.limitations.includes('heuristic_frequency_intensity_v3'), false);
    assert.ok(recent.limitations.includes(TARGET_LIMITATION));
    assert.equal(established.limitations.includes(TARGET_LIMITATION), false);
  });

  it('daily + concentrate and daily + dabbing keep 21–28 without extra days for long-established use', () => {
    const concentrate = resultOf(
      sampleProfile({
        thcUseDaysLast30: userValue(30),
        sessionsPerUseDay: userValue(1),
        products: ['concentrate'],
        routes: ['vaping'],
        currentPatternDuration: userValue('5_plus_years'),
      }),
    );
    const dabbing = resultOf(
      sampleProfile({
        thcUseDaysLast30: userValue(30),
        sessionsPerUseDay: userValue(1),
        products: ['flower'],
        routes: ['dabbing'],
        currentPatternDuration: userValue('5_plus_years'),
      }),
    );
    assert.equal(concentrate.kind, 'tolerance_result');
    assert.equal(dabbing.kind, 'tolerance_result');
    if (concentrate.kind !== 'tolerance_result' || dabbing.kind !== 'tolerance_result') return;
    assert.deepEqual(concentrate.recommendedRangeDays, { min: 21, max: 28 });
    assert.deepEqual(dabbing.recommendedRangeDays, { min: 21, max: 28 });
    assert.equal(concentrate.preferredTargetDays, 28);
    assert.equal(dabbing.preferredTargetDays, 28);
    assert.ok(concentrate.drivers.includes('concentrate_product_use'));
    assert.ok(dabbing.drivers.includes('dabbing_route_use'));
  });

  it('two otherwise identical heavy profiles differ only in duration: same range, different target', () => {
    const base = {
      thcUseDaysLast30: userValue(27),
      sessionsPerUseDay: userValue(2),
      products: ['flower'] as const,
      routes: ['smoking'] as const,
    };
    const a = resultOf(sampleProfile({ ...base, currentPatternDuration: userValue('under_1_month') }));
    const b = resultOf(sampleProfile({ ...base, currentPatternDuration: userValue('5_plus_years') }));
    assert.equal(a.kind, 'tolerance_result');
    assert.equal(b.kind, 'tolerance_result');
    if (a.kind !== 'tolerance_result' || b.kind !== 'tolerance_result') return;
    assert.deepEqual(a.recommendedRangeDays, b.recommendedRangeDays);
    assert.deepEqual(a.recommendedRangeDays, { min: 21, max: 28 });
    assert.deepEqual(a.drivers, b.drivers);
    assert.notEqual(a.preferredTargetDays, b.preferredTargetDays);
    assert.equal(a.preferredTargetDays, 21);
    assert.equal(b.preferredTargetDays, 28);
  });

  it('long-established use may lift the frequent tier but never exceeds the 21-28 evidence band', () => {
    // v3 bounded chronicity rule: only the frequent (16-25) tier moves to
    // 21-28 when the pattern is long-established; 21-28 is never exceeded.
    const cases: ReadonlyArray<{ useDays: number; expectedRange: { min: number; max: number } }> = [
      { useDays: 3, expectedRange: { min: 2, max: 7 } },
      { useDays: 15, expectedRange: { min: 7, max: 14 } },
      { useDays: 25, expectedRange: { min: 21, max: 28 } },
      { useDays: 30, expectedRange: { min: 21, max: 28 } },
    ];
    for (const { useDays, expectedRange } of cases) {
      const result = resultOf(
        sampleProfile({
          thcUseDaysLast30: userValue(useDays),
          sessionsPerUseDay: userValue(1),
          products: ['flower'],
          routes: ['smoking'],
          currentPatternDuration: userValue('5_plus_years'),
        }),
      );
      assert.equal(result.kind, 'tolerance_result');
      if (result.kind !== 'tolerance_result' || result.recommendedRangeDays === null) continue;
      assert.deepEqual(result.recommendedRangeDays, expectedRange, `use days ${useDays}`);
      assert.equal(result.preferredTargetDays, expectedRange.max, `use days ${useDays}`);
    }
  });

  it('legacy profiles with duration missing stay valid and keep the upper anchor (no invented default)', () => {
    const legacy = sampleProfile({
      thcUseDaysLast30: userValue(20),
      sessionsPerUseDay: userValue(1),
      products: ['flower'],
      routes: ['smoking'],
    });
    assert.equal(legacy.currentPatternDuration, undefined);
    const outcome = validateAndNormalizeProfile(legacy, C0);
    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.equal(outcome.profile.currentPatternDuration.value, null);
    const result = resultOf(legacy);
    assert.deepEqual(result.recommendedRangeDays, { min: 14, max: 21 });
    assert.equal(result.preferredTargetDays, 21);
    assert.equal(result.limitations.includes(TARGET_LIMITATION), false);
    const view = presentToleranceResult(result, legacy);
    assert.equal(view.kind, 'tolerance_result');
    if (view.kind !== 'tolerance_result') return;
    assert.equal(view.contextNote, null);
    assert.equal(view.drivers.some((line) => /lower end/.test(line)), false);
    assert.equal(view.drivers.some((line) => /recommended day range/.test(line)), false);
  });

  it('history may raise the planning target to an in-range anchor but never moves the range', () => {
    const history = [
      {
        id: 'b1',
        durationDays: 14,
        toleranceReductionScore: 6,
        endedAt: '2026-06-01T00:00:00Z',
        createdAt: '2026-05-01T00:00:00Z',
      },
      {
        id: 'b2',
        durationDays: 21,
        toleranceReductionScore: 9,
        endedAt: '2026-06-20T00:00:00Z',
        createdAt: '2026-05-20T00:00:00Z',
      },
    ];
    // Recent pattern on a 20 use-day profile anchors 14 (lower end). The clean
    // in-range 21-day observation raises the planning target, never the range.
    const recent = resultOf(sampleProfile({ previousBreaks: history, currentPatternDuration: userValue('under_1_month') }));
    const recentWithoutHistory = resultOf(sampleProfile({ currentPatternDuration: userValue('under_1_month') }));
    // A long-established 20-day profile is lifted to 21-28 by chronicity; its
    // anchor is already the top of the range, so history cannot raise it.
    const established = resultOf(sampleProfile({ previousBreaks: history, currentPatternDuration: userValue('5_plus_years') }));
    const establishedWithoutHistory = resultOf(sampleProfile({ currentPatternDuration: userValue('5_plus_years') }));
    assert.equal(recent.kind, 'tolerance_result');
    assert.equal(recentWithoutHistory.kind, 'tolerance_result');
    assert.equal(established.kind, 'tolerance_result');
    assert.equal(establishedWithoutHistory.kind, 'tolerance_result');
    if (
      recent.kind !== 'tolerance_result' ||
      recentWithoutHistory.kind !== 'tolerance_result' ||
      established.kind !== 'tolerance_result' ||
      establishedWithoutHistory.kind !== 'tolerance_result'
    ) {
      return;
    }
    // History never moves the range.
    assert.deepEqual(recent.recommendedRangeDays, recentWithoutHistory.recommendedRangeDays);
    assert.deepEqual(established.recommendedRangeDays, establishedWithoutHistory.recommendedRangeDays);
    assert.deepEqual(recent.drivers, recentWithoutHistory.drivers);
    assert.deepEqual(established.drivers, establishedWithoutHistory.drivers);
    // Recent: anchor 14 raised to the observed 21 (v3 history override).
    assert.equal(recentWithoutHistory.preferredTargetDays, 14);
    assert.equal(recent.preferredTargetDays, 21);
    assert.ok(recent.limitations.includes('heuristic_history_target_within_range_v3'));
    // Established: chronicity already selected the 21-28 band's upper anchor.
    assert.equal(established.preferredTargetDays, establishedWithoutHistory.preferredTargetDays);
    assert.equal(established.preferredTargetDays, 28);
    assert.equal(established.limitations.includes('heuristic_history_target_within_range_v3'), false);
    assert.notEqual(recent.historyInsight, null);
  });
});

describe('result rationale and outlook follow the duration-aware target', () => {
  it('recent lower-anchor results explain the lower-end choice honestly', () => {
    const profile = dailyProfile('under_1_month');
    const result = resultOf(profile);
    const view = presentToleranceResult(result, profile);
    assert.equal(view.kind, 'tolerance_result');
    if (view.kind !== 'tolerance_result') return;
    assert.equal(view.preferredTargetDays, 21);
    assert.ok(view.drivers.some((line) => /weeks rather than years/.test(line)));
    assert.ok(view.drivers.some((line) => /lower end of the 21–28-day range/.test(line)));
    assert.equal(view.drivers.some((line) => /predicted reset date/.test(line)), true);
    assert.notEqual(view.contextNote, null);
    assert.equal(view.outlook?.days.length, 21);
    assert.equal(view.outlook?.tone, 'heavier');
  });

  it('established upper-anchor results explain the upper-end choice honestly', () => {
    const profile = dailyProfile('5_plus_years');
    const result = resultOf(profile);
    const view = presentToleranceResult(result, profile);
    assert.equal(view.kind, 'tolerance_result');
    if (view.kind !== 'tolerance_result') return;
    assert.equal(view.preferredTargetDays, 28);
    assert.ok(view.drivers.some((line) => /many years/.test(line)));
    assert.ok(view.drivers.some((line) => /upper end of the 21–28-day range/.test(line)));
    assert.equal(view.outlook?.days.length, 28);
  });

  it('recent infrequent use produces a short outlook with lighter tone', () => {
    const profile = infrequentProfile('under_1_month');
    const view = presentToleranceResult(resultOf(profile), profile);
    assert.equal(view.kind, 'tolerance_result');
    if (view.kind !== 'tolerance_result') return;
    assert.equal(view.outlook?.days.length, 2);
    assert.equal(view.outlook?.tone, 'lighter');
  });
});

describe('frozen historical records stay immutable', () => {
  it('renders a tolerance-v1 record with its stored top-of-range target, never recomputing it', () => {
    // A 0.6.x-era record: same heavy profile + a stored `under_1_month` band,
    // but frozen under tolerance-v1 where duration was contextual only and the
    // target was always the range maximum (28).
    const profile = dailyProfile('under_1_month');
    const frozenValue: ToleranceResult = {
      kind: 'tolerance_result',
      recommendedRangeDays: { min: 21, max: 28 },
      preferredTargetDays: 28,
      recommendationStatus: 'heuristic',
      evidenceConfidence: 'low',
      personalisationConfidence: 'low',
      uncertaintySummaryCode: 'broad_heuristic_individual_response_varies',
      withdrawal: null,
      drivers: ['near_daily_or_daily_use'],
      historyInsight: null,
      limitations: [],
      policyVersion: 'tolerance-v1',
      calculatedAt: C0,
    };
    const record: CalculationRecord = {
      id: 'frozen-v1-record',
      schemaVersion: CALCULATION_RECORD_VERSION,
      calculatedAt: C0,
      inputSchemaVersion: 'use-profile-v1',
      policyVersion: 'tolerance-v1',
      snapshot: { kind: 'use_profile', profile },
      result: { type: 'tolerance', value: frozenValue },
    };
    const view = presentCalculationRecord(record);
    assert.equal(view.kind, 'tolerance_result');
    if (view.kind !== 'tolerance_result') return;
    // Stored numeric output survives verbatim under the presentation layer.
    assert.deepEqual(view.rangeDays, { min: 21, max: 28 });
    assert.equal(view.preferredTargetDays, 28);
    // Duration copy stays contextual (it did not drive this frozen target),
    // and no recent->lower-end claim is invented for a stored upper target.
    assert.ok(view.drivers.some((line) => /weeks rather than years/.test(line)));
    assert.ok(view.drivers.some((line) => /useful context\. It does not change the recommended day range/.test(line)));
    assert.equal(view.drivers.some((line) => /lower end/.test(line)), false);
    assert.equal(view.drivers.some((line) => /predicted reset date/.test(line)), false);
  });
});

describe('questionnaire routing for current pattern duration', () => {
  it('asks duration first on consuming routes, before use-days and last use', () => {
    assert.deepEqual(resolvedPath({ goal: 'tolerance_reset', thcUseDaysLast30: 3 }), [
      'Q1',
      'Q6',
      'Q2',
      'Q3',
    ]);
    assert.deepEqual(resolvedPath({ goal: 'tolerance_reset', thcUseDaysLast30: 10 }), [
      'Q1',
      'Q6',
      'Q2',
      'Q3',
      'Q4',
      'Q5',
    ]);
    assert.deepEqual(resolvedPath({ goal: 'tolerance_reset', thcUseDaysLast30: 20 }), [
      'Q1',
      'Q6',
      'Q2',
      'Q3',
      'Q4',
      'Q5',
    ]);
    // Zero use-days is only known after Q2; Q6 is already asked on the route.
    assert.deepEqual(resolvedPath({ goal: 'tolerance_reset', thcUseDaysLast30: 0 }), [
      'Q1',
      'Q6',
      'Q2',
      'Q3-opt',
    ]);
    assert.deepEqual(resolvedPath({ goal: 'abstinence' }), ['Q1', 'Q6', 'Q2A']);
    assert.deepEqual(
      resolvedPath({ goal: 'reduction', breakRequested: false, thcUseDaysLast30: 10 }),
      ['Q1', 'Q2R', 'Q2'],
    );
    assert.deepEqual(
      resolvedPath({ goal: 'reduction', breakRequested: true, thcUseDaysLast30: 10 }),
      ['Q1', 'Q2R', 'Q6', 'Q2', 'Q3', 'Q4', 'Q5'],
    );
    // Detection never asks Q6.
    assert.deepEqual(resolvedPath({ goal: 'detection_information' }), ['Q1', 'Q2D', 'Q3D']);
  });

  it('sessions/products/routes are collected from 4 use-days upward, never below', () => {
    // A 1-3 very-infrequent user is never routed to Q4/Q5 because isolated
    // concentrate/dabbing at that frequency is not treated as heavy.
    assert.deepEqual(resolvedPath({ goal: 'tolerance_reset', thcUseDaysLast30: 3 }), [
      'Q1',
      'Q6',
      'Q2',
      'Q3',
    ]);
    assert.ok(resolvedPath({ goal: 'tolerance_reset', thcUseDaysLast30: 15 }).includes('Q6'));
    assert.equal(resolvedPath({ goal: 'tolerance_reset', thcUseDaysLast30: 15 }).includes('Q4'), true);
    assert.equal(resolvedPath({ goal: 'tolerance_reset', thcUseDaysLast30: 15 }).includes('Q5'), true);
    assert.equal(resolvedPath({ goal: 'tolerance_reset', thcUseDaysLast30: 4 }).includes('Q4'), true);
  });

  it('requires Q6 before a new 1-3 calculation can finish', () => {
    let answers = applyAnswer({}, { step: 'Q1', value: 'tolerance_reset' }, C0);
    answers = applyAnswer(answers, { step: 'Q6', value: '1_to_6_months' }, C0);
    answers = applyAnswer(answers, { step: 'Q2', value: 3 }, C0);
    answers = applyAnswer(answers, { step: 'Q3', value: LAST_USE }, C0);
    assert.equal(isFlowComplete(answers, C0), true);
    const finished = finishQuestionnaire(answers, C0);
    assert.equal(finished.status, 'complete');
    if (finished.status !== 'complete' || finished.snapshot.kind !== 'use_profile') return;
    assert.equal(finished.snapshot.profile.currentPatternDuration?.value, '1_to_6_months');
  });

  it('rejects an unknown duration band and accepts a missing wrapper', () => {
    const invalid = sampleProfile({
      currentPatternDuration: userValue('forever' as CurrentPatternDurationBand),
    });
    const failed = validateAndNormalizeProfile(invalid, C0);
    assert.equal(failed.ok, false);
    if (failed.ok) return;
    assert.ok(failed.errors.some((error) => error.code === 'invalid_current_pattern_duration'));
    const missing = sampleProfile({ currentPatternDuration: { value: null, provenance: 'missing' } });
    assert.equal(validateAndNormalizeProfile(missing, C0).ok, true);
  });
});
