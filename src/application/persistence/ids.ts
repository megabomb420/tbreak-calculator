// Record identifiers for durable stores. Prefix + clock + entropy keeps
// ids unique without a central allocator. Tests can pass a fixed suffix.

import type { Instant } from '../../domain/schemas/time.ts';

export function newRecordId(prefix: string, now: Instant, entropy: () => string = randomSuffix): string {
  return `${prefix}-${now}-${entropy()}`;
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Stable check-in id derived from the recorded instant. Collision-resistant
 * enough for local-only append-only check-ins; explicit ids win when present. */
export function checkinRecordId(recordedAt: string): string {
  return `checkin:${recordedAt}`;
}
