// Static versioned v3 tolerance policy (ARCHITECTURE section 5.1,
// CALCULATOR_SPEC sections 7.2-7.3, 7.5, 7.8).
//
// This module owns every numeric boundary and code the v3 Tolerance Engine
// may emit. A scientific or product rule change here requires a new policy
// version and new golden fixtures.
//
// tolerance-v3 vs tolerance-v2: the broad evidence-supported ranges
// (2-7 / 7-14 / 14-21 / 21-28) are unchanged and remain the outer bounds of
// every recommendation. What is new is that the calculator no longer reduces
// to a single-variable frequency lookup. v3 classifies exposure with a small,
// deterministic, human-readable rule set over the primary planning drivers the
// research source lists:
//
//   1. frequency  -> use days in the last 30 (base tier);
//   2. intensity  -> sessions per use day, concentrates, dabbing;
//   3. chronicity -> how long the current pattern has been typical.
//
// An exposure factor may move the *classification* to at most one adjacent
// evidence tier (e.g. 7-14 -> 14-21). Duration on its own may move the band
// only for an already-frequent long-established pattern, and never above
// 21-28. There is no duration-to-days equation, no additive "concentrate =
// +7 days" penalty, and no weighted pseudo-scientific score. Every movement
// is a labelled product heuristic, never a biological prediction.
//
// The deterministic planning target is selected inside the final range
// (lower anchor for a recently established pattern, upper anchor otherwise).
// A clean, in-range previous-break observation may raise that planning target
// to the user's own best observed anchor (see engine step 7). History never
// moves the range itself.

import type { CurrentPatternDurationBand, ProductKind, Route } from '../schemas/enums.ts';
import type {
  DriverCode,
  LimitationCode,
  RecommendedRangeDays,
  WithdrawalAnchorCode,
} from '../schemas/result.ts';

export const TOLERANCE_POLICY_VERSION = 'tolerance-v3';

export type FrequencyTier = 1 | 2 | 3 | 4;

export interface ToleranceFrequencyBand {
  readonly minUseDays: number;
  readonly maxUseDays: number;
  readonly tier: FrequencyTier;
  readonly baseRangeDays: RecommendedRangeDays;
  readonly driver: DriverCode;
}

// Frequency anchor rows, unchanged from tolerance-v1/v2 (CALCULATOR_SPEC
// 7.3). The ranges are broad product heuristics mapped from the research
// source's profile anchors.
export const TOLERANCE_FREQUENCY_BANDS: readonly ToleranceFrequencyBand[] = [
  { minUseDays: 1, maxUseDays: 3, tier: 1, baseRangeDays: { min: 2, max: 7 }, driver: 'very_infrequent_use' },
  { minUseDays: 4, maxUseDays: 15, tier: 2, baseRangeDays: { min: 7, max: 14 }, driver: 'regular_nondaily_use' },
  { minUseDays: 16, maxUseDays: 25, tier: 3, baseRangeDays: { min: 14, max: 21 }, driver: 'frequent_use' },
  { minUseDays: 26, maxUseDays: 30, tier: 4, baseRangeDays: { min: 21, max: 28 }, driver: 'near_daily_or_daily_use' },
];

export type ChronicityClass = 'recent' | 'medium' | 'long';

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

// Chronicity classes over the five product UX duration bands
// (CALCULATOR_SPEC 4.1). The bands remain product categories, not medical
// cut-points. Missing duration is a separate "unknown" state and never gets
// an invented default.
export const RECENT_DURATION_BANDS: readonly CurrentPatternDurationBand[] = ['under_1_month', '1_to_6_months'];
export const MEDIUM_DURATION_BANDS: readonly CurrentPatternDurationBand[] = ['6_to_24_months'];
export const LONG_DURATION_BANDS: readonly CurrentPatternDurationBand[] = ['2_to_5_years', '5_plus_years'];

/** Deterministic chronicity class for a stored duration band; null = missing. */
export function chronicityClass(duration: CurrentPatternDurationBand | null): ChronicityClass | null {
  if (duration === null) return null;
  if (RECENT_DURATION_BANDS.includes(duration)) return 'recent';
  if (MEDIUM_DURATION_BANDS.includes(duration)) return 'medium';
  return 'long';
}

/** Base frequency band for a validated use-day count in 1..30, or undefined at 0. */
export function frequencyBandForUseDays(useDays: number): ToleranceFrequencyBand | undefined {
  return TOLERANCE_FREQUENCY_BANDS.find(
    (band) => useDays >= band.minUseDays && useDays <= band.maxUseDays,
  );
}

export interface IntensitySignals {
  readonly multipleSessions: boolean;
  readonly concentrate: boolean;
  readonly dabbing: boolean;
}

export function intensitySignalsFor(
  sessionsPerUseDay: number | null,
  products: readonly ProductKind[],
  routes: readonly Route[],
): IntensitySignals {
  return {
    multipleSessions: sessionsPerUseDay !== null && sessionsPerUseDay >= 2,
    concentrate: products.includes('concentrate'),
    dabbing: routes.includes('dabbing'),
  };
}

export function hasIntensitySignal(signals: IntensitySignals): boolean {
  return signals.multipleSessions || signals.concentrate || signals.dabbing;
}

