// Post-break outcome capture eligibility (0.9.0).

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { toInstant, type Instant } from '../../src/domain/schemas/time.ts';
import {
  canOfferOutcome,
  eligibleCompletedAttempts,
  pendingOutcomeForReturn,
  scoreAnchors,
  type OutcomeCaptureAttempt,
} from '../../src/domain/recovery/outcome-capture.ts';

const DAY = 24 * 60 * 60 * 1000;
const NOW = toInstant(Date.parse('2026-06-10T12:00:00.000Z'));
const at = (offsetDays: number): Instant => toInstant(NOW + offsetDays * DAY);

function completed(overrides: Partial<OutcomeCaptureAttempt> = {}): OutcomeCaptureAttempt {
  const start = at(-30);
  return {
    id: `attempt-${Math.random().toString(36).slice(2, 8)}`,
    status: 'completed',
    postBreakMode: 'occasional',
    updatedAt: at(-1),
    segments: [{ startedFromLastUseAt: start, endedAt: at(-1), }],
    ...overrides,
  };
}

const EMPTY_MARKS: readonly { readonly attemptId: string }[] = [];

describe('outcome capture: eligibility', () => {
  it('only completed finite breaks with a return mode are eligible', () => {
    const eligible = completed();
    const active = completed({ status: 'active', segments: [{ startedFromLastUseAt: at(-30), endedAt: null }] });
    const ended = completed({ status: 'ended' });
    const continued = completed({ postBreakMode: 'continue_abstinence' });
    const undecided = completed({ postBreakMode: 'undecided' });
    const noMode = completed({ postBreakMode: null });
    assert.equal(canOfferOutcome(eligible, EMPTY_MARKS), true);
    assert.equal(canOfferOutcome(active, EMPTY_MARKS), false);
    assert.equal(canOfferOutcome(ended, EMPTY_MARKS), false);
    assert.equal(canOfferOutcome(continued, EMPTY_MARKS), false);
    assert.equal(canOfferOutcome(undecided, EMPTY_MARKS), false);
    assert.equal(canOfferOutcome(noMode, EMPTY_MARKS), false);
  });

  it('reduced_regular_use counts as a return mode; occasional does too', () => {
    const occasional = completed({ postBreakMode: 'occasional' });
    const reduced = completed({ postBreakMode: 'reduced_regular_use' });
    assert.equal(eligibleCompletedAttempts([occasional, reduced]).length, 2);
  });

  it('completedBy bounds eligibility to attempts completed at or before the return', () => {
    const early = completed({ id: 'a-early', updatedAt: at(-10), segments: [{ startedFromLastUseAt: at(-30), endedAt: at(-10) }] });
    const late = completed({ id: 'a-late', updatedAt: at(1), segments: [{ startedFromLastUseAt: at(-20), endedAt: at(1) }] });
    const found = eligibleCompletedAttempts([early, late], at(0));
    assert.deepEqual(found.map((a) => a.id), ['a-early']);
  });
});

describe('outcome capture: marks are one-time', () => {
  it('a captured mark blocks any further offer', () => {
    const attempt = completed();
    const captured = { attemptId: attempt.id, status: 'captured' as const };
    assert.equal(canOfferOutcome(attempt, [captured]), false);
  });

  it('a skipped mark also blocks any further offer', () => {
    const attempt = completed();
    const skipped = { attemptId: attempt.id, status: 'skipped' as const };
    assert.equal(canOfferOutcome(attempt, [skipped]), false);
  });

  it('pendingOutcomeForReturn returns null when every eligible attempt is marked', () => {
    const first = completed({ id: 'a-1' });
    const second = completed({ id: 'a-2' });
    const captured = { attemptId: first.id, status: 'captured' as const };
    const skipped = { attemptId: second.id, status: 'skipped' as const };
    const pending = pendingOutcomeForReturn([first, second], [captured, skipped], {
      returnedAt: NOW,
    });
    assert.equal(pending, null);
  });
});

describe('outcome capture: newest eligible wins', () => {
  it('picks the most recently completed eligible attempt without a mark', () => {
    const older = completed({ id: 'a-old', updatedAt: at(-20), segments: [{ startedFromLastUseAt: at(-40), endedAt: at(-20) }] });
    const newer = completed({ id: 'a-new', updatedAt: at(-2), segments: [{ startedFromLastUseAt: at(-30), endedAt: at(-2) }] });
    const pending = pendingOutcomeForReturn([older, newer], EMPTY_MARKS, { returnedAt: NOW });
    assert.equal(pending?.id, 'a-new');
  });

  it('skips a marked attempt and returns the next newest', () => {
    const older = completed({ id: 'a-old', updatedAt: at(-20), segments: [{ startedFromLastUseAt: at(-40), endedAt: at(-20) }] });
    const newer = completed({ id: 'a-new', updatedAt: at(-2), segments: [{ startedFromLastUseAt: at(-30), endedAt: at(-2) }] });
    const captured = { attemptId: newer.id, status: 'captured' as const };
    const pending = pendingOutcomeForReturn([older, newer], [captured], {
      returnedAt: NOW,
    });
    assert.equal(pending?.id, 'a-old');
  });

  it('honours a returnedAt that precedes the completion (no future rating)', () => {
    const later = completed({ id: 'a-later', updatedAt: at(5), segments: [{ startedFromLastUseAt: at(-10), endedAt: at(5) }] });
    assert.equal(pendingOutcomeForReturn([later], EMPTY_MARKS, { returnedAt: NOW }), null);
  });
});

describe('outcome capture: anchors', () => {
  it('are 0-10 endpoint labels, never a percentage-reset claim', () => {
    const anchors = scoreAnchors();
    assert.equal(anchors.zero, '0 = no noticeable reduction');
    assert.equal(anchors.ten, '10 = very large reduction');
    assert.ok(!anchors.zero.includes('%'));
    assert.ok(!anchors.ten.includes('%'));
  });
});
