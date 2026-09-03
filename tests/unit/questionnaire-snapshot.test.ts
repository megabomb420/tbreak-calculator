import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applyAnswer, startSession, type QuestionnaireAnswers } from '../../src/application/questionnaire/engine.ts';
import { finishQuestionnaire } from '../../src/application/questionnaire/snapshot.ts';
import { validateAndNormalizeProfile } from '../../src/domain/validation/profile-validation.ts';
import { missingValue } from '../../src/domain/schemas/sourced-value.ts';
import { toInstant } from '../../src/domain/schemas/time.ts';

const NOW = toInstant(1_787_184_000_000);
const LAST_USE = '2026-08-18T12:00:00Z';

function answerAll(sequence: Parameters<typeof applyAnswer>[1][]): QuestionnaireAnswers {
  let answers: QuestionnaireAnswers = {};
  for (const stepAnswer of sequence) {
    answers = applyAnswer(answers, stepAnswer, NOW);
  }
  return answers;
}

describe('raw-answer snapshot (UX_SPEC 4.5, validation wiring)', () => {
  it('does not finish an incomplete flow', () => {
    const result = finishQuestionnaire({ goal: 'tolerance_reset' }, NOW);
    assert.equal(result.status, 'incomplete');
    if (result.status === 'incomplete') assert.equal(result.currentStep, 'Q6');
  });

  it('builds a tolerance 1-3 snapshot without inventing sessions/products/routes', () => {
    const answers = answerAll([
      { step: 'Q1', value: 'tolerance_reset' },
      { step: 'Q2', value: 3 },
      { step: 'Q3', value: LAST_USE },
      { step: 'Q6', value: '1_to_6_months' },
      { step: 'Q7', value: 'routine' },
    ]);
    const result = finishQuestionnaire(answers, NOW);
    assert.equal(result.status, 'complete');
    if (result.status !== 'complete' || result.snapshot.kind !== 'use_profile') {
      assert.fail('expected use_profile snapshot');
    }
    const { profile } = result.snapshot;
    assert.equal(profile.goal, 'tolerance_reset');
    assert.equal(profile.breakRequested, true);
    assert.equal(profile.postBreakMode, null);
    assert.deepEqual(profile.thcUseDaysLast30, { value: 3, provenance: 'user_estimate' });
    assert.deepEqual(profile.sessionsPerUseDay, missingValue());
    assert.deepEqual(profile.products, []);
    assert.deepEqual(profile.routes, []);
    assert.deepEqual(profile.lastUseAt, { value: LAST_USE, provenance: 'user_estimate' });
    assert.deepEqual(profile.previousBreaks, []);
    assert.deepEqual(result.snapshot.companion, {
      schemaVersion: 'companion-personalisation-v1',
      supportFocus: 'routine',
    });
    const validated = validateAndNormalizeProfile(profile, NOW);
    assert.equal(validated.ok, true);
  });

  it('skips last use on reduction-no-break and still validates', () => {
    const answers = answerAll([
      { step: 'Q1', value: 'reduction' },
      { step: 'Q2R', value: false },
      { step: 'Q2', value: 8 },
    ]);
    const result = finishQuestionnaire(answers, NOW);
    assert.equal(result.status, 'complete');
    if (result.status !== 'complete' || result.snapshot.kind !== 'use_profile') {
      assert.fail('expected use_profile snapshot');
    }
    assert.equal(result.snapshot.profile.breakRequested, false);
    assert.deepEqual(result.snapshot.profile.lastUseAt, missingValue());
    assert.equal(validateAndNormalizeProfile(result.snapshot.profile, NOW).ok, true);
  });

  it('does not collect use-days for abstinence', () => {
    const answers = answerAll([
      { step: 'Q1', value: 'abstinence' },
      { step: 'Q2A', value: LAST_USE },
      { step: 'Q6', value: '2_to_5_years' },
      { step: 'Q7', value: 'not_sure' },
    ]);
    const result = finishQuestionnaire(answers, NOW);
    assert.equal(result.status, 'complete');
    if (result.status !== 'complete' || result.snapshot.kind !== 'use_profile') {
      assert.fail('expected use_profile snapshot');
    }
    assert.equal(result.snapshot.profile.breakRequested, false);
    assert.equal(result.snapshot.profile.postBreakMode, 'continue_abstinence');
    assert.deepEqual(result.snapshot.profile.thcUseDaysLast30, missingValue());
    assert.equal(validateAndNormalizeProfile(result.snapshot.profile, NOW).ok, true);
  });

  it('produces a detection request, not a use profile', () => {
    const answers = answerAll([
      { step: 'Q1', value: 'detection_information' },
      { step: 'Q2D', value: 'urine' },
      { step: 'Q3D', value: 'workplace' },
    ]);
    const result = finishQuestionnaire(answers, NOW);
    assert.equal(result.status, 'complete');
    if (result.status !== 'complete' || result.snapshot.kind !== 'detection') {
      assert.fail('expected detection snapshot');
    }
    assert.deepEqual(result.snapshot.request, { matrix: 'urine', context: 'workplace' });
  });

  it('includes sessions/products/routes on every 4-30 intensity band', () => {
    const answers = answerAll([
      { step: 'Q1', value: 'tolerance_reset' },
      { step: 'Q2', value: 10 },
      { step: 'Q3', value: LAST_USE },
      { step: 'Q6', value: '6_to_24_months' },
      { step: 'Q4', value: 3 },
      { step: 'Q5', value: { products: ['flower', 'concentrate'], routes: ['smoking', 'dabbing'] } },
      { step: 'Q7', value: 'cravings' },
    ]);
    const result = finishQuestionnaire(answers, NOW);
    assert.equal(result.status, 'complete');
    if (result.status !== 'complete' || result.snapshot.kind !== 'use_profile') {
      assert.fail('expected use_profile snapshot');
    }
    assert.deepEqual(result.snapshot.profile.sessionsPerUseDay, { value: 3, provenance: 'user_estimate' });
    assert.deepEqual(result.snapshot.profile.products, ['flower', 'concentrate']);
    assert.deepEqual(result.snapshot.profile.routes, ['smoking', 'dabbing']);
    assert.equal(validateAndNormalizeProfile(result.snapshot.profile, NOW).ok, true);
  });

  it('treats Q3-opt skip as a missing last use, not a default timestamp', () => {
    const answers = answerAll([
      { step: 'Q1', value: 'tolerance_reset' },
      { step: 'Q6', value: 'under_1_month' },
      { step: 'Q2', value: 0 },
      { step: 'Q3-opt', value: { skip: true } },
    ]);
    const result = finishQuestionnaire(answers, NOW);
    assert.equal(result.status, 'complete');
    if (result.status !== 'complete' || result.snapshot.kind !== 'use_profile') {
      assert.fail('expected use_profile snapshot');
    }
    assert.deepEqual(result.snapshot.profile.lastUseAt, missingValue());
    assert.equal(validateAndNormalizeProfile(result.snapshot.profile, NOW).ok, true);
  });

  it('preselected goal sessions finish the same way as Q1 tap-advance', () => {
    const started = startSession('detection_information');
    assert.equal(started.currentStep, 'Q2D');
    const withMatrix = applyAnswer(started.answers, { step: 'Q2D', value: 'hair' }, NOW);
    const answers = applyAnswer(withMatrix, { step: 'Q3D', value: 'roadside' }, NOW);
    const result = finishQuestionnaire(answers, NOW);
    assert.equal(result.status, 'complete');
    if (result.status === 'complete' && result.snapshot.kind === 'detection') {
      assert.deepEqual(result.snapshot.request, { matrix: 'hair', context: 'roadside' });
    }
  });
});
