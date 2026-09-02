// Injectable clock (ARCHITECTURE section 3: infrastructure adapters).
//
// Domain functions never read a clock: they receive an explicit reference
// time (`Instant`). The `Clock` abstraction supplies that time at the
// application boundary so calculation and validation can be frozen in golden
// tests and replayed deterministically.

import { toInstant, type Instant } from '../domain/schemas/time.ts';

export interface Clock {
  readonly now: () => Instant;
}

/** Real clock backed by the host wall clock. Use only outside the domain core. */
export const systemClock: Clock = {
  now: () => toInstant(Date.now()),
};

/** Deterministic clock pinned to a fixed instant, for tests and replay. */
export function fixedClock(instant: Instant): Clock {
  return { now: () => instant };
}
