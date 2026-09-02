import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { deriveHistoryInsight, HISTORY_OUTSIDE_POPULATION_RANGE } from '../../src/domain/tolerance/history.ts';
import type { ValidatedPreviousBreak } from '../../src/domain/schemas/profile.ts';
import type { RecommendedRangeDays } from '../../src/domain/schemas/result.ts';
import { toInstant, type Instant } from '../../src/domain/schemas/time.ts';

const RANGE_14_21: RecommendedRangeDays = { min: 14, max: 21 };

function record(
  id: string,
  durationDays: number,
  toleranceReductionScore: number | null,
  endedAt: Instant | null = toInstant(1786200000000),
  createdAt: Instant = toInstant(1785600000000),
): ValidatedPreviousBreak {
  return { id, durationDays, toleranceReductionScore, endedAt, createdAt };
}

function insight(previousBreaks: readonly ValidatedPreviousBreak[], range: RecommendedRangeDays = RANGE_14_21) {
  return deriveHistoryInsight(previousBreaks, range);
}

describe('previous-break history inference (spec 7.7)', () => {
  it('returns null with fewer than two records', () => {
    assert.equal(insight([]), null);
    assert.equal(insight([record('b1', 14, 6)]), null);
  });

  it('ignores records without a 0-10 score (rule 1)', () => {
    const breaks = [record('b1', 14, null), record('b2', 21, 6)];
    assert.equal(insight(breaks), null); // only one eligible duration remains
  });

  it('collapses duplicate durations to the most recent record (rule 2)', () => {
    // The older 14-day record (score 9) would invert against 21 days (score 8);
    // the more recent one (score 5) does not, proving the most-recent rule.
    const earlier = record('b1', 14, 9, toInstant(1786200000000));
    const later = record('b2', 14, 5, toInstant(1786300000000));
    assert.deepEqual(insight([earlier, later, record('b3', 21, 8)]), {
      code: 'history_directional_observation',
      observations: [
        { durationDays: 14, toleranceReductionScore: 5 },
        { durationDays: 21, toleranceReductionScore: 8 },
      ],
      outsideRecommendedRange: false,
    });
  });

  it('falls back to createdAt when endedAt is absent', () => {
    // The earlier 14-day record (score 9) would invert against 21 days (score
    // 8); the later-created one (score 7) does not.
    const noEndedAt = record('b1', 14, 9, null, toInstant(1786000000000));
    const noEndedAtLater = record('b2', 14, 7, null, toInstant(1786100000000));
    const longer = record('b3', 21, 8);
    assert.deepEqual(insight([noEndedAt, longer, noEndedAtLater]), {
      code: 'history_directional_observation',
      observations: [
        { durationDays: 14, toleranceReductionScore: 7 },
        { durationDays: 21, toleranceReductionScore: 8 },
      ],
      outsideRecommendedRange: false,
    });
  });

  it('resolves exact timestamp ties deterministically by id', () => {
    // Identical endedAt and createdAt: the smallest id ('a', score 9) wins,
    // which inverts against 21 days (score 8); the discarded 'z' (score 5)
    // would not have.
    const sameReference = toInstant(1786200000000);
    const first = record('a', 14, 9, sameReference, sameReference);
    const last = record('z', 14, 5, sameReference, sameReference);
    const longer = record('b3', 21, 8);
    assert.deepEqual(insight([last, first, longer]), {
      code: 'history_mixed_no_directional_claim',
      observations: null,
      outsideRecommendedRange: false,
    });
  });

  it('emits mixed when any longer break has a lower score (rules 4-6)', () => {
    const breaks = [record('b1', 14, 8), record('b2', 21, 6)];
    assert.deepEqual(insight(breaks), {
      code: 'history_mixed_no_directional_claim',
      observations: null,
      outsideRecommendedRange: false,
    });
  });

  it('emits mixed for a non-monotonic series across three durations', () => {
    const breaks = [record('b1', 14, 6), record('b2', 21, 9), record('b3', 28, 7)];
    assert.deepEqual(insight(breaks), {
      code: 'history_mixed_no_directional_claim',
      observations: null,
      outsideRecommendedRange: false,
    });
  });

  it('emits no-additional-benefit when all scores are equal (rule 7)', () => {
    const breaks = [record('b1', 14, 6), record('b2', 21, 6), record('b3', 28, 6)];
    assert.deepEqual(insight(breaks), {
      code: 'history_no_additional_benefit_observed',
      observations: null,
      outsideRecommendedRange: false,
    });
  });

  it('reports only the shortest and longest observations for a directional gain (rule 8)', () => {
    const breaks = [record('b1', 10, 5), record('b2', 14, 5), record('b3', 21, 7)];
    assert.deepEqual(insight(breaks, { min: 14, max: 21 }), {
      code: 'history_directional_observation',
      observations: [
        { durationDays: 10, toleranceReductionScore: 5 },
        { durationDays: 21, toleranceReductionScore: 7 },
      ],
      outsideRecommendedRange: true, // 10 sits below today's 14-21 heuristic
    });
  });

  it('does not flag a comparison whose durations sit inside the range', () => {
    const breaks = [record('b1', 14, 6), record('b2', 21, 9)];
    assert.equal(insight(breaks, { min: 14, max: 21 })?.outsideRecommendedRange, false);
  });

  it('flags the comparison when the longer duration exceeds the range (rule 9)', () => {
    const breaks = [record('b1', 21, 6), record('b2', 30, 9)];
    assert.deepEqual(insight(breaks, { min: 14, max: 21 }), {
      code: 'history_directional_observation',
      observations: [
        { durationDays: 21, toleranceReductionScore: 6 },
        { durationDays: 30, toleranceReductionScore: 9 },
      ],
      outsideRecommendedRange: true,
    });
  });

  it('exposes the literal outside-range code for message mapping', () => {
    assert.equal(HISTORY_OUTSIDE_POPULATION_RANGE, 'history_outside_population_range');
  });

  it('is deterministic for equal inputs', () => {
    const breaks = [record('b1', 14, 6), record('b2', 21, 9)];
    assert.deepEqual(insight(breaks), insight(breaks));
  });
});
