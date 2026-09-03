// Personal check-in facts for the live recovery outlook (0.9.0).
//
// Derives CheckinDayRow[] only when a clean per-attempt mapping exists: the
// live break context is the current active attempt, else the most recent
// completed attempt, and only when that attempt has a single uninterrupted
// abstinence segment (no restart, no pause). Any other situation omits the
// block — a day number is never fabricated. The domain summary helpers in
// `checkin-summary.ts` decide which facts actually qualify.

import type { DailyCheckin } from '../../domain/schemas/profile.ts';
import { parseSubmittedTimestamp, type Instant } from '../../domain/schemas/time.ts';
import { abstinenceDayAt } from '../../domain/breaks/break-time.ts';
import type { CheckinDayRow } from '../../domain/checkins/checkin-summary.ts';
import type { StoredAttempt } from '../progress/break-attempt-record.ts';

export interface RecoveryCheckinFactsView {
  readonly rows: readonly CheckinDayRow[];
}

/** The break context used for facts: current active attempt, else the most
 * recent completed attempt. Returns null when neither exists cleanly. */
function breakContextAttempt(
  attempts: readonly StoredAttempt[],
): StoredAttempt | null {
  const active = attempts.find((attempt) => attempt.status === 'active');
  if (active !== undefined) return active;
  return attempts.find((attempt) => attempt.status === 'completed') ?? null;
}

/** Single-segment attempt whose check-in window is unambiguous. */
function hasCleanWindow(attempt: StoredAttempt): boolean {
  return attempt.segments.length === 1;
}

function singleSegmentAnchor(attempt: StoredAttempt): Instant | null {
  if (attempt.segments.length !== 1) return null;
  const segment = attempt.segments[0];
  return segment === undefined ? null : segment.startedFromLastUseAt;
}

/** Check-in rows for the live attempt context, or null when the mapping is
 * not cleanly available. Unrated symptoms stay null (never 0). */
export function checkinRowsForBreakContext(input: {
  readonly checkins: readonly DailyCheckin[];
  readonly attempts: readonly StoredAttempt[];
  readonly now: Instant;
}): CheckinDayRow[] | null {
  const attempt = breakContextAttempt(input.attempts);
  if (attempt === null || !hasCleanWindow(attempt)) return null;
  const anchor = singleSegmentAnchor(attempt);
  if (anchor === null) return null;
  const end =
    attempt.status === 'completed'
      ? attempt.updatedAt
      : input.now;
  const start = attempt.createdAt;
  const rows: CheckinDayRow[] = [];
  for (const checkin of input.checkins) {
    if (checkin.usedThc) continue;
    const recordedAt = parseSubmittedTimestamp(checkin.recordedAt);
    if (recordedAt === null) continue;
    if (recordedAt < start || recordedAt > end) continue;
    rows.push({
      breakDay: abstinenceDayAt(recordedAt, anchor),
      craving: checkin.craving,
      sleep: checkin.sleep,
      irritability: checkin.irritability,
      anxiety: checkin.anxiety,
      appetite: checkin.appetite,
    });
  }
  return rows.length === 0 ? null : rows;
}
