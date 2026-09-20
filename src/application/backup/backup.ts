// Local backup: one JSON file carrying every durable record the user creates
// (ARCHITECTURE §9). The envelope has its own format version; stored records
// keep their existing schemas and versions and are never rewritten on import.
//
// Import validates every store with the parser the store itself uses on load.
// Nothing is written until the whole file has been accepted, so a corrupt or
// partial file can never leave the app half-restored.

import type { StorageAdapter } from '../../infrastructure/storage/storage-adapter.ts';
import type { Instant } from '../../domain/schemas/time.ts';
import type { DailyCheckin } from '../../domain/schemas/profile.ts';
import { validateDailyCheckin } from '../../domain/validation/checkin-validation.ts';
import type { ReductionPlan } from '../../domain/reduction/reduction-engine.ts';
import {
  COMPANION_PERSONALISATION_VERSION,
  isCompanionPersonalisationV2,
  type CompanionPersonalisationV2,
} from '../questionnaire/companion.ts';
import {
  isValidStoredAttempt,
  BREAK_ATTEMPTS_KEY,
  type StoredAttempt,
} from '../progress/break-attempt-record.ts';
import { isValidStoredTrack, TRACKING_RECORDS_KEY, type StoredTrack } from '../progress/tracking-record.ts';
import { CHECKINS_KEY } from '../progress/checkin-store.ts';
import { isValidOutcomeMark, BREAK_OUTCOME_KEY, type OutcomeMark } from '../progress/break-outcome.ts';
import {
  isValidReductionPlanRecord,
  REDUCTION_PLAN_KEY,
  type ReductionPlanRecord,
} from '../progress/reduction-plan.ts';
import { isValidReductionPlan, REDUCTION_RECORDS_KEY } from '../progress/reduction-record.ts';
import {
  isValidQuestionnaireSnapshotRecord,
  QUESTIONNAIRE_SNAPSHOT_KEY,
  type QuestionnaireSnapshotRecord,
} from '../progress/questionnaire-snapshot.ts';
import { QUESTIONNAIRE_PROGRESS_KEY } from '../progress/questionnaire-progress.ts';
import { RESULT_VIEW_KEY } from '../progress/result-view.ts';
import {
  COMPANION_PERSONALISATION_KEY,
  createCompanionPersonalisationStore,
} from '../progress/companion-personalisation.ts';
import {
  CALCULATION_RECORDS_KEY,
  isValidCalculationRecord,
  type CalculationRecord,
} from '../persistence/calculation-record.ts';
import {
  isValidStoredPreviousBreak,
  PREVIOUS_BREAKS_KEY,
  type StoredPreviousBreak,
} from '../persistence/previous-break-store.ts';
import { POST_BREAK_PLANS_KEY } from '../persistence/post-break-plan-store.ts';
import { deleteAllLocalData, MIGRATION_MARKER_KEY, type DurablePersistence } from '../persistence/durable.ts';
import { isRecord } from '../progress/record-codec.ts';

export const BACKUP_FORMAT = 'tbreak-backup';
export const BACKUP_FORMAT_VERSION = 1;

export interface BackupInput {
  readonly durable: DurablePersistence;
  readonly adapter: StorageAdapter;
}

export interface BackupMeta {
  readonly exportedAt: Instant;
  readonly appVersion: string;
}

/** The file on the user's device. `data` holds one validated store payload per key. */
export interface BackupFile {
  readonly format: typeof BACKUP_FORMAT;
  readonly formatVersion: number;
  readonly appVersion: string;
  readonly exportedAt: string;
  readonly data: Readonly<Record<string, unknown>>;
}

export interface ParsedBackup {
  readonly appVersion: string;
  readonly exportedAt: string;
  readonly data: Readonly<Record<BackupStoreKey, unknown>>;
}

export type BackupError =
  | { readonly kind: 'unreadable' }
  | { readonly kind: 'format' }
  | { readonly kind: 'format_version' }
  | { readonly kind: 'newer_format' }
  | { readonly kind: 'data' }
  | { readonly kind: 'store_invalid'; readonly store: BackupStoreKey };

export type BackupParseResult =
  | { readonly ok: true; readonly backup: ParsedBackup }
  | { readonly ok: false; readonly error: BackupError };

export interface BackupCount {
  readonly store: BackupStoreKey;
  readonly count: number;
}

const INVALID = Symbol('invalid-store-payload');

interface BackupStore {
  readonly keys: readonly string[];
  readonly read: (input: BackupInput) => unknown;
  readonly empty: () => unknown;
  readonly parse: (value: unknown) => { readonly ok: true; readonly value: unknown } | { readonly ok: false };
  readonly write: (input: BackupInput, value: unknown) => void;
  readonly count: (value: unknown) => number;
}

/** One record family in the file. `keys` are the Web Storage keys the family
 * owns: every owned key must be claimed by a store or listed as excluded.
 * `parse` reuses the store's own load-time parser; `write` only ever receives
 * a value produced by `parse` or `empty` for the same store. */
