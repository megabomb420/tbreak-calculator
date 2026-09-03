import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAnswer,
  countAnsweredSteps,
  isStepComplete,
  lastUseNeedsReselect,
  nextDestination,
  previousStep,
  progressFraction,
  resolvedPath,
  restoreStep,
  startSession,
  STEP_SPECS,
  type QuestionnaireAnswers,
} from '../../src/application/questionnaire/engine.ts';
import { toInstant } from '../../src/domain/schemas/time.ts';

const NOW = toInstant(1_787_184_000_000); // 2026-08-20T00:00:00.000Z

function withinWindowIso(): string {
  return '2026-08-18T12:00:00Z';
}

function olderThanWindowIso(): string {
  return '2026-07-01T12:00:00Z';
}

describe('declarative step map (UX_SPEC 4, 5.1)', () => {
  it('declares every §5.1 step with an answer type', () => {
    assert.deepEqual(Object.keys(STEP_SPECS).sort(), [
      'Q1',
      'Q2',
      'Q2A',
      'Q2D',
      'Q2R',
      'Q3',
      'Q3-opt',
      'Q3D',
      'Q4',
      'Q5',
      'Q6',
    ]);
    assert.equal(STEP_SPECS.Q1.answerType, 'single_select_advance');
    assert.equal(STEP_SPECS.Q2.answerType, 'slider');
    assert.equal(STEP_SPECS.Q3.answerType, 'date');
    assert.equal(STEP_SPECS.Q3.dateWindow, 'within_30_days');
    assert.equal(STEP_SPECS['Q3-opt'].answerType, 'date_optional');
    assert.equal(STEP_SPECS['Q3-opt'].dateWindow, 'older_than_30_days');
    assert.equal(STEP_SPECS.Q2A.dateWindow, 'any_past');
    assert.equal(STEP_SPECS.Q6.answerType, 'pattern_duration');
    assert.equal(STEP_SPECS.Q4.answerType, 'sessions');
    assert.equal(STEP_SPECS.Q5.answerType, 'products_routes');
  });
});

describe('start and first-step / goal routing', () => {
  it('starts at Q1 with empty answers', () => {
    assert.deepEqual(startSession(), { currentStep: 'Q1', answers: {} });
  });

  it('pre-selecting a goal answers Q1 and advances to the first goal step', () => {
    assert.deepEqual(startSession('tolerance_reset'), {
      currentStep: 'Q6',
      answers: { goal: 'tolerance_reset' },
    });
    assert.deepEqual(startSession('reduction'), {
      currentStep: 'Q2R',
      answers: { goal: 'reduction' },
    });
    assert.deepEqual(startSession('abstinence'), {
      currentStep: 'Q6',
      answers: { goal: 'abstinence' },
    });
    assert.deepEqual(startSession('detection_information'), {
      currentStep: 'Q2D',
      answers: { goal: 'detection_information' },
    });
  });
});

