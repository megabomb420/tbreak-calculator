import { useEffect, useRef } from 'preact/hooks';
import type { Instant } from '../domain/schemas/time.ts';
import {
  applyAnswer,
  isStepComplete,
  previousStep,
  progressFraction,
  STEP_SPECS,
  type QuestionnaireAnswers,
  type QuestionnaireSession,
  type QuestionnaireStepId,
  type StepAnswer,
} from '../application/questionnaire/engine.ts';
import {
  BreakCards,
  ContextCards,
  DateControl,
  DurationCards,
  GoalCards,
  MatrixCards,
  ProductsRoutesControl,
  SessionsControl,
  UseDaysSlider,
} from './questionnaire-controls.tsx';
import { QUESTIONNAIRE, STEP_COPY } from './questionnaire-copy.ts';
import { CloseIcon } from './icons.tsx';
import { useFocusTrap } from './focus-trap.ts';

export interface QuestionnaireFlowProps {
  readonly session: QuestionnaireSession;
  readonly now: Instant;
  readonly lastUseWarning: boolean;
  readonly onSession: (session: QuestionnaireSession) => void;
  readonly onAnswerAndAdvance: (answer: StepAnswer) => void;
  readonly onClose: () => void;
  readonly onBack: () => void;
  readonly onContinue: (answer: StepAnswer) => void;
  readonly onSkip: () => void;
}

export function QuestionnaireFlow({
  session,
  now,
  lastUseWarning,
  onSession,
  onAnswerAndAdvance,
  onClose,
  onBack,
  onContinue,
  onSkip,
}: QuestionnaireFlowProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  useFocusTrap(true, rootRef, onClose);
  const { currentStep, answers } = session;
  const spec = STEP_SPECS[currentStep];
  const copy = STEP_COPY[currentStep];
  const backTarget = previousStep(currentStep, answers);
  const fraction = progressFraction(currentStep, answers);
  const advance = spec.answerType === 'single_select_advance';
  const autoAdvance = advance || spec.answerType === 'pattern_duration';
  const percent = Math.round(fraction * 100);

  useEffect(() => {
    headingRef.current?.focus();
  }, [currentStep]);

  return (
    <div
      className="questionnaire-overlay"
      data-testid="questionnaire-flow"
      data-step={currentStep}
      role="dialog"
      aria-modal="true"
      aria-labelledby="questionnaire-title"
      ref={rootRef}
    >
      <header className="questionnaire-header">
        <button type="button" className="icon-button" aria-label={QUESTIONNAIRE.close} onClick={onClose}>
          <CloseIcon />
        </button>
        <div className="progress-cluster">
          <p className="questionnaire-stage-label">{questionnaireStage(currentStep)}</p>
          <div
            className="progress-track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label="Questionnaire progress"
          >
            <div className="progress-fill" style={{ width: `${percent}%` }} />
          </div>
        </div>
      </header>
      <div className="questionnaire-body">
        <section className="questionnaire-step" key={currentStep}>
          <div>
            <h2 id="questionnaire-title" className="title" tabIndex={-1} ref={headingRef}>
              {copy.title}
            </h2>
            {copy.helper ? <p className="meta">{copy.helper}</p> : null}
          </div>
          {lastUseWarning ? (
            <p className="warning" data-testid="last-use-warning">
              {currentStep === 'Q3-opt' ? QUESTIONNAIRE.lastUseOlderWarning : QUESTIONNAIRE.lastUseWindowWarning}
            </p>
          ) : null}
          <StepControl
            step={currentStep}
            answers={answers}
            now={now}
            onAdvance={onAnswerAndAdvance}
            onDraft={(next) => onSession({ currentStep, answers: next })}
          />
        </section>
      </div>
      <footer className="questionnaire-footer">
        {!autoAdvance ? (
          <button
            type="button"
            className="cta-primary"
            disabled={!canContinue(currentStep, answers, now, lastUseWarning)}
            onClick={() => {
              const answer = pendingAnswer(currentStep, answers);
              if (answer !== null) onContinue(answer);
            }}
          >
            {QUESTIONNAIRE.continue}
          </button>
        ) : null}
        {currentStep === 'Q3-opt' ? (
          <button type="button" className="cta-secondary" onClick={onSkip}>
            {QUESTIONNAIRE.skip}
          </button>
        ) : null}
        {backTarget !== null ? (
          <button type="button" className="text-back" onClick={onBack}>
            {QUESTIONNAIRE.back}
          </button>
        ) : null}
      </footer>
    </div>
  );
}

function questionnaireStage(step: QuestionnaireStepId): string {
  if (step === 'Q1' || step === 'Q2R') return 'Choose your direction';
  if (step === 'Q2D' || step === 'Q3D') return 'Detection basics';
  return 'Learn your pattern';
}

