// Previous-break personalisation records (UX_SPEC §7, CALCULATOR_SPEC 4.4).
//
// Stored independently of any calculation. They may add a history insight on
// an explicit recalculation and never change a deterministic range.

import type { StorageAdapter } from '../../infrastructure/storage/storage-adapter.ts';
import type { PreviousBreakInput } from '../../domain/schemas/profile.ts';
import type { Instant } from '../../domain/schemas/time.ts';
import { isInstantNumber, isIsoTimestamp, isOptionalIsoTimestamp, isRecord } from '../progress/record-codec.ts';

export const PREVIOUS_BREAKS_SCHEMA_VERSION = 'previous-breaks-v1' as const;
export const PREVIOUS_BREAKS_KEY = 'tbreak.previous-breaks.v1';

export interface StoredPreviousBreak extends PreviousBreakInput {
  readonly updatedAt: Instant;
}

export interface PreviousBreaksEnvelope {
  readonly schemaVersion: typeof PREVIOUS_BREAKS_SCHEMA_VERSION;
  /** Newest first. */
  readonly records: readonly StoredPreviousBreak[];
  readonly corrupt: readonly { readonly id: string; readonly reason: string }[];
}

export interface PreviousBreaksStore {
  readonly load: () => PreviousBreaksEnvelope;
  readonly save: (envelope: PreviousBreaksEnvelope) => void;
  readonly clear: () => void;
}

export function emptyPreviousBreaks(): PreviousBreaksEnvelope {
  return { schemaVersion: PREVIOUS_BREAKS_SCHEMA_VERSION, records: [], corrupt: [] };
}

export function createPreviousBreaksStore(
  adapter: StorageAdapter,
  key: string = PREVIOUS_BREAKS_KEY,
): PreviousBreaksStore {
  return {
    load: () => readEnvelope(adapter, key),
    save: (envelope) => writeEnvelope(adapter, key, envelope),
    clear: () => {
      adapter.removeItem(key);
    },
  };
}

export function toPreviousBreakInput(record: StoredPreviousBreak): PreviousBreakInput {
  return {
    id: record.id,
    durationDays: record.durationDays,
    toleranceReductionScore: record.toleranceReductionScore,
    endedAt: record.endedAt,
    createdAt: record.createdAt,
    ...(record.sourceAttemptId !== undefined ? { sourceAttemptId: record.sourceAttemptId } : {}),
  };
}

export function isValidStoredPreviousBreak(value: unknown): value is StoredPreviousBreak {
  if (!isRecord(value)) return false;
  if (typeof value.id !== 'string' || value.id === '') return false;
  if (typeof value.durationDays !== 'number' || !Number.isInteger(value.durationDays) || value.durationDays < 1) {
    return false;
  }
  const score = value.toleranceReductionScore;
  if (score !== null && (typeof score !== 'number' || !Number.isInteger(score) || score < 0 || score > 10)) {
    return false;
  }
  if (!isOptionalIsoTimestamp(value.endedAt)) return false;
  if (!isIsoTimestamp(value.createdAt)) return false;
  if (value.sourceAttemptId !== undefined && (typeof value.sourceAttemptId !== 'string' || value.sourceAttemptId === '')) {
    return false;
  }
  return isInstantNumber(value.updatedAt);
}

function readEnvelope(adapter: StorageAdapter, key: string): PreviousBreaksEnvelope {
  const raw = adapter.getItem(key);
  if (raw === null) return emptyPreviousBreaks();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      schemaVersion: PREVIOUS_BREAKS_SCHEMA_VERSION,
      records: [],
      corrupt: [{ id: 'envelope', reason: 'unreadable' }],
    };
  }
  if (!isRecord(parsed) || parsed.schemaVersion !== PREVIOUS_BREAKS_SCHEMA_VERSION || !Array.isArray(parsed.records)) {
    return {
      schemaVersion: PREVIOUS_BREAKS_SCHEMA_VERSION,
      records: [],
      corrupt: [{ id: 'envelope', reason: 'unreadable' }],
    };
  }
  const records: StoredPreviousBreak[] = [];
  const corrupt: { id: string; reason: string }[] = [];
  parsed.records.forEach((row, index) => {
    if (isValidStoredPreviousBreak(row)) {
      records.push(row);
      return;
    }
    const id = isRecord(row) && typeof row.id === 'string' && row.id !== '' ? row.id : `corrupt-${index}`;
    corrupt.push({ id, reason: 'invalid-record' });
  });
  return { schemaVersion: PREVIOUS_BREAKS_SCHEMA_VERSION, records, corrupt };
}

function writeEnvelope(adapter: StorageAdapter, key: string, envelope: PreviousBreaksEnvelope): void {
  if (envelope.schemaVersion !== PREVIOUS_BREAKS_SCHEMA_VERSION || !envelope.records.every(isValidStoredPreviousBreak)) {
    throw new RangeError('invalid previous-breaks envelope');
  }
  adapter.setItem(key, JSON.stringify(envelope));
}
