// Transient questionnaire-progress persistence (UX_SPEC 3.2, 4.1, 16).
//
// An unfinished questionnaire is persisted after every answered step so a
// relaunch never loses answers and the `Today` router can show its resume
// card. v2 stores the current step and the typed answer snapshot the engine
// owns. v1 envelopes (count-only) are incompatible and fail closed.

import {
  QUESTIONNAIRE_STEP_IDS,
  type QuestionnaireAnswers,
  type QuestionnaireStepId,
} from '../questionnaire/engine.ts';
import type { Instant } from '../../domain/schemas/time.ts';
import type { StorageAdapter } from '../../infrastructure/storage/storage-adapter.ts';
import {
  DETECTION_CONTEXTS,
  DETECTION_MATRICES,
  GOALS,
  PRODUCT_KINDS,
  ROUTES,
} from '../../domain/schemas/enums.ts';

export const QUESTIONNAIRE_PROGRESS_SCHEMA_VERSION = 'questionnaire-draft-v2' as const;
export const QUESTIONNAIRE_PROGRESS_KEY = 'tbreak.questionnaire-progress.v1';

export interface QuestionnaireProgressRecord {
  readonly schemaVersion: typeof QUESTIONNAIRE_PROGRESS_SCHEMA_VERSION;
  /** Number of answered steps persisted (>= 1; a draft with 0 answers is not stored). */
  readonly answeredSteps: number;
  readonly updatedAt: Instant;
  readonly currentStep: QuestionnaireStepId;
  readonly answers: QuestionnaireAnswers;
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
  if (!isValidRecord(record)) {
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
    Number.isFinite(record.updatedAt) &&
    typeof record.currentStep === 'string' &&
    (QUESTIONNAIRE_STEP_IDS as readonly string[]).includes(record.currentStep) &&
    isValidAnswers(record.answers)
  );
}

function isValidAnswers(value: unknown): value is QuestionnaireAnswers {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const allowed = new Set([
    'goal',
    'breakRequested',
    'thcUseDaysLast30',
    'lastUseAt',
    'lastUseSkipped',
    'sessionsPerUseDay',
    'products',
    'routes',
    'detectionMatrix',
    'detectionContext',
  ]);
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) return false;
  }
  if (record.goal !== undefined && !(GOALS as readonly unknown[]).includes(record.goal)) return false;
  if (record.breakRequested !== undefined && typeof record.breakRequested !== 'boolean') return false;
  if (
    record.thcUseDaysLast30 !== undefined &&
    (typeof record.thcUseDaysLast30 !== 'number' ||
      !Number.isInteger(record.thcUseDaysLast30) ||
      record.thcUseDaysLast30 < 0 ||
      record.thcUseDaysLast30 > 30)
  ) {
    return false;
  }
  if (record.lastUseAt !== undefined && typeof record.lastUseAt !== 'string') return false;
  if (record.lastUseSkipped !== undefined && typeof record.lastUseSkipped !== 'boolean') return false;
  if (
    record.sessionsPerUseDay !== undefined &&
    (typeof record.sessionsPerUseDay !== 'number' ||
      !Number.isInteger(record.sessionsPerUseDay) ||
      record.sessionsPerUseDay < 1 ||
      record.sessionsPerUseDay > 9)
  ) {
    return false;
  }
  if (record.products !== undefined && !isStringArrayIn(record.products, PRODUCT_KINDS)) return false;
  if (record.routes !== undefined && !isStringArrayIn(record.routes, ROUTES)) return false;
  if (
    record.detectionMatrix !== undefined &&
    !(DETECTION_MATRICES as readonly unknown[]).includes(record.detectionMatrix)
  ) {
    return false;
  }
  if (
    record.detectionContext !== undefined &&
    !(DETECTION_CONTEXTS as readonly unknown[]).includes(record.detectionContext)
  ) {
    return false;
  }
  return true;
}

function isStringArrayIn(value: unknown, allowed: readonly string[]): boolean {
  if (!Array.isArray(value)) return false;
  return value.every((item) => typeof item === 'string' && allowed.includes(item));
}
