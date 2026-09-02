import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  confirmAbstinenceUse,
  createAbstinenceTrack,
  interruptAbstinenceTrack,
  stopAbstinenceTrack,
  type AbstinenceTrack,
} from '../../src/domain/breaks/abstinence-track.ts';
import { MILLIS_PER_DAY, toInstant, type Instant } from '../../src/domain/schemas/time.ts';

const C0: Instant = toInstant(1787184000000);
const ANCHOR: Instant = toInstant(C0 - 3 * MILLIS_PER_DAY);
const USED_AT: Instant = toInstant(C0 - 1 * MILLIS_PER_DAY);

function newTrack(): AbstinenceTrack {
  return createAbstinenceTrack({ id: 'track-1', calculationRecordId: 'calc-1', startedAt: C0, anchor: ANCHOR });
}

describe('open-ended abstinence tracking (D4, UX_SPEC 9.8)', () => {
  it('creates a tracking record with no target duration and no completion state', () => {
    const track = newTrack();
    assert.equal(track.status, 'tracking');
    assert.equal('targetDurationDays' in track, false);
    assert.equal('completed' in track, false);
    assert.deepEqual(track.segments, [{ startedFromLastUseAt: ANCHOR, endedAt: null, endReason: null }]);
  });

  it('suspends timing without closing the segment until use is confirmed', () => {
    const result = interruptAbstinenceTrack(newTrack());
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.track.status, 'interrupted_time_needed');
    assert.equal(result.track.segments.length, 1);
    assert.equal(result.track.segments[0]?.endedAt, null);
  });

  it('restarts the timeline from the confirmed use with no target recomputation', () => {
    const interrupted = interruptAbstinenceTrack(newTrack());
    if (!interrupted.ok) return;
    const result = confirmAbstinenceUse(interrupted.track, USED_AT);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.track.status, 'tracking');
    assert.deepEqual(result.track.segments, [
      { startedFromLastUseAt: ANCHOR, endedAt: USED_AT, endReason: 'used_thc' },
      { startedFromLastUseAt: USED_AT, endedAt: null, endReason: null },
    ]);
  });

  it('supports repeated interruptions on open-ended tracking', () => {
    const first = interruptAbstinenceTrack(newTrack());
    if (!first.ok) return;
    const restarted = confirmAbstinenceUse(first.track, USED_AT);
    if (!restarted.ok) return;
    const secondUse = toInstant(USED_AT + MILLIS_PER_DAY);
    const second = interruptAbstinenceTrack(restarted.track);
    assert.equal(second.ok, true);
    if (!second.ok) return;
    const secondRestart = confirmAbstinenceUse(second.track, secondUse);
    assert.equal(secondRestart.ok, true);
    if (!secondRestart.ok) return;
    assert.equal(secondRestart.track.segments.length, 3);
  });

  it('rejects a confirmed use before the segment start', () => {
    const interrupted = interruptAbstinenceTrack(newTrack());
    if (!interrupted.ok) return;
    assert.deepEqual(confirmAbstinenceUse(interrupted.track, toInstant(ANCHOR - MILLIS_PER_DAY)), {
      ok: false,
      code: 'used_at_before_segment_start',
    });
  });

  it('only interrupts an active tracking record', () => {
    assert.deepEqual(interruptAbstinenceTrack({ ...newTrack(), status: 'interrupted_time_needed' }), {
      ok: false,
      code: 'expected_tracking',
    });
    assert.deepEqual(interruptAbstinenceTrack({ ...newTrack(), status: 'ended' }), {
      ok: false,
      code: 'expected_tracking',
    });
  });

  it('only confirms a use on a paused tracking record', () => {
    assert.deepEqual(confirmAbstinenceUse(newTrack(), USED_AT), {
      ok: false,
      code: 'expected_interrupted_time_needed',
    });
  });

  it('stops tracking as a neutral end and preserves earlier segments', () => {
    const track = newTrack();
    const result = stopAbstinenceTrack(track, C0);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.track.status, 'ended');
    assert.deepEqual(result.track.segments, [
      { startedFromLastUseAt: ANCHOR, endedAt: C0, endReason: 'user_ended' },
    ]);
  });

  it('can stop tracking while paused, and rejects ending an ended record', () => {
    const interrupted = interruptAbstinenceTrack(newTrack());
    if (!interrupted.ok) return;
    const stopped = stopAbstinenceTrack(interrupted.track, C0);
    assert.equal(stopped.ok, true);
    if (!stopped.ok) return;
    assert.deepEqual(stopAbstinenceTrack(stopped.track, C0), { ok: false, code: 'expected_tracking' });
  });

  it('never acquires a fake finite target or completion milestone', () => {
    const track = newTrack();
    const record = track as unknown as Record<string, unknown>;
    assert.equal('targetDurationDays' in record, false);
    assert.equal('completed' in record, false);
    assert.notEqual(track.status, 'completed');
    // The status set has no completed member by construction.
    const statuses: readonly string[] = ['tracking', 'interrupted_time_needed', 'ended'];
    assert.equal(statuses.includes(track.status), true);
  });

  it('is deterministic across identical transition sequences', () => {
    const run = (): AbstinenceTrack => {
      const interrupted = interruptAbstinenceTrack(newTrack());
      if (!interrupted.ok) throw new Error('unreachable');
      const restarted = confirmAbstinenceUse(interrupted.track, USED_AT);
      if (!restarted.ok) throw new Error('unreachable');
      return restarted.track;
    };
    assert.deepEqual(run(), run());
  });
});
