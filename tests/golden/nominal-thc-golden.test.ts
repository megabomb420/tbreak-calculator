import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NOMINAL_THC_POLICY_V1 } from '../../src/domain/policies/nominal-thc-policy-v1.ts';
import { calculateNominalFlowerThc } from '../../src/domain/nominal-thc/nominal-thc-engine.ts';
import type { NominalFlowerInput } from '../../src/domain/schemas/profile.ts';
import type { NominalThcResult } from '../../src/domain/schemas/result.ts';

interface GoldenNominalCase {
  readonly name: string;
  readonly input: NominalFlowerInput;
  readonly expected: NominalThcResult;
}

interface GoldenNominalFixture {
  readonly cases: GoldenNominalCase[];
}

function loadFixture(): GoldenNominalFixture {
  const url = new URL('./fixtures/nominal-thc-golden.json', import.meta.url);
  return JSON.parse(readFileSync(url, 'utf8')) as GoldenNominalFixture;
}

describe('golden nominal flower THC fixtures', () => {
  const fixture = loadFixture();

  it('reproduces the frozen expected result for every golden case', () => {
    for (const golden of fixture.cases) {
      const result = calculateNominalFlowerThc(golden.input, NOMINAL_THC_POLICY_V1);
      assert.deepEqual(result, golden.expected, golden.name);
    }
  });

  it('is deterministic across repeated runs with identical inputs', () => {
    for (const golden of fixture.cases) {
      const a = calculateNominalFlowerThc(golden.input, NOMINAL_THC_POLICY_V1);
      const b = calculateNominalFlowerThc(golden.input, NOMINAL_THC_POLICY_V1);
      assert.deepEqual(a, b, golden.name);
    }
  });

  it('labels every successful result nominal_thc and never absorbed/delivered', () => {
    for (const golden of fixture.cases) {
      const result = calculateNominalFlowerThc(golden.input, NOMINAL_THC_POLICY_V1);
      if (result.kind === 'nominal_thc') {
        assert.equal(result.label, 'nominal_thc', golden.name);
        assert.ok(Number.isFinite(result.nominalThcMg), golden.name);
        const serialized = JSON.stringify(result);
        for (const token of ['absorbed', 'delivered', 'bioavailable', 'dose']) {
          assert.ok(!serialized.includes(token), `${golden.name} must not mention ${token}`);
        }
      } else {
        assert.equal(result.nominalThcMg, null, golden.name);
        assert.equal(result.label, null, golden.name);
      }
      assert.equal(result.policyVersion, 'nominal-thc-v1', golden.name);
    }
  });
});
