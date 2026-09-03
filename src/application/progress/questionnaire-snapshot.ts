// Completed questionnaire raw-answer snapshot (UX_SPEC 4.5).
//
// Stored separately from the unfinished draft so Today does not show Resume
// after a finished flow. Result screens (UX_SPEC §16 step 3) consume this
// record; this slice does not invoke engines.

import type { Instant } from '../../domain/schemas/time.ts';
import type { StorageAdapter } from '../../infrastructure/storage/storage-adapter.ts';
import type { RawAnswerSnapshot } from '../questionnaire/snapshot.ts';
import {
  CURRENT_PATTERN_DURATION_BANDS,
  DETECTION_CONTEXTS,
  DETECTION_MATRICES,
  GOALS,
  POST_BREAK_MODES,
  PRODUCT_KINDS,
  ROUTES,
} from '../../domain/schemas/enums.ts';
import { isCoreSourcedValue, isRecord } from './record-codec.ts';

export const QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION = 'questionnaire-snapshot-v1' as const;
export const QUESTIONNAIRE_SNAPSHOT_KEY = 'tbreak.questionnaire-snapshot.v1';

export interface QuestionnaireSnapshotRecord {
  readonly schemaVersion: typeof QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION;
  readonly snapshot: RawAnswerSnapshot;
  readonly updatedAt: Instant;
  /** Stable identifier for this snapshot run, backfilled when a plan or
   * tracking record first references it. Absent on legacy records. */
  readonly runId?: string;
}

export interface QuestionnaireSnapshotStore {
  readonly load: () => QuestionnaireSnapshotRecord | null;
  readonly save: (record: QuestionnaireSnapshotRecord) => void;
  readonly clear: () => void;
}

export function createQuestionnaireSnapshotStore(
  adapter: StorageAdapter,
  key: string = QUESTIONNAIRE_SNAPSHOT_KEY,
): QuestionnaireSnapshotStore {
  return {
    load: () => readSnapshot(adapter, key),
    save: (record) => writeSnapshot(adapter, key, record),
    clear: () => {
      adapter.removeItem(key);
    },
  };
}

function readSnapshot(adapter: StorageAdapter, key: string): QuestionnaireSnapshotRecord | null {
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

function writeSnapshot(adapter: StorageAdapter, key: string, record: QuestionnaireSnapshotRecord): void {
  if (!isValidRecord(record)) {
    throw new RangeError(`invalid questionnaire snapshot record: ${JSON.stringify(record)}`);
  }
  adapter.setItem(key, JSON.stringify(record));
}

function isValidRecord(value: unknown): value is QuestionnaireSnapshotRecord {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    record.schemaVersion === QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION &&
    typeof record.updatedAt === 'number' &&
    Number.isInteger(record.updatedAt) &&
    Number.isFinite(record.updatedAt) &&
    (record.runId === undefined || (typeof record.runId === 'string' && record.runId !== '')) &&
    isValidSnapshot(record.snapshot)
  );
}

function isValidSnapshot(value: unknown): value is RawAnswerSnapshot {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  if (record.kind === 'detection') {
    const request = record.request;
    if (typeof request !== 'object' || request === null) return false;
    const body = request as Record<string, unknown>;
    return (
      (DETECTION_MATRICES as readonly unknown[]).includes(body.matrix) &&
      (DETECTION_CONTEXTS as readonly unknown[]).includes(body.context)
    );
  }
  if (record.kind !== 'use_profile') return false;
  const profile = record.profile;
  if (typeof profile !== 'object' || profile === null) return false;
  const body = profile as Record<string, unknown>;
  if (!(GOALS as readonly unknown[]).includes(body.goal)) return false;
  if (typeof body.breakRequested !== 'boolean') return false;
  if (body.postBreakMode !== null && !(POST_BREAK_MODES as readonly string[]).includes(body.postBreakMode as string)) {
    return false;
  }
  if (!isCoreSourcedValue(body.thcUseDaysLast30, isIntegerNumber)) return false;
  if (!isCoreSourcedValue(body.sessionsPerUseDay, isIntegerNumber)) return false;
  if (!isCoreSourcedValue(body.lastUseAt, (payload) => typeof payload === 'string')) return false;
  if (body.currentPatternDuration !== undefined) {
    if (
      !isCoreSourcedValue(body.currentPatternDuration, (payload) =>
        typeof payload === 'string' && (CURRENT_PATTERN_DURATION_BANDS as readonly string[]).includes(payload),
      )
    ) {
      return false;
    }
  }
  if (!isStringArrayIn(body.products, PRODUCT_KINDS)) return false;
  if (!isStringArrayIn(body.routes, ROUTES)) return false;
  return Array.isArray(body.previousBreaks);
}

function isIntegerNumber(value: unknown): boolean {
  return typeof value === 'number' && Number.isInteger(value) && Number.isFinite(value);
}

function isStringArrayIn(value: unknown, allowed: readonly string[]): boolean {
  if (!Array.isArray(value)) return false;
  return value.every((item) => typeof item === 'string' && allowed.includes(item));
}
