import type { DailyCheckin } from '../../domain/schemas/profile.ts';
import { abstinenceDayAt } from '../../domain/breaks/break-time.ts';
import { toInstant } from '../../domain/schemas/time.ts';

/** Latest saved no-use entry in the current abstinence day. Excludes stale,
 * future and pre-segment rows; reversing the scan resolves equal timestamps. */
export function latestTodayCheckin(checkins: readonly DailyCheckin[], anchor: number | null, now: number): number {
  if (anchor === null) return -1;
  const day = abstinenceDayAt(toInstant(now), toInstant(anchor));
  let index = -1;
  let latest = -Infinity;
  for (let i = 0; i < checkins.length; i++) {
    const row = checkins[i]!;
    const at = Date.parse(row.recordedAt);
    if (row.usedThc || !Number.isFinite(at) || at < anchor || at > now) continue;
    if (abstinenceDayAt(toInstant(at), toInstant(anchor)) !== day || at < latest) continue;
    index = i; latest = at;
  }
  return index;
}
