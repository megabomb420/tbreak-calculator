// Durable persistence facade (ARCHITECTURE §9).
//
// After hydration, this is the single source of truth for durable records.
// The questionnaire draft and result-view overlay stay on the Web Storage
// adapter. IndexedDB backs this facade in production; tests and storage-degraded
// sessions use the same interface over the versioned Web Storage envelopes.

import type { StorageAdapter } from '../../infrastructure/storage/storage-adapter.ts';
import type { Instant } from '../../domain/schemas/time.ts';
import type { DailyCheckin } from '../../domain/schemas/profile.ts';
import {
  BREAK_ATTEMPTS_KEY,
  createBreakAttemptsStore,
  emptyBreakAttemptsRecord,
  type StoredAttempt,
} from '../progress/break-attempt-record.ts';
import {
  CHECKINS_KEY,
  createCheckinsStore,
  emptyCheckinsRecord,
} from '../progress/checkin-store.ts';
import {
  createTrackingRecordsStore,
  emptyTrackingRecordsRecord,
  TRACKING_RECORDS_KEY,
  type StoredTrack,
} from '../progress/tracking-record.ts';
import {
  createReductionPlanStore,
  REDUCTION_PLAN_KEY,
  type ReductionPlanRecord,
} from '../progress/reduction-plan.ts';
import {
  createReductionRecordsStore,
  emptyReductionRecords,
  REDUCTION_RECORDS_KEY,
} from '../progress/reduction-record.ts';
import type { ReductionPlan } from '../../domain/reduction/reduction-engine.ts';
import {
  createCheckinReminderStore,
  CHECKIN_REMINDER_KEY,
  type CheckinReminderRecord,
} from '../progress/reminder-store.ts';
import {
  createUrgeSessionsStore,
  emptyUrgeSessionsRecord,
  URGE_SESSIONS_KEY,
  type UrgeSession,
} from '../progress/urge-session-record.ts';
import {
  createBreakOutcomeStore,
  emptyBreakOutcomeEnvelope,
  BREAK_OUTCOME_KEY,
  type OutcomeMark,
} from '../progress/break-outcome.ts';
import {
  createQuestionnaireSnapshotStore,
  QUESTIONNAIRE_SNAPSHOT_KEY,
  type QuestionnaireSnapshotRecord,
} from '../progress/questionnaire-snapshot.ts';
import { COMPANION_PERSONALISATION_KEY } from '../progress/companion-personalisation.ts';
import { QUESTIONNAIRE_PROGRESS_KEY } from '../progress/questionnaire-progress.ts';
import { RESULT_VIEW_KEY } from '../progress/result-view.ts';
import {
  CALCULATION_RECORDS_KEY,
  createCalculationRecordsStore,
  emptyCalculationRecords,
  freezeCalculation,
  type CalculationRecord,
} from './calculation-record.ts';
import {
  createPreviousBreaksStore,
  PREVIOUS_BREAKS_KEY,
  type StoredPreviousBreak,
} from './previous-break-store.ts';
import {
  createPostBreakPlansStore,
  emptyPostBreakPlans,
  plansFromAttempts,
  POST_BREAK_PLANS_KEY,
  type StoredPostBreakPlan,
} from './post-break-plan-store.ts';
import { checkinRecordId } from './ids.ts';

export const DURABLE_IDB_NAME = 'tbreak-calculator';
// 2 adds the urgeSessions store; a missing store is created on upgrade and
// every existing family keeps its rows.
export const DURABLE_IDB_VERSION = 2;
export const MIGRATION_MARKER_KEY = 'tbreak.durable-migration.v1';

/** Web Storage keys owned by this app. Delete-everything removes only these. */
export const INSTALL_HINT_DISMISSED_KEY = 'tbreak.install-hint.v1';

/** Keys owned by this app; delete-everything removes exactly these. */
export const LOCAL_DATA_KEYS = [
  QUESTIONNAIRE_PROGRESS_KEY,
  INSTALL_HINT_DISMISSED_KEY,
  QUESTIONNAIRE_SNAPSHOT_KEY,
  COMPANION_PERSONALISATION_KEY,
  RESULT_VIEW_KEY,
  BREAK_ATTEMPTS_KEY,
  TRACKING_RECORDS_KEY,
  CHECKINS_KEY,
  REDUCTION_PLAN_KEY,
  REDUCTION_RECORDS_KEY,
  CALCULATION_RECORDS_KEY,
  PREVIOUS_BREAKS_KEY,
  POST_BREAK_PLANS_KEY,
  BREAK_OUTCOME_KEY,
  URGE_SESSIONS_KEY,
  CHECKIN_REMINDER_KEY,
  MIGRATION_MARKER_KEY,
] as const;

