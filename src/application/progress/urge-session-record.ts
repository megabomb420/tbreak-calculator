// Urge sessions: the times someone started the delay timer and how it ended.
//
// Deliberately not a "relapse" or "resisted" log. A session only records that
// the timer ran and what the person reported at the end of it; a session that
// is closed before its timer finishes, or that is never finished, leaves
// nothing behind. The count is a count of sittings, never a score.

import type { Instant } from '../../domain/schemas/time.ts';
import type { StorageAdapter } from '../../infrastructure/storage/storage-adapter.ts';
import { isInstantNumber, isRecord } from './record-codec.ts';

export const URGE_SESSIONS_SCHEMA_VERSION = 'urge-sessions-v1' as const;
export const URGE_SESSIONS_KEY = 'tbreak.urge-sessions.v1';

/** The delay lengths the sheet offers, in minutes. */
export const URGE_MINUTE_CHOICES = [5, 10, 15] as const;

export const URGE_MINUTES_MIN = 1;
export const URGE_MINUTES_MAX = 60;

/** A session that is never finished is forgotten this long after its own end. */
export const URGE_STALE_AFTER_MS = 2 * 3_600_000;

export type UrgeOutcome = 'easier' | 'still_there';

export interface UrgeSession {
  readonly id: string;
  readonly startedAt: Instant;
  readonly plannedMinutes: number;
  /** Null while the timer is still running. */
  readonly endedAt: Instant | null;
  /** Null while the timer is still running. */
  readonly outcome: UrgeOutcome | null;
}

export interface UrgeSessionsRecord {
  readonly schemaVersion: typeof URGE_SESSIONS_SCHEMA_VERSION;
  /** Newest first. */
  readonly sessions: readonly UrgeSession[];
}

export interface UrgeSessionsStore {
  readonly load: () => UrgeSessionsRecord;
  readonly save: (record: UrgeSessionsRecord) => void;
  readonly clear: () => void;
}

export function emptyUrgeSessionsRecord(): UrgeSessionsRecord {
  return { schemaVersion: URGE_SESSIONS_SCHEMA_VERSION, sessions: [] };
}

export function isUrgeOutcome(value: unknown): value is UrgeOutcome {
  return value === 'easier' || value === 'still_there';
}

export function isValidUrgeSession(value: unknown): value is UrgeSession {
  if (!isRecord(value)) return false;
  if (typeof value.id !== 'string' || value.id === '') return false;
  if (!isInstantNumber(value.startedAt)) return false;
  const minutes = value.plannedMinutes;
  if (typeof minutes !== 'number' || !Number.isInteger(minutes)) return false;
  if (minutes < URGE_MINUTES_MIN || minutes > URGE_MINUTES_MAX) return false;
  if (value.endedAt === null || value.outcome === null) {
    // Running, or a half-written row: an outcome without an end time (or the
    // reverse) is not a record of anything and is dropped on load.
    return value.endedAt === null && value.outcome === null;
  }
  if (!isInstantNumber(value.endedAt)) return false;
  if (value.endedAt < value.startedAt) return false;
  return isUrgeOutcome(value.outcome);
}

/** Drops a running session once its timer plus a grace period has passed. */
export function pruneUrgeSessions(
  sessions: readonly UrgeSession[],
  now: Instant,
): readonly UrgeSession[] {
  return sessions.filter((session) => {
    if (session.endedAt !== null) return true;
    const staleAfter = session.startedAt + session.plannedMinutes * 60_000 + URGE_STALE_AFTER_MS;
    return now < staleAfter;
  });
}

export function createUrgeSessionsStore(
  adapter: StorageAdapter,
  key: string = URGE_SESSIONS_KEY,
): UrgeSessionsStore {
  return {
    load: () => readRecord(adapter, key),
    save: (record) => writeRecord(adapter, key, record),
    clear: () => {
      adapter.removeItem(key);
    },
  };
}

function readRecord(adapter: StorageAdapter, key: string): UrgeSessionsRecord {
  const raw = adapter.getItem(key);
  if (raw === null) return emptyUrgeSessionsRecord();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return emptyUrgeSessionsRecord();
  }
  if (
    !isRecord(parsed) ||
    parsed.schemaVersion !== URGE_SESSIONS_SCHEMA_VERSION ||
    !Array.isArray(parsed.sessions)
  ) {
    return emptyUrgeSessionsRecord();
  }
  const seen = new Set<string>();
  const sessions: UrgeSession[] = [];
  let runningSeen = false;
  for (const row of parsed.sessions) {
    if (!isValidUrgeSession(row)) continue;
    if (seen.has(row.id)) continue;
    // One running timer at a time: a second one would be an ambiguous resume.
    if (row.endedAt === null) {
      if (runningSeen) continue;
      runningSeen = true;
    }
    seen.add(row.id);
    sessions.push(row);
  }
  return { schemaVersion: URGE_SESSIONS_SCHEMA_VERSION, sessions };
}

function writeRecord(adapter: StorageAdapter, key: string, record: UrgeSessionsRecord): void {
  if (record.schemaVersion !== URGE_SESSIONS_SCHEMA_VERSION) {
    throw new RangeError('invalid urge-sessions envelope');
  }
  if (!record.sessions.every(isValidUrgeSession)) {
    throw new RangeError('invalid urge session in envelope');
  }
  const running = record.sessions.filter((session) => session.endedAt === null);
  if (running.length > 1) throw new RangeError('more than one urge timer cannot run at once');
  adapter.setItem(key, JSON.stringify(record));
}
