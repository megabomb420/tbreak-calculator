// IndexedDB adapter for durable records (ARCHITECTURE §9).
//
// Versioned schema, forward-only. Object stores are per-record. The
// questionnaire draft stays on Web Storage. Opening/migrating is async; after
// hydration the DurablePersistence surface is synchronous (write-through cache).

import type { StorageAdapter } from './storage-adapter.ts';
import type { Instant } from '../../domain/schemas/time.ts';
import type { DailyCheckin } from '../../domain/schemas/profile.ts';
import {
  createWebBackedDurable,
  DURABLE_IDB_NAME,
  DURABLE_IDB_VERSION,
  emptyDurableSnapshot,
  ensureCalculationFromSnapshot,
  MIGRATED_WEB_STORAGE_KEYS,
  MIGRATION_MARKER_KEY,
  type CorruptHistoryRow,
  type DurablePersistence,
  type DurableSnapshot,
  type HistoryRecordKind,
} from '../../application/persistence/durable.ts';
import {
  isValidCalculationRecord,
  type CalculationRecord,
} from '../../application/persistence/calculation-record.ts';
import {
  isValidStoredPreviousBreak,
  type StoredPreviousBreak,
} from '../../application/persistence/previous-break-store.ts';
import {
  isValidStoredPostBreakPlan,
  plansFromAttempts,
  type StoredPostBreakPlan,
} from '../../application/persistence/post-break-plan-store.ts';
import { isValidStoredAttempt, type StoredAttempt } from '../../application/progress/break-attempt-record.ts';
import { isValidStoredTrack, type StoredTrack } from '../../application/progress/tracking-record.ts';
import { validateDailyCheckin } from '../../domain/validation/checkin-validation.ts';
import { checkinRecordId } from '../../application/persistence/ids.ts';
import type { ReductionPlanRecord } from '../../application/progress/reduction-plan.ts';
import type { QuestionnaireSnapshotRecord } from '../../application/progress/questionnaire-snapshot.ts';
import { createReductionPlanStore } from '../../application/progress/reduction-plan.ts';
import { createQuestionnaireSnapshotStore } from '../../application/progress/questionnaire-snapshot.ts';
import { createBreakAttemptsStore } from '../../application/progress/break-attempt-record.ts';
import { createTrackingRecordsStore } from '../../application/progress/tracking-record.ts';
import { createCheckinsStore } from '../../application/progress/checkin-store.ts';
import { createCalculationRecordsStore } from '../../application/persistence/calculation-record.ts';
import { createPreviousBreaksStore } from '../../application/persistence/previous-break-store.ts';
import { isRecord } from '../../application/progress/record-codec.ts';

export const STORES = [
  'meta',
  'calculations',
  'breakAttempts',
  'trackingRecords',
  'checkins',
  'previousBreaks',
  'postBreakPlans',
  'reductionPlans',
  'profiles',
  'settings',
  'corruptRecords',
] as const;
export type StoreName = (typeof STORES)[number];

/** Structural IndexedDB types so this module typechecks without a DOM lib. */
type IdbKey = string | number;

interface IdbRequestLike<T> {
  result: T;
  error: Error | null;
  onsuccess: (() => void) | null;
  onerror: (() => void) | null;
  onupgradeneeded: (() => void) | null;
  onblocked: (() => void) | null;
}

interface IdbObjectStoreLike {
  getAll(): IdbRequestLike<unknown[]>;
  put(value: unknown): IdbRequestLike<unknown>;
  delete(id: IdbKey): IdbRequestLike<unknown>;
  clear(): IdbRequestLike<unknown>;
}

interface IdbTransactionLike {
  objectStore(name: string): IdbObjectStoreLike;
  oncomplete: (() => void) | null;
  onerror: (() => void) | null;
  onabort: (() => void) | null;
  error: Error | null;
}

