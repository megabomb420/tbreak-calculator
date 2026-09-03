import { useRef, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import type { AnswerRow, ResultView } from '../application/presentation/result-presentation.ts';
import type { QuestionnaireStepId } from '../application/questionnaire/engine.ts';
import { calculateNominalFlowerThc } from '../domain/nominal-thc/nominal-thc-engine.ts';
import { NOMINAL_THC_POLICY_V1 } from '../domain/policies/nominal-thc-policy-v1.ts';
import type { CalculationRecord } from '../application/persistence/calculation-record.ts';
import { recoveryOutlookFromRecord } from '../application/history/present-calculation.ts';
import type { ToleranceRecoveryOutlookV1 } from '../domain/recovery/recovery-outlook.ts';
import type { RecoveryCheckinFactsView } from '../application/presentation/recovery-checkin-facts.ts';
import {
  aroundDay,
  daysSince,
  evidenceRangeLine,
  NOMINAL_THC,
  planHeroLabel,
  RESULT,
} from './result-copy.ts';
import {
  DEFAULT_REDUCTION_DAYS_PER_WEEK,
  DEFAULT_REDUCTION_SESSIONS,
} from '../application/progress/reduction-plan.ts';
import { HISTORY } from './copy.ts';
import { CloseIcon } from './icons.tsx';
import { RangeBand } from './range-band.tsx';
import { WithdrawalTrack } from './withdrawal-track.tsx';
import { BreakOutlook } from './break-outlook.tsx';
import { useFocusTrap } from './focus-trap.ts';
import { DETECTION_EDUCATION_V1 } from '../domain/guidance/evidence-guidance-v1.ts';
import { presentCb1Education } from '../application/presentation/break-guidance.ts';
import { PredictedResetPanel } from './predicted-reset.tsx';
import { RESET_MODE } from './recovery-copy.ts';

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
  readonly reductionPlan?: { readonly maxUseDaysPerWeek: number; readonly maxSessionsPerUseDay: number } | null;
  readonly onReductionPlanChange?: (plan: {
    readonly maxUseDaysPerWeek: number;
    readonly maxSessionsPerUseDay: number;
  }) => void;
  readonly historical?: boolean;
  /** The frozen calculation this result came from, when one exists. Drives the
   * Predicted-reset panel from frozen data only (never re-runs an engine). */
  readonly outlookRecord?: CalculationRecord | null;
  /** Personal check-in facts for the live result (predicted-reset only). */
  readonly checkinFacts?: RecoveryCheckinFactsView | null;
  readonly onAddPastBreak?: () => void;
  readonly onRecalculateWithHistory?: () => void;
  readonly onRecalculate?: () => void;
  readonly onDelete?: () => void;
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
  reductionPlan = null,
  onReductionPlanChange,
  historical = false,
  outlookRecord = null,
  checkinFacts = null,
  onAddPastBreak,
  onRecalculateWithHistory,
  onRecalculate,
  onDelete,
}: ResultScreenProps) {
  const [thcOpen, setThcOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useFocusTrap(!historical, rootRef, onAcknowledge);

  return (
    <div
      className={historical ? 'history-result' : 'questionnaire-overlay'}
      data-testid="result-screen"
      data-kind={view.kind}
      data-historical={historical ? 'true' : 'false'}
      role={historical ? undefined : 'dialog'}
      aria-modal={historical ? undefined : 'true'}
      aria-labelledby="result-title"
      ref={rootRef}
    >
      <header className="questionnaire-header">
        <button type="button" className="icon-button" aria-label={RESULT.close} onClick={onAcknowledge} data-autofocus>
          <CloseIcon />
        </button>
      </header>
      <div className="questionnaire-body result-body">
        {historical ? <p className="meta">{RESULT.historicalNote}</p> : null}
        <ResultBody
          view={view}
          onEditStep={onEditStep}
          onSeeBreakRange={onSeeBreakRange}
          onOpenNominalThc={() => setThcOpen(true)}
          onBreakRecommendation={onBreakRecommendation}
          onDetectionBasics={onDetectionBasics}
          reductionPlan={reductionPlan}
          onReductionPlanChange={onReductionPlanChange}
          historical={historical}
          outlookRecord={outlookRecord}
          checkinFacts={checkinFacts}
          onAddPastBreak={historical ? undefined : onAddPastBreak}
          onRecalculateWithHistory={historical ? undefined : onRecalculateWithHistory}
        />
      </div>
      <footer className="questionnaire-footer">
        <ResultActions
          view={view}
          historical={historical}
          onAcknowledge={onAcknowledge}
          onSeeBreakRange={onSeeBreakRange}
          onCheckAnotherTest={onCheckAnotherTest}
          onStartOver={onStartOver}
          onStartBreak={historical ? undefined : onStartBreak}
          onStartTracking={historical ? undefined : onStartTracking}
          trackingAvailable={trackingAvailable}
          onRecalculate={onRecalculate}
          onDelete={onDelete}
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
  reductionPlan,
  onReductionPlanChange,
  historical,
  outlookRecord,
  checkinFacts,
  onAddPastBreak,
  onRecalculateWithHistory,
}: {
  readonly view: ResultView;
  readonly onEditStep: (step: QuestionnaireStepId) => void;
  readonly onSeeBreakRange: () => void;
  readonly onOpenNominalThc: () => void;
  readonly onBreakRecommendation: () => void;
  readonly onDetectionBasics: () => void;
  readonly reductionPlan: { readonly maxUseDaysPerWeek: number; readonly maxSessionsPerUseDay: number } | null;
  readonly onReductionPlanChange?: (plan: {
    readonly maxUseDaysPerWeek: number;
    readonly maxSessionsPerUseDay: number;
  }) => void;
  readonly historical: boolean;
  readonly outlookRecord: CalculationRecord | null;
  readonly checkinFacts: RecoveryCheckinFactsView | null;
  readonly onAddPastBreak?: () => void;
  readonly onRecalculateWithHistory?: () => void;
}) {
  // Predicted-reset segment: default is the actionable plan. The mode resets
  // to "plan" whenever the underlying record changes so a reused component
  // never carries a stale selection across records.
  const [resetMode, setResetMode] = useState(false);
  const outlook: ToleranceRecoveryOutlookV1 | null = recoveryOutlookFromRecord(outlookRecord);
  const [modeRecordId, setModeRecordId] = useState<string | null>(outlookRecord?.id ?? null);
  const recordId = outlookRecord?.id ?? null;
  if (recordId !== modeRecordId) {
    setModeRecordId(recordId);
    setResetMode(false);
  }
  const legacyReset = historical && outlookRecord !== null && outlookRecord.policyVersion !== 'tolerance-v3';

  switch (view.kind) {
    case 'tolerance_result': {
      // The actionable planning target leads; the broad evidence range stays
      // visible directly underneath so a target inside a shared range is never
      // buried. The target is a planning choice, not a predicted reset date.
      const planBody = (
        <div className="stack">
          <header className="result-hero">
            <p className="eyebrow">Your plan</p>
            <h2 id="result-title" className="hero-range" aria-label={planHeroLabel(view.preferredTargetDays)}>
              <span className="hero-range-visual" aria-hidden="true">
                <span className="hero-num">{view.preferredTargetDays}</span>
                <span className="hero-unit">days</span>
              </span>
            </h2>
            <p className="meta">{evidenceRangeLine(view.rangeDays.min, view.rangeDays.max)}</p>
            <RangeBand
              min={view.rangeDays.min}
              max={view.rangeDays.max}
              preferred={view.preferredTargetDays}
            />
            <p className="body">{view.uncertainty}</p>
            {view.contextNote !== null ? (
              <p className="meta" data-testid="planning-context">
                {view.contextNote}
              </p>
            ) : null}
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
          {view.outlook !== null ? <BreakOutlook view={view.outlook} /> : null}
          <Cb1ContextNote />
          <HistoryCard
            insight={view.history}
            onAddPastBreak={onAddPastBreak}
            onRecalculateWithHistory={onRecalculateWithHistory}
          />
          <AnswersCard answers={view.answers} onEditStep={onEditStep} />
          <FooterLinks onDetection={onDetectionBasics} onNominalThc={onOpenNominalThc} detection={false} />
        </div>
      );
      if (outlook === null) return planBody;
      const resetBody = (
        <div className="stack">
          <h2 id="result-title" className="sr-only">
            {RESET_MODE.reset}
          </h2>
          <PredictedResetPanel
            outlook={outlook}
            historical={historical}
            contextLabel={legacyReset ? RESET_MODE.historicalContext : null}
            checkinFacts={checkinFacts}
          />
        </div>
      );
      return (
        <div className="stack">
          <ResultModeControl resetMode={resetMode} onChange={setResetMode} />
          {resetMode ? resetBody : planBody}
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
          {view.outlook !== null ? <BreakOutlook view={view.outlook} /> : view.withdrawal ? <WithdrawalTrack withdrawal={view.withdrawal} /> : null}
          <Cb1ContextNote />
          <AnswersCard answers={view.answers} onEditStep={onEditStep} />
        </div>
      );
    case 'reduction_planning':
      return (
        <ReductionBody
          answers={view.answers}
          onEditStep={onEditStep}
          onSeeBreakRange={onSeeBreakRange}
          reductionPlan={reductionPlan}
          onReductionPlanChange={onReductionPlanChange}
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
          <details className="card guidance-why" data-testid="detection-education-result">
            <summary className="card-title">{DETECTION_EDUCATION_V1.title}</summary>
            <p className="body">{DETECTION_EDUCATION_V1.lead}</p>
            <ul className="guidance-list">
              {DETECTION_EDUCATION_V1.points.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p className="meta">{DETECTION_EDUCATION_V1.deferred}</p>
          </details>
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

function ResultModeControl({
  resetMode,
  onChange,
}: {
  readonly resetMode: boolean;
  readonly onChange: (reset: boolean) => void;
}) {
  const planRef = useRef<HTMLButtonElement>(null);
  const resetRef = useRef<HTMLButtonElement>(null);

  function select(id: 'plan' | 'reset'): void {
    onChange(id === 'reset');
    const button = id === 'plan' ? planRef.current : resetRef.current;
    button?.focus();
  }

  function keyActivate(
    event: JSX.TargetedKeyboardEvent<HTMLButtonElement>,
    id: 'plan' | 'reset',
  ): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      select(id);
    }
  }

  return (
    <div
      className="result-mode"
      role="tablist"
      aria-label="Result view"
      data-testid="result-mode"
      onKeyDown={(event) => {
        let next: 'plan' | 'reset' | null = null;
        if (event.key === 'ArrowRight') next = 'reset';
        else if (event.key === 'ArrowLeft') next = 'plan';
        else if (event.key === 'Home') next = 'plan';
        else if (event.key === 'End') next = 'reset';
        if (next !== null) {
          event.preventDefault();
          select(next);
        }
      }}
    >
      <button
        type="button"
        role="tab"
        aria-selected={!resetMode}
        tabIndex={resetMode ? -1 : 0}
        className={resetMode ? 'result-mode-option' : 'result-mode-option selected'}
        data-testid="result-mode-plan"
        ref={planRef}
        onClick={() => onChange(false)}
        onKeyDown={(event) => keyActivate(event, 'plan')}
      >
        {RESET_MODE.plan}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={resetMode}
        tabIndex={resetMode ? 0 : -1}
        className={resetMode ? 'result-mode-option selected' : 'result-mode-option'}
        data-testid="result-mode-reset"
        ref={resetRef}
        onClick={() => onChange(true)}
        onKeyDown={(event) => keyActivate(event, 'reset')}
      >
        {RESET_MODE.reset}
      </button>
    </div>
  );
}

function Cb1ContextNote() {
  const cb1 = presentCb1Education();
  return (
    <details className="card guidance-why" data-testid="cb1-note">
      <summary className="card-title">{cb1.title}</summary>
      {cb1.paragraphs.map((paragraph) => (
        <p key={paragraph} className="body">
          {paragraph}
        </p>
      ))}
    </details>
  );
}

function HistoryCard({
  insight,
  onAddPastBreak,
  onRecalculateWithHistory,
}: {
  readonly insight: string | null;
  readonly onAddPastBreak?: () => void;
  readonly onRecalculateWithHistory?: () => void;
}) {
  return (
    <section className="result-section" data-testid="history-card">
      <h3 className="card-title">{RESULT.historyHeading}</h3>
      {insight !== null ? <p className="body">{insight}</p> : <p className="meta">{RESULT.historyPrompt}</p>}
      {onAddPastBreak !== undefined ? (
        <button type="button" className="cta-secondary" data-testid="result-add-past-break" onClick={onAddPastBreak}>
          {RESULT.addPastBreak}
        </button>
      ) : null}
      {onRecalculateWithHistory !== undefined ? (
        <button
          type="button"
          className="cta-secondary"
          data-testid="result-recalculate-history"
          onClick={onRecalculateWithHistory}
        >
          {RESULT.recalculateWithHistory}
        </button>
      ) : null}
    </section>
  );
}

function ReductionBody({
  answers,
  onEditStep,
  onSeeBreakRange,
  reductionPlan,
  onReductionPlanChange,
}: {
  readonly answers: readonly AnswerRow[];
  readonly onEditStep: (step: QuestionnaireStepId) => void;
  readonly onSeeBreakRange: () => void;
  readonly reductionPlan: { readonly maxUseDaysPerWeek: number; readonly maxSessionsPerUseDay: number } | null;
  readonly onReductionPlanChange?: (plan: {
    readonly maxUseDaysPerWeek: number;
    readonly maxSessionsPerUseDay: number;
  }) => void;
}) {
  const [days, setDays] = useState(reductionPlan?.maxUseDaysPerWeek ?? DEFAULT_REDUCTION_DAYS_PER_WEEK);
  const [sessions, setSessions] = useState(reductionPlan?.maxSessionsPerUseDay ?? DEFAULT_REDUCTION_SESSIONS);

  function commit(nextDays: number, nextSessions: number) {
    setDays(nextDays);
    setSessions(nextSessions);
    onReductionPlanChange?.({ maxUseDaysPerWeek: nextDays, maxSessionsPerUseDay: nextSessions });
  }

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
          onChange={(value) => commit(value, sessions)}
        />
        <ReductionStepper
          label={RESULT.maxSessions}
          value={sessions}
          min={1}
          max={9}
          testId="limit-sessions"
          onChange={(value) => commit(days, value)}
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
  historical,
  onAcknowledge,
  onSeeBreakRange,
  onCheckAnotherTest,
  onStartOver,
  onStartBreak,
  onStartTracking,
  trackingAvailable,
  onRecalculate,
  onDelete,
}: {
  readonly view: ResultView;
  readonly historical: boolean;
  readonly onAcknowledge: () => void;
  readonly onSeeBreakRange: () => void;
  readonly onCheckAnotherTest: () => void;
  readonly onStartOver: () => void;
  readonly onStartBreak?: () => void;
  readonly onStartTracking?: () => void;
  readonly trackingAvailable: boolean;
  readonly onRecalculate?: () => void;
  readonly onDelete?: () => void;
}) {
  if (historical) {
    return (
      <>
        {onRecalculate !== undefined && view.kind !== 'unavailable' ? (
          <button type="button" className="cta-primary" data-testid="history-recalculate" onClick={onRecalculate}>
            {HISTORY.recalculate}
          </button>
        ) : null}
        <button type="button" className="cta-secondary" onClick={onAcknowledge}>
          {HISTORY.closeDetail}
        </button>
        {onDelete !== undefined ? (
          <button type="button" className="cta-danger" data-testid="history-delete" onClick={onDelete}>
            {HISTORY.delete}
          </button>
        ) : null}
      </>
    );
  }
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
        <button type="button" className="cta-primary" onClick={onAcknowledge}>
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
  const rootRef = useRef<HTMLDivElement>(null);
  useFocusTrap(true, rootRef, onClose);

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
    <div className="modal-root" data-testid="nominal-thc-sheet" ref={rootRef}>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-sheet" role="dialog" aria-modal="true" aria-label={NOMINAL_THC.title}>
        <div className="sheet-handle" aria-hidden="true" />
        <header className="modal-header">
          <h2 className="card-title">{NOMINAL_THC.title}</h2>
          <button type="button" className="icon-button" aria-label={NOMINAL_THC.close} onClick={onClose} data-autofocus>
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
