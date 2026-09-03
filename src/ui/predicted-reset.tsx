import type {
  ToleranceRecoveryOutlook,
  ToleranceRecoveryOutlookV1,
  ToleranceRecoveryOutlookV2,
} from '../domain/recovery/recovery-outlook.ts';
import { highestCravingObservation, sleepFirstToLaterChange } from '../domain/checkins/checkin-summary.ts';
import type { RecoveryCheckinFactsView } from '../application/presentation/recovery-checkin-facts.ts';
import {
  predictedWindowParts,
  RESET_EVIDENCE,
  RESET_HISTORY_RAISED,
  RESET_PANEL,
  RESET_V1_PANEL,
  resetHistoryLine,
  resetMilestoneDayLabel,
} from './recovery-copy.ts';
import { ResultInsight, ResultLensHero } from './result-lens.tsx';

export interface PredictedResetPanelProps {
  readonly outlook: ToleranceRecoveryOutlook;
  readonly historical: boolean;
  readonly onCloseEvidence?: never;
  readonly historyNote?: string | null;
  readonly checkinFacts?: RecoveryCheckinFactsView | null;
  readonly contextLabel?: string | null;
}

export function PredictedResetPanel(props: PredictedResetPanelProps) {
  return props.outlook.version === 'tolerance-recovery-outlook-v1'
    ? <HistoricalV1Panel {...props} outlook={props.outlook} />
    : <CurrentV2Panel {...props} outlook={props.outlook} />;
}

function CurrentV2Panel({
  outlook,
  historical,
  historyNote = null,
  checkinFacts = null,
  contextLabel = null,
}: Omit<PredictedResetPanelProps, 'outlook'> & { readonly outlook: ToleranceRecoveryOutlookV2 }) {
  const range = outlook.evidenceRange;
  const target = outlook.planningTargetDays;
  if (range === null || target === null) return null;
  const prediction = outlook.predictedRecoveryWindow;
  const extended = outlook.predictionEvidence.extendedBeyondHumanReference;
  const window = predictedWindowParts(prediction.min, prediction.max);

  return (
    <div className="stack reset-panel">
      {contextLabel !== null ? <p className="eyebrow" data-testid="reset-context-label">{contextLabel}</p> : null}

      <div data-testid="reset-predicted-window">
        <ResultLensHero
          eyebrow={RESET_PANEL.predictionTitle}
          prefix={window.prefix}
          value={window.value}
          unit={window.unit}
          summary={RESET_PANEL.disclaimer}
          tone="recovery"
          valueTestId="reset-window-value"
          summaryTestId="reset-disclaimer"
        >
        {extended ? (
          <p className="meta reset-evidence-label" data-testid="reset-lower-directness">
            The part beyond Day 28 is a lower-directness product heuristic.
          </p>
        ) : null}
        </ResultLensHero>
      </div>

      <div className="reset-comparison">
        <ResultInsight
          label={RESET_PANEL.planningCardTitle}
          value={`${target} days`}
          testId="reset-planning-target"
        >
          <span className="sr-only" data-testid="reset-target-day">{target} days</span>
          <p className="body">{planningNote(historical, contextLabel)}</p>
          <p className="meta" data-testid="reset-evidence-range">
            {RESET_PANEL.rangeCardTitle}: {range.min}–{range.max} days. {RESET_PANEL.rangeCardNote}
          </p>
        </ResultInsight>

        <ResultInsight
          label={RESET_PANEL.referenceCardTitle}
          value={RESET_PANEL.referenceValue}
          testId="reset-biological-reference"
        >
          <p className="body">{RESET_PANEL.referenceNotes[0]}</p>
          <p className="meta">{RESET_PANEL.referenceNotes[1]}</p>
          {outlook.profileContext.lightOrRegular ? (
            <p className="meta" data-testid="reset-light-reference-note">{RESET_PANEL.lightReferenceNote}</p>
          ) : null}
        </ResultInsight>
      </div>

      {extended ? (
        <section className="result-section reset-extended" data-testid="reset-extended-recovery">
          <h3 className="card-title">{RESET_PANEL.extendedHeading}</h3>
          <p className="body">{RESET_PANEL.extendedBody}</p>
        </section>
      ) : null}

      <p className="body" data-testid="reset-wording">{RESET_PANEL.wording[outlook.wordingKey]}</p>
      <Timeline outlook={outlook} />
      <CheckinFactsBlock facts={checkinFacts} />
      <HistoryBlock outlook={outlook} historyNote={historyNote} />
      <EvidenceDisclosure extended={extended} />
    </div>
  );
}

