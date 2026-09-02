import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  completeBreak,
  confirmUsedAtAndRestart,
  createBreakAttempt,
  endBreak,
  interruptForUsedAtConfirmation,
  plannedTargetDate,
  startBreak,
  type BreakAttempt,
  type NewBreakAttemptInput,
} from '../../src/domain/breaks/break-attempt.ts';
import { MILLIS_PER_DAY, MILLIS_PER_HOUR, toInstant, type Instant } from '../../src/domain/schemas/time.ts';

const C0: Instant = toInstant(1787184000000);
const LAST_USE: Instant = toInstant(C0 - 5 * MILLIS_PER_DAY);
const USED_AT: Instant = toInstant(C0 - 2 * MILLIS_PER_DAY);
const TARGET_DAYS = 21;

function newAttempt(overrides: Partial<NewBreakAttemptInput> = {}): BreakAttempt {
  return createBreakAttempt({
    id: 'attempt-1',
    calculationRecordId: 'calc-1',
    targetDurationDays: TARGET_DAYS,
    postBreakMode: 'occasional',
    startedAt: C0,
    ...overrides,
  });
}

function mustStart(attempt: BreakAttempt): BreakAttempt {
  const result = startBreak(attempt, LAST_USE);
  assert.equal(result.ok, true);
  if (result.ok) return result.attempt;
  throw new Error('unreachable');
}

function mustInterrupt(attempt: BreakAttempt): BreakAttempt {
  const result = interruptForUsedAtConfirmation(attempt);
  assert.equal(result.ok, true);
  if (result.ok) return result.attempt;
  throw new Error('unreachable');
}

describe('break attempt lifecycle (ARCHITECTURE 8)', () => {
  it('creates a planned attempt with no segments', () => {
    const attempt = newAttempt();
    assert.equal(attempt.status, 'planned');
    assert.deepEqual(attempt.segments, []);
    assert.equal(attempt.targetDurationDays, TARGET_DAYS);
    assert.equal(attempt.postBreakMode, 'occasional');
  });

  it('starts the plan by opening the first segment at the authoritative last use', () => {
    const result = startBreak(newAttempt(), LAST_USE);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.attempt.status, 'active');
    assert.deepEqual(result.attempt.segments, [
      { startedFromLastUseAt: LAST_USE, endedAt: null, endReason: null },
    ]);
  });

  it('rejects starting an attempt that is not planned', () => {
    const active = mustStart(newAttempt());
    assert.deepEqual(startBreak(active, LAST_USE), { ok: false, code: 'expected_planned' });
  });
});

describe('interruption and restart (spec 7.9)', () => {
  it('suspends timing without closing the segment until usedAt is confirmed', () => {
    const attempt = mustStart(newAttempt());
    const interrupted = mustInterrupt(attempt);
    assert.equal(interrupted.status, 'interrupted_time_needed');
    assert.deepEqual(interrupted.segments, attempt.segments); // untouched
  });

  it('restarts the timeline from the confirmed usedAt and preserves history', () => {
    const attempt = mustInterrupt(mustStart(newAttempt()));
    const result = confirmUsedAtAndRestart(attempt, USED_AT);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const restarted = result.attempt;
    assert.equal(restarted.status, 'active');
    assert.equal(restarted.targetDurationDays, TARGET_DAYS); // unchanged by restart
    assert.deepEqual(restarted.segments, [
      { startedFromLastUseAt: LAST_USE, endedAt: USED_AT, endReason: 'used_thc' },
      { startedFromLastUseAt: USED_AT, endedAt: null, endReason: null },
    ]);
  });

  it('recomputes the target calendar date from the new last use', () => {
    const before = plannedTargetDate(LAST_USE, TARGET_DAYS);
    const after = plannedTargetDate(USED_AT, TARGET_DAYS);
    assert.equal(before, toInstant(LAST_USE + TARGET_DAYS * MILLIS_PER_DAY));
    assert.equal(after, toInstant(USED_AT + TARGET_DAYS * MILLIS_PER_DAY));
    assert.equal(after, toInstant(before + (USED_AT - LAST_USE)));
  });

  it('does not mutate the input attempt (pure transitions)', () => {
    const attempt = mustStart(newAttempt());
    const snapshot = structuredClone(attempt);
    const interrupted = mustInterrupt(attempt);
    const restarted = confirmUsedAtAndRestart(interrupted, USED_AT);
    assert.equal(restarted.ok, true);
    assert.deepEqual(attempt, snapshot);
  });

  it('allows a further interruption after a restart', () => {
    const attempt = mustInterrupt(mustStart(newAttempt()));
    const restarted = confirmUsedAtAndRestart(attempt, USED_AT);
    if (!restarted.ok) return;
    const secondUse = toInstant(USED_AT + MILLIS_PER_DAY);
    const secondInterruption = interruptForUsedAtConfirmation(restarted.attempt);
    assert.equal(secondInterruption.ok, true);
    if (!secondInterruption.ok) return;
    const secondRestart = confirmUsedAtAndRestart(secondInterruption.attempt, secondUse);
    assert.equal(secondRestart.ok, true);
    if (!secondRestart.ok) return;
    assert.deepEqual(secondRestart.attempt.segments, [
      { startedFromLastUseAt: LAST_USE, endedAt: USED_AT, endReason: 'used_thc' },
      { startedFromLastUseAt: USED_AT, endedAt: secondUse, endReason: 'used_thc' },
      { startedFromLastUseAt: secondUse, endedAt: null, endReason: null },
    ]);
  });
});

