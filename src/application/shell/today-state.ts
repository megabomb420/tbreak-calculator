// `Today` state router (UX_SPEC 3.2).
//
// Resolves exactly one primary `Today` state from stored facts using the
// documented precedence (interrupted > active-break > completed-break until
// acknowledged > abstinence-tracking > profile-no-break > no-profile >
// first-launch), applies the detection-only clause, and computes the resume
// card placement:
// - with an active or interrupted break the break state stays primary and
//   the resume card is secondary;
// - otherwise the resume card replaces the primary state card.
// Pure and deterministic: the persistence layer supplies the facts; this
// module never reads storage or a clock.

import type { BreakAttemptStatus } from '../../domain/breaks/break-attempt.ts';
import type { QuestionnaireProgressRecord } from '../progress/questionnaire-progress.ts';

export type TodayPrimaryState =
  | 'first-launch'
  | 'no-profile'
  | 'profile-no-break'
  | 'active-break'
  | 'interrupted'
  | 'completed-break'
  | 'abstinence-tracking'
  | 'detection-only';

export type ResumePlacement = 'none' | 'secondary' | 'replaces-primary';

export interface BreakAttemptSummary {
  readonly status: BreakAttemptStatus;
}

/** Stored facts the `Today` router needs. Supplied by the persistence layer. */
export interface TodayFacts {
  /** True when anything besides the transient draft is stored on device. */
  readonly hasAnyData: boolean;
  /** The current break attempt summary (any status), or null. */
  readonly attempt: BreakAttemptSummary | null;
  /** True when a completed tolerance/reduction calculation is saved. */
  readonly hasProfile: boolean;
  /** True when an open-ended abstinence tracking record is active (no break attempt). */
  readonly abstinenceTracking: boolean;
  /** True when the only stored results are detection results. Mutually
   * exclusive with hasProfile and abstinenceTracking by construction in the
   * persistence layer. */
  readonly detectionOnly: boolean;
  /** True once a completed break's completion card has been acknowledged. */
  readonly completedBreakAcknowledged: boolean;
  /** Persisted unfinished questionnaire progress, or null. */
  readonly draft: QuestionnaireProgressRecord | null;
}

export interface TodayView {
  readonly primary: TodayPrimaryState;
  readonly resume: ResumePlacement;
}

export function emptyTodayFacts(): TodayFacts {
  return {
    hasAnyData: false,
    attempt: null,
    hasProfile: false,
    abstinenceTracking: false,
    detectionOnly: false,
    completedBreakAcknowledged: false,
    draft: null,
  };
}

/** Resolves the primary `Today` state (UX_SPEC 3.2 precedence). */
export function resolveTodayPrimaryState(facts: TodayFacts): TodayPrimaryState {
  const { attempt } = facts;
  if (attempt !== null) {
    if (attempt.status === 'interrupted_time_needed') return 'interrupted';
    if (attempt.status === 'active') return 'active-break';
    if (attempt.status === 'completed' && !facts.completedBreakAcknowledged) return 'completed-break';
    // planned / ended / acknowledged-completed attempts do not own Today.
  }
  if (facts.abstinenceTracking) return 'abstinence-tracking';
  if (facts.hasProfile) return 'profile-no-break';
  if (facts.detectionOnly) return 'detection-only';
  // First launch means no data at all; a persisted draft is data (resume card).
  return facts.hasAnyData || facts.draft !== null ? 'no-profile' : 'first-launch';
}

/** Resume-card placement (UX_SPEC 3.2). */
export function resolveResumePlacement(facts: TodayFacts): ResumePlacement {
  if (facts.draft === null) return 'none';
  const breakOwnsToday =
    facts.attempt !== null &&
    (facts.attempt.status === 'active' || facts.attempt.status === 'interrupted_time_needed');
  return breakOwnsToday ? 'secondary' : 'replaces-primary';
}

export function resolveTodayState(facts: TodayFacts): TodayView {
  return { primary: resolveTodayPrimaryState(facts), resume: resolveResumePlacement(facts) };
}