function defineBackupStore<T>(spec: {
  readonly keys: readonly string[];
  readonly read: (input: BackupInput) => T;
  readonly empty: () => T;
  readonly parse: (value: unknown) => T | typeof INVALID;
  readonly write: (input: BackupInput, value: T) => void;
  readonly count: (value: T) => number;
}): BackupStore {
  return {
    keys: spec.keys,
    read: spec.read,
    empty: spec.empty,
    parse: (value) => {
      const parsed = spec.parse(value);
      return parsed === INVALID ? { ok: false } : { ok: true, value: parsed };
    },
    write: (input, value) => {
      spec.write(input, value as T);
    },
    count: (value) => spec.count(value as T),
  };
}

const STORES = {
  snapshot: defineBackupStore<QuestionnaireSnapshotRecord | null>({
    keys: [QUESTIONNAIRE_SNAPSHOT_KEY],
    read: (input) => input.durable.load().snapshot,
    empty: () => null,
    parse: (value) => (value === null || isValidQuestionnaireSnapshotRecord(value) ? value : INVALID),
    write: (input, record) => {
      input.durable.saveSnapshot(record);
    },
    count: (record) => (record === null ? 0 : 1),
  }),
  calculations: defineBackupStore<readonly CalculationRecord[]>({
    keys: [CALCULATION_RECORDS_KEY],
    read: (input) => input.durable.load().calculations,
    empty: () => [],
    parse: (value) => (Array.isArray(value) && value.every(isValidCalculationRecord) ? value : INVALID),
    write: (input, records) => {
      for (const record of records) input.durable.putCalculation(record);
    },
    count: (records) => records.length,
  }),
  attempts: defineBackupStore<readonly StoredAttempt[]>({
    keys: [BREAK_ATTEMPTS_KEY],
    read: (input) => input.durable.load().attempts,
    empty: () => [],
    parse: (value) => (Array.isArray(value) && value.every(isValidStoredAttempt) ? value : INVALID),
    write: (input, attempts) => {
      input.durable.saveAttempts(attempts);
    },
    count: (attempts) => attempts.length,
  }),
  tracking: defineBackupStore<readonly StoredTrack[]>({
    keys: [TRACKING_RECORDS_KEY],
    read: (input) => input.durable.load().tracking,
    empty: () => [],
    parse: (value) => (Array.isArray(value) && value.every(isValidStoredTrack) ? value : INVALID),
    write: (input, records) => {
      input.durable.saveTracking(records);
    },
    count: (records) => records.length,
  }),
  checkins: defineBackupStore<readonly DailyCheckin[]>({
    keys: [CHECKINS_KEY],
    read: (input) => input.durable.load().checkins,
    empty: () => [],
    parse: (value) => {
      if (!Array.isArray(value)) return INVALID;
      const checkins: DailyCheckin[] = [];
      for (const row of value) {
        const outcome = validateDailyCheckin(row);
        if (!outcome.ok) return INVALID;
        checkins.push(outcome.checkin);
      }
      return checkins;
    },
    write: (input, checkins) => {
      input.durable.saveCheckins(checkins);
    },
    count: (checkins) => checkins.length,
  }),
  previousBreaks: defineBackupStore<readonly StoredPreviousBreak[]>({
    keys: [PREVIOUS_BREAKS_KEY],
    read: (input) => input.durable.load().previousBreaks,
    empty: () => [],
    parse: (value) => (Array.isArray(value) && value.every(isValidStoredPreviousBreak) ? value : INVALID),
    write: (input, records) => {
      for (const record of records) input.durable.putPreviousBreak(record);
    },
    count: (records) => records.length,
  }),
  reductionRecords: defineBackupStore<readonly ReductionPlan[]>({
    keys: [REDUCTION_RECORDS_KEY],
    read: (input) => input.durable.load().reductionRecords,
    empty: () => [],
    parse: (value) => (Array.isArray(value) && value.every(isValidReductionPlan) ? value : INVALID),
    write: (input, plans) => {
      input.durable.saveReductionRecords(plans);
    },
    count: (plans) => plans.length,
  }),
  reductionPlan: defineBackupStore<ReductionPlanRecord | null>({
    keys: [REDUCTION_PLAN_KEY],
    read: (input) => input.durable.load().reductionPlan,
    empty: () => null,
    parse: (value) => (value === null || isValidReductionPlanRecord(value) ? value : INVALID),
    write: (input, record) => {
      input.durable.saveReductionPlan(record);
    },
    count: (record) => (record === null ? 0 : 1),
  }),
  outcomeMarks: defineBackupStore<readonly OutcomeMark[]>({
    keys: [BREAK_OUTCOME_KEY],
    read: (input) => input.durable.load().outcomeMarks,
    empty: () => [],
    parse: (value) => (Array.isArray(value) && value.every(isValidOutcomeMark) ? value : INVALID),
    write: (input, marks) => {
      input.durable.saveOutcomeMarks(marks);
    },
    count: (marks) => marks.length,
  }),
  companionPersonalisation: defineBackupStore<CompanionPersonalisationV2>({
    keys: [COMPANION_PERSONALISATION_KEY],
    read: (input) => createCompanionPersonalisationStore(input.adapter).loadOrMigrate(),
    empty: () => ({ schemaVersion: COMPANION_PERSONALISATION_VERSION, supportAreas: [] }),
    parse: (value) =>
      isCompanionPersonalisationV2(value) && new Set(value.supportAreas).size === value.supportAreas.length
        ? value
        : INVALID,
    write: (input, record) => {
      createCompanionPersonalisationStore(input.adapter).saveAreas(record.supportAreas);
    },
    count: (record) => record.supportAreas.length,
  }),
} as const;

