// Pure v1 Tolerance Engine (CALCULATOR_SPEC section 7).
//
// Deterministic: equal raw input, policy and calculation time produce
// structurally equal results. The engine validates and normalises its input,
// routes by goal/breakRequested, selects the base band, applies the single
// frequency/intensity override, and emits the v1 result contract. Withdrawal
// display and history insight derivation are later domain slices, so those
// blocks are emitted as null here.

import { assessIntensity, selectBaseBand, type TolerancePolicyV1 } from '../policies/tolerance-policy-v1.ts';
import type { UseProfileInput } from '../schemas/profile.ts';
import type { DriverCode, LimitationCode, ToleranceResult } from '../schemas/result.ts';
import type { Instant } from '../schemas/time.ts';
import { validateAndNormalizeProfile } from '../validation/profile-validation.ts';

function emptyResult(kind: ToleranceResult['kind'], policyVersion: string, calculatedAt: Instant): ToleranceResult {
  return {
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
    policyVersion,
    calculatedAt,
  };
}

/**
 * Runs the v1 Tolerance Engine decision procedure (spec 7.5) on a raw use
 * profile. `calculationTime` is the explicit reference instant used for both
 * validation and the result.
 */
export function calculateTolerance(
  input: UseProfileInput,
  policy: TolerancePolicyV1,
  calculationTime: Instant,
): ToleranceResult {
  const outcome = validateAndNormalizeProfile(input, calculationTime);
  if (!outcome.ok) {
    return emptyResult('validation_error', policy.id, calculationTime);
  }
  const { profile } = outcome;

  // Goal routing (spec 7.4). Detection information never runs the Tolerance
  // Engine; reduction without an explicitly requested break and abstinence
  // get planning output with no invented break duration.
  if (profile.goal === 'detection_information') {
    return emptyResult('not_applicable', policy.id, calculationTime);
  }
  const rangeRequested = profile.goal === 'tolerance_reset' || (profile.goal === 'reduction' && profile.breakRequested);
  if (!rangeRequested) {
    return emptyResult('planning_only', policy.id, calculationTime);
  }

  // Spec 7.5 step 4: zero THC-use days in the window -> not applicable with a
  // low-baseline-tolerance explanation.
  const useDays = profile.thcUseDaysLast30.value;
  if (useDays === null || useDays === 0) {
    return { ...emptyResult('not_applicable', policy.id, calculationTime), drivers: [policy.baselineLowDriver] };
  }

  const band = selectBaseBand(policy, useDays);
  if (band === undefined) {
    // Unreachable for a validated 1..30 profile; fail closed rather than invent a band.
    return emptyResult('validation_error', policy.id, calculationTime);
  }

  const intensity = assessIntensity(
    policy,
    useDays,
    profile.sessionsPerUseDay.value,
    profile.products,
    profile.routes,
  );

  const recommendedRangeDays = intensity.applies
    ? policy.intensityRule.recommendedRangeDays
    : band.recommendedRangeDays;

  const drivers: DriverCode[] = [band.driver, ...intensity.drivers];
  const limitations: LimitationCode[] = intensity.applies ? [policy.intensityRule.limitation] : [];

  return {
    kind: 'tolerance_result',
    recommendedRangeDays,
    preferredTargetDays: recommendedRangeDays.max,
    recommendationStatus: policy.recommendationStatus,
    evidenceConfidence: policy.evidenceConfidence,
    personalisationConfidence: policy.personalisationConfidence,
    uncertaintySummaryCode: policy.uncertaintySummaryCode,
    withdrawal: null,
    drivers,
    historyInsight: null,
    limitations,
    policyVersion: policy.id,
    calculatedAt: calculationTime,
  };
}