describe('break transition guards', () => {
  it('only interrupts an active attempt', () => {
    assert.deepEqual(interruptForUsedAtConfirmation(newAttempt()), { ok: false, code: 'expected_active' });
    const interrupted = mustInterrupt(mustStart(newAttempt()));
    assert.deepEqual(interruptForUsedAtConfirmation(interrupted), { ok: false, code: 'expected_active' });
  });

  it('only confirms a use on an interrupted attempt', () => {
    const active = mustStart(newAttempt());
    assert.deepEqual(confirmUsedAtAndRestart(active, USED_AT), {
      ok: false,
      code: 'expected_interrupted_time_needed',
    });
    const completed = completeBreak(mustStart(newAttempt()), C0);
    if (completed.ok) {
      assert.deepEqual(confirmUsedAtAndRestart(completed.attempt, USED_AT), {
        ok: false,
        code: 'expected_interrupted_time_needed',
      });
    }
  });

  it('rejects a confirmed usedAt that precedes the segment it closes', () => {
    const attempt = mustInterrupt(mustStart(newAttempt()));
    const before = toInstant(LAST_USE - MILLIS_PER_DAY);
    assert.deepEqual(confirmUsedAtAndRestart(attempt, before), {
      ok: false,
      code: 'used_at_before_segment_start',
    });
  });

  it('completes only an active attempt and closes the open segment', () => {
    const attempt = mustStart(newAttempt());
    const doneAt = toInstant(LAST_USE + TARGET_DAYS * MILLIS_PER_DAY);
    const result = completeBreak(attempt, doneAt);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.attempt.status, 'completed');
    assert.deepEqual(result.attempt.segments, [
      { startedFromLastUseAt: LAST_USE, endedAt: doneAt, endReason: 'completed' },
    ]);
    assert.deepEqual(completeBreak(newAttempt(), C0), { ok: false, code: 'expected_active' });
  });

  it('ends only an active attempt and closes the open segment as user_ended', () => {
    const attempt = mustStart(newAttempt());
    const result = endBreak(attempt, C0);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.attempt.status, 'ended');
    assert.deepEqual(result.attempt.segments, [
      { startedFromLastUseAt: LAST_USE, endedAt: C0, endReason: 'user_ended' },
    ]);
  });

  it('rejects completion or user-end before the segment start', () => {
    const attempt = mustStart(newAttempt());
    const tooEarly = toInstant(LAST_USE - MILLIS_PER_HOUR);
    assert.deepEqual(completeBreak(attempt, tooEarly), { ok: false, code: 'end_before_segment_start' });
    assert.deepEqual(endBreak(attempt, tooEarly), { ok: false, code: 'end_before_segment_start' });
  });

  it('is deterministic across identical transition sequences', () => {
    const run = (): BreakAttempt => {
      const interrupted = mustInterrupt(mustStart(newAttempt()));
      const restarted = confirmUsedAtAndRestart(interrupted, USED_AT);
      if (!restarted.ok) throw new Error('unreachable');
      return restarted.attempt;
    };
    assert.deepEqual(run(), run());
  });
});
