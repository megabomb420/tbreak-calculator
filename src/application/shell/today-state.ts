// `Today` state router (UX_SPEC 3.2).
//
// Resolves exactly one primary `Today` state from stored facts using the
// documented precedence (interrupted > active-break > completed-break until
// acknowledged > abstinence-tracking > profile-no-break > no-profile >
// first-launch), applies the detection-only clause, and computes the resume
// card placement:
// - with a live break or tracking state (active or interrupted) the state
//   card stays primary and the resume card is secondary;
// - otherwise the resume card replaces the primary state card.
// A paused open-ended tracking record is treated exactly like an interrupted
// break: timing is suspended and `interrupted` owns Today until confirmed.
// Pure and deterministic: the persistence layer supplies the facts; this
// module never reads storage or a clock.

import type { BreakAttemptStatus } from '../../domain/breaks/break-attempt.ts';
import type { AbstinenceTrackStatus } from '../../domain/breaks/abstinence-track.ts';
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

export interface TrackingSummary {
  readonly status: AbstinenceTrackStatus;
}

/** Stored facts the `Today` router needs. Supplied by the persistence layer. */
export interface TodayFacts {
  /** True when anything besides the transient draft is stored on device. */
  readonly hasAnyData: boolean;
  /** The current break attempt summary (any status that can own or shade
   * Today), or null. Planned/ended/acknowledged attempts are passed through
   * for the UI but do not own Today. */
  readonly attempt: BreakAttemptSummary | null;
  /** The current open-ended tracking summary, or null. */
  readonly tracking: TrackingSummary | null;
  /** True when a completed tolerance/reduction/planning calculation is saved. */
  readonly hasProfile: boolean;
  /** True when the only stored results are detection results. Mutually
   * exclusive with hasProfile by construction in the persistence layer. */
  readonly detectionOnly: boolean;
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
    tracking: null,
    hasProfile: false,
    detectionOnly: false,
    draft: null,
  };
}

/** Resolves the primary `Today` state (UX_SPEC 3.2 precedence). */
export function resolveTodayPrimaryState(facts: TodayFacts): TodayPrimaryState {
  const { attempt, tracking } = facts;
  if (attempt !== null) {
    if (attempt.status === 'interrupted_time_needed') return 'interrupted';
    if (attempt.status === 'active') return 'active-break';
    if (attempt.status === 'completed') return 'completed-break';
    // planned / ended attempts do not own Today.
  }
  if (tracking !== null) {
    if (tracking.status === 'interrupted_time_needed') return 'interrupted';
    if (tracking.status === 'tracking') return 'abstinence-tracking';
    // ended tracking does not own Today.
  }
  if (facts.hasProfile) return 'profile-no-break';
  if (facts.detectionOnly) return 'detection-only';
  // First launch means no data at all; a persisted draft is data (resume card).
  return facts.hasAnyData || facts.draft !== null ? 'no-profile' : 'first-launch';
}

/** True when the state card is a live timing state that keeps the resume card
 * secondary (UX_SPEC 3.2). Tracking counts: pausing a check-in on an
 * open-ended timeline would hide a live counter otherwise. */
export function liveTimingState(facts: TodayFacts): boolean {
  const { attempt, tracking } = facts;
  if (attempt !== null) {
    if (attempt.status === 'active' || attempt.status === 'interrupted_time_needed') return true;
  }
  if (tracking !== null) {
    if (tracking.status === 'tracking' || tracking.status === 'interrupted_time_needed') return true;
  }
  return false;
}

/** Resume-card placement (UX_SPEC 3.2). A completed-unacknowledged card is a
 * Today gate (UX_SPEC 10.4) and must stay primary even with a draft — hiding
 * it behind resume makes acknowledgement unreachable. */
export function resolveResumePlacement(facts: TodayFacts): ResumePlacement {
  if (facts.draft === null) return 'none';
  if (liveTimingState(facts)) return 'secondary';
  if (facts.attempt?.status === 'completed') return 'secondary';
  return 'replaces-primary';
}

export function resolveTodayState(facts: TodayFacts): TodayView {
  return { primary: resolveTodayPrimaryState(facts), resume: resolveResumePlacement(facts) };
}