interface IdbDatabaseLike {
  objectStoreNames: { contains(name: string): boolean };
  createObjectStore(name: string, options: { keyPath: string }): unknown;
  transaction(store: string | readonly string[], mode: 'readonly' | 'readwrite'): IdbTransactionLike;
}

export interface IdbFactoryLike {
  open(name: string, version?: number): IdbRequestLike<IdbDatabaseLike>;
}

function readIndexedDbFactory(): IdbFactoryLike | null {
  try {
    const value = (globalThis as unknown as { indexedDB?: IdbFactoryLike }).indexedDB;
    return value ?? null;
  } catch {
    return null;
  }
}

export interface IdbWriteOps {
  put(store: StoreName, value: unknown): void;
  delete(store: StoreName, id: IdbKey): void;
  clear(store: StoreName): void;
}

export interface IndexedDbBackend {
  getAll(store: StoreName): Promise<unknown[]>;
  put(store: StoreName, value: unknown): Promise<void>;
  delete(store: StoreName, id: IdbKey): Promise<void>;
  clear(store: StoreName): Promise<void>;
  write(stores: readonly StoreName[], mutate: (ops: IdbWriteOps) => void): Promise<void>;
}

function requestToPromise<T>(request: IdbRequestLike<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('indexeddb request failed'));
  });
}

function transactionDone(tx: IdbTransactionLike): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('indexeddb transaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('indexeddb transaction aborted'));
  });
}

export function openIndexedDb(
  indexedDBImpl: IdbFactoryLike | null = readIndexedDbFactory(),
  name: string = DURABLE_IDB_NAME,
  version: number = DURABLE_IDB_VERSION,
): Promise<IndexedDbBackend | null> {
  if (indexedDBImpl === null) return Promise.resolve(null);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: IndexedDbBackend | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    try {
      const request = indexedDBImpl.open(name, version);
      request.onupgradeneeded = () => {
        const db = request.result;
        for (const store of STORES) {
          if (!db.objectStoreNames.contains(store)) {
            db.createObjectStore(store, { keyPath: 'id' });
          }
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        finish(browserBackend(db));
      };
      request.onerror = () => finish(null);
      request.onblocked = () => finish(null);
    } catch {
      finish(null);
    }
  });
}

function browserBackend(db: IdbDatabaseLike): IndexedDbBackend {
  return {
    getAll: (store) => requestToPromise(db.transaction(store, 'readonly').objectStore(store).getAll()),
    put: async (store, value) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).put(value);
      await transactionDone(tx);
    },
    delete: async (store, id) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).delete(id);
      await transactionDone(tx);
    },
    clear: async (store) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).clear();
      await transactionDone(tx);
    },
    write: async (stores, mutate) => {
      const tx = db.transaction([...stores], 'readwrite');
      mutate({
        put: (store, value) => {
          tx.objectStore(store).put(value);
        },
        delete: (store, id) => {
          tx.objectStore(store).delete(id);
        },
        clear: (store) => {
          tx.objectStore(store).clear();
        },
      });
      await transactionDone(tx);
    },
  };
}

/** In-memory IndexedDB stand-in for unit tests. Same wrap/unwrap contract. */
export function createMemoryIndexedDbBackend(): IndexedDbBackend {
  const tables = new Map<StoreName, Map<string, unknown>>();
  for (const store of STORES) tables.set(store, new Map());

  function keyOf(value: unknown, fallback: string): string {
    if (isRecord(value) && typeof value.id === 'string' && value.id !== '') return value.id;
    return fallback;
  }

  return {
    async getAll(store) {
      return [...(tables.get(store)?.values() ?? [])];
    },
    async put(store, value) {
      tables.get(store)?.set(keyOf(value, 'row'), value);
    },
    async delete(store, id) {
      tables.get(store)?.delete(String(id));
    },
    async clear(store) {
      tables.get(store)?.clear();
    },
    async write(stores, mutate) {
      mutate({
        put: (store, value) => {
          tables.get(store)?.set(keyOf(value, 'row'), value);
        },
        delete: (store, id) => {
          tables.get(store)?.delete(String(id));
        },
        clear: (store) => {
          tables.get(store)?.clear();
        },
      });
      void stores;
    },
  };
}

