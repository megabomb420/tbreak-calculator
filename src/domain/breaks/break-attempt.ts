// Break attempt state machine (ARCHITECTURE section 8, CALCULATOR_SPEC 7.9).
//
// Pure and deterministic state transitions for a break attempt. When a
// check-in records THC use the attempt suspends timing until the used-at
// instant is confirmed, then restarts the plan timeline from that confirmed
// instant: the previous segment closes at usedAt and a new segment begins.
// Earlier segments and the unchanged target duration stay in history — a plan
// restart, never a claim that biological recovery returned to zero.

import type { PostBreakMode } from '../schemas/enums.ts';
import { MILLIS_PER_DAY, toInstant, type Instant } from '../schemas/time.ts';

export type BreakAttemptStatus = 'planned' | 'active' | 'interrupted_time_needed' | 'completed' | 'ended';

export type BreakSegmentEndReason = 'used_thc' | 'completed' | 'user_ended';

export interface BreakSegment {
  /** Authoritative last-use instant this abstinence run is anchored to. */
  readonly startedFromLastUseAt: Instant;
  readonly endedAt: Instant | null;
  readonly endReason: BreakSegmentEndReason | null;
}

export interface BreakAttempt {
  readonly id: string;
  readonly status: BreakAttemptStatus;
  readonly calculationRecordId: string;
  /** Fixed by the Tolerance Engine result; unchanged by an interruption. */
  readonly targetDurationDays: number;
  readonly postBreakMode: PostBreakMode | null;
  readonly startedAt: Instant;
  readonly segments: readonly BreakSegment[];
}

export interface NewBreakAttemptInput {
  readonly id: string;
  readonly calculationRecordId: string;
  readonly targetDurationDays: number;
  readonly postBreakMode: PostBreakMode | null;
  readonly startedAt: Instant;
}

export type BreakTransitionErrorCode =
  | 'expected_planned'
  | 'expected_active'
  | 'expected_interrupted_time_needed'
  | 'used_at_before_segment_start'
  | 'end_before_segment_start';

export type BreakTransitionResult =
  | { readonly ok: true; readonly attempt: BreakAttempt }
  | { readonly ok: false; readonly code: BreakTransitionErrorCode };

/** Creates a break attempt in the planned state with no segments yet. */
export function createBreakAttempt(input: NewBreakAttemptInput): BreakAttempt {
  return {
    id: input.id,
    status: 'planned',
    calculationRecordId: input.calculationRecordId,
    targetDurationDays: input.targetDurationDays,
    postBreakMode: input.postBreakMode,
    startedAt: input.startedAt,
    segments: [],
  };
}

/** Starts the plan: planned -> active, opening the first abstinence segment
 * anchored at the authoritative last-use instant. */
export function startBreak(attempt: BreakAttempt, lastUseAt: Instant): BreakTransitionResult {
  if (attempt.status !== 'planned') return { ok: false, code: 'expected_planned' };
  return {
    ok: true,
    attempt: {
      ...attempt,
      status: 'active',
      segments: [...attempt.segments, { startedFromLastUseAt: lastUseAt, endedAt: null, endReason: null }],
    },
  };
}

/** Suspends timing when a use is reported but its instant is not yet
 * confirmed: active -> interrupted_time_needed. The open segment is left
 * untouched until confirmation (spec 7.9.1-2). */
export function interruptForUsedAtConfirmation(attempt: BreakAttempt): BreakTransitionResult {
  if (attempt.status !== 'active') return { ok: false, code: 'expected_active' };
  return { ok: true, attempt: { ...attempt, status: 'interrupted_time_needed' } };
}

/** Confirms the reported use instant and restarts the plan timeline from it
 * (spec 7.9.3-6): the open segment closes at usedAt and a new segment begins
 * at usedAt; the target duration is unchanged. */
export function confirmUsedAtAndRestart(attempt: BreakAttempt, usedAt: Instant): BreakTransitionResult {
  if (attempt.status !== 'interrupted_time_needed') return { ok: false, code: 'expected_interrupted_time_needed' };
  const openSegment = attempt.segments[attempt.segments.length - 1];
  if (openSegment === undefined || openSegment.endedAt !== null) {
    return { ok: false, code: 'expected_interrupted_time_needed' };
  }
  if (usedAt < openSegment.startedFromLastUseAt) {
    return { ok: false, code: 'used_at_before_segment_start' };
  }
  const closedSegment: BreakSegment = { ...openSegment, endedAt: usedAt, endReason: 'used_thc' };
  const newSegment: BreakSegment = { startedFromLastUseAt: usedAt, endedAt: null, endReason: null };
  return {
    ok: true,
    attempt: {
      ...attempt,
      status: 'active',
      segments: [...attempt.segments.slice(0, -1), closedSegment, newSegment],
    },
  };
}

/** Marks the attempt completed, closing the open segment at `endedAt`. */
export function completeBreak(attempt: BreakAttempt, endedAt: Instant): BreakTransitionResult {
  if (attempt.status !== 'active') return { ok: false, code: 'expected_active' };
  return closeOpenSegment(attempt, 'completed', endedAt);
}

/** Ends the attempt early at the user's choice, closing the open segment. */
export function endBreak(attempt: BreakAttempt, endedAt: Instant): BreakTransitionResult {
  if (attempt.status !== 'active') return { ok: false, code: 'expected_active' };
  return closeOpenSegment(attempt, 'user_ended', endedAt);
}

/** The plan target calendar date: the abstinence anchor plus the fixed
 * target duration in exact 24-hour periods. Recompute from the new anchor
 * after an interruption; the duration never changes. */
export function plannedTargetDate(lastUseAt: Instant, targetDurationDays: number): Instant {
  return toInstant(lastUseAt + targetDurationDays * MILLIS_PER_DAY);
}

function closeOpenSegment(
  attempt: BreakAttempt,
  endReason: BreakSegmentEndReason,
  endedAt: Instant,
): BreakTransitionResult {
  const openSegment = attempt.segments[attempt.segments.length - 1];
  if (openSegment === undefined || openSegment.endedAt !== null) {
    return { ok: false, code: 'expected_active' };
  }
  if (endedAt < openSegment.startedFromLastUseAt) {
    return { ok: false, code: 'end_before_segment_start' };
  }
  const closedSegment: BreakSegment = { ...openSegment, endedAt, endReason };
  const status: BreakAttemptStatus = endReason === 'completed' ? 'completed' : 'ended';
  return {
    ok: true,
    attempt: {
      ...attempt,
      status,
      segments: [...attempt.segments.slice(0, -1), closedSegment],
    },
  };
}
