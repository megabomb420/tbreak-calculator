import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TOLERANCE_POLICY_V1, type TolerancePolicyV1 } from '../../src/domain/policies/tolerance-policy-v1.ts';
import { calculateTolerance } from '../../src/domain/tolerance/tolerance-engine.ts';
import type { ToleranceResult } from '../../src/domain/schemas/result.ts';
import type { Instant } from '../../src/domain/schemas/time.ts';
import { C0, sampleProfile, userValue, absent } from '../helpers.ts';
import { toInstant } from '../../src/domain/schemas/time.ts';

const POLICY = TOLERANCE_POLICY_V1;

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
  policyVersion: 'tolerance-v1',
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

  it('abstinence returns planning_only regardless of use pattern', () => {
    const heavy = sampleProfile({
      goal: 'abstinence',
      breakRequested: false,
      thcUseDaysLast30: userValue(30),
      sessionsPerUseDay: userValue(4),
      products: ['concentrate'],
      routes: ['dabbing'],
    });
    assert.deepEqual(resultOf(heavy), nullResultFields('planning_only'));
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

describe('Tolerance Engine: frequency/intensity override (spec 7.3, invariant item 5)', () => {
  it('locks qualifying frequent users (>= 16 use days) to one unambiguous 21-28 result', () => {
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
      assert.ok(result.limitations.includes('heuristic_frequency_intensity_v1'));
    }
  });

  it('emits decisive intensity drivers in policy order when the override fires', () => {
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

  it('does not apply the override below 16 use days (isolated concentrate is not heavy)', () => {
    for (const d of [1, 4, 15]) {
      const result = resultOf(
        sampleProfile({
          thcUseDaysLast30: userValue(d),
          sessionsPerUseDay: userValue(3),
          products: ['concentrate'],
          routes: ['dabbing'],
        }),
      );
      assert.equal(result.limitations.length, 0, `use days ${d}`);
      assert.equal(result.drivers.length, 1, `use days ${d}`);
    }
  });

  it('keeps 26-30 daily users at 21-28 with or without intensity inputs', () => {
    const plain = resultOf(sampleProfile({ thcUseDaysLast30: userValue(30) }));
    const intense = resultOf(
      sampleProfile({ thcUseDaysLast30: userValue(30), sessionsPerUseDay: userValue(4), products: ['concentrate'] }),
    );
    assert.deepEqual(plain.recommendedRangeDays, { min: 21, max: 28 });
    assert.deepEqual(intense.recommendedRangeDays, { min: 21, max: 28 });
    assert.equal(plain.limitations.length, 0);
    assert.ok(intense.limitations.includes('heuristic_frequency_intensity_v1'));
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

  it('preferred target always equals the range maximum and never exceeds 28', () => {
    const inputs: ReturnType<typeof sampleProfile>[] = [];
    for (let d = 1; d <= 30; d += 1) {
      inputs.push(sampleProfile({ thcUseDaysLast30: userValue(d) }));
      inputs.push(sampleProfile({ thcUseDaysLast30: userValue(d), sessionsPerUseDay: userValue(3) }));
      inputs.push(sampleProfile({ thcUseDaysLast30: userValue(d), products: ['concentrate'] }));
    }
    for (const input of inputs) {
      const result = resultOf(input);
      if (result.kind !== 'tolerance_result') continue;
      assert.equal(result.preferredTargetDays, result.recommendedRangeDays?.max);
      assert.ok(result.preferredTargetDays !== null && result.preferredTargetDays <= 28);
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
    const otherPolicy: TolerancePolicyV1 = { ...POLICY, id: 'tolerance-v2-fake' };
    const result = calculateTolerance(sampleProfile({ thcUseDaysLast30: userValue(31) }), otherPolicy, C0);
    assert.equal(result.policyVersion, 'tolerance-v2-fake');
  });

  it('withdrawal and history insight blocks are emitted as null in this slice', () => {
    const result = resultOf(sampleProfile());
    assert.equal(result.withdrawal, null);
    assert.equal(result.historyInsight, null);
  });
});
