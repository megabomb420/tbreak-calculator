import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_REMINDER_TIME,
  isCheckinReminderDue,
  isValidReminderTime,
  reminderLine,
} from '../../src/domain/reminders/checkin-reminder.ts';
import {
  createCheckinReminderStore,
  CHECKIN_REMINDER_KEY,
} from '../../src/application/progress/reminder-store.ts';
import { createMemoryStorage } from '../../src/infrastructure/storage/storage-adapter.ts';
import { toInstant, type Instant } from '../../src/domain/schemas/time.ts';

// Local-time semantics: the rule reads the device clock's own hour, so the
// cases below are built from local Date parts rather than a UTC string.
function local(at: string): Instant {
  return toInstant(new Date(at).getTime());
}

test('the reminder fires only after its local time has passed', () => {
  const time = '21:00';
  const base = { enabled: true, time, checkedInToday: false };
  assert.equal(isCheckinReminderDue({ ...base, now: local('2026-09-24T20:59:00') }), false);
  assert.equal(isCheckinReminderDue({ ...base, now: local('2026-09-24T21:00:00') }), true);
  assert.equal(isCheckinReminderDue({ ...base, now: local('2026-09-24T23:40:00') }), true);
});

test('a check-in already recorded today silences it, and so does switching it off', () => {
  const now = local('2026-09-24T22:00:00');
  assert.equal(isCheckinReminderDue({ enabled: true, time: '21:00', now, checkedInToday: true }), false);
  assert.equal(isCheckinReminderDue({ enabled: false, time: '21:00', now, checkedInToday: false }), false);
  assert.equal(isCheckinReminderDue({ enabled: true, time: null, now, checkedInToday: false }), false);
});

test('an unreadable stored time never fires', () => {
  const now = local('2026-09-24T22:00:00');
  assert.equal(isCheckinReminderDue({ enabled: true, time: '9:00', now, checkedInToday: false }), false);
  assert.equal(isCheckinReminderDue({ enabled: true, time: '25:00', now, checkedInToday: false }), false);
  assert.equal(isCheckinReminderDue({ enabled: true, time: '', now, checkedInToday: false }), false);
});

test('accepts 24-hour local times only', () => {
  assert.equal(isValidReminderTime('00:00'), true);
  assert.equal(isValidReminderTime('23:59'), true);
  assert.equal(isValidReminderTime(DEFAULT_REMINDER_TIME), true);
  assert.equal(isValidReminderTime('24:00'), false);
  assert.equal(isValidReminderTime('7:30'), false);
  assert.equal(isValidReminderTime('21:60'), false);
  assert.equal(isValidReminderTime(null), false);
});

test('the reminder line names the time it was set for', () => {
  assert.equal(reminderLine('21:00'), 'You planned to check in around 21:00.');
  assert.equal(reminderLine('nonsense'), '');
});

test('the reminder round-trips through its store and heals from corruption', () => {
  const storage = createMemoryStorage();
  const store = createCheckinReminderStore(storage);
  assert.equal(store.load(), null);
  store.save({ schemaVersion: 'checkin-reminder-v1', enabled: true, time: '20:30' });
  assert.deepEqual(store.load(), { schemaVersion: 'checkin-reminder-v1', enabled: true, time: '20:30' });
  storage.setItem(CHECKIN_REMINDER_KEY, JSON.stringify({ schemaVersion: 'checkin-reminder-v1', enabled: 'yes', time: '20:30' }));
  assert.equal(store.load(), null);
  storage.setItem(CHECKIN_REMINDER_KEY, '{broken');
  assert.equal(store.load(), null);
  store.clear();
  assert.equal(storage.getItem(CHECKIN_REMINDER_KEY), null);
});
