// Reduction trajectory view (0.9.0) — deterministic frozen-record comparison.
//
// When an active reduction plan exists and the newest frozen tolerance record
// was created AFTER the plan started (an adaptive recalculation from tracked
// use), the card may show how the planning band moved versus the pre-plan
// record. The comparison is always: newest post-plan tolerance record vs the
// newest tolerance record that predates the plan. Nothing is fabricated — if
// the mapping is ambiguous the view is omitted (null).

import type { CalculationRecord } from '../persistence/calculation-record.ts';
import type { RecommendedRangeDays } from '../../domain/schemas/result.ts';
import type { Instant } from '../../domain/schemas/time.ts';

export interface ReductionTrajectoryView {
  readonly baselineUseDays: number;
  readonly baselineTargetDays: number;
  readonly baselineRange: RecommendedRangeDays;
  readonly currentUseDays: number;
  readonly currentTargetDays: number;
  readonly currentRange: RecommendedRangeDays;
  /** False when the newest record keeps the older planning band and target. */
  readonly moved: boolean;
}

interface ToleranceNumbers {
  readonly useDays: number | null;
  readonly targetDays: number;
  readonly range: RecommendedRangeDays;
}

function toleranceNumbersOf(record: CalculationRecord): ToleranceNumbers | null {
  if (record.result.type !== 'tolerance') return null;
  const result = record.result.value;
  if (result.kind !== 'tolerance_result') return null;
  if (result.recommendedRangeDays === null || result.preferredTargetDays === null) return null;
  if (record.snapshot.kind !== 'use_profile') return null;
  const useDays = record.snapshot.profile.thcUseDaysLast30?.value ?? null;
  return {
    useDays,
    targetDays: result.preferredTargetDays,
    range: result.recommendedRangeDays,
  };
}

function sameBand(a: RecommendedRangeDays, b: RecommendedRangeDays): boolean {
  return a.min === b.min && a.max === b.max;
}

/**
 * Trajectory from frozen calculation records (newest first) versus the live
 * reduction plan start. Returns null unless:
 *   - the newest record is a tolerance result created after the plan started,
 *   - an older tolerance record created at/before the plan start exists
 *     (full coverage at recalc time), and
 *   - both records carry complete numbers (use days included).
 */
export function reductionTrajectory(
  records: readonly CalculationRecord[],
  planStartedAt: Instant,
): ReductionTrajectoryView | null {
  const newest = records[0];
  if (newest === undefined) return null;
  const current = toleranceNumbersOf(newest);
  if (current === null || current.useDays === null) return null;
  if (newest.calculatedAt <= planStartedAt) return null;
  for (const record of records.slice(1)) {
    if (record.calculatedAt > planStartedAt) continue;
    const baseline = toleranceNumbersOf(record);
    if (baseline === null || baseline.useDays === null) continue;
    return {
      baselineUseDays: baseline.useDays,
      baselineTargetDays: baseline.targetDays,
      baselineRange: baseline.range,
      currentUseDays: current.useDays,
      currentTargetDays: current.targetDays,
      currentRange: current.range,
      moved: !(sameBand(baseline.range, current.range) && baseline.targetDays === current.targetDays),
    };
  }
  return null;
}