function StepControl({
  step,
  answers,
  now,
  onAdvance,
  onDraft,
}: {
  readonly step: QuestionnaireStepId;
  readonly answers: QuestionnaireAnswers;
  readonly now: Instant;
  readonly onAdvance: (answer: StepAnswer) => void;
  readonly onDraft: (answers: QuestionnaireAnswers) => void;
}) {
  const spec = STEP_SPECS[step];
  switch (step) {
    case 'Q1':
      return <GoalCards onSelect={(goal) => onAdvance({ step: 'Q1', value: goal })} />;
    case 'Q2R':
      return <BreakCards selected={answers.breakRequested} onSelect={(value) => onAdvance({ step: 'Q2R', value })} />;
    case 'Q2':
      return (
        <UseDaysSlider
          value={answers.thcUseDaysLast30 ?? null}
          onChange={(value) => onDraft(applyAnswer(answers, { step: 'Q2', value }, now))}
        />
      );
    case 'Q3':
    case 'Q3-opt':
    case 'Q2A':
      return (
        <DateControl
          window={spec.dateWindow ?? 'any_past'}
          now={now}
          value={answers.lastUseAt}
          showStillUse={step === 'Q2A'}
          onChange={(iso) =>
            onDraft(applyAnswer(answers, { step, value: iso } as StepAnswer, now))
          }
        />
      );
    case 'Q6':
      return (
        <DurationCards
          selected={answers.currentPatternDuration}
          onSelect={(value) => onAdvance({ step: 'Q6', value })}
        />
      );
    case 'Q4':
      return (
        <SessionsControl
          value={answers.sessionsPerUseDay ?? null}
          onChange={(value) => onDraft(applyAnswer(answers, { step: 'Q4', value }, now))}
        />
      );
    case 'Q5':
      return (
        <ProductsRoutesControl
          products={answers.products ?? []}
          routes={answers.routes ?? []}
          onChange={(next) => {
            if (next.products.length >= 1 && next.routes.length >= 1) {
              onDraft(applyAnswer(answers, { step: 'Q5', value: next }, now));
              return;
            }
            onDraft({ ...answers, products: next.products, routes: next.routes });
          }}
        />
      );
    case 'Q2D':
      return (
        <MatrixCards
          selected={answers.detectionMatrix}
          onSelect={(value) => onAdvance({ step: 'Q2D', value })}
        />
      );
    case 'Q3D':
      return (
        <ContextCards
          selected={answers.detectionContext}
          onSelect={(value) => onAdvance({ step: 'Q3D', value })}
        />
      );
  }
}

function canContinue(
  step: QuestionnaireStepId,
  answers: QuestionnaireAnswers,
  now: Instant,
  lastUseWarning: boolean,
): boolean {
  if (step === 'Q2') return answers.thcUseDaysLast30 !== undefined;
  if (step === 'Q4') return answers.sessionsPerUseDay !== undefined;
  if (step === 'Q5') return (answers.products?.length ?? 0) >= 1 && (answers.routes?.length ?? 0) >= 1;
  if (step === 'Q3' || step === 'Q2A' || step === 'Q3-opt') {
    if (lastUseWarning) return isStepComplete(step, answers, now);
    return answers.lastUseAt !== undefined && isStepComplete(step, answers, now);
  }
  return isStepComplete(step, answers, now);
}

function pendingAnswer(step: QuestionnaireStepId, answers: QuestionnaireAnswers): StepAnswer | null {
  switch (step) {
    case 'Q2':
      return answers.thcUseDaysLast30 === undefined ? null : { step: 'Q2', value: answers.thcUseDaysLast30 };
    case 'Q3':
      return answers.lastUseAt === undefined ? null : { step: 'Q3', value: answers.lastUseAt };
    case 'Q2A':
      return answers.lastUseAt === undefined ? null : { step: 'Q2A', value: answers.lastUseAt };
    case 'Q3-opt':
      if (answers.lastUseSkipped === true) return { step: 'Q3-opt', value: { skip: true } };
      return answers.lastUseAt === undefined ? null : { step: 'Q3-opt', value: answers.lastUseAt };
    case 'Q4':
      return answers.sessionsPerUseDay === undefined ? null : { step: 'Q4', value: answers.sessionsPerUseDay };
    case 'Q5':
      if ((answers.products?.length ?? 0) < 1 || (answers.routes?.length ?? 0) < 1) return null;
      return { step: 'Q5', value: { products: answers.products ?? [], routes: answers.routes ?? [] } };
    default:
      return null;
  }
}