/**
 * Bounded exposure classification (CALCULATOR_SPEC 7.3 v3 rule). Returns the
 * resolved exposure tier plus the final range and a small deterministic
 * explanation of any upward movement.
 *
 * Movement is at most one adjacent tier above the frequency base:
 * - very infrequent (tier 1) never moves: isolated concentrate/dabbing use at
 *   this frequency is not treated as a heavy pattern;
 * - regular non-daily (tier 2) moves to frequent (tier 3) when intensity is
 *   high (sessions per use day >= 2, concentrates, or dabbing);
 * - frequent (tier 3) moves to daily/heavy (tier 4) when intensity is high OR
 *   the pattern is long-established (2-5 years or 5+ years);
 * - daily/heavy (tier 4) stays at tier 4 - the 21-28 range is the strongest
 *   broad anchor and is never exceeded because use has lasted for years.
 */
export interface ExposureClassification {
  readonly baseTier: FrequencyTier;
  readonly tier: FrequencyTier;
  readonly rangeDays: RecommendedRangeDays;
  /** True when intensity signals pushed the profile up one adjacent tier. */
  readonly raisedByIntensity: boolean;
  /** True when a long-established pattern pushed the profile up one tier. */
  readonly raisedByChronicity: boolean;
}

export function classifyExposure(
  useDays: number,
  chronicity: ChronicityClass | null,
  intensity: IntensitySignals,
): ExposureClassification {
  const base = frequencyBandForUseDays(useDays);
  if (base === undefined) {
    throw new RangeError(`cannot classify zero or out-of-range use days: ${useDays}`);
  }
  const intensityHigh = hasIntensitySignal(intensity);
  let tier: FrequencyTier = base.tier;
  let raisedByIntensity = false;
  let raisedByChronicity = false;
  if (base.tier === 2 && intensityHigh) {
    tier = 3;
    raisedByIntensity = true;
  } else if (base.tier === 3) {
    if (intensityHigh) {
      tier = 4;
      raisedByIntensity = true;
    } else if (chronicity === 'long') {
      tier = 4;
      raisedByChronicity = true;
    }
  }
  return {
    baseTier: base.tier,
    tier,
    rangeDays: rangeForTier(tier),
    raisedByIntensity,
    raisedByChronicity,
  };
}

const TIER_RANGES: Readonly<Record<FrequencyTier, RecommendedRangeDays>> = {
  1: { min: 2, max: 7 },
  2: { min: 7, max: 14 },
  3: { min: 14, max: 21 },
  4: { min: 21, max: 28 },
};

export function rangeForTier(tier: FrequencyTier): RecommendedRangeDays {
  return TIER_RANGES[tier];
}

/**
 * Preferred-target anchor heuristic (CALCULATOR_SPEC 7.3, product heuristic
 * `heuristic_duration_target_within_range_v3`). `preferredTargetDays` is a
 * planning choice inside the already-selected evidence range. It never widens,
 * narrows, or moves that range.
 *
 * Deterministic mapping of the chronicity classes to an anchor:
 *
 * - `recent` (under 1 month / 1-6 months) -> lower anchor of the range;
 * - `medium` (6-24 months), `long` (2-5 years / 5+ years) -> upper anchor;
 * - missing (legacy profile) -> upper anchor, exactly the tolerance-v1/v2
 *   default, so a legacy recalculation never invents a new default.
 *
 * These are product UX tiers over the collected duration bands, not medical
 * cut-points and not a duration-to-days equation.
 */
export function selectPreferredTargetDays(
  range: RecommendedRangeDays,
  chronicity: ChronicityClass | null,
): number {
  return chronicity === 'recent' ? range.min : range.max;
}

export interface TolerancePolicyV3 {
  readonly id: string;
  readonly frequencyBands: readonly ToleranceFrequencyBand[];
  readonly withdrawalAnchors: readonly WithdrawalAnchor[];
  readonly evidenceConfidence: 'low';
  readonly personalisationConfidence: 'low';
  readonly recommendationStatus: 'heuristic';
  readonly uncertaintySummaryCode: string;
  readonly baselineLowDriver: DriverCode;
}

export const TOLERANCE_POLICY_V3: TolerancePolicyV3 = {
  id: TOLERANCE_POLICY_VERSION,
  frequencyBands: TOLERANCE_FREQUENCY_BANDS,
  withdrawalAnchors: TOLERANCE_WITHDRAWAL_ANCHORS,
  evidenceConfidence: 'low',
  personalisationConfidence: 'low',
  recommendationStatus: 'heuristic',
  uncertaintySummaryCode: 'broad_heuristic_individual_response_varies',
  baselineLowDriver: 'baseline_tolerance_likely_low',
};

// Limitation codes emitted by the v3 engine. They are metadata for tests and
// future evidence work; the UI never shows raw codes.
export const LIMITATION_INTENSITY = 'heuristic_frequency_intensity_v3' as LimitationCode;
export const LIMITATION_CHRONICITY_RANGE = 'heuristic_chronicity_range_v3' as LimitationCode;
export const LIMITATION_DURATION_TARGET = 'heuristic_duration_target_within_range_v3' as LimitationCode;
export const LIMITATION_HISTORY_TARGET = 'heuristic_history_target_within_range_v3' as LimitationCode;
