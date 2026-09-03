import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TOLERANCE_POLICY_V3 } from '../../src/domain/policies/tolerance-policy-v3.ts';
import { calculateTolerance } from '../../src/domain/tolerance/tolerance-engine.ts';
import { toInstant } from '../../src/domain/schemas/time.ts';
import type { UseProfileInput } from '../../src/domain/schemas/profile.ts';
import type { ToleranceResult } from '../../src/domain/schemas/result.ts';

// Golden tolerance fixtures for tolerance-v3 (CALCULATOR_SPEC 7).
//
// v3 changes frozen here, per the v3 rule set:
// - exposure is classified over frequency + intensity + chronicity with at most
//   one adjacent-tier movement (intensity is read from 4 use days upward, not 16);
// - a long-established frequent (16-25, no intensity) profile may move 14-21 ->
//   21-28 via heuristic_chronicity_range_v3; tier 4 (21-28) never moves higher;
// - sessions/products/routes are required from 4 use days upward on
//   range-requested routes, so the old 10-day no-intensity record is now a
//   validation_error record;
// - limitation metadata uses the v3 codes (v1/v2 codes are retired on new runs);
// - a clean in-range directional history observation may raise the planning
//   target (never the range) - see the v3_use_days_10_recent_history_* records.
// Each changed/new record carries a `reason` comment in the fixture file.

interface GoldenToleranceCase {
  readonly name: string;
  readonly reason?: string;
  readonly profile: UseProfileInput;
  readonly expected: ToleranceResult;
}

interface GoldenFixture {
  readonly calculatedAtMs: number;
  readonly cases: GoldenToleranceCase[];
}

function loadFixture(): GoldenFixture {
  const url = new URL('./fixtures/tolerance-golden.json', import.meta.url);
  return JSON.parse(readFileSync(url, 'utf8')) as GoldenFixture;
}