describe('resolved paths (UX_SPEC 5.1 / 5.3)', () => {
  it('keeps only Q1 until a goal is chosen', () => {
    assert.deepEqual(resolvedPath({}), ['Q1']);
  });

  it('routes tolerance_reset through duration first, then use-days and the matching last-use / intensity steps', () => {
    assert.deepEqual(resolvedPath({ goal: 'tolerance_reset' }), ['Q1', 'Q6', 'Q2']);
    assert.deepEqual(resolvedPath({ goal: 'tolerance_reset', thcUseDaysLast30: 0 }), [
      'Q1',
      'Q6',
      'Q2',
      'Q3-opt',
    ]);
    // 1-3 very-infrequent use never consumes sessions/products/routes.
    assert.deepEqual(resolvedPath({ goal: 'tolerance_reset', thcUseDaysLast30: 3 }), [
      'Q1',
      'Q6',
      'Q2',
      'Q3',
    ]);
    // From 4 use-days upward, intensity fields follow last use (tolerance-v3).
    assert.deepEqual(resolvedPath({ goal: 'tolerance_reset', thcUseDaysLast30: 15 }), [
      'Q1',
      'Q6',
      'Q2',
      'Q3',
      'Q4',
      'Q5',
    ]);
    assert.deepEqual(resolvedPath({ goal: 'tolerance_reset', thcUseDaysLast30: 16 }), [
      'Q1',
      'Q6',
      'Q2',
      'Q3',
      'Q4',
      'Q5',
    ]);
  });

  it('inserts Q2R for reduction and follows the break / no-break fork', () => {
    assert.deepEqual(resolvedPath({ goal: 'reduction' }), ['Q1', 'Q2R']);
    assert.deepEqual(resolvedPath({ goal: 'reduction', breakRequested: false }), ['Q1', 'Q2R', 'Q2']);
    assert.deepEqual(resolvedPath({ goal: 'reduction', breakRequested: true }), ['Q1', 'Q2R', 'Q6', 'Q2']);
    assert.deepEqual(resolvedPath({ goal: 'reduction', breakRequested: true, thcUseDaysLast30: 20 }), [
      'Q1',
      'Q2R',
      'Q6',
      'Q2',
      'Q3',
      'Q4',
      'Q5',
    ]);
    assert.deepEqual(resolvedPath({ goal: 'reduction', breakRequested: false, thcUseDaysLast30: 20 }), [
      'Q1',
      'Q2R',
      'Q2',
    ]);
  });

  it('asks abstinence for duration before last use, and detection only for matrix then context', () => {
    assert.deepEqual(resolvedPath({ goal: 'abstinence' }), ['Q1', 'Q6', 'Q2A']);
    assert.deepEqual(resolvedPath({ goal: 'detection_information' }), ['Q1', 'Q2D', 'Q3D']);
  });

  it('keeps the longest consuming path at 7 steps and never asks Q4/Q5 below 4 use-days', () => {
    assert.equal(resolvedPath({ goal: 'tolerance_reset', thcUseDaysLast30: 3 }).length, 4);
    assert.equal(resolvedPath({ goal: 'tolerance_reset', thcUseDaysLast30: 10 }).length, 6);
    assert.equal(resolvedPath({ goal: 'tolerance_reset', thcUseDaysLast30: 16 }).length, 6);
    assert.equal(
      resolvedPath({ goal: 'reduction', breakRequested: true, thcUseDaysLast30: 30 }).length,
      7,
    );
    assert.equal(resolvedPath({ goal: 'abstinence' }).length, 3);
    assert.equal(resolvedPath({ goal: 'reduction', breakRequested: false, thcUseDaysLast30: 20 }).length, 3);
  });
});

describe('next / back / impossible transitions', () => {
  it('advances along the resolved path and terminates when the path is complete', () => {
    const answers: QuestionnaireAnswers = { goal: 'detection_information', detectionMatrix: 'urine' };
    assert.equal(nextDestination('Q1', { goal: 'detection_information' }, NOW), 'Q2D');
    assert.equal(nextDestination('Q2D', answers, NOW), 'Q3D');
    assert.equal(
      nextDestination('Q3D', { ...answers, detectionContext: 'general' }, NOW),
      'TERMINAL',
    );
  });

  it('sends reduction-no-break to TERMINAL after use-days (no last-use step)', () => {
    const answers: QuestionnaireAnswers = {
      goal: 'reduction',
      breakRequested: false,
      thcUseDaysLast30: 12,
    };
    assert.equal(nextDestination('Q2', answers, NOW), 'TERMINAL');
  });

  it('rejects next() on an incomplete step and jumps that are not on the path', () => {
    assert.throws(() => nextDestination('Q1', {}, NOW), RangeError);
    assert.throws(() => nextDestination('Q5', { goal: 'abstinence' }, NOW), RangeError);
  });

  it('returns to the previous shown step and has no back target from Q1', () => {
    assert.equal(previousStep('Q1', { goal: 'tolerance_reset' }), null);
    assert.equal(previousStep('Q6', { goal: 'tolerance_reset' }), 'Q1');
    assert.equal(previousStep('Q2', { goal: 'tolerance_reset' }), 'Q6');
    assert.equal(
      previousStep('Q3', { goal: 'reduction', breakRequested: true, thcUseDaysLast30: 10 }),
      'Q2',
    );
    assert.equal(previousStep('Q2D', { goal: 'detection_information' }), 'Q1');
  });
});