interface CachedRow {
  readonly id: string;
  readonly payload: unknown;
}

async function loadStore<T>(
  backend: IndexedDbBackend,
  store: StoreName,
  validate: (value: unknown) => value is T,
  corruptKind: HistoryRecordKind,
): Promise<{ records: T[]; corrupt: CorruptHistoryRow[] }> {
  const rows = await backend.getAll(store);
  const records: T[] = [];
  const corrupt: CorruptHistoryRow[] = [];
  for (const [index, row] of rows.entries()) {
    const payload = isRecord(row) && 'payload' in row ? row.payload : row;
    if (validate(payload)) {
      records.push(payload);
      continue;
    }
    const id =
      isRecord(row) && typeof row.id === 'string' && row.id !== ''
        ? row.id
        : isRecord(payload) && typeof payload.id === 'string' && payload.id !== ''
          ? payload.id
          : `${store}-corrupt-${index}`;
    corrupt.push({ id, kind: corruptKind, reason: 'invalid-record' });
    try {
      await backend.put('corruptRecords', { id, kind: corruptKind, payload: row });
    } catch {
      // Isolation is best-effort; the invalid row stays out of the live lists.
    }
  }
  return { records, corrupt };
}

function wrap(id: string, payload: unknown): CachedRow {
  return { id, payload };
}

function storeForKind(kind: HistoryRecordKind): StoreName | null {
  switch (kind) {
    case 'calculation':
      return 'calculations';
    case 'attempt':
      return 'breakAttempts';
    case 'tracking':
      return 'trackingRecords';
    case 'checkin':
      return 'checkins';
    case 'previous-break':
      return 'previousBreaks';
    case 'corrupt':
      return 'corruptRecords';
  }
}

export async function hydrateIndexedDbDurable(backend: IndexedDbBackend): Promise<DurableSnapshot> {
  const attempts = await loadStore(backend, 'breakAttempts', isValidStoredAttempt, 'attempt');
  const tracking = await loadStore(backend, 'trackingRecords', isValidStoredTrack, 'tracking');
  const previousBreaks = await loadStore(backend, 'previousBreaks', isValidStoredPreviousBreak, 'previous-break');
  const calculations = await loadStore(backend, 'calculations', isValidCalculationRecord, 'calculation');
  const postBreakPlans = await loadStore(backend, 'postBreakPlans', isValidStoredPostBreakPlan, 'attempt');
  const checkinRows = await backend.getAll('checkins');
  const checkins: DailyCheckin[] = [];
  const corrupt: CorruptHistoryRow[] = [
    ...attempts.corrupt,
    ...tracking.corrupt,
    ...previousBreaks.corrupt,
    ...calculations.corrupt,
    ...postBreakPlans.corrupt,
  ];
  for (const [index, row] of checkinRows.entries()) {
    const payload = isRecord(row) && 'payload' in row ? row.payload : row;
    const outcome = validateDailyCheckin(payload);
    if (outcome.ok) {
      checkins.push(outcome.checkin);
      continue;
    }
    const id = isRecord(row) && typeof row.id === 'string' ? row.id : `checkin-corrupt-${index}`;
    corrupt.push({ id, kind: 'checkin', reason: 'invalid-record' });
    try {
      await backend.put('corruptRecords', { id, kind: 'checkin', payload: row });
    } catch {
      // Isolation is best-effort.
    }
  }
  const profiles = await backend.getAll('profiles');
  const snapshotRow = profiles.find((row) => isRecord(row) && row.id === 'current');
  const snapshotPayload = isRecord(snapshotRow) && 'payload' in snapshotRow ? snapshotRow.payload : snapshotRow;
  const snapshot =
    snapshotPayload !== undefined && isRecord(snapshotPayload) && snapshotPayload.schemaVersion === 'questionnaire-snapshot-v1'
      ? (snapshotPayload as unknown as QuestionnaireSnapshotRecord)
      : null;
  const reductionRows = await backend.getAll('reductionPlans');
  const reductionPayload = reductionRows[0];
  const inner = isRecord(reductionPayload) && 'payload' in reductionPayload ? reductionPayload.payload : reductionPayload;
  const reductionPlan =
    inner !== undefined && isRecord(inner) && inner.schemaVersion === 'reduction-plan-v1'
      ? (inner as unknown as ReductionPlanRecord)
      : null;
  return {
    attempts: attempts.records,
    tracking: tracking.records,
    checkins,
    reductionPlan,
    snapshot,
    calculations: calculations.records,
    previousBreaks: previousBreaks.records,
    postBreakPlans: postBreakPlans.records,
    corrupt,
  };
}

