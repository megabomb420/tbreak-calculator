import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TOLERANCE_POLICY_V3, type TolerancePolicyV3 } from '../../src/domain/policies/tolerance-policy-v3.ts';
import { calculateTolerance } from '../../src/domain/tolerance/tolerance-engine.ts';
import type { ToleranceResult } from '../../src/domain/schemas/result.ts';
import type { PreviousBreakInput } from '../../src/domain/schemas/profile.ts';
import type { Instant } from '../../src/domain/schemas/time.ts';
import { C0, sampleProfile, userValue, absent } from '../helpers.ts';
import { toInstant } from '../../src/domain/schemas/time.ts';

const POLICY = TOLERANCE_POLICY_V3;

/** Withdrawal display for the sample profile (last use 2 h before C0). */
function withdrawalDisplayAtDay1() {
  return {
    breakDay: 1,
    elapsedHours: 2,
    anchors: [
      { anchor: 'onset', status: 'current' },
      { anchor: 'common_peak', status: 'upcoming' },
      { anchor: 'substantial_improvement', status: 'upcoming' },
      { anchor: 'sleep_disturbance', status: null },
    ],
  };
}

function previousBreak(overrides: Partial<PreviousBreakInput> = {}): PreviousBreakInput {
  return {
    id: 'b1',
    durationDays: 14,
    toleranceReductionScore: 6,
    endedAt: '2026-06-01T00:00:00Z',
    createdAt: '2026-05-01T00:00:00Z',
    ...overrides,
  };
}

function resultOf(input: ReturnType<typeof sampleProfile>, at: Instant = C0): ToleranceResult {
  return calculateTolerance(input, POLICY, at);
}

function zeroDayProfile() {
  return sampleProfile({
    thcUseDaysLast30: userValue(0),
    sessionsPerUseDay: absent(),
    products: [],
    routes: [],
    lastUseAt: absent(),
  });
}

const nullResultFields = (kind: ToleranceResult['kind']): ToleranceResult => ({
  kind,
  recommendedRangeDays: null,
  preferredTargetDays: null,
  recommendationStatus: null,
  evidenceConfidence: null,
  personalisationConfidence: null,
  uncertaintySummaryCode: null,
  withdrawal: null,
  drivers: [],
  historyInsight: null,
  limitations: [],
  policyVersion: 'tolerance-v3',
  calculatedAt: C0,
});

