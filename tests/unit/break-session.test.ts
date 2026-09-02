import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  acknowledgeCompletedBreak,
  activateDuePlans,
  cancelPlannedBreak,
  completeBreakPlan,
  confirmBreakUse,
  confirmTrackingUse,
  createBreakPlan,
  createTracking,
  currentLiveAttempt,
  currentLiveTracking,
  currentScheduledPlan,
  emptySessionState,
  endBreakEarly,
  recordNoUseCheckin,
  recordSymptomCheckin,
  stopTracking,
  suspendBreak,
  suspendTracking,
  updatePostBreakPlan,
  type BreakSessionState,
} from '../../src/application/break/break-session.ts';
import { defaultPostBreakPlan } from '../../src/application/break/post-break-plan.ts';
import { MILLIS_PER_DAY, toInstant, type Instant } from '../../src/domain/schemas/time.ts';

const C0: Instant = toInstant(1787184000000);
const ANCHOR: Instant = toInstant(C0 - 3 * MILLIS_PER_DAY);
const USED_AT: Instant = toInstant(C0 - MILLIS_PER_DAY);

function startNow(): BreakSessionState {
  return createBreakPlan(emptySessionState(), {
    id: 'attempt-1',
    calculationRecordId: 'calc-1',
    targetDurationDays: 21,
    mode: 'occasional',
    planStart: C0,
    now: C0,
    anchor: ANCHOR,
  });
}

function suspendNow(state: BreakSessionState): BreakSessionState {
  const result = suspendBreak(state, 'attempt-1', C0);
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('unreachable');
  return result.state;
}

describe('break session: plan creation and activation', () => {
  it('creates an active finite break plan from a now start, anchored at last use', () => {
    const state = startNow();
    const attempt = currentLiveAttempt(state.attempts);
    assert.ok(attempt !== null);
    assert.equal(attempt?.status, 'active');
    assert.equal(attempt?.segments[0]?.startedFromLastUseAt, ANCHOR);
    assert.equal(attempt?.postBreakPlan?.mode, 'occasional');
    assert.equal(attempt?.completionAcknowledged, false);
  });

  it('refuses a second live plan or tracking run', () => {
    const first = startNow();
    const second = createBreakPlan(first, {
      id: 'attempt-2',
      calculationRecordId: 'calc-1',
      targetDurationDays: 14,
      mode: 'undecided',
      planStart: C0,
      now: C0,
      anchor: ANCHOR,
    });
    assert.equal(second.attempts.length, 1);
    assert.equal(second.attempts[0]?.id, 'attempt-1');
    const withTracking = createTracking(first, {
      id: 'track-1',
      calculationRecordId: 'calc-1',
      startedAt: C0,
      anchor: ANCHOR,
    });
    assert.equal(withTracking.tracking.length, 0);
  });

  it('creates a planned attempt for a future start with no segments', () => {
    const future = toInstant(C0 + 2 * MILLIS_PER_DAY);
    const state = createBreakPlan(emptySessionState(), {
      id: 'attempt-1',
      calculationRecordId: 'calc-1',
      targetDurationDays: 14,
      mode: 'undecided',
      planStart: future,
      now: C0,
      anchor: ANCHOR,
    });
    const attempt = currentLiveAttempt(state.attempts);
    assert.equal(attempt?.status, 'planned');
    assert.deepEqual(attempt?.segments, []);
    assert.equal(currentScheduledPlan(state.attempts)?.id, 'attempt-1');
  });

  it('keeps a future plan planned even without an anchor, and activates it later', () => {
    const future = toInstant(C0 + MILLIS_PER_DAY);
    let state = createBreakPlan(emptySessionState(), {
      id: 'attempt-1',
      calculationRecordId: 'calc-1',
      targetDurationDays: 14,
      mode: 'continue_abstinence',
      planStart: future,
      now: C0,
      anchor: ANCHOR,
    });
    // Not yet due.
    state = activateDuePlans(state, () => ANCHOR, C0);
    assert.equal(currentLiveAttempt(state.attempts)?.status, 'planned');
    // Due once the plan start arrives.
    const afterStart = toInstant(C0 + 2 * MILLIS_PER_DAY);
    state = activateDuePlans(state, () => ANCHOR, afterStart);
    const attempt = currentLiveAttempt(state.attempts);
    assert.equal(attempt?.status, 'active');
    assert.equal(attempt?.segments[0]?.startedFromLastUseAt, ANCHOR);
  });

  it('cancels a planned attempt that has not started', () => {
    const future = toInstant(C0 + MILLIS_PER_DAY);
    const planned = createBreakPlan(emptySessionState(), {
      id: 'attempt-1',
      calculationRecordId: 'calc-1',
      targetDurationDays: 14,
      mode: 'undecided',
      planStart: future,
      now: C0,
      anchor: ANCHOR,
    });
    const outcome = cancelPlannedBreak(planned, 'attempt-1');
    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.equal(outcome.state.attempts.length, 0);
    // An active attempt cannot be cancelled.
    assert.deepEqual(cancelPlannedBreak(startNow(), 'attempt-1'), { ok: false, code: 'expected_planned' });
  });
});

