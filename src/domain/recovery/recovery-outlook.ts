// ToleranceRecoveryOutlookV1 — deterministic, evidence-informed recovery
// outlook (0.9.0 "Recovery Intelligence").
//
// This is NOT a second tolerance engine and does not change tolerance-v3.
// It is a versioned, pure interpretation layer built on:
//   - the frozen tolerance result (plan target + evidence range),
//   - the stored profile (classification context / wording),
//   - optional clean previous-break observations,
//   - fixed research anchors from the project source.
//
// Hard rules encoded here and enforced by tests:
//   - no percentage-reset output, no personalised biological reset day,
//     no receptor/detox percentages, no recovery curve;
//   - approximately four weeks (Day 28) is the strongest human CB1
//     biological reference used by the app, never a guaranteed "100% reset";
//   - the outlook NEVER alters planningTargetDays or evidenceRange;
//   - low-use profiles never get wording implying they need 28 days;
//   - after Day 28 there is no invented further reset percentage;
//   - personal history is shown as factual observations, never blended into
//     population research, never converted (8/10 is not 80%).
//
// Research anchors (from the project PDF/source material only):
//   D'Souza et al. (PET): 11 cannabis-dependent men, baseline CB1
//     availability ~15% lower than controls; the between-group difference was
//     no longer statistically visible after ~2 days of monitored abstinence
//     and also not after ~28 days. Small study; PET receptor availability is
//     not a direct measurement of subjective tolerance.
//   Hirvonen et al. (PET): chronic daily users showed regional CB1
//     downregulation that returned toward control levels after roughly four
//     weeks of monitored abstinence.
// The four-week reference is therefore most relevant to chronic/heavy users;
// it is not evidence that a light user needs 28 days.

import type { UseProfileInput } from '../schemas/profile.ts';
import type {
  RecommendedRangeDays,
  ToleranceResult,
} from '../schemas/result.ts';

export const RECOVERY_OUTLOOK_VERSION = 'tolerance-recovery-outlook-v1';

/** Four weeks: the strongest human CB1 biological reference used by the app. */
export const BIOLOGICAL_REFERENCE_DAYS = 28;
export const EARLY_RECOVERY_REFERENCE_DAYS = 2;

export type RecoveryWordingKey =
  | 'light_or_regular'
  | 'heavy_target_below_reference'
  | 'heavy_reaches_reference';

export type RecoveryMilestoneId =
  | 'last_use'
  | 'early_recovery'
  | 'plan_target'
  | 'range_upper'
  | 'four_week_reference';

export interface RecoveryMilestone {
  readonly id: RecoveryMilestoneId;
  /** Time position in whole days since last use (0 = last use). */
  readonly day: number;
  /** Short label; the UI adds surrounding copy from the milestone id. */
  readonly label: string;
}

export interface RecoveryHistoryObservation {
  readonly durationDays: number;
  readonly toleranceReductionScore: number;
}

export interface ToleranceRecoveryOutlookV1 {
  readonly version: typeof RECOVERY_OUTLOOK_VERSION;
  readonly planningTargetDays: number | null;
  readonly evidenceRange: RecommendedRangeDays | null;
  /** Approximately four weeks (Day 28) — strongest human CB1 reference. */
  readonly biologicalReferenceDays: number;
  readonly wordingKey: RecoveryWordingKey;
  /** Profile-context flags used by the copy, never to invent numbers. */
  readonly profileContext: {
    readonly lightOrRegular: boolean;
    readonly planReachesReference: boolean;
    readonly rangeUpperAtReference: boolean;
  };
  /** Deduplicated, time-ordered milestone markers (time, not percentage). */
  readonly milestones: readonly RecoveryMilestone[];
  /** Factual clean previous-break observations, or null when none qualify. */
  readonly personalHistory: readonly RecoveryHistoryObservation[] | null;
  /** True when tolerance-v3 used a clean in-range history observation to pick
   * the planning target; the UI may explain that in plain language. */
  readonly historyRaisedTarget: boolean;
  readonly evidenceIds: readonly string[];
}

