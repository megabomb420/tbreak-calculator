import type { RoadmapStageView } from '../application/presentation/break-guidance.ts';
import { windowById } from '../domain/guidance/evidence-guidance-v1.ts';
import { GUIDANCE_CHROME } from './break-copy.ts';

export function BreakRoadmap({
  stages,
  selectedId,
  onSelect,
  compact = false,
}: {
  readonly stages: readonly RoadmapStageView[];
  readonly selectedId: RoadmapStageView['id'] | null;
  readonly onSelect?: (id: RoadmapStageView['id']) => void;
  readonly compact?: boolean;
}) {
  const selected = selectedId === null ? null : windowById(selectedId);
  return (
    <section className={compact ? 'roadmap is-compact' : 'roadmap'} data-testid="break-roadmap">
      <h3 className={compact ? 'guidance-kicker' : 'card-title'}>{GUIDANCE_CHROME.roadmap}</h3>
      {compact ? null : <p className="meta">{GUIDANCE_CHROME.overlap}</p>}
      <ol className="roadmap-list">
        {stages.map((stage) => (
          <li key={stage.id}>
            <button
              type="button"
              className={`roadmap-stage is-${stage.status}${selectedId === stage.id ? ' is-selected' : ''}`}
              data-testid={`roadmap-stage-${stage.id}`}
              data-status={stage.status}
              onClick={() => onSelect?.(stage.id)}
            >
              <span className="roadmap-marker" aria-hidden="true" />
              <span className="roadmap-copy">
                <span className="roadmap-label">{stage.label}</span>
                <span className="roadmap-headline">{stage.headline}</span>
                {stage.overlapNote !== null && (stage.status === 'current' || stage.status === 'current-overlap') ? (
                  <span className="meta">{stage.overlapNote}</span>
                ) : null}
                {stage.status === 'future' ? <span className="meta">{GUIDANCE_CHROME.futureExpectation}</span> : null}
                {stage.beyondPlanTarget ? <span className="meta">{GUIDANCE_CHROME.beyondTarget}</span> : null}
              </span>
            </button>
          </li>
        ))}
      </ol>
      {!compact && selected !== null ? (
        <article className="roadmap-detail" data-testid="roadmap-detail" data-window={selected.id}>
          <h4 className="guidance-headline">{selected.headline}</h4>
          <p className="body">{selected.context}</p>
        </article>
      ) : null}
    </section>
  );
}
