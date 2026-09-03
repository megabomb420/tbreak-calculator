// T-Break questionnaire engine (UX_SPEC §4–5).
//
// Routing is typed configuration plus pure functions — not Preact conditionals.
// The engine is deterministic and has no DOM, storage, or clock reads.

import {
  CURRENT_PATTERN_DURATION_BANDS,
  DETECTION_CONTEXTS,
  DETECTION_MATRICES,
  GOALS,
  PRODUCT_KINDS,
  ROUTES,
  type CurrentPatternDurationBand,
  type DetectionContext,
  type DetectionMatrix,
  type Goal,
  type ProductKind,
  type Route,
} from '../../domain/schemas/enums.ts';
import { parseSubmittedTimestamp, type Instant } from '../../domain/schemas/time.ts';
import { isInstantInWindow, type DateWindowKind } from './date-answers.ts';

export const QUESTIONNAIRE_STEP_IDS = [
  'Q1',
  'Q2R',
  'Q2',
  'Q3',
  'Q3-opt',
  'Q2A',
  'Q6',
  'Q4',
  'Q5',
  'Q2D',
  'Q3D',
] as const;
export type QuestionnaireStepId = (typeof QUESTIONNAIRE_STEP_IDS)[number];

export type AnswerType =
  | 'single_select_advance'
  | 'slider'
  | 'date'
  | 'date_optional'
  | 'sessions'
  | 'products_routes'
  | 'pattern_duration';

export interface StepSpec {
  readonly id: QuestionnaireStepId;
  readonly answerType: AnswerType;
  readonly dateWindow?: DateWindowKind;
}

export const STEP_SPECS: Record<QuestionnaireStepId, StepSpec> = {
  Q1: { id: 'Q1', answerType: 'single_select_advance' },
  Q2R: { id: 'Q2R', answerType: 'single_select_advance' },
  Q2: { id: 'Q2', answerType: 'slider' },
  Q3: { id: 'Q3', answerType: 'date', dateWindow: 'within_30_days' },
  'Q3-opt': { id: 'Q3-opt', answerType: 'date_optional', dateWindow: 'older_than_30_days' },
  Q2A: { id: 'Q2A', answerType: 'date', dateWindow: 'any_past' },
  Q6: { id: 'Q6', answerType: 'pattern_duration' },
  Q4: { id: 'Q4', answerType: 'sessions' },
  Q5: { id: 'Q5', answerType: 'products_routes' },
  Q2D: { id: 'Q2D', answerType: 'single_select_advance' },
  Q3D: { id: 'Q3D', answerType: 'single_select_advance' },
};

export interface QuestionnaireAnswers {
  readonly goal?: Goal;
  readonly breakRequested?: boolean;
  readonly thcUseDaysLast30?: number;
  readonly lastUseAt?: string;
  readonly lastUseSkipped?: boolean;
  readonly currentPatternDuration?: CurrentPatternDurationBand;
  readonly sessionsPerUseDay?: number;
  readonly products?: readonly ProductKind[];
  readonly routes?: readonly Route[];
  readonly detectionMatrix?: DetectionMatrix;
  readonly detectionContext?: DetectionContext;
}

export type StepAnswer =
  | { readonly step: 'Q1'; readonly value: Goal }
  | { readonly step: 'Q2R'; readonly value: boolean }
  | { readonly step: 'Q2'; readonly value: number }
  | { readonly step: 'Q3'; readonly value: string }
  | { readonly step: 'Q2A'; readonly value: string }
  | { readonly step: 'Q3-opt'; readonly value: string | { readonly skip: true } }
  | { readonly step: 'Q6'; readonly value: CurrentPatternDurationBand }
  | { readonly step: 'Q4'; readonly value: number }
  | {
      readonly step: 'Q5';
      readonly value: { readonly products: readonly ProductKind[]; readonly routes: readonly Route[] };
    }
  | { readonly step: 'Q2D'; readonly value: DetectionMatrix }
  | { readonly step: 'Q3D'; readonly value: DetectionContext };

export type QuestionnaireDestination = QuestionnaireStepId | 'TERMINAL';

export interface QuestionnaireSession {
  readonly currentStep: QuestionnaireStepId;
  readonly answers: QuestionnaireAnswers;
}

