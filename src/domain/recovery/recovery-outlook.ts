// Deterministic Recovery Outlook interpretation over a frozen tolerance result.
//
// V1 is retained for records created before 0.9.2. V2 adds a separate,
// profile-sensitive predicted tolerance-recovery window. Neither version
// changes tolerance-v3, calls a network/LLM, or emits a reset percentage.

import type { UseProfileInput } from '../schemas/profile.ts';
import type { RecommendedRangeDays, ToleranceResult } from '../schemas/result.ts';
import {
  chronicityClass,
  hasIntensitySignal,
  intensitySignalsFor,
} from '../policies/tolerance-policy-v3.ts';

export const RECOVERY_OUTLOOK_V1_VERSION = 'tolerance-recovery-outlook-v1' as const;
export const RECOVERY_OUTLOOK_VERSION = 'tolerance-recovery-outlook-v2' as const;
export type RecoveryOutlookVersion =
  | typeof RECOVERY_OUTLOOK_V1_VERSION
  | typeof RECOVERY_OUTLOOK_VERSION;

/** Four weeks: the strongest direct human CB1 biological reference used here. */
export const BIOLOGICAL_REFERENCE_DAYS = 28;
export const EARLY_RECOVERY_REFERENCE_DAYS = 2;
/** Six weeks: an indirect, preclinical-supported product-heuristic ceiling. */
export const MAX_PREDICTED_RECOVERY_DAYS = 42;

export type RecoveryWordingKey =
  | 'light_or_regular'
  | 'heavy_target_below_reference'
  | 'heavy_reaches_reference';

export type RecoveryMilestoneId =
  | 'last_use'
  | 'early_recovery'
  | 'plan_target'
  | 'range_upper'
  | 'predicted_window_start'
  | 'four_week_reference'
  | 'predicted_window_end';

export interface RecoveryMilestone {
  readonly id: RecoveryMilestoneId;
  readonly day: number;
  readonly label: string;
}

export interface RecoveryHistoryObservation {
  readonly durationDays: number;
  readonly toleranceReductionScore: number;
}

interface RecoveryOutlookCommon {
  readonly planningTargetDays: number | null;
  readonly evidenceRange: RecommendedRangeDays | null;
  readonly biologicalReferenceDays: number;
  readonly wordingKey: RecoveryWordingKey;
  readonly profileContext: {
    readonly lightOrRegular: boolean;
    readonly planReachesReference: boolean;
    readonly rangeUpperAtReference: boolean;
  };
  readonly milestones: readonly RecoveryMilestone[];
  readonly personalHistory: readonly RecoveryHistoryObservation[] | null;
  readonly historyRaisedTarget: boolean;
  readonly evidenceIds: readonly string[];
}

export interface ToleranceRecoveryOutlookV1 extends RecoveryOutlookCommon {
  readonly version: typeof RECOVERY_OUTLOOK_V1_VERSION;
}

export type RecoveryWindowRule =
  | 'tolerance_range'
  | 'daily_with_one_extended_signal'
  | 'frequent_with_intensity_and_long_duration'
  | 'daily_with_intensity_and_long_duration';

export interface ToleranceRecoveryOutlookV2 extends RecoveryOutlookCommon {
  readonly version: typeof RECOVERY_OUTLOOK_VERSION;
  /** Product estimate, not a validated clinical or biological endpoint. */
  readonly predictedRecoveryWindow: RecommendedRangeDays;
  readonly predictionRule: RecoveryWindowRule;
  readonly predictionEvidence: {
    readonly classification: 'product_heuristic';
    readonly extendedBeyondHumanReference: boolean;
    readonly upperBoundDirectness: 'product_heuristic_with_human_context' | 'indirect_preclinical';
  };
}

export type ToleranceRecoveryOutlook =
  | ToleranceRecoveryOutlookV1
  | ToleranceRecoveryOutlookV2;

