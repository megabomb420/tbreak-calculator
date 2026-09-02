// Abstinence clock arithmetic (CALCULATOR_SPEC section 7.8).
//
// `breakDay = floor((now - anchor) / 24 h) + 1` is the one day-counter
// formula every engine, plan, and open-ended tracking view reads. It runs
// from the authoritative last-use anchor whether or not a plan exists
// (UX_SPEC section 2). Domain and presentation code share this single pure
// implementation so no UI or service layer can compute its own day math.

import { MILLIS_PER_DAY, type Instant } from '../schemas/time.ts';

/** Whole-day abstinence count: 1 on the anchor day, N+1 after N full days. */
export function abstinenceDayAt(now: Instant, anchor: Instant): number {
  return Math.floor((now - anchor) / MILLIS_PER_DAY) + 1;
}
