import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fixedClock, systemClock } from '../../src/infrastructure/clock.ts';
import { toInstant } from '../../src/domain/schemas/time.ts';

describe('explicit/injectable clock', () => {
  it('fixedClock always reports its pinned instant', () => {
    const at = toInstant(1787184000000);
    const clock = fixedClock(at);
    assert.equal(clock.now(), at);
    assert.equal(clock.now(), at);
  });

  it('systemClock reports a wall-clock instant close to Date.now()', () => {
    const before = Date.now();
    const now = systemClock.now();
    const after = Date.now();
    assert.ok(now >= before && now <= after);
  });
});