describe('Tolerance Engine: goal routing (spec 7.4)', () => {
  it('tolerance_reset with positive use days returns tolerance_result', () => {
    const result = resultOf(sampleProfile());
    assert.equal(result.kind, 'tolerance_result');
    assert.deepEqual(result.recommendedRangeDays, { min: 14, max: 21 });
    assert.equal(result.preferredTargetDays, 21);
  });

  it('reduction with breakRequested = true calculates a range', () => {
    const result = resultOf(sampleProfile({ goal: 'reduction', breakRequested: true }));
    assert.equal(result.kind, 'tolerance_result');
    assert.deepEqual(result.recommendedRangeDays, { min: 14, max: 21 });
  });

  it('reduction with breakRequested = false returns planning_only with no range', () => {
    const result = resultOf(
      sampleProfile({ goal: 'reduction', breakRequested: false, postBreakMode: 'undecided' }),
    );
    assert.deepEqual(result, nullResultFields('planning_only'));
  });

  it('abstinence returns planning_only with a withdrawal display anchored to last use', () => {
    const heavy = sampleProfile({
      goal: 'abstinence',
      breakRequested: false,
      thcUseDaysLast30: userValue(30),
      sessionsPerUseDay: userValue(4),
      products: ['concentrate'],
      routes: ['dabbing'],
    });
    const result = resultOf(heavy);
    assert.equal(result.kind, 'planning_only');
    assert.equal(result.recommendedRangeDays, null);
    assert.deepEqual(result.withdrawal, withdrawalDisplayAtDay1());
  });

  it('abstinence planning output is anchored to the authoritative last use (UX D2)', () => {
    // Abstinence without a last use is now invalid input, so the engine
    // returns validation_error instead of planning output without a timeline.
    const input = sampleProfile({
      goal: 'abstinence',
      breakRequested: false,
      thcUseDaysLast30: absent(),
      sessionsPerUseDay: absent(),
      products: [],
      routes: [],
      lastUseAt: absent(),
    });
    assert.equal(resultOf(input).kind, 'validation_error');

    // A valid abstinence profile (last use only) always carries a withdrawal
    // display because the timeline is anchored to the required last use.
    const minimal = sampleProfile({
      goal: 'abstinence',
      breakRequested: false,
      thcUseDaysLast30: absent(),
      sessionsPerUseDay: absent(),
      products: [],
      routes: [],
      lastUseAt: userValue('2026-08-19T22:00:00Z'),
    });
    const planning = resultOf(minimal);
    assert.equal(planning.kind, 'planning_only');
    assert.equal(planning.recommendedRangeDays, null);
    assert.deepEqual(planning.withdrawal, withdrawalDisplayAtDay1());
  });

  it('reduction without a break does not claim an abstinence timeline', () => {
    const result = resultOf(sampleProfile({ goal: 'reduction', breakRequested: false }));
    assert.equal(result.kind, 'planning_only');
    assert.equal(result.withdrawal, null);
  });

  it('reduction without a break needs no last use to produce planning output (UX D3)', () => {
    const result = resultOf(
      sampleProfile({
        goal: 'reduction',
        breakRequested: false,
        sessionsPerUseDay: absent(),
        products: [],
        routes: [],
        lastUseAt: absent(),
      }),
    );
    assert.deepEqual(result, nullResultFields('planning_only'));
  });

  it('1–3 very-infrequent use needs no intensity fields and never moves (UX D1)', () => {
    for (const useDays of [1, 2, 3]) {
      const result = resultOf(
        sampleProfile({
          thcUseDaysLast30: userValue(useDays),
          sessionsPerUseDay: absent(),
          products: [],
          routes: [],
        }),
      );
      assert.equal(result.kind, 'tolerance_result', `use days ${useDays}`);
      assert.deepEqual(result.recommendedRangeDays, { min: 2, max: 7 });
      assert.deepEqual(result.drivers, ['very_infrequent_use']);
      assert.equal(result.limitations.length, 0);
    }
  });

  it('4+ use days on a range route requires intensity fields or returns validation_error', () => {
    for (const useDays of [4, 10, 15]) {
      const result = resultOf(
        sampleProfile({
          thcUseDaysLast30: userValue(useDays),
          sessionsPerUseDay: absent(),
          products: [],
          routes: [],
        }),
      );
      assert.equal(result.kind, 'validation_error', `use days ${useDays}`);
    }
  });

  it('detection_information returns not_applicable without running the engine', () => {
    const input = sampleProfile({
      goal: 'detection_information',
      breakRequested: false,
      thcUseDaysLast30: absent(),
      sessionsPerUseDay: absent(),
      products: [],
      routes: [],
      lastUseAt: absent(),
    });
    assert.deepEqual(resultOf(input), nullResultFields('not_applicable'));
  });

  it('zero use days with a requested range returns not_applicable with low-baseline driver', () => {
    const result = resultOf(zeroDayProfile());
    assert.deepEqual(result, {
      ...nullResultFields('not_applicable'),
      drivers: ['baseline_tolerance_likely_low'],
    });
  });
});

describe('Tolerance Engine: base band boundaries (spec 7.3, invariant item 4)', () => {
  const expectedBands: ReadonlyArray<{ useDays: number; range: { min: number; max: number } }> = [
    { useDays: 1, range: { min: 2, max: 7 } },
    { useDays: 3, range: { min: 2, max: 7 } },
    { useDays: 4, range: { min: 7, max: 14 } },
    { useDays: 15, range: { min: 7, max: 14 } },
    { useDays: 16, range: { min: 14, max: 21 } },
    { useDays: 25, range: { min: 14, max: 21 } },
    { useDays: 26, range: { min: 21, max: 28 } },
    { useDays: 30, range: { min: 21, max: 28 } },
  ];

  it('maps every boundary count to its specified base band', () => {
    for (const { useDays, range } of expectedBands) {
      const result = resultOf(sampleProfile({ thcUseDaysLast30: userValue(useDays) }));
      assert.equal(result.kind, 'tolerance_result');
      assert.deepEqual(result.recommendedRangeDays, range, `use days ${useDays}`);
      assert.equal(result.preferredTargetDays, range.max);
    }
  });

  it('sweeps every use-day count 1..30 onto a non-overlapping base band', () => {
    const bandFor = (d: number): { min: number; max: number } => {
      if (d <= 3) return { min: 2, max: 7 };
      if (d <= 15) return { min: 7, max: 14 };
      if (d <= 25) return { min: 14, max: 21 };
      return { min: 21, max: 28 };
    };
    for (let d = 1; d <= 30; d += 1) {
      const result = resultOf(sampleProfile({ thcUseDaysLast30: userValue(d) }));
      assert.equal(result.kind, 'tolerance_result');
      assert.deepEqual(result.recommendedRangeDays, bandFor(d), `use days ${d}`);
    }
  });
});

