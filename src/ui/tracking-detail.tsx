import { useRef, useState } from 'preact/hooks';
import type { DailyCheckin, UseProfileInput } from '../domain/schemas/profile.ts';
import type { Instant } from '../domain/schemas/time.ts';
import type { StoredTrack } from '../application/progress/tracking-record.ts';
import { currentSegmentAnchor, trackingDayView } from '../application/presentation/plan-presentation.ts';
import { presentBreakGuidance, presentCb1Education } from '../application/presentation/break-guidance.ts';
import { exposureFromProfile } from '../domain/guidance/break-outlook.ts';
import { presentOutlookForProfile } from '../application/presentation/break-outlook.ts';
import type { BreakPreparation } from '../application/break/preparation.ts';
import { GUIDANCE_CHROME, TRACKING_CARD } from './break-copy.ts';
import { BackIcon } from './icons.tsx';
import { useFocusTrap } from './focus-trap.ts';
import { TodayGuidance } from './today-guidance.tsx';
import { BreakOutlook } from './break-outlook.tsx';
import { PreparationCard } from './preparation-card.tsx';
import { DetoxEvidencePanel } from './detox-evidence.tsx';

export interface TrackingDetailProps {
  readonly track: StoredTrack;
  readonly now: Instant;
  readonly checkins: readonly DailyCheckin[];
  readonly onBack: () => void;
  readonly onUpdatePreparation: (id: string, preparation: BreakPreparation | null) => void;
  readonly profile: UseProfileInput | null;
}

export function TrackingDetail(props: TrackingDetailProps) {
  const { track } = props;
  const rootRef = useRef<HTMLDivElement>(null);
  useFocusTrap(true, rootRef, props.onBack);
  const [showDetox, setShowDetox] = useState(false);
  const dayView = trackingDayView(track, props.now);
  const exposure = props.profile === null ? null : exposureFromProfile(props.profile);
  const bundle = presentBreakGuidance({
    breakDay: dayView?.day ?? null,
    targetDays: null,
    openEnded: true,
    planned: false,
    preparation: track.preparation,
    checkins: props.checkins,
    exposure,
  });
  const outlook = presentOutlookForProfile({
    profile: props.profile ?? {
      goal: 'abstinence',
      breakRequested: false,
      postBreakMode: 'continue_abstinence',
      thcUseDaysLast30: { value: null, provenance: 'missing' },
      sessionsPerUseDay: { value: null, provenance: 'missing' },
      products: [],
      routes: [],
      lastUseAt: { value: null, provenance: 'missing' },
      currentPatternDuration: { value: null, provenance: 'missing' },
      previousBreaks: [],
    },
    targetDays: null,
    openEnded: true,
    currentDay: dayView?.day ?? null,
    planned: false,
    preview: false,
    checkins: props.checkins,
    lastUseAt: currentSegmentAnchor(track.segments),
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
          <BreakOutlook view={outlook} />
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