describe('applyAnswer: re-branch and drop invalidated fields', () => {
  it('keeps still-valid answers when use-days stay in the same band', () => {
    const before: QuestionnaireAnswers = {
      goal: 'tolerance_reset',
      thcUseDaysLast30: 10,
      lastUseAt: withinWindowIso(),
    };
    const after = applyAnswer(before, { step: 'Q2', value: 12 }, NOW);
    assert.equal(after.thcUseDaysLast30, 12);
    assert.equal(after.lastUseAt, withinWindowIso());
  });

  it('drops sessions/products/routes when leaving the 4-30 intensity band', () => {
    const before: QuestionnaireAnswers = {
      goal: 'tolerance_reset',
      thcUseDaysLast30: 20,
      lastUseAt: withinWindowIso(),
      sessionsPerUseDay: 2,
      products: ['flower'],
      routes: ['smoking'],
    };
    const after = applyAnswer(before, { step: 'Q2', value: 3 }, NOW);
    assert.equal(after.thcUseDaysLast30, 3);
    assert.equal(after.lastUseAt, withinWindowIso());
    assert.equal(after.sessionsPerUseDay, undefined);
    assert.equal(after.products, undefined);
    assert.equal(after.routes, undefined);
  });

  it('keeps sessions/products/routes when use-days stay in the 4-30 intensity band', () => {
    const before: QuestionnaireAnswers = {
      goal: 'tolerance_reset',
      thcUseDaysLast30: 20,
      lastUseAt: withinWindowIso(),
      sessionsPerUseDay: 2,
      products: ['flower'],
      routes: ['smoking'],
    };
    const after = applyAnswer(before, { step: 'Q2', value: 10 }, NOW);
    assert.equal(after.thcUseDaysLast30, 10);
    assert.equal(after.sessionsPerUseDay, 2);
    assert.deepEqual(after.products, ['flower']);
    assert.deepEqual(after.routes, ['smoking']);
  });

  it('drops last-use when switching to reduction-no-break (field is not collected)', () => {
    const before: QuestionnaireAnswers = {
      goal: 'reduction',
      breakRequested: true,
      thcUseDaysLast30: 10,
      lastUseAt: withinWindowIso(),
    };
    const after = applyAnswer(before, { step: 'Q2R', value: false }, NOW);
    assert.equal(after.breakRequested, false);
    assert.equal(after.thcUseDaysLast30, 10);
    assert.equal(after.lastUseAt, undefined);
  });

  it('drops inapplicable fields when the goal changes, keeping only the new goal', () => {
    const before: QuestionnaireAnswers = {
      goal: 'tolerance_reset',
      thcUseDaysLast30: 20,
      lastUseAt: withinWindowIso(),
      sessionsPerUseDay: 2,
      products: ['flower'],
      routes: ['smoking'],
    };
    const after = applyAnswer(before, { step: 'Q1', value: 'detection_information' }, NOW);
    assert.deepEqual(after, { goal: 'detection_information' });
  });

  it('does not silently rewrite an out-of-window last use; the last-use step is incomplete', () => {
    const after = applyAnswer(
      { goal: 'tolerance_reset', thcUseDaysLast30: 20, lastUseAt: withinWindowIso() },
      { step: 'Q2', value: 0 },
      NOW,
    );
    assert.equal(after.lastUseAt, withinWindowIso());
    assert.equal(lastUseNeedsReselect(after, NOW), true);
    assert.equal(isStepComplete('Q3-opt', after, NOW), false);
  });

  it('rejects answering a step that is not on the current path', () => {
    assert.throws(
      () => applyAnswer({ goal: 'abstinence' }, { step: 'Q2', value: 10 }, NOW),
      RangeError,
    );
    // Q4/Q5 exist on the path only from 4 use-days upward; 1-3 never asks them.
    assert.throws(
      () => applyAnswer({ goal: 'tolerance_reset', thcUseDaysLast30: 3 }, { step: 'Q4', value: 2 }, NOW),
      RangeError,
    );
  });

  it('rejects out-of-range use-days and empty product/route sets', () => {
    assert.throws(
      () => applyAnswer({ goal: 'tolerance_reset' }, { step: 'Q2', value: 31 }, NOW),
      RangeError,
    );
    assert.throws(
      () =>
        applyAnswer(
          { goal: 'tolerance_reset', thcUseDaysLast30: 20, lastUseAt: withinWindowIso() },
          { step: 'Q5', value: { products: [], routes: ['smoking'] } },
          NOW,
        ),
      RangeError,
    );
  });

  it('accepts vape as a Q5 product while keeping the vaping route separate', () => {
    const after = applyAnswer(
      {
        goal: 'tolerance_reset',
        thcUseDaysLast30: 20,
        lastUseAt: withinWindowIso(),
        sessionsPerUseDay: 1,
      },
      { step: 'Q5', value: { products: ['vape'], routes: ['vaping'] } },
      NOW,
    );
    assert.deepEqual(after.products, ['vape']);
    assert.deepEqual(after.routes, ['vaping']);
    assert.equal(isStepComplete('Q5', after, NOW), true);
  });

  it('treats Q3-opt skip as a complete answer and clears a stored timestamp', () => {
    const after = applyAnswer(
      { goal: 'tolerance_reset', thcUseDaysLast30: 0, lastUseAt: olderThanWindowIso() },
      { step: 'Q3-opt', value: { skip: true } },
      NOW,
    );
    assert.equal(after.lastUseSkipped, true);
    assert.equal(after.lastUseAt, undefined);
    assert.equal(isStepComplete('Q3-opt', after, NOW), true);
  });
});