describe('Tolerance Engine: bounded exposure classification (spec 7.3, invariant item 5)', () => {
  it('locks frequent users (16–25 use days) with high intensity to one unambiguous 21-28 result', () => {
    const qualifying: Array<ReturnType<typeof sampleProfile>> = [
      sampleProfile({ thcUseDaysLast30: userValue(16), sessionsPerUseDay: userValue(2) }),
      sampleProfile({ thcUseDaysLast30: userValue(25), products: ['concentrate'], routes: ['vaping'] }),
      sampleProfile({ thcUseDaysLast30: userValue(20), routes: ['dabbing'], sessionsPerUseDay: userValue(3) }),
    ];
    for (const input of qualifying) {
      const result = resultOf(input);
      assert.equal(result.kind, 'tolerance_result');
      assert.deepEqual(result.recommendedRangeDays, { min: 21, max: 28 });
      assert.equal(result.preferredTargetDays, 28);
      assert.ok(result.limitations.includes('heuristic_frequency_intensity_v3'));
      assert.equal(result.limitations.includes('heuristic_frequency_intensity_v1'), false);
    }
  });

  it('emits decisive intensity drivers in policy order when intensity raises the tier', () => {
    const result = resultOf(
      sampleProfile({
        thcUseDaysLast30: userValue(20),
        sessionsPerUseDay: userValue(3),
        products: ['concentrate', 'flower'],
        routes: ['dabbing', 'smoking'],
      }),
    );
    assert.deepEqual(result.drivers, [
      'frequent_use',
      'multiple_sessions_per_day',
      'concentrate_product_use',
      'dabbing_route_use',
    ]);
  });

  it('does not treat vape product or vaping route as a concentrate/dabbing intensity signal', () => {
    const result = resultOf(
      sampleProfile({
        thcUseDaysLast30: userValue(20),
        sessionsPerUseDay: userValue(1),
        products: ['vape'],
        routes: ['vaping'],
      }),
    );
    assert.equal(result.kind, 'tolerance_result');
    assert.deepEqual(result.recommendedRangeDays, { min: 14, max: 21 });
    assert.equal(result.preferredTargetDays, 21);
    assert.equal(result.limitations.length, 0);
    assert.equal(result.drivers.includes('concentrate_product_use'), false);
    assert.equal(result.drivers.includes('dabbing_route_use'), false);
  });

  it('never moves the 1–3 very-infrequent tier, even with concentrate/dabbing and years of history', () => {
    for (const d of [1, 2, 3]) {
      const result = resultOf(
        sampleProfile({
          thcUseDaysLast30: userValue(d),
          sessionsPerUseDay: userValue(3),
          products: ['concentrate'],
          routes: ['dabbing'],
          currentPatternDuration: userValue('5_plus_years'),
        }),
      );
      assert.equal(result.kind, 'tolerance_result');
      assert.deepEqual(result.recommendedRangeDays, { min: 2, max: 7 }, `use days ${d}`);
      assert.equal(result.limitations.length, 0, `use days ${d}`);
      // Intensity drivers still describe the pattern, but no tier moves.
      assert.deepEqual(result.drivers, [
        'very_infrequent_use',
        'multiple_sessions_per_day',
        'concentrate_product_use',
        'dabbing_route_use',
      ]);
    }
  });

  it('moves a regular non-daily (4–15) profile one tier up when intensity is high', () => {
    const result = resultOf(
      sampleProfile({
        thcUseDaysLast30: userValue(10),
        sessionsPerUseDay: userValue(2),
        products: ['concentrate'],
        routes: ['dabbing'],
      }),
    );
    assert.equal(result.kind, 'tolerance_result');
    assert.deepEqual(result.recommendedRangeDays, { min: 14, max: 21 });
    assert.deepEqual(result.drivers, [
      'regular_nondaily_use',
      'multiple_sessions_per_day',
      'concentrate_product_use',
      'dabbing_route_use',
    ]);
    assert.ok(result.limitations.includes('heuristic_frequency_intensity_v3'));
  });

  it('keeps 26-30 daily users at 21-28 with or without intensity inputs and emits no intensity raise', () => {
    const plain = resultOf(sampleProfile({ thcUseDaysLast30: userValue(30) }));
    const intense = resultOf(
      sampleProfile({ thcUseDaysLast30: userValue(30), sessionsPerUseDay: userValue(4), products: ['concentrate'] }),
    );
    assert.deepEqual(plain.recommendedRangeDays, { min: 21, max: 28 });
    assert.deepEqual(intense.recommendedRangeDays, { min: 21, max: 28 });
    assert.equal(plain.limitations.length, 0);
    // Tier 4 is already the top evidence band: intensity describes the pattern
    // but cannot raise the classification further.
    assert.equal(intense.limitations.includes('heuristic_frequency_intensity_v3'), false);
    assert.ok(intense.drivers.includes('concentrate_product_use'));
    assert.ok(intense.drivers.includes('multiple_sessions_per_day'));
  });

  it('a missing duration never counts as long-established at 16–25 use days', () => {
    const result = resultOf(
      sampleProfile({
        thcUseDaysLast30: userValue(20),
        sessionsPerUseDay: userValue(1),
        products: ['flower'],
        routes: ['smoking'],
      }),
    );
    assert.equal(result.kind, 'tolerance_result');
    assert.deepEqual(result.recommendedRangeDays, { min: 14, max: 21 });
    assert.equal(result.preferredTargetDays, 21);
    assert.equal(result.limitations.length, 0);
    assert.equal(result.drivers.includes('long_established_chronic_use'), false);
  });
});

