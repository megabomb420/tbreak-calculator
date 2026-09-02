// Static versioned v1 qualitative detection copy policy (ARCHITECTURE 5.2,
// CALCULATOR_SPEC section 8).
//
// The policy is static copy/message codes for urine, blood, oral fluid and
// hair, plus context warnings. It deliberately contains no day range, cutoff,
// analyte, test device, laboratory stratum or jurisdiction threshold. The
// codes are deterministic keys for message templates; UI copy is a later
// slice. A copy or code change here requires a new policy version and new
// golden fixtures.

import type { DetectionContext, DetectionMatrix } from '../schemas/enums.ts';

export const DETECTION_POLICY_VERSION = 'detection-copy-v1';

export interface DetectionMatrixCopy {
  readonly matrix: DetectionMatrix;
  /** Qualitative principles for this matrix (spec 8.3). */
  readonly interpretationCodes: readonly string[];
  /** What v1 cannot say for this matrix because numeric rules are not enabled. */
  readonly uncertaintyCodes: readonly string[];
}

export interface DetectionContextWarning {
  readonly context: DetectionContext;
  readonly uncertaintyCode: string;
}

export interface DetectionCopyPolicyV1 {
  readonly id: string;
  readonly matrices: readonly DetectionMatrixCopy[];
  readonly contextWarnings: readonly DetectionContextWarning[];
}

// Static qualitative matrix copy (CALCULATOR_SPEC 8.3). No numeric range,
// cutoff interpretation, pass/fail statement or clear date is encoded.
export const DETECTION_MATRIX_COPY: readonly DetectionMatrixCopy[] = [
  {
    matrix: 'urine',
    interpretationCodes: ['urine_frequency_chronicity_elapsed_and_cutoff_relevant'],
    uncertaintyCodes: ['urine_no_numeric_window_or_baseline_without_enabled_rules'],
  },
  {
    matrix: 'blood',
    interpretationCodes: ['blood_no_universal_clearance_window', 'blood_trace_presence_not_impairment'],
    uncertaintyCodes: ['blood_very_low_detectable_persists_with_sensitive_methods'],
  },
  {
    matrix: 'oral_fluid',
    interpretationCodes: ['oral_fluid_shorter_scale_than_urine_cutoff_technology_dependent'],
    uncertaintyCodes: ['oral_fluid_unknown_test_characteristics_prevent_numeric_estimate'],
  },
  {
    matrix: 'hair',
    interpretationCodes: ['hair_retrospective_exposure_matrix'],
    uncertaintyCodes: ['hair_never_a_day_level_clearance_date'],
  },
];

// Context warnings (spec 8.2 steps 3-4). Roadside copy never presents generic
// oral-fluid thresholds as jurisdiction practice and enables no Irish rule.
export const DETECTION_CONTEXT_WARNINGS: readonly DetectionContextWarning[] = [
  { context: 'workplace', uncertaintyCode: 'workplace_cutoff_and_policy_unknown' },
  { context: 'roadside', uncertaintyCode: 'roadside_requires_verified_jurisdiction_rules' },
];

export const DETECTION_COPY_POLICY_V1: DetectionCopyPolicyV1 = {
  id: DETECTION_POLICY_VERSION,
  matrices: DETECTION_MATRIX_COPY,
  contextWarnings: DETECTION_CONTEXT_WARNINGS,
};
