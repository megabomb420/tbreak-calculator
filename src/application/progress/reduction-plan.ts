// User-defined cutting-down limits (UX_SPEC 9.4). Stored as the user's plan,
// never fed to an engine. Lives in its own envelope so a recalculation to
// another goal does not invent science from leftover numbers.

import type { Instant } from '../../domain/schemas/time.ts';
import type { StorageAdapter } from '../../infrastructure/storage/storage-adapter.ts';

export const REDUCTION_PLAN_SCHEMA_VERSION = 'reduction-plan-v1' as const;
export const REDUCTION_PLAN_KEY = 'tbreak.reduction-plan.v1';

export const DEFAULT_REDUCTION_DAYS_PER_WEEK = 3;
export const DEFAULT_REDUCTION_SESSIONS = 1;

export interface ReductionPlanRecord {
  readonly schemaVersion: typeof REDUCTION_PLAN_SCHEMA_VERSION;
  readonly maxUseDaysPerWeek: number;
  readonly maxSessionsPerUseDay: number;
  readonly updatedAt: Instant;
}

export interface ReductionPlanStore {
  readonly load: () => ReductionPlanRecord | null;
  readonly save: (record: ReductionPlanRecord) => void;
  readonly clear: () => void;
}

export function createReductionPlanStore(
  adapter: StorageAdapter,
  key: string = REDUCTION_PLAN_KEY,
): ReductionPlanStore {
  return {
    load: () => readRecord(adapter, key),
    save: (record) => {
      if (!isValidRecord(record)) {
        throw new RangeError(`invalid reduction plan record: ${JSON.stringify(record)}`);
      }
      adapter.setItem(key, JSON.stringify(record));
    },
    clear: () => {
      adapter.removeItem(key);
    },
  };
}

function readRecord(adapter: StorageAdapter, key: string): ReductionPlanRecord | null {
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

function isValidRecord(value: unknown): value is ReductionPlanRecord {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    record.schemaVersion === REDUCTION_PLAN_SCHEMA_VERSION &&
    isLimit(record.maxUseDaysPerWeek, 0, 7) &&
    isLimit(record.maxSessionsPerUseDay, 1, 9) &&
    typeof record.updatedAt === 'number' &&
    Number.isInteger(record.updatedAt) &&
    Number.isFinite(record.updatedAt)
  );
}

function isLimit(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}