function profileWording(profile: UseProfileInput, result: ToleranceResult) {
  const drivers = new Set(result.drivers);
  const days = profile.thcUseDaysLast30.value;
  const veryInfrequent = days !== null && days >= 1 && days <= 3;
  const heavy =
    drivers.has('near_daily_or_daily_use') ||
    (!veryInfrequent && (
      drivers.has('concentrate_product_use') ||
      drivers.has('dabbing_route_use') ||
      drivers.has('long_established_chronic_use')
    ));
  const frequent = drivers.has('frequent_use');
  const duration = profile.currentPatternDuration?.value ?? null;
  const longEstablished = duration === '2_to_5_years' || duration === '5_plus_years';
  const heavyFromChronicity = frequent && longEstablished && !veryInfrequent;
  return {
    lightOrRegular: !heavy && !frequent && !heavyFromChronicity,
    heavy: heavy || heavyFromChronicity,
  };
}

function historyFor(input: {
  readonly previousBreaks?: readonly {
    readonly durationDays: number;
    readonly toleranceReductionScore: number | null;
  }[];
}): readonly RecoveryHistoryObservation[] | null {
  const scored = (input.previousBreaks ?? []).filter(
    (previous): previous is { durationDays: number; toleranceReductionScore: number } =>
      previous.toleranceReductionScore !== null,
  );
  return scored.length === 0
    ? null
    : scored.slice(0, 3).map(({ durationDays, toleranceReductionScore }) => ({
        durationDays,
        toleranceReductionScore,
      }));
}

function wordingFor(profile: UseProfileInput, result: ToleranceResult, target: number) {
  const { lightOrRegular, heavy } = profileWording(profile, result);
  const planReachesReference = target >= BIOLOGICAL_REFERENCE_DAYS;
  return {
    lightOrRegular,
    planReachesReference,
    wordingKey: (heavy
      ? planReachesReference
        ? 'heavy_reaches_reference'
        : 'heavy_target_below_reference'
      : 'light_or_regular') as RecoveryWordingKey,
  };
}

function deduplicateMilestones(candidates: readonly RecoveryMilestone[]): readonly RecoveryMilestone[] {
  const rank: Record<RecoveryMilestoneId, number> = {
    last_use: 0,
    early_recovery: 1,
    plan_target: 2,
    range_upper: 3,
    predicted_window_start: 4,
    predicted_window_end: 5,
    four_week_reference: 6,
  };
  const byDay = new Map<number, RecoveryMilestone>();
  for (const candidate of candidates) {
    const current = byDay.get(candidate.day);
    if (current === undefined || rank[candidate.id] > rank[current.id]) {
      byDay.set(candidate.day, candidate);
    }
  }
  return [...byDay.values()].sort((a, b) => a.day - b.day);
}

function baseData(input: {
  readonly profile: UseProfileInput;
  readonly result: ToleranceResult;
  readonly previousBreaks?: readonly {
    readonly durationDays: number;
    readonly toleranceReductionScore: number | null;
  }[];
}) {
  const { profile, result } = input;
  if (result.kind !== 'tolerance_result') return null;
  const range = result.recommendedRangeDays;
  const target = result.preferredTargetDays;
  if (range === null || target === null) return null;
  return {
    profile,
    result,
    range,
    target,
    wording: wordingFor(profile, result, target),
    personalHistory: historyFor(input),
    historyRaisedTarget: result.limitations.includes('heuristic_history_target_within_range_v3'),
  };
}

/** Historical v1 builder. Its fixed Day-28 semantics are intentionally kept. */
export function buildToleranceRecoveryOutlookV1(input: {
  readonly profile: UseProfileInput;
  readonly result: ToleranceResult;
  readonly previousBreaks?: readonly {
    readonly durationDays: number;
    readonly toleranceReductionScore: number | null;
  }[];
}): ToleranceRecoveryOutlookV1 | null {
  const data = baseData(input);
  if (data === null) return null;
  const { range, target, wording, personalHistory, historyRaisedTarget } = data;
  return {
    version: RECOVERY_OUTLOOK_V1_VERSION,
    planningTargetDays: target,
    evidenceRange: range,
    biologicalReferenceDays: BIOLOGICAL_REFERENCE_DAYS,
    wordingKey: wording.wordingKey,
    profileContext: {
      lightOrRegular: wording.lightOrRegular,
      planReachesReference: wording.planReachesReference,
      rangeUpperAtReference: range.max >= BIOLOGICAL_REFERENCE_DAYS,
    },
    milestones: deduplicateMilestones([
      { id: 'last_use', day: 0, label: 'Last use' },
      { id: 'early_recovery', day: 2, label: 'Early biological changes can appear within the first days' },
      { id: 'plan_target', day: target, label: 'Your plan target' },
      { id: 'range_upper', day: range.max, label: 'Top of your evidence range' },
      { id: 'four_week_reference', day: 28, label: 'Around four weeks — the strongest human CB1 reference used by the app' },
    ]),
    personalHistory,
    historyRaisedTarget,
    evidenceIds: ['pet_dsouza', 'pet_hirvonen'],
  };
}

