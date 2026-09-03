// Persisted break-attempt records (step-4 durable plan state).
//
// One versioned envelope holds every stored attempt (current + finished) so a
// new plan never deletes an earlier attempt's segments. Stored attempts add
// plan-lifetime fields to the domain `BreakAttempt`: the user's post-break
// plan, optional trigger preparation, the completion acknowledgement flag,
// and record timestamps. The repository interface mirrors the documented
// IndexedDB `breakAttempts` store; the key-value backing is replaced when
// that persistence slice lands.

import type { StorageAdapter } from '../../infrastructure/storage/storage-adapter.ts';
import type { Instant } from '../../domain/schemas/time.ts';
import { MILLIS_PER_DAY } from '../../domain/schemas/time.ts';
import type { BreakAttempt, BreakSegmentEndReason } from '../../domain/breaks/break-attempt.ts';
import { POST_BREAK_MODES } from '../../domain/schemas/enums.ts';
import {
  isValidPostBreakPlan,
  postBreakPlanMatchesMode,
  type PostBreakPlan,
} from '../break/post-break-plan.ts';
import { decodePreparation, type BreakPreparation } from '../break/preparation.ts';
import { firstById, isInstantNumber, isOptionalInstantNumber, isRecord } from './record-codec.ts';

export const BREAK_ATTEMPTS_SCHEMA_VERSION = 'break-attempts-v1' as const;
export const BREAK_ATTEMPTS_KEY = 'tbreak.break-attempts.v1';

/** A stored attempt: the domain state machine record plus plan-lifetime
 * fields the UI and later History need. */
export interface StoredAttempt extends BreakAttempt {
  readonly postBreakPlan: PostBreakPlan | null;
  /** Optional trigger / if-then plan. Absent on v0.4.x records. */
  readonly preparation: BreakPreparation | null;
  /** True once a completed attempt's completion card has been acknowledged. */
  readonly completionAcknowledged: boolean;
  readonly createdAt: Instant;
  readonly updatedAt: Instant;
}

export interface BreakAttemptsRecord {
  readonly schemaVersion: typeof BREAK_ATTEMPTS_SCHEMA_VERSION;
  /** Attempts, newest first. */
  readonly attempts: readonly StoredAttempt[];
}

export interface BreakAttemptsStore {
  /** Latest persisted record, or null when none exists or the envelope is corrupt. */
  readonly load: () => BreakAttemptsRecord | null;
  readonly save: (record: BreakAttemptsRecord) => void;
  readonly clear: () => void;
}

export function createBreakAttemptsStore(
  adapter: StorageAdapter,
  key: string = BREAK_ATTEMPTS_KEY,
): BreakAttemptsStore {
  return {
    load: () => readRecord(adapter, key),
    save: (record) => writeRecord(adapter, key, record),
    clear: () => {
      adapter.removeItem(key);
    },
  };
}

export function emptyBreakAttemptsRecord(): BreakAttemptsRecord {
  return { schemaVersion: BREAK_ATTEMPTS_SCHEMA_VERSION, attempts: [] };
}

function readRecord(adapter: StorageAdapter, key: string): BreakAttemptsRecord | null {
  const raw = adapter.getItem(key);
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    adapter.removeItem(key);
    return null;
  }
  if (!isRecord(parsed) || parsed.schemaVersion !== BREAK_ATTEMPTS_SCHEMA_VERSION || !Array.isArray(parsed.attempts)) {
    adapter.removeItem(key);
    return null;
  }
  // A corrupt attempt row is dropped in isolation: the remaining attempts and
  // every unrelated record stay usable (UX_SPEC 13.3). Duplicate ids keep the
  // first (newest) row. Missing preparation on v0.4.x rows becomes null.
  const attempts = firstById(
    parsed.attempts.map(normalizeStoredAttempt).filter((row): row is StoredAttempt => row !== null),
  );
  return { schemaVersion: BREAK_ATTEMPTS_SCHEMA_VERSION, attempts };
}

function writeRecord(adapter: StorageAdapter, key: string, record: BreakAttemptsRecord): void {
  if (record.schemaVersion !== BREAK_ATTEMPTS_SCHEMA_VERSION || !record.attempts.every(isValidStoredAttempt)) {
    throw new RangeError(`invalid break attempts record: ${JSON.stringify(record)}`);
  }
  adapter.setItem(key, JSON.stringify(record));
}

