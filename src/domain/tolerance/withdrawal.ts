// Elapsed withdrawal display (CALCULATOR_SPEC section 7.8).
//
// Pure and deterministic: given the authoritative last-use instant, the
// calculation instant and the policy's fixed anchors, it positions each
// anchor as upcoming / current / past. The UI renders these engine-supplied
// positions and must not recalculate them.

import type { WithdrawalAnchor } from '../policies/tolerance-policy-v2.ts';
import type { WithdrawalAnchorState, WithdrawalDisplay } from '../schemas/result.ts';
import { MILLIS_PER_HOUR, type Instant } from '../schemas/time.ts';
import { abstinenceDayAt } from '../breaks/break-time.ts';

/**
 * Positions the withdrawal anchors at `calculatedAt` relative to the last use.
 * `calculatedAt` must not precede `lastUseAt` (future last use is rejected by
 * validation), so breakDay is always >= 1.
 */
export function computeWithdrawalDisplay(
  lastUseAt: Instant,
  calculatedAt: Instant,
  anchors: readonly WithdrawalAnchor[],
): WithdrawalDisplay {
  const elapsedMilliseconds = calculatedAt - lastUseAt;
  const elapsedHours = elapsedMilliseconds / MILLIS_PER_HOUR;
  const breakDay = abstinenceDayAt(calculatedAt, lastUseAt);

  const anchorStates: WithdrawalAnchorState[] = anchors.map((anchor) => ({
    anchor: anchor.code,
    status: anchorStatus(anchor.startDay, anchor.endDay, breakDay),
  }));

  return { breakDay, elapsedHours, anchors: anchorStates };
}

function anchorStatus(
  startDay: number | null,
  endDay: number | null,
  breakDay: number,
): WithdrawalAnchorState['status'] {
  // An anchor without a numeric day range (the open-ended sleep statement)
  // has no calculated end status.
  if (startDay === null || endDay === null) return null;
  if (breakDay < startDay) return 'upcoming';
  if (breakDay <= endDay) return 'current';
  return 'past';
}