export function createIndexedDbDurable(backend: IndexedDbBackend, initial: DurableSnapshot): DurablePersistence {
  let cache = initial;
  let chain: Promise<void> = Promise.resolve();

  function enqueue(work: () => Promise<void>): void {
    chain = chain.then(work).catch(() => {
      // A failed durable write must not throw into UI; the in-memory cache
      // still holds the change for this session.
    });
  }

  const api: DurablePersistence = {
    persistent: true,
    backend: 'indexeddb',
    load: () => cache,
    saveAttempts(attempts) {
      cache = { ...cache, attempts: [...attempts], postBreakPlans: [...plansFromAttempts(attempts)] };
      const snapshot = cache;
      enqueue(async () => {
        await backend.write(['breakAttempts', 'postBreakPlans'], (ops) => {
          ops.clear('breakAttempts');
          ops.clear('postBreakPlans');
          for (const attempt of snapshot.attempts) {
            ops.put('breakAttempts', wrap(attempt.id, attempt));
          }
          for (const plan of snapshot.postBreakPlans) {
            ops.put('postBreakPlans', wrap(plan.id, plan));
          }
        });
      });
    },
    saveTracking(records) {
      cache = { ...cache, tracking: [...records] };
      const snapshot = cache;
      enqueue(async () => {
        await backend.write(['trackingRecords'], (ops) => {
          ops.clear('trackingRecords');
          for (const record of snapshot.tracking) {
            ops.put('trackingRecords', wrap(record.id, record));
          }
        });
      });
    },
    saveCheckins(checkins) {
      cache = { ...cache, checkins: [...checkins] };
      const snapshot = cache;
      enqueue(async () => {
        await backend.write(['checkins'], (ops) => {
          ops.clear('checkins');
          for (const checkin of snapshot.checkins) {
            ops.put('checkins', wrap(checkinRecordId(checkin.recordedAt), checkin));
          }
        });
      });
    },
    saveReductionPlan(plan) {
      cache = { ...cache, reductionPlan: plan };
      enqueue(async () => {
        await backend.write(['reductionPlans'], (ops) => {
          ops.clear('reductionPlans');
          if (plan !== null) ops.put('reductionPlans', wrap('current', plan));
        });
      });
    },
    saveSnapshot(record) {
      cache = { ...cache, snapshot: record };
      enqueue(async () => {
        await backend.write(['profiles'], (ops) => {
          ops.clear('profiles');
          if (record !== null) ops.put('profiles', wrap('current', record));
        });
      });
    },
    putCalculation(record) {
      cache = {
        ...cache,
        calculations: [record, ...cache.calculations.filter((item) => item.id !== record.id)],
      };
      enqueue(async () => {
        await backend.put('calculations', wrap(record.id, record));
      });
    },
    deleteCalculation(id) {
      cache = { ...cache, calculations: cache.calculations.filter((item) => item.id !== id) };
      enqueue(async () => {
        await backend.delete('calculations', id);
      });
    },
    putPreviousBreak(record) {
      cache = {
        ...cache,
        previousBreaks: [record, ...cache.previousBreaks.filter((item) => item.id !== record.id)],
      };
      enqueue(async () => {
        await backend.put('previousBreaks', wrap(record.id, record));
      });
    },
    deletePreviousBreak(id) {
      cache = { ...cache, previousBreaks: cache.previousBreaks.filter((item) => item.id !== id) };
      enqueue(async () => {
        await backend.delete('previousBreaks', id);
      });
    },
    deleteAttempt(id) {
      api.saveAttempts(cache.attempts.filter((item) => item.id !== id));
    },
    deleteTracking(id) {
      api.saveTracking(cache.tracking.filter((item) => item.id !== id));
    },
    deleteCheckin(id) {
      api.saveCheckins(cache.checkins.filter((item) => checkinRecordId(item.recordedAt) !== id));
    },
    deleteCorrupt(id) {
      const row = cache.corrupt.find((item) => item.id === id);
      cache = {
        ...cache,
        corrupt: cache.corrupt.filter((item) => item.id !== id),
        calculations: cache.calculations.filter((item) => item.id !== id),
        attempts: cache.attempts.filter((item) => item.id !== id),
        tracking: cache.tracking.filter((item) => item.id !== id),
        previousBreaks: cache.previousBreaks.filter((item) => item.id !== id),
        checkins: cache.checkins.filter((item) => checkinRecordId(item.recordedAt) !== id),
      };
      enqueue(async () => {
        await backend.delete('corruptRecords', id);
        const store = storeForKind(row?.kind ?? 'corrupt');
        if (store !== null && store !== 'corruptRecords') {
          await backend.delete(store, id);
        }
      });
    },
    deleteAll() {
      cache = emptyDurableSnapshot();
      enqueue(async () => {
        await backend.write(STORES, (ops) => {
          for (const store of STORES) ops.clear(store);
        });
      });
    },
    flush() {
      return chain;
    },
  };
  return api;
}

