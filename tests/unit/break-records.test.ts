import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BREAK_ATTEMPTS_KEY,
  createBreakAttemptsStore,
  emptyBreakAttemptsRecord,
  type StoredAttempt,
} from '../../src/application/progress/break-attempt-record.ts';
import {
  createTrackingRecordsStore,
  emptyTrackingRecordsRecord,
  TRACKING_RECORDS_KEY,
} from '../../src/application/progress/tracking-record.ts';
import { createCheckinsStore, emptyCheckinsRecord, CHECKINS_KEY } from '../../src/application/progress/checkin-store.ts';
import { createMemoryStorage } from '../../src/infrastructure/storage/storage-adapter.ts';
import { MILLIS_PER_DAY, toInstant, type Instant } from '../../src/domain/schemas/time.ts';

const C0: Instant = toInstant(1787184000000);

function storedAttempt(overrides: Partial<StoredAttempt> = {}): StoredAttempt {
  return {
    id: 'attempt-1',
    status: 'active',
    calculationRecordId: 'calc-1',
    targetDurationDays: 21,
    postBreakMode: 'occasional',
    startedAt: C0,
    segments: [{ startedFromLastUseAt: toInstant(C0 - 3 * MILLIS_PER_DAY), endedAt: null, endReason: null }],
    postBreakPlan: { mode: 'occasional', maxUseDaysPerWeek: 2 },
    completionAcknowledged: false,
    createdAt: C0,
    updatedAt: C0,
    ...overrides,
  };
}

describe('break attempts record store', () => {
  it('round-trips stored attempts', () => {
    const storage = createMemoryStorage();
    const store = createBreakAttemptsStore(storage);
    const record = { ...emptyBreakAttemptsRecord(), attempts: [storedAttempt()] };
    store.save(record);
    const loaded = store.load();
    assert.deepEqual(loaded, record);
  });

  it('treats a corrupt envelope as absent and wipes it', () => {
    const storage = createMemoryStorage();
    storage.setItem(BREAK_ATTEMPTS_KEY, '{not-json');
    const store = createBreakAttemptsStore(storage);
    assert.equal(store.load(), null);
    assert.equal(storage.getItem(BREAK_ATTEMPTS_KEY), null);
  });

  it('drops an invalid attempt row while keeping the valid ones', () => {
    const storage = createMemoryStorage();
    storage.setItem(
      BREAK_ATTEMPTS_KEY,
      JSON.stringify({
        schemaVersion: 'break-attempts-v1',
        attempts: [storedAttempt(), { ...storedAttempt({ id: 'broken' }), targetDurationDays: 'nope' }],
      }),
    );
    const store = createBreakAttemptsStore(storage);
    const loaded = store.load();
    assert.equal(loaded?.attempts.length, 1);
    assert.equal(loaded?.attempts[0]?.id, 'attempt-1');
  });

  it('rejects saving an invalid record', () => {
    const storage = createMemoryStorage();
    const store = createBreakAttemptsStore(storage);
    const bad = { ...emptyBreakAttemptsRecord(), attempts: [{ ...storedAttempt(), segments: [] }] };
    assert.throws(() => store.save(bad), RangeError);
  });

  it('rejects an acknowledged flag on a non-completed attempt', () => {
    const storage = createMemoryStorage();
    const store = createBreakAttemptsStore(storage);
    assert.throws(
      () => store.save({ ...emptyBreakAttemptsRecord(), attempts: [{ ...storedAttempt(), completionAcknowledged: true }] }),
      RangeError,
    );
  });
});

describe('tracking records + check-in record stores', () => {
  it('round-trips tracking records and check-ins', () => {
    const storage = createMemoryStorage();
    const trackingStore = createTrackingRecordsStore(storage);
    const checkinsStore = createCheckinsStore(storage);
    const track = {
      id: 'track-1',
      calculationRecordId: 'calc-1',
      status: 'tracking' as const,
      startedAt: C0,
      segments: [{ startedFromLastUseAt: toInstant(C0 - 2 * MILLIS_PER_DAY), endedAt: null, endReason: null }],
      createdAt: C0,
      updatedAt: C0,
    };
    trackingStore.save({ ...emptyTrackingRecordsRecord(), records: [track] });
    assert.deepEqual(trackingStore.load()?.records, [track]);

    const checkin = {
      recordedAt: '2026-08-20T12:00:00.000Z',
      craving: null,
      sleep: 7,
      irritability: null,
      anxiety: null,
      appetite: null,
      usedThc: false,
      usedAt: null,
      note: null,
    };
    checkinsStore.save({ ...emptyCheckinsRecord(), checkins: [checkin] });
    assert.deepEqual(checkinsStore.load()?.checkins, [checkin]);
  });

  it('isolates corrupt rows in the check-in envelope', () => {
    const storage = createMemoryStorage();
    storage.setItem(
      CHECKINS_KEY,
      JSON.stringify({
        schemaVersion: 'checkins-v1',
        checkins: [
          { recordedAt: '2026-08-20T12:00:00.000Z', craving: 99, usedThc: false }, // invalid
          {
            recordedAt: '2026-08-21T12:00:00.000Z',
            craving: null,
            sleep: 5,
            irritability: null,
            anxiety: null,
            appetite: null,
            usedThc: false,
            usedAt: null,
            note: null,
          },
        ],
      }),
    );
    const loaded = createCheckinsStore(storage).load();
    assert.equal(loaded?.checkins.length, 1);
    assert.equal(loaded?.checkins[0]?.recordedAt, '2026-08-21T12:00:00.000Z');
  });

  it('wipes a corrupt tracking envelope and leaves other keys alone', () => {
    const storage = createMemoryStorage();
    storage.setItem(TRACKING_RECORDS_KEY, '{"schemaVersion":');
    storage.setItem('tbreak.other.v1', 'kept');
    assert.equal(createTrackingRecordsStore(storage).load(), null);
    assert.equal(storage.getItem('tbreak.other.v1'), 'kept');
  });
});
