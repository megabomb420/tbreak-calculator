// Persisted open-ended tracking records (UX_SPEC 9.8, D4).
//
// One versioned envelope holds every tracking record so stopping or ending a
// run never deletes an earlier run's segments. Repository interface mirrors
// the documented IndexedDB plan store; the key-value backing is replaced when
// that persistence slice lands.

import type { StorageAdapter } from '../../infrastructure/storage/storage-adapter.ts';
import type { Instant } from '../../domain/schemas/time.ts';
import type { AbstinenceTrack } from '../../domain/breaks/abstinence-track.ts';
import { firstById, isInstantNumber, isRecord } from './record-codec.ts';
import { isValidSegment } from './break-attempt-record.ts';

export const TRACKING_RECORDS_SCHEMA_VERSION = 'tracking-records-v1' as const;
export const TRACKING_RECORDS_KEY = 'tbreak.tracking-records.v1';

/** A stored tracking record: the domain open-ended machine plus record
 * timestamps for ordering. */
export interface StoredTrack extends AbstinenceTrack {
  readonly createdAt: Instant;
  readonly updatedAt: Instant;
}

export interface TrackingRecordsRecord {
  readonly schemaVersion: typeof TRACKING_RECORDS_SCHEMA_VERSION;
  /** Records, newest first. */
  readonly records: readonly StoredTrack[];
}

export interface TrackingRecordsStore {
  readonly load: () => TrackingRecordsRecord | null;
  readonly save: (record: TrackingRecordsRecord) => void;
  readonly clear: () => void;
}

export function createTrackingRecordsStore(
  adapter: StorageAdapter,
  key: string = TRACKING_RECORDS_KEY,
): TrackingRecordsStore {
  return {
    load: () => readRecord(adapter, key),
    save: (record) => writeRecord(adapter, key, record),
    clear: () => {
      adapter.removeItem(key);
    },
  };
}

export function emptyTrackingRecordsRecord(): TrackingRecordsRecord {
  return { schemaVersion: TRACKING_RECORDS_SCHEMA_VERSION, records: [] };
}

function readRecord(adapter: StorageAdapter, key: string): TrackingRecordsRecord | null {
  const raw = adapter.getItem(key);
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    adapter.removeItem(key);
    return null;
  }
  if (!isRecord(parsed) || parsed.schemaVersion !== TRACKING_RECORDS_SCHEMA_VERSION || !Array.isArray(parsed.records)) {
    adapter.removeItem(key);
    return null;
  }
  const records = firstById(parsed.records.filter(isValidStoredTrack));
  return { schemaVersion: TRACKING_RECORDS_SCHEMA_VERSION, records };
}

function writeRecord(adapter: StorageAdapter, key: string, record: TrackingRecordsRecord): void {
  if (record.schemaVersion !== TRACKING_RECORDS_SCHEMA_VERSION || !record.records.every(isValidStoredTrack)) {
    throw new RangeError(`invalid tracking records record: ${JSON.stringify(record)}`);
  }
  adapter.setItem(key, JSON.stringify(record));
}

export function isValidStoredTrack(value: unknown): value is StoredTrack {
  if (!isRecord(value)) return false;
  if (typeof value.id !== 'string' || value.id === '') return false;
  if (value.status !== 'tracking' && value.status !== 'interrupted_time_needed' && value.status !== 'ended') {
    return false;
  }
  if (typeof value.calculationRecordId !== 'string' && value.calculationRecordId !== null) return false;
  if (!isInstantNumber(value.startedAt)) return false;
  if (!Array.isArray(value.segments) || !value.segments.every(isValidSegment)) return false;
  if (value.segments.length < 1) return false;
  const last = value.segments[value.segments.length - 1];
  if (last === undefined) return false;
  if (value.status === 'ended') {
    if (value.segments.some((segment) => segment.endedAt === null)) return false;
  } else {
    if (last.endedAt !== null) return false;
    if (value.segments.slice(0, -1).some((segment) => segment.endedAt === null)) return false;
  }
  for (let i = 1; i < value.segments.length; i += 1) {
    const previous = value.segments[i - 1];
    const current = value.segments[i];
    if (previous === undefined || current === undefined) return false;
    if (previous.endedAt !== null && current.startedFromLastUseAt < previous.endedAt) return false;
  }
  return isInstantNumber(value.createdAt) && isInstantNumber(value.updatedAt);
}
