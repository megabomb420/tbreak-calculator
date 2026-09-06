import type { ComponentChildren } from 'preact';
import type { BreakJourneyView, JourneyLegView } from '../application/presentation/break-journey.ts';
import type { Instant } from '../domain/schemas/time.ts';
import { formatLocalDay } from './format.ts';
import { GUIDANCE_CHROME, JOURNEY, journeyDayLabel } from './break-copy.ts';
import { CheckIcon, FlagIcon } from './icons.tsx';

/**
 * The break is a journey: one vertical editorial path from Start through the
 * evidence-based phases to the Target. Shared by the Calculator result
 * (preview — every leg upcoming) and Today (live — past legs carry check-in
 * markers, the current leg marks "You are here", future legs stay
 * expectations, never per-day predictions).
 */
export function BreakJourney({
  view,
  startDate = null,
  targetDate = null,
  currentContent,
  targetContent,
}: {
  readonly view: BreakJourneyView;
  readonly startDate?: Instant | null;
  readonly targetDate?: Instant | null;
  /** Live content at the "You are here" position (check-in + guidance). */
  readonly currentContent?: ComponentChildren;
  /** Live content at the target (completion action). */
  readonly targetContent?: ComponentChildren;
}) {
  const hasCurrentLeg = view.legs.some((leg) => leg.status === 'current');
  return (
    <section
      className="journey"
      data-testid="break-journey"
      data-target={String(view.targetDays ?? 'open')}
      data-mode={view.preview ? 'preview' : 'live'}
      aria-label={JOURNEY.ariaLabel}
    >
      <p className="meta journey-note">{view.populationNote}</p>
      <ol className="journey-path">
        <li className="journey-endpoint is-start" data-testid="journey-start">
          <span className="journey-marker" aria-hidden="true" />
          <span className="journey-endpoint-copy">
            <span className="journey-endpoint-label">{JOURNEY.startLabel}</span>
            <span className="meta">
              {startDate === null ? journeyDayLabel(1) : `${journeyDayLabel(1)} · ${formatLocalDay(startDate)}`}
            </span>
          </span>
        </li>
        {view.legs.map((leg) => (
          <JourneyLeg
            key={leg.id}
            leg={leg}
            currentDay={view.currentDay}
            currentContent={leg.status === 'current' ? currentContent : undefined}
          />
        ))}
        {view.targetDays !== null ? (
          <li
            className={`journey-endpoint is-target${view.currentDay !== null && view.currentDay >= view.targetDays ? ' is-reached' : ''}`}
            data-testid="journey-target"
          >
            <span className="journey-marker" aria-hidden="true">
              <FlagIcon size={12} />
            </span>
            <span className="journey-endpoint-copy">
              <span className="journey-endpoint-label">{JOURNEY.targetLabel}</span>
              <span className="meta">
                {targetDate === null
                  ? journeyDayLabel(view.targetDays)
                  : `${journeyDayLabel(view.targetDays)} · ${formatLocalDay(targetDate)}`}
              </span>
            </span>
            {targetContent}
          </li>
        ) : (
          <li className="journey-endpoint is-open" data-testid="journey-open-end">
            <span className="journey-marker" aria-hidden="true" />
            <span className="journey-endpoint-copy">
              <span className="meta">{GUIDANCE_CHROME.openEndedNote}</span>
            </span>
          </li>
        )}
        {!hasCurrentLeg && currentContent !== undefined && currentContent !== null ? (
          <li className="journey-here-standalone" data-testid="journey-you-are-here">
            {currentContent}
          </li>
        ) : null}
      </ol>
    </section>
  );
}

function JourneyLeg({
  leg,
  currentDay,
  currentContent,
}: {
  readonly leg: JourneyLegView;
  readonly currentDay: number | null;
  readonly currentContent?: ComponentChildren;
}) {
  const showDays = leg.status === 'past' || leg.status === 'current';
  return (
    <li
      className={`journey-leg is-${leg.status}`}
      data-testid={`journey-leg-${leg.id}`}
      data-status={leg.status}
      data-from={leg.fromDay}
      data-to={leg.toDay}
    >
      <div className="journey-leg-row">
        <span className="journey-marker" aria-hidden="true" />
        <div className="journey-leg-copy">
          <span className="journey-leg-label">{leg.label}</span>
          <span className="journey-leg-headline">{leg.headline}</span>
          {leg.status === 'future' ? <span className="meta">{GUIDANCE_CHROME.futureExpectation}</span> : null}
        </div>
      </div>
      {leg.status === 'current' && currentDay !== null ? (
        <div className="journey-here" data-testid="journey-you-are-here">
          <span className="journey-here-label">{JOURNEY.youAreHere}</span>
          <span className="journey-here-day">{journeyDayLabel(currentDay)}</span>
        </div>
      ) : null}
      {showDays ? <JourneyDays leg={leg} /> : null}
      {currentContent}
      <details className="journey-leg-detail">
        <summary>{JOURNEY.legDetail}</summary>
        {leg.mayNotice.length > 0 ? (
          <div className="guidance-block">
            <h3 className="guidance-kicker">{JOURNEY.mayNotice}</h3>
            <ul className="guidance-list">
              {leg.mayNotice.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {leg.canHelp.length > 0 ? (
          <div className="guidance-block">
            <h3 className="guidance-kicker">{JOURNEY.canHelp}</h3>
            <ul className="guidance-list">
              {leg.canHelp.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="meta">{leg.context}</p>
      </details>
    </li>
  );
}

function JourneyDays({ leg }: { readonly leg: JourneyLegView }) {
  return (
    <ol className="journey-days" aria-label={`${leg.label} — day by day`}>
      {leg.days.map((day) => (
        <li
          key={day.day}
          className={`journey-day is-${day.status}${day.hasCheckin ? ' has-checkin' : ''}`}
          data-testid={`journey-day-${day.day}`}
          data-status={day.status}
          data-checkin={day.hasCheckin ? 'true' : 'false'}
          aria-label={`${journeyDayLabel(day.day)}${day.hasCheckin ? `, ${JOURNEY.checkinSaved}` : ''}`}
        >
          <span className="journey-dot" aria-hidden="true">
            {day.hasCheckin ? <CheckIcon size={10} /> : null}
          </span>
          <span className="journey-day-num" aria-hidden="true">{day.day}</span>
        </li>
      ))}
    </ol>
  );
}
