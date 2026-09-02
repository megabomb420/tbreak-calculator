import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DETECTION_COPY_POLICY_V1 } from '../../src/domain/policies/detection-copy-policy-v1.ts';
import { explainDetection } from '../../src/domain/detection/detection-engine.ts';
import type { DetectionContext, DetectionMatrix } from '../../src/domain/schemas/enums.ts';
import type { DetectionRequest } from '../../src/domain/schemas/profile.ts';
import type { DetectionResult } from '../../src/domain/schemas/result.ts';

const POLICY = DETECTION_COPY_POLICY_V1;

function request(matrix: DetectionMatrix, context: DetectionContext): DetectionRequest {
  return { matrix, context };
}

const MATRIX_INTERPRETATION: Record<DetectionMatrix, readonly string[]> = {
  urine: ['urine_frequency_chronicity_elapsed_and_cutoff_relevant'],
  blood: ['blood_no_universal_clearance_window', 'blood_trace_presence_not_impairment'],
  oral_fluid: ['oral_fluid_shorter_scale_than_urine_cutoff_technology_dependent'],
  hair: ['hair_retrospective_exposure_matrix'],
};

const MATRIX_UNCERTAINTY: Record<DetectionMatrix, readonly string[]> = {
  urine: ['urine_no_numeric_window_or_baseline_without_enabled_rules'],
  blood: ['blood_very_low_detectable_persists_with_sensitive_methods'],
  oral_fluid: ['oral_fluid_unknown_test_characteristics_prevent_numeric_estimate'],
  hair: ['hair_never_a_day_level_clearance_date'],
};

const CONTEXT_WARNING: Partial<Record<DetectionContext, string>> = {
  workplace: 'workplace_cutoff_and_policy_unknown',
  roadside: 'roadside_requires_verified_jurisdiction_rules',
};

describe('qualitative Detection Engine: matrix copy (spec 8.3)', () => {
  for (const matrix of ['urine', 'blood', 'oral_fluid', 'hair'] as const) {
    it(`emits qualitative-only ${matrix} copy without numeric ranges or confidence`, () => {
      const result = explainDetection(request(matrix, 'general'), POLICY);
      assert.deepEqual(result, {
        kind: 'qualitative_only',
        matrix,
        context: 'general',
        numericEstimateAvailable: false,
        interpretationCodes: [...MATRIX_INTERPRETATION[matrix]],
        uncertaintyCodes: [...MATRIX_UNCERTAINTY[matrix]],
        evidenceConfidence: null,
        personalisationConfidence: null,
        policyVersion: 'detection-copy-v1',
      });
    });
  }
});

describe('qualitative Detection Engine: context warnings (spec 8.2 steps 3-4)', () => {
  it('appends the workplace cutoff/policy-unknown code', () => {
    const result = explainDetection(request('urine', 'workplace'), POLICY);
    assert.ok(result.uncertaintyCodes.includes('workplace_cutoff_and_policy_unknown'));
    assert.ok(!result.uncertaintyCodes.includes('roadside_requires_verified_jurisdiction_rules'));
  });

  it('appends the roadside verified-jurisdiction warning and no Irish or generic threshold claim', () => {
    for (const matrix of ['urine', 'blood', 'oral_fluid', 'hair'] as const) {
      const result = explainDetection(request(matrix, 'roadside'), POLICY);
      assert.ok(result.uncertaintyCodes.includes('roadside_requires_verified_jurisdiction_rules'), matrix);
      assert.ok(!result.uncertaintyCodes.includes('workplace_cutoff_and_policy_unknown'), matrix);
      assert.ok(!result.uncertaintyCodes.some((code) => code.includes('ireland') || code.includes('irish')), matrix);
      assert.ok(!result.uncertaintyCodes.some((code) => code.includes('threshold')), matrix);
    }
  });

  it('general context adds no context warning', () => {
    const result = explainDetection(request('hair', 'general'), POLICY);
    assert.deepEqual(result.uncertaintyCodes, [...MATRIX_UNCERTAINTY.hair]);
  });

  it('keeps the interpretation copy independent of context', () => {
    const general = explainDetection(request('blood', 'general'), POLICY);
    const roadside = explainDetection(request('blood', 'roadside'), POLICY);
    assert.deepEqual(roadside.interpretationCodes, general.interpretationCodes);
  });
});

describe('qualitative Detection Engine: invalid input', () => {
  it('returns validation_error for an unsupported matrix', () => {
    const invalid = request('sweat' as unknown as DetectionMatrix, 'general');
    const result = explainDetection(invalid, POLICY);
    assert.deepEqual(result, validationErrorResult());
  });

  it('returns validation_error for an unsupported context', () => {
    const invalid = request('urine', 'home' as unknown as DetectionContext);
    const result = explainDetection(invalid, POLICY);
    assert.deepEqual(result, validationErrorResult());
  });
});

describe('qualitative Detection Engine: separation and determinism', () => {
  it('never exposes numeric ranges, cutoffs, confidence or tolerance fields', () => {
    const forbiddenKeys = [
      'recommendedRangeDays',
      'preferredTargetDays',
      'daysUntilClear',
      'min',
      'max',
      'cutoff',
      'device',
      'baseline',
      'withdrawal',
      'drivers',
      'calculatedAt',
      'cleanDate',
    ];
    for (const matrix of ['urine', 'blood', 'oral_fluid', 'hair'] as const) {
      for (const context of ['general', 'workplace', 'roadside'] as const) {
        const result = explainDetection(request(matrix, context), POLICY);
        for (const key of forbiddenKeys) {
          assert.ok(!(key in result), `${matrix}/${context} must not expose ${key}`);
        }
        assert.equal(result.numericEstimateAvailable, false);
        assert.equal(result.evidenceConfidence, null);
        assert.equal(result.personalisationConfidence, null);
      }
    }
  });

  it('hair never emits a clear date or day-level clearance claim', () => {
    const result = explainDetection(request('hair', 'general'), POLICY);
    const serialized = JSON.stringify(result);
    assert.ok(!serialized.includes('clear date'));
    assert.ok(result.uncertaintyCodes.includes('hair_never_a_day_level_clearance_date'));
    assert.equal(result.interpretationCodes[0], 'hair_retrospective_exposure_matrix');
  });

  it('is deterministic for equal requests and policy', () => {
    const a = explainDetection(request('oral_fluid', 'roadside'), POLICY);
    const b = explainDetection(request('oral_fluid', 'roadside'), POLICY);
    assert.deepEqual(a, b);
  });

  it('does not consume tolerance inputs: the request carries only matrix and context', () => {
    const result = explainDetection(request('urine', 'general'), POLICY);
    assert.deepEqual(Object.keys(result).sort(), [
      'context',
      'evidenceConfidence',
      'interpretationCodes',
      'kind',
      'matrix',
      'numericEstimateAvailable',
      'personalisationConfidence',
      'policyVersion',
      'uncertaintyCodes',
    ]);
  });
});

function validationErrorResult(): DetectionResult {
  return {
    kind: 'validation_error',
    matrix: null,
    context: null,
    numericEstimateAvailable: false,
    interpretationCodes: [],
    uncertaintyCodes: [],
    evidenceConfidence: null,
    personalisationConfidence: null,
    policyVersion: 'detection-copy-v1',
  };
}
