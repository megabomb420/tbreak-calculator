// Conservative factual check-in summaries for the recovery outlook (0.9.0).
//
// Only directly derivable facts are reported. Rules:
//   - null is not zero and missing sliders stay missing;
//   - sparse data produces no insight (the block is omitted, never padded);
//   - no interpolation of missing days, no fabricated baseline, no
//     "you recover faster than average" claims.

export interface CheckinDayRow {
  readonly breakDay: number;
  readonly craving: number | null;
  readonly sleep: number | null;
  readonly irritability: number | null;
  readonly anxiety: number | null;
  readonly appetite: number | null;
}

export interface HighestCravingFact {
  /** First day (lowest breakDay) that ties the observed maximum. */
  readonly day: number;
  readonly craving: number;
}

/** Highest recorded craving with its day, or null when no craving was rated. */
export function highestCravingObservation(
  rows: readonly CheckinDayRow[],
): HighestCravingFact | null {
  const rated = rows
    .filter((row) => row.craving !== null)
    .map((row) => ({ day: row.breakDay, craving: row.craving as number }));
  if (rated.length === 0) return null;
  const max = Math.max(...rated.map((row) => row.craving));
  const onMax = rated.filter((row) => row.craving === max);
  const earliest = onMax.reduce(
    (best, row) => (row.day < best.day ? row : best),
    onMax[0]!,
  );
  return { day: earliest.day, craving: max };
}

export interface SleepChangeFact {
  readonly firstDay: number;
  readonly firstValue: number;
  readonly laterDay: number;
  readonly laterValue: number;
}

/**
 * Sleep rating change between the earliest rated check-in and the latest
 * rated one. Sleep quality is "higher is more comfortable". Requires two
 * rated check-ins on different days; nulls never become 0.
 */
export function sleepFirstToLaterChange(
  rows: readonly CheckinDayRow[],
): SleepChangeFact | null {
  const rated = rows
    .filter((row) => row.sleep !== null)
    .map((row) => ({ day: row.breakDay, value: row.sleep as number }));
  if (rated.length < 2) return null;
  const sorted = [...rated].sort((a, b) => a.day - b.day);
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  if (first.day === last.day) return null;
  return {
    firstDay: first.day,
    firstValue: first.value,
    laterDay: last.day,
    laterValue: last.value,
  };
}

/** True when at least two different rated rows exist for any symptom field. */
export function hasMeaningfulCheckinData(rows: readonly CheckinDayRow[]): boolean {
  const ratedDays = rows.filter(
    (row) =>
      row.craving !== null ||
      row.sleep !== null ||
      row.irritability !== null ||
      row.anxiety !== null ||
      row.appetite !== null,
  );
  const days = new Set(ratedDays.map((row) => row.breakDay));
  return days.size >= 2;
}
