import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryStorage } from '../../src/infrastructure/storage/storage-adapter.ts';
import {
  BREAK_ATTEMPTS_KEY,
  createBreakAttemptsStore,
  type StoredAttempt,
} from '../../src/application/progress/break-attempt-record.ts';
import {
  TRACKING_RECORDS_KEY,
  createTrackingRecordsStore,
  type StoredTrack,
} from '../../src/application/progress/tracking-record.ts';
import { CHECKINS_KEY, createCheckinsStore } from '../../src/application/progress/checkin-store.ts';
import {
  QUESTIONNAIRE_SNAPSHOT_KEY,
  createQuestionnaireSnapshotStore,
} from '../../src/application/progress/questionnaire-snapshot.ts';
import {
  QUESTIONNAIRE_PROGRESS_KEY,
  createQuestionnaireProgressStore,
} from '../../src/application/progress/questionnaire-progress.ts';
import { RESULT_VIEW_KEY, createResultViewStore } from '../../src/application/progress/result-view.ts';
import { REDUCTION_PLAN_KEY, createReductionPlanStore } from '../../src/application/progress/reduction-plan.ts';
import { LOCAL_DATA_KEYS, deleteAllLocalData } from '../../src/application/settings/settings.ts';
import {
  activateDuePlans,
  currentLiveAttempt,
  currentLiveTracking,
  emptySessionState,
} from '../../src/application/break/break-session.ts';
import { MILLIS_PER_DAY, toInstant, type Instant } from '../../src/domain/schemas/time.ts';
import { sampleProfile } from '../helpers.ts';

const C0: Instant = toInstant(1787184000000);
const ANCHOR: Instant = toInstant(C0 - 3 * MILLIS_PER_DAY);

const MALFORMED = ['', '   ', '{', '[]', '{}', '"string"', 'null', '1e308', '{"n":1}'];

function storedAttempt(overrides: Partial<StoredAttempt> = {}): StoredAttempt {
  return {
    id: 'attempt-1',
    status: 'active',
    calculationRecordId: 'calc-1',
    targetDurationDays: 21,
    postBreakMode: 'occasional',
    startedAt: C0,
    segments: [{ startedFromLastUseAt: ANCHOR, endedAt: null, endReason: null }],
    postBreakPlan: { mode: 'occasional', maxUseDaysPerWeek: 2 },
    completionAcknowledged: false,
    createdAt: C0,
    updatedAt: C0,
    ...overrides,
  };
}

function storedTrack(overrides: Partial<StoredTrack> = {}): StoredTrack {
  return {
    id: 'track-1',
    calculationRecordId: 'calc-1',
    status: 'tracking',
    startedAt: C0,
    segments: [{ startedFromLastUseAt: ANCHOR, endedAt: null, endReason: null }],
    createdAt: C0,
    updatedAt: C0,
    ...overrides,
  };
}