export function startSession(preselectedGoal?: Goal): QuestionnaireSession {
  if (preselectedGoal === undefined) return { currentStep: 'Q1', answers: {} };
  const answers = applyAnswer({}, { step: 'Q1', value: preselectedGoal }, 0 as Instant);
  const dest = nextDestination('Q1', answers, 0 as Instant);
  if (dest === 'TERMINAL') {
    throw new RangeError('preselected goal must advance to a questionnaire step');
  }
  return { currentStep: dest, answers };
}

export function resolvedPath(answers: QuestionnaireAnswers): QuestionnaireStepId[] {
  const path: QuestionnaireStepId[] = ['Q1'];
  const { goal } = answers;
  if (goal === undefined) return path;
  if (goal === 'detection_information') {
    path.push('Q2D', 'Q3D');
    return path;
  }
  if (goal === 'abstinence') {
    // Duration is the first substantive use-profile question; last use anchors
    // the open-ended timeline after it.
    path.push('Q6', 'Q2A');
    return path;
  }
  if (goal === 'reduction') {
    path.push('Q2R');
    if (answers.breakRequested === undefined) return path;
    if (answers.breakRequested === false) {
      // Reduction without a requested break does not consume duration,
      // sessions, products/routes, or a last-use timestamp.
      path.push('Q2');
      return path;
    }
    path.push(...toleranceFromGoalChoice(answers));
    return path;
  }
  path.push(...toleranceFromGoalChoice(answers));
  return path;
}

export function isStepVisible(step: QuestionnaireStepId, answers: QuestionnaireAnswers): boolean {
  return resolvedPath(answers).includes(step);
}

export function isStepComplete(step: QuestionnaireStepId, answers: QuestionnaireAnswers, now: Instant): boolean {
  switch (step) {
    case 'Q1':
      return answers.goal !== undefined;
    case 'Q2R':
      return answers.breakRequested !== undefined;
    case 'Q2':
      return answers.thcUseDaysLast30 !== undefined;
    case 'Q3':
    case 'Q2A':
      return lastUseFits(answers.lastUseAt, now, STEP_SPECS[step].dateWindow);
    case 'Q3-opt':
      if (answers.lastUseSkipped === true) return true;
      return lastUseFits(answers.lastUseAt, now, 'older_than_30_days');
    case 'Q6':
      return answers.currentPatternDuration !== undefined;
    case 'Q4':
      return answers.sessionsPerUseDay !== undefined;
    case 'Q5':
      return (answers.products?.length ?? 0) >= 1 && (answers.routes?.length ?? 0) >= 1;
    case 'Q2D':
      return answers.detectionMatrix !== undefined;
    case 'Q3D':
      return answers.detectionContext !== undefined;
  }
}

export function lastUseNeedsReselect(answers: QuestionnaireAnswers, now: Instant): boolean {
  if (answers.lastUseAt === undefined) return false;
  const step = lastUseStepOnPath(answers);
  if (step === null) return false;
  return !isStepComplete(step, answers, now);
}

export function nextDestination(
  current: QuestionnaireStepId,
  answers: QuestionnaireAnswers,
  now: Instant,
): QuestionnaireDestination {
  if (!isStepComplete(current, answers, now)) {
    throw new RangeError(`step ${current} is incomplete`);
  }
  const path = resolvedPath(answers);
  const index = path.indexOf(current);
  if (index < 0) {
    throw new RangeError(`step ${current} is not on the resolved path`);
  }
  return path[index + 1] ?? 'TERMINAL';
}

export function previousStep(
  current: QuestionnaireStepId,
  answers: QuestionnaireAnswers,
): QuestionnaireStepId | null {
  const path = resolvedPath(answers);
  const index = path.indexOf(current);
  if (index <= 0) return null;
  return path[index - 1] ?? null;
}

export function applyAnswer(
  answers: QuestionnaireAnswers,
  answer: StepAnswer,
  _now: Instant,
): QuestionnaireAnswers {
  if (answer.step !== 'Q1' && !resolvedPath(answers).includes(answer.step)) {
    throw new RangeError(`step ${answer.step} is not on the current path`);
  }
  return pruneAnswers({ ...answers, ...fieldsFromAnswer(answer) });
}

export function restoreStep(
  answers: QuestionnaireAnswers,
  now: Instant,
  stored?: QuestionnaireStepId,
): QuestionnaireStepId {
  const path = resolvedPath(answers);
  if (stored !== undefined && path.includes(stored)) return stored;
  for (const step of path) {
    if (!isStepComplete(step, answers, now)) return step;
  }
  return path[path.length - 1] ?? 'Q1';
}

