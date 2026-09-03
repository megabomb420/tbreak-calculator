import { useState } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import type { Goal } from '../domain/schemas/enums.ts';
import type { DailyCheckin } from '../domain/schemas/profile.ts';
import type { TodayView } from '../application/shell/today-state.ts';
import type { QuestionnaireProgressRecord } from '../application/progress/questionnaire-progress.ts';
import type { StoredAttempt } from '../application/progress/break-attempt-record.ts';
import type { StoredTrack } from '../application/progress/tracking-record.ts';
import type { ActiveBreakView, PlannedBreakView, TrackingDayView } from '../application/presentation/plan-presentation.ts';
import type { ResultView, WithdrawalView } from '../application/presentation/result-presentation.ts';
import { FIRST_LAUNCH, GOAL_CHIPS, NO_PROFILE, RESUME, resumeTitle } from './copy.ts';
import { ACTIVE_BREAK_CARD, COMPLETED_CARD, INTERRUPTED_CARD, PLANNED_CARD, PROFILE_NO_BREAK, TRACKING_CARD, completedBreakTitle } from './break-copy.ts';
import { RESULT, WITHDRAWAL_STOP_LABELS, planForTarget, reductionDaysLine, reductionSessionsLine } from './result-copy.ts';
import { DeviceIcon, IntervalMark, NoAccountIcon, OfflineIcon, PauseIcon, goalIcon } from './icons.tsx';
import { RangeBand } from './range-band.tsx';
import { formatLocalDay } from './format.ts';
import { PostBreakSummary } from './post-break-summary.tsx';
import { TodayGuidance } from './today-guidance.tsx';
import { presentTodayGuidance } from '../application/presentation/break-guidance.ts';

export interface TodayLiveData {
  readonly active: { readonly attempt: StoredAttempt; readonly view: ActiveBreakView } | null;
  readonly interruptedAttempt: StoredAttempt | null;
  readonly interruptedTracking: StoredTrack | null;
  readonly completed: StoredAttempt | null;
  readonly tracking: { readonly track: StoredTrack; readonly view: TrackingDayView | null } | null;
  readonly checkins: readonly DailyCheckin[];
}

export interface TodayProfileData {
  /** Saved result presentation for the profile-no-break card. */
  readonly resultView: ResultView | null;
  /** A scheduled (planned) break whose card replaces Start-this-break. */
  readonly scheduled: StoredAttempt | null;
  readonly plannedView: PlannedBreakView | null;
  /** Persisted cutting-down limits (UX_SPEC 9.4). */
  readonly reductionPlan: { readonly maxUseDaysPerWeek: number; readonly maxSessionsPerUseDay: number } | null;
}

export interface TodayScreenProps {
  readonly view: TodayView;
  readonly draft: QuestionnaireProgressRecord | null;
  readonly live: TodayLiveData;
  readonly profile: TodayProfileData;
  readonly onStartOver: () => void;
  readonly onGetStarted: () => void;
  readonly onSelectGoal: (goal: Goal) => void;
  readonly onResume: () => void;
  readonly onViewResult?: () => void;
  readonly onStartBreak: () => void;
  readonly onRecalculate: () => void;
  readonly onSeeBreakRange: () => void;
  readonly onStartTracking: () => void;
  readonly onCheckIn: () => void;
  readonly onConfirmWhen: () => void;
  readonly onOpenPlanDetail: () => void;
  readonly onOpenTrackingDetail: () => void;
  readonly onMarkComplete: (id: string) => void;
  readonly onAcknowledgeComplete: () => void;
  readonly onStopTracking: () => void;
}

export function TodayScreen(props: TodayScreenProps) {
  const { view, draft } = props;
  const resume =
    view.resume !== 'none' && draft !== null ? (
      <ResumeCard
        answeredSteps={draft.answeredSteps}
        placement={view.resume}
        onStartOver={props.onStartOver}
        onResume={props.onResume}
      />
    ) : null;

  return (
    <section
      className="today-screen"
      data-testid="today-view"
      data-primary={view.primary}
      data-resume={view.resume}
    >
      {view.resume === 'replaces-primary' ? (
        resume
      ) : (
        <>
          <PrimaryStateCard {...props} />
          {view.resume === 'secondary' ? resume : null}
        </>
      )}
    </section>
  );
}

