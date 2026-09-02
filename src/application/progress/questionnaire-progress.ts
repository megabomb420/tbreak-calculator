// Transient questionnaire-progress persistence (UX_SPEC 3.2, 4.1, 16).
//
// An unfinished questionnaire is persisted after every answered step so a
// relaunch never loses answers and the `Today` router can show its resume
// card. The record is an envelope: the actual step answers are owned by the
// future questionnaire engine; this slice persists the presence, progress
// count and update time the router needs. Save and clear take explicit
// instants/values and never read a clock.

import type { Instant } from '../../domain/schemas/time.ts';
import type { StorageAdapter } from '../../infrastructure/storage/storage-adapter.ts';

export const QUESTIONNAIRE_PROGRESS_SCHEMA_VERSION = 'questionnaire-draft-v1';
export const QUESTIONNAIRE_PROGRESS_KEY = 'tbreak.questionnaire-progress.v1';

export interface QuestionnaireProgressRecord {
  readonly schemaVersion: typeof QUESTIONNAIRE_PROGRESS_SCHEMA_VERSION;
  /** Number of answered steps persisted (>= 1; a draft with 0 answers is not stored). */
  readonly answeredSteps: number;
  readonly updatedAt: Instant;
}

export interface QuestionnaireProgressStore {
  /** Latest persisted draft, or null when none exists or the stored record is corrupt. */
  readonly load: () => QuestionnaireProgressRecord | null;
  readonly save: (record: QuestionnaireProgressRecord) => void;
  readonly clear: () => void;
}

export function createQuestionnaireProgressStore(
  adapter: StorageAdapter,
  key: string = QUESTIONNAIRE_PROGRESS_KEY,
): QuestionnaireProgressStore {
  return {
    load: () => readProgress(adapter, key),
    save: (record) => writeProgress(adapter, key, record),
    clear: () => {
      adapter.removeItem(key);
    },
  };
}

function readProgress(adapter: StorageAdapter, key: string): QuestionnaireProgressRecord | null {
  const raw = adapter.getItem(key);
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Corrupt transient draft: drop it and treat it as absent (UX_SPEC 13.3).
    adapter.removeItem(key);
    return null;
  }
  if (!isValidRecord(parsed)) {
    adapter.removeItem(key);
    return null;
  }
  return parsed;
}

function writeProgress(adapter: StorageAdapter, key: string, record: QuestionnaireProgressRecord): void {
  if (
    !Number.isInteger(record.answeredSteps) ||
    record.answeredSteps < 1 ||
    !Number.isInteger(record.updatedAt) ||
    !Number.isFinite(record.updatedAt)
  ) {
    throw new RangeError(`invalid questionnaire progress record: ${JSON.stringify(record)}`);
  }
  adapter.setItem(key, JSON.stringify(record));
}

function isValidRecord(value: unknown): value is QuestionnaireProgressRecord {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    record.schemaVersion === QUESTIONNAIRE_PROGRESS_SCHEMA_VERSION &&
    typeof record.answeredSteps === 'number' &&
    Number.isInteger(record.answeredSteps) &&
    record.answeredSteps >= 1 &&
    typeof record.updatedAt === 'number' &&
    Number.isInteger(record.updatedAt) &&
    Number.isFinite(record.updatedAt)
  );
}
