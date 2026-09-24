// The stored check-in reminder: one time, on or off. A preference the person
// set, so it travels in the backup file and is cleared by delete-everything.

import type { StorageAdapter } from '../../infrastructure/storage/storage-adapter.ts';
import { isRecord } from './record-codec.ts';
import { isValidReminderTime } from '../../domain/reminders/checkin-reminder.ts';

export const CHECKIN_REMINDER_SCHEMA_VERSION = 'checkin-reminder-v1' as const;
export const CHECKIN_REMINDER_KEY = 'tbreak.checkin-reminder.v1';

export interface CheckinReminderRecord {
  readonly schemaVersion: typeof CHECKIN_REMINDER_SCHEMA_VERSION;
  readonly enabled: boolean;
  /** 24-hour local `HH:MM`, or null while it has never been set. */
  readonly time: string | null;
}

export interface CheckinReminderStore {
  readonly load: () => CheckinReminderRecord | null;
  readonly save: (record: CheckinReminderRecord) => void;
  readonly clear: () => void;
}

export function isValidCheckinReminder(value: unknown): value is CheckinReminderRecord {
  if (!isRecord(value)) return false;
  if (value.schemaVersion !== CHECKIN_REMINDER_SCHEMA_VERSION) return false;
  if (typeof value.enabled !== 'boolean') return false;
  return value.time === null || isValidReminderTime(value.time);
}

export function createCheckinReminderStore(
  adapter: StorageAdapter,
  key: string = CHECKIN_REMINDER_KEY,
): CheckinReminderStore {
  return {
    load: () => {
      const raw = adapter.getItem(key);
      if (raw === null) return null;
      try {
        const parsed: unknown = JSON.parse(raw);
        return isValidCheckinReminder(parsed) ? parsed : null;
      } catch {
        return null;
      }
    },
    save: (record) => {
      if (!isValidCheckinReminder(record)) throw new RangeError('invalid check-in reminder');
      adapter.setItem(key, JSON.stringify(record));
    },
    clear: () => {
      adapter.removeItem(key);
    },
  };
}