describe('Tolerance Engine: uniform confidence and target invariants (spec 7.6, invariants 6-7)', () => {
  it('every tolerance_result uses low/low confidence, the heuristic status and the fixed uncertainty code', () => {
    for (let d = 1; d <= 30; d += 1) {
      const result = resultOf(sampleProfile({ thcUseDaysLast30: userValue(d) }));
      assert.equal(result.kind, 'tolerance_result');
      assert.equal(result.evidenceConfidence, 'low');
      assert.equal(result.personalisationConfidence, 'low');
      assert.equal(result.recommendationStatus, 'heuristic');
      assert.equal(result.uncertaintySummaryCode, 'broad_heuristic_individual_response_varies');
    }
  });

  it('keeps the preferred target inside the selected range for every use-day count', () => {
    const inputs: ReturnType<typeof sampleProfile>[] = [];
    for (let d = 1; d <= 30; d += 1) {
      inputs.push(sampleProfile({ thcUseDaysLast30: userValue(d) }));
      inputs.push(sampleProfile({ thcUseDaysLast30: userValue(d), sessionsPerUseDay: userValue(3) }));
      inputs.push(sampleProfile({ thcUseDaysLast30: userValue(d), products: ['concentrate'] }));
      inputs.push(
        sampleProfile({
          thcUseDaysLast30: userValue(d),
          currentPatternDuration: userValue(d % 2 === 0 ? 'under_1_month' : '5_plus_years'),
        }),
      );
    }
    for (const input of inputs) {
      const result = resultOf(input);
      if (result.kind !== 'tolerance_result' || result.recommendedRangeDays === null) continue;
      // Deterministic anchor choice: never outside the range, never above 28.
      assert.ok(result.preferredTargetDays !== null && result.preferredTargetDays <= 28);
      assert.ok(
        result.preferredTargetDays === result.recommendedRangeDays.min ||
          result.preferredTargetDays === result.recommendedRangeDays.max,
      );
    }
  });

  it('maps a missing duration (legacy) to the upper anchor, the tolerance-v1 default', () => {
    for (let d = 1; d <= 30; d += 1) {
      const result = resultOf(sampleProfile({ thcUseDaysLast30: userValue(d) }));
      if (result.kind !== 'tolerance_result' || result.recommendedRangeDays === null) continue;
      assert.equal(result.preferredTargetDays, result.recommendedRangeDays.max, `use days ${d}`);
    }
  });

  it('maps recent/medium/long patterns to duration anchors where chronicity cannot move the tier', () => {
    // Tiers 1, 2 and 4 never move by chronicity, so every duration band shares
    // the same range: recent bands anchor the lower end, established bands the
    // upper end.
    for (const useDays of [2, 10, 27]) {
      const recent = resultOf(
        sampleProfile({ thcUseDaysLast30: userValue(useDays), currentPatternDuration: userValue('under_1_month') }),
      );
      const fewMonths = resultOf(
        sampleProfile({ thcUseDaysLast30: userValue(useDays), currentPatternDuration: userValue('1_to_6_months') }),
      );
      const established = resultOf(
        sampleProfile({ thcUseDaysLast30: userValue(useDays), currentPatternDuration: userValue('6_to_24_months') }),
      );
      const long = resultOf(
        sampleProfile({ thcUseDaysLast30: userValue(useDays), currentPatternDuration: userValue('5_plus_years') }),
      );
      assert.equal(recent.kind, 'tolerance_result');
      assert.equal(fewMonths.kind, 'tolerance_result');
      assert.equal(established.kind, 'tolerance_result');
      assert.equal(long.kind, 'tolerance_result');
      if (
        recent.kind !== 'tolerance_result' ||
        fewMonths.kind !== 'tolerance_result' ||
        established.kind !== 'tolerance_result' ||
        long.kind !== 'tolerance_result' ||
        recent.recommendedRangeDays === null
      ) {
        continue;
      }
      const range = recent.recommendedRangeDays;
      assert.equal(recent.preferredTargetDays, range.min, `use days ${useDays} recent`);
      assert.equal(fewMonths.preferredTargetDays, range.min, `use days ${useDays} few months`);
      assert.equal(established.preferredTargetDays, range.max, `use days ${useDays} established`);
      assert.equal(long.preferredTargetDays, range.max, `use days ${useDays} long`);
      // On tiers chronicity cannot move, duration leaves the range identical.
      assert.deepEqual(established.recommendedRangeDays, range);
      assert.deepEqual(long.recommendedRangeDays, range);
    }
  });

  it('raises a long-established frequent (16–25, no intensity) profile to 21-28 via chronicity', () => {
    const recent = resultOf(
      sampleProfile({
        thcUseDaysLast30: userValue(20),
        currentPatternDuration: userValue('under_1_month'),
      }),
    );
    const established = resultOf(
      sampleProfile({
        thcUseDaysLast30: userValue(20),
        currentPatternDuration: userValue('6_to_24_months'),
      }),
    );
    const long = resultOf(
      sampleProfile({
        thcUseDaysLast30: userValue(20),
        currentPatternDuration: userValue('5_plus_years'),
      }),
    );
    assert.equal(recent.kind, 'tolerance_result');
    assert.equal(established.kind, 'tolerance_result');
    assert.equal(long.kind, 'tolerance_result');
    if (
      recent.kind !== 'tolerance_result' ||
      established.kind !== 'tolerance_result' ||
      long.kind !== 'tolerance_result'
    ) {
      return;
    }
    // Recent and medium stay in 14-21; only the long-established band moves one
    // tier up to 21-28, labelled by the chronicity limitation.
    assert.deepEqual(recent.recommendedRangeDays, { min: 14, max: 21 });
    assert.equal(recent.preferredTargetDays, 14);
    assert.deepEqual(established.recommendedRangeDays, { min: 14, max: 21 });
    assert.equal(established.preferredTargetDays, 21);
    assert.deepEqual(long.recommendedRangeDays, { min: 21, max: 28 });
    assert.equal(long.preferredTargetDays, 28);
    assert.ok(long.drivers.includes('long_established_chronic_use'));
    assert.ok(long.limitations.includes('heuristic_chronicity_range_v3'));
    assert.equal(long.limitations.includes('heuristic_frequency_intensity_v3'), false);
  });

  it('never lets a long-established pattern exceed the 21-28 evidence cap', () => {
    // v3 bounded rule: long duration may lift the frequent (16-25) tier to 4,
    // but the strongest evidence band is still 21-28 and is never exceeded.
    const cases: ReadonlyArray<{ useDays: number; expectedRange: { min: number; max: number } }> = [
      { useDays: 3, expectedRange: { min: 2, max: 7 } },
      { useDays: 15, expectedRange: { min: 7, max: 14 } },
      { useDays: 25, expectedRange: { min: 21, max: 28 } },
      { useDays: 30, expectedRange: { min: 21, max: 28 } },
    ];
    for (const { useDays, expectedRange } of cases) {
      const result = resultOf(
        sampleProfile({ thcUseDaysLast30: userValue(useDays), currentPatternDuration: userValue('5_plus_years') }),
      );
      assert.equal(result.kind, 'tolerance_result');
      if (result.kind !== 'tolerance_result' || result.recommendedRangeDays === null) continue;
      assert.deepEqual(result.recommendedRangeDays, expectedRange, `use days ${useDays}`);
      assert.ok(result.preferredTargetDays !== null && result.preferredTargetDays <= 28, `use days ${useDays}`);
    }
  });
});

