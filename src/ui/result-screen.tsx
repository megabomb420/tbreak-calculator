import { useState } from 'preact/hooks';
import type { AnswerRow, ResultView } from '../application/presentation/result-presentation.ts';
import type { QuestionnaireStepId } from '../application/questionnaire/engine.ts';
import { calculateNominalFlowerThc } from '../domain/nominal-thc/nominal-thc-engine.ts';
import { NOMINAL_THC_POLICY_V1 } from '../domain/policies/nominal-thc-policy-v1.ts';
import {
  aroundDay,
  daysSince,
  NOMINAL_THC,
  planForTarget,
  recommendedBreakTitle,
  RESULT,
} from './result-copy.ts';
import { CloseIcon } from './icons.tsx';
import { RangeBand } from './range-band.tsx';
import { WithdrawalTrack } from './withdrawal-track.tsx';

export interface ResultScreenProps {
  readonly view: ResultView;
  readonly onAcknowledge: () => void;
  readonly onEditStep: (step: QuestionnaireStepId) => void;
  readonly onSeeBreakRange: () => void;
  readonly onCheckAnotherTest: () => void;
  readonly onBreakRecommendation: () => void;
  readonly onDetectionBasics: () => void;
  readonly onStartOver: () => void;
  /** Opens the break-start sheet. Absent while a live plan owns the break. */
  readonly onStartBreak?: () => void;
  /** Starts open-ended tracking (abstinence / baseline-low results). */
  readonly onStartTracking?: () => void;
  /** False hides baseline Keep tracking (no last-use anchor stored). */
  readonly trackingAvailable?: boolean;
}

export function ResultScreen({
  view,
  onAcknowledge,
  onEditStep,
  onSeeBreakRange,
  onCheckAnotherTest,
  onBreakRecommendation,
  onDetectionBasics,
  onStartOver,
  onStartBreak,
  onStartTracking,
  trackingAvailable = true,
}: ResultScreenProps) {
  const [thcOpen, setThcOpen] = useState(false);

  return (
    <div
      className="questionnaire-overlay"
      data-testid="result-screen"
      data-kind={view.kind}
      role="dialog"
      aria-modal="true"
      aria-labelledby="result-title"
    >
      <header className="questionnaire-header">
        <button type="button" className="icon-button" aria-label={RESULT.close} onClick={onAcknowledge}>
          <CloseIcon />
        </button>
      </header>
      <div className="questionnaire-body result-body">
        <ResultBody
          view={view}
          onEditStep={onEditStep}
          onSeeBreakRange={onSeeBreakRange}
          onOpenNominalThc={() => setThcOpen(true)}
          onBreakRecommendation={onBreakRecommendation}
          onDetectionBasics={onDetectionBasics}
        />
      </div>
      <footer className="questionnaire-footer">
        <ResultActions
          view={view}
          onAcknowledge={onAcknowledge}
          onSeeBreakRange={onSeeBreakRange}
          onCheckAnotherTest={onCheckAnotherTest}
          onStartOver={onStartOver}
          onStartBreak={onStartBreak}
          onStartTracking={onStartTracking}
          trackingAvailable={trackingAvailable}
        />
      </footer>
      {thcOpen ? <NominalThcSheet onClose={() => setThcOpen(false)} /> : null}
    </div>
  );
}