describe('golden tolerance fixtures (v3 bounded classification, chronicity, history target override)', () => {
  const fixture = loadFixture();

  it('freezes a fixed calculation time across every case', () => {
    for (const golden of fixture.cases) {
      const result = calculateTolerance(golden.profile, TOLERANCE_POLICY_V3, toInstant(fixture.calculatedAtMs));
      assert.equal(result.calculatedAt, fixture.calculatedAtMs, golden.name);
    }
  });

  it('reproduces the frozen expected result for every golden case', () => {
    for (const golden of fixture.cases) {
      const result = calculateTolerance(golden.profile, TOLERANCE_POLICY_V3, toInstant(fixture.calculatedAtMs));
      assert.deepEqual(result, golden.expected, golden.name);
    }
  });

  it('is deterministic across repeated runs with identical inputs', () => {
    for (const golden of fixture.cases) {
      const a = calculateTolerance(golden.profile, TOLERANCE_POLICY_V3, toInstant(fixture.calculatedAtMs));
      const b = calculateTolerance(golden.profile, TOLERANCE_POLICY_V3, toInstant(fixture.calculatedAtMs));
      assert.deepEqual(a, b, golden.name);
    }
  });

  it('enforces the tolerance_result invariants on every golden range', () => {
    for (const golden of fixture.cases) {
      const result = calculateTolerance(golden.profile, TOLERANCE_POLICY_V3, toInstant(fixture.calculatedAtMs));
      if (result.kind !== 'tolerance_result') continue;
      const range = result.recommendedRangeDays;
      assert.ok(range !== null, golden.name);
      // Spec invariant 7: the preferred target is a deterministic planning
      // choice inside the selected evidence range - the duration anchor or a
      // raised in-range history observation - never outside it and never above
      // 28. (A history override may legitimately sit between the anchors.)
      assert.ok(result.preferredTargetDays !== null && result.preferredTargetDays <= 28, golden.name);
      assert.ok(
        result.preferredTargetDays !== null &&
          result.preferredTargetDays >= range.min &&
          result.preferredTargetDays <= range.max,
        `${golden.name} target must stay inside the selected range`,
      );
      assert.equal(Number.isInteger(result.preferredTargetDays), true, golden.name);
      assert.equal(result.evidenceConfidence, 'low', golden.name);
      assert.equal(result.personalisationConfidence, 'low', golden.name);
      assert.equal(result.recommendationStatus, 'heuristic', golden.name);
      assert.equal(result.uncertaintySummaryCode, 'broad_heuristic_individual_response_varies', golden.name);
      assert.equal(result.policyVersion, 'tolerance-v3', golden.name);
      // Withdrawal is attached to every range result (spec 7.5 step 12).
      assert.ok(result.withdrawal !== null && result.withdrawal.breakDay >= 1, golden.name);
    }
  });

  it('never emits the retired v1/v2 limitation codes on a golden result', () => {
    const retired = ['heuristic_frequency_intensity_v1', 'heuristic_duration_target_within_range_v2'];
    for (const golden of fixture.cases) {
      const result = calculateTolerance(golden.profile, TOLERANCE_POLICY_V3, toInstant(fixture.calculatedAtMs));
      for (const code of retired) {
        assert.equal(
          (result.limitations as readonly string[]).includes(code),
          false,
          `${golden.name} must not emit ${code}`,
        );
      }
    }
  });

  it('lets duration move the target between the anchors but never the range', () => {
    const recent = fixture.cases.find((c) => c.name === 'use_days_27_recent_under_1_month_lower_target');
    const established = fixture.cases.find((c) => c.name === 'use_days_27_long_established_upper_target');
    assert.ok(recent !== undefined && established !== undefined);
    const recentResult = calculateTolerance(recent.profile, TOLERANCE_POLICY_V3, toInstant(fixture.calculatedAtMs));
    const establishedResult = calculateTolerance(
      established.profile,
      TOLERANCE_POLICY_V3,
      toInstant(fixture.calculatedAtMs),
    );
    assert.deepEqual(recentResult.recommendedRangeDays, establishedResult.recommendedRangeDays);
    assert.notEqual(recentResult.preferredTargetDays, establishedResult.preferredTargetDays);
    assert.equal(recentResult.preferredTargetDays, recentResult.recommendedRangeDays?.min);
    assert.equal(establishedResult.preferredTargetDays, establishedResult.recommendedRangeDays?.max);
  });

  it('history never moves the golden range; a frozen history target stays verbatim', () => {
    for (const golden of fixture.cases) {
      if (golden.profile.previousBreaks.length === 0) continue;
      const result = calculateTolerance(golden.profile, TOLERANCE_POLICY_V3, toInstant(fixture.calculatedAtMs));
      if (result.kind !== 'tolerance_result') continue;
      assert.deepEqual(result.historyInsight, golden.expected.historyInsight, golden.name);
      assert.equal(result.recommendedRangeDays?.min, golden.expected.recommendedRangeDays?.min, golden.name);
      assert.equal(result.recommendedRangeDays?.max, golden.expected.recommendedRangeDays?.max, golden.name);
      assert.equal(result.preferredTargetDays, golden.expected.preferredTargetDays, golden.name);
    }
  });

  it('allows a clean in-range directional history observation to raise the planning target', () => {
    const raised = fixture.cases.find((c) => c.name === 'v3_use_days_10_recent_history_override_target_14');
    assert.ok(raised !== undefined);
    const result = calculateTolerance(raised.profile, TOLERANCE_POLICY_V3, toInstant(fixture.calculatedAtMs));
    assert.equal(result.kind, 'tolerance_result');
    if (result.kind !== 'tolerance_result' || result.recommendedRangeDays === null) return;
    // Range stays 7-14; the recent lower anchor 7 was raised to the observed 14.
    assert.deepEqual(result.recommendedRangeDays, { min: 7, max: 14 });
    assert.equal(result.preferredTargetDays, 14);
    assert.deepEqual(result.limitations, ['heuristic_history_target_within_range_v3']);
    assert.deepEqual(result.historyInsight?.code, 'history_directional_observation');
    assert.equal(result.historyInsight?.outsideRecommendedRange, false);
  });

  it('keeps the duration anchor when history is outside the range or inverted', () => {
    const outside = fixture.cases.find((c) => c.name === 'use_days_20_history_directional_outside_range');
    const mixed = fixture.cases.find((c) => c.name === 'use_days_20_history_mixed_no_directional_claim');
    assert.ok(outside !== undefined && mixed !== undefined);
    for (const golden of [outside, mixed]) {
      const result = calculateTolerance(golden.profile, TOLERANCE_POLICY_V3, toInstant(fixture.calculatedAtMs));
      assert.equal(result.kind, 'tolerance_result');
      if (result.kind !== 'tolerance_result' || result.recommendedRangeDays === null) continue;
      assert.equal(result.preferredTargetDays, result.recommendedRangeDays.max, golden.name);
      assert.equal(
        result.limitations.includes('heuristic_history_target_within_range_v3'),
        false,
        golden.name,
      );
    }
  });

  it('never emits a forbidden scientific claim in any golden result', () => {
    const forbiddenKeys = ['detoxed', 'resetPercent', 'individualHalfLifeDays', 'guaranteedNegativeDate'];
    for (const golden of fixture.cases) {
      const result = calculateTolerance(golden.profile, TOLERANCE_POLICY_V3, toInstant(fixture.calculatedAtMs));
      assert.ok(result.recommendedRangeDays === null || result.recommendedRangeDays.max <= 28, golden.name);
      for (const key of forbiddenKeys) {
        assert.ok(!(key in result), `${golden.name} must not expose ${key}`);
      }
      assert.ok(
        result.evidenceConfidence === null || result.evidenceConfidence === 'low',
        `${golden.name} must never raise evidence confidence above low`,
      );
    }
  });
});