describe('Tolerance Engine: determinism and validation failure', () => {
  it('produces structurally equal results for equal input, policy and time', () => {
    const input = sampleProfile();
    const a = resultOf(input);
    const b = resultOf(input);
    assert.deepEqual(a, b);
  });

  it('reports the policy version and the explicit calculation time', () => {
    const at = toInstant(C0 + 123456);
    const result = resultOf(sampleProfile(), at);
    assert.equal(result.policyVersion, POLICY.id);
    assert.equal(result.calculatedAt, at);
  });

  it('returns validation_error for an invalid profile instead of inventing a band', () => {
    const invalid = sampleProfile({ thcUseDaysLast30: userValue(31) });
    const result = resultOf(invalid);
    assert.equal(result.kind, 'validation_error');
    assert.equal(result.recommendedRangeDays, null);
    assert.equal(result.preferredTargetDays, null);
    assert.equal(result.evidenceConfidence, null);
    assert.equal(result.drivers.length, 0);
  });

  it('is not affected by a different policy id appearing in a validation_error result', () => {
    const otherPolicy: TolerancePolicyV3 = { ...POLICY, id: 'tolerance-v3-fake' };
    const result = calculateTolerance(sampleProfile({ thcUseDaysLast30: userValue(31) }), otherPolicy, C0);
    assert.equal(result.policyVersion, 'tolerance-v3-fake');
  });

  it('attaches the elapsed withdrawal display to every tolerance_result', () => {
    const result = resultOf(sampleProfile());
    assert.deepEqual(result.withdrawal, withdrawalDisplayAtDay1());
  });

  it('history cannot mutate the range, target, drivers or limitations', () => {
    const withHistory = resultOf(
      sampleProfile({
        previousBreaks: [previousBreak(), previousBreak({ id: 'b2', durationDays: 21, toleranceReductionScore: 9 })],
      }),
    );
    const withoutHistory = resultOf(sampleProfile());
    assert.equal(withHistory.kind, 'tolerance_result');
    assert.deepEqual(withHistory.recommendedRangeDays, withoutHistory.recommendedRangeDays);
    assert.equal(withHistory.preferredTargetDays, withoutHistory.preferredTargetDays);
    assert.deepEqual(withHistory.drivers, withoutHistory.drivers);
    assert.deepEqual(withHistory.limitations, withoutHistory.limitations);
    assert.deepEqual(withHistory.withdrawal, withoutHistory.withdrawal);
    assert.deepEqual(withHistory.historyInsight, {
      code: 'history_directional_observation',
      observations: [
        { durationDays: 14, toleranceReductionScore: 6 },
        { durationDays: 21, toleranceReductionScore: 9 },
      ],
      outsideRecommendedRange: false,
    });
  });

  it('derives history only for a tolerance_result with a current range', () => {
    const history = [previousBreak(), previousBreak({ id: 'b2', durationDays: 21, toleranceReductionScore: 9 })];
    const toleranceResult = resultOf(sampleProfile({ previousBreaks: history }));
    assert.equal(toleranceResult.kind, 'tolerance_result');
    assert.notEqual(toleranceResult.historyInsight, null);

    const planningOnly = resultOf(
      sampleProfile({ goal: 'abstinence', breakRequested: false, previousBreaks: history }),
    );
    assert.equal(planningOnly.kind, 'planning_only');
    assert.equal(planningOnly.historyInsight, null);

    const notApplicable = resultOf(
      sampleProfile({
        thcUseDaysLast30: userValue(0),
        sessionsPerUseDay: absent(),
        products: [],
        routes: [],
        lastUseAt: absent(),
        previousBreaks: history,
      }),
    );
    assert.equal(notApplicable.kind, 'not_applicable');
    assert.equal(notApplicable.historyInsight, null);
  });
});

