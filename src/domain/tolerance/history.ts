// Previous-break history inference (CALCULATOR_SPEC section 7.7).
//
// Descriptive only: the derived insight can never change the numeric range or
// target. Directional history insight is generated only for a tolerance
// result with a current range; every other route emits null.

import type { ValidatedPreviousBreak } from '../schemas/profile.ts';
import type { HistoryInsight, HistoryObservation, RecommendedRangeDays } from '../schemas/result.ts';
import type { Instant } from '../schemas/time.ts';

/** Literal code added when a selected comparison sits outside the current
 * recommended range (spec 7.7 rule 9). Exposed for message-template mapping;
 * the structured signal is `HistoryInsight.outsideRecommendedRange`. */
export const HISTORY_OUTSIDE_POPULATION_RANGE = 'history_outside_population_range';

/**
 * Derives the v1 history insight from previous breaks against the current
 * recommended range. Returns null when there is no directional insight
 * (fewer than two distinct eligible durations).
 */
export function deriveHistoryInsight(
  previousBreaks: readonly ValidatedPreviousBreak[],
  recommendedRangeDays: RecommendedRangeDays,
): HistoryInsight | null {
  // Rule 1: eligible records have an integer duration and a 0-10 score.
  // (Durations were already validated as integers >= 1.)
  const eligible = previousBreaks.filter(
    (previousBreak): previousBreak is ValidatedPreviousBreak & { toleranceReductionScore: number } =>
      previousBreak.toleranceReductionScore !== null,
  );

  // Rule 2: when several eligible records share a duration, keep the most
  // recent by endedAt, falling back to createdAt. Ties resolve to the record
  // with the lexicographically smallest id so the outcome is fully
  // deterministic.
  const byDuration = new Map<number, ValidatedPreviousBreak & { toleranceReductionScore: number }>();
  for (const record of eligible) {
    const current = byDuration.get(record.durationDays);
    if (current === undefined || isMoreRecent(record, current)) {
      byDuration.set(record.durationDays, record);
    }
  }

  // Rule 3: fewer than two distinct eligible durations produces no insight.
  const representatives = [...byDuration.entries()]
    .map(([durationDays, record]) => ({ durationDays, toleranceReductionScore: record.toleranceReductionScore }))
    .sort((a, b) => a.durationDays - b.durationDays);
  if (representatives.length < 2) return null;

  // Rules 4-5: an inversion exists when the longer break has a lower score.
  // (Indexes are always in bounds because representatives.length >= 2.)
  let inversion = false;
  outer: for (let i = 0; i < representatives.length; i += 1) {
    for (let j = i + 1; j < representatives.length; j += 1) {
      if (representatives[j]!.toleranceReductionScore < representatives[i]!.toleranceReductionScore) {
        inversion = true;
        break outer;
      }
    }
  }

  // Rule 6: any inversion -> mixed, no directional claim.
  if (inversion) {
    return { code: 'history_mixed_no_directional_claim', observations: null, outsideRecommendedRange: false };
  }

  // representatives.length >= 2 is guaranteed above, so both ends exist.
  const first = representatives[0]!;
  const last = representatives[representatives.length - 1]!;

  // Rule 7: no inversion and all scores equal -> no additional benefit observed.
  if (first.toleranceReductionScore === last.toleranceReductionScore) {
    return {
      code: 'history_no_additional_benefit_observed',
      observations: null,
      outsideRecommendedRange: false,
    };
  }

  // Rule 8: report the shortest and longest eligible observations only.
  const shortest: HistoryObservation = { ...first };
  const longest: HistoryObservation = { ...last };
  // Rule 9: mark comparisons that fall outside today's broad heuristic range;
  // never suppress them and never alter the target.
  const outsideRecommendedRange =
    shortest.durationDays < recommendedRangeDays.min ||
    shortest.durationDays > recommendedRangeDays.max ||
    longest.durationDays < recommendedRangeDays.min ||
    longest.durationDays > recommendedRangeDays.max;

  return {
    code: 'history_directional_observation',
    observations: [shortest, longest],
    outsideRecommendedRange,
  };
}

function isMoreRecent(
  candidate: ValidatedPreviousBreak,
  incumbent: ValidatedPreviousBreak,
): boolean {
  const candidateReference = referenceInstant(candidate);
  const incumbentReference = referenceInstant(incumbent);
  if (candidateReference !== incumbentReference) return candidateReference > incumbentReference;
  return candidate.id < incumbent.id;
}

/** endedAt when present, otherwise createdAt (spec 7.7 rule 2). */
function referenceInstant(record: ValidatedPreviousBreak): Instant {
  return record.endedAt ?? record.createdAt;
}
