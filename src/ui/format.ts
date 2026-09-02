// Display formatting helpers (display-only; instants stay UTC, formatting is
// local per UX_SPEC 2). No day arithmetic lives here.

import type { Instant } from '../domain/schemas/time.ts';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/** Local calendar date, e.g. "17 Sep 2026". */
export function formatLocalDay(instant: Instant): string {
  const date = new Date(instant);
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** Local weekday + date, e.g. "Thu 17 Sep". */
export function formatShortDay(instant: Instant): string {
  const date = new Date(instant);
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
  return `${weekdays[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}
