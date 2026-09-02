// Time handling for the deterministic domain core.
//
// Instants are integer epoch-millisecond values branded as `Instant`. All
// elapsed-time arithmetic uses exact UTC instants and fixed 24-hour periods
// (CALCULATOR_SPEC section 5 rules 1-2); no locale-dependent calendar or
// timezone arithmetic is used anywhere in the domain.

export type Instant = number & { readonly __instantBrand: unique symbol };

export const MILLIS_PER_HOUR = 3_600_000;
export const MILLIS_PER_DAY = 24 * MILLIS_PER_HOUR;
export const THIRTY_DAY_WINDOW_MS = 30 * MILLIS_PER_DAY;

export function toInstant(epochMilliseconds: number): Instant {
  if (!Number.isInteger(epochMilliseconds) || !Number.isFinite(epochMilliseconds)) {
    throw new RangeError(`epochMilliseconds must be a finite integer, got ${epochMilliseconds}`);
  }
  return epochMilliseconds as Instant;
}

// Matches ISO-8601 with an explicit UTC designator ("Z") or a numeric
// "+HH:MM"/"-HH:MM" offset. Seconds are optional; fractional seconds are
// optional and limited to millisecond precision. Naive timestamps without a
// timezone are rejected because they cannot be normalised to a UTC instant.
const ISO_TIMESTAMP_WITH_TIMEZONE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;

/** Parses a submitted timestamp into a UTC instant, or returns null when the
 * string is not a supported ISO-8601 timestamp with an explicit timezone. */
export function parseSubmittedTimestamp(text: string): Instant | null {
  if (!ISO_TIMESTAMP_WITH_TIMEZONE.test(text)) return null;
  const epochMilliseconds = Date.parse(text);
  if (Number.isNaN(epochMilliseconds)) return null;
  return toInstant(epochMilliseconds);
}

/** True when the instant lies at or after `now` (a future last-use is invalid). */
export function isFuture(instant: Instant, now: Instant): boolean {
  return instant > now;
}

/** Elapsed whole 24-hour periods between `now` and `lastUse` (see spec 7.8). */
export function elapsedWholeDays(now: Instant, lastUse: Instant): number {
  return Math.floor((now - lastUse) / MILLIS_PER_DAY);
}