export function countAnsweredSteps(answers: QuestionnaireAnswers, now: Instant): number {
  let count = 0;
  for (const step of resolvedPath(answers)) {
    if (isStepComplete(step, answers, now)) count += 1;
  }
  return count;
}

export function progressFraction(currentStep: QuestionnaireStepId, answers: QuestionnaireAnswers): number {
  const path = resolvedPath(answers);
  const index = path.indexOf(currentStep);
  const filled = index < 0 ? 0 : index;
  const total = Math.max(estimatedPathLength(answers), filled + 1);
  return filled / total;
}

export function isFlowComplete(answers: QuestionnaireAnswers, now: Instant): boolean {
  if (!isFullyResolved(answers)) return false;
  return resolvedPath(answers).every((step) => isStepComplete(step, answers, now));
}

/**
 * Steps after the goal/route choice on a range-requested tolerance route.
 * `currentPatternDuration` (Q6) is the first substantive use-profile question,
 * asked before use-days so it can shape the planning target; use-days, last
 * use, and (only at >= 16 use-days) sessions/products/routes follow.
 */
function toleranceFromGoalChoice(answers: QuestionnaireAnswers): QuestionnaireStepId[] {
  const steps: QuestionnaireStepId[] = ['Q6', 'Q2'];
  const days = answers.thcUseDaysLast30;
  if (days === undefined) return steps;
  if (days === 0) {
    steps.push('Q3-opt');
    return steps;
  }
  steps.push('Q3');
  if (days >= 16) steps.push('Q4', 'Q5');
  return steps;
}

function estimatedPathLength(answers: QuestionnaireAnswers): number {
  const { goal } = answers;
  if (goal === undefined) return 6;
  if (goal === 'abstinence') return 3;
  if (goal === 'detection_information') return 3;
  const reductionPrefix = goal === 'reduction' ? 1 : 0;
  if (goal === 'reduction' && answers.breakRequested === undefined) return 7;
  if (goal === 'reduction' && answers.breakRequested === false) return 3;
  const days = answers.thcUseDaysLast30;
  if (days === undefined) return 6 + reductionPrefix;
  if (days === 0) return 4 + reductionPrefix;
  if (days <= 15) return 4 + reductionPrefix;
  return 6 + reductionPrefix;
}

function isFullyResolved(answers: QuestionnaireAnswers): boolean {
  if (answers.goal === undefined) return false;
  if (answers.goal === 'reduction' && answers.breakRequested === undefined) return false;
  if (answers.goal === 'tolerance_reset' || (answers.goal === 'reduction' && answers.breakRequested === true)) {
    return answers.thcUseDaysLast30 !== undefined;
  }
  if (answers.goal === 'reduction' && answers.breakRequested === false) {
    return answers.thcUseDaysLast30 !== undefined;
  }
  return true;
}

function lastUseFits(iso: string | undefined, now: Instant, window: DateWindowKind | undefined): boolean {
  if (iso === undefined || window === undefined) return false;
  const instant = parseSubmittedTimestamp(iso);
  if (instant === null) return false;
  return isInstantInWindow(instant, now, window);
}

function lastUseStepOnPath(answers: QuestionnaireAnswers): 'Q3' | 'Q3-opt' | 'Q2A' | null {
  const path = resolvedPath(answers);
  if (path.includes('Q3')) return 'Q3';
  if (path.includes('Q3-opt')) return 'Q3-opt';
  if (path.includes('Q2A')) return 'Q2A';
  return null;
}

