// Raw-answer snapshot at a questionnaire terminal (UX_SPEC 4.5 / §16 step 2).
//
// Completing this slice produces a typed snapshot only. Calculator/result
// engines are not invoked. Unasked fields use missing provenance or empty
// collections — they are not filled with invented defaults.

import type { CurrentPatternDurationBand, DetectionContext, DetectionMatrix, Goal, PostBreakMode } from '../../domain/schemas/enums.ts';
import type { DetectionRequest, UseProfileInput } from '../../domain/schemas/profile.ts';
import { missingValue, type SourcedValue } from '../../domain/schemas/sourced-value.ts';
import type { Instant } from '../../domain/schemas/time.ts';
import { validateAndNormalizeProfile, type ValidationError } from '../../domain/validation/profile-validation.ts';
import {
  isFlowComplete,
  restoreStep,
  type QuestionnaireAnswers,
  type QuestionnaireStepId,
} from './engine.ts';
import type { CompanionPersonalisationV1 } from './companion.ts';

export type RawAnswerSnapshot =
  | {
      readonly kind: 'use_profile';
      readonly profile: UseProfileInput;
      readonly companion?: CompanionPersonalisationV1;
    }
  | { readonly kind: 'detection'; readonly request: DetectionRequest };

export type FinishResult =
  | { readonly status: 'incomplete'; readonly currentStep: QuestionnaireStepId }
  | {
      readonly status: 'validation_error';
      readonly errors: readonly ValidationError[];
      readonly currentStep: QuestionnaireStepId;
    }
  | { readonly status: 'complete'; readonly snapshot: RawAnswerSnapshot };

export function buildRawSnapshot(answers: QuestionnaireAnswers): RawAnswerSnapshot {
  if (answers.goal === 'detection_information') {
    if (answers.detectionMatrix === undefined || answers.detectionContext === undefined) {
      throw new RangeError('detection snapshot requires matrix and context');
    }
    return {
      kind: 'detection',
      request: {
        matrix: answers.detectionMatrix,
        context: answers.detectionContext,
      },
    };
  }
  if (answers.goal === undefined) {
    throw new RangeError('use-profile snapshot requires a goal');
  }
  return {
    kind: 'use_profile',
    profile: buildUseProfileInput(answers),
  };
}

export function finishQuestionnaire(answers: QuestionnaireAnswers, now: Instant): FinishResult {
  if (!isFlowComplete(answers, now)) {
    return { status: 'incomplete', currentStep: restoreStep(answers, now) };
  }
  const snapshot = buildRawSnapshot(answers);
  if (snapshot.kind === 'detection') {
    return { status: 'complete', snapshot };
  }
  const outcome = validateAndNormalizeProfile(snapshot.profile, now);
  if (!outcome.ok) {
    const first = outcome.errors[0];
    return {
      status: 'validation_error',
      errors: outcome.errors,
      currentStep: first === undefined ? restoreStep(answers, now) : stepForValidationPath(first.path, answers),
    };
  }
  return { status: 'complete', snapshot };
}

export function buildUseProfileInput(answers: QuestionnaireAnswers): UseProfileInput {
  const goal = answers.goal as Goal;
  const { breakRequested, postBreakMode } = impliedGoalFields(goal, answers.breakRequested);
  return {
    goal,
    breakRequested,
    postBreakMode,
    thcUseDaysLast30: sourcedOrMissing(answers.thcUseDaysLast30),
    sessionsPerUseDay: sourcedOrMissing(answers.sessionsPerUseDay),
    products: answers.products === undefined ? [] : [...answers.products],
    routes: answers.routes === undefined ? [] : [...answers.routes],
    lastUseAt: answers.lastUseAt === undefined ? missingValue() : { value: answers.lastUseAt, provenance: 'user_estimate' },
    currentPatternDuration:
      answers.currentPatternDuration === undefined
        ? missingValue<CurrentPatternDurationBand>()
        : { value: answers.currentPatternDuration, provenance: 'user_estimate' },
    previousBreaks: [],
  };
}

function impliedGoalFields(
  goal: Goal,
  breakRequested: boolean | undefined,
): { breakRequested: boolean; postBreakMode: PostBreakMode | null } {
  switch (goal) {
    case 'tolerance_reset':
      return { breakRequested: true, postBreakMode: null };
    case 'reduction':
      return { breakRequested: breakRequested === true, postBreakMode: null };
    case 'abstinence':
      return { breakRequested: false, postBreakMode: 'continue_abstinence' };
    case 'detection_information':
      return { breakRequested: false, postBreakMode: null };
  }
}

function sourcedOrMissing(value: number | undefined): SourcedValue<number> {
  return value === undefined ? missingValue() : { value, provenance: 'user_estimate' };
}

function stepForValidationPath(path: string, answers: QuestionnaireAnswers): QuestionnaireStepId {
  if (path === 'goal') return 'Q1';
  if (path === 'breakRequested') return 'Q2R';
  if (path.startsWith('thcUseDaysLast30')) return 'Q2';
  if (path.startsWith('lastUseAt')) {
    if (answers.goal === 'abstinence') return 'Q2A';
    if (answers.thcUseDaysLast30 === 0) return 'Q3-opt';
    return 'Q3';
  }
  if (path.startsWith('currentPatternDuration')) return 'Q6';
  if (path.startsWith('sessionsPerUseDay')) return 'Q4';
  if (path.startsWith('products') || path.startsWith('routes')) return 'Q5';
  return restoreStep(answers, 0 as Instant);
}

export type { DetectionMatrix, DetectionContext };
