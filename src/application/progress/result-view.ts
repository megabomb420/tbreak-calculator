// Transient result-view status (UX_SPEC 3.1 result flow, 13.3 recovery).
//
// Completing the questionnaire opens the result overlay. The snapshot is
// the calculation input; this record tracks whether the result screen is
// still open or has been acknowledged (Save / Done / close).

import type { Instant } from '../../domain/schemas/time.ts';
import type { StorageAdapter } from '../../infrastructure/storage/storage-adapter.ts';

export const RESULT_VIEW_SCHEMA_VERSION = 'result-view-v1' as const;
export const RESULT_VIEW_KEY = 'tbreak.result-view.v1';

export type ResultViewStatus = 'open' | 'acknowledged';

export interface ResultViewRecord {
  readonly schemaVersion: typeof RESULT_VIEW_SCHEMA_VERSION;
  readonly status: ResultViewStatus;
  readonly updatedAt: Instant;
}

export interface ResultViewStore {
  readonly load: () => ResultViewRecord | null;
  readonly save: (record: ResultViewRecord) => void;
  readonly clear: () => void;
}

export function createResultViewStore(
  adapter: StorageAdapter,
  key: string = RESULT_VIEW_KEY,
): ResultViewStore {
  return {
    load: () => readRecord(adapter, key),
    save: (record) => {
      if (!isValidRecord(record)) {
        throw new RangeError(`invalid result view record: ${JSON.stringify(record)}`);
      }
      adapter.setItem(key, JSON.stringify(record));
    },
    clear: () => {
      adapter.removeItem(key);
    },
  };
}

function readRecord(adapter: StorageAdapter, key: string): ResultViewRecord | null {
  const raw = adapter.getItem(key);
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    adapter.removeItem(key);
    return null;
  }
  if (!isValidRecord(parsed)) {
    adapter.removeItem(key);
    return null;
  }
  return parsed;
}

function isValidRecord(value: unknown): value is ResultViewRecord {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    record.schemaVersion === RESULT_VIEW_SCHEMA_VERSION &&
    (record.status === 'open' || record.status === 'acknowledged') &&
    typeof record.updatedAt === 'number' &&
    Number.isInteger(record.updatedAt) &&
    Number.isFinite(record.updatedAt)
  );
}
