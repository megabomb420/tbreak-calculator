// Date-chip and day-part mapping for questionnaire last-use steps
// (UX_SPEC 4.3). Pure: callers pass an explicit `now`. The UI converts
// coarse human answers into an ISO-8601 timestamp with a timezone offset;
// provenance is applied later when the raw snapshot is built.

import {
  MILLIS_PER_DAY,
  parseSubmittedTimestamp,
  THIRTY_DAY_WINDOW_MS,
  type Instant,
} from '../../domain/schemas/time.ts';

export const DATE_CHIPS = [
  'today',
  'yesterday',
  'days_2_3',
  'about_a_week',
  'about_2_weeks',
  'about_a_month',
] as const;
export type DateChipId = (typeof DATE_CHIPS)[number];

export const DAY_PARTS = ['morning', 'afternoon', 'evening', 'night'] as const;
export type DayPart = (typeof DAY_PARTS)[number];

export const DAY_PART_HOURS: Record<DayPart, number> = {
  morning: 9,
  afternoon: 13,
  evening: 18,
  night: 23,
};

export type DateWindowKind = 'within_30_days' | 'older_than_30_days' | 'any_past';

/** Formats a local Date as ISO-8601 with an explicit numeric timezone offset. */
export function formatIsoWithOffset(date: Date): string {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hour = pad2(date.getHours());
  const minute = pad2(date.getMinutes());
  const second = pad2(date.getSeconds());
  const ms = pad3(date.getMilliseconds());
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  return `${year}-${month}-${day}T${hour}:${minute}:${second}.${ms}${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`;
}

export function isInstantInWindow(instant: Instant, now: Instant, window: DateWindowKind): boolean {
  if (instant > now) return false;
  const elapsed = now - instant;
  switch (window) {
    case 'within_30_days':
      return elapsed <= THIRTY_DAY_WINDOW_MS;
    case 'older_than_30_days':
      return elapsed > THIRTY_DAY_WINDOW_MS;
    case 'any_past':
      return true;
  }
}

/** Resolves a quick chip to an ISO timestamp, or null when it falls outside the step window. */
export function resolveDateChip(
  chip: DateChipId,
  dayPart: DayPart,
  now: Instant,
  window: DateWindowKind,
): string | null {
  const date = chipToDate(chip, dayPart, now);
  return constrainIso(formatIsoWithOffset(date), now, window);
}

/** Resolves a picked calendar date (`YYYY-MM-DD`) plus day-part. `Today` uses the current time. */
export function resolvePickedDate(
  isoDate: string,
  dayPart: DayPart,
  now: Instant,
  window: DateWindowKind,
): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const year = Number(isoDate.slice(0, 4));
  const month = Number(isoDate.slice(5, 7));
  const day = Number(isoDate.slice(8, 10));
  const picked = atDayPart(new Date(year, month - 1, day), dayPart);
  const current = new Date(now);
  if (sameLocalDay(picked, current)) {
    return constrainIso(formatIsoWithOffset(current), now, window);
  }
  return constrainIso(formatIsoWithOffset(picked), now, window);
}

export function localIsoDate(instant: Instant): string {
  const date = new Date(instant);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function dateInputBounds(
  now: Instant,
  window: DateWindowKind,
): { readonly min: string; readonly max: string } {
  const current = new Date(now);
  const max = localIsoDate(now);
  if (window === 'within_30_days') {
    return { min: localIsoDate((now - THIRTY_DAY_WINDOW_MS) as Instant), max };
  }
  if (window === 'older_than_30_days') {
    const latestOlder = now - THIRTY_DAY_WINDOW_MS - 1;
    return { min: '1970-01-01', max: localIsoDate(latestOlder as Instant) };
  }
  return { min: '1970-01-01', max };
}

function constrainIso(iso: string, now: Instant, window: DateWindowKind): string | null {
  const parsed = parseSubmittedTimestamp(iso);
  if (parsed === null) return null;
  return isInstantInWindow(parsed, now, window) ? iso : null;
}

function chipToDate(chip: DateChipId, dayPart: DayPart, now: Instant): Date {
  const current = new Date(now);
  switch (chip) {
    case 'today':
      return current;
    case 'yesterday':
      return atDayPart(addLocalDays(current, -1), dayPart);
    case 'days_2_3':
      return atDayPart(new Date(now - 2.5 * MILLIS_PER_DAY), dayPart);
    case 'about_a_week':
      return atDayPart(new Date(now - 7 * MILLIS_PER_DAY), dayPart);
    case 'about_2_weeks':
      return atDayPart(new Date(now - 14 * MILLIS_PER_DAY), dayPart);
    case 'about_a_month':
      return atDayPart(new Date(now - 30 * MILLIS_PER_DAY), dayPart);
  }
}

function atDayPart(date: Date, part: DayPart): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), DAY_PART_HOURS[part], 0, 0, 0);
}

function addLocalDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function sameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function pad3(value: number): string {
  return String(value).padStart(3, '0');
}
