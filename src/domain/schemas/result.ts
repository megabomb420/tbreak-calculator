// Structured result contracts (CALCULATOR_SPEC sections 7.1, 8.1 and 6).
//
// Driver and limitation codes are deterministic, non-scientific message
// codes owned by the static tolerance policy. Withdrawal display and history
// insight are derived by the v1 engine (spec 7.7-7.8); the anchor data for
// withdrawal lives in the versioned tolerance policy. Detection and nominal
// THC have their own result types; tolerance, detection and impairment stay
// explicitly separate.

import type { Confidence, DetectionContext, DetectionMatrix } from './enums.ts';
import type { Instant } from './time.ts';

export type ToleranceResultKind = 'tolerance_result' | 'planning_only' | 'not_applicable' | 'validation_error';

export interface RecommendedRangeDays {
  readonly min: number;
  readonly max: number;
}

export type DriverCode =
  | 'very_infrequent_use'
  | 'regular_nondaily_use'
  | 'frequent_use'
  | 'near_daily_or_daily_use'
  | 'multiple_sessions_per_day'
  | 'concentrate_product_use'
  | 'dabbing_route_use'
  | 'long_established_chronic_use'
  | 'baseline_tolerance_likely_low';

export type LimitationCode =
  // v1/v2 codes: retained so frozen historical records keep their metadata.
  | 'heuristic_frequency_intensity_v1'
  | 'heuristic_duration_target_within_range_v2'
  // v3 exposure-classification codes (tolerance-v3).
  | 'heuristic_frequency_intensity_v3'
  | 'heuristic_chronicity_range_v3'
  | 'heuristic_duration_target_within_range_v3'
  | 'heuristic_history_target_within_range_v3';

export type WithdrawalAnchorCode = 'onset' | 'common_peak' | 'substantial_improvement' | 'sleep_disturbance';

export type WithdrawalAnchorStatus = 'upcoming' | 'current' | 'past';

export interface WithdrawalAnchorState {
  readonly anchor: WithdrawalAnchorCode;
  /** Position of the anchor relative to breakDay. Null when the anchor has no
   * numeric day range (the open-ended sleep statement). */
  readonly status: WithdrawalAnchorStatus | null;
}

export interface WithdrawalDisplay {
  readonly breakDay: number;
  readonly elapsedHours: number;
  /** Anchor states in fixed policy order; the UI renders them verbatim. */
  readonly anchors: readonly WithdrawalAnchorState[];
}

export interface HistoryObservation {
  readonly durationDays: number;
  readonly toleranceReductionScore: number;
}

export type HistoryInsightCode =
  | 'history_mixed_no_directional_claim'
  | 'history_no_additional_benefit_observed'
  | 'history_directional_observation';

export interface HistoryInsight {
  readonly code: HistoryInsightCode;
  /**
   * The two exact observations compared (shortest, then longest eligible
   * duration) for a directional insight (spec 7.7 rule 8). Null when no
   * directional comparison was selected.
   */
  readonly observations: readonly [HistoryObservation, HistoryObservation] | null;
  /**
   * True when either compared duration falls outside the current recommended
   * range (spec 7.7 rule 9: history_outside_population_range). Never changes
   * the range or target.
   */
  readonly outsideRecommendedRange: boolean;
}

export interface ToleranceResult {
  readonly kind: ToleranceResultKind;
  readonly recommendedRangeDays: RecommendedRangeDays | null;
  readonly preferredTargetDays: number | null;
  readonly recommendationStatus: 'heuristic' | null;
  readonly evidenceConfidence: Confidence | null;
  readonly personalisationConfidence: Confidence | null;
  readonly uncertaintySummaryCode: string | null;
  readonly withdrawal: WithdrawalDisplay | null;
  readonly drivers: readonly DriverCode[];
  readonly historyInsight: HistoryInsight | null;
  readonly limitations: readonly LimitationCode[];
  readonly policyVersion: string;
  readonly calculatedAt: Instant;
}

// --- Qualitative Detection Engine result (CALCULATOR_SPEC section 8.1) -----

export type DetectionResultKind = 'qualitative_only' | 'validation_error';

export interface DetectionResult {
  readonly kind: DetectionResultKind;
  /** Validated matrix, or null on a validation_error result. */
  readonly matrix: DetectionMatrix | null;
  /** Validated context, or null on a validation_error result. */
  readonly context: DetectionContext | null;
  readonly numericEstimateAvailable: false;
  /** Deterministic static copy codes selected by the detection policy. */
  readonly interpretationCodes: readonly string[];
  /** Unknowns and warnings, including context-specific jurisdiction/cutoff codes. */
  readonly uncertaintyCodes: readonly string[];
  readonly evidenceConfidence: null;
  readonly personalisationConfidence: null;
  readonly policyVersion: string;
}

// --- Nominal flower THC result (CALCULATOR_SPEC section 6) ------------------

export type NominalThcResultKind = 'nominal_thc' | 'validation_error';

/**
 * The only amount label v1 can emit for flower. THC contained in plant
 * material is `nominal_thc`; it is never represented as an absorbed,
 * delivered or bioavailable dose. Future exposure estimates must use their
 * own result types and labels, never this one.
 */
export type ThcAmountLabel = 'nominal_thc';

export interface NominalThcResult {
  readonly kind: NominalThcResultKind;
  readonly label: ThcAmountLabel | null;
  readonly nominalThcMg: number | null;
  readonly policyVersion: string;
}

