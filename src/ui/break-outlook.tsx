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
      <h3 className="card-title">{RESULT.outlookHeading}</h3>
      <p className="meta">{view.populationNote}</p>
      {view.personalisationNote !== null ? (
        <p className="meta" data-testid="outlook-personalisation">
          {view.personalisationNote}
        </p>
      ) : null}
      <OutlookDayStrip days={view.days} selected={selected} onSelect={select} />
      {view.days.length > 10 ? <p className="meta outlook-swipe">{RESULT.outlookSwipe}</p> : null}
      {dayView !== null ? <OutlookInspector day={dayView} /> : null}
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