export interface MigrationReport {
  readonly ok: boolean;
  readonly copiedFamilies: readonly string[];
  readonly skippedExisting: number;
  readonly failedFamilies: readonly string[];
}

/**
 * Copy v0.3.x Web Storage envelopes into an IndexedDB-backed durable store.
 * Idempotent: existing ids are never overwritten. A failed family leaves its
 * Web Storage envelope in place; other families still migrate.
 */
export function migrateWebStorageIntoDurable(
  durable: DurablePersistence,
  adapter: StorageAdapter,
): MigrationReport {
  const copiedFamilies: string[] = [];
  const failedFamilies: string[] = [];
  let skippedExisting = 0;
  const current = durable.load();

  function run(family: string, work: () => void): void {
    try {
      work();
      copiedFamilies.push(family);
    } catch {
      failedFamilies.push(family);
    }
  }

  run('attempts', () => {
    const loaded = createBreakAttemptsStore(adapter).load();
    if (loaded === null) return;
    const existing = new Set(current.attempts.map((item) => item.id));
    const merged = [...current.attempts];
    for (const attempt of loaded.attempts) {
      if (existing.has(attempt.id)) {
        skippedExisting += 1;
        continue;
      }
      merged.push(attempt);
    }
    durable.saveAttempts(merged);
  });

  run('tracking', () => {
    const loaded = createTrackingRecordsStore(adapter).load();
    if (loaded === null) return;
    const existing = new Set(durable.load().tracking.map((item) => item.id));
    const merged = [...durable.load().tracking];
    for (const record of loaded.records) {
      if (existing.has(record.id)) {
        skippedExisting += 1;
        continue;
      }
      merged.push(record);
    }
    durable.saveTracking(merged);
  });

  run('checkins', () => {
    const loaded = createCheckinsStore(adapter).load();
    if (loaded === null) return;
    const existing = new Set(durable.load().checkins.map((item) => item.recordedAt));
    const merged = [...durable.load().checkins];
    for (const checkin of loaded.checkins) {
      if (existing.has(checkin.recordedAt)) {
        skippedExisting += 1;
        continue;
      }
      merged.push(checkin);
    }
    durable.saveCheckins(merged);
  });

  run('reductionPlan', () => {
    const loaded = createReductionPlanStore(adapter).load();
    if (loaded === null) return;
    if (durable.load().reductionPlan !== null) {
      skippedExisting += 1;
      return;
    }
    durable.saveReductionPlan(loaded);
  });

  run('snapshot', () => {
    const loaded = createQuestionnaireSnapshotStore(adapter).load();
    if (loaded === null) return;
    if (durable.load().snapshot !== null) {
      skippedExisting += 1;
    } else {
      durable.saveSnapshot(loaded);
    }
    ensureCalculationFromSnapshot(durable, durable.load().snapshot ?? loaded);
  });

  run('calculations', () => {
    const loaded = createCalculationRecordsStore(adapter).load();
    const existing = new Set(durable.load().calculations.map((item) => item.id));
    for (const record of loaded.records) {
      if (existing.has(record.id)) {
        skippedExisting += 1;
        continue;
      }
      durable.putCalculation(record);
    }
  });

  run('previousBreaks', () => {
    const loaded = createPreviousBreaksStore(adapter).load();
    const existing = new Set(durable.load().previousBreaks.map((item) => item.id));
    for (const record of loaded.records) {
      if (existing.has(record.id)) {
        skippedExisting += 1;
        continue;
      }
      durable.putPreviousBreak(record);
    }
  });

  return {
    ok: failedFamilies.length === 0,
    copiedFamilies,
    skippedExisting,
    failedFamilies,
  };
}

