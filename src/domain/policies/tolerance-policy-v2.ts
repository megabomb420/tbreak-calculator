// Static versioned v2 tolerance policy (ARCHITECTURE section 5.1,
// CALCULATOR_SPEC sections 7.2-7.3, 7.5, 7.8).
//
// This module owns every numeric boundary and code the v2 Tolerance Engine
// may emit: the 30-day use-frequency bands, the single frequent-use
// intensity override, the within-range preferred-target heuristic, the
// withdrawal anchors, uniform low/low confidence, the uncertainty summary
// code, and the driver/limitation message codes. A scientific or product
// rule change here requires a new policy version and new golden fixtures.
//
// tolerance-v2 vs tolerance-v1: the broad evidence-supported ranges and the
// frequency/intensity override are unchanged. What is new is the deterministic
// preferred-target selection inside the selected range: how long the *current*
// pattern has been typical now moves `preferredTargetDays` to the lower or
// upper anchor of the same range. That choice is a labelled product heuristic,
// never a duration-to-days formula or a biological reset claim.

import type { CurrentPatternDurationBand, ProductKind, Route } from '../schemas/enums.ts';
import type {
  DriverCode,
  LimitationCode,
  RecommendedRangeDays,
  WithdrawalAnchorCode,
} from '../schemas/result.ts';

export const TOLERANCE_POLICY_VERSION = 'tolerance-v2';

export interface ToleranceBaseBand {
  readonly minUseDays: number;
  readonly maxUseDays: number;
  readonly recommendedRangeDays: RecommendedRangeDays;
  readonly driver: DriverCode;
}

// Source anchors mapped to product heuristics (CALCULATOR_SPEC 7.3). The
// 26-30 row is the near-daily/daily profile; the frequent-use row is 16-25.
// The ranges themselves are unchanged from tolerance-v1.
export const TOLERANCE_BASE_BANDS: readonly ToleranceBaseBand[] = [
  { minUseDays: 1, maxUseDays: 3, recommendedRangeDays: { min: 2, max: 7 }, driver: 'very_infrequent_use' },
  { minUseDays: 4, maxUseDays: 15, recommendedRangeDays: { min: 7, max: 14 }, driver: 'regular_nondaily_use' },
  { minUseDays: 16, maxUseDays: 25, recommendedRangeDays: { min: 14, max: 21 }, driver: 'frequent_use' },
  { minUseDays: 26, maxUseDays: 30, recommendedRangeDays: { min: 21, max: 28 }, driver: 'near_daily_or_daily_use' },
];

export interface ToleranceIntensityRule {
  readonly minUseDays: number;
  readonly minSessionsPerUseDay: number;
  readonly triggeringProductKinds: readonly ProductKind[];
  readonly triggeringRoutes: readonly Route[];
  readonly recommendedRangeDays: RecommendedRangeDays;
  readonly sessionDriver: DriverCode;
  readonly productDriver: DriverCode;
  readonly routeDriver: DriverCode;
  readonly limitation: LimitationCode;
}

/**
 * A fixed withdrawal anchor (CALCULATOR_SPEC 7.8). Closed anchors carry a
 * numeric [startDay, endDay] range; the open-ended sleep statement carries
 * none and therefore has no calculated position.
 */
export interface WithdrawalAnchor {
  readonly code: WithdrawalAnchorCode;
  readonly startDay: number | null;
  readonly endDay: number | null;
}

// Fixed source anchors in display order. Typical population patterns, not
// personal predictions. The sleep anchor has no numeric end date.
export const TOLERANCE_WITHDRAWAL_ANCHORS: readonly WithdrawalAnchor[] = [
  { code: 'onset', startDay: 1, endDay: 3 },
  { code: 'common_peak', startDay: 2, endDay: 6 },
  { code: 'substantial_improvement', startDay: 4, endDay: 14 },
  { code: 'sleep_disturbance', startDay: null, endDay: null },
];

// The single frequency/intensity override (CALCULATOR_SPEC 7.3). Only this
// rule may change a band; it is labelled heuristic_frequency_intensity_v1.
export const TOLERANCE_INTENSITY_RULE: ToleranceIntensityRule = {
  minUseDays: 16,
  minSessionsPerUseDay: 2,
  triggeringProductKinds: ['concentrate'],
  triggeringRoutes: ['dabbing'],
  recommendedRangeDays: { min: 21, max: 28 },
  sessionDriver: 'multiple_sessions_per_day',
  productDriver: 'concentrate_product_use',
  routeDriver: 'dabbing_route_use',
  limitation: 'heuristic_frequency_intensity_v1',
};

