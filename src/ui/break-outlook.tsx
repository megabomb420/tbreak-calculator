import { useMemo, useState } from 'preact/hooks';
import type { BreakOutlookView, OutlookDayView, OutlookSegmentView } from '../application/presentation/break-outlook.ts';
import { segmentContainsDay, segmentForDay } from '../application/presentation/break-outlook.ts';
import { windowById } from '../domain/guidance/evidence-guidance-v1.ts';
import { GUIDANCE_CHROME } from './break-copy.ts';
import { RESULT } from './result-copy.ts';
import { BreakRoadmap } from './break-roadmap.tsx';

export function BreakOutlook({
  view,
  selectedDay,
  onSelectDay,
}: {
  readonly view: BreakOutlookView;
  readonly selectedDay?: number;
  readonly onSelectDay?: (day: number) => void;
}) {
  const defaultDay = useMemo(() => defaultSelectedDay(view), [view]);
  const [internalDay, setInternalDay] = useState(defaultDay);
  const selected = selectedDay ?? internalDay;
  const segment = segmentForDay(view.segments, selected) ?? view.segments[0] ?? null;
  const dayView = view.days.find((row) => row.day === selected) ?? segment?.representative ?? view.days[0] ?? null;

  function select(day: number) {
    if (onSelectDay !== undefined) onSelectDay(day);
    else setInternalDay(day);
  }

  function selectSegment(next: OutlookSegmentView) {
    // Pick the exact day inside the group: the current day when this group
    // contains it, otherwise the group's first day. The exact-day model is
    // never replaced by a coarse phase.
    const pick =
      view.currentDay !== null && segmentContainsDay(next, view.currentDay) ? view.currentDay : next.startDay;
    select(pick);
  }

  return (
    <section className="outlook" data-testid="break-outlook" data-target={String(view.targetDays ?? 'open')}>
      <h3 className="card-title">{RESULT.outlookHeading}</h3>
      <p className="meta">{view.populationNote}</p>
      {view.personalisationNote !== null ? (
        <p className="meta" data-testid="outlook-personalisation">
          {view.personalisationNote}
        </p>
      ) : null}
      <OutlookSegmentStrip view={view} selected={selected} onSelect={selectSegment} />
      {view.segments.length > 10 ? <p className="meta outlook-swipe">{RESULT.outlookSwipe}</p> : null}
      {dayView !== null && segment !== null ? <OutlookInspector day={dayView} segment={segment} view={view} /> : null}
      <BreakRoadmap
        compact
        stages={view.windows}
        selectedId={dayView?.primaryWindowId ?? null}
        onSelect={(id) => {
          const first = view.days.find((row) => row.primaryWindowId === id) ?? view.days.find((row) => row.windowIds.includes(id));
          if (first !== undefined) select(first.day);
        }}
      />
    </section>
  );
}

