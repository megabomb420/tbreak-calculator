// Structured result contracts (CALCULATOR_SPEC section 7.1).
//
// Driver and limitation codes are deterministic, non-scientific message
// codes owned by the static tolerance policy. Withdrawal display and history
// insight derivation are later domain slices; their types are declared here
// so the result contract is complete, and the v1 engine emits null for both.

import type { Confidence } from './enums.ts';
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
  | 'baseline_tolerance_likely_low';

export type LimitationCode = 'heuristic_frequency_intensity_v1';

export type WithdrawalAnchorCode = 'onset' | 'common_peak' | 'substantial_improvement' | 'sleep_disturbance';

export type WithdrawalAnchorStatus = 'upcoming' | 'current' | 'past';

export interface WithdrawalAnchorState {
  readonly anchor: WithdrawalAnchorCode;
  readonly status: WithdrawalAnchorStatus | null;
}

export interface WithdrawalDisplay {
  readonly breakDay: number;
  readonly elapsedHours: number;
  readonly anchors: readonly WithdrawalAnchorState[];
}

export type HistoryInsightCode =
  | 'history_mixed_no_directional_claim'
  | 'history_no_additional_benefit_observed'
  | 'history_directional_observation';

export interface HistoryInsight {
  readonly code: HistoryInsightCode;
  readonly comparedDurationsDays: readonly [number, number] | null;
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