/**
 * Preferred-target heuristic (CALCULATOR_SPEC 7.3, product heuristic
 * `heuristic_duration_target_within_range_v2`). `preferredTargetDays` is a
 * planning choice inside the already-selected evidence range. It never widens,
 * narrows, or moves that range, and it never exceeds the range's upper anchor.
 *
 * Deterministic mapping of the current-pattern-duration bands to an anchor:
 *
 * - `under_1_month` and `1_to_6_months` (recently established) -> lower anchor
 *   of the range (the "lower point" of the same broad evidence range);
 * - `6_to_24_months`, `2_to_5_years`, `5_plus_years` -> upper anchor;
 * - missing (legacy profile) -> upper anchor, exactly the tolerance-v1
 *   default, so a legacy recalculation never invents a new default.
 *
 * These are product UX tiers over the collected duration bands, not medical
 * cut-points and not a duration-to-days equation ("5 years = +7 days" is not
 * implemented and stays prohibited).
 */
export const RECENT_PATTERN_DURATION_BANDS: readonly CurrentPatternDurationBand[] = [
  'under_1_month',
  '1_to_6_months',
];

export interface ToleranceTargetRule {
  readonly limitation: LimitationCode;
  readonly recentPatternBands: readonly CurrentPatternDurationBand[];
}

export const TOLERANCE_TARGET_RULE: ToleranceTargetRule = {
  limitation: 'heuristic_duration_target_within_range_v2',
  recentPatternBands: RECENT_PATTERN_DURATION_BANDS,
};

/**
 * Selects the deterministic planning target inside a selected range. Pure and
 * policy-independent so callers never depend on module initialisation order.
 */
export function selectPreferredTargetDays(
  range: RecommendedRangeDays,
  duration: CurrentPatternDurationBand | null,
): number {
  return duration !== null && RECENT_PATTERN_DURATION_BANDS.includes(duration)
    ? range.min
    : range.max;
}

export interface TolerancePolicyV2 {
  readonly id: string;
  readonly baseBands: readonly ToleranceBaseBand[];
  readonly intensityRule: ToleranceIntensityRule;
  readonly targetRule: ToleranceTargetRule;
  readonly withdrawalAnchors: readonly WithdrawalAnchor[];
  readonly evidenceConfidence: 'low';
  readonly personalisationConfidence: 'low';
  readonly recommendationStatus: 'heuristic';
  readonly uncertaintySummaryCode: string;
  readonly baselineLowDriver: DriverCode;
}

export const TOLERANCE_POLICY_V2: TolerancePolicyV2 = {
  id: TOLERANCE_POLICY_VERSION,
  baseBands: TOLERANCE_BASE_BANDS,
  intensityRule: TOLERANCE_INTENSITY_RULE,
  targetRule: TOLERANCE_TARGET_RULE,
  withdrawalAnchors: TOLERANCE_WITHDRAWAL_ANCHORS,
  evidenceConfidence: 'low',
  personalisationConfidence: 'low',
  recommendationStatus: 'heuristic',
  uncertaintySummaryCode: 'broad_heuristic_individual_response_varies',
  baselineLowDriver: 'baseline_tolerance_likely_low',
};

/** Selects the base band for a use-day count in 1..30, or undefined at 0. */
export function selectBaseBand(
  policy: TolerancePolicyV2,
  useDays: number,
): ToleranceBaseBand | undefined {
  return policy.baseBands.find((band) => useDays >= band.minUseDays && useDays <= band.maxUseDays);
}

export interface IntensityAssessment {
  readonly applies: boolean;
  /** Decisive intensity drivers, in fixed policy order, when the rule applies. */
  readonly drivers: readonly DriverCode[];
}

/** Applies the 7.3 override predicate. It only ever fires at >= 16 use days;
 * below that, isolate concentrate/dabbing use is not treated as heavy. */
export function assessIntensity(
  policy: TolerancePolicyV2,
  useDays: number,
  sessionsPerUseDay: number | null,
  products: readonly ProductKind[],
  routes: readonly Route[],
): IntensityAssessment {
  if (useDays < policy.intensityRule.minUseDays) {
    return { applies: false, drivers: [] };
  }
  const drivers: DriverCode[] = [];
  const { intensityRule } = policy;
  if (sessionsPerUseDay !== null && sessionsPerUseDay >= intensityRule.minSessionsPerUseDay) {
    drivers.push(intensityRule.sessionDriver);
  }
  if (products.some((product) => intensityRule.triggeringProductKinds.includes(product))) {
    drivers.push(intensityRule.productDriver);
  }
  if (routes.some((route) => intensityRule.triggeringRoutes.includes(route))) {
    drivers.push(intensityRule.routeDriver);
  }
  return { applies: drivers.length > 0, drivers };
}