function OutlookSegmentStrip({
  view,
  selected,
  onSelect,
}: {
  readonly view: BreakOutlookView;
  readonly selected: number;
  readonly onSelect: (segment: OutlookSegmentView) => void;
}) {
  return (
    <div
      className="outlook-strip"
      role="listbox"
      aria-label="Planned days"
      data-testid="outlook-day-strip"
    >
      {view.segments.map((segment) => {
        const isSelected = segmentContainsDay(segment, selected);
        const multi = segment.startDay !== segment.endDay;
        return (
          <button
            key={`${segment.startDay}-${segment.endDay}`}
            type="button"
            role="option"
            aria-selected={isSelected}
            tabIndex={isSelected ? 0 : -1}
            aria-label={segment.label}
            className={`outlook-chip is-${segment.status}${isSelected ? ' is-selected' : ''}`}
            data-testid={`outlook-seg-${segment.startDay}-${segment.endDay}`}
            data-status={segment.status}
            data-start={segment.startDay}
            data-end={segment.endDay}
            onClick={() => onSelect(segment)}
            onKeyDown={(event) => {
              const index = view.segments.indexOf(segment);
              const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? view.segments.length - 1
                : event.key === 'ArrowRight' ? Math.min(index + 1, view.segments.length - 1)
                : event.key === 'ArrowLeft' ? Math.max(index - 1, 0) : null;
              if (nextIndex === null) return;
              event.preventDefault();
              const next = view.segments[nextIndex];
              if (next === undefined) return;
              onSelect(next);
              const target = event.currentTarget.parentElement?.children[nextIndex];
              if (target instanceof HTMLElement) { target.focus(); target.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }); }
            }}
          >
            <span className="outlook-chip-num">
              {multi ? `${segment.startDay}–${segment.endDay}` : segment.startDay}
            </span>
            <span className="outlook-chip-label">{multi ? 'Days' : 'Day'}</span>
            {segment.status === 'current' ? (
              <span className="outlook-chip-now" data-testid={`outlook-now-${segment.startDay}-${segment.endDay}`}>
                {view.currentDay !== null ? `Today ${view.currentDay}` : 'Now'}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function OutlookInspector({
  day,
  segment,
  view,
}: {
  readonly day: OutlookDayView;
  readonly segment: OutlookSegmentView;
  readonly view: BreakOutlookView;
}) {
  const currentInside =
    view.currentDay !== null && segmentContainsDay(segment, view.currentDay) ? view.currentDay : null;
  const multi = segment.startDay !== segment.endDay;
  return (
    <article
      className="outlook-inspector"
      data-testid="outlook-inspector"
      data-day={String(day.day)}
      data-segment={`${segment.startDay}-${segment.endDay}`}
      data-window={day.primaryWindowId}
    >
      <p className="eyebrow">{`${segment.label} \u00b7 ${day.stageLabel}`}</p>
      {currentInside !== null && multi ? (
        <p className="meta" data-testid="outlook-today-line">
          {`Today: Day ${currentInside}`}
        </p>
      ) : null}
      <h4 className="guidance-headline">{day.headline}</h4>
      {day.windowIds.length > 1 ? (
        <p className="meta" data-testid="outlook-overlap">
          {`Also in ${day.windowIds
            .filter((id) => id !== day.primaryWindowId)
            .map((id) => windowById(id).label)
            .join(' and ')}`}
        </p>
      ) : null}
      {day.milestoneTitle !== null ? (
        <p className="guidance-milestone">
          <span className="guidance-milestone-title">{day.milestoneTitle}.</span> {day.milestoneBody}
        </p>
      ) : null}
      <div className="guidance-block">
        <h3 className="guidance-kicker">{RESULT.whatMatters}</h3>
        <p className="body" data-testid="outlook-matters">
          {day.whatMatters}
        </p>
      </div>
      {day.comesNext !== null ? (
        <p className="meta" data-testid="outlook-next">
          {day.comesNext}
        </p>
      ) : null}
      <details className="outlook-more">
        <summary className="outlook-more-summary">{RESULT.outlookMore}</summary>
        <div className="guidance-block">
          <h3 className="guidance-kicker">{GUIDANCE_CHROME.mayNotice}</h3>
          <ul className="guidance-list">
            {day.mayNotice.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        <div className="guidance-block">
          <h3 className="guidance-kicker">{GUIDANCE_CHROME.canHelp}</h3>
          <ul className="guidance-list">
            {day.canHelp.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </details>
      {day.checkin !== null && day.checkin.hasAnyRating ? (
        <div className="guidance-block" data-testid="outlook-checkin">
          <h3 className="guidance-kicker">Your check-in that day</h3>
          <ul className="guidance-list">
            {day.checkin.craving !== null ? <li>{`Craving ${day.checkin.craving}/10`}</li> : null}
            {day.checkin.sleep !== null ? <li>{`Sleep ${day.checkin.sleep}/10`}</li> : null}
            {day.checkin.irritability !== null ? <li>{`Irritability ${day.checkin.irritability}/10`}</li> : null}
            {day.checkin.anxiety !== null ? <li>{`Anxiety ${day.checkin.anxiety}/10`}</li> : null}
            {day.checkin.appetite !== null ? <li>{`Appetite ${day.checkin.appetite}/10`}</li> : null}
          </ul>
          <p className="meta">Observed ratings only. Missing days are skipped, not filled in.</p>
        </div>
      ) : null}
    </article>
  );
}

function defaultSelectedDay(view: BreakOutlookView): number {
  if (view.currentDay !== null) {
    const match = view.days.find((day) => day.day === view.currentDay);
    if (match !== undefined) return match.day;
  }
  return view.days[0]?.day ?? 1;
}
