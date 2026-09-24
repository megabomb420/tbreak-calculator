import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  COMPANION_PERSONALISATION_KEY,
  createCompanionPersonalisationStore,
} from '../../src/application/progress/companion-personalisation.ts';
import {
  COMPANION_PERSONALISATION_VERSION,
  DEVICE_COMPANION_PERSONALISATION_VERSION,
  LEGACY_COMPANION_PERSONALISATION_VERSION,
  breakFocus,
  canonicalSupportAreas,
  decodeCompanionPersonalisation,
  migrateSupportAreas,
} from '../../src/application/questionnaire/companion.ts';
import { createMemoryStorage } from '../../src/infrastructure/storage/storage-adapter.ts';

function store(storage = createMemoryStorage()) {
  return { storage, store: createCompanionPersonalisationStore(storage) };
}

describe('companion personalisation (support topics)', () => {
  it('migrates one v1 supportFocus into a topics array that no break has confirmed', () => {
    const { storage, store: companion } = store();
    const migrated = companion.loadOrMigrate({
      schemaVersion: LEGACY_COMPANION_PERSONALISATION_VERSION,
      supportFocus: 'sleep',
    });
    assert.deepEqual(migrated, {
      schemaVersion: COMPANION_PERSONALISATION_VERSION,
      supportAreas: ['sleep'],
      forBreak: null,
      confirmedDay: null,
      pick: null,
    });
    assert.deepEqual(JSON.parse(storage.getItem(COMPANION_PERSONALISATION_KEY)!), migrated);
  });

  it('upgrades a device-wide v2 list without binding it to a break', () => {
    const { storage, store: companion } = store();
    storage.setItem(COMPANION_PERSONALISATION_KEY, JSON.stringify({
      schemaVersion: DEVICE_COMPANION_PERSONALISATION_VERSION,
      supportAreas: ['cravings', 'sleep'],
    }));
    const record = companion.loadOrMigrate();
    assert.deepEqual(record.supportAreas, ['sleep', 'cravings']);
    assert.equal(record.forBreak, null);
    // The upgrade is written back, so the next read is a v3 read.
    assert.equal(JSON.parse(storage.getItem(COMPANION_PERSONALISATION_KEY)!).schemaVersion, COMPANION_PERSONALISATION_VERSION);
  });

  it('maps legacy mood and not-sure to the new taxonomy without inventing needs', () => {
    assert.deepEqual(migrateSupportAreas(['mood']), ['irritability']);
    assert.deepEqual(migrateSupportAreas(['not_sure']), []);
    assert.deepEqual(migrateSupportAreas(['physical_discomfort']), ['headaches', 'nausea']);
  });

  it('saves the topics in taxonomy order, so tap order stops meaning anything', () => {
    const { storage, store: companion } = store();
    const saved = companion.saveAreas(['nausea', 'sleep', 'cravings'], null);
    assert.deepEqual(saved.supportAreas, ['sleep', 'cravings', 'nausea']);
    assert.deepEqual(canonicalSupportAreas(['boredom', 'anxiety', 'boredom']), ['anxiety', 'boredom']);
    assert.equal(storage.getItem('tbreak.questionnaire-snapshot.v1'), null);
    assert.equal(storage.getItem('tbreak.calculations.v1'), null);
  });

  it('keeps the topics for the break in hand, and anchors the turn to the day', () => {
    const { store: companion } = store();
    companion.saveAreas(['sleep', 'cravings'], { id: 'break-a', day: 4 });
    const record = companion.loadOrMigrate();
    assert.deepEqual(breakFocus(record, 'break-a', 4), { areas: ['sleep', 'cravings'], anchorDay: 4, reusable: [] });
    assert.deepEqual(breakFocus(record, 'break-a', 6), { areas: ['sleep', 'cravings'], anchorDay: 4, reusable: [] });
    // A different break reads nothing from the set: it is offered, not applied.
    assert.deepEqual(breakFocus(record, 'break-b', 1), { areas: [], anchorDay: 1, reusable: ['sleep', 'cravings'] });
    assert.deepEqual(breakFocus(record, null, null), { areas: [], anchorDay: 1, reusable: ['sleep', 'cravings'] });
  });

  it('gives a set chosen before a break started to that break, and never to a later one', () => {
    const { store: companion } = store();
    companion.saveAreas(['sleep'], null);
    assert.equal(companion.loadOrMigrate().forBreak, null);
    companion.confirmFor('break-a', 1);
    const record = companion.loadOrMigrate();
    assert.equal(record.forBreak, 'break-a');
    assert.equal(record.confirmedDay, 1);
    assert.deepEqual(breakFocus(record, 'break-b', 3).areas, []);
  });

  it('remembers one hand-picked topic per break day and ignores it afterwards', () => {
    const { store: companion } = store();
    companion.savePick({ breakId: 'break-a', day: 3, area: 'nausea' });
    assert.deepEqual(companion.loadOrMigrate().pick, { breakId: 'break-a', day: 3, area: 'nausea' });
    companion.savePick(null);
    assert.equal(companion.loadOrMigrate().pick, null);
  });

  it('keeps a hand-picked topic even when the break has no topics of its own', () => {
    const { store: companion } = store();
    companion.savePick({ breakId: 'break-a', day: 1, area: 'sleep' });
    const record = companion.loadOrMigrate();
    assert.deepEqual(record.supportAreas, []);
    assert.deepEqual(record.pick, { breakId: 'break-a', day: 1, area: 'sleep' });
  });

  it('drops a stored binding that does not hold together rather than trusting it', () => {
    const { storage, store: companion } = store();
    storage.setItem(COMPANION_PERSONALISATION_KEY, JSON.stringify({
      schemaVersion: COMPANION_PERSONALISATION_VERSION,
      supportAreas: ['sleep'],
      forBreak: null,
      confirmedDay: 6,
      pick: null,
    }));
    const record = companion.loadOrMigrate();
    assert.deepEqual(record.supportAreas, ['sleep']);
    assert.equal(record.forBreak, null);
    assert.equal(record.confirmedDay, null);
  });

  it('replaces a corrupt record with an empty one instead of failing', () => {
    const { storage, store: companion } = store();
    storage.setItem(COMPANION_PERSONALISATION_KEY, '{ not json');
    assert.deepEqual(companion.loadOrMigrate().supportAreas, []);
    storage.setItem(COMPANION_PERSONALISATION_KEY, JSON.stringify({
      schemaVersion: COMPANION_PERSONALISATION_VERSION,
      supportAreas: ['not-an-area'],
      forBreak: null,
      confirmedDay: null,
      pick: null,
    }));
    assert.deepEqual(companion.loadOrMigrate().supportAreas, []);
  });

  it('decodes a hand-written row without inventing a binding', () => {
    const decoded = decodeCompanionPersonalisation({
      schemaVersion: COMPANION_PERSONALISATION_VERSION,
      supportAreas: ['cravings', 'sleep', 'cravings'],
      forBreak: 'break-a',
      confirmedDay: 2,
      pick: { breakId: 'break-a', day: 2, area: 'sleep' },
    });
    assert.deepEqual(decoded, {
      schemaVersion: COMPANION_PERSONALISATION_VERSION,
      supportAreas: ['sleep', 'cravings'],
      forBreak: 'break-a',
      confirmedDay: 2,
      pick: { breakId: 'break-a', day: 2, area: 'sleep' },
    });
    assert.equal(decodeCompanionPersonalisation({ schemaVersion: 'nonsense' }), null);
  });
});