describe('restore and progress', () => {
  it('restores the first incomplete step on the resolved path', () => {
    assert.equal(restoreStep({ goal: 'tolerance_reset' }, NOW), 'Q6');
    assert.equal(
      restoreStep({ goal: 'tolerance_reset', thcUseDaysLast30: 10, lastUseAt: withinWindowIso() }, NOW),
      'Q6',
    );
    assert.equal(
      restoreStep(
        {
          goal: 'tolerance_reset',
          thcUseDaysLast30: 0,
          lastUseAt: withinWindowIso(),
        },
        NOW,
      ),
      'Q6',
    );
  });

  it('counts answered steps as complete shown steps only', () => {
    assert.equal(countAnsweredSteps({}, NOW), 0);
    assert.equal(countAnsweredSteps({ goal: 'abstinence' }, NOW), 1);
    assert.equal(countAnsweredSteps({ goal: 'abstinence', lastUseAt: withinWindowIso() }, NOW), 2);
    assert.equal(
      countAnsweredSteps(
        { goal: 'abstinence', lastUseAt: withinWindowIso(), currentPatternDuration: '1_to_6_months' },
        NOW,
      ),
      3,
    );
  });

  it('progress fills along the resolved path and jumps forward when a branch removes steps', () => {
    const afterQ1 = progressFraction('Q2', { goal: 'tolerance_reset' });
    const afterLowDays = progressFraction('Q3', { goal: 'tolerance_reset', thcUseDaysLast30: 8 });
    const afterZeroDays = progressFraction('Q3-opt', { goal: 'tolerance_reset', thcUseDaysLast30: 0 });
    assert.ok(afterQ1 > 0 && afterQ1 < afterLowDays);
    assert.ok(afterZeroDays >= afterLowDays);
    const detectionDone = progressFraction('Q3D', {
      goal: 'detection_information',
      detectionMatrix: 'urine',
    });
    assert.ok(detectionDone > afterQ1);
  });
});