function ResultBody({
  view,
  onEditStep,
  onSeeBreakRange,
  onOpenNominalThc,
  onBreakRecommendation,
  onDetectionBasics,
}: {
  readonly view: ResultView;
  readonly onEditStep: (step: QuestionnaireStepId) => void;
  readonly onSeeBreakRange: () => void;
  readonly onOpenNominalThc: () => void;
  readonly onBreakRecommendation: () => void;
  readonly onDetectionBasics: () => void;
}) {
  switch (view.kind) {
    case 'tolerance_result': {
      const title = recommendedBreakTitle(view.rangeDays.min, view.rangeDays.max);
      return (
        <div className="stack">
          <header className="result-hero">
            <p className="eyebrow">Recommended break</p>
            <h2 id="result-title" className="hero-range" aria-label={title}>
              <span className="hero-range-visual" aria-hidden="true">
                <span className="hero-num">
                  {view.rangeDays.min}–{view.rangeDays.max}
                </span>
                <span className="hero-unit">days</span>
              </span>
            </h2>
            <p className="meta">{planForTarget(view.preferredTargetDays)}</p>
            <RangeBand
              min={view.rangeDays.min}
              max={view.rangeDays.max}
              preferred={view.preferredTargetDays}
            />
            <p className="body">{view.uncertainty}</p>
          </header>
          <section className="result-section">
            <h3 className="card-title">{RESULT.whyHeading}</h3>
            <ul className="driver-list">
              {view.drivers.map((line) => (
                <li key={line} className="driver-item">
                  <span className="driver-mark" aria-hidden="true" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </section>
          {view.withdrawal ? <WithdrawalTrack withdrawal={view.withdrawal} /> : null}
          {view.history ? (
            <section className="result-section">
              <h3 className="card-title">{RESULT.historyHeading}</h3>
              <p className="body">{view.history}</p>
            </section>
          ) : (
            <p className="meta">Taken a tolerance break before? You can add it later from History.</p>
          )}
          <AnswersCard answers={view.answers} onEditStep={onEditStep} />
          <FooterLinks onDetection={onDetectionBasics} onNominalThc={onOpenNominalThc} detection={false} />
        </div>
      );
    }
    case 'abstinence_planning':
      return (
        <div className="stack">
          <header className="result-hero">
            <p className="eyebrow">Plan</p>
            <h2 id="result-title" className="title">
              {RESULT.abstinenceTitle}
            </h2>
            {view.withdrawal ? <p className="body">{aroundDay(view.withdrawal.breakDay)}</p> : null}
            <p className="meta">{view.phaseCopy}</p>
          </header>
          {view.withdrawal ? <WithdrawalTrack withdrawal={view.withdrawal} /> : null}
          <AnswersCard answers={view.answers} onEditStep={onEditStep} />
        </div>
      );
    case 'reduction_planning':
      return (
        <ReductionBody
          answers={view.answers}
          onEditStep={onEditStep}
          onSeeBreakRange={onSeeBreakRange}
        />
      );
    case 'baseline_low':
      return (
        <div className="stack">
          <header className="result-hero">
            <p className="eyebrow">Baseline</p>
            <h2 id="result-title" className="title">
              {view.title}
            </h2>
            <p className="body">{view.body}</p>
            {view.daysSinceLastUse !== null ? <p className="meta">{daysSince(view.daysSinceLastUse)}</p> : null}
          </header>
          <FooterLinks onDetection={onDetectionBasics} onNominalThc={onOpenNominalThc} detection={false} />
        </div>
      );
    case 'detection':
      return (
        <div className="stack">
          <p className="banner" data-testid="detection-banner">
            {view.banner}
          </p>
          <header className="result-hero">
            <p className="eyebrow">Detection</p>
            <h2 id="result-title" className="title">
              {RESULT.matrixHeading}
            </h2>
            {view.matrixCopy.map((line) => (
              <p key={line} className="body">
                {line}
              </p>
            ))}
          </header>
          {view.contextNote ? (
            <section className="result-section">
              <h3 className="card-title">{RESULT.contextHeading}</h3>
              <p className="body">{view.contextNote}</p>
            </section>
          ) : null}
          <section className="result-section">
            <h3 className="card-title">{RESULT.whatHelpsHeading}</h3>
            <p className="body">{view.whatHelps}</p>
          </section>
          <FooterLinks onDetection={onBreakRecommendation} onNominalThc={onOpenNominalThc} detection />
        </div>
      );
    case 'unavailable':
      return (
        <header className="result-hero">
          <h2 id="result-title" className="title">
            {RESULT.unavailableTitle}
          </h2>
          <p className="body">{RESULT.unavailableBody}</p>
        </header>
      );
  }
}

function ReductionBody({
  answers,
  onEditStep,
  onSeeBreakRange,
}: {
  readonly answers: readonly AnswerRow[];
  readonly onEditStep: (step: QuestionnaireStepId) => void;
  readonly onSeeBreakRange: () => void;
}) {
  const [days, setDays] = useState(3);
  const [sessions, setSessions] = useState(1);
  return (
    <div className="stack">
      <header className="result-hero">
        <p className="eyebrow">Cutting down</p>
        <h2 id="result-title" className="title">
          {RESULT.reductionTitle}
        </h2>
        <p className="body">{RESULT.reductionBody}</p>
      </header>
      <section className="card">
        <h3 className="card-title">{RESULT.limitsHeading}</h3>
        <ReductionStepper
          label={RESULT.maxDaysWeek}
          value={days}
          min={0}
          max={7}
          testId="limit-days"
          onChange={setDays}
        />
        <ReductionStepper
          label={RESULT.maxSessions}
          value={sessions}
          min={1}
          max={9}
          testId="limit-sessions"
          onChange={setSessions}
        />
      </section>
      <section className="result-section">
        <p className="body">{RESULT.reductionSoft}</p>
        <button type="button" className="cta-secondary" onClick={onSeeBreakRange}>
          {RESULT.seeBreakRange}
        </button>
      </section>
      <AnswersCard answers={answers} onEditStep={onEditStep} />
    </div>
  );
}

function ResultActions({
  view,
  onAcknowledge,
  onSeeBreakRange,
  onCheckAnotherTest,
  onStartOver,
  onStartBreak,
  onStartTracking,
  trackingAvailable,
}: {
  readonly view: ResultView;
  readonly onAcknowledge: () => void;
  readonly onSeeBreakRange: () => void;
  readonly onCheckAnotherTest: () => void;
  readonly onStartOver: () => void;
  readonly onStartBreak?: () => void;
  readonly onStartTracking?: () => void;
  readonly trackingAvailable: boolean;
}) {
  switch (view.kind) {
    case 'tolerance_result':
      // While a live plan owns the break, Start-this-break is not offered:
      // starting a second plan over an active one is undefined by the spec.
      if (onStartBreak === undefined) {
        return (
          <button type="button" className="cta-primary" onClick={onAcknowledge}>
            {RESULT.saveWithoutStarting}
          </button>
        );
      }
      return (
        <>
          <button type="button" className="cta-primary" data-testid="start-this-break" onClick={onStartBreak}>
            {RESULT.startThisBreak}
          </button>
          <button type="button" className="cta-secondary" onClick={onAcknowledge}>
            {RESULT.saveWithoutStarting}
          </button>
        </>
      );
    case 'abstinence_planning':
      return (
        <button
          type="button"
          className="cta-primary"
          data-testid="start-tracking"
          onClick={onStartTracking ?? onAcknowledge}
        >
          {RESULT.startTracking}
        </button>
      );
    case 'reduction_planning':
      return (
        <button type="button" className="cta-secondary" onClick={onAcknowledge}>
          {RESULT.done}
        </button>
      );
    case 'baseline_low':
      return (
        <>
          {trackingAvailable ? (
            <button
              type="button"
              className="cta-primary"
              data-testid="keep-tracking"
              onClick={onStartTracking ?? onAcknowledge}
            >
              {RESULT.keepTracking}
            </button>
          ) : null}
          <button type="button" className="cta-secondary" onClick={onAcknowledge}>
            {RESULT.done}
          </button>
        </>
      );
    case 'detection':
      return (
        <>
          <button type="button" className="cta-primary" onClick={onCheckAnotherTest}>
            {RESULT.checkAnotherTest}
          </button>
          <button type="button" className="cta-secondary" onClick={onAcknowledge}>
            {RESULT.done}
          </button>
        </>
      );
    case 'unavailable':
      return (
        <button type="button" className="cta-primary" onClick={onStartOver}>
          {RESULT.startOver}
        </button>
      );
  }
}

function ReductionStepper({
  label,
  value,
  min,
  max,
  testId,
  onChange,
}: {
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly testId: string;
  readonly onChange: (value: number) => void;
}) {
  return (
    <div className="stepper-field meta">
      <span>{label}</span>
      <span className="stepper">
        <button type="button" className="stepper-button" aria-label={`Decrease ${label}`} onClick={() => onChange(Math.max(min, value - 1))}>
          −
        </button>
        <output className="stepper-value" data-testid={testId}>
          {value}
        </output>
        <button type="button" className="stepper-button" aria-label={`Increase ${label}`} onClick={() => onChange(Math.min(max, value + 1))}>
          +
        </button>
      </span>
    </div>
  );
}

function AnswersCard({
  answers,
  onEditStep,
}: {
  readonly answers: readonly AnswerRow[];
  readonly onEditStep: (step: QuestionnaireStepId) => void;
}) {
  if (answers.length === 0) return null;
  return (
    <details className="card" data-testid="answers-card">
      <summary className="card-title">{RESULT.answersHeading}</summary>
      <ul className="answer-list">
        {answers.map((row) => (
          <li key={row.id} className="answer-row">
            <div>
              <p className="meta">{row.label}</p>
              <p className="body">{row.value}</p>
            </div>
            <button type="button" className="cta-secondary" onClick={() => onEditStep(row.step)}>
              {RESULT.edit}
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}

function FooterLinks({
  onDetection,
  onNominalThc,
  detection,
}: {
  readonly onDetection: () => void;
  readonly onNominalThc: () => void;
  readonly detection: boolean;
}) {
  return (
    <div className="footer-links">
      <button type="button" className="text-back" onClick={onDetection}>
        {detection ? RESULT.breakRecommendation : RESULT.detectionBasics}
      </button>
      <button type="button" className="text-back" onClick={onNominalThc}>
        {RESULT.nominalThc}
      </button>
    </div>
  );
}

function NominalThcSheet({ onClose }: { readonly onClose: () => void }) {
  const [grams, setGrams] = useState(0.5);
  const [percent, setPercent] = useState(20);
  const [label, setLabel] = useState(false);
  const [output, setOutput] = useState<string | null>(null);

  function calculate() {
    const result = calculateNominalFlowerThc(
      {
        flowerGrams: { value: grams, provenance: label ? 'label_derived' : 'user_estimate' },
        thcPotencyPercent: { value: percent, provenance: label ? 'label_derived' : 'user_estimate' },
      },
      NOMINAL_THC_POLICY_V1,
    );
    if (result.kind !== 'nominal_thc' || result.nominalThcMg === null) {
      setOutput(null);
      return;
    }
    setOutput(`${grams} g × ${percent} % = ${result.nominalThcMg} mg nominal THC`);
  }

  return (
    <div className="modal-root" data-testid="nominal-thc-sheet">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-sheet" role="dialog" aria-modal="true" aria-label={NOMINAL_THC.title}>
        <div className="sheet-handle" aria-hidden="true" />
        <header className="modal-header">
          <h2 className="card-title">{NOMINAL_THC.title}</h2>
          <button type="button" className="icon-button" aria-label={NOMINAL_THC.close} onClick={onClose}>
            <CloseIcon />
          </button>
        </header>
        <p className="meta">{NOMINAL_THC.intro}</p>
        <label className="limit-field meta">
          {NOMINAL_THC.amount}
          <input
            type="number"
            min={0.1}
            step={0.1}
            value={grams}
            className="numeric-pad"
            onInput={(event) => setGrams(Number((event.target as HTMLInputElement).value))}
          />
        </label>
        <label className="limit-field meta">
          {NOMINAL_THC.potency}
          <input
            type="number"
            min={1}
            max={40}
            value={percent}
            className="numeric-pad"
            onInput={(event) => setPercent(Number((event.target as HTMLInputElement).value))}
          />
        </label>
        <p className="meta">{NOMINAL_THC.helper}</p>
        <div className="chip-row">
          <button type="button" className={label ? 'chip selected' : 'chip'} onClick={() => setLabel(true)}>
            {NOMINAL_THC.fromLabel}
          </button>
          <button type="button" className={!label ? 'chip selected' : 'chip'} onClick={() => setLabel(false)}>
            {NOMINAL_THC.myEstimate}
          </button>
        </div>
        <button type="button" className="cta-primary" onClick={calculate} disabled={!(grams > 0 && percent > 0)}>
          {NOMINAL_THC.calculate}
        </button>
        {output ? <p className="body" data-testid="nominal-thc-output">{output}</p> : null}
      </div>
    </div>
  );
}
