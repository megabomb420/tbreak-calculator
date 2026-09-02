import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NOMINAL_THC_POLICY_V1 } from '../../src/domain/policies/nominal-thc-policy-v1.ts';
import {
  calculateNominalFlowerThc,
  validateNominalFlowerInput,
  type NominalThcValidationErrorCode,
} from '../../src/domain/nominal-thc/nominal-thc-engine.ts';
import type { NominalFlowerInput } from '../../src/domain/schemas/profile.ts';
import type { SourcedValue } from '../../src/domain/schemas/sourced-value.ts';
import { userValue, absent } from '../helpers.ts';

const POLICY = NOMINAL_THC_POLICY_V1;

function input(flowerGrams: SourcedValue<number>, thcPotencyPercent: SourcedValue<number>): NominalFlowerInput {
  return { flowerGrams, thcPotencyPercent };
}

function grams(value: number): SourcedValue<number> {
  return userValue(value);
}

function potency(value: number): SourcedValue<number> {
  return userValue(value);
}

function expectNominal(flowerGrams: number, thcPotencyPercent: number, nominalThcMg: number): void {
  const result = calculateNominalFlowerThc(input(grams(flowerGrams), potency(thcPotencyPercent)), POLICY);
  assert.deepEqual(result, {
    kind: 'nominal_thc',
    label: 'nominal_thc',
    nominalThcMg,
    policyVersion: 'nominal-thc-v1',
  });
}

function expectError(flowerGrams: SourcedValue<number>, thcPotencyPercent: SourcedValue<number>): void {
  const result = calculateNominalFlowerThc(input(flowerGrams, thcPotencyPercent), POLICY);
  assert.equal(result.kind, 'validation_error');
  assert.equal(result.label, null);
  assert.equal(result.nominalThcMg, null);
  assert.equal(result.policyVersion, 'nominal-thc-v1');
}

function errorCodes(flowerGrams: SourcedValue<number>, thcPotencyPercent: SourcedValue<number>): NominalThcValidationErrorCode[] {
  const outcome = validateNominalFlowerInput(input(flowerGrams, thcPotencyPercent));
  assert.equal(outcome.ok, false);
  if (outcome.ok) throw new Error('unreachable');
  return outcome.errors.map((e) => e.code).sort();
}

describe('nominal flower THC calculation (spec 6)', () => {
  it('computes grams x 1000 x potency fraction for flower', () => {
    expectNominal(0.5, 20, 100); // spec example: 0.5 g x 1000 x 20% = 100 mg
    expectNominal(2, 15, 300);
    expectNominal(3.5, 22, 770);
    expectNominal(0.25, 12.5, 31.25);
    expectNominal(1, 100, 1000); // potency boundary: 100% is allowed
    expectNominal(30, 0.5, 150);
  });

  it('never represents the result as absorbed, delivered or bioavailable THC', () => {
    const result = calculateNominalFlowerThc(input(grams(0.5), potency(20)), POLICY);
    assert.equal(result.label, 'nominal_thc');
    const serialized = JSON.stringify(result);
    for (const forbidden of ['absorbed', 'delivered', 'bioavailable', 'dose']) {
      assert.ok(!serialized.includes(forbidden), `result must not mention ${forbidden}`);
    }
    // Exact structural shape: no extra fields can smuggle an exposure claim in.
    assert.deepEqual(Object.keys(result).sort(), ['kind', 'label', 'nominalThcMg', 'policyVersion']);
  });

  it('is deterministic for equal inputs and policy', () => {
    const a = calculateNominalFlowerThc(input(grams(0.5), potency(20)), POLICY);
    const b = calculateNominalFlowerThc(input(grams(0.5), potency(20)), POLICY);
    assert.deepEqual(a, b);
  });
});

describe('nominal flower THC validation', () => {
  it('requires both supported inputs', () => {
    expectError(absent(), potency(20));
    expectError(grams(0.5), absent());
    assert.deepEqual(errorCodes(absent(), potency(20)), ['flower_grams_required']);
    assert.deepEqual(errorCodes(grams(0.5), absent()), ['potency_percent_required']);
  });

  it('rejects non-positive flower grams', () => {
    expectError(grams(0), potency(20));
    expectError(grams(-1), potency(20));
    assert.deepEqual(errorCodes(grams(0), potency(20)), ['flower_grams_must_be_positive_number']);
  });

  it('rejects potency at or below 0 and above 100', () => {
    expectError(grams(0.5), potency(0));
    expectError(grams(0.5), potency(-5));
    expectError(grams(0.5), potency(100.5));
    assert.deepEqual(errorCodes(grams(0.5), potency(0)), ['potency_percent_out_of_range']);
    assert.deepEqual(errorCodes(grams(0.5), potency(100.5)), ['potency_percent_out_of_range']);
  });

  it('accepts potency in the open interval (0, 100]', () => {
    expectNominal(0.5, 0.1, 0.5);
    expectNominal(0.5, 100, 500);
  });

  it('rejects non-number values', () => {
    expectError({ value: '0.5', provenance: 'user_estimate' } as unknown as SourcedValue<number>, potency(20));
    expectError(grams(0.5), { value: '20', provenance: 'user_estimate' } as unknown as SourcedValue<number>);
    assert.deepEqual(
      errorCodes({ value: '0.5', provenance: 'user_estimate' } as unknown as SourcedValue<number>, potency(20)),
      ['flower_grams_must_be_positive_number'],
    );
  });

  it('accepts label_derived provenance and rejects derived provenance on nominal fields', () => {
    const fromLabel = { value: 20, provenance: 'label_derived' } as SourcedValue<number>;
    const result = calculateNominalFlowerThc(input(grams(0.5), fromLabel), POLICY);
    assert.equal(result.kind, 'nominal_thc');
    assert.equal(result.nominalThcMg, 100);

    const derived = { value: 20, provenance: 'derived', derivedFrom: ['label'] } as SourcedValue<number>;
    expectError(grams(0.5), derived);
    assert.deepEqual(errorCodes(grams(0.5), derived), ['invalid_provenance_for_field']);
  });

  it('enforces the SourcedValue null/provenance invariants', () => {
    const nullWithProvenance = { value: null, provenance: 'user_estimate' } as SourcedValue<number>;
    const presentMissing = { value: 0.5, provenance: 'missing' } as SourcedValue<number>;
    assert.deepEqual(errorCodes(nullWithProvenance, potency(20)), ['null_value_with_non_missing_provenance']);
    assert.deepEqual(errorCodes(presentMissing, potency(20)), ['value_present_with_missing_provenance']);
  });

  it('returns a validation_error result without a scientific value on failure', () => {
    const result = calculateNominalFlowerThc(input(grams(0), potency(20)), POLICY);
    assert.equal(result.kind, 'validation_error');
    assert.equal(result.nominalThcMg, null);
    assert.equal(result.label, null);
  });
});