function fieldsFromAnswer(answer: StepAnswer): QuestionnaireAnswers {
  switch (answer.step) {
    case 'Q1': {
      if (!(GOALS as readonly string[]).includes(answer.value)) {
        throw new RangeError(`invalid goal: ${answer.value}`);
      }
      return { goal: answer.value };
    }
    case 'Q2R':
      return { breakRequested: answer.value };
    case 'Q2': {
      if (!Number.isInteger(answer.value) || answer.value < 0 || answer.value > 30) {
        throw new RangeError(`thcUseDaysLast30 must be an integer 0–30, got ${answer.value}`);
      }
      return { thcUseDaysLast30: answer.value };
    }
    case 'Q3':
    case 'Q2A': {
      requireTimestamp(answer.value);
      return { lastUseAt: answer.value, lastUseSkipped: undefined };
    }
    case 'Q3-opt': {
      if (typeof answer.value === 'object') {
        return { lastUseSkipped: true, lastUseAt: undefined };
      }
      requireTimestamp(answer.value);
      return { lastUseAt: answer.value, lastUseSkipped: undefined };
    }
    case 'Q6': {
      if (!(CURRENT_PATTERN_DURATION_BANDS as readonly string[]).includes(answer.value)) {
        throw new RangeError(`invalid currentPatternDuration: ${answer.value}`);
      }
      return { currentPatternDuration: answer.value };
    }
    case 'Q4': {
      if (!Number.isInteger(answer.value) || answer.value < 1 || answer.value > 9) {
        throw new RangeError(`sessionsPerUseDay must be an integer 1–9, got ${answer.value}`);
      }
      return { sessionsPerUseDay: answer.value };
    }
    case 'Q5': {
      const { products, routes } = answer.value;
      if (products.length < 1 || routes.length < 1) {
        throw new RangeError('at least one product and one route are required');
      }
      for (const product of products) {
        if (!(PRODUCT_KINDS as readonly string[]).includes(product)) {
          throw new RangeError(`invalid product: ${product}`);
        }
      }
      for (const route of routes) {
        if (!(ROUTES as readonly string[]).includes(route)) {
          throw new RangeError(`invalid route: ${route}`);
        }
      }
      return { products, routes };
    }
    case 'Q2D': {
      if (!(DETECTION_MATRICES as readonly string[]).includes(answer.value)) {
        throw new RangeError(`invalid detection matrix: ${answer.value}`);
      }
      return { detectionMatrix: answer.value };
    }
    case 'Q3D': {
      if (!(DETECTION_CONTEXTS as readonly string[]).includes(answer.value)) {
        throw new RangeError(`invalid detection context: ${answer.value}`);
      }
      return { detectionContext: answer.value };
    }
  }
}

function requireTimestamp(value: string): void {
  if (parseSubmittedTimestamp(value) === null) {
    throw new RangeError(`invalid timestamp: ${value}`);
  }
}

function pruneAnswers(answers: QuestionnaireAnswers): QuestionnaireAnswers {
  const next: {
    goal?: Goal;
    breakRequested?: boolean;
    thcUseDaysLast30?: number;
    lastUseAt?: string;
    lastUseSkipped?: boolean;
    currentPatternDuration?: CurrentPatternDurationBand;
    sessionsPerUseDay?: number;
    products?: readonly ProductKind[];
    routes?: readonly Route[];
    detectionMatrix?: DetectionMatrix;
    detectionContext?: DetectionContext;
  } = {};
  if (answers.goal !== undefined) next.goal = answers.goal;

  const pathOf = (partial: QuestionnaireAnswers): QuestionnaireStepId[] => resolvedPath(partial);

  if (next.goal === 'reduction' && answers.breakRequested !== undefined) {
    next.breakRequested = answers.breakRequested;
  }
  if (pathOf(next).includes('Q2') && answers.thcUseDaysLast30 !== undefined) {
    next.thcUseDaysLast30 = answers.thcUseDaysLast30;
  }
  const lastUseStep = lastUseStepOnPath(next);
  if (lastUseStep !== null) {
    if (answers.lastUseAt !== undefined) next.lastUseAt = answers.lastUseAt;
    if (lastUseStep === 'Q3-opt' && answers.lastUseSkipped === true) next.lastUseSkipped = true;
  }
  if (pathOf(next).includes('Q6') && answers.currentPatternDuration !== undefined) {
    next.currentPatternDuration = answers.currentPatternDuration;
  }
  if (pathOf(next).includes('Q4') && answers.sessionsPerUseDay !== undefined) {
    next.sessionsPerUseDay = answers.sessionsPerUseDay;
  }
  if (pathOf(next).includes('Q5')) {
    if (answers.products !== undefined) next.products = answers.products;
    if (answers.routes !== undefined) next.routes = answers.routes;
  }
  if (next.goal === 'detection_information') {
    if (answers.detectionMatrix !== undefined) next.detectionMatrix = answers.detectionMatrix;
    if (answers.detectionContext !== undefined) next.detectionContext = answers.detectionContext;
  }
  return next;
}
