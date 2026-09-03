// Pure v3 Tolerance Engine (CALCULATOR_SPEC section 7).
//
// Deterministic: equal raw input, policy and calculation time produce
// structurally equal results. The engine validates and normalises its input,
// routes by goal/breakRequested, classifies exposure over frequency +
// intensity + chronicity (bounded product heuristic, section 7.3), selects
// the deterministic planning target inside the final range, applies a clean
// in-range previous-break observation when it safely supports a longer
// planning target (7.7 v3 rule), derives the history insight (7.7) and
// attaches the elapsed withdrawal display (7.8), then emits the v3 result
// contract. Withdrawal and history never move the range.

import {
  chronicityClass,
  classifyExposure,
  intensitySignalsFor,
  LIMITATION_CHRONICITY_RANGE,
  LIMITATION_DURATION_TARGET,
  LIMITATION_HISTORY_TARGET,
  LIMITATION_INTENSITY,
  selectPreferredTargetDays,
  type TolerancePolicyV3,
} from '../policies/tolerance-policy-v3.ts';
import type { UseProfileInput, ValidatedPreviousBreak } from '../schemas/profile.ts';
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
 * Runs the v3 Tolerance Engine decision procedure (spec 7.5) on a raw use
 * profile. `calculationTime` is the explicit reference instant used for both
 * validation and the result.
 */
export function calculateTolerance(
  input: UseProfileInput,
  policy: TolerancePolicyV3,
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

  // Spec 7.3/7.5 steps 5-6: multi-factor exposure classification. Frequency
  // selects the base tier; intensity and/or a long-established pattern may
  // move the classification at most one adjacent evidence tier. The final
  // range is one of the four broad evidence ranges and never exceeds 21-28.
  const chronicity = chronicityClass(profile.currentPatternDuration.value);
  const intensity = intensitySignalsFor(
    profile.sessionsPerUseDay.value,
    profile.products,
    profile.routes,
  );
  const exposure = classifyExposure(useDays, chronicity, intensity);
  const recommendedRangeDays = exposure.rangeDays;

  // Spec 7.3/7.5 step 7: preferred planning target. The duration anchor picks
  // the lower anchor (recently established) or the upper anchor (established
  // or missing). A clean previous-break observation may raise the planning
  // target to the user's own best observed in-range anchor.
  const anchorTarget = selectPreferredTargetDays(recommendedRangeDays, chronicity);
  const targetOverride = historyTargetOverride(profile.previousBreaks, recommendedRangeDays);
  const preferredTargetDays = targetOverride !== null ? Math.max(anchorTarget, targetOverride) : anchorTarget;

  const drivers: DriverCode[] = [];
  const limitations: LimitationCode[] = [];
  if (exposure.raisedByIntensity) {
    limitations.push(LIMITATION_INTENSITY);
  }
  if (exposure.raisedByChronicity) {
    drivers.push('long_established_chronic_use');
    limitations.push(LIMITATION_CHRONICITY_RANGE);
  }
  // Intensity exposure drivers describe the pattern regardless of whether it
  // moved the tier, so the "why" list always explains a concentrate/dabbing/
  // multi-session profile.
  if (intensity.multipleSessions) drivers.push('multiple_sessions_per_day');
  if (intensity.concentrate) drivers.push('concentrate_product_use');
  if (intensity.dabbing) drivers.push('dabbing_route_use');
  if (preferredTargetDays < recommendedRangeDays.max) {
    limitations.push(LIMITATION_DURATION_TARGET);
  }
  if (targetOverride !== null && targetOverride > anchorTarget) {
    limitations.push(LIMITATION_HISTORY_TARGET);
  }
  drivers.unshift(driverForTier(exposure.baseTier));

  return {
    kind: 'tolerance_result',
    recommendedRangeDays,
    preferredTargetDays,
    recommendationStatus: policy.recommendationStatus,
    evidenceConfidence: policy.evidenceConfidence,
    personalisationConfidence: policy.personalisationConfidence,
    uncertaintySummaryCode: policy.uncertaintySummaryCode,
    // Spec 7.5 steps 11-12: history and withdrawal are descriptive; neither
    // may move the range selected above. History may only raise the planning
    // target to an observed in-range anchor (7.7 v3 rule).
    historyInsight: deriveHistoryInsight(profile.previousBreaks, recommendedRangeDays),
    withdrawal: withdrawalForProfile(profile.lastUseAt.value, calculationTime, policy),
    drivers,
    limitations,
    policyVersion: policy.id,
    calculatedAt: calculationTime,
  };
}

/**
 * v3 previous-break target override (CALCULATOR_SPEC 7.7). Returns the
 * longest eligible observed duration (an integer number of days) when:
 * - the history is clean (no inversion, longer breaks scored higher);
 * - the shortest and longest compared observations BOTH fall inside today's
 *   recommended range; and
 * - the longest observation is strictly longer than the duration anchor.
 *
 * Never interpolates an "ideal" value, never regresses or extrapolates, and
 * never moves the range itself.
 */
function historyTargetOverride(
  previousBreaks: readonly ValidatedPreviousBreak[],
  range: { readonly min: number; readonly max: number },
): number | null {
  const insight = deriveHistoryInsight(previousBreaks, range);
  if (insight === null || insight.code !== 'history_directional_observation') return null;
  if (insight.outsideRecommendedRange) return null;
  const observations = insight.observations;
  if (observations === null) return null;
  // Directional means the longest scored higher; both ends are inside the
  // range because outsideRecommendedRange is false.
  return observations[1].durationDays;
}

function driverForTier(tier: number): DriverCode {
  switch (tier) {
    case 1:
      return 'very_infrequent_use';
    case 2:
      return 'regular_nondaily_use';
    case 3:
      return 'frequent_use';
    default:
      return 'near_daily_or_daily_use';
  }
}

function withdrawalForProfile(
  lastUseAt: Instant | null,
  calculationTime: Instant,
  policy: TolerancePolicyV3,
): WithdrawalDisplay | null {
  return lastUseAt !== null
    ? computeWithdrawalDisplay(lastUseAt, calculationTime, policy.withdrawalAnchors)
    : null;
}
