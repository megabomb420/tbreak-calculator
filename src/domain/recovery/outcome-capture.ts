// Post-break outcome capture eligibility (0.9.0).
//
// A finite break that COMPLETED may be rated 0-10 for tolerance reduction,
// but only after the user has actually returned to THC, and only when the
// completed break chose a return mode (occasional / reduced regular use).
// Users who chose continued abstinence are never asked. Exactly one mark per
// attempt (captured or skipped) stops the app from ever nagging twice.
// This module is deterministic and pure: it never reads a clock or storage;
// callers pass the stored attempts, the outcome marks and the return instant.

import type { BreakAttemptStatus } from '../breaks/break-attempt.ts';
import type { PostBreakMode } from '../schemas/enums.ts';
import type { Instant } from '../schemas/time.ts';

/** Minimal structural attempt shape this module needs; stored attempts
 * (which add plan-lifetime fields) satisfy it unchanged. */
export interface OutcomeCaptureAttempt {
  readonly id: string;
  readonly status: BreakAttemptStatus;
  readonly postBreakMode: PostBreakMode | null;
  readonly updatedAt: Instant;
  readonly segments: readonly {
    readonly startedFromLastUseAt: Instant;
    readonly endedAt: Instant | null;
  }[];
}

/** The only break modes that promise a return to THC afterwards. A completed
 * break that chose `continue_abstinence` (or never picked a mode) is never
 * offered the outcome question. */
export const POST_BREAK_RETURN_MODES: readonly PostBreakMode[] = [
  'occasional',
  'reduced_regular_use',
];

/** Anchor strings for the 0-10 outcome slider. Explicitly a magnitude label,
 * never a percentage-reset claim. */
export function scoreAnchors(): { readonly zero: string; readonly ten: string } {
  return {
    zero: '0 = no noticeable reduction',
    ten: '10 = very large reduction',
  };
}

/** Completion instant of a completed attempt: its final segment end, falling
 * back to the stored updatedAt when segments carry no end. */
export function completionInstantOf(attempt: OutcomeCaptureAttempt): Instant {
  const last = attempt.segments[attempt.segments.length - 1];
  if (last !== undefined && last.endedAt !== null) return last.endedAt;
  return attempt.updatedAt;
}

function hasReturnMode(attempt: OutcomeCaptureAttempt, modes: readonly PostBreakMode[]): boolean {
  return attempt.postBreakMode !== null && modes.includes(attempt.postBreakMode);
}

/**
 * Completed attempts that may be offered the outcome question: status
 * `completed`, a return post-break mode, and (when a return instant is given)
 * completed at or before that instant. Newest completion first.
 */
export function eligibleCompletedAttempts<T extends OutcomeCaptureAttempt>(
  attempts: readonly T[],
  completedBy?: Instant,
): readonly T[] {
  const matches = attempts.filter(
    (attempt) =>
      attempt.status === 'completed' &&
      hasReturnMode(attempt, POST_BREAK_RETURN_MODES) &&
      (completedBy === undefined || completionInstantOf(attempt) <= completedBy),
  );
  return [...matches].sort((a, b) => completionInstantOf(b) - completionInstantOf(a));
}

/** True when this attempt may be offered exactly once (eligible, and no mark
 * — captured or skipped — exists for it yet). */
export function canOfferOutcome(
  attempt: OutcomeCaptureAttempt,
  marks: readonly { readonly attemptId: string }[],
): boolean {
  if (marks.some((mark) => mark.attemptId === attempt.id)) return false;
  return eligibleCompletedAttempts([attempt]).length > 0;
}

/**
 * Newest eligible completed attempt that still has no outcome mark, or null.
 * Callers pass the stored attempts (newest-first is not assumed) plus the
 * outcome marks; `options.returnedAt` is the confirmed THC-use instant that
 * makes the return real.
 */
export function pendingOutcomeForReturn<T extends OutcomeCaptureAttempt>(
  attempts: readonly T[],
  marks: readonly { readonly attemptId: string }[],
  options: {
    readonly postBreakReturnModes?: readonly PostBreakMode[];
    readonly returnedAt?: Instant;
  } = {},
): T | null {
  const modes = options.postBreakReturnModes ?? POST_BREAK_RETURN_MODES;
  const scored = [...attempts]
    .filter(
      (attempt) =>
        attempt.status === 'completed' &&
        attempt.postBreakMode !== null &&
        modes.includes(attempt.postBreakMode) &&
        (options.returnedAt === undefined || completionInstantOf(attempt) <= options.returnedAt),
    )
    .sort((a, b) => completionInstantOf(b) - completionInstantOf(a));
  for (const attempt of scored) {
    if (!marks.some((mark) => mark.attemptId === attempt.id)) return attempt;
  }
  return null;
}