function HistoricalV1Panel({
  outlook,
  historyNote = null,
  checkinFacts = null,
  contextLabel = null,
}: Omit<PredictedResetPanelProps, 'outlook'> & { readonly outlook: ToleranceRecoveryOutlookV1 }) {
  const range = outlook.evidenceRange;
  const target = outlook.planningTargetDays;
  if (range === null || target === null) return null;
  return (
    <div className="stack reset-panel" data-testid="reset-v1-historical">
      {contextLabel !== null ? <p className="eyebrow" data-testid="reset-context-label">{contextLabel}</p> : null}
      <p className="body" data-testid="reset-disclaimer">{RESET_V1_PANEL.disclaimer}</p>
      <section className="card reset-card" data-testid="reset-planning-target">
        <h3 className="card-title">{RESET_V1_PANEL.planningCardTitle}</h3>
        <p className="reset-stat" data-testid="reset-target-day">Day {target}</p>
        <p className="body">{RESET_PANEL.planningCardLegacyNote}</p>
      </section>
      <section className="card reset-card" data-testid="reset-evidence-range">
        <h3 className="card-title">{RESET_V1_PANEL.rangeCardTitle}</h3>
        <p className="reset-stat reset-stat-compact">{range.min}–{range.max} days</p>
      </section>
      <section className="card reset-card" data-testid="reset-biological-reference">
        <h3 className="card-title">{RESET_V1_PANEL.referenceCardTitle}</h3>
        <p className="reset-stat reset-stat-compact">{RESET_V1_PANEL.referenceValue}</p>
        <p className="body">{RESET_V1_PANEL.referenceNote}</p>
      </section>
      <Timeline outlook={outlook} />
      <CheckinFactsBlock facts={checkinFacts} />
      <HistoryBlock outlook={outlook} historyNote={historyNote} />
    </div>
  );
}

function Timeline({ outlook }: { readonly outlook: ToleranceRecoveryOutlook }) {
  return (
    <section className="result-section" data-testid="reset-timeline-section">
      <h3 className="card-title">Recovery timeline</h3>
      <ul className="recovery-timeline" data-testid="recovery-timeline">
        {outlook.milestones.map((milestone) => (
          <li key={milestone.id} className="recovery-milestone" data-testid={`recovery-milestone-${milestone.id}`}>
            <span className="recovery-milestone-day meta">{resetMilestoneDayLabel(milestone.day)}</span>
            <span className="body">{milestone.label}</span>
          </li>
        ))}
      </ul>
      <p className="meta">{RESET_PANEL.timelineCaption}</p>
    </section>
  );
}

function HistoryBlock({
  outlook,
  historyNote,
}: {
  readonly outlook: ToleranceRecoveryOutlook;
  readonly historyNote: string | null;
}) {
  if (outlook.personalHistory === null) return null;
  return (
    <section className="result-section" data-testid="reset-history">
      <h3 className="card-title">{RESET_PANEL.historyHeading}</h3>
      <p className="meta">{RESET_PANEL.historyHelper}</p>
      <ul className="guidance-list">
        {outlook.personalHistory.map((observation, index) => (
          <li key={`${observation.durationDays}-${observation.toleranceReductionScore}-${index}`}>
            {resetHistoryLine(observation.durationDays, observation.toleranceReductionScore)}
          </li>
        ))}
      </ul>
      {outlook.historyRaisedTarget ? <p className="meta" data-testid="reset-history-raised">{RESET_HISTORY_RAISED}</p> : null}
      {historyNote !== null ? <p className="meta">{historyNote}</p> : null}
    </section>
  );
}

function EvidenceDisclosure({ extended }: { readonly extended: boolean }) {
  return (
    <details className="card guidance-why" data-testid="reset-evidence">
      <summary className="card-title">{extended ? RESET_EVIDENCE.extendedSummary : RESET_EVIDENCE.summary}</summary>
      <h3 className="micro-label">{RESET_EVIDENCE.directHeading}</h3>
      <p className="micro-label">{RESET_EVIDENCE.dsouzaTitle}</p>
      <p className="body">{RESET_EVIDENCE.dsouzaBody}</p>
      <p className="micro-label">{RESET_EVIDENCE.hirvonenTitle}</p>
      <p className="body">{RESET_EVIDENCE.hirvonenBody}</p>
      {extended ? (
        <>
          <h3 className="micro-label">{RESET_EVIDENCE.extendedHeading}</h3>
          <p className="body">{RESET_EVIDENCE.extendedBody}</p>
          <p className="body">{RESET_EVIDENCE.indirectBody}</p>
        </>
      ) : null}
      <p className="card-title" data-testid="reset-evidence-not">{RESET_EVIDENCE.notHeading}</p>
      <ul className="guidance-list">
        {(extended ? RESET_EVIDENCE.notPoints : RESET_EVIDENCE.baseNotPoints).map((point) => <li key={point}>{point}</li>)}
      </ul>
    </details>
  );
}

function planningNote(historical: boolean, contextLabel: string | null): string {
  if (!historical) return RESET_PANEL.planningCardLiveNote;
  return contextLabel === null ? RESET_PANEL.planningCardFrozenNote : RESET_PANEL.planningCardLegacyNote;
}

function CheckinFactsBlock({ facts }: { readonly facts: RecoveryCheckinFactsView | null }) {
  if (facts === null) return null;
  const craving = highestCravingObservation(facts.rows);
  const sleep = sleepFirstToLaterChange(facts.rows);
  if (craving === null && sleep === null) return null;
  return (
    <section className="result-section" data-testid="reset-checkins">
      <h3 className="card-title">{RESET_PANEL.checkinsHeading}</h3>
      <ul className="guidance-list">
        {craving !== null ? <li data-testid="reset-checkin-craving">Your highest recorded craving was {craving.craving}/10 on Day {craving.day}.</li> : null}
        {sleep !== null ? <li data-testid="reset-checkin-sleep">Your recorded sleep rating went from {sleep.firstValue}/10 (Day {sleep.firstDay}) to {sleep.laterValue}/10 (Day {sleep.laterDay}).</li> : null}
      </ul>
    </section>
  );
}
