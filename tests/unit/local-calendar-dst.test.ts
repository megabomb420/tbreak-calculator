// Local-calendar boundaries that only differ from UTC when the host offset is
// not zero, plus the daylight-saving transitions inside a plan-start window.
//
// These run under the `test:tz:pacific` script (TZ=America/Los_Angeles, DST
// transitions 2026-03-08 and 2026-11-01). Run anywhere else they skip rather
// than pass for the wrong reason.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { toInstant } from '../../src/domain/schemas/time.ts';
import {
  dateInputBounds,
  formatIsoWithOffset,
  localIsoDate,
  planStartBounds,
  resolvePlanStartDate,
} from '../../src/application/questionnaire/date-answers.ts';

const PACIFIC = 'America/Los_Angeles';
const inPacific = process.env.TBREAK_TZ === PACIFIC;
const SKIP = `set TBREAK_TZ=${PACIFIC} (npm run test:tz:pacific)`;

/** Sunday 01 Mar 2026, 21:30 PST — the 14-day window ends after the 8 Mar DST jump. */
const BEFORE_SPRING_FORWARD = toInstant(Date.parse('2026-03-02T05:30:00.000Z'));
/** Monday 26 Oct 2026, 10:30 PDT — the window ends after the 1 Nov DST jump. */
const BEFORE_FALL_BACK = toInstant(Date.parse('2026-10-26T17:30:00.000Z'));
describe('local-calendar bounds at a daylight-saving transition', { skip: !inPacific && SKIP }, () => {
  it('spans whole local calendar days across the spring-forward change', () => {
    const bounds = planStartBounds(BEFORE_SPRING_FORWARD);
    assert.equal(bounds.min, '2026-03-01');
    assert.equal(bounds.max, '2026-03-15');
  });

  it('spans whole local calendar days across the fall-back change', () => {
    const bounds = planStartBounds(BEFORE_FALL_BACK);
    assert.equal(bounds.min, '2026-10-26');
    assert.equal(bounds.max, '2026-11-09');
  });

  it('keeps the picked start date on its local calendar day across both changes', () => {
    for (const now of [BEFORE_SPRING_FORWARD, BEFORE_FALL_BACK]) {
      const { min, max } = planStartBounds(now);
      assert.equal(localIsoDate(resolvePlanStartDate(min, now)!), min);
      // A start date is local midnight, whatever the offset is that day.
      const picked = resolvePlanStartDate(max, now)!;
      assert.equal(localIsoDate(picked), max);
      const at = new Date(picked);
      assert.equal(at.getHours(), 0);
      assert.equal(at.getMinutes(), 0);
    }
  });

  it('rejects a start date outside the local window', () => {
    const bounds = planStartBounds(BEFORE_SPRING_FORWARD);
    assert.equal(resolvePlanStartDate('2026-02-28', BEFORE_SPRING_FORWARD), null);
    assert.equal(resolvePlanStartDate('2026-03-16', BEFORE_SPRING_FORWARD), null);
    assert.equal(resolvePlanStartDate(bounds.min, BEFORE_SPRING_FORWARD), BEFORE_SPRING_FORWARD);
  });

  it('reports day-window bounds in local dates either side of the change', () => {
    // 09:00 PDT on 2026-03-08; the 30-day window starts on 2026-02-06.
    const afterSpringForward = toInstant(Date.parse('2026-03-08T16:00:00.000Z'));
    assert.equal(dateInputBounds(afterSpringForward, 'within_30_days').max, '2026-03-08');
    assert.equal(dateInputBounds(afterSpringForward, 'within_30_days').min, '2026-02-06');
    assert.equal(dateInputBounds(afterSpringForward, 'any_past').min, '1970-01-01');
  });

  it('stays consistent with an offset-qualified timestamp on the transition day', () => {
    // 23:30 on 2026-03-08 is still that local day even after the offset moved.
    const lateEvening = toInstant(Date.parse('2026-03-09T06:30:00.000Z'));
    assert.equal(localIsoDate(lateEvening), '2026-03-08');
    assert.equal(formatIsoWithOffset(new Date(lateEvening)).slice(0, 10), '2026-03-08');
  });
});
