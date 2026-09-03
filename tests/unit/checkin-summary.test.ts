// Check-in summary facts for the recovery outlook (0.9.0).

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  hasMeaningfulCheckinData,
  highestCravingObservation,
  sleepFirstToLaterChange,
  type CheckinDayRow,
} from '../../src/domain/checkins/checkin-summary.ts';

function row(day: number, craving: number | null, sleep: number | null): CheckinDayRow {
  return { breakDay: day, craving, sleep, irritability: null, anxiety: null, appetite: null };
}

describe('check-in summary facts', () => {
  it('omits the highest-craving fact when nothing was rated', () => {
    assert.equal(highestCravingObservation([]), null);
    assert.equal(highestCravingObservation([row(1, null, 4), row(2, null, 5)]), null);
  });

  it('derives the highest craving with the first day it occurred', () => {
    const fact = highestCravingObservation([
      row(1, 4, 5),
      row(3, 8, 4),
      row(5, 6, 6),
      row(6, 8, 7),
    ]);
    assert.deepEqual(fact, { day: 3, craving: 8 });
  });

  it('keeps null cravings out of the calculation entirely', () => {
    const fact = highestCravingObservation([row(1, null, 5), row(2, 2, 5), row(3, 9, 5)]);
    assert.deepEqual(fact, { day: 3, craving: 9 });
  });

  it('derives sleep change between the first and later rated check-ins', () => {
    const fact = sleepFirstToLaterChange([
      row(1, null, 3),
      row(4, null, 4),
      row(9, null, 6),
    ]);
    assert.deepEqual(fact, { firstDay: 1, firstValue: 3, laterDay: 9, laterValue: 6 });
  });

  it('requires two rated check-ins on different days for a sleep change', () => {
    assert.equal(sleepFirstToLaterChange([row(1, null, 4)]), null);
    assert.equal(sleepFirstToLaterChange([row(1, null, 4), row(1, null, 5)]), null);
    assert.equal(sleepFirstToLaterChange([row(1, null, null), row(2, null, 5)]), null);
  });

  it('sparse data yields no meaningful block', () => {
    assert.equal(hasMeaningfulCheckinData([]), false);
    assert.equal(hasMeaningfulCheckinData([row(1, 5, null), row(1, null, 5)]), false);
    // One rated day with no later rated day is still sparse.
    assert.equal(hasMeaningfulCheckinData([row(1, 5, null), row(3, null, null)]), false);
    assert.equal(hasMeaningfulCheckinData([row(1, 5, null), row(3, 4, null)]), true);
  });
});
