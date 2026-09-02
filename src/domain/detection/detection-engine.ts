// Pure qualitative v1 Detection Engine (CALCULATOR_SPEC section 8).
//
// Deterministic: equal request and policy produce structurally equal results.
// The engine validates matrix and context, selects the static qualitative
// copy, appends context warnings and emits a qualitative_only result. It
// never produces a numeric detection range, cutoff interpretation, planned-
// test comparison, pass/fail statement, confidence category or clear date,
// and it never consults tolerance inputs: detection stays separate from
// tolerance and from impairment.

import { DETECTION_CONTEXTS, DETECTION_MATRICES } from '../schemas/enums.ts';
import type { DetectionRequest } from '../schemas/profile.ts';
import type { DetectionCopyPolicyV1 } from '../policies/detection-copy-policy-v1.ts';
import type { DetectionResult } from '../schemas/result.ts';

function validationErrorResult(policyVersion: string): DetectionResult {
  return {
    kind: 'validation_error',
    matrix: null,
    context: null,
    numericEstimateAvailable: false,
    interpretationCodes: [],
    uncertaintyCodes: [],
    evidenceConfidence: null,
    personalisationConfidence: null,
    policyVersion,
  };
}

/**
 * Runs the exact v1 detection procedure (spec 8.2) on a detection request.
 * Matrix and context are validated defensively even though they are typed
 * enums, so untrusted input fails closed with a validation_error result.
 */
export function explainDetection(
  request: DetectionRequest,
  policy: DetectionCopyPolicyV1,
): DetectionResult {
  const matrixValid = DETECTION_MATRICES.includes(request.matrix);
  const contextValid = DETECTION_CONTEXTS.includes(request.context);
  if (!matrixValid || !contextValid) {
    return validationErrorResult(policy.id);
  }

  const matrixCopy = policy.matrices.find((copy) => copy.matrix === request.matrix);
  if (matrixCopy === undefined) {
    // Policy missing a matrix is a policy bug; fail closed rather than invent copy.
    return validationErrorResult(policy.id);
  }

  const interpretationCodes = [...matrixCopy.interpretationCodes];
  const uncertaintyCodes = [...matrixCopy.uncertaintyCodes];
  for (const warning of policy.contextWarnings) {
    if (warning.context === request.context) {
      uncertaintyCodes.push(warning.uncertaintyCode);
    }
  }

  return {
    kind: 'qualitative_only',
    matrix: request.matrix,
    context: request.context,
    numericEstimateAvailable: false,
    interpretationCodes,
    uncertaintyCodes,
    evidenceConfidence: null,
    personalisationConfidence: null,
    policyVersion: policy.id,
  };
}
