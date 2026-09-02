// Break-session operations (step-4 break loop application services).
//
// Pure, clock-injected orchestration over the domain machines and the
// versioned record stores: creating/activating break plans, open-ended
// tracking, check-in recording, interruption confirmation, completion/early
// end, and post-break plan updates. Nothing here reads storage or a clock;
// callers pass explicit instants and persist the returned state.

import type { Instant } from '../../domain/schemas/time.ts';
import type { PostBreakMode } from '../../domain/schemas/enums.ts';
import {
  completeBreak,
  confirmUsedAtAndRestart,
  createBreakAttempt,
  endBreak,
  interruptForUsedAtConfirmation,
  plannedTargetDate,
  startBreak,
  type BreakAttempt,
} from '../../domain/breaks/break-attempt.ts';
import {
  confirmAbstinenceUse,
  createAbstinenceTrack,
  interruptAbstinenceTrack,
  stopAbstinenceTrack,
  type AbstinenceTrack,
} from '../../domain/breaks/abstinence-track.ts';
import type { DailyCheckin } from '../../domain/schemas/profile.ts';
import type { StoredAttempt } from '../progress/break-attempt-record.ts';
import type { StoredTrack } from '../progress/tracking-record.ts';
import { defaultPostBreakPlan, type PostBreakPlan } from './post-break-plan.ts';

export interface BreakSessionState {
  /** Stored finite-break attempts, newest first. */
  readonly attempts: readonly StoredAttempt[];
  /** Stored open-ended tracking records, newest first. */
  readonly tracking: readonly StoredTrack[];
  /** Check-ins, chronological. */
  readonly checkins: readonly DailyCheckin[];
}

export type SessionOutcome<S> = { readonly ok: true; readonly state: BreakSessionState } | { readonly ok: false; readonly code: S };

export type SessionErrorCode =
  | 'attempt_not_found'
  | 'tracking_not_found'
  | 'expected_planned'
  | 'expected_active'
  | 'expected_interrupted_time_needed'
  | 'expected_tracking'
  | 'used_at_before_segment_start'
  | 'used_at_in_the_future'
  | 'end_before_segment_start'
  | 'not_at_target_date'
  | 'not_editable';

export function emptySessionState(): BreakSessionState {
  return { attempts: [], tracking: [], checkins: [] };
}

export interface NewBreakPlanInput {
  readonly id: string;
  /** Reference to the questionnaire snapshot run this plan started from. */
  readonly calculationRecordId: string;
  readonly targetDurationDays: number;
  readonly mode: PostBreakMode;
  /** The chosen plan start instant (now for an immediate start). */
  readonly planStart: Instant;
  readonly now: Instant;
  /** Authoritative last-use anchor; required to open the first segment. */
  readonly anchor: Instant | null;
}

export interface NewTrackingInput {
  readonly id: string;
  readonly calculationRecordId: string | null;
  readonly startedAt: Instant;
  readonly anchor: Instant;
}

export interface CheckinSymptoms {
  readonly craving: number | null;
  readonly sleep: number | null;
  readonly irritability: number | null;
  readonly anxiety: number | null;
  readonly appetite: number | null;
}

const NO_SYMPTOMS: CheckinSymptoms = { craving: null, sleep: null, irritability: null, anxiety: null, appetite: null };

/** Creates a finite break plan: an `active` attempt when the plan starts at
 * or before now, otherwise a `planned` attempt that activates later. A second
 * live plan or tracking run is refused — the spec leaves overlapping live
 * timelines undefined. */
export function createBreakPlan(state: BreakSessionState, input: NewBreakPlanInput): BreakSessionState {
  if (hasLiveTimeline(state)) return state;
  const attempt = createBreakAttempt({
    id: input.id,
    calculationRecordId: input.calculationRecordId,
    targetDurationDays: input.targetDurationDays,
    postBreakMode: input.mode,
    startedAt: input.planStart,
  });
  let started: BreakAttempt | null = null;
  if (input.planStart <= input.now && input.anchor !== null) {
    const result = startBreak(attempt, input.anchor);
    if (result.ok) started = result.attempt;
  }
  const stored: StoredAttempt = {
    ...(started ?? attempt),
    postBreakPlan: defaultPostBreakPlan(input.mode),
    completionAcknowledged: false,
    createdAt: input.now,
    updatedAt: input.now,
  };
  return { ...state, attempts: [stored, ...state.attempts] };
}