export function clearMigratedWebStorageKeys(adapter: StorageAdapter): void {
  for (const key of MIGRATED_WEB_STORAGE_KEYS) {
    adapter.removeItem(key);
  }
  adapter.setItem(MIGRATION_MARKER_KEY, JSON.stringify({ schemaVersion: 'durable-migration-v1', migrated: true }));
}

export interface OpenDurableResult {
  readonly durable: DurablePersistence;
  readonly persistent: boolean;
  readonly migration: MigrationReport | null;
}

/**
 * Preferred boot path: IndexedDB when available, otherwise the versioned
 * Web Storage envelopes, otherwise in-memory (degraded).
 *
 * Web Storage envelopes are not removed until IndexedDB writes have flushed.
 * A failed family or flush leaves the source envelopes in place.
 */
export async function openDurablePersistence(
  adapter: StorageAdapter,
  webPersistent: boolean,
  indexedDBImpl: IdbFactoryLike | null | undefined = readIndexedDbFactory(),
  backendOverride: IndexedDbBackend | null = null,
): Promise<OpenDurableResult> {
  const backend = backendOverride ?? (await openIndexedDb(indexedDBImpl ?? null));
  if (backend !== null) {
    try {
      const initial = await hydrateIndexedDbDurable(backend);
      const durable = createIndexedDbDurable(backend, initial);
      const migration = migrateWebStorageIntoDurable(durable, adapter);
      if (migration.ok) {
        await durable.flush();
        clearMigratedWebStorageKeys(adapter);
      }
      return { durable, persistent: true, migration };
    } catch {
      // Fall through to Web Storage rather than destroy existing envelopes.
    }
  }
  if (webPersistent) {
    const durable = createWebBackedDurable(adapter, { persistent: true, backend: 'web-storage' });
    const snapshot = durable.load().snapshot;
    if (snapshot !== null) ensureCalculationFromSnapshot(durable, snapshot);
    return { durable, persistent: true, migration: null };
  }
  const durable = createWebBackedDurable(adapter, { persistent: false, backend: 'memory' });
  const snapshot = durable.load().snapshot;
  if (snapshot !== null) ensureCalculationFromSnapshot(durable, snapshot);
  return { durable, persistent: false, migration: null };
}

export type { Instant };
