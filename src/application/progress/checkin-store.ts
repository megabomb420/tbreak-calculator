// Persisted daily check-in records (UX_SPEC 10.2).
//
// One versioned envelope holds check-ins in chronological order. Rows are
// validated on decode with the D5 rules (symptom nulls allowed, use-day
// requires a confirmed usedAt, note length cap); a malformed row is dropped
// in isolation so unrelated check-ins and records stay untouched.

import type { StorageAdapter } from '../../infrastructure/storage/storage-adapter.ts';
import type { DailyCheckin } from '../../domain/schemas/profile.ts';
import { validateDailyCheckin } from '../../domain/validation/checkin-validation.ts';
import { isRecord } from './record-codec.ts';

export const CHECKINS_SCHEMA_VERSION = 'checkins-v1' as const;
export const CHECKINS_KEY = 'tbreak.checkins.v1';

export interface CheckinsRecord {
  readonly schemaVersion: typeof CHECKINS_SCHEMA_VERSION;
  /** Chronological (oldest first). */
  readonly checkins: readonly DailyCheckin[];
}

export interface CheckinsStore {
  readonly load: () => CheckinsRecord | null;
  readonly save: (record: CheckinsRecord) => void;
  readonly clear: () => void;
}

export function createCheckinsStore(adapter: StorageAdapter, key: string = CHECKINS_KEY): CheckinsStore {
  return {
    load: () => readRecord(adapter, key),
    save: (record) => writeRecord(adapter, key, record),
    clear: () => {
      adapter.removeItem(key);
    },
  };
}

export function emptyCheckinsRecord(): CheckinsRecord {
  return { schemaVersion: CHECKINS_SCHEMA_VERSION, checkins: [] };
}

function readRecord(adapter: StorageAdapter, key: string): CheckinsRecord | null {
  const raw = adapter.getItem(key);
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    adapter.removeItem(key);
    return null;
  }
  if (!isRecord(parsed) || parsed.schemaVersion !== CHECKINS_SCHEMA_VERSION || !Array.isArray(parsed.checkins)) {
    adapter.removeItem(key);
    return null;
  }
  const checkins = parsed.checkins
    .map((value) => validateDailyCheckin(value))
    .filter((outcome): outcome is { ok: true; checkin: DailyCheckin } => outcome.ok)
    .map((outcome) => outcome.checkin);
  return { schemaVersion: CHECKINS_SCHEMA_VERSION, checkins };
}

function writeRecord(adapter: StorageAdapter, key: string, record: CheckinsRecord): void {
  if (record.schemaVersion !== CHECKINS_SCHEMA_VERSION) {
    throw new RangeError(`invalid check-ins record: ${JSON.stringify(record)}`);
  }
  for (const checkin of record.checkins) {
    const outcome = validateDailyCheckin(checkin);
    if (!outcome.ok) {
      throw new RangeError(`invalid check-in record: ${JSON.stringify(checkin)}`);
    }
  }
  adapter.setItem(key, JSON.stringify(record));
}