/** Starts an open-ended tracking run anchored at the authoritative last use. */
export function createTracking(state: BreakSessionState, input: NewTrackingInput): BreakSessionState {
  if (hasLiveTimeline(state)) return state;
  const track: StoredTrack = {
    ...createAbstinenceTrack({
      id: input.id,
      calculationRecordId: input.calculationRecordId,
      startedAt: input.startedAt,
      anchor: input.anchor,
    }),
    createdAt: input.startedAt,
    updatedAt: input.startedAt,
  };
  return { ...state, tracking: [track, ...state.tracking] };
}

/** Activates the current planned attempt once its start has arrived,
 * anchoring its first segment at the authoritative last use supplied by the
 * caller. Extra planned rows (injected impossible global state) stay planned
 * so Today never sprouts a second live timeline. */
export function activateDuePlans(
  state: BreakSessionState,
  anchorFor: (attempt: StoredAttempt) => Instant | null,
  now: Instant,
): BreakSessionState {
  const live = currentLiveAttempt(state.attempts);
  if (live === null || live.status !== 'planned' || live.startedAt > now) return state;
  const anchor = anchorFor(live);
  if (anchor === null) return state;
  const result = startBreak(live, anchor);
  if (!result.ok) return state;
  const index = state.attempts.findIndex((attempt) => attempt.id === live.id);
  if (index < 0) return state;
  return replaceAttempt(state, index, withStoredAttempt(live, result.attempt, now));
}

/** Suspends a finite break when a use is reported but its instant is not yet
 * confirmed: active -> interrupted_time_needed. */
export function suspendBreak(state: BreakSessionState, id: string, now: Instant): SessionOutcome<SessionErrorCode> {
  const index = state.attempts.findIndex((attempt) => attempt.id === id);
  if (index < 0) return { ok: false, code: 'attempt_not_found' };
  const stored = state.attempts[index]!;
  if (stored.status !== 'active') return { ok: false, code: 'expected_active' };
  const result = interruptForUsedAtConfirmation(stored);
  if (!result.ok) return { ok: false, code: 'expected_active' };
  return { ok: true, state: replaceAttempt(state, index, withStoredAttempt(stored, result.attempt, now)) };
}

/** Suspends open-ended tracking: tracking -> interrupted_time_needed. */
export function suspendTracking(state: BreakSessionState, id: string, now: Instant): SessionOutcome<SessionErrorCode> {
  const index = state.tracking.findIndex((track) => track.id === id);
  if (index < 0) return { ok: false, code: 'tracking_not_found' };
  const stored = state.tracking[index]!;
  if (stored.status !== 'tracking') return { ok: false, code: 'expected_tracking' };
  const result = interruptAbstinenceTrack(stored);
  if (!result.ok) return { ok: false, code: 'expected_tracking' };
  return { ok: true, state: replaceTrack(state, index, withStoredTrack(stored, result.track, now)) };
}

export interface ConfirmUseInput {
  readonly id: string;
  readonly usedAt: Instant;
  /** The submitted used-at ISO string persisted on the check-in and the
   * authoritative profile anchor. */
  readonly usedAtIso: string;
  readonly now: Instant;
}

/** Confirms a reported finite-break use and restarts the plan from it,
 * recording the use-day check-in. */
export function confirmBreakUse(state: BreakSessionState, input: ConfirmUseInput): SessionOutcome<SessionErrorCode> {
  if (input.usedAt > input.now) return { ok: false, code: 'used_at_in_the_future' };
  const index = state.attempts.findIndex((attempt) => attempt.id === input.id);
  if (index < 0) return { ok: false, code: 'attempt_not_found' };
  const stored = state.attempts[index]!;
  if (stored.status !== 'interrupted_time_needed') return { ok: false, code: 'expected_interrupted_time_needed' };
  const result = confirmUsedAtAndRestart(stored, input.usedAt);
  if (!result.ok) {
    return { ok: false, code: result.code === 'used_at_before_segment_start' ? 'used_at_before_segment_start' : 'expected_interrupted_time_needed' };
  }
  const withUse = appendCheckin(state, useCheckin(input));
  return {
    ok: true,
    state: replaceAttempt(withUse, index, withStoredAttempt(stored, result.attempt, input.now)),
  };
}

/** Confirms a reported use on open-ended tracking and restarts the timeline
 * from it (no target exists, so nothing re-anchors to a target date). */
