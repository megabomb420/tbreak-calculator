// Post-break plan records (ARCHITECTURE §9). The live source of truth remains
// the attempt's `postBreakPlan`; this store is the durable per-record mirror
// so History/settings can address a plan without loading every attempt.

import type { StorageAdapter } from '../../infrastructure/storage/storage-adapter.ts';
import type { Instant } from '../../domain/schemas/time.ts';
import type { StoredAttempt } from '../progress/break-attempt-record.ts';
import { isValidPostBreakPlan, type PostBreakPlan } from '../break/post-break-plan.ts';
import { isInstantNumber, isRecord } from '../progress/record-codec.ts';

export const POST_BREAK_PLANS_SCHEMA_VERSION = 'post-break-plans-v1' as const;
export const POST_BREAK_PLANS_KEY = 'tbreak.post-break-plans.v1';

export interface StoredPostBreakPlan {
  readonly id: string;
  readonly attemptId: string;
  readonly plan: PostBreakPlan;
  readonly updatedAt: Instant;
}

export interface PostBreakPlansEnvelope {
  readonly schemaVersion: typeof POST_BREAK_PLANS_SCHEMA_VERSION;
  readonly records: readonly StoredPostBreakPlan[];
}

export interface PostBreakPlansStore {
  readonly load: () => PostBreakPlansEnvelope;
  readonly save: (envelope: PostBreakPlansEnvelope) => void;
  readonly clear: () => void;
}

export function emptyPostBreakPlans(): PostBreakPlansEnvelope {
  return { schemaVersion: POST_BREAK_PLANS_SCHEMA_VERSION, records: [] };
}

export function createPostBreakPlansStore(
  adapter: StorageAdapter,
  key: string = POST_BREAK_PLANS_KEY,
): PostBreakPlansStore {
  return {
    load: () => readEnvelope(adapter, key),
    save: (envelope) => {
      if (envelope.schemaVersion !== POST_BREAK_PLANS_SCHEMA_VERSION || !envelope.records.every(isValidStoredPostBreakPlan)) {
        throw new RangeError('invalid post-break plans envelope');
      }
      adapter.setItem(key, JSON.stringify(envelope));
    },
    clear: () => {
      adapter.removeItem(key);
    },
  };
}

export function plansFromAttempts(attempts: readonly StoredAttempt[]): readonly StoredPostBreakPlan[] {
  return attempts
    .filter((attempt): attempt is StoredAttempt & { postBreakPlan: PostBreakPlan } => attempt.postBreakPlan !== null)
    .map((attempt) => ({
      id: attempt.id,
      attemptId: attempt.id,
      plan: attempt.postBreakPlan,
      updatedAt: attempt.updatedAt,
    }));
}

export function isValidStoredPostBreakPlan(value: unknown): value is StoredPostBreakPlan {
  if (!isRecord(value)) return false;
  if (typeof value.id !== 'string' || value.id === '') return false;
  if (typeof value.attemptId !== 'string' || value.attemptId === '') return false;
  if (!isValidPostBreakPlan(value.plan)) return false;
  return isInstantNumber(value.updatedAt);
}

function readEnvelope(adapter: StorageAdapter, key: string): PostBreakPlansEnvelope {
  const raw = adapter.getItem(key);
  if (raw === null) return emptyPostBreakPlans();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return emptyPostBreakPlans();
  }
  if (!isRecord(parsed) || parsed.schemaVersion !== POST_BREAK_PLANS_SCHEMA_VERSION || !Array.isArray(parsed.records)) {
    return emptyPostBreakPlans();
  }
  return {
    schemaVersion: POST_BREAK_PLANS_SCHEMA_VERSION,
    records: parsed.records.filter(isValidStoredPostBreakPlan),
  };
}
