// Honest Then → Now comparisons from stored check-ins.
//
// Rules (product + research brief):
//   - null is not zero
//   - do not interpolate missing days
//   - do not fabricate a baseline
//   - do not average unrelated symptoms into a score
//   - do not claim the break caused the change
//   - require two different check-ins with a non-null rating for that field

import type { DailyCheckin } from '../../domain/schemas/profile.ts';
import {
  CHECKIN_COMPARISON_COPY,
  HIGHER_IS_MORE_COMFORTABLE,
  SYMPTOM_COMPARE_FIELDS,
  type SymptomKind,
} from '../../domain/guidance/evidence-guidance-v1.ts';

export type ComparisonDirection = 'lower' | 'higher' | 'same';

export interface SymptomThenNow {
  readonly field: SymptomKind;
  readonly earliestValue: number;
  readonly latestValue: number;
  readonly direction: ComparisonDirection;
  readonly copy: string;
}

export interface CheckinComparisonView {
  readonly available: boolean;
  readonly comparisons: readonly SymptomThenNow[];
  readonly helper: string;
}

const COPY: Record<SymptomKind, Record<ComparisonDirection, string>> = {
  craving: {
    lower: CHECKIN_COMPARISON_COPY.cravingLower,
    higher: CHECKIN_COMPARISON_COPY.cravingHigher,
    same: CHECKIN_COMPARISON_COPY.cravingSame,
  },
  sleep: {
    lower: CHECKIN_COMPARISON_COPY.sleepLower,
    higher: CHECKIN_COMPARISON_COPY.sleepHigher,
    same: CHECKIN_COMPARISON_COPY.sleepSame,
  },
  irritability: {
    lower: CHECKIN_COMPARISON_COPY.irritabilityLower,
    higher: CHECKIN_COMPARISON_COPY.irritabilityHigher,
    same: CHECKIN_COMPARISON_COPY.irritabilitySame,
  },
  anxiety: {
    lower: CHECKIN_COMPARISON_COPY.anxietyLower,
    higher: CHECKIN_COMPARISON_COPY.anxietyHigher,
    same: CHECKIN_COMPARISON_COPY.anxietySame,
  },
  appetite: {
    lower: CHECKIN_COMPARISON_COPY.appetiteLower,
    higher: CHECKIN_COMPARISON_COPY.appetiteHigher,
    same: CHECKIN_COMPARISON_COPY.appetiteSame,
  },
};

const MIN_BREAK_DAY_FOR_COMPARISON = 7;

/** Then → Now from actually stored ratings. Empty when data is insufficient. */
export function compareCheckins(
  checkins: readonly DailyCheckin[],
  options: { readonly breakDay: number } = { breakDay: MIN_BREAK_DAY_FOR_COMPARISON },
): CheckinComparisonView {
  if (options.breakDay < MIN_BREAK_DAY_FOR_COMPARISON) {
    return { available: false, comparisons: [], helper: CHECKIN_COMPARISON_COPY.insufficient };
  }
  const chronological = [...checkins].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  const comparisons: SymptomThenNow[] = [];
  for (const field of SYMPTOM_COMPARE_FIELDS) {
    const pair = earliestAndLatest(chronological, field);
    if (pair === null) continue;
    const direction = directionOf(pair.earliest, pair.latest);
    comparisons.push({
      field,
      earliestValue: pair.earliest,
      latestValue: pair.latest,
      direction,
      copy: COPY[field][direction],
    });
  }
  return {
    available: comparisons.length > 0,
    comparisons,
    helper: comparisons.length > 0 ? CHECKIN_COMPARISON_COPY.helper : CHECKIN_COMPARISON_COPY.insufficient,
  };
}

function earliestAndLatest(
  checkins: readonly DailyCheckin[],
  field: SymptomKind,
): { earliest: number; latest: number } | null {
  const rated = checkins.filter((row) => ratingOf(row, field) !== null);
  if (rated.length < 2) return null;
  const first = rated[0];
  const last = rated[rated.length - 1];
  if (first === undefined || last === undefined) return null;
  if (first.recordedAt === last.recordedAt) return null;
  const earliest = ratingOf(first, field);
  const latest = ratingOf(last, field);
  if (earliest === null || latest === null) return null;
  return { earliest, latest };
}

function ratingOf(checkin: DailyCheckin, field: SymptomKind): number | null {
  const value = checkin[field];
  return typeof value === 'number' ? value : null;
}

function directionOf(earliest: number, latest: number): ComparisonDirection {
  if (latest < earliest) return 'lower';
  if (latest > earliest) return 'higher';
  return 'same';
}

export function higherIsMoreComfortable(field: SymptomKind): boolean {
  return HIGHER_IS_MORE_COMFORTABLE.has(field);
}
