// Pure v2 Tolerance Engine (CALCULATOR_SPEC section 7).
//
// Deterministic: equal raw input, policy and calculation time produce
// structurally equal results. The engine validates and normalises its input,
// routes by goal/breakRequested, selects the base band, applies the single
// frequency/intensity override, selects the preferred planning target inside
// the range (product heuristic, never a duration-to-days formula), derives
// the previous-break history insight (7.7) and attaches the elapsed
// withdrawal display (7.8), then emits the v2 result contract. Withdrawal and
// history never change the range or target.

import {
  assessIntensity,
  selectBaseBand,
  selectPreferredTargetDays,
  type TolerancePolicyV2,
} from '../policies/tolerance-policy-v2.ts';
import type { UseProfileInput } from '../schemas/profile.ts';
import type { DriverCode, LimitationCode, ToleranceResult, WithdrawalDisplay } from '../schemas/result.ts';
import type { Instant } from '../schemas/time.ts';
import { validateAndNormalizeProfile } from '../validation/profile-validation.ts';
import { deriveHistoryInsight } from './history.ts';
import { computeWithdrawalDisplay } from './withdrawal.ts';

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
 * Runs the v2 Tolerance Engine decision procedure (spec 7.5) on a raw use
 * profile. `calculationTime` is the explicit reference instant used for both
 * validation and the result.
 */
export function calculateTolerance(
  input: UseProfileInput,
  policy: TolerancePolicyV2,
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
    // Spec 7.5 step 3: attach the withdrawal display when relevant and stop.
    // Relevant here for abstinence planning, which anchors to the
    // authoritative last-use instant; reduction-without-a-break does not
    // claim an abstinence timeline.
    const withdrawal =
      profile.goal === 'abstinence'
        ? withdrawalForProfile(profile.lastUseAt.value, calculationTime, policy)
        : null;
    return { ...emptyResult('planning_only', policy.id, calculationTime), withdrawal };
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

  // Spec 7.3/7.5 step 7: deterministic preferred-target selection inside the
  // selected evidence range. How long the current pattern has been typical
  // chooses the lower anchor (recently established) or the upper anchor
  // (established or missing). The target is a planning choice; the range is
  // the evidence-conservative output and is never widened by duration.
  const preferredTargetDays = selectPreferredTargetDays(
    recommendedRangeDays,
    profile.currentPatternDuration.value,
  );

  const drivers: DriverCode[] = [band.driver, ...intensity.drivers];
  const limitations: LimitationCode[] = [
    ...(intensity.applies ? [policy.intensityRule.limitation] : []),
    ...(preferredTargetDays < recommendedRangeDays.max ? [policy.targetRule.limitation] : []),
  ];

  return {
    kind: 'tolerance_result',
    recommendedRangeDays,
    preferredTargetDays,
    recommendationStatus: policy.recommendationStatus,
    evidenceConfidence: policy.evidenceConfidence,
    personalisationConfidence: policy.personalisationConfidence,
    uncertaintySummaryCode: policy.uncertaintySummaryCode,
    // Spec 7.5 steps 11-12: history and withdrawal are descriptive; neither
    // may change the range or target above.
    historyInsight: deriveHistoryInsight(profile.previousBreaks, recommendedRangeDays),
    withdrawal: withdrawalForProfile(profile.lastUseAt.value, calculationTime, policy),
    drivers,
    limitations,
    policyVersion: policy.id,
    calculatedAt: calculationTime,
  };
}

function withdrawalForProfile(
  lastUseAt: Instant | null,
  calculationTime: Instant,
  policy: TolerancePolicyV2,
): WithdrawalDisplay | null {
  return lastUseAt !== null
    ? computeWithdrawalDisplay(lastUseAt, calculationTime, policy.withdrawalAnchors)
    : null;
}
