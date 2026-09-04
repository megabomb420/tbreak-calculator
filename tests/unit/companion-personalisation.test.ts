import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  COMPANION_PERSONALISATION_KEY,
  createCompanionPersonalisationStore,
} from '../../src/application/progress/companion-personalisation.ts';
import {
  COMPANION_PERSONALISATION_VERSION,
  LEGACY_COMPANION_PERSONALISATION_VERSION,
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

  it('saves multiple unique support areas independently of calculator records', () => {
    const storage = createMemoryStorage();
    const store = createCompanionPersonalisationStore(storage);
    const saved = store.saveAreas(['sleep', 'cravings', 'anxiety']);
    assert.deepEqual(saved.supportAreas, ['sleep', 'cravings', 'anxiety']);
    assert.equal(storage.getItem('tbreak.questionnaire-snapshot.v1'), null);
    assert.equal(storage.getItem('tbreak.calculations.v1'), null);
  });
});
