import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { toInstant } from '../../src/domain/schemas/time.ts';
import { createMemoryStorage } from '../../src/infrastructure/storage/storage-adapter.ts';
import {
  createWebBackedDurable,
  deleteAllLocalData,
  deleteHistoryRecord,
  ensureCalculationFromSnapshot,
  LOCAL_DATA_KEYS,
  MIGRATED_WEB_STORAGE_KEYS,
  MIGRATION_MARKER_KEY,
} from '../../src/application/persistence/durable.ts';
import { freezeCalculation } from '../../src/application/persistence/calculation-record.ts';
import {
  CALCULATION_RECORDS_KEY,
  CALCULATION_RECORDS_SCHEMA_VERSION,
} from '../../src/application/persistence/calculation-record.ts';
import {
  createIndexedDbDurable,
  createMemoryIndexedDbBackend,
  hydrateIndexedDbDurable,
  migrateWebStorageIntoDurable,
  openDurablePersistence,
  openIndexedDb,
  type IdbFactoryLike,
} from '../../src/infrastructure/storage/indexeddb.ts';
import { createQuestionnaireSnapshotStore } from '../../src/application/progress/questionnaire-snapshot.ts';
import { QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION } from '../../src/application/progress/questionnaire-snapshot.ts';
import type { StoredAttempt } from '../../src/application/progress/break-attempt-record.ts';
import { sampleProfile } from '../helpers.ts';
import { QUESTIONNAIRE_PROGRESS_KEY } from '../../src/application/progress/questionnaire-progress.ts';

const AT = toInstant(1787184000000);

const ATTEMPT: StoredAttempt = {
  id: 'attempt-1',
  status: 'ended',
  calculationRecordId: 'calc-1',
  targetDurationDays: 21,
  postBreakMode: 'occasional',
  startedAt: AT,
  segments: [{ startedFromLastUseAt: AT, endedAt: AT, endReason: 'user_ended' }],
  postBreakPlan: { mode: 'occasional', maxUseDaysPerWeek: 2 },
  preparation: null,
  completionAcknowledged: false,
  createdAt: AT,
  updatedAt: AT,
};

interface FakeIdbRequest {
  onsuccess: (() => void) | null;
  onerror: (() => void) | null;
  onblocked: (() => void) | null;
  onupgradeneeded: (() => void) | null;
  result: unknown;
  error: Error | null;
}

/** Drives the open outcome by hand: no real IndexedDB is available in tests. */
function fakeIndexedDbFactory(outcome: 'success' | 'blocked' | 'error'): {
  readonly factory: IdbFactoryLike;
  readonly state: { closeCalls: number; versionChangeHandler: (() => void) | null };
  fireVersionChange(): void;
} {
  const state: { closeCalls: number; versionChangeHandler: (() => void) | null } = {
    closeCalls: 0,
    versionChangeHandler: null,
  };
  const request: FakeIdbRequest = {
    onsuccess: null,
    onerror: null,
    onblocked: null,
    onupgradeneeded: null,
    result: undefined,
    error: null,
  };
  const factory = {
    open: () => {
      request.result = {
        objectStoreNames: { contains: () => true },
        createObjectStore: () => undefined,
        transaction: () => ({
          objectStore: () => ({
            getAll: () => request,
            put: () => request,
            delete: () => request,
            clear: () => request,
          }),
        }),
        get onversionchange() {
          return state.versionChangeHandler;
        },
        set onversionchange(handler: (() => void) | null) {
          state.versionChangeHandler = handler;
        },
        close() {
          state.closeCalls += 1;
        },
      };
      queueMicrotask(() => {
        if (outcome === 'success') request.onsuccess?.();
        else if (outcome === 'blocked') request.onblocked?.();
        else request.onerror?.();
      });
      return request;
    },
  };
  return {
    factory: factory as unknown as IdbFactoryLike,
    state,
    fireVersionChange() {
      state.versionChangeHandler?.();
    },
  };
}

function blockedIndexedDbFactory(): IdbFactoryLike {
  return fakeIndexedDbFactory('blocked').factory;
}

function failingIndexedDbFactory(): IdbFactoryLike {
  return fakeIndexedDbFactory('error').factory;
}