describe('break session: interruption, confirmation, restart', () => {
  it('suspends an active break when use is reported', () => {
    const state = suspendNow(startNow());
    assert.equal(currentLiveAttempt(state.attempts)?.status, 'interrupted_time_needed');
    assert.equal(state.checkins.length, 0); // no record until confirmed
  });

  it('confirms use, restarts from the usedAt and records the use-day check-in', () => {
    const state = suspendNow(startNow());
    const outcome = confirmBreakUse(state, { id: 'attempt-1', usedAt: USED_AT, usedAtIso: new Date(USED_AT).toISOString(), now: C0 });
    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    const attempt = currentLiveAttempt(outcome.state.attempts);
    assert.equal(attempt?.status, 'active');
    assert.equal(attempt?.segments.length, 2);
    assert.equal(attempt?.segments[0]?.endReason, 'used_thc');
    assert.equal(attempt?.segments[1]?.startedFromLastUseAt, USED_AT);
    // The finite target duration is unchanged by the interruption.
    assert.equal(attempt?.targetDurationDays, 21);
    assert.equal(outcome.state.checkins.length, 1);
    const checkin = outcome.state.checkins[0];
    assert.equal(checkin?.usedThc, true);
    assert.equal(checkin?.usedAt?.value, new Date(USED_AT).toISOString());
    assert.equal(checkin?.craving, null);
  });

  it('rejects a confirmed usedAt before the segment anchor', () => {
    const state = suspendNow(startNow());
    const before = toInstant(ANCHOR - MILLIS_PER_DAY);
    const outcome = confirmBreakUse(state, { id: 'attempt-1', usedAt: before, usedAtIso: new Date(before).toISOString(), now: C0 });
    assert.deepEqual(outcome, { ok: false, code: 'used_at_before_segment_start' });
  });

  it('rejects a confirmed usedAt in the future', () => {
    const state = suspendNow(startNow());
    const future = toInstant(C0 + MILLIS_PER_DAY);
    const outcome = confirmBreakUse(state, {
      id: 'attempt-1',
      usedAt: future,
      usedAtIso: new Date(future).toISOString(),
      now: C0,
    });
    assert.deepEqual(outcome, { ok: false, code: 'used_at_in_the_future' });
  });

  it('supports a second interruption after a restart with history preserved', () => {
    let state = suspendNow(startNow());
    const first = confirmBreakUse(state, { id: 'attempt-1', usedAt: USED_AT, usedAtIso: new Date(USED_AT).toISOString(), now: C0 });
    if (!first.ok) throw new Error('unreachable');
    state = first.state;
    const secondUse = toInstant(USED_AT + MILLIS_PER_DAY);
    const second = suspendBreak(state, 'attempt-1', secondUse);
    if (!second.ok) throw new Error('unreachable');
    const restart = confirmBreakUse(second.state, { id: 'attempt-1', usedAt: secondUse, usedAtIso: new Date(secondUse).toISOString(), now: secondUse });
    assert.equal(restart.ok, true);
    if (!restart.ok) return;
    const attempt = currentLiveAttempt(restart.state.attempts);
    assert.equal(attempt?.segments.length, 3);
    assert.equal(attempt?.segments[0]?.startedFromLastUseAt, ANCHOR);
  });

  it('refuses suspension when the attempt is not active', () => {
    assert.deepEqual(suspendBreak(emptySessionState(), 'missing', C0), { ok: false, code: 'attempt_not_found' });
    const plannedFuture = createBreakPlan(emptySessionState(), {
      id: 'attempt-1',
      calculationRecordId: 'calc-1',
      targetDurationDays: 14,
      mode: 'undecided',
      planStart: toInstant(C0 + MILLIS_PER_DAY),
      now: C0,
      anchor: ANCHOR,
    });
    assert.deepEqual(suspendBreak(plannedFuture, 'attempt-1', C0), { ok: false, code: 'expected_active' });
  });
});