/** Durable families that move onto IndexedDB. Draft + result-view stay on Web Storage. */
export const MIGRATED_WEB_STORAGE_KEYS = [
  QUESTIONNAIRE_SNAPSHOT_KEY,
  BREAK_ATTEMPTS_KEY,
  TRACKING_RECORDS_KEY,
  CHECKINS_KEY,
  REDUCTION_PLAN_KEY,
  REDUCTION_RECORDS_KEY,
  CALCULATION_RECORDS_KEY,
  PREVIOUS_BREAKS_KEY,
  POST_BREAK_PLANS_KEY,
  BREAK_OUTCOME_KEY,
] as const;

export type HistoryRecordKind =
  | 'calculation'
  | 'attempt'
  | 'tracking'
  | 'checkin'
  | 'previous-break'
  | 'reduction'
  | 'urge'
  | 'corrupt';

export interface CorruptHistoryRow {
  readonly id: string;
  readonly kind: HistoryRecordKind;
  readonly reason: string;
  /** IndexedDB store the rejected row was read from. A store is not derivable
   * from the kind: a post-break plan is displayed as its attempt family and a
   * corrupt outcome mark has no family of its own, so the origin store — not
   * the kind — decides which row a delete removes. Absent on the Web Storage
   * envelopes, which delete by id inside the family that owns the row. */
  readonly origin?: string;
}

export interface DurableSnapshot {
  readonly attempts: readonly StoredAttempt[];
  readonly tracking: readonly StoredTrack[];
  readonly checkins: readonly DailyCheckin[];
  readonly reductionPlan: ReductionPlanRecord | null;
  readonly reductionRecords: readonly ReductionPlan[];
  readonly outcomeMarks: readonly OutcomeMark[];
  readonly urgeSessions: readonly UrgeSession[];
  readonly reminder: CheckinReminderRecord | null;
  readonly snapshot: QuestionnaireSnapshotRecord | null;
  readonly calculations: readonly CalculationRecord[];
  readonly previousBreaks: readonly StoredPreviousBreak[];
  readonly postBreakPlans: readonly StoredPostBreakPlan[];
  readonly corrupt: readonly CorruptHistoryRow[];
}

export interface DurablePersistence {
  readonly persistent: boolean;
  readonly backend: 'indexeddb' | 'web-storage' | 'memory';
  /** True while writes are failing, so a rejected write is never silent. */
  readonly writeFailed: boolean;
  /** Subscribes to write-failure transitions. Idempotent while failures keep
   * coming: `true` is reported once, then only when a later write succeeds. */
  onWriteFailure(listener: (failed: boolean) => void): () => void;
  load(): DurableSnapshot;
  saveAttempts(attempts: readonly StoredAttempt[]): void;
  saveTracking(records: readonly StoredTrack[]): void;
  saveCheckins(checkins: readonly DailyCheckin[]): void;
  saveReductionPlan(plan: ReductionPlanRecord | null): void;
  saveReductionRecords(records: readonly ReductionPlan[]): void;
  saveOutcomeMarks(marks: readonly OutcomeMark[]): void;
  saveUrgeSessions(sessions: readonly UrgeSession[]): void;
  saveReminder(record: CheckinReminderRecord | null): void;
  saveSnapshot(record: QuestionnaireSnapshotRecord | null): void;
  putCalculation(record: CalculationRecord): void;
  deleteCalculation(id: string): void;
  putPreviousBreak(record: StoredPreviousBreak): void;
  deletePreviousBreak(id: string): void;
  deleteAttempt(id: string): void;
  deleteTracking(id: string): void;
  deleteCheckin(id: string): void;
  deleteUrgeSession(id: string): void;
  deleteReductionPlan(id: string): void;
  deleteCorrupt(id: string): void;
  deleteAll(): void;
  flush(): Promise<void>;
}

export function emptyDurableSnapshot(): DurableSnapshot {
  return {
    attempts: [],
    tracking: [],
    checkins: [],
    reductionPlan: null,
    reductionRecords: [],
    outcomeMarks: [],
    urgeSessions: [],
    reminder: null,
    snapshot: null,
    calculations: [],
    previousBreaks: [],
    postBreakPlans: [],
    corrupt: [],
  };
}