export function isValidStoredAttempt(value: unknown): value is StoredAttempt {
  if (!isRecord(value)) return false;
  const body = value;
  if (typeof body.id !== 'string' || body.id === '') return false;
  if (
    body.status !== 'planned' &&
    body.status !== 'active' &&
    body.status !== 'interrupted_time_needed' &&
    body.status !== 'completed' &&
    body.status !== 'ended'
  ) {
    return false;
  }
  if (typeof body.calculationRecordId !== 'string' && body.calculationRecordId !== null) return false;
  if (
    typeof body.targetDurationDays !== 'number' ||
    !Number.isInteger(body.targetDurationDays) ||
    body.targetDurationDays < 1 ||
    !Number.isSafeInteger(body.targetDurationDays * MILLIS_PER_DAY)
  ) {
    return false;
  }
  if (body.postBreakMode !== null && !(POST_BREAK_MODES as readonly string[]).includes(body.postBreakMode as string)) {
    return false;
  }
  if (!isInstantNumber(body.startedAt)) return false;
  if (!isValidSegments(value.segments)) return false;
  const segments = value.segments as readonly { startedFromLastUseAt: number; endedAt: number | null }[];
  if (!segmentsConsistentWithStatus(body.status as StoredAttempt['status'], segments)) return false;
  if (!targetDateIsRepresentable(body.targetDurationDays as number, body.startedAt as number, segments)) return false;
  const plan = body.postBreakPlan;
  if (plan === null) {
    if (body.postBreakMode !== null) return false;
  } else {
    if (!isValidPostBreakPlan(plan) || !postBreakPlanMatchesMode(plan, body.postBreakMode as never)) return false;
  }
  const preparation = decodePreparation(body.preparation);
  if (!preparation.ok) return false;
  if (typeof body.completionAcknowledged !== 'boolean') return false;
  if (body.status !== 'completed' && body.completionAcknowledged === true) return false;
  return isInstantNumber(body.createdAt) && isInstantNumber(body.updatedAt);
}

function normalizeStoredAttempt(value: unknown): StoredAttempt | null {
  if (!isValidStoredAttempt(value)) return null;
  const preparation = decodePreparation((value as { preparation?: unknown }).preparation);
  if (!preparation.ok) return null;
  return { ...value, preparation: preparation.preparation };
}

function isValidSegments(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  if (!value.every(isValidSegment)) return false;
  for (let i = 1; i < value.length; i += 1) {
    const previous = value[i - 1] as { endedAt: number | null };
    const current = value[i] as { startedFromLastUseAt: number };
    if (previous.endedAt !== null && current.startedFromLastUseAt < previous.endedAt) return false;
  }
  return true;
}

/** Machine invariants over the segment list for a stored status. */
function segmentsConsistentWithStatus(
  status: StoredAttempt['status'],
  segments: readonly { endedAt: number | null }[],
): boolean {
  switch (status) {
    case 'planned':
      return segments.length === 0;
    case 'active':
    case 'interrupted_time_needed': {
      if (segments.length < 1) return false;
      const last = segments[segments.length - 1];
      if (last === undefined || last.endedAt !== null) return false;
      return segments.slice(0, -1).every((segment) => segment.endedAt !== null);
    }
    case 'completed':
    case 'ended':
      return segments.length >= 1 && segments.every((segment) => segment.endedAt !== null);
  }
}

export function isValidSegment(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (!isInstantNumber(value.startedFromLastUseAt)) return false;
  if (!isOptionalInstantNumber(value.endedAt)) return false;
  if (value.endReason !== null && !isEndReason(value.endReason)) return false;
  if ((value.endedAt === null) !== (value.endReason === null)) return false;
  if (value.endedAt !== null && (value.endedAt as number) < (value.startedFromLastUseAt as number)) return false;
  return true;
}

function isEndReason(value: unknown): value is BreakSegmentEndReason {
  return value === 'used_thc' || value === 'completed' || value === 'user_ended';
}

/** Reject durations whose target instant would overflow Date/safe-integer math. */
function targetDateIsRepresentable(
  days: number,
  startedAt: number,
  segments: readonly { startedFromLastUseAt: number }[],
): boolean {
  const span = days * MILLIS_PER_DAY;
  const anchors = [startedAt, ...segments.map((segment) => segment.startedFromLastUseAt)];
  return anchors.every((anchor) => isInstantNumber(anchor + span));
}