function PrimaryStateCard(props: TodayScreenProps) {
  switch (props.view.primary) {
    case 'first-launch':
      return <FirstLaunch onGetStarted={props.onGetStarted} />;
    case 'no-profile':
      return <NoProfile onSelectGoal={props.onSelectGoal} />;
    case 'active-break':
      return <ActiveBreakCard {...props} />;
    case 'interrupted':
      return <InterruptedCard {...props} />;
    case 'completed-break':
      return <CompletedBreakCard {...props} />;
    case 'abstinence-tracking':
      return <TrackingCard {...props} />;
    case 'profile-no-break':
      return <ProfileNoBreakCard {...props} />;
    case 'detection-only':
      return <DetectionOnlyCard {...props} />;
  }
}

// --- First launch / no profile ---------------------------------------------

const REASSURANCE_ICONS = {
  offline: OfflineIcon,
  local: DeviceIcon,
  'no-account': NoAccountIcon,
} as const;

function FirstLaunch({ onGetStarted }: { readonly onGetStarted: () => void }) {
  return (
    <div className="stack" data-testid="state-first-launch">
      <div className="hero">
        <div className="brand-mark">
          <IntervalMark size={32} />
        </div>
        <h2 className="title">{FIRST_LAUNCH.title}</h2>
        <p className="body">{FIRST_LAUNCH.promise}</p>
      </div>
      <ul className="reassurance-list">
        {FIRST_LAUNCH.reassurances.map((item) => {
          const Icon = REASSURANCE_ICONS[item.id];
          return (
            <li key={item.id} className="reassurance-item">
              <span className="reassurance-mark">
                <Icon size={18} />
              </span>
              <span>{item.label}</span>
            </li>
          );
        })}
      </ul>
      <aside className="safety-slot" data-slot="safety_first_launch" aria-label="Safety information">
        <p className="meta">{FIRST_LAUNCH.safetyPending}</p>
      </aside>
      <button type="button" className="cta-primary" onClick={onGetStarted}>
        {FIRST_LAUNCH.cta}
      </button>
    </div>
  );
}

