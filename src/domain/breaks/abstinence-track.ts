// Open-ended abstinence tracking state machine (UX_SPEC sections 9.8, 15.2 D4).
//
// Abstinence is not a finite break: it has no `targetDurationDays`, no
// completion milestone, and no planned target date. It is therefore a
// distinct record type, never a `BreakAttempt` with a fake finite target.
// The interruption mechanics mirror the break machine (CALCULATOR_SPEC 7.9)
// minus any target-date recomputation: a reported use suspends timing until
// its instant is confirmed, then closes the open segment at that instant and
// opens a new one — a restart, never a claim that biological recovery
// returned to zero. Earlier segments stay in the record for history.

import type { Instant } from '../schemas/time.ts';
import type { BreakSegment } from './break-attempt.ts';

export type AbstinenceTrackStatus = 'tracking' | 'interrupted_time_needed' | 'ended';

export interface AbstinenceTrack {
  readonly id: string;
  /** The profile/result the tracking started from, when one exists. */
  readonly calculationRecordId: string | null;
  readonly status: AbstinenceTrackStatus;
  /** Instant the user started (or restarted) tracking. */
  readonly startedAt: Instant;
  /** Open-ended abstinence segments, anchored to the authoritative last use. */
  readonly segments: readonly BreakSegment[];
}

export interface NewAbstinenceTrackInput {
  readonly id: string;
  readonly calculationRecordId: string | null;
  readonly startedAt: Instant;
  /** Authoritative last-use instant the first open segment anchors to. */
  readonly anchor: Instant;
}

export type TrackTransitionErrorCode =
  | 'expected_tracking'
  | 'expected_interrupted_time_needed'
  | 'used_at_before_segment_start'
  | 'end_before_segment_start';

export type TrackTransitionResult =
  | { readonly ok: true; readonly track: AbstinenceTrack }
  | { readonly ok: false; readonly code: TrackTransitionErrorCode };

/** Creates tracking already in progress: the first open segment anchors at
 * the authoritative last-use instant ("Day N since your last use"). */
export function createAbstinenceTrack(input: NewAbstinenceTrackInput): AbstinenceTrack {
  return {
    id: input.id,
    calculationRecordId: input.calculationRecordId,
    status: 'tracking',
    startedAt: input.startedAt,
    segments: [{ startedFromLastUseAt: input.anchor, endedAt: null, endReason: null }],
  };
}

/** Suspends timing when a use is reported but its instant is not yet
 * confirmed: tracking -> interrupted_time_needed (spec 7.9.1-2). */
export function interruptAbstinenceTrack(track: AbstinenceTrack): TrackTransitionResult {
  if (track.status !== 'tracking') return { ok: false, code: 'expected_tracking' };
  return { ok: true, track: { ...track, status: 'interrupted_time_needed' } };
}

/** Confirms the reported use instant and restarts the timeline from it: the
 * open segment closes at usedAt and a new one begins. No target exists, so
 * nothing is re-anchored to a target date. */
export function confirmAbstinenceUse(track: AbstinenceTrack, usedAt: Instant): TrackTransitionResult {
  if (track.status !== 'interrupted_time_needed') {
    return { ok: false, code: 'expected_interrupted_time_needed' };
  }
  const openSegment = track.segments[track.segments.length - 1];
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
    track: {
      ...track,
      status: 'tracking',
      segments: [...track.segments.slice(0, -1), closedSegment, newSegment],
    },
  };
}

/** Stops tracking at the user's choice — a neutral end, no failure framing.
 * Allowed while tracking or paused; the open segment closes as user_ended. */
export function stopAbstinenceTrack(track: AbstinenceTrack, endedAt: Instant): TrackTransitionResult {
  if (track.status === 'ended') return { ok: false, code: 'expected_tracking' };
  const openSegment = track.segments[track.segments.length - 1];
  if (openSegment === undefined || openSegment.endedAt !== null) {
    return { ok: false, code: 'expected_tracking' };
  }
  if (endedAt < openSegment.startedFromLastUseAt) {
    return { ok: false, code: 'end_before_segment_start' };
  }
  const closedSegment: BreakSegment = { ...openSegment, endedAt, endReason: 'user_ended' };
  return {
    ok: true,
    track: { ...track, status: 'ended', segments: [...track.segments.slice(0, -1), closedSegment] },
  };
}
