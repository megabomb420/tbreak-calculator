// PredictedResetPanel — the "Predicted reset" view of a tolerance result
// (0.9.0 Recovery Intelligence).
//
// Renders the versioned ToleranceRecoveryOutlookV1 deterministically: an
// evidence-informed estimate with an explicit planning target, evidence
// range, the four-week biological reference, a TIME-since-last-use timeline
// (never a percentage curve), the user's own clean previous-break facts, and
// a plain-language evidence disclosure. No progress bars, percentages or
// recovery meters are ever rendered here.

import type { ToleranceRecoveryOutlookV1 } from '../domain/recovery/recovery-outlook.ts';
import { highestCravingObservation, sleepFirstToLaterChange } from '../domain/checkins/checkin-summary.ts';
import type { RecoveryCheckinFactsView } from '../application/presentation/recovery-checkin-facts.ts';
import {
  RESET_EVIDENCE,
  RESET_HISTORY_RAISED,
  RESET_PANEL,
  resetHistoryLine,
  resetMilestoneDayLabel,
} from './recovery-copy.ts';

export interface PredictedResetPanelProps {
  readonly outlook: ToleranceRecoveryOutlookV1;
  readonly historical: boolean;
  /** Evidence always lives in this panel's own disclosure; no close hook. */
  readonly onCloseEvidence?: never;
  /** Optional frozen-history note (policy overrides / context explanation). */
  readonly historyNote?: string | null;
  /** Personal check-in facts, when derivable for the live result. */
  readonly checkinFacts?: RecoveryCheckinFactsView | null;
  /** Lead label shown only for frozen pre-v3 records. */
  readonly contextLabel?: string | null;
}

export function PredictedResetPanel({
  outlook,
  historical,
  historyNote = null,
  checkinFacts = null,
  contextLabel = null,
}: PredictedResetPanelProps) {
  const wording = RESET_PANEL.wording[outlook.wordingKey];
  const history = outlook.personalHistory;
  const range = outlook.evidenceRange;
  const target = outlook.planningTargetDays;
  // The builder never emits an outlook without range/target; this guard keeps
  // direct renders of the panel safe on partial data (render nothing).
  if (range === null || target === null) return null;

  return (
    <div className="stack reset-panel">
      {contextLabel !== null ? (
        <p className="eyebrow" data-testid="reset-context-label">
          {contextLabel}
        </p>
      ) : null}
      <p className="body" data-testid="reset-disclaimer">
        {RESET_PANEL.disclaimer}
      </p>

      <section className="card reset-card" data-testid="reset-planning-target">
        <h3 className="card-title">{RESET_PANEL.planningCardTitle}</h3>
        <p className="reset-stat" data-testid="reset-target-day">
          {RESET_PANEL.planningCardUnit} {target}
        </p>
        <p className="body">{planningNote(historical, contextLabel)}</p>
      </section>

      <section className="card reset-card" data-testid="reset-evidence-range">
        <h3 className="card-title">{RESET_PANEL.rangeCardTitle}</h3>
        <p className="reset-stat">
          {range.min}–{range.max} days
        </p>
        <p className="body">{RESET_PANEL.rangeCardNote}</p>
      </section>

      <section className="card reset-card" data-testid="reset-biological-reference">
        <h3 className="card-title">{RESET_PANEL.referenceCardTitle}</h3>
        <p className="reset-stat">{RESET_PANEL.referenceValue}</p>
        {RESET_PANEL.referenceNotes.map((note) => (
          <p key={note} className="body">
            {note}
          </p>
        ))}
      </section>

      <p className="body" data-testid="reset-wording">
        {wording}
      </p>

      <section className="result-section" data-testid="reset-timeline-section">
        <h3 className="card-title">Recovery timeline</h3>
        <ul className="recovery-timeline" data-testid="recovery-timeline">
          {outlook.milestones.map((milestone) => (
            <li
              key={milestone.id}
              className="recovery-milestone"
              data-testid={`recovery-milestone-${milestone.id}`}
            >
              <span className="recovery-milestone-day meta">
                {resetMilestoneDayLabel(milestone.day)}
              </span>
              <span className="body">{milestone.label}</span>
            </li>
          ))}
        </ul>
        <p className="meta">{RESET_PANEL.timelineCaption}</p>
      </section>

      <CheckinFactsBlock facts={checkinFacts} />

      {history !== null ? (
        <section className="result-section" data-testid="reset-history">
          <h3 className="card-title">{RESET_PANEL.historyHeading}</h3>
          <p className="meta">{RESET_PANEL.historyHelper}</p>
          <ul className="guidance-list">
            {history.map((observation, index) => (
              <li
                key={`${observation.durationDays}-${observation.toleranceReductionScore}-${index}`}
              >
                {resetHistoryLine(observation.durationDays, observation.toleranceReductionScore)}
              </li>
            ))}
          </ul>
          {outlook.historyRaisedTarget ? (
            <p className="meta" data-testid="reset-history-raised">
              {RESET_HISTORY_RAISED}
            </p>
          ) : null}
          {historyNote !== null ? <p className="meta">{historyNote}</p> : null}
        </section>
      ) : null}

      <details className="card guidance-why" data-testid="reset-evidence">
        <summary className="card-title">{RESET_EVIDENCE.summary}</summary>
        <p className="micro-label">{RESET_EVIDENCE.dsouzaTitle}</p>
        <p className="body">{RESET_EVIDENCE.dsouzaBody}</p>
        <p className="micro-label">{RESET_EVIDENCE.hirvonenTitle}</p>
        <p className="body">{RESET_EVIDENCE.hirvonenBody}</p>
        <p className="card-title" data-testid="reset-evidence-not">
          {RESET_EVIDENCE.notHeading}
        </p>
        <ul className="guidance-list">
          {RESET_EVIDENCE.notPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function planningNote(historical: boolean, contextLabel: string | null): string {
  if (!historical) return RESET_PANEL.planningCardLiveNote;
  return contextLabel === null
    ? RESET_PANEL.planningCardFrozenNote
    : RESET_PANEL.planningCardLegacyNote;
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
        {craving !== null ? (
          <li data-testid="reset-checkin-craving">
            Your highest recorded craving was {craving.craving}/10 on Day {craving.day}.
          </li>
        ) : null}
        {sleep !== null ? (
          <li data-testid="reset-checkin-sleep">
            Your recorded sleep rating went from {sleep.firstValue}/10 (Day {sleep.firstDay}) to{' '}
            {sleep.laterValue}/10 (Day {sleep.laterDay}).
          </li>
        ) : null}
      </ul>
    </section>
  );
}