export type BackupStoreKey = keyof typeof STORES;

/** Every backed-up record family, in file order. Export, validation, import
 * counts and import writes all iterate this one list. */
export const BACKUP_STORE_KEYS = Object.keys(STORES) as readonly BackupStoreKey[];

/** Web Storage keys the backup owns. Together with BACKUP_EXCLUDED_KEYS this
 * must account for every LOCAL_DATA_KEYS entry. */
export const BACKUP_OWNED_KEYS = BACKUP_STORE_KEYS.flatMap((key) => STORES[key].keys);

/** Owned keys no backup carries: the unfinished questionnaire draft and the
 * transient result-overlay flag are session state, the post-break mirror is
 * rebuilt from the attempt rows on every write, and the migration marker is
 * written once and never read. */
export const BACKUP_EXCLUDED_KEYS = [
  QUESTIONNAIRE_PROGRESS_KEY,
  RESULT_VIEW_KEY,
  POST_BREAK_PLANS_KEY,
  MIGRATION_MARKER_KEY,
] as const;

/** `DurableSnapshot` fields no backup carries, for the same reasons. */
export const BACKUP_EXCLUDED_SNAPSHOT_FIELDS = ['postBreakPlans', 'corrupt'] as const;

export function createBackup(input: BackupInput, meta: BackupMeta): BackupFile {
  const data: Record<string, unknown> = {};
  for (const key of BACKUP_STORE_KEYS) {
    data[key] = STORES[key].read(input);
  }
  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    appVersion: meta.appVersion,
    exportedAt: new Date(meta.exportedAt).toISOString(),
    data,
  };
}

export function serializeBackup(file: BackupFile): string {
  return JSON.stringify(file, null, 2);
}

export function parseBackup(text: string): BackupParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: { kind: 'unreadable' } };
  }
  if (!isRecord(parsed) || parsed.format !== BACKUP_FORMAT) {
    return { ok: false, error: { kind: 'format' } };
  }
  const version = parsed.formatVersion;
  if (version !== BACKUP_FORMAT_VERSION) {
    return {
      ok: false,
      error: {
        kind: typeof version === 'number' && version > BACKUP_FORMAT_VERSION ? 'newer_format' : 'format_version',
      },
    };
  }
  if (typeof parsed.appVersion !== 'string' || typeof parsed.exportedAt !== 'string') {
    return { ok: false, error: { kind: 'format' } };
  }
  if (!isRecord(parsed.data)) {
    return { ok: false, error: { kind: 'data' } };
  }
  const body = parsed.data;
  const data = {} as Record<BackupStoreKey, unknown>;
  for (const key of BACKUP_STORE_KEYS) {
    const raw = body[key];
    const outcome = STORES[key].parse(raw === undefined ? STORES[key].empty() : raw);
    if (!outcome.ok) return { ok: false, error: { kind: 'store_invalid', store: key } };
    data[key] = outcome.value;
  }
  return { ok: true, backup: { appVersion: parsed.appVersion, exportedAt: parsed.exportedAt, data } };
}

export function backupCounts(backup: ParsedBackup): readonly BackupCount[] {
  return BACKUP_STORE_KEYS.map((store) => ({ store, count: STORES[store].count(backup.data[store]) }));
}

/** Replace every durable record with the file's contents. The wipe goes
 * through the same path as delete-everything, so stores the file omits end up
 * empty rather than keeping the previous device's rows. */
export function applyBackup(input: BackupInput, backup: ParsedBackup): void {
  deleteAllLocalData(input.adapter, input.durable);
  for (const key of BACKUP_STORE_KEYS) {
    STORES[key].write(input, backup.data[key]);
  }
}

/** Download name for an export: `tbreak-backup-YYYY-MM-DD.json` (UTC date). */
export function backupFileName(exportedAt: Instant): string {
  const date = new Date(exportedAt);
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `tbreak-backup-${date.getUTCFullYear()}-${month}-${day}.json`;
}
