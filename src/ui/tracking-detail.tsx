import { useRef, useState } from 'preact/hooks';
import type { DailyCheckin } from '../domain/schemas/profile.ts';
import type { Instant } from '../domain/schemas/time.ts';
import type { StoredTrack } from '../application/progress/tracking-record.ts';
import { trackingDayView } from '../application/presentation/plan-presentation.ts';
import { presentBreakGuidance, presentCb1Education } from '../application/presentation/break-guidance.ts';
import type { BreakPreparation } from '../application/break/preparation.ts';
import type { WithdrawalWindowId } from '../domain/guidance/evidence-guidance-v1.ts';
import { GUIDANCE_CHROME, TRACKING_CARD } from './break-copy.ts';
import { BackIcon } from './icons.tsx';
import { useFocusTrap } from './focus-trap.ts';
import { TodayGuidance } from './today-guidance.tsx';
import { BreakRoadmap } from './break-roadmap.tsx';
import { PreparationCard } from './preparation-card.tsx';
import { DetoxEvidencePanel } from './detox-evidence.tsx';

export interface TrackingDetailProps {
  readonly track: StoredTrack;
  readonly now: Instant;
  readonly checkins: readonly DailyCheckin[];
  readonly onBack: () => void;
  readonly onUpdatePreparation: (id: string, preparation: BreakPreparation | null) => void;
}

export function TrackingDetail(props: TrackingDetailProps) {
  const { track } = props;
  const rootRef = useRef<HTMLDivElement>(null);
  useFocusTrap(true, rootRef, props.onBack);
  const [showDetox, setShowDetox] = useState(false);
  const [selectedWindow, setSelectedWindow] = useState<WithdrawalWindowId | null>(null);
  const dayView = trackingDayView(track, props.now);
  const bundle = presentBreakGuidance({
    breakDay: dayView?.day ?? null,
    targetDays: null,
    openEnded: true,
    planned: false,
    preparation: track.preparation,
    checkins: props.checkins,
  });
  const cb1 = presentCb1Education();

  return (
    <div
      className="questionnaire-overlay"
      data-testid="tracking-detail"
      role="dialog"
      aria-modal="true"
      aria-label={TRACKING_CARD.companionTitle}
      ref={rootRef}
    >
      <header className="questionnaire-header">
        <button type="button" className="icon-button" aria-label={GUIDANCE_CHROME.backToToday} onClick={props.onBack}>
          <BackIcon />
        </button>
        <h2 className="flow-title">{TRACKING_CARD.companionTitle}</h2>
      </header>
      <div className="questionnaire-body flow-body plan-detail-body">
        <section className="plan-hero" data-testid="tracking-companion-content">
          <p className="eyebrow">{TRACKING_CARD.eyebrow}</p>
          <h3 className="plan-day-title" data-testid="tracking-detail-day">
            {dayView === null ? TRACKING_CARD.eyebrow : `Day ${dayView.day} ${TRACKING_CARD.sinceLabel}`}
          </h3>
          <p className="meta" data-testid="open-ended-note">
            {GUIDANCE_CHROME.openEndedNote}
          </p>
          <TodayGuidance view={bundle.today} />
          <BreakRoadmap
            stages={bundle.roadmap}
            selectedId={selectedWindow ?? bundle.today.windowId}
            onSelect={setSelectedWindow}
          />
        </section>
        <PreparationCard value={track.preparation} onSave={(next) => props.onUpdatePreparation(track.id, next)} />
        <details className="card guidance-why" data-testid="cb1-note">
          <summary className="card-title">{cb1.title}</summary>
          {cb1.paragraphs.map((paragraph) => (
            <p key={paragraph} className="body">
              {paragraph}
            </p>
          ))}
        </details>
        <button type="button" className="cta-secondary" data-testid="open-detox-evidence" onClick={() => setShowDetox(true)}>
          {GUIDANCE_CHROME.openDetox}
        </button>
      </div>
      {showDetox ? <DetoxEvidencePanel onClose={() => setShowDetox(false)} /> : null}
    </div>
  );
}
