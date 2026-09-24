// The check-in reminder as a pure rule.
//
// Local-only and deliberately modest: the app can only nudge someone while it
// is open or running in the background, so nothing here promises a notification
// at a time the platform cannot deliver. The rule answers one question — has
// the chosen local time passed today with no check-in recorded yet?

import type { Instant } from '../schemas/time.ts';

/** A reminder time is stored as 24-hour local `HH:MM`. */
export const REMINDER_TIME_PATTERN = /^([01][0-9]|2[0-3]):([0-5][0-9])$/;

export const DEFAULT_REMINDER_TIME = '21:00';

export function isValidReminderTime(value: unknown): value is string {
  return typeof value === 'string' && REMINDER_TIME_PATTERN.test(value);
}

export interface ReminderClock {
  readonly enabled: boolean;
  readonly time: string | null;
  readonly now: Instant;
  /** True once any check-in for today exists in the live segment. */
  readonly checkedInToday: boolean;
}

/**
 * True when today's reminder time has passed and nothing has been recorded
 * yet. It answers for the whole rest of the day — the app does not need to be
 * open exactly at the chosen minute.
 */
export function isCheckinReminderDue(clock: ReminderClock): boolean {
  if (!clock.enabled || clock.time === null || !isValidReminderTime(clock.time)) return false;
  if (clock.checkedInToday) return false;
  const [hour, minute] = clock.time.split(':').map(Number) as [number, number];
  const at = new Date(clock.now);
  return at.getHours() * 60 + at.getMinutes() >= hour * 60 + minute;
}

/** The sentence the reminder shows, e.g. "You planned to check in around 21:00." */
export function reminderLine(time: string): string {
  return isValidReminderTime(time) ? `You planned to check in around ${time}.` : '';
}
