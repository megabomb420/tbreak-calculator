// The delay timer as a pure model.
//
// Nothing here interprets a session: it computes how much of the chosen delay
// is left, whether it has run out, and how many sittings the person has behind
// them. A sitting is not evidence that a craving was defeated, and no function
// in this module turns a count into a claim about tolerance, withdrawal or
// control.

import type { Instant } from '../schemas/time.ts';
import type { UrgeOutcome, UrgeSession } from '../../application/progress/urge-session-record.ts';
import { URGE_STALE_AFTER_MS } from '../../application/progress/urge-session-record.ts';

const MINUTE_MS = 60_000;
const WEEK_MS = 7 * 24 * 3_600_000;

export function startUrgeSession(id: string, plannedMinutes: number, now: Instant): UrgeSession {
  return { id, startedAt: now, plannedMinutes, endedAt: null, outcome: null };
}

export function finishUrgeSession(
  session: UrgeSession,
  outcome: UrgeOutcome,
  now: Instant,
): UrgeSession {
  if (session.endedAt !== null) return session;
  return { ...session, endedAt: now < session.startedAt ? session.startedAt : now, outcome };
}

/** Time left on the chosen delay, never negative. */
export function urgeRemainingMs(session: UrgeSession, now: Instant): number {
  const end = session.startedAt + session.plannedMinutes * MINUTE_MS;
  return Math.max(0, end - now);
}

export function urgeHasElapsed(session: UrgeSession, now: Instant): boolean {
  return urgeRemainingMs(session, now) === 0;
}

/** The timer that is still running, newest first, or null. */
export function openUrgeSession(
  sessions: readonly UrgeSession[],
  now: Instant,
): UrgeSession | null {
  const running = sessions.filter((session) => {
    if (session.endedAt !== null) return false;
    // A forgotten timer stops being a running timer; it is not logged as
    // anything, so no half-finished session can inflate a count later.
    return now < session.startedAt + session.plannedMinutes * MINUTE_MS + URGE_STALE_AFTER_MS;
  });
  if (running.length === 0) return null;
  return running.reduce((newest, session) => (session.startedAt > newest.startedAt ? session : newest));
}

export function finishedUrgeSessions(sessions: readonly UrgeSession[]): readonly UrgeSession[] {
  return sessions.filter((session) => session.endedAt !== null);
}

export interface UrgeSummary {
  /** Sittings the person finished, all time. */
  readonly total: number;
  /** Sittings finished in the last seven days, including today. */
  readonly lastSevenDays: number;
  /** Of those, how many were reported easier at the end. */
  readonly easier: number;
}

/** How many sittings are behind the person. Reported, never scored. */
export function summariseUrgeSessions(
  sessions: readonly UrgeSession[],
  now: Instant,
): UrgeSummary {
  const finished = finishedUrgeSessions(sessions);
  return {
    total: finished.length,
    lastSevenDays: finished.filter((session) => now - session.endedAt! <= WEEK_MS).length,
    easier: finished.filter((session) => session.outcome === 'easier').length,
  };
}

/** mm:ss for the countdown, rounded up so the last second is shown fully. */
export function formatUrgeRemaining(remainingMs: number): string {
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