describe('Tolerance Engine: v3 canonical outputs (spec 7.3/7.7 acceptance)', () => {
  it('use-days 27 daily/heavy: intensity present but no raise, duration picks the target', () => {
    const recent = resultOf(
      sampleProfile({
        thcUseDaysLast30: userValue(27),
        sessionsPerUseDay: userValue(3),
        currentPatternDuration: userValue('under_1_month'),
      }),
    );
    assert.deepEqual(recent.recommendedRangeDays, { min: 21, max: 28 });
    assert.equal(recent.preferredTargetDays, 21);
    assert.deepEqual(recent.drivers, ['near_daily_or_daily_use', 'multiple_sessions_per_day']);
    assert.deepEqual(recent.limitations, ['heuristic_duration_target_within_range_v3']);

    const long = resultOf(
      sampleProfile({
        thcUseDaysLast30: userValue(27),
        sessionsPerUseDay: userValue(3),
        currentPatternDuration: userValue('5_plus_years'),
      }),
    );
    assert.deepEqual(long.recommendedRangeDays, { min: 21, max: 28 });
    assert.equal(long.preferredTargetDays, 28);
    assert.deepEqual(long.limitations, []);
  });

  it('use-days 10 regular non-daily: high intensity raises tier 2 -> 3 once', () => {
    const long = resultOf(
      sampleProfile({
        thcUseDaysLast30: userValue(10),
        sessionsPerUseDay: userValue(3),
        products: ['concentrate'],
        routes: ['dabbing'],
        currentPatternDuration: userValue('5_plus_years'),
      }),
    );
    assert.deepEqual(long.recommendedRangeDays, { min: 14, max: 21 });
    assert.equal(long.preferredTargetDays, 21);
    assert.deepEqual(long.drivers, [
      'regular_nondaily_use',
      'multiple_sessions_per_day',
      'concentrate_product_use',
      'dabbing_route_use',
    ]);
    assert.deepEqual(long.limitations, ['heuristic_frequency_intensity_v3']);

    const recent = resultOf(
      sampleProfile({
        thcUseDaysLast30: userValue(10),
        sessionsPerUseDay: userValue(3),
        products: ['concentrate'],
        routes: ['dabbing'],
        currentPatternDuration: userValue('under_1_month'),
      }),
    );
    assert.deepEqual(recent.recommendedRangeDays, { min: 14, max: 21 });
    assert.equal(recent.preferredTargetDays, 14);
    assert.deepEqual(recent.limitations, [
      'heuristic_frequency_intensity_v3',
      'heuristic_duration_target_within_range_v3',
    ]);
  });

  it('use-days 10 single-session flower never raises, whatever the duration', () => {
    const long = resultOf(
      sampleProfile({
        thcUseDaysLast30: userValue(10),
        sessionsPerUseDay: userValue(1),
        products: ['flower'],
        routes: ['smoking'],
        currentPatternDuration: userValue('5_plus_years'),
      }),
    );
    assert.deepEqual(long.recommendedRangeDays, { min: 7, max: 14 });
    assert.equal(long.preferredTargetDays, 14);
    assert.deepEqual(long.drivers, ['regular_nondaily_use']);
    assert.deepEqual(long.limitations, []);
  });

  it('use-days 20 frequent: only a long-established pattern raises to 21-28 (chronicity)', () => {
    const long = resultOf(
      sampleProfile({
        thcUseDaysLast30: userValue(20),
        sessionsPerUseDay: userValue(1),
        products: ['flower'],
        routes: ['smoking'],
        currentPatternDuration: userValue('5_plus_years'),
      }),
    );
    assert.deepEqual(long.recommendedRangeDays, { min: 21, max: 28 });
    assert.equal(long.preferredTargetDays, 28);
    assert.deepEqual(long.drivers, ['frequent_use', 'long_established_chronic_use']);
    assert.deepEqual(long.limitations, ['heuristic_chronicity_range_v3']);

    const medium = resultOf(
      sampleProfile({
        thcUseDaysLast30: userValue(20),
        sessionsPerUseDay: userValue(1),
        products: ['flower'],
        routes: ['smoking'],
        currentPatternDuration: userValue('6_to_24_months'),
      }),
    );
    assert.deepEqual(medium.recommendedRangeDays, { min: 14, max: 21 });
    assert.equal(medium.preferredTargetDays, 21);
    assert.deepEqual(medium.limitations, []);

    const recent = resultOf(
      sampleProfile({
        thcUseDaysLast30: userValue(20),
        sessionsPerUseDay: userValue(1),
        products: ['flower'],
        routes: ['smoking'],
        currentPatternDuration: userValue('under_1_month'),
      }),
    );
    assert.deepEqual(recent.recommendedRangeDays, { min: 14, max: 21 });
    assert.equal(recent.preferredTargetDays, 14);
    assert.deepEqual(recent.limitations, ['heuristic_duration_target_within_range_v3']);
  });

  it('use-days 2 very infrequent never moves, even isolate concentrate/dabbing with years of history', () => {
    const result = resultOf(
      sampleProfile({
        thcUseDaysLast30: userValue(2),
        sessionsPerUseDay: userValue(1),
        products: ['concentrate'],
        routes: ['dabbing'],
        currentPatternDuration: userValue('5_plus_years'),
      }),
    );
    assert.deepEqual(result.recommendedRangeDays, { min: 2, max: 7 });
    assert.equal(result.preferredTargetDays, 7);
    assert.deepEqual(result.drivers, ['very_infrequent_use', 'concentrate_product_use', 'dabbing_route_use']);
    assert.deepEqual(result.limitations, []);
  });

  it('use-days 28 daily: concentrate/dabbing adds drivers but never a raise above 28', () => {
    const plain = resultOf(
      sampleProfile({
        thcUseDaysLast30: userValue(28),
        sessionsPerUseDay: userValue(1),
        products: ['flower'],
        routes: ['smoking'],
        currentPatternDuration: userValue('5_plus_years'),
      }),
    );
    const intense = resultOf(
      sampleProfile({
        thcUseDaysLast30: userValue(28),
        sessionsPerUseDay: userValue(1),
        products: ['concentrate'],
        routes: ['dabbing'],
        currentPatternDuration: userValue('5_plus_years'),
      }),
    );
    assert.deepEqual(plain.recommendedRangeDays, { min: 21, max: 28 });
    assert.equal(plain.preferredTargetDays, 28);
    assert.deepEqual(intense.recommendedRangeDays, { min: 21, max: 28 });
    assert.equal(intense.preferredTargetDays, 28);
    assert.deepEqual(intense.drivers, [
      'near_daily_or_daily_use',
      'concentrate_product_use',
      'dabbing_route_use',
    ]);
    assert.equal(intense.limitations.includes('heuristic_frequency_intensity_v3'), false);
  });

  it('missing duration is never long-established and keeps the upper target anchor', () => {
    const frequent = resultOf(
      sampleProfile({
        thcUseDaysLast30: userValue(20),
        sessionsPerUseDay: userValue(1),
        products: ['flower'],
        routes: ['smoking'],
      }),
    );
    assert.deepEqual(frequent.recommendedRangeDays, { min: 14, max: 21 });
    assert.equal(frequent.preferredTargetDays, 21);
    assert.deepEqual(frequent.limitations, []);
    assert.equal(frequent.drivers.includes('long_established_chronic_use'), false);

    const daily = resultOf(
      sampleProfile({
        thcUseDaysLast30: userValue(27),
        sessionsPerUseDay: userValue(3),
      }),
    );
    assert.deepEqual(daily.recommendedRangeDays, { min: 21, max: 28 });
    assert.equal(daily.preferredTargetDays, 28);
    assert.deepEqual(daily.limitations, []);
  });

  it('raises the planning target to an in-range history anchor but never moves the range', () => {
    const withHistory = resultOf(
      sampleProfile({
        thcUseDaysLast30: userValue(10),
        sessionsPerUseDay: userValue(1),
        products: ['flower'],
        routes: ['smoking'],
        currentPatternDuration: userValue('under_1_month'),
        previousBreaks: [
          previousBreak({ durationDays: 7, toleranceReductionScore: 3 }),
          previousBreak({ id: 'b2', durationDays: 14, toleranceReductionScore: 8 }),
        ],
      }),
    );
    const withoutHistory = resultOf(
      sampleProfile({
        thcUseDaysLast30: userValue(10),
        sessionsPerUseDay: userValue(1),
        products: ['flower'],
        routes: ['smoking'],
        currentPatternDuration: userValue('under_1_month'),
      }),
    );
    assert.equal(withHistory.kind, 'tolerance_result');
    assert.equal(withoutHistory.kind, 'tolerance_result');
    if (withHistory.kind !== 'tolerance_result' || withoutHistory.kind !== 'tolerance_result') return;
    assert.deepEqual(withHistory.recommendedRangeDays, withoutHistory.recommendedRangeDays);
    assert.deepEqual(withHistory.recommendedRangeDays, { min: 7, max: 14 });
    assert.deepEqual(withHistory.drivers, withoutHistory.drivers);
    // Anchor was 7 (recent lower end); the clean 14-day observation raised it.
    assert.equal(withoutHistory.preferredTargetDays, 7);
    assert.equal(withHistory.preferredTargetDays, 14);
    assert.deepEqual(withHistory.limitations, ['heuristic_history_target_within_range_v3']);
  });

  it('history outside the range or with an inversion never overrides the duration anchor', () => {
    for (const breaks of [
      // One compared duration (3) sits below today's 7-14 range.
      [
        previousBreak({ durationDays: 3, toleranceReductionScore: 2 }),
        previousBreak({ id: 'b2', durationDays: 14, toleranceReductionScore: 8 }),
      ],
      // Inversion: the longer break scored lower.
      [
        previousBreak({ durationDays: 7, toleranceReductionScore: 8 }),
        previousBreak({ id: 'b2', durationDays: 14, toleranceReductionScore: 3 }),
      ],
    ]) {
      const result = resultOf(
        sampleProfile({
          thcUseDaysLast30: userValue(10),
          sessionsPerUseDay: userValue(1),
          products: ['flower'],
          routes: ['smoking'],
          currentPatternDuration: userValue('under_1_month'),
          previousBreaks: breaks,
        }),
      );
      assert.equal(result.kind, 'tolerance_result');
      if (result.kind !== 'tolerance_result') return;
      assert.equal(result.preferredTargetDays, 7, 'duration anchor must be kept');
      assert.equal(result.limitations.includes('heuristic_history_target_within_range_v3'), false);
      assert.ok(result.limitations.includes('heuristic_duration_target_within_range_v3'));
    }
  });

  it('use-days 10 concentrate with missing duration raises to 14-21 and anchors the upper end', () => {
    const result = resultOf(
      sampleProfile({
        thcUseDaysLast30: userValue(10),
        sessionsPerUseDay: userValue(3),
        products: ['concentrate'],
        routes: ['smoking'],
      }),
    );
    assert.deepEqual(result.recommendedRangeDays, { min: 14, max: 21 });
    assert.equal(result.preferredTargetDays, 21);
    assert.deepEqual(result.drivers, [
      'regular_nondaily_use',
      'multiple_sessions_per_day',
      'concentrate_product_use',
    ]);
    assert.deepEqual(result.limitations, ['heuristic_frequency_intensity_v3']);
  });

  it('never emits the retired v1/v2 limitation codes on a v3 result', () => {
    const retired = ['heuristic_frequency_intensity_v1', 'heuristic_duration_target_within_range_v2'];
    const inputs = [
      sampleProfile({ thcUseDaysLast30: userValue(16), sessionsPerUseDay: userValue(2) }),
      sampleProfile({
        thcUseDaysLast30: userValue(20),
        sessionsPerUseDay: userValue(1),
        currentPatternDuration: userValue('5_plus_years'),
      }),
      sampleProfile({
        thcUseDaysLast30: userValue(27),
        sessionsPerUseDay: userValue(1),
        currentPatternDuration: userValue('under_1_month'),
      }),
    ];
    for (const input of inputs) {
      const result = resultOf(input);
      assert.equal(result.kind, 'tolerance_result');
      for (const code of retired) {
        assert.equal((result.limitations as readonly string[]).includes(code), false);
      }
    }
  });
});
