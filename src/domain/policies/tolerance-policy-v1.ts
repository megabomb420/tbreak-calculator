// Static versioned v1 tolerance policy (ARCHITECTURE section 5.1,
// CALCULATOR_SPEC sections 7.2-7.3).
//
// This module owns every numeric boundary and code the v1 Tolerance Engine
// may emit: the 30-day use-frequency bands, the single frequent-use
// intensity override, uniform low/low confidence, the uncertainty summary
// code, and the driver/limitation message codes. A scientific or product
// rule change here requires a new policy version and new golden fixtures.

import type { ProductKind, Route } from '../schemas/enums.ts';
import type { DriverCode, LimitationCode, RecommendedRangeDays } from '../schemas/result.ts';

export const TOLERANCE_POLICY_VERSION = 'tolerance-v1';

export interface ToleranceBaseBand {
  readonly minUseDays: number;
  readonly maxUseDays: number;
  readonly recommendedRangeDays: RecommendedRangeDays;
  readonly driver: DriverCode;
}

// Source anchors mapped to product heuristics (CALCULATOR_SPEC 7.3). The
// 26-30 row is the near-daily/daily profile; the frequent-use row is 16-25.
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

export interface TolerancePolicyV1 {
  readonly id: string;
  readonly baseBands: readonly ToleranceBaseBand[];
  readonly intensityRule: ToleranceIntensityRule;
  readonly evidenceConfidence: 'low';
  readonly personalisationConfidence: 'low';
  readonly recommendationStatus: 'heuristic';
  readonly uncertaintySummaryCode: string;
  readonly baselineLowDriver: DriverCode;
}

export const TOLERANCE_POLICY_V1: TolerancePolicyV1 = {
  id: TOLERANCE_POLICY_VERSION,
  baseBands: TOLERANCE_BASE_BANDS,
  intensityRule: TOLERANCE_INTENSITY_RULE,
  evidenceConfidence: 'low',
  personalisationConfidence: 'low',
  recommendationStatus: 'heuristic',
  uncertaintySummaryCode: 'broad_heuristic_individual_response_varies',
  baselineLowDriver: 'baseline_tolerance_likely_low',
};

/** Selects the base band for a use-day count in 1..30, or undefined at 0. */
export function selectBaseBand(
  policy: TolerancePolicyV1,
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
  policy: TolerancePolicyV1,
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
