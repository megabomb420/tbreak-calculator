import { useMemo, useState } from 'preact/hooks';
import type { BreakOutlookView, OutlookDayView } from '../application/presentation/break-outlook.ts';
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
  const dayView = view.days.find((row) => row.day === selected) ?? view.days[0] ?? null;

  function select(day: number) {
    if (onSelectDay !== undefined) onSelectDay(day);
    else setInternalDay(day);
  }

  return (
    <section className="outlook" data-testid="break-outlook" data-target={String(view.targetDays ?? 'open')}>
      <p className="micro-label">{GUIDANCE_CHROME.outlook}</p>
      <h3 className="card-title">{RESULT.outlookHeading}</h3>
      <p className="meta">{view.populationNote}</p>
      {view.personalisationNote !== null ? (
        <p className="body" data-testid="outlook-personalisation">
          {view.personalisationNote}
        </p>
      ) : null}
      <OutlookDayStrip days={view.days} selected={selected} onSelect={select} />
      {view.days.length > 10 ? <p className="meta">{RESULT.outlookSwipe}</p> : null}
      {dayView !== null ? <OutlookInspector day={dayView} /> : null}
      <BreakRoadmap
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

function OutlookDayStrip({
  days,
  selected,
  onSelect,
}: {
  readonly days: readonly OutlookDayView[];
  readonly selected: number;
  readonly onSelect: (day: number) => void;
}) {
  return (
    <div className="outlook-strip" role="listbox" aria-label="Planned days" data-testid="outlook-day-strip">
      {days.map((day) => (
        <button
          key={day.day}
          type="button"
          role="option"
          aria-selected={day.day === selected}
          className={`outlook-chip is-${day.status}${day.day === selected ? ' is-selected' : ''}`}
          data-testid={`outlook-day-${day.day}`}
          data-status={day.status}
          onClick={() => onSelect(day.day)}
        >
          <span className="outlook-chip-num">{day.day}</span>
          <span className="outlook-chip-label">Day</span>
        </button>
      ))}
    </div>
  );
}

function OutlookInspector({ day }: { readonly day: OutlookDayView }) {
  return (
    <article className="outlook-inspector" data-testid="outlook-inspector" data-day={String(day.day)} data-window={day.primaryWindowId}>
      <p className="eyebrow">{`Day ${day.day} · ${day.stageLabel}`}</p>
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
      <div className="guidance-block">
        <h3 className="guidance-kicker">{RESULT.whatMatters}</h3>
        <p className="body" data-testid="outlook-matters">
          {day.whatMatters}
        </p>
      </div>
      {day.comesNext !== null ? (
        <div className="guidance-block">
          <h3 className="guidance-kicker">{GUIDANCE_CHROME.comesNext}</h3>
          <p className="body" data-testid="outlook-next">
            {day.comesNext}
          </p>
        </div>
      ) : null}
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
