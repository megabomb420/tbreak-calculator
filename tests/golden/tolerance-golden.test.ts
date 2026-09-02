import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TOLERANCE_POLICY_V1 } from '../../src/domain/policies/tolerance-policy-v1.ts';
import { calculateTolerance } from '../../src/domain/tolerance/tolerance-engine.ts';
import { toInstant } from '../../src/domain/schemas/time.ts';
import type { UseProfileInput } from '../../src/domain/schemas/profile.ts';
import type { ToleranceResult } from '../../src/domain/schemas/result.ts';

interface GoldenToleranceCase {
  readonly name: string;
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

describe('golden tolerance fixtures (boundaries, intensity override, goal routing)', () => {
  const fixture = loadFixture();

  it('freezes a fixed calculation time across every case', () => {
    for (const golden of fixture.cases) {
      const result = calculateTolerance(golden.profile, TOLERANCE_POLICY_V1, toInstant(fixture.calculatedAtMs));
      assert.equal(result.calculatedAt, fixture.calculatedAtMs, golden.name);
    }
  });

  it('reproduces the frozen expected result for every golden case', () => {
    for (const golden of fixture.cases) {
      const result = calculateTolerance(golden.profile, TOLERANCE_POLICY_V1, toInstant(fixture.calculatedAtMs));
      assert.deepEqual(result, golden.expected, golden.name);
    }
  });

  it('is deterministic across repeated runs with identical inputs', () => {
    for (const golden of fixture.cases) {
      const a = calculateTolerance(golden.profile, TOLERANCE_POLICY_V1, toInstant(fixture.calculatedAtMs));
      const b = calculateTolerance(golden.profile, TOLERANCE_POLICY_V1, toInstant(fixture.calculatedAtMs));
      assert.deepEqual(a, b, golden.name);
    }
  });

  it('enforces the tolerance_result invariants on every golden range', () => {
    for (const golden of fixture.cases) {
      const result = calculateTolerance(golden.profile, TOLERANCE_POLICY_V1, toInstant(fixture.calculatedAtMs));
      if (result.kind !== 'tolerance_result') continue;
      assert.equal(result.preferredTargetDays, result.recommendedRangeDays?.max, golden.name);
      assert.ok(result.preferredTargetDays !== null && result.preferredTargetDays <= 28, golden.name);
      assert.equal(result.evidenceConfidence, 'low', golden.name);
      assert.equal(result.personalisationConfidence, 'low', golden.name);
      assert.equal(result.recommendationStatus, 'heuristic', golden.name);
      assert.equal(result.uncertaintySummaryCode, 'broad_heuristic_individual_response_varies', golden.name);
      assert.equal(result.policyVersion, 'tolerance-v1', golden.name);
      // Withdrawal is attached to every range result (spec 7.5 step 12).
      assert.ok(result.withdrawal !== null && result.withdrawal.breakDay >= 1, golden.name);
    }
  });

  it('never lets history mutate a golden range or target', () => {
    for (const golden of fixture.cases) {
      const result = calculateTolerance(golden.profile, TOLERANCE_POLICY_V1, toInstant(fixture.calculatedAtMs));
      if (result.kind !== 'tolerance_result') continue;
      assert.deepEqual(result.historyInsight, golden.expected.historyInsight, golden.name);
      assert.equal(result.recommendedRangeDays?.min, golden.expected.recommendedRangeDays?.min, golden.name);
      assert.equal(result.recommendedRangeDays?.max, golden.expected.recommendedRangeDays?.max, golden.name);
      assert.equal(result.preferredTargetDays, golden.expected.preferredTargetDays, golden.name);
    }
  });

  it('never emits a forbidden scientific claim in any golden result', () => {
    const forbiddenKeys = ['detoxed', 'resetPercent', 'individualHalfLifeDays', 'guaranteedNegativeDate'];
    for (const golden of fixture.cases) {
      const result = calculateTolerance(golden.profile, TOLERANCE_POLICY_V1, toInstant(fixture.calculatedAtMs));
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
