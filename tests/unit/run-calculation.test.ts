import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runCalculation } from '../../src/application/calculation/run-calculation.ts';
import { answersFromSnapshot } from '../../src/application/calculation/answers-from-snapshot.ts';
import { sampleProfile, userValue, absent, C0 } from '../helpers.ts';
import type { RawAnswerSnapshot } from '../../src/application/questionnaire/snapshot.ts';

describe('snapshot → engine → presentation pipeline', () => {
  it('runs the tolerance engine for a use-profile snapshot', () => {
    const snapshot: RawAnswerSnapshot = {
      kind: 'use_profile',
      profile: sampleProfile({
        thcUseDaysLast30: userValue(10),
        sessionsPerUseDay: userValue(1),
        products: ['flower'],
        routes: ['smoking'],
      }),
    };
    const view = runCalculation(snapshot, C0);
    assert.equal(view.kind, 'tolerance_result');
  });

  it('runs the detection engine for a detection snapshot', () => {
    const view = runCalculation(
      { kind: 'detection', request: { matrix: 'hair', context: 'general' } },
      C0,
    );
    assert.equal(view.kind, 'detection');
    if (view.kind !== 'detection') return;
    assert.ok(view.matrixCopy.some((line) => /historical record/i.test(line)));
    assert.equal(view.contextNote, null);
  });

  it('fails closed to unavailable on a validation_error tolerance result', () => {
    const snapshot: RawAnswerSnapshot = {
      kind: 'use_profile',
      profile: sampleProfile({ goal: 'tolerance_reset', breakRequested: false }),
    };
    const view = runCalculation(snapshot, C0);
    assert.equal(view.kind, 'unavailable');
  });

  it('surfaces engine breakDay as days-since when Q3-opt provided a last use on baseline-low', () => {
    const view = runCalculation(
      {
        kind: 'use_profile',
        profile: sampleProfile({
          thcUseDaysLast30: userValue(0),
          sessionsPerUseDay: absent(),
          products: [],
          routes: [],
          lastUseAt: userValue('2026-07-01T00:00:00Z'),
        }),
      },
      C0,
    );
    assert.equal(view.kind, 'baseline_low');
    if (view.kind !== 'baseline_low') return;
    assert.equal(typeof view.daysSinceLastUse, 'number');
    assert.ok((view.daysSinceLastUse ?? 0) > 30);
  });
});

describe('answersFromSnapshot restores questionnaire answers without inventing fields', () => {
  it('rebuilds a 1-3 tolerance path without sessions or products', () => {
    const snapshot: RawAnswerSnapshot = {
      kind: 'use_profile',
      profile: sampleProfile({
        thcUseDaysLast30: userValue(3),
        sessionsPerUseDay: absent(),
        products: [],
        routes: [],
        lastUseAt: userValue('2026-08-18T12:00:00Z'),
      }),
    };
    const answers = answersFromSnapshot(snapshot);
    assert.equal(answers.goal, 'tolerance_reset');
    assert.equal(answers.thcUseDaysLast30, 3);
    assert.equal(answers.lastUseAt, '2026-08-18T12:00:00Z');
    assert.equal(answers.sessionsPerUseDay, undefined);
    assert.equal(answers.products, undefined);
  });

  it('marks Q3-opt skip when last use is missing on zero use-days', () => {
    const snapshot: RawAnswerSnapshot = {
      kind: 'use_profile',
      profile: sampleProfile({
        thcUseDaysLast30: userValue(0),
        sessionsPerUseDay: absent(),
        products: [],
        routes: [],
        lastUseAt: absent(),
      }),
    };
    const answers = answersFromSnapshot(snapshot);
    assert.equal(answers.thcUseDaysLast30, 0);
    assert.equal(answers.lastUseSkipped, true);
    assert.equal(answers.lastUseAt, undefined);
  });

  it('rebuilds detection answers from the request only', () => {
    const answers = answersFromSnapshot({
      kind: 'detection',
      request: { matrix: 'blood', context: 'roadside' },
    });
    assert.equal(answers.goal, 'detection_information');
    assert.equal(answers.detectionMatrix, 'blood');
    assert.equal(answers.detectionContext, 'roadside');
    assert.equal(answers.thcUseDaysLast30, undefined);
  });
});
