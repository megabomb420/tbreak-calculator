// Persisted active-reduction plan records (schema reduction-records-v2).
//
// One versioned envelope holds every reduction plan (active, review-recommended,
// paused, ended) so ending a plan never deletes an earlier plan's events.
// Envelope semantics mirror the break-attempt and tracking records stores.
//
// Legacy reduction-plan-v1 (plain user limits, never fed to an engine) stays
// readable by its original store for migration; when a v2 plan starts from a
// stored v1 limit record, the caller copies those limits into the plan's
// baseline and clears the v1 record. Old v1 data failing that path is simply
// dropped, which is safe because v1 limits were never engine science.

import {
  PRODUCT_KINDS,
  ROUTES,
  type ProductKind,
  type Route,
} from '../../domain/schemas/enums.ts';
import type {
  ReductionBaseline,
  ReductionLimits,
  ReductionOrigin,
  ReductionPlan,
  ReductionPlanStatus,
  ThcStrategy,
  UseEvent,
} from '../../domain/reduction/reduction-engine.ts';
import type { StorageAdapter } from '../../infrastructure/storage/storage-adapter.ts';
import { firstById, isInstantNumber, isRecord } from './record-codec.ts';

export const REDUCTION_RECORDS_SCHEMA_VERSION = 'reduction-records-v2' as const;
export const REDUCTION_RECORDS_KEY = 'tbreak.reduction-records.v2';

export interface ReductionRecordsEnvelope {
  readonly schemaVersion: typeof REDUCTION_RECORDS_SCHEMA_VERSION;
  /** Plans, newest first. The live plan is the first with a non-ended status. */
  readonly plans: readonly ReductionPlan[];
}

export interface ReductionRecordsStore {
  readonly load: () => ReductionRecordsEnvelope;
  readonly save: (record: ReductionRecordsEnvelope) => void;
  readonly clear: () => void;
}

export function emptyReductionRecords(): ReductionRecordsEnvelope {
  return { schemaVersion: REDUCTION_RECORDS_SCHEMA_VERSION, plans: [] };
}

export function createReductionRecordsStore(
  adapter: StorageAdapter,
  key: string = REDUCTION_RECORDS_KEY,
): ReductionRecordsStore {
  return {
    load: () => readEnvelope(adapter, key),
    save: (record) => writeEnvelope(adapter, key, record),
    clear: () => {
      adapter.removeItem(key);
    },
  };
}

function readEnvelope(adapter: StorageAdapter, key: string): ReductionRecordsEnvelope {
  const raw = adapter.getItem(key);
  if (raw === null) return emptyReductionRecords();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return emptyReductionRecords();
  }
  if (!isRecord(parsed) || parsed.schemaVersion !== REDUCTION_RECORDS_SCHEMA_VERSION || !Array.isArray(parsed.plans)) {
    return emptyReductionRecords();
  }
  const plans = firstById(
    parsed.plans.filter(isValidReductionPlan) as ReductionPlan[],
  );
  return { schemaVersion: REDUCTION_RECORDS_SCHEMA_VERSION, plans };
}

function writeEnvelope(adapter: StorageAdapter, key: string, envelope: ReductionRecordsEnvelope): void {
  if (envelope.schemaVersion !== REDUCTION_RECORDS_SCHEMA_VERSION) {
    throw new RangeError('invalid reduction records envelope');
  }
  if (!envelope.plans.every(isValidReductionPlan)) {
    throw new RangeError('invalid reduction plan in envelope');
  }
  adapter.setItem(key, JSON.stringify(envelope));
}

export function isValidReductionPlan(value: unknown): value is ReductionPlan {
  if (!isRecord(value)) return false;
  const plan = value as Record<string, unknown>;
  if (typeof plan.id !== 'string' || plan.id === '') return false;
  if (plan.origin !== 'direct' && plan.origin !== 'post_break') return false;
  if (!isStatus(plan.status)) return false;
  if (!isInstantNumber(plan.startedAt)) return false;
  if (!isInstantNumber(plan.updatedAt)) return false;
  if (!isLimits(plan.limits)) return false;
  if (!isStrategy(plan.strategy)) return false;
  if (!isBaseline(plan.baseline)) return false;
  if (!Array.isArray(plan.events) || !plan.events.every(isValidEvent)) return false;
  return true;
}

function isStatus(value: unknown): value is ReductionPlanStatus {
  return (
    value === 'active' ||
    value === 'review_recommended' ||
    value === 'paused' ||
    value === 'ended'
  );
}

function isLimits(value: unknown): value is ReductionLimits {
  if (!isRecord(value)) return false;
  return (
    isIntInRange(value.maxUseDaysPerWeek, 1, 7) &&
    isIntInRange(value.maxSessionsPerUseDay, 1, 9)
  );
}

function isStrategy(value: unknown): value is ThcStrategy {
  if (!isRecord(value)) return false;
  return (
    typeof value.avoidConcentrates === 'boolean' &&
    typeof value.lowerPotency === 'boolean' &&
    typeof value.lowerAmount === 'boolean'
  );
}

function isBaseline(value: unknown): value is ReductionBaseline {
  if (!isRecord(value)) return false;
  if (!isIntInRange(value.thcUseDaysLast30, 0, 30)) return false;
  if (value.sessionsPerUseDay !== null && !isIntInRange(value.sessionsPerUseDay, 1, 9)) return false;
  if (!Array.isArray(value.products) || !value.products.every(isProductKind)) return false;
  if (!Array.isArray(value.routes) || !value.routes.every(isRoute)) return false;
  if (value.currentPatternDuration !== null && typeof value.currentPatternDuration !== 'string') return false;
  return true;
}

function isValidEvent(value: unknown): value is UseEvent {
  if (!isRecord(value)) return false;
  if (typeof value.id !== 'string' || value.id === '') return false;
  if (!isInstantNumber(value.usedAt)) return false;
  if (!isInstantNumber(value.createdAt)) return false;
  return isProductKind(value.product) && isRoute(value.route);
}

function isProductKind(value: unknown): value is ProductKind {
  return typeof value === 'string' && (PRODUCT_KINDS as readonly string[]).includes(value);
}

function isRoute(value: unknown): value is Route {
  return typeof value === 'string' && (ROUTES as readonly string[]).includes(value);
}

function isIntInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}