export function createWebBackedDurable(
  adapter: StorageAdapter,
  options: { readonly persistent?: boolean; readonly backend?: DurablePersistence['backend'] } = {},
): DurablePersistence {
  const listeners = new Set<(failed: boolean) => void>();
  let writeFailed = false;

  /** A rejected envelope write (quota, private mode) stays out of the UI. */
  function write(work: () => void): void {
    try {
      work();
      if (writeFailed) {
        writeFailed = false;
        for (const listener of listeners) listener(false);
      }
    } catch (error) {
      if (!writeFailed) {
        writeFailed = true;
        for (const listener of listeners) listener(true);
      }
      throw error;
    }
  }

  const attemptsStore = createBreakAttemptsStore(adapter);
  const trackingStore = createTrackingRecordsStore(adapter);
  const checkinsStore = createCheckinsStore(adapter);
  const reductionStore = createReductionPlanStore(adapter);
  const reductionRecordsStore = createReductionRecordsStore(adapter);
  const outcomeStore = createBreakOutcomeStore(adapter);
  const urgeStore = createUrgeSessionsStore(adapter);
  const reminderStore = createCheckinReminderStore(adapter);
  const snapshots = createQuestionnaireSnapshotStore(adapter);
  const calculationsStore = createCalculationRecordsStore(adapter);
  const previousBreaksStore = createPreviousBreaksStore(adapter);
  const postBreakPlansStore = createPostBreakPlansStore(adapter);
  const persistent = options.persistent ?? true;
  const backend = options.backend ?? 'web-storage';

  function load(): DurableSnapshot {
    const attempts = attemptsStore.load();
    const tracking = trackingStore.load();
    const checkins = checkinsStore.load();
    const urgeSessions = urgeStore.load();
    const reminder = reminderStore.load();
    const calculations = calculationsStore.load();
    const previousBreaks = previousBreaksStore.load();
    const postBreakPlans = postBreakPlansStore.load();
    const snapshot = snapshots.load();
    const corrupt: CorruptHistoryRow[] = [
      ...calculations.corrupt.map((row) => ({ id: row.id, kind: 'calculation' as const, reason: row.reason })),
      ...previousBreaks.corrupt.map((row) => ({ id: row.id, kind: 'previous-break' as const, reason: row.reason })),
    ];
    return {
      attempts: attempts?.attempts ?? [],
      tracking: tracking?.records ?? [],
      checkins: checkins?.checkins ?? [],
      reductionPlan: reductionStore.load(),
      reductionRecords: reductionRecordsStore.load().plans,
      outcomeMarks: outcomeStore.load().marks,
      urgeSessions: urgeSessions.sessions,
      reminder,
      snapshot,
      calculations: calculations.records,
      previousBreaks: previousBreaks.records,
      postBreakPlans: postBreakPlans.records,
      corrupt,
    };
  }

  const api: DurablePersistence = {
    persistent,
    backend,
    get writeFailed() {
      return writeFailed;
    },
    onWriteFailure(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    load,
    saveAttempts(attempts) {
      const next = { ...emptyBreakAttemptsRecord(), attempts: [...attempts] };
      const plans = { ...emptyPostBreakPlans(), records: [...plansFromAttempts(attempts)] };
      write(() => {
        attemptsStore.save(next);
        postBreakPlansStore.save(plans);
      });
    },
    saveTracking(records) {
      const next = { ...emptyTrackingRecordsRecord(), records: [...records] };
      write(() => {
        trackingStore.save(next);
      });
    },
    saveCheckins(checkins) {
      const next = { ...emptyCheckinsRecord(), checkins: [...checkins] };
      write(() => {
        checkinsStore.save(next);
      });
    },
    saveReductionPlan(plan) {
      write(() => {
        if (plan === null) reductionStore.clear();
        else reductionStore.save(plan);
      });
    },
    saveReductionRecords(records) {
      const next = { ...emptyReductionRecords(), plans: [...records] };
      write(() => {
        reductionRecordsStore.save(next);
      });
    },
    saveOutcomeMarks(marks) {
      const next = { ...emptyBreakOutcomeEnvelope(), marks: [...marks] };
      write(() => {
        outcomeStore.save(next);
      });
    },
    saveUrgeSessions(sessions) {
      const next = { ...emptyUrgeSessionsRecord(), sessions: [...sessions] };
      write(() => {
        urgeStore.save(next);
      });
    },
    saveReminder(record) {
      write(() => {
        if (record === null) reminderStore.clear();
        else reminderStore.save(record);
      });
    },
    saveSnapshot(record) {
      write(() => {
        if (record === null) snapshots.clear();
        else snapshots.save(record);
      });
    },
    putCalculation(record) {
      const current = calculationsStore.load();
      const records = [record, ...current.records.filter((item) => item.id !== record.id)];
      write(() => {
        calculationsStore.save({ ...emptyCalculationRecords(), records, corrupt: current.corrupt });
      });
    },
    deleteCalculation(id) {
      const current = calculationsStore.load();
      write(() => {
        calculationsStore.save({
          ...emptyCalculationRecords(),
          records: current.records.filter((item) => item.id !== id),
          corrupt: current.corrupt.filter((item) => item.id !== id),
        });
      });
    },
    putPreviousBreak(record) {
      const current = previousBreaksStore.load();
      const records = [record, ...current.records.filter((item) => item.id !== record.id)];
      write(() => {
        previousBreaksStore.save({ schemaVersion: current.schemaVersion, records, corrupt: current.corrupt });
      });
    },
    deletePreviousBreak(id) {
      const current = previousBreaksStore.load();
      write(() => {
        previousBreaksStore.save({
          schemaVersion: current.schemaVersion,
          records: current.records.filter((item) => item.id !== id),
          corrupt: current.corrupt.filter((item) => item.id !== id),
        });
      });
    },
    deleteAttempt(id) {
      const current = load();
      api.saveAttempts(current.attempts.filter((item) => item.id !== id));
    },
    deleteReductionPlan(id) {
      const current = load();
      api.saveReductionRecords(current.reductionRecords.filter((item) => item.id !== id));
    },
    deleteTracking(id) {
      const current = load();
      api.saveTracking(current.tracking.filter((item) => item.id !== id));
    },
    deleteCheckin(id) {
      const current = load();
      api.saveCheckins(current.checkins.filter((item) => checkinRecordId(item.recordedAt) !== id));
    },
    deleteUrgeSession(id) {
      const current = load();
      api.saveUrgeSessions(current.urgeSessions.filter((item) => item.id !== id));
    },
    deleteCorrupt(id) {
      // An id is unique inside its family, never across families: only the
      // family that reported the corrupt row may lose a record under that id.
      const owner = load().corrupt.find((item) => item.id === id)?.kind;
      const calculations = calculationsStore.load();
      write(() => {
        calculationsStore.save({
          ...emptyCalculationRecords(),
          records:
            owner === 'calculation'
              ? calculations.records.filter((item) => item.id !== id)
              : calculations.records,
          corrupt: calculations.corrupt.filter((item) => item.id !== id),
        });
      });
      const previous = previousBreaksStore.load();
      write(() => {
        previousBreaksStore.save({
          schemaVersion: previous.schemaVersion,
          records:
            owner === 'previous-break'
              ? previous.records.filter((item) => item.id !== id)
              : previous.records,
          corrupt: previous.corrupt.filter((item) => item.id !== id),
        });
      });
    },
    deleteAll() {
      write(() => {
        for (const key of LOCAL_DATA_KEYS) {
          adapter.removeItem(key);
        }
      });
    },
    flush() {
      return Promise.resolve();
    },
  };
  return api;
}

/** Materialize a calculation record from a v0.3.x snapshot that never stored one.
 * Uses the snapshot as frozen at its original `updatedAt`. Does not merge later
 * previous-break records — that would invent a historical insight.
 * If the snapshot already has a `runId`, a missing calculation is treated as
 * deleted and is never recreated. */
export function ensureCalculationFromSnapshot(
  durable: DurablePersistence,
  snapshot: QuestionnaireSnapshotRecord,
): CalculationRecord | null {
  const existing = durable.load();
  if (snapshot.runId !== undefined) {
    return existing.calculations.find((item) => item.id === snapshot.runId) ?? null;
  }
  const byTime = existing.calculations.find((item) => item.calculatedAt === snapshot.updatedAt);
  if (byTime !== undefined) return byTime;
  const id = `calc-migrated-${snapshot.updatedAt}`;
  try {
    const frozen = freezeCalculation(id, snapshot.snapshot, snapshot.updatedAt as Instant);
    durable.putCalculation(frozen);
    durable.saveSnapshot({ ...snapshot, runId: frozen.id });
    return frozen;
  } catch {
    return null;
  }
}

/** Wipe T-Break-owned durable records and remaining Web Storage keys.
 * Never calls `adapter.clear()` so a shared origin is not wiped wholesale. */
export function deleteAllLocalData(adapter: StorageAdapter, durable?: DurablePersistence): void {
  durable?.deleteAll();
  for (const key of LOCAL_DATA_KEYS) {
    adapter.removeItem(key);
  }
}

export function deleteHistoryRecord(durable: DurablePersistence, kind: HistoryRecordKind, id: string): void {
  switch (kind) {
    case 'calculation':
      durable.deleteCalculation(id);
      return;
    case 'attempt':
      durable.deleteAttempt(id);
      return;
    case 'tracking':
      durable.deleteTracking(id);
      return;
    case 'reduction':
      durable.deleteReductionPlan(id);
      return;
    case 'checkin':
      durable.deleteCheckin(id);
      return;
    case 'previous-break':
      durable.deletePreviousBreak(id);
      return;
    case 'urge':
      durable.deleteUrgeSession(id);
      return;
    case 'corrupt':
      durable.deleteCorrupt(id);
  }
}
