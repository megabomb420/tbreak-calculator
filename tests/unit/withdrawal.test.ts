import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TOLERANCE_WITHDRAWAL_ANCHORS } from '../../src/domain/policies/tolerance-policy-v2.ts';
import { computeWithdrawalDisplay } from '../../src/domain/tolerance/withdrawal.ts';
import type { WithdrawalDisplay } from '../../src/domain/schemas/result.ts';
import { toInstant, MILLIS_PER_DAY, MILLIS_PER_HOUR, type Instant } from '../../src/domain/schemas/time.ts';

const C0: Instant = toInstant(1787184000000);
const HOURS = (hours: number): Instant => toInstant(C0 - hours * MILLIS_PER_HOUR);

function displayFor(lastUseAt: Instant): WithdrawalDisplay {
  return computeWithdrawalDisplay(lastUseAt, C0, TOLERANCE_WITHDRAWAL_ANCHORS);
}

function anchorNames(display: WithdrawalDisplay): string[] {
  return display.anchors.map((a) => a.anchor);
}

describe('elapsed withdrawal display (spec 7.8)', () => {
  it('anchors every closed statement relative to breakDay', () => {
    // Last use 2 hours ago -> breakDay 1.
    const day1 = displayFor(HOURS(2));
    assert.equal(day1.elapsedHours, 2);
    assert.equal(day1.breakDay, 1);
    assert.deepEqual(day1.anchors, [
      { anchor: 'onset', status: 'current' },
      { anchor: 'common_peak', status: 'upcoming' },
      { anchor: 'substantial_improvement', status: 'upcoming' },
      { anchor: 'sleep_disturbance', status: null },
    ]);
  });

  it('treats zero elapsed time as day 1', () => {
    const display = displayFor(C0);
    assert.equal(display.elapsedHours, 0);
    assert.equal(display.breakDay, 1);
    assert.equal(display.anchors[0]?.status, 'current'); // onset days 1-3
  });

  it('breaks at whole 24-hour periods: exactly 72 h elapsed is day 4', () => {
    const display = displayFor(HOURS(72));
    assert.equal(display.breakDay, 4);
    assert.deepEqual(display.anchors, [
      { anchor: 'onset', status: 'past' }, // onset days 1-3 ended
      { anchor: 'common_peak', status: 'current' }, // days 2-6
      { anchor: 'substantial_improvement', status: 'current' }, // days 4-14
      { anchor: 'sleep_disturbance', status: null },
    ]);
  });

  it('permits overlapping anchors to both be current', () => {
    const display = displayFor(HOURS(120)); // breakDay 6: onset past, peak current, improvement current
    const current = display.anchors.filter((a) => a.status === 'current').map((a) => a.anchor);
    assert.deepEqual(current, ['common_peak', 'substantial_improvement']);
  });

  it('marks past anchors once breakDay passes their end', () => {
    const display = displayFor(toInstant(C0 - 6 * MILLIS_PER_DAY)); // exactly 6 days -> breakDay 7
    assert.equal(display.breakDay, 7);
    assert.deepEqual(display.anchors.map((a) => a.status), ['past', 'past', 'current', null]);
  });

  it('marks improvement as past after day 14 and never dates the sleep statement', () => {
    const display = displayFor(toInstant(C0 - 14 * MILLIS_PER_DAY)); // exactly 14 days -> breakDay 15
    assert.equal(display.breakDay, 15);
    assert.deepEqual(display.anchors.map((a) => a.status), ['past', 'past', 'past', null]);
  });

  it('keeps anchors in fixed policy display order', () => {
    const display = displayFor(HOURS(2));
    assert.deepEqual(anchorNames(display), TOLERANCE_WITHDRAWAL_ANCHORS.map((a) => a.code));
  });

  it('reports fractional elapsed hours without rounding', () => {
    const display = displayFor(HOURS(2.5));
    assert.equal(display.elapsedHours, 2.5);
    assert.equal(display.breakDay, 1);
  });

  it('is deterministic for equal instants', () => {
    const a = displayFor(HOURS(30));
    const b = displayFor(HOURS(30));
    assert.deepEqual(a, b);
  });
});
