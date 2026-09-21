// A durable write that is rejected must be visible to the app, not swallowed.
// IndexedDB is the swallowing surface in production; the Web Storage facade
// still throws (the shell already contains that), but it now reports too.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { toInstant } from '../../src/domain/schemas/time.ts';
import type { DailyCheckin } from '../../src/domain/schemas/profile.ts';
import { createWebBackedDurable } from '../../src/application/persistence/durable.ts';
import { createMemoryStorage } from '../../src/infrastructure/storage/storage-adapter.ts';
import { checkinRecordId } from '../../src/application/persistence/ids.ts';
import { freezeCalculation } from '../../src/application/persistence/calculation-record.ts';
import { sampleProfile } from '../helpers.ts';

const AT = toInstant(1787184000000); // 2026-08-20T00:00:00Z

const CHECKIN: DailyCheckin = {
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

/** The Web Storage envelopes write synchronously; a rejected write there must
 * land in the same failure channel as a rejected IndexedDB transaction. */
function faultyStorage(): { adapter: ReturnType<typeof createMemoryStorage>; recover: () => void } {
  const entries = createMemoryStorage();
  let failing = true;
  return {
    adapter: {
      getItem: entries.getItem,
      setItem: (key, value) => {
        if (failing) throw new Error('QuotaExceededError');
        entries.setItem(key, value);
      },
      removeItem: (key) => {
        if (failing) throw new Error('QuotaExceededError');
        entries.removeItem(key);
      },
      clear: entries.clear,
    },
    recover: () => {
      failing = false;
    },
  };
}

describe('durable write-failure reporting', () => {
  it('reports a rejected write instead of leaving the app claiming it saves', () => {
    const { adapter } = faultyStorage();
    const durable = createWebBackedDurable(adapter);
    const reported: boolean[] = [];
    durable.onWriteFailure((failed) => reported.push(failed));

    assert.throws(() => durable.saveCheckins([CHECKIN]), /QuotaExceededError/);

    assert.equal(durable.writeFailed, true);
    assert.deepEqual(reported, [true]);
    assert.equal(durable.load().checkins.length, 0);
  });

  it('reports a failing adapter once, not once per write', () => {
    const { adapter } = faultyStorage();
    const durable = createWebBackedDurable(adapter);
    const reported: boolean[] = [];
    durable.onWriteFailure((failed) => reported.push(failed));

    assert.throws(() => durable.saveCheckins([CHECKIN]));
    assert.throws(() => durable.saveTracking([]));
    assert.throws(() => durable.saveSnapshot(null));

    assert.deepEqual(reported, [true]);
    assert.equal(durable.writeFailed, true);
  });

  it('clears the failure state on the next successful write', () => {
    const { adapter, recover } = faultyStorage();
    const durable = createWebBackedDurable(adapter);
    const reported: boolean[] = [];
    durable.onWriteFailure((failed) => reported.push(failed));

    assert.throws(() => durable.saveCheckins([CHECKIN]));
    recover();
    durable.saveCheckins([CHECKIN]);

    assert.deepEqual(reported, [true, false]);
    assert.equal(durable.writeFailed, false);
    assert.equal(durable.load().checkins.length, 1);
  });

  it('stops notifying a listener that unsubscribed', () => {
    const { adapter, recover } = faultyStorage();
    const durable = createWebBackedDurable(adapter);
    const reported: boolean[] = [];
    const unsubscribe = durable.onWriteFailure((failed) => reported.push(failed));

    assert.throws(() => durable.saveCheckins([CHECKIN]));
    unsubscribe();
    recover();
    durable.saveCheckins([CHECKIN]);

    assert.deepEqual(reported, [true]);
  });

  it('reports a rejected delete as a failed write', () => {
    const { adapter } = faultyStorage();
    const durable = createWebBackedDurable(adapter);
    const reported: boolean[] = [];
    durable.onWriteFailure((failed) => reported.push(failed));

    assert.throws(() => durable.deleteCheckin(checkinRecordId(CHECKIN.recordedAt)));

    assert.deepEqual(reported, [true]);
    assert.equal(durable.writeFailed, true);
  });

  it('does not report anything while writes keep succeeding', () => {
    const durable = createWebBackedDurable(createMemoryStorage());
    const reported: boolean[] = [];
    durable.onWriteFailure((failed) => reported.push(failed));

    durable.saveCheckins([CHECKIN]);
    durable.saveSnapshot(null);
    durable.putCalculation(freezeCalculation('calc-1', { kind: 'use_profile', profile: sampleProfile() }, AT));

    assert.deepEqual(reported, []);
    assert.equal(durable.writeFailed, false);
    assert.equal(durable.load().checkins.length, 1);
    assert.equal(durable.load().calculations.length, 1);
  });
});
