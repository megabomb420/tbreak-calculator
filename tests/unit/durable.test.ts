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
} from '../../src/application/persistence/durable.ts';
import { freezeCalculation } from '../../src/application/persistence/calculation-record.ts';
import {
  createIndexedDbDurable,
  createMemoryIndexedDbBackend,
  hydrateIndexedDbDurable,
  migrateWebStorageIntoDurable,
  openDurablePersistence,
} from '../../src/infrastructure/storage/indexeddb.ts';
import { createQuestionnaireSnapshotStore } from '../../src/application/progress/questionnaire-snapshot.ts';
import { QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION } from '../../src/application/progress/questionnaire-snapshot.ts';
import { sampleProfile } from '../helpers.ts';
import { QUESTIONNAIRE_PROGRESS_KEY } from '../../src/application/progress/questionnaire-progress.ts';

const AT = toInstant(1787184000000);

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
});
