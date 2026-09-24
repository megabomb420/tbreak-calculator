import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { toInstant, type Instant } from '../../src/domain/schemas/time.ts';
import type { ReductionPlan } from '../../src/domain/reduction/reduction-engine.ts';
import type { StorageAdapter } from '../../src/infrastructure/storage/storage-adapter.ts';
import { createMemoryStorage } from '../../src/infrastructure/storage/storage-adapter.ts';
import {
  createIndexedDbDurable,
  createMemoryIndexedDbBackend,
  hydrateIndexedDbDurable,
} from '../../src/infrastructure/storage/indexeddb.ts';
import {
  BACKUP_EXCLUDED_KEYS,
  BACKUP_EXCLUDED_SNAPSHOT_FIELDS,
  BACKUP_OWNED_KEYS,
  BACKUP_STORE_KEYS,
  applyBackup,
  backupCounts,
  backupFileName,
  createBackup,
  parseBackup,
  serializeBackup,
  type BackupFile,
} from '../../src/application/backup/backup.ts';
import {
  createWebBackedDurable,
  emptyDurableSnapshot,
  LOCAL_DATA_KEYS,
  type DurablePersistence,
} from '../../src/application/persistence/durable.ts';
import { freezeCalculation } from '../../src/application/persistence/calculation-record.ts';
import { createCompanionPersonalisationStore } from '../../src/application/progress/companion-personalisation.ts';
import { QUESTIONNAIRE_PROGRESS_KEY } from '../../src/application/progress/questionnaire-progress.ts';
import { QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION } from '../../src/application/progress/questionnaire-snapshot.ts';
import { RESULT_VIEW_KEY, RESULT_VIEW_SCHEMA_VERSION } from '../../src/application/progress/result-view.ts';
import { sampleProfile } from '../helpers.ts';

const AT: Instant = toInstant(1787184000000);
const ANCHOR: Instant = toInstant(AT - 3 * 24 * 3_600_000);
const APP_VERSION = '0.26.0';

const VALID_CHECKIN = {
  recordedAt: '2026-08-20T12:00:00.000Z',
  craving: 4,
  sleep: 7,
  irritability: null,
  anxiety: null,
  appetite: null,
  usedThc: false,
  usedAt: null,
  note: 'kept busy',
};

const REDUCTION_PLAN: ReductionPlan = {
  id: 'reduction-1',
  origin: 'direct',
  status: 'active',
  startedAt: AT,
  updatedAt: AT,
  limits: { maxUseDaysPerWeek: 3, maxSessionsPerUseDay: 1 },
  strategy: { avoidConcentrates: false, lowerPotency: false, lowerAmount: false },
  baseline: {
    thcUseDaysLast30: 20,
    sessionsPerUseDay: 1,
    products: ['flower'],
    routes: ['smoking'],
    currentPatternDuration: null,
  },
  events: [{ id: 'use-1', usedAt: AT, product: 'flower', route: 'smoking', createdAt: AT }],
};

function seedStores(storage: StorageAdapter): DurablePersistence {
  const durable = createWebBackedDurable(storage);
  durable.putCalculation(freezeCalculation('calc-1', { kind: 'use_profile', profile: sampleProfile() }, AT));
  durable.saveSnapshot({
    schemaVersion: QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION,
    snapshot: { kind: 'use_profile', profile: sampleProfile() },
    updatedAt: AT,
    runId: 'calc-1',
  });
  durable.saveAttempts([
    {
      id: 'attempt-1',
      status: 'ended',
      calculationRecordId: 'calc-1',
      targetDurationDays: 21,
      postBreakMode: 'occasional',
      startedAt: ANCHOR,
      segments: [{ startedFromLastUseAt: ANCHOR, endedAt: AT, endReason: 'completed' }],
      postBreakPlan: { mode: 'occasional', maxUseDaysPerWeek: 2 },
      preparation: null,
      completionAcknowledged: false,
      createdAt: ANCHOR,
      updatedAt: AT,
    },
  ]);
  durable.saveTracking([
    {
      id: 'track-1',
      calculationRecordId: 'calc-1',
      status: 'tracking',
      startedAt: ANCHOR,
      segments: [{ startedFromLastUseAt: ANCHOR, endedAt: null, endReason: null }],
      preparation: null,
      createdAt: ANCHOR,
      updatedAt: AT,
    },
  ]);
  durable.saveCheckins([VALID_CHECKIN]);
  durable.putPreviousBreak({
    id: 'pb-1',
    durationDays: 21,
    toleranceReductionScore: 7,
    endedAt: '2026-08-20T00:00:00.000Z',
    createdAt: '2026-07-30T00:00:00.000Z',
    updatedAt: AT,
    sourceAttemptId: 'attempt-1',
  });
  durable.saveReductionRecords([REDUCTION_PLAN]);
  durable.saveReductionPlan({
    schemaVersion: 'reduction-plan-v1',
    maxUseDaysPerWeek: 2,
    maxSessionsPerUseDay: 1,
    updatedAt: AT,
  });
  durable.saveOutcomeMarks([{ attemptId: 'attempt-1', status: 'captured', updatedAt: AT }]);
  createCompanionPersonalisationStore(storage).saveAreas(['sleep', 'cravings']);
  storage.setItem(
    QUESTIONNAIRE_PROGRESS_KEY,
    JSON.stringify({
      schemaVersion: 'questionnaire-draft-v2',
      answeredSteps: 2,
      updatedAt: AT,
      currentStep: 'Q3',
      answers: { goal: 'tolerance_reset' },
    }),
  );
  storage.setItem(
    RESULT_VIEW_KEY,
    JSON.stringify({ schemaVersion: RESULT_VIEW_SCHEMA_VERSION, status: 'acknowledged', updatedAt: AT }),
  );
  return durable;
}