function profileWording(
  profile: UseProfileInput,
  result: ToleranceResult,
): {
  lightOrRegular: boolean;
  heavy: boolean;
} {
  const drivers = new Set(result.drivers);
  const heavy =
    drivers.has('near_daily_or_daily_use') ||
    drivers.has('concentrate_product_use') ||
    drivers.has('dabbing_route_use') ||
    drivers.has('long_established_chronic_use');
  const frequent = drivers.has('frequent_use');
  const duration = profile.currentPatternDuration?.value ?? null;
  const longEstablished =
    duration === '2_to_5_years' || duration === '5_plus_years';
  // A long-established frequent pattern that tolerance-v3 lifts to 21-28 is
  // heavy for wording purposes; an isolated concentrate at 1-3 use-days is
  // not (tolerance-v3 never moves that tier).
  const days = profile.thcUseDaysLast30?.value ?? null;
  const veryInfrequent = days !== null && days >= 1 && days <= 3;
  const heavyFromChronicity = frequent && longEstablished && !veryInfrequent;
  const lightOrRegular =
    !heavy && !frequent && !heavyFromChronicity;
  return { lightOrRegular, heavy: heavy || heavyFromChronicity };
}

/**
 * Pure deterministic outlook builder. Consumes only frozen/validated data;
 * never reads a clock, a network or runtime generative AI. Returns null when there is no
 * tolerance result to build on (planning-only / not-applicable / detection).
 */
export function buildToleranceRecoveryOutlook(input: {
  readonly profile: UseProfileInput;
  readonly result: ToleranceResult;
  readonly previousBreaks?: readonly {
    readonly durationDays: number;
    readonly toleranceReductionScore: number | null;
  }[];
}): ToleranceRecoveryOutlookV1 | null {
  const { profile, result } = input;
  if (result.kind !== 'tolerance_result') return null;
  const range = result.recommendedRangeDays;
  const target = result.preferredTargetDays;
  if (range === null || target === null) return null;

  const { lightOrRegular, heavy } = profileWording(profile, result);
  const planReachesReference = target >= BIOLOGICAL_REFERENCE_DAYS;
  const rangeUpperAtReference = range.max >= BIOLOGICAL_REFERENCE_DAYS;

  const wordingKey: RecoveryWordingKey = heavy
    ? planReachesReference
      ? 'heavy_reaches_reference'
      : 'heavy_target_below_reference'
    : 'light_or_regular';

  // Time milestones; duplicate days collapse to one marker (dominant wins).
  const candidates: RecoveryMilestone[] = [
    { id: 'last_use', day: 0, label: 'Last use' },
    {
      id: 'early_recovery',
      day: EARLY_RECOVERY_REFERENCE_DAYS,
      label: 'Early biological changes can appear within the first days',
    },
    { id: 'plan_target', day: target, label: 'Your plan target' },
    { id: 'range_upper', day: range.max, label: 'Top of your evidence range' },
    {
      id: 'four_week_reference',
      day: BIOLOGICAL_REFERENCE_DAYS,
      label: 'Around four weeks — the strongest human CB1 reference used by the app',
    },
  ];
  const rank: Record<RecoveryMilestoneId, number> = {
    last_use: 0,
    early_recovery: 1,
    plan_target: 2,
    range_upper: 3,
    four_week_reference: 4,
  };
  const byDay = new Map<number, RecoveryMilestone>();
  for (const candidate of candidates) {
    const current = byDay.get(candidate.day);
    if (current === undefined || rank[candidate.id] > rank[current.id]) {
      byDay.set(candidate.day, candidate);
    }
  }
  const milestones = [...byDay.values()].sort((a, b) => a.day - b.day);

  const scoredPreviousBreaks = (input.previousBreaks ?? []).filter(
    (previous): previous is { durationDays: number; toleranceReductionScore: number } =>
      previous.toleranceReductionScore !== null,
  );
  // Newest-first factual list, capped at three so the result does not become a
  // history dump.
  const personalHistory =
    scoredPreviousBreaks.length === 0
      ? null
      : scoredPreviousBreaks.slice(0, 3).map((previous) => ({
          durationDays: previous.durationDays,
          toleranceReductionScore: previous.toleranceReductionScore,
        }));

  const historyRaisedTarget = result.limitations.includes(
    'heuristic_history_target_within_range_v3',
  );

  return {
    version: RECOVERY_OUTLOOK_VERSION,
    planningTargetDays: target,
    evidenceRange: range,
    biologicalReferenceDays: BIOLOGICAL_REFERENCE_DAYS,
    wordingKey,
    profileContext: {
      lightOrRegular,
      planReachesReference,
      rangeUpperAtReference,
    },
    milestones,
    personalHistory,
    historyRaisedTarget,
    evidenceIds: ['pet_dsouza', 'pet_hirvonen'],
  };
}