const VALID_CHECKIN = {
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

describe('persistence torture: malformed envelopes fail closed', () => {
  const cases: Array<{ key: string; load: (storage: ReturnType<typeof createMemoryStorage>) => unknown }> = [
    { key: BREAK_ATTEMPTS_KEY, load: (s) => createBreakAttemptsStore(s).load() },
    { key: TRACKING_RECORDS_KEY, load: (s) => createTrackingRecordsStore(s).load() },
    { key: CHECKINS_KEY, load: (s) => createCheckinsStore(s).load() },
    { key: QUESTIONNAIRE_SNAPSHOT_KEY, load: (s) => createQuestionnaireSnapshotStore(s).load() },
    { key: QUESTIONNAIRE_PROGRESS_KEY, load: (s) => createQuestionnaireProgressStore(s).load() },
    { key: RESULT_VIEW_KEY, load: (s) => createResultViewStore(s).load() },
    { key: REDUCTION_PLAN_KEY, load: (s) => createReductionPlanStore(s).load() },
  ];

  for (const entry of cases) {
    it(`wipes ${entry.key} on malformed JSON classes`, () => {
      for (const raw of MALFORMED) {
        const storage = createMemoryStorage();
        storage.setItem(entry.key, raw);
        storage.setItem('foreign-key', 'keep');
        assert.equal(entry.load(storage), null, raw);
        assert.equal(storage.getItem(entry.key), null, raw);
        assert.equal(storage.getItem('foreign-key'), 'keep', raw);
      }
    });
  }
});

describe('persistence torture: wrong schema versions', () => {
  it('does not interpret unknown or missing schemaVersion as current', () => {
    const storage = createMemoryStorage();
    for (const version of [undefined, 'break-attempts-v0', 'break-attempts-v2', 1, null]) {
      storage.setItem(
        BREAK_ATTEMPTS_KEY,
        JSON.stringify({ schemaVersion: version, attempts: [storedAttempt()] }),
      );
      assert.equal(createBreakAttemptsStore(storage).load(), null, String(version));
    }
  });

  it('rejects future and missing schema versions on reduction plans', () => {
    const storage = createMemoryStorage();
    storage.setItem(
      REDUCTION_PLAN_KEY,
      JSON.stringify({ schemaVersion: 'reduction-plan-v2', maxUseDaysPerWeek: 3, maxSessionsPerUseDay: 1, updatedAt: C0 }),
    );
    assert.equal(createReductionPlanStore(storage).load(), null);
  });
});

describe('persistence torture: mixed valid + corrupt rows', () => {
  it('keeps a valid attempt beside a corrupt sibling and a duplicate id', () => {
    const storage = createMemoryStorage();
    const good = storedAttempt();
    const duplicate = storedAttempt({ targetDurationDays: 7 });
    const endedBeforeStart = storedAttempt({
      id: 'bad-time',
      segments: [{ startedFromLastUseAt: C0, endedAt: ANCHOR, endReason: 'used_thc' }],
      status: 'ended',
    });
    storage.setItem(
      BREAK_ATTEMPTS_KEY,
      JSON.stringify({
        schemaVersion: 'break-attempts-v1',
        attempts: [good, duplicate, endedBeforeStart, { ...good, id: 'overflow', targetDurationDays: 1e15 }],
      }),
    );
    const loaded = createBreakAttemptsStore(storage).load();
    assert.equal(loaded?.attempts.length, 1);
    assert.equal(loaded?.attempts[0]?.id, 'attempt-1');
    assert.equal(loaded?.attempts[0]?.targetDurationDays, 21);
  });

  it('drops overlapping segments and open-not-last rows in isolation', () => {
    const storage = createMemoryStorage();
    const overlap = storedAttempt({
      id: 'overlap',
      status: 'ended',
      segments: [
        { startedFromLastUseAt: ANCHOR, endedAt: C0, endReason: 'used_thc' },
        { startedFromLastUseAt: toInstant(C0 - MILLIS_PER_DAY), endedAt: C0, endReason: 'completed' },
      ],
    });
    storage.setItem(
      BREAK_ATTEMPTS_KEY,
      JSON.stringify({ schemaVersion: 'break-attempts-v1', attempts: [storedAttempt(), overlap] }),
    );
    assert.deepEqual(
      createBreakAttemptsStore(storage).load()?.attempts.map((row) => row.id),
      ['attempt-1'],
    );
  });

  it('isolates a corrupt tracking row without inventing finite-plan semantics', () => {
    const storage = createMemoryStorage();
    const good = storedTrack();
    const fakeCompleted = { ...storedTrack({ id: 'fake' }), status: 'completed', targetDurationDays: 21 };
    storage.setItem(
      TRACKING_RECORDS_KEY,
      JSON.stringify({ schemaVersion: 'tracking-records-v1', records: [good, fakeCompleted] }),
    );
    const loaded = createTrackingRecordsStore(storage).load();
    assert.equal(loaded?.records.length, 1);
    assert.equal(loaded?.records[0]?.id, 'track-1');
    assert.equal('targetDurationDays' in (loaded?.records[0] ?? {}), false);
  });
});

describe('persistence torture: impossible timeline states', () => {
  it('rejects active/interrupted/planned/completed machine-inconsistent attempts', () => {
    const storage = createMemoryStorage();
    const invalid: unknown[] = [
      storedAttempt({ status: 'active', segments: [] }),
      storedAttempt({
        status: 'active',
        segments: [{ startedFromLastUseAt: ANCHOR, endedAt: C0, endReason: 'completed' }],
      }),
      storedAttempt({
        status: 'planned',
        segments: [{ startedFromLastUseAt: ANCHOR, endedAt: null, endReason: null }],
      }),
      storedAttempt({
        id: 'open-complete',
        status: 'completed',
        segments: [{ startedFromLastUseAt: ANCHOR, endedAt: null, endReason: null }],
        completionAcknowledged: false,
      }),
      storedAttempt({
        id: 'open-ended',
        status: 'ended',
        segments: [{ startedFromLastUseAt: ANCHOR, endedAt: null, endReason: null }],
      }),
      storedAttempt({
        id: 'closed-interrupt',
        status: 'interrupted_time_needed',
        segments: [{ startedFromLastUseAt: ANCHOR, endedAt: C0, endReason: 'used_thc' }],
      }),
      storedAttempt({ targetDurationDays: 0 }),
      storedAttempt({ targetDurationDays: -3 }),
    ];
    storage.setItem(BREAK_ATTEMPTS_KEY, JSON.stringify({ schemaVersion: 'break-attempts-v1', attempts: invalid }));
    assert.deepEqual(createBreakAttemptsStore(storage).load()?.attempts, []);
  });

  it('rejects tracking without a segment, fake completed, and open-not-last', () => {
    const storage = createMemoryStorage();
    storage.setItem(
      TRACKING_RECORDS_KEY,
      JSON.stringify({
        schemaVersion: 'tracking-records-v1',
        records: [
          { ...storedTrack({ id: 'empty' }), segments: [] },
          { ...storedTrack({ id: 'ended-open' }), status: 'ended' },
          {
            ...storedTrack({ id: 'closed-interrupt' }),
            status: 'interrupted_time_needed',
            segments: [{ startedFromLastUseAt: ANCHOR, endedAt: C0, endReason: 'used_thc' }],
          },
        ],
      }),
    );
    assert.deepEqual(createTrackingRecordsStore(storage).load()?.records, []);
  });
});

describe('persistence torture: live-timeline selection', () => {
  it('selects interrupted over a newer planned row so Today is not order-dependent', () => {
    const planned = storedAttempt({ id: 'planned', status: 'planned', segments: [], postBreakPlan: { mode: 'occasional', maxUseDaysPerWeek: 2 } });
    const interrupted = storedAttempt({ id: 'interrupt', status: 'interrupted_time_needed' });
    assert.equal(currentLiveAttempt([planned, interrupted])?.id, 'interrupt');
  });

  it('selects active over a newer planned row', () => {
    const planned = storedAttempt({ id: 'planned', status: 'planned', segments: [] });
    const active = storedAttempt({ id: 'active' });
    assert.equal(currentLiveAttempt([planned, active])?.id, 'active');
  });

  it('selects interrupted tracking over a newer tracking row', () => {
    const live = storedTrack({ id: 'live' });
    const paused = storedTrack({ id: 'paused', status: 'interrupted_time_needed' });
    assert.equal(currentLiveTracking([live, paused])?.id, 'paused');
  });

  it('activates only the current planned attempt, not every due row', () => {
    const newer = storedAttempt({ id: 'newer', status: 'planned', segments: [], startedAt: C0 });
    const older = storedAttempt({ id: 'older', status: 'planned', segments: [], startedAt: C0 });
    const state = { ...emptySessionState(), attempts: [newer, older] };
    const next = activateDuePlans(state, () => ANCHOR, C0);
    assert.equal(next.attempts[0]?.status, 'active');
    assert.equal(next.attempts[0]?.id, 'newer');
    assert.equal(next.attempts[1]?.status, 'planned');
  });

  it('does not activate a planned row while an active attempt already owns Today', () => {
    const planned = storedAttempt({ id: 'planned', status: 'planned', segments: [], startedAt: C0 });
    const active = storedAttempt({ id: 'active' });
    const state = { ...emptySessionState(), attempts: [planned, active] };
    const next = activateDuePlans(state, () => ANCHOR, C0);
    assert.equal(next, state);
    assert.equal(currentLiveAttempt(next.attempts)?.id, 'active');
  });
});

describe('persistence torture: snapshot / reduction / check-ins', () => {
  it('wipes a use-profile snapshot that is missing required shape fields', () => {
    const storage = createMemoryStorage();
    storage.setItem(
      QUESTIONNAIRE_SNAPSHOT_KEY,
      JSON.stringify({
        schemaVersion: 'questionnaire-snapshot-v1',
        updatedAt: C0,
        snapshot: { kind: 'use_profile', profile: { goal: 'tolerance_reset', breakRequested: true } },
      }),
    );
    assert.equal(createQuestionnaireSnapshotStore(storage).load(), null);
  });

  it('loads a structurally complete snapshot even when the engine will fail closed', () => {
    const storage = createMemoryStorage();
    createQuestionnaireSnapshotStore(storage).save({
      schemaVersion: 'questionnaire-snapshot-v1',
      updatedAt: C0,
      snapshot: { kind: 'use_profile', profile: sampleProfile({ breakRequested: false }) },
    });
    assert.ok(createQuestionnaireSnapshotStore(storage).load() !== null);
  });

  it('drops check-in rows with out-of-range symptoms, future usedAt, or missing usedAt', () => {
    const storage = createMemoryStorage();
    storage.setItem(
      CHECKINS_KEY,
      JSON.stringify({
        schemaVersion: 'checkins-v1',
        checkins: [
          { ...VALID_CHECKIN, craving: 99 },
          { ...VALID_CHECKIN, sleep: 2.5 },
          { ...VALID_CHECKIN, usedThc: true, usedAt: null },
          {
            ...VALID_CHECKIN,
            usedThc: true,
            usedAt: { value: '2026-08-21T12:00:00.000Z', provenance: 'user_estimate' },
          },
          { ...VALID_CHECKIN, note: 'x'.repeat(501) },
          VALID_CHECKIN,
        ],
      }),
    );
    const loaded = createCheckinsStore(storage).load();
    assert.equal(loaded?.checkins.length, 1);
    assert.equal(loaded?.checkins[0]?.sleep, 7);
  });

  it('drops a corrupt reduction plan without touching other keys', () => {
    const storage = createMemoryStorage();
    storage.setItem(
      REDUCTION_PLAN_KEY,
      JSON.stringify({ schemaVersion: 'reduction-plan-v1', maxUseDaysPerWeek: 8, maxSessionsPerUseDay: 1, updatedAt: C0 }),
    );
    storage.setItem(BREAK_ATTEMPTS_KEY, JSON.stringify({ schemaVersion: 'break-attempts-v1', attempts: [storedAttempt()] }));
    assert.equal(createReductionPlanStore(storage).load(), null);
    assert.equal(createBreakAttemptsStore(storage).load()?.attempts.length, 1);
  });

  it('delete-everything removes every owned key including reduction-plan and leaves foreign keys', () => {
    const storage = createMemoryStorage();
    for (const key of LOCAL_DATA_KEYS) storage.setItem(key, '{"schemaVersion":"x"}');
    storage.setItem('other-app', '1');
    storage.setItem('test.foreign.key', '2');
    deleteAllLocalData(storage);
    for (const key of LOCAL_DATA_KEYS) assert.equal(storage.getItem(key), null, key);
    assert.equal(storage.getItem('other-app'), '1');
    assert.equal(storage.getItem('test.foreign.key'), '2');
  });
});