export function confirmTrackingUse(state: BreakSessionState, input: ConfirmUseInput): SessionOutcome<SessionErrorCode> {
  if (input.usedAt > input.now) return { ok: false, code: 'used_at_in_the_future' };
  const index = state.tracking.findIndex((track) => track.id === input.id);
  if (index < 0) return { ok: false, code: 'tracking_not_found' };
  const stored = state.tracking[index]!;
  if (stored.status !== 'interrupted_time_needed') return { ok: false, code: 'expected_interrupted_time_needed' };
  const result = confirmAbstinenceUse(stored, input.usedAt);
  if (!result.ok) {
    return { ok: false, code: result.code === 'used_at_before_segment_start' ? 'used_at_before_segment_start' : 'expected_interrupted_time_needed' };
  }
  const withUse = appendCheckin(state, useCheckin(input));
  return {
    ok: true,
    state: replaceTrack(withUse, index, withStoredTrack(stored, result.track, input.now)),
  };
}

/** Fast daily path: saves a no-use check-in immediately. */
export function recordNoUseCheckin(state: BreakSessionState, now: Instant): BreakSessionState {
  return appendCheckin(state, {
    recordedAt: isoNow(now),
    ...NO_SYMPTOMS,
    usedThc: false,
    usedAt: null,
    note: null,
  });
}

/** Optional-symptom path: no-use check-in with the touched symptom ratings
 * (untouched fields stay null) and an optional note. */
export function recordSymptomCheckin(
  state: BreakSessionState,
  input: { readonly now: Instant; readonly symptoms: CheckinSymptoms; readonly note: string | null },
): BreakSessionState {
  return appendCheckin(state, {
    recordedAt: isoNow(input.now),
    ...input.symptoms,
    usedThc: false,
    usedAt: null,
    note: input.note,
  });
}

/** Marks an active finite break complete (never automatic — explicit user
 * action once the plan target has been reached). */
export function completeBreakPlan(state: BreakSessionState, id: string, endedAt: Instant, now: Instant): SessionOutcome<SessionErrorCode> {
  return closeActiveBreak(state, id, endedAt, now, 'complete');
}

/** Ends an active finite break early at the user's choice. */
export function endBreakEarly(state: BreakSessionState, id: string, endedAt: Instant, now: Instant): SessionOutcome<SessionErrorCode> {
  return closeActiveBreak(state, id, endedAt, now, 'end');
}

/** Acknowledges a completed break's completion card once; the attempt stays
 * stored with its segments for history. */
export function acknowledgeCompletedBreak(state: BreakSessionState, id: string, now: Instant): SessionOutcome<SessionErrorCode> {
  const index = state.attempts.findIndex((attempt) => attempt.id === id);
  if (index < 0) return { ok: false, code: 'attempt_not_found' };
  const stored = state.attempts[index]!;
  if (stored.status !== 'completed') return { ok: false, code: 'expected_active' };
  const next: StoredAttempt = { ...stored, completionAcknowledged: true, updatedAt: now };
  return { ok: true, state: replaceAttempt(state, index, next) };
}

/** Stops open-ended tracking — a neutral end, no failure framing. */
export function stopTracking(state: BreakSessionState, id: string, endedAt: Instant, now: Instant): SessionOutcome<SessionErrorCode> {
  const index = state.tracking.findIndex((track) => track.id === id);
  if (index < 0) return { ok: false, code: 'tracking_not_found' };
  const stored = state.tracking[index]!;
  if (stored.status === 'ended') return { ok: false, code: 'expected_tracking' };
  const result = stopAbstinenceTrack(stored, endedAt);
  if (!result.ok) {
    return { ok: false, code: result.code === 'end_before_segment_start' ? 'end_before_segment_start' : 'expected_tracking' };
  }
  return { ok: true, state: replaceTrack(state, index, withStoredTrack(stored, result.track, now)) };
}

/** Updates the post-break mode and its user-defined limits from plan detail.
 * Editable while the plan is planned or active. */
export function updatePostBreakPlan(
  state: BreakSessionState,
  id: string,
  input: { readonly mode: PostBreakMode; readonly plan: PostBreakPlan; readonly now: Instant },
): SessionOutcome<SessionErrorCode> {
  const index = state.attempts.findIndex((attempt) => attempt.id === id);
  if (index < 0) return { ok: false, code: 'attempt_not_found' };
  const stored = state.attempts[index]!;
  if (stored.status !== 'planned' && stored.status !== 'active') return { ok: false, code: 'not_editable' };
  const next: StoredAttempt = {
    ...stored,
    postBreakMode: input.mode,
    postBreakPlan: input.plan,
    updatedAt: input.now,
  };
  return { ok: true, state: replaceAttempt(state, index, next) };
}

/** Removes a planned (future) attempt that has not started yet. */
export function cancelPlannedBreak(state: BreakSessionState, id: string): SessionOutcome<SessionErrorCode> {
  const index = state.attempts.findIndex((attempt) => attempt.id === id);
  if (index < 0) return { ok: false, code: 'attempt_not_found' };
  const stored = state.attempts[index]!;
  if (stored.status !== 'planned' || stored.segments.length > 0) return { ok: false, code: 'expected_planned' };
  return { ok: true, state: { ...state, attempts: state.attempts.filter((attempt) => attempt.id !== id) } };
}