/**
 * Reviewed v2 prediction rule. The tolerance-v3 range is the default. Only an
 * already frequent/daily profile can enter an extended class; missing values
 * never count as intensity or long duration.
 */
export function predictedRecoveryWindowFor(
  profile: UseProfileInput,
  range: RecommendedRangeDays,
): { readonly window: RecommendedRangeDays; readonly rule: RecoveryWindowRule } {
  const useDays = profile.thcUseDaysLast30.value;
  if (useDays === null || range.max < BIOLOGICAL_REFERENCE_DAYS) {
    return { window: range, rule: 'tolerance_range' };
  }
  const daily = useDays >= 26;
  const frequent = useDays >= 16 && useDays <= 25;
  const intensity = hasIntensitySignal(
    intensitySignalsFor(profile.sessionsPerUseDay.value, profile.products, profile.routes),
  );
  const longDuration = chronicityClass(profile.currentPatternDuration?.value ?? null) === 'long';

  if (daily && intensity && longDuration) {
    return { window: { min: 28, max: 42 }, rule: 'daily_with_intensity_and_long_duration' };
  }
  if (daily && (intensity || longDuration)) {
    return { window: { min: 28, max: 35 }, rule: 'daily_with_one_extended_signal' };
  }
  if (frequent && intensity && longDuration) {
    return { window: { min: 28, max: 35 }, rule: 'frequent_with_intensity_and_long_duration' };
  }
  return { window: range, rule: 'tolerance_range' };
}

/** Current deterministic v2 builder. */
export function buildToleranceRecoveryOutlook(input: {
  readonly profile: UseProfileInput;
  readonly result: ToleranceResult;
  readonly previousBreaks?: readonly {
    readonly durationDays: number;
    readonly toleranceReductionScore: number | null;
  }[];
}): ToleranceRecoveryOutlookV2 | null {
  const data = baseData(input);
  if (data === null) return null;
  const { profile, range, target, wording, personalHistory, historyRaisedTarget } = data;
  const prediction = predictedRecoveryWindowFor(profile, range);
  const extended = prediction.window.max > BIOLOGICAL_REFERENCE_DAYS;
  return {
    version: RECOVERY_OUTLOOK_VERSION,
    planningTargetDays: target,
    evidenceRange: range,
    biologicalReferenceDays: BIOLOGICAL_REFERENCE_DAYS,
    predictedRecoveryWindow: prediction.window,
    predictionRule: prediction.rule,
    predictionEvidence: {
      classification: 'product_heuristic',
      extendedBeyondHumanReference: extended,
      upperBoundDirectness: extended ? 'indirect_preclinical' : 'product_heuristic_with_human_context',
    },
    wordingKey: wording.wordingKey,
    profileContext: {
      lightOrRegular: wording.lightOrRegular,
      planReachesReference: wording.planReachesReference,
      rangeUpperAtReference: range.max >= BIOLOGICAL_REFERENCE_DAYS,
    },
    milestones: deduplicateMilestones([
      { id: 'last_use', day: 0, label: 'Last use' },
      { id: 'early_recovery', day: 2, label: 'Early biological changes can appear within the first days' },
      { id: 'plan_target', day: target, label: 'Your plan target' },
      { id: 'range_upper', day: range.max, label: 'Top of your plan evidence range' },
      { id: 'predicted_window_start', day: prediction.window.min, label: 'Likely tolerance-recovery window begins' },
      { id: 'four_week_reference', day: 28, label: 'Human CB1 reference — around four weeks' },
      { id: 'predicted_window_end', day: prediction.window.max, label: 'Outer edge of the predicted recovery window' },
    ]),
    personalHistory,
    historyRaisedTarget,
    evidenceIds: ['pet_dsouza', 'pet_hirvonen', 'review_colizzi', 'preclinical_dudok'],
  };
}