describe('break session: open-ended tracking', () => {
  it('creates tracking with an anchor and no finite target', () => {
    const state = createTracking(emptySessionState(), {
      id: 'track-1',
      calculationRecordId: 'calc-1',
      startedAt: C0,
      anchor: ANCHOR,
    });
    const track = currentLiveTracking(state.tracking);
    assert.equal(track?.status, 'tracking');
    const record = track as unknown as Record<string, unknown>;
    assert.equal('targetDurationDays' in record, false);
  });

  it('suspends and restarts tracking from a confirmed use without a target date', () => {
    let state = createTracking(emptySessionState(), {
      id: 'track-1',
      calculationRecordId: 'calc-1',
      startedAt: C0,
      anchor: ANCHOR,
    });
    const suspended = suspendTracking(state, 'track-1', C0);
    assert.equal(suspended.ok, true);
    if (!suspended.ok) throw new Error('unreachable');
    state = suspended.state;
    assert.equal(currentLiveTracking(state.tracking)?.status, 'interrupted_time_needed');
    const confirmed = confirmTrackingUse(state, { id: 'track-1', usedAt: USED_AT, usedAtIso: new Date(USED_AT).toISOString(), now: C0 });
    assert.equal(confirmed.ok, true);
    if (!confirmed.ok) return;
    const track = currentLiveTracking(confirmed.state.tracking);
    assert.equal(track?.status, 'tracking');
    assert.equal(track?.segments.length, 2);
    assert.equal(track?.segments[1]?.startedFromLastUseAt, USED_AT);
    assert.equal(confirmed.state.checkins.length, 1);
  });

  it('stops tracking as a neutral end', () => {
    const state = createTracking(emptySessionState(), {
      id: 'track-1',
      calculationRecordId: 'calc-1',
      startedAt: C0,
      anchor: ANCHOR,
    });
    const outcome = stopTracking(state, 'track-1', C0, C0);
    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.equal(currentLiveTracking(outcome.state.tracking), null);
    assert.equal(outcome.state.tracking[0]?.status, 'ended');
  });
});

describe('break session: check-ins and completion', () => {
  it('records the fast no-use check-in', () => {
    const state = recordNoUseCheckin(emptySessionState(), C0);
    assert.equal(state.checkins.length, 1);
    assert.equal(state.checkins[0]?.usedThc, false);
    assert.equal(state.checkins[0]?.usedAt, null);
    assert.equal(state.checkins[0]?.craving, null);
  });

  it('records symptom check-ins with untouched fields null', () => {
    const state = recordSymptomCheckin(emptySessionState(), {
      now: C0,
      symptoms: { craving: 6, sleep: null, irritability: null, anxiety: null, appetite: null },
      note: 'private note',
    });
    const checkin = state.checkins[0];
    assert.equal(checkin?.craving, 6);
    assert.equal(checkin?.sleep, null);
    assert.equal(checkin?.note, 'private note');
  });

  it('completes an active break explicitly and acknowledges the card once', () => {
    const active = startNow();
    const targetAt = toInstant(ANCHOR + 21 * MILLIS_PER_DAY);
    const done = completeBreakPlan(active, 'attempt-1', targetAt, targetAt);
    assert.equal(done.ok, true);
    if (!done.ok) return;
    assert.equal(currentLiveAttempt(done.state.attempts)?.status, 'completed');
    const acknowledged = acknowledgeCompletedBreak(done.state, 'attempt-1', targetAt);
    assert.equal(acknowledged.ok, true);
    if (!acknowledged.ok) return;
    assert.equal(currentLiveAttempt(acknowledged.state.attempts), null);
    const stored = acknowledged.state.attempts[0];
    assert.equal(stored?.status, 'completed');
    assert.equal(stored?.completionAcknowledged, true);
    assert.equal(stored?.segments.length, 1);
  });

  it('ends an active break early with a neutral state', () => {
    const outcome = endBreakEarly(startNow(), 'attempt-1', C0, C0);
    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.equal(currentLiveAttempt(outcome.state.attempts), null);
    assert.equal(outcome.state.attempts[0]?.status, 'ended');
    assert.equal(outcome.state.attempts[0]?.segments[0]?.endReason, 'user_ended');
  });

  it('only completes or ends an active attempt', () => {
    const completed = completeBreakPlan(startNow(), 'missing', C0, C0);
    assert.equal(completed.ok, false);
    const interrupted = suspendNow(startNow());
    assert.deepEqual(completeBreakPlan(interrupted, 'attempt-1', C0, C0), { ok: false, code: 'expected_active' });
    assert.deepEqual(endBreakEarly(interrupted, 'attempt-1', C0, C0), { ok: false, code: 'expected_active' });
    assert.deepEqual(completeBreakPlan(startNow(), 'attempt-1', C0, C0), { ok: false, code: 'not_at_target_date' });
  });

  it('updates the post-break mode and limits from plan detail while planned or active', () => {
    const state = startNow();
    const next = updatePostBreakPlan(state, 'attempt-1', {
      mode: 'reduced_regular_use',
      plan: defaultPostBreakPlan('reduced_regular_use'),
      now: C0,
    });
    assert.equal(next.ok, true);
    if (!next.ok) return;
    const attempt = currentLiveAttempt(next.state.attempts);
    assert.equal(attempt?.postBreakMode, 'reduced_regular_use');
    assert.equal(attempt?.postBreakPlan?.mode, 'reduced_regular_use');
    // Not editable once ended.
    const ended = endBreakEarly(state, 'attempt-1', C0, C0);
    if (!ended.ok) throw new Error('unreachable');
    assert.deepEqual(updatePostBreakPlan(ended.state, 'attempt-1', {
      mode: 'occasional',
      plan: defaultPostBreakPlan('occasional'),
      now: C0,
    }), { ok: false, code: 'not_editable' });
  });
});