function exportText(durable: DurablePersistence, adapter: StorageAdapter): string {
  return serializeBackup(createBackup({ durable, adapter }, { exportedAt: AT, appVersion: APP_VERSION }));
}

function parseOk(text: string) {
  const result = parseBackup(text);
  assert.equal(result.ok, true, JSON.stringify('error' in result ? result.error : null));
  if (!result.ok) throw new Error('unreachable');
  return result.backup;
}

/** Every value a backup carries, for byte-level comparisons after a rejection. */
function captureState(durable: DurablePersistence, adapter: StorageAdapter): unknown {
  return {
    durable: durable.load(),
    companion: createCompanionPersonalisationStore(adapter).loadOrMigrate(),
    draft: adapter.getItem(QUESTIONNAIRE_PROGRESS_KEY),
    resultView: adapter.getItem(RESULT_VIEW_KEY),
  };
}

function withData(text: string, mutate: (data: Record<string, unknown>) => void): string {
  const file = JSON.parse(text) as { data: Record<string, unknown> };
  mutate(file.data);
  return JSON.stringify(file);
}

function invalidAttemptRow(): Record<string, unknown> {
  return {
    id: 'attempt-bad',
    status: 'active',
    calculationRecordId: null,
    targetDurationDays: 21,
    postBreakMode: null,
    startedAt: AT,
    segments: [],
    postBreakPlan: null,
    preparation: null,
    completionAcknowledged: false,
    createdAt: AT,
    updatedAt: AT,
  };
}

describe('local backup: round trip', () => {
  it('restores every store into an empty app', () => {
    const source = createMemoryStorage();
    const sourceDurable = seedStores(source);
    const parsed = parseOk(exportText(sourceDurable, source));

    const target = createMemoryStorage();
    const targetDurable = createWebBackedDurable(target);
    applyBackup({ durable: targetDurable, adapter: target }, parsed);

    assert.deepEqual(targetDurable.load(), sourceDurable.load());
    assert.equal(createCompanionPersonalisationStore(target).loadOrMigrate().supportAreas.join(','), 'sleep,cravings');
  });

  it('restores into an IndexedDB-backed app and flushes the rows', async () => {
    const source = createMemoryStorage();
    const sourceDurable = seedStores(source);
    const parsed = parseOk(exportText(sourceDurable, source));

    const backend = createMemoryIndexedDbBackend();
    const durable = createIndexedDbDurable(backend, await hydrateIndexedDbDurable(backend));
    const adapter = createMemoryStorage();
    applyBackup({ durable, adapter }, parsed);
    assert.deepEqual(durable.load(), sourceDurable.load());
    await durable.flush();
    assert.equal((await backend.getAll('breakAttempts')).length, 1);
    assert.equal((await backend.getAll('checkins')).length, 1);
    assert.equal((await backend.getAll('profiles')).length, 1);
  });

  it('replaces the device state instead of merging into it', () => {
    const source = createMemoryStorage();
    const parsed = parseOk(exportText(createWebBackedDurable(source), source));

    const target = createMemoryStorage();
    const targetDurable = seedStores(target);
    applyBackup({ durable: targetDurable, adapter: target }, parsed);

    const restored = targetDurable.load();
    assert.equal(restored.attempts.length, 0);
    assert.equal(restored.checkins.length, 0);
    assert.equal(restored.calculations.length, 0);
    assert.equal(restored.snapshot, null);
    assert.equal(target.getItem(QUESTIONNAIRE_PROGRESS_KEY), null);
    assert.equal(target.getItem(RESULT_VIEW_KEY), null);
    assert.equal(createCompanionPersonalisationStore(target).loadOrMigrate().supportAreas.length, 0);
  });

  it('rebuilds the derived post-break mirror from the restored attempts', () => {
    const source = createMemoryStorage();
    const sourceDurable = seedStores(source);
    const parsed = parseOk(exportText(sourceDurable, source));

    const target = createMemoryStorage();
    const targetDurable = createWebBackedDurable(target);
    applyBackup({ durable: targetDurable, adapter: target }, parsed);
    assert.deepEqual(targetDurable.load().postBreakPlans, sourceDurable.load().postBreakPlans);
  });
});