// --- selectors --------------------------------------------------------------

/** The current attempt that can own or shade Today, or null.
 * Status precedence matches the Today router (interrupted > active >
 * completed-unack > planned) so array order cannot hide a live clock. Within
 * a status, newest-first order still wins. */
export function currentLiveAttempt(attempts: readonly StoredAttempt[]): StoredAttempt | null {
  return (
    firstWith(attempts, (stored) => stored.status === 'interrupted_time_needed') ??
    firstWith(attempts, (stored) => stored.status === 'active') ??
    firstWith(attempts, (stored) => stored.status === 'completed' && !stored.completionAcknowledged) ??
    firstWith(attempts, (stored) => stored.status === 'planned')
  );
}

/** The current open-ended tracking record, or null. Interrupted wins over
 * tracking so a paused clock cannot be hidden by a newer injected row. */
export function currentLiveTracking(records: readonly StoredTrack[]): StoredTrack | null {
  return (
    firstWith(records, (track) => track.status === 'interrupted_time_needed') ??
    firstWith(records, (track) => track.status === 'tracking')
  );
}

/** The most recent planned attempt that has not started, if any. */
export function currentScheduledPlan(attempts: readonly StoredAttempt[]): StoredAttempt | null {
  for (const stored of attempts) {
    if (stored.status === 'planned') return stored;
  }
  return null;
}

// --- internals --------------------------------------------------------------

function closeActiveBreak(
  state: BreakSessionState,
  id: string,
  endedAt: Instant,
  now: Instant,
  kind: 'complete' | 'end',
): SessionOutcome<SessionErrorCode> {
  const index = state.attempts.findIndex((attempt) => attempt.id === id);
  if (index < 0) return { ok: false, code: 'attempt_not_found' };
  const stored = state.attempts[index]!;
  if (stored.status !== 'active') return { ok: false, code: 'expected_active' };
  if (kind === 'complete') {
    const openSegment = stored.segments[stored.segments.length - 1];
    if (openSegment === undefined || openSegment.endedAt !== null) return { ok: false, code: 'expected_active' };
    if (endedAt < plannedTargetDate(openSegment.startedFromLastUseAt, stored.targetDurationDays)) {
      return { ok: false, code: 'not_at_target_date' };
    }
  }
  const result = kind === 'complete' ? completeBreak(stored, endedAt) : endBreak(stored, endedAt);
  if (!result.ok) {
    return { ok: false, code: result.code === 'end_before_segment_start' ? 'end_before_segment_start' : 'expected_active' };
  }
  return { ok: true, state: replaceAttempt(state, index, withStoredAttempt(stored, result.attempt, now)) };
}

function appendCheckin(state: BreakSessionState, checkin: DailyCheckin): BreakSessionState {
  return { ...state, checkins: [...state.checkins, checkin] };
}

function useCheckin(input: ConfirmUseInput): DailyCheckin {
  return {
    recordedAt: isoNow(input.now),
    ...NO_SYMPTOMS,
    usedThc: true,
    usedAt: { value: input.usedAtIso, provenance: 'user_estimate' },
    note: null,
  };
}

function replaceAttempt(state: BreakSessionState, index: number, next: StoredAttempt): BreakSessionState {
  const attempts = [...state.attempts];
  attempts[index] = next;
  return { ...state, attempts };
}

function replaceTrack(state: BreakSessionState, index: number, next: StoredTrack): BreakSessionState {
  const tracking = [...state.tracking];
  tracking[index] = next;
  return { ...state, tracking };
}

function withStoredAttempt(previous: StoredAttempt, attempt: BreakAttempt, now: Instant): StoredAttempt {
  return { ...previous, ...attempt, updatedAt: now };
}

function withStoredTrack(previous: StoredTrack, track: AbstinenceTrack, now: Instant): StoredTrack {
  return { ...previous, ...track, updatedAt: now };
}

function isoNow(now: Instant): string {
  return new Date(now).toISOString();
}

function firstWith<T>(rows: readonly T[], match: (row: T) => boolean): T | null {
  for (const row of rows) {
    if (match(row)) return row;
  }
  return null;
}

/** True when Today already has a live plan or tracking run. */
function hasLiveTimeline(state: BreakSessionState): boolean {
  return currentLiveAttempt(state.attempts) !== null || currentLiveTracking(state.tracking) !== null;
}
