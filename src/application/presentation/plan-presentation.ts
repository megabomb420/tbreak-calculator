// Deterministic plan presentation (UX_SPEC 10.1, 12.4).
//
// Day counts, target dates, completion eligibility, withdrawal positions and
// phase selection come from this module — never from component math. The plan
// ring/track represents plan time only (abstinence time from the authoritative
// anchor), never biological recovery.

import type { Instant } from '../../domain/schemas/time.ts';
import type { BreakAttempt } from '../../domain/breaks/break-attempt.ts';
import { plannedTargetDate } from '../../domain/breaks/break-attempt.ts';
import { abstinenceDayAt } from '../../domain/breaks/break-time.ts';
import type { AbstinenceTrack } from '../../domain/breaks/abstinence-track.ts';
import { computeWithdrawalDisplay } from '../../domain/tolerance/withdrawal.ts';
import { TOLERANCE_POLICY_V2 } from '../../domain/policies/tolerance-policy-v2.ts';
import { phaseFocusCopy, phaseKeyForDay, presentWithdrawal, type PlanPhaseKey } from './result-presentation.ts';
import type { WithdrawalView } from './result-presentation.ts';

export interface ActiveBreakView {
  readonly status: 'active';
  /** Abstinence day counted from the current segment anchor. */
  readonly day: number;
  readonly targetDays: number;
  readonly dayOfLabel: string;
  readonly targetDate: Instant;
  /** True when now is on/after the plan target date (completion eligible). */
  readonly atOrPastTargetDate: boolean;
  /** True when the abstinence day is past the finite planning target. */
  readonly pastTarget: boolean;
  readonly phase: PlanPhaseKey;
  readonly phaseCopy: string;
  readonly withdrawal: WithdrawalView | null;
}

export interface PlannedBreakView {
  readonly status: 'planned';
  readonly targetDays: number;
  readonly startDate: Instant;
  /** Target calendar date from the anchor, when the authoritative last use is
   * known; the day counter runs from the anchor whether or not the plan has
   * started (UX_SPEC 2). */
  readonly targetDate: Instant | null;
}

export interface TrackingDayView {
  readonly day: number;
  readonly phase: PlanPhaseKey;
  readonly phaseCopy: string;
}

/** The anchor of the current open segment (the authoritative last use). */
export function currentSegmentAnchor(segments: readonly { readonly startedFromLastUseAt: Instant }[]): Instant | null {
  const open = segments[segments.length - 1];
  return open === undefined ? null : open.startedFromLastUseAt;
}

/** Active finite-break presentation. Null while suspended/completed. */
export function activeBreakView(attempt: BreakAttempt, now: Instant): ActiveBreakView | null {
  if (attempt.status !== 'active') return null;
  const anchor = currentSegmentAnchor(attempt.segments);
  if (anchor === null) return null;
  const targetDate = plannedTargetDate(anchor, attempt.targetDurationDays);
  const day = abstinenceDayAt(now, anchor);
  return {
    status: 'active',
    day,
    targetDays: attempt.targetDurationDays,
    dayOfLabel: planDayOfLabel(day, attempt.targetDurationDays),
    targetDate,
    atOrPastTargetDate: now >= targetDate,
    pastTarget: day > attempt.targetDurationDays,
    phase: phaseKeyForDay(day),
    phaseCopy: phaseFocusCopy(day),
    withdrawal: presentWithdrawal(computeWithdrawalDisplay(anchor, now, TOLERANCE_POLICY_V2.withdrawalAnchors)),
  };
}

/** Scheduled (future-start) plan presentation. */
export function plannedBreakView(attempt: BreakAttempt, anchor: Instant | null): PlannedBreakView {
  return {
    status: 'planned',
    targetDays: attempt.targetDurationDays,
    startDate: attempt.startedAt,
    targetDate: anchor === null ? null : plannedTargetDate(anchor, attempt.targetDurationDays),
  };
}

/** Open-ended tracking day presentation (no target, no completion). */
export function trackingDayView(track: AbstinenceTrack, now: Instant): TrackingDayView | null {
  if (track.status !== 'tracking') return null;
  const anchor = currentSegmentAnchor(track.segments);
  if (anchor === null) return null;
  const day = abstinenceDayAt(now, anchor);
  return { day, phase: phaseKeyForDay(day), phaseCopy: phaseFocusCopy(day) };
}

/** User-facing day/target line. After the target the elapsed day is still
 * shown (the formula is unchanged) but it is not written as a broken fraction. */
export function planDayOfLabel(day: number, targetDays: number): string {
  if (day > targetDays) return `Day ${day} · ${targetDays}-day plan`;
  return `Day ${day} of ${targetDays}`;
}
