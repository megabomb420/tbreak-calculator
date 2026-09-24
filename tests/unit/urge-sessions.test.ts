import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createUrgeSessionsStore,
  emptyUrgeSessionsRecord,
  URGE_SESSIONS_KEY,
  URGE_STALE_AFTER_MS,
  type UrgeSession,
} from '../../src/application/progress/urge-session-record.ts';
import {
  finishUrgeSession,
  formatUrgeRemaining,
  openUrgeSession,
  startUrgeSession,
  summariseUrgeSessions,
  urgeHasElapsed,
  urgeRemainingMs,
} from '../../src/domain/urges/urge-session.ts';
import { createMemoryStorage } from '../../src/infrastructure/storage/storage-adapter.ts';
import { toInstant } from '../../src/domain/schemas/time.ts';

const NOW = toInstant(Date.parse('2026-09-24T21:00:00Z'));
const DAY = 86_400_000;

function session(patch: Partial<UrgeSession> = {}): UrgeSession {
  return { id: 'urge-1', startedAt: NOW, plannedMinutes: 10, endedAt: null, outcome: null, ...patch };
}

test('urge sessions round-trip through the store', () => {
  const storage = createMemoryStorage();
  const store = createUrgeSessionsStore(storage);
  const finished = finishUrgeSession(startUrgeSession('urge-1', 10, NOW), 'easier', toInstant(NOW + 600_000));
  store.save({ ...emptyUrgeSessionsRecord(), sessions: [finished] });
  assert.deepEqual(store.load().sessions, [finished]);
});

test('a corrupt envelope is wiped rather than trusted', () => {
  const storage = createMemoryStorage();
  storage.setItem(URGE_SESSIONS_KEY, '{not json');
  assert.deepEqual(createUrgeSessionsStore(storage).load(), emptyUrgeSessionsRecord());
  storage.setItem(URGE_SESSIONS_KEY, JSON.stringify({ schemaVersion: 'urge-sessions-v9', sessions: [] }));
  assert.deepEqual(createUrgeSessionsStore(storage).load(), emptyUrgeSessionsRecord());
});

test('drops rows that are not a record of anything', () => {
  const storage = createMemoryStorage();
  storage.setItem(URGE_SESSIONS_KEY, JSON.stringify({
    schemaVersion: 'urge-sessions-v1',
    sessions: [
      session({ id: 'outcome-without-end', outcome: 'easier' }),
      session({ id: 'end-before-start', endedAt: toInstant(NOW - 1), outcome: 'easier' }),
      session({ id: 'unknown-outcome', endedAt: toInstant(NOW + 1), outcome: 'resisted' as unknown as UrgeSession['outcome'] }),
      session({ id: 'zero-minutes', plannedMinutes: 0 }),
      session({ id: 'too-long', plannedMinutes: 61 }),
      session({ id: '', plannedMinutes: 5 }),
      session({ id: 'good', plannedMinutes: 5 }),
    ],
  }));
  assert.deepEqual(createUrgeSessionsStore(storage).load().sessions.map((row) => row.id), ['good']);
});

test('keeps one running timer at most, so a resume is never ambiguous', () => {
  const storage = createMemoryStorage();
  storage.setItem(URGE_SESSIONS_KEY, JSON.stringify({
    schemaVersion: 'urge-sessions-v1',
    sessions: [session({ id: 'newer', startedAt: toInstant(NOW) }), session({ id: 'older', startedAt: toInstant(NOW - 60_000) })],
  }));
  assert.deepEqual(createUrgeSessionsStore(storage).load().sessions.map((row) => row.id), ['newer']);
  const store = createUrgeSessionsStore(storage);
  assert.throws(() => store.save({
    ...emptyUrgeSessionsRecord(),
    sessions: [session({ id: 'a' }), session({ id: 'b' })],
  }), RangeError);
});

test('the timer counts down from the chosen length and never goes negative', () => {
  const running = startUrgeSession('urge-1', 10, NOW);
  assert.equal(urgeRemainingMs(running, NOW), 600_000);
  assert.equal(urgeRemainingMs(running, toInstant(NOW + 240_000)), 360_000);
  assert.equal(urgeRemainingMs(running, toInstant(NOW + 900_000)), 0);
  assert.equal(urgeHasElapsed(running, toInstant(NOW + 599_999)), false);
  assert.equal(urgeHasElapsed(running, toInstant(NOW + 600_000)), true);
});

test('the countdown rounds the last second up so it is shown in full', () => {
  assert.equal(formatUrgeRemaining(600_000), '10:00');
  assert.equal(formatUrgeRemaining(59_999), '1:00');
  assert.equal(formatUrgeRemaining(1), '0:01');
  assert.equal(formatUrgeRemaining(0), '0:00');
});

test('a finished session keeps its first outcome and never ends before it started', () => {
  const running = startUrgeSession('urge-1', 10, NOW);
  const finished = finishUrgeSession(running, 'still_there', toInstant(NOW + 300_000));
  assert.equal(finished.outcome, 'still_there');
  assert.equal(finishUrgeSession(finished, 'easier', toInstant(NOW + 900_000)), finished);
  const clamped = finishUrgeSession(running, 'easier', toInstant(NOW - 5_000));
  assert.equal(clamped.endedAt, NOW);
});

test('the running timer is the newest one, and a forgotten one stops counting', () => {
  const stale = session({ id: 'stale', startedAt: toInstant(NOW - 10 * 60_000) });
  assert.equal(openUrgeSession([stale], NOW), stale);
  assert.equal(openUrgeSession([stale], toInstant(NOW + URGE_STALE_AFTER_MS)), null);
  const finished = session({ id: 'done', endedAt: toInstant(NOW), outcome: 'easier' });
  assert.equal(openUrgeSession([stale, finished], NOW), stale);
});

test('the summary counts sittings, not victories', () => {
  const summary = summariseUrgeSessions([
    session({ id: 'a', endedAt: toInstant(NOW - 2 * DAY), outcome: 'easier' }),
    session({ id: 'b', endedAt: toInstant(NOW - 3 * DAY), outcome: 'still_there' }),
    session({ id: 'c', endedAt: toInstant(NOW - 30 * DAY), outcome: 'easier' }),
    session({ id: 'running' }),
  ], NOW);
  assert.deepEqual(summary, { total: 3, lastSevenDays: 2, easier: 2 });
});