describe('local backup: rejected files leave the device untouched', () => {
  const rejected: Array<{ readonly name: string; readonly text: () => string; readonly kind: string }> = [
    { name: 'not JSON', text: () => '{', kind: 'unreadable' },
    { name: 'a JSON array', text: () => '[]', kind: 'format' },
    { name: 'an unrelated object', text: () => '{"hello":"world"}', kind: 'format' },
    {
      name: 'another app format',
      text: () => JSON.stringify({ format: 'other-app', formatVersion: 1, appVersion: '1', exportedAt: 'x', data: {} }),
      kind: 'format',
    },
    {
      name: 'a newer format version',
      text: () => withData(exportText(seedStores(createMemoryStorage()), createMemoryStorage()), () => {}).replace(
        '"formatVersion":1',
        '"formatVersion":2',
      ),
      kind: 'newer_format',
    },
    {
      name: 'an unknown format version',
      text: () => withData(exportText(seedStores(createMemoryStorage()), createMemoryStorage()), () => {}).replace(
        '"formatVersion":1',
        '"formatVersion":"two"',
      ),
      kind: 'format_version',
    },
    {
      name: 'a file without data',
      text: () => JSON.stringify({ format: 'tbreak-backup', formatVersion: 1, appVersion: '1', exportedAt: 'x' }),
      kind: 'data',
    },
    {
      name: 'a corrupt store payload',
      text: () => withData(exportText(seedStores(createMemoryStorage()), createMemoryStorage()), (data) => {
        data.attempts = [...(data.attempts as unknown[]), invalidAttemptRow()];
      }),
      kind: 'store_invalid',
    },
    {
      name: 'a check-in outside the symptom scale',
      text: () => withData(exportText(seedStores(createMemoryStorage()), createMemoryStorage()), (data) => {
        data.checkins = [{ ...VALID_CHECKIN, craving: 99 }];
      }),
      kind: 'store_invalid',
    },
    {
      name: 'a corrupt snapshot record',
      text: () => withData(exportText(seedStores(createMemoryStorage()), createMemoryStorage()), (data) => {
        data.snapshot = { schemaVersion: 'questionnaire-snapshot-v1', updatedAt: AT, snapshot: { kind: 'use_profile' } };
      }),
      kind: 'store_invalid',
    },
    {
      name: 'a store of the wrong shape',
      text: () => withData(exportText(seedStores(createMemoryStorage()), createMemoryStorage()), (data) => {
        data.calculations = 'not-a-list';
      }),
      kind: 'store_invalid',
    },
    {
      name: 'a legacy companion area the store would rewrite',
      text: () => withData(exportText(seedStores(createMemoryStorage()), createMemoryStorage()), (data) => {
        data.companionPersonalisation = { schemaVersion: 'companion-personalisation-v2', supportAreas: ['sleep', 'sleep'] };
      }),
      kind: 'store_invalid',
    },
  ];

  for (const entry of rejected) {
    it(`rejects ${entry.name} without writing`, () => {
      const target = createMemoryStorage();
      const durable = seedStores(target);
      const before = captureState(durable, target);
      const result = parseBackup(entry.text());
      assert.equal(result.ok, false, entry.name);
      if (result.ok) return;
      assert.equal(result.error.kind, entry.kind, entry.name);
      if (result.error.kind === 'store_invalid') {
        assert.ok(BACKUP_STORE_KEYS.includes(result.error.store));
      }
      assert.deepEqual(captureState(durable, target), before);
    });
  }

  it('names the store that failed', () => {
    const text = withData(exportText(seedStores(createMemoryStorage()), createMemoryStorage()), (data) => {
      data.checkins = [{ ...VALID_CHECKIN, craving: 99 }];
    });
    const result = parseBackup(text);
    assert.equal(result.ok, false);
    if (!result.ok && result.error.kind === 'store_invalid') assert.equal(result.error.store, 'checkins');
  });
});