function NoProfile({ onSelectGoal }: { readonly onSelectGoal: (goal: Goal) => void }) {
  return (
    <div className="stack" data-testid="state-no-profile">
      <div className="hero">
        <p className="eyebrow">Today</p>
        <h2 className="title">{NO_PROFILE.title}</h2>
      </div>
      <div className="choice-list">
        {GOAL_CHIPS.map((goal) => (
          <button
            key={goal.id}
            type="button"
            className="choice-card"
            data-goal={goal.id}
            onClick={() => onSelectGoal(goal.id)}
          >
            <span className="choice-icon">{goalIcon(goal.id, { size: 20 })}</span>
            <span className="choice-copy">
              <span className="choice-title">{goal.title}</span>
              <span className="meta">{goal.helper}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// --- Live timing states -----------------------------------------------------

function ActiveBreakCard(props: TodayScreenProps) {
  const active = props.live.active;
  if (active === null) return null;
  const { attempt, view } = active;
  return (
    <article className="today-plan-card" data-testid="state-active-break">
      <button
        type="button"
        className="today-plan-main"
        data-testid="open-plan-detail"
        onClick={props.onOpenPlanDetail}
      >
        <p className="eyebrow">{ACTIVE_BREAK_CARD.eyebrow}</p>
        <h2 className="plan-day-title" data-testid="break-day-label">
          {view.dayOfLabel}
        </h2>
        <p className="meta" data-testid="target-date-line">
          {`${ACTIVE_BREAK_CARD.targetDateLabel} ${formatLocalDay(view.targetDate)}`}
        </p>
        {view.withdrawal !== null ? <WithdrawalPosition view={view.withdrawal} /> : null}
      </button>
      <TodayGuidance
        compact
        view={presentTodayGuidance({
          breakDay: view.day,
          targetDays: view.targetDays,
          openEnded: false,
          planned: false,
          preparation: attempt.preparation,
          checkins: props.live.checkins,
        })}
      />
      <div className="today-actions">
        <button type="button" className="cta-primary" data-testid="checkin-cta" onClick={props.onCheckIn}>
          {ACTIVE_BREAK_CARD.checkIn}
        </button>
        {view.atOrPastTargetDate ? (
          <button type="button" className="cta-secondary" data-testid="mark-complete-cta" onClick={() => props.onMarkComplete(attempt.id)}>
            Mark complete
          </button>
        ) : null}
      </div>
      <span className="today-note meta">{ACTIVE_BREAK_CARD.viewPlan}</span>
    </article>
  );
}

function WithdrawalPosition({ view }: { readonly view: WithdrawalView }) {
  const current = view.stops.filter((stop) => stop.status === 'current');
  if (current.length === 0) return null;
  return (
    <p className="meta withdrawal-position" data-testid="withdrawal-position">
      {current.map((stop) => WITHDRAWAL_STOP_LABELS[stop.anchor]).join(' · ')} — happening now
    </p>
  );
}

function InterruptedCard(props: TodayScreenProps) {
  const isTracking = props.live.interruptedTracking !== null;
  const title = isTracking ? INTERRUPTED_CARD.titleTracking : INTERRUPTED_CARD.title;
  const body = isTracking ? INTERRUPTED_CARD.trackingBody : INTERRUPTED_CARD.planBody;
  return (
    <article className="today-plan-card interrupted" data-testid="state-interrupted">
      <p className="eyebrow">{title}</p>
      <p className="paused-note" data-testid="paused-label">
        <PauseIcon size={18} />
        {INTERRUPTED_CARD.pausedLabel}
      </p>
      <p className="body">{body}</p>
      <button type="button" className="cta-primary" data-testid="confirm-when-cta" onClick={props.onConfirmWhen}>
        {INTERRUPTED_CARD.confirmWhen}
      </button>
    </article>
  );
}

function CompletedBreakCard(props: TodayScreenProps) {
  const { completed } = props.live;
  if (completed === null) return null;
  const plan = completed.postBreakPlan;
  return (
    <article className="today-plan-card completed" data-testid="state-completed-break">
      <p className="eyebrow">{COMPLETED_CARD.completeLabel}</p>
      <h2 className="plan-day-title" data-testid="completed-title">
        {completedBreakTitle(completed.targetDurationDays)}
      </h2>
      <p className="meta">Your earlier segments and check-ins stay in your history.</p>
      {plan !== null ? (
        <section className="post-break-summary">
          <h3 className="card-title">{COMPLETED_CARD.postBreakHeading}</h3>
          <PostBreakSummary plan={plan} />
        </section>
      ) : null}
      <button type="button" className="cta-primary" data-testid="acknowledge-complete" onClick={props.onAcknowledgeComplete}>
        {COMPLETED_CARD.done}
      </button>
    </article>
  );
}

function TrackingCard(props: TodayScreenProps) {
  const { tracking } = props.live;
  const [confirmStop, setConfirmStop] = useState(false);
  if (tracking === null) return null;
  const day = tracking.view?.day ?? null;
  return (
    <article className="today-plan-card tracking" data-testid="state-abstinence-tracking">
      <button
        type="button"
        className="today-plan-main"
        data-testid="open-tracking-detail"
        onClick={props.onOpenTrackingDetail}
      >
        <p className="eyebrow">{TRACKING_CARD.eyebrow}</p>
        <h2 className="plan-day-title" data-testid="tracking-day-label">
          {day === null ? 'Tracking' : `Day ${day} ${TRACKING_CARD.sinceLabel}`}
        </h2>
      </button>
      {tracking.view !== null ? (
        <TodayGuidance
          compact
          view={presentTodayGuidance({
            breakDay: tracking.view.day,
            targetDays: null,
            openEnded: true,
            planned: false,
            preparation: tracking.track.preparation,
            checkins: props.live.checkins,
          })}
        />
      ) : null}
      <div className="today-actions">
        <button type="button" className="cta-primary" data-testid="checkin-cta" onClick={props.onCheckIn}>
          {TRACKING_CARD.checkIn}
        </button>
        <button type="button" className="cta-secondary" data-testid="stop-tracking" onClick={() => setConfirmStop(true)}>
          {TRACKING_CARD.stop}
        </button>
      </div>
      <span className="today-note meta">{TRACKING_CARD.viewGuidance}</span>
      {confirmStop ? (
        <ConfirmDialog
          title={TRACKING_CARD.stopConfirmTitle}
          body={TRACKING_CARD.stopConfirmBody}
          confirmLabel={TRACKING_CARD.stop}
          onConfirm={() => {
            setConfirmStop(false);
            props.onStopTracking();
          }}
          onCancel={() => setConfirmStop(false)}
        />
      ) : null}
    </article>
  );
}

// --- Profile-no-break -------------------------------------------------------

function ProfileNoBreakCard(props: TodayScreenProps) {
  const { resultView, scheduled, plannedView } = props.profile;
  if (scheduled !== null) {
    return (
      <article className="today-plan-card" data-testid="state-profile-no-break" data-scheduled="true">
        <p className="eyebrow">{PLANNED_CARD.eyebrow}</p>
        <h2 className="card-title" data-testid="scheduled-start">
          {plannedView === null ? 'Break scheduled' : `${PLANNED_CARD.startsLabel} ${formatLocalDay(plannedView.startDate)}`}
        </h2>
        <p className="meta">Your break will start on this date. Day counters run from your last use.</p>
        <button type="button" className="cta-primary" data-testid="view-scheduled-plan" onClick={props.onOpenPlanDetail}>
          {PLANNED_CARD.viewPlan}
        </button>
        <SecondaryLinks {...props} showRecalculate showViewResult />
      </article>
    );
  }
  switch (resultView?.kind) {
    case 'tolerance_result':
      return <ToleranceSummary {...props} />;
    case 'abstinence_planning':
      return <AbstinenceSummary {...props} />;
    case 'baseline_low':
      return <BaselineSummary {...props} />;
    case 'reduction_planning':
      return <ReductionSummary {...props} />;
    default:
      return (
        <article className="today-plan-card" data-testid="state-profile-no-break">
          <p className="eyebrow">{PROFILE_NO_BREAK.eyebrow}</p>
          <p className="body">{PROFILE_NO_BREAK.saved}</p>
          <SecondaryLinks {...props} showRecalculate showViewResult />
        </article>
      );
  }
}

function ToleranceSummary(props: TodayScreenProps) {
  const view = props.profile.resultView;
  if (view === null || view.kind !== 'tolerance_result') return null;
  return (
    <article className="today-plan-card" data-testid="state-profile-no-break">
      <p className="eyebrow">{PROFILE_NO_BREAK.eyebrow}</p>
      <h2 className="hero-range compact">{`${view.rangeDays.min}–${view.rangeDays.max} days`}</h2>
      <p className="meta">{planForTarget(view.preferredTargetDays)}</p>
      <RangeBand min={view.rangeDays.min} max={view.rangeDays.max} preferred={view.preferredTargetDays} />
      <button type="button" className="cta-primary" data-testid="today-start-break" onClick={props.onStartBreak}>
        {PROFILE_NO_BREAK.startThisBreak}
      </button>
      <SecondaryLinks {...props} showRecalculate showViewResult />
    </article>
  );
}

function AbstinenceSummary(props: TodayScreenProps) {
  return (
    <article className="today-plan-card" data-testid="state-profile-no-break">
      <p className="eyebrow">Plan</p>
      <h2 className="card-title">Staying off THC — your plan.</h2>
      <p className="meta">{RESULT.abstinenceTodayBody}</p>
      <button type="button" className="cta-primary" data-testid="today-start-tracking" onClick={props.onStartTracking}>
        {PROFILE_NO_BREAK.startTracking}
      </button>
      <SecondaryLinks {...props} showRecalculate showViewResult />
    </article>
  );
}

function BaselineSummary(props: TodayScreenProps) {
  const view = props.profile.resultView;
  const hasAnchor = view !== null && view.kind === 'baseline_low' && view.daysSinceLastUse !== null;
  return (
    <article className="today-plan-card" data-testid="state-profile-no-break">
      <p className="eyebrow">Baseline</p>
      {view !== null && view.kind === 'baseline_low' ? (
        <>
          <h2 className="card-title">{view.title}</h2>
          <p className="body">{view.body}</p>
          {view.daysSinceLastUse !== null ? (
            <p className="meta" data-testid="baseline-days">
              {`${view.daysSinceLastUse} days since your last use.`}
            </p>
          ) : null}
        </>
      ) : null}
      {hasAnchor ? (
        <button type="button" className="cta-primary" data-testid="today-keep-tracking" onClick={props.onStartTracking}>
          {PROFILE_NO_BREAK.keepTracking}
        </button>
      ) : null}
      <SecondaryLinks {...props} showRecalculate showViewResult />
    </article>
  );
}

function ReductionSummary(props: TodayScreenProps) {
  const plan = props.profile.reductionPlan;
  return (
    <article className="today-plan-card" data-testid="state-profile-no-break">
      <p className="eyebrow">Cutting down</p>
      <h2 className="card-title">Cutting down — without a full break.</h2>
      {plan !== null ? (
        <ul className="driver-list" data-testid="reduction-limits">
          <li className="driver-item">
            <span className="driver-mark" aria-hidden="true" />
            <span>{reductionDaysLine(plan.maxUseDaysPerWeek)}</span>
          </li>
          <li className="driver-item">
            <span className="driver-mark" aria-hidden="true" />
            <span>{reductionSessionsLine(plan.maxSessionsPerUseDay)}</span>
          </li>
        </ul>
      ) : (
        <p className="meta">{RESULT.reductionBody}</p>
      )}
      {props.onViewResult ? (
        <button type="button" className="cta-primary" data-testid="view-result" onClick={props.onViewResult}>
          {PROFILE_NO_BREAK.viewResult}
        </button>
      ) : null}
      <div className="footer-links">
        <button type="button" className="text-back" data-testid="today-see-break-range" onClick={props.onSeeBreakRange}>
          {PROFILE_NO_BREAK.seeBreakRange}
        </button>
        <button type="button" className="text-back" data-testid="today-recalculate" onClick={props.onRecalculate}>
          {PROFILE_NO_BREAK.recalculate}
        </button>
      </div>
    </article>
  );
}

function DetectionOnlyCard(props: TodayScreenProps) {
  return (
    <article className="today-plan-card" data-testid="state-detection-only">
      <p className="eyebrow">Detection</p>
      <h2 className="card-title">Detection information</h2>
      <p className="body">Your last detection information is saved on this device.</p>
      <button type="button" className="cta-primary" onClick={() => props.onSelectGoal('tolerance_reset')}>
        Get a break recommendation
      </button>
      {props.onViewResult ? (
        <button type="button" className="cta-secondary" onClick={props.onViewResult}>
          View result
        </button>
      ) : null}
    </article>
  );
}

function SecondaryLinks({
  showRecalculate,
  showViewResult,
  ...props
}: TodayScreenProps & { readonly showRecalculate?: boolean; readonly showViewResult?: boolean }) {
  return (
    <div className="footer-links">
      {showRecalculate ? (
        <button type="button" className="text-back" data-testid="today-recalculate" onClick={props.onRecalculate}>
          {PROFILE_NO_BREAK.recalculate}
        </button>
      ) : null}
      {showViewResult && props.onViewResult ? (
        <button type="button" className="text-back" data-testid="view-result" onClick={props.onViewResult}>
          {PROFILE_NO_BREAK.viewResult}
        </button>
      ) : null}
    </div>
  );
}

function ConfirmDialog({
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  readonly title: string;
  readonly body: string;
  readonly confirmLabel: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}) {
  const node = (
    <div className="modal-root" data-testid="confirm-dialog">
      <div className="modal-backdrop" onClick={onCancel} />
      <div className="modal-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-handle" aria-hidden="true" />
        <h2 className="card-title">{title}</h2>
        <p className="body">{body}</p>
        <div className="cta-row">
          <button type="button" className="cta-primary" data-testid="confirm-action" onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button type="button" className="cta-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
  const host = typeof document !== 'undefined' ? document.getElementById('app') : null;
  return host !== null ? createPortal(node, host) : node;
}

function ResumeCard({
  answeredSteps,
  placement,
  onStartOver,
  onResume,
}: {
  readonly answeredSteps: number;
  readonly placement: 'secondary' | 'replaces-primary';
  readonly onStartOver: () => void;
  readonly onResume: () => void;
}) {
  return (
    <article className="deferred-shell resume-card" data-testid="resume-card" data-resume-placement={placement}>
      <p className="micro-label">Unfinished</p>
      <h2 className="card-title">{resumeTitle(answeredSteps)}</h2>
      {placement === 'secondary' ? <p className="meta">{RESUME.draftOnly}</p> : null}
      <div className="cta-row">
        <button type="button" className="cta-primary" onClick={onResume}>
          {RESUME.resume}
        </button>
        <button type="button" className="cta-secondary" onClick={onStartOver}>
          {RESUME.startOver}
        </button>
      </div>
    </article>
  );
}
