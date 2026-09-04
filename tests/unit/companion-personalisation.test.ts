import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  COMPANION_PERSONALISATION_KEY,
  createCompanionPersonalisationStore,
} from '../../src/application/progress/companion-personalisation.ts';
import {
  COMPANION_PERSONALISATION_VERSION,
  LEGACY_COMPANION_PERSONALISATION_VERSION,
  migrateSupportAreas,
} from '../../src/application/questionnaire/companion.ts';
import { createMemoryStorage } from '../../src/infrastructure/storage/storage-adapter.ts';

describe('companion personalisation v2', () => {
  it('migrates one v1 supportFocus into a v2 supportAreas array', () => {
    const storage = createMemoryStorage();
    const store = createCompanionPersonalisationStore(storage);
    const migrated = store.loadOrMigrate({
      schemaVersion: LEGACY_COMPANION_PERSONALISATION_VERSION,
      supportFocus: 'sleep',
    });
    assert.deepEqual(migrated, {
      schemaVersion: COMPANION_PERSONALISATION_VERSION,
      supportAreas: ['sleep'],
    });
    assert.deepEqual(JSON.parse(storage.getItem(COMPANION_PERSONALISATION_KEY)!), migrated);
  });

  it('maps legacy mood and not-sure to the new taxonomy without inventing needs', () => {
    assert.deepEqual(migrateSupportAreas(['mood']), ['irritability']);
    assert.deepEqual(migrateSupportAreas(['not_sure']), []);
    assert.deepEqual(migrateSupportAreas(['physical_discomfort']), ['headaches', 'nausea']);
  });

  it('saves multiple unique support areas independently of calculator records', () => {
    const storage = createMemoryStorage();
    const store = createCompanionPersonalisationStore(storage);
    const saved = store.saveAreas(['sleep', 'cravings', 'nausea']);
    assert.deepEqual(saved.supportAreas, ['sleep', 'cravings', 'nausea']);
    assert.equal(storage.getItem('tbreak.questionnaire-snapshot.v1'), null);
    assert.equal(storage.getItem('tbreak.calculations.v1'), null);
  });
});