describe('local backup: replace semantics', () => {
  it('leaves a store the file omits empty', () => {
    const source = createMemoryStorage();
    const durable = seedStores(source);
    const text = withData(exportText(durable, source), (data) => {
      delete data.checkins;
      delete data.calculations;
      data.unknownStore = { some: 'payload' };
    });
    const parsed = parseOk(text);
    const target = createMemoryStorage();
    const targetDurable = seedStores(target);
    applyBackup({ durable: targetDurable, adapter: target }, parsed);

    const restored = targetDurable.load();
    assert.equal(restored.checkins.length, 0);
    assert.equal(restored.calculations.length, 0);
    assert.equal(restored.attempts.length, 1);
    assert.equal(restored.snapshot?.runId, 'calc-1');
  });

  it('counts what each store holds for the confirmation', () => {
    const source = createMemoryStorage();
    const counts = backupCounts(parseOk(exportText(seedStores(source), source)));
    const byStore = new Map(counts.map((line) => [line.store, line.count]));
    assert.equal(byStore.get('attempts'), 1);
    assert.equal(byStore.get('tracking'), 1);
    assert.equal(byStore.get('checkins'), 1);
    assert.equal(byStore.get('snapshot'), 1);
    assert.equal(byStore.get('calculations'), 1);
    assert.equal(byStore.get('previousBreaks'), 1);
    assert.equal(byStore.get('reductionRecords'), 1);
    assert.equal(byStore.get('reductionPlan'), 1);
    assert.equal(byStore.get('outcomeMarks'), 1);
    assert.equal(byStore.get('companionPersonalisation'), 2);
    assert.equal(counts.length, BACKUP_STORE_KEYS.length);
  });

  it('counts an empty file as all zeros', () => {
    const empty = parseOk(exportText(createWebBackedDurable(createMemoryStorage()), createMemoryStorage()));
    assert.deepEqual(backupCounts(empty).map((line) => line.count), BACKUP_STORE_KEYS.map(() => 0));
  });
});

describe('local backup: envelope', () => {
  it('writes the documented envelope', () => {
    const storage = createMemoryStorage();
    const file = createBackup({ durable: seedStores(storage), adapter: storage }, { exportedAt: AT, appVersion: APP_VERSION });
    assert.equal(file.format, 'tbreak-backup');
    assert.equal(file.formatVersion, 1);
    assert.equal(file.appVersion, APP_VERSION);
    assert.equal(file.exportedAt, '2026-08-20T00:00:00.000Z');
    assert.deepEqual(Object.keys(file.data), [...BACKUP_STORE_KEYS]);
  });

  it('names the download after the export date', () => {
    assert.equal(backupFileName(AT), 'tbreak-backup-2026-08-20.json');
  });

  it('accepts a file it wrote', () => {
    const storage = createMemoryStorage();
    const text = exportText(seedStores(storage), storage);
    const file = JSON.parse(text) as BackupFile;
    assert.equal(file.format, 'tbreak-backup');
    assert.equal(parseBackup(text).ok, true);
  });
});

describe('local backup: store coverage', () => {
  it('claims every owned Web Storage key or names it as excluded', () => {
    const claimed = new Set<string>(BACKUP_OWNED_KEYS);
    const excluded = new Set<string>(BACKUP_EXCLUDED_KEYS);
    for (const key of LOCAL_DATA_KEYS) {
      assert.equal(
        claimed.has(key) !== excluded.has(key),
        true,
        `${key} must be backed up or explicitly excluded`,
      );
    }
    assert.equal(claimed.size + excluded.size, LOCAL_DATA_KEYS.length);
  });

  it('names each excluded key once, so the accounting above cannot hide a duplicate', () => {
    assert.equal(new Set(BACKUP_EXCLUDED_KEYS).size, BACKUP_EXCLUDED_KEYS.length);
  });

  it('covers every durable snapshot field or names it as excluded', () => {
    const covered = new Set<string>(BACKUP_STORE_KEYS);
    const excluded = new Set<string>(BACKUP_EXCLUDED_SNAPSHOT_FIELDS);
    const fields = Object.keys(emptyDurableSnapshot());
    for (const field of fields) {
      assert.equal(
        covered.has(field) !== excluded.has(field),
        true,
        `${field} must be backed up or explicitly excluded`,
      );
    }
    for (const field of excluded) {
      assert.equal(fields.includes(field), true, `${field} is no longer a durable snapshot field`);
    }
  });
});