describe('durable persistence', () => {
  it('round-trips calculations, previous breaks, and attempts on web storage', () => {
    const adapter = createMemoryStorage();
    const durable = createWebBackedDurable(adapter);
    const frozen = freezeCalculation('calc-1', { kind: 'use_profile', profile: sampleProfile() }, AT);
    durable.putCalculation(frozen);
    durable.putPreviousBreak({
      id: 'pb-1',
      durationDays: 14,
      toleranceReductionScore: 7,
      endedAt: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: AT,
    });
    durable.saveAttempts([
      {
        id: 'attempt-1',
        status: 'ended',
        calculationRecordId: 'calc-1',
        targetDurationDays: 21,
        postBreakMode: 'occasional',
        startedAt: AT,
        segments: [{ startedFromLastUseAt: AT, endedAt: AT, endReason: 'user_ended' }],
        postBreakPlan: { mode: 'occasional', maxUseDaysPerWeek: 2 },
        preparation: null,
        completionAcknowledged: false,
        createdAt: AT,
        updatedAt: AT,
      },
    ]);
    const loaded = durable.load();
    assert.equal(loaded.calculations[0]?.id, 'calc-1');
    assert.equal(loaded.previousBreaks[0]?.durationDays, 14);
    assert.equal(loaded.attempts[0]?.id, 'attempt-1');
    assert.equal(loaded.postBreakPlans[0]?.attemptId, 'attempt-1');
  });

  it('isolates a corrupt calculation row as Unavailable without dropping others', () => {
    const adapter = createMemoryStorage();
    adapter.setItem(
      'tbreak.calculations.v1',
      JSON.stringify({
        schemaVersion: 'calculation-records-v1',
        records: [
          freezeCalculation('calc-ok', { kind: 'detection', request: { matrix: 'urine', context: 'general' } }, AT),
          { id: 'calc-bad', schemaVersion: 'nope' },
        ],
      }),
    );
    const durable = createWebBackedDurable(adapter);
    const loaded = durable.load();
    assert.equal(loaded.calculations.length, 1);
    assert.equal(loaded.corrupt[0]?.id, 'calc-bad');
    deleteHistoryRecord(durable, 'corrupt', 'calc-bad');
    assert.equal(durable.load().corrupt.length, 0);
    assert.equal(durable.load().calculations.length, 1);
  });

  it('deletes a corrupt calculation without dropping a valid record that shares its id', () => {
    const adapter = createMemoryStorage();
    const durable = createWebBackedDurable(adapter);
    durable.saveAttempts([ATTEMPT]);
    adapter.setItem(
      CALCULATION_RECORDS_KEY,
      JSON.stringify({
        schemaVersion: CALCULATION_RECORDS_SCHEMA_VERSION,
        records: [
          freezeCalculation('calc-ok', { kind: 'detection', request: { matrix: 'urine', context: 'general' } }, AT),
          { id: 'attempt-1', schemaVersion: 'nope' },
        ],
      }),
    );
    const loaded = durable.load();
    assert.deepEqual(loaded.corrupt.map((row) => row.id), ['attempt-1']);

    deleteHistoryRecord(durable, 'corrupt', 'attempt-1');

    const after = durable.load();
    assert.equal(after.corrupt.length, 0);
    assert.deepEqual(after.attempts.map((item) => item.id), ['attempt-1']);
    assert.deepEqual(after.calculations.map((item) => item.id), ['calc-ok']);
  });

  it('materializes a v0.3 snapshot into a frozen calculation once', () => {
    const adapter = createMemoryStorage();
    const snapshots = createQuestionnaireSnapshotStore(adapter);
    snapshots.save({
      schemaVersion: QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION,
      snapshot: { kind: 'use_profile', profile: sampleProfile() },
      updatedAt: AT,
    });
    const durable = createWebBackedDurable(adapter);
    const first = ensureCalculationFromSnapshot(durable, snapshots.load()!);
    const second = ensureCalculationFromSnapshot(durable, durable.load().snapshot!);
    assert.ok(first);
    assert.equal(first?.id, second?.id);
    assert.equal(durable.load().calculations.length, 1);
  });

  it('does not rematerialize a calculation the user already deleted', () => {
    const adapter = createMemoryStorage();
    const snapshots = createQuestionnaireSnapshotStore(adapter);
    snapshots.save({
      schemaVersion: QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION,
      snapshot: { kind: 'use_profile', profile: sampleProfile() },
      updatedAt: AT,
    });
    const durable = createWebBackedDurable(adapter);
    const first = ensureCalculationFromSnapshot(durable, snapshots.load()!);
    assert.ok(first);
    durable.deleteCalculation(first!.id);
    const afterDelete = ensureCalculationFromSnapshot(durable, durable.load().snapshot!);
    assert.equal(afterDelete, null);
    assert.equal(durable.load().calculations.length, 0);
  });

  it('migrates web-storage envelopes into IndexedDB without overwriting existing ids', async () => {
    const adapter = createMemoryStorage();
    const web = createWebBackedDurable(adapter);
    web.putCalculation(freezeCalculation('calc-1', { kind: 'detection', request: { matrix: 'hair', context: 'general' } }, AT));
    const backend = createMemoryIndexedDbBackend();
    const idb = createIndexedDbDurable(backend, await hydrateIndexedDbDurable(backend));
    idb.putCalculation(freezeCalculation('calc-1', { kind: 'detection', request: { matrix: 'urine', context: 'general' } }, AT));
    const report = migrateWebStorageIntoDurable(idb, adapter);
    assert.equal(report.ok, true);
    assert.ok(report.skippedExisting >= 1);
    const snapshot = idb.load();
    const calc = snapshot.calculations.find((item) => item.id === 'calc-1');
    assert.equal(calc?.snapshot.kind, 'detection');
    if (calc?.snapshot.kind === 'detection') {
      assert.equal(calc.snapshot.request.matrix, 'urine');
    }
  });

  it('delete everything removes only T-Break keys and IndexedDB rows', async () => {
    const adapter = createMemoryStorage();
    adapter.setItem('other.app.key', 'keep');
    adapter.setItem(QUESTIONNAIRE_PROGRESS_KEY, '{"keep":false}');
    const durable = createWebBackedDurable(adapter);
    durable.putPreviousBreak({
      id: 'pb-1',
      durationDays: 7,
      toleranceReductionScore: null,
      endedAt: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: AT,
    });
    deleteAllLocalData(adapter, durable);
    assert.equal(adapter.getItem('other.app.key'), 'keep');
    assert.equal(adapter.getItem(QUESTIONNAIRE_PROGRESS_KEY), null);
    assert.equal(durable.load().previousBreaks.length, 0);
    for (const key of LOCAL_DATA_KEYS) {
      assert.equal(adapter.getItem(key), null);
    }
    const opened = await openDurablePersistence(createMemoryStorage(), true, null, createMemoryIndexedDbBackend());
    assert.equal(opened.durable.backend, 'indexeddb');
    assert.equal(opened.persistent, true);
  });

  it('clears the migrated Web Storage envelopes after a successful open', async () => {
    const adapter = createMemoryStorage();
    createWebBackedDurable(adapter).putPreviousBreak({
      id: 'pb-1',
      durationDays: 7,
      toleranceReductionScore: null,
      endedAt: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: AT,
    });
    const opened = await openDurablePersistence(adapter, true, null, createMemoryIndexedDbBackend());
    assert.equal(opened.persistent, true);
    assert.equal(opened.migration?.ok, true);
    for (const key of MIGRATED_WEB_STORAGE_KEYS) {
      assert.equal(adapter.getItem(key), null);
    }
    assert.notEqual(adapter.getItem(MIGRATION_MARKER_KEY), null);
    assert.equal(opened.durable.load().previousBreaks.length, 1);
  });

  it('reports not-persistent when the IndexedDB open is blocked', async () => {
    const adapter = createMemoryStorage();
    adapter.setItem(MIGRATION_MARKER_KEY, JSON.stringify({ schemaVersion: 'durable-migration-v1', migrated: true }));
    const opened = await openDurablePersistence(adapter, true, blockedIndexedDbFactory());
    assert.equal(opened.persistent, false);
    assert.equal(opened.durable.load().previousBreaks.length, 0);
  });

  it('reports not-persistent when the IndexedDB open fails', async () => {
    const adapter = createMemoryStorage();
    adapter.setItem(MIGRATION_MARKER_KEY, JSON.stringify({ schemaVersion: 'durable-migration-v1', migrated: true }));
    const opened = await openDurablePersistence(adapter, true, failingIndexedDbFactory());
    assert.equal(opened.persistent, false);
    assert.equal(opened.durable.load().calculations.length, 0);
  });

  it('reports not-persistent when a successful open cannot be hydrated', async () => {
    const adapter = createMemoryStorage();
    adapter.setItem(MIGRATION_MARKER_KEY, JSON.stringify({ schemaVersion: 'durable-migration-v1', migrated: true }));
    const backend = createMemoryIndexedDbBackend();
    backend.getAll = async () => {
      throw new Error('indexeddb read failed');
    };
    const opened = await openDurablePersistence(adapter, true, null, backend);
    assert.equal(opened.persistent, false);
    assert.equal(opened.durable.backend, 'memory');
  });

  it('still uses Web Storage when there is no IndexedDB factory at all', async () => {
    const adapter = createMemoryStorage();
    createWebBackedDurable(adapter).putPreviousBreak({
      id: 'pb-1',
      durationDays: 7,
      toleranceReductionScore: null,
      endedAt: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: AT,
    });
    const opened = await openDurablePersistence(adapter, true, null);
    assert.equal(opened.persistent, true);
    assert.equal(opened.durable.backend, 'web-storage');
    assert.equal(opened.durable.load().previousBreaks.length, 1);
  });

  it('closes the connection when another tab upgrades the schema', async () => {
    const fake = fakeIndexedDbFactory('success');
    const backend = await openIndexedDb(fake.factory);
    assert.notEqual(backend, null);
    assert.equal(fake.state.closeCalls, 0);

    fake.fireVersionChange();

    assert.equal(fake.state.closeCalls, 1);
    assert.equal(fake.state.versionChangeHandler !== null, true);
  });

  it('leaves the connection open while no upgrade is pending', async () => {
    const fake = fakeIndexedDbFactory('success');
    const backend = await openIndexedDb(fake.factory);
    assert.notEqual(backend, null);
    assert.equal(fake.state.closeCalls, 0);
  });

  it('deletes a corrupt post-break mirror only from the store that owns it', async () => {
    const backend = createMemoryIndexedDbBackend();
    const seeded = createIndexedDbDurable(backend, await hydrateIndexedDbDurable(backend));
    seeded.saveAttempts([ATTEMPT]);
    await seeded.flush();
    // A rejected mirror carries the id of the attempt it was derived from.
    await backend.put('postBreakPlans', {
      id: 'attempt-1',
      payload: { id: 'attempt-1', attemptId: 'attempt-1', plan: { mode: 'weekly' }, updatedAt: AT },
    });

    const before = await hydrateIndexedDbDurable(backend);
    assert.equal(before.attempts.length, 1);
    assert.deepEqual(before.corrupt.map((row) => row.id), ['attempt-1']);

    const durable = createIndexedDbDurable(backend, before);
    deleteHistoryRecord(durable, 'corrupt', 'attempt-1');
    await durable.flush();

    const after = await hydrateIndexedDbDurable(backend);
    assert.equal(after.corrupt.length, 0);
    assert.deepEqual(after.attempts.map((item) => item.id), ['attempt-1']);
    assert.equal(after.attempts[0]?.targetDurationDays, 21);
    assert.deepEqual(after.postBreakPlans, []);
    assert.equal(durable.load().attempts.length, 1);
    assert.equal(durable.load().corrupt.length, 0);
    assert.deepEqual(await backend.getAll('corruptRecords'), []);
  });

  it('deletes a corrupt break-outcome mark from its own store so it cannot come back', async () => {
    const backend = createMemoryIndexedDbBackend();
    await backend.put('breakOutcomes', {
      id: 'attempt-9',
      payload: { attemptId: 'attempt-9', status: 'nope', updatedAt: AT },
    });

    const before = await hydrateIndexedDbDurable(backend);
    assert.deepEqual(before.corrupt.map((row) => row.id), ['attempt-9']);

    const durable = createIndexedDbDurable(backend, before);
    deleteHistoryRecord(durable, 'corrupt', 'attempt-9');
    await durable.flush();

    const after = await hydrateIndexedDbDurable(backend);
    assert.equal(after.corrupt.length, 0);
    assert.deepEqual(await backend.getAll('corruptRecords'), []);
  });

  it('deletes a corrupt check-in row from the check-ins store only', async () => {
    const backend = createMemoryIndexedDbBackend();
    const checkin = {
      recordedAt: '2026-08-20T12:00:00.000Z',
      craving: 4,
      sleep: 7,
      irritability: null,
      anxiety: null,
      appetite: null,
      usedThc: false,
      usedAt: null,
      note: null,
    };
    const seeded = createIndexedDbDurable(backend, await hydrateIndexedDbDurable(backend));
    seeded.saveCheckins([checkin]);
    await seeded.flush();
    await backend.put('checkins', {
      id: 'checkin-2026-08-21',
      payload: { recordedAt: '2026-08-21T12:00:00.000Z', craving: 'high' },
    });

    const before = await hydrateIndexedDbDurable(backend);
    assert.equal(before.checkins.length, 1);
    assert.deepEqual(before.corrupt.map((row) => row.id), ['checkin-2026-08-21']);

    const durable = createIndexedDbDurable(backend, before);
    deleteHistoryRecord(durable, 'corrupt', 'checkin-2026-08-21');
    await durable.flush();

    const after = await hydrateIndexedDbDurable(backend);
    assert.equal(after.corrupt.length, 0);
    assert.deepEqual(after.checkins.map((item) => item.recordedAt), ['2026-08-20T12:00:00.000Z']);
  });
});
