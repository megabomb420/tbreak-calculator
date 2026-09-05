import { ConfirmDialog as SharedConfirmDialog } from './confirm-dialog.tsx';
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
import { ACTIVE_BREAK_CARD, COMPLETED_CARD, INTERRUPTED_CARD, PLAN_STATE_NOTES, PLANNED_CARD, PROFILE_NO_BREAK, TRACKING_CARD, completedBreakTitle } from './break-copy.ts';
import { PLAN_LENS, RESULT, WITHDRAWAL_STOP_LABELS, evidenceRangeLine, reductionDaysLine, reductionSessionsLine } from './result-copy.ts';
import { ResultLensHero } from './result-lens.tsx';
import { DeviceIcon, IntervalMark, NoAccountIcon, OfflineIcon, PauseIcon, goalIcon } from './icons.tsx';
import { RangeBand } from './range-band.tsx';
import { formatLocalDay } from './format.ts';
import { PostBreakSummary } from './post-break-summary.tsx';
import { TodayGuidance } from './today-guidance.tsx';
import { presentTodayGuidance } from '../application/presentation/break-guidance.ts';
import type { ReductionTrajectoryView } from '../application/presentation/reduction-trajectory.ts';
import type { ExposureContext } from '../domain/guidance/break-outlook.ts';
import type { ReductionPlan, ReductionPlanState } from '../domain/reduction/reduction-engine.ts';
import type { SupportArea } from '../application/questionnaire/companion.ts';

export interface TodayLiveData {
  readonly active: { readonly attempt: StoredAttempt; readonly view: ActiveBreakView } | null;
  readonly interruptedAttempt: StoredAttempt | null;
  readonly interruptedTracking: StoredTrack | null;
  readonly completed: StoredAttempt | null;
  readonly tracking: { readonly track: StoredTrack; readonly view: TrackingDayView | null } | null;
  readonly reduction: { readonly plan: ReductionPlan; readonly state: ReductionPlanState } | null;
  readonly checkins: readonly DailyCheckin[];
  readonly exposure: ExposureContext | null;
  readonly supportAreas: readonly SupportArea[];
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
  readonly onEditSupport: () => void;
  readonly onMarkComplete: (id: string) => void;
  readonly onAcknowledgeComplete: () => void;
  readonly onStopTracking: () => void;
  /** Active cut-down plan feedback line (shown on the reduction card). */
  readonly reductionFeedback: string | null;
  /** Deterministic frozen-record trajectory for the live reduction plan. */
  readonly reductionTrajectory?: ReductionTrajectoryView | null;
  readonly onOpenReductionStart: () => void;
  readonly onLogUse: () => void;
  readonly onOpenReductionRefresh: () => void;
  readonly onPauseReduction: () => void;
  readonly onResumeReduction: () => void;
  readonly onEndReduction: () => void;
  readonly onRecommitReduction: () => void;
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
  const phase = todayPhase(props);

  return (
    <section
      className="today-screen"
      data-testid="today-view"
      data-primary={view.primary}
      data-resume={view.resume}
      data-phase={phase}
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
    case 'reduction-active':
      return <ReductionActiveCard {...props} />;
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
  const phaseRaw = view.pastTarget ? 'extended' : view.atOrPastTargetDate ? 'reached' : phaseForDay(view.day, view.targetDays);
  const phase = phaseRaw as keyof typeof ACTIVE_BREAK_CARD.phaseEyebrow;
  const stateNote = phase === 'reached' ? PLAN_STATE_NOTES.reached(view.targetDays) : phase === 'extended' ? PLAN_STATE_NOTES.extended(view.day, view.targetDays) : null;
  return (
    <article className="today-plan-card today-live-card" data-testid="state-active-break">
      <button
        type="button"
        className="today-plan-main today-phase-hero"
        data-testid="open-plan-detail"
        aria-label={`${ACTIVE_BREAK_CARD.eyebrow} — ${view.dayOfLabel}. Open plan detail.`}
        onClick={props.onOpenPlanDetail}
      >
        <span className="today-hero-copy">
          <span className="eyebrow" data-testid="break-phase-eyebrow">{ACTIVE_BREAK_CARD.phaseEyebrow[phase]}</span>
          <span className="plan-day-title" data-testid="break-day-label">{view.dayOfLabel}</span>
          <span className="meta" data-testid="target-date-line">
            {`${ACTIVE_BREAK_CARD.targetDateLabel} ${formatLocalDay(view.targetDate)}`}
          </span>
        </span>
        <span className="today-hero-mark" aria-hidden="true">
          <span>{view.day}</span>
          <small>day</small>
        </span>
        {view.withdrawal !== null ? <WithdrawalPosition view={view.withdrawal} /> : null}
      </button>
      {stateNote !== null ? (
        <p className={phase === 'reached' ? 'today-state-note is-reached' : 'today-state-note is-extended'} data-testid="plan-target-note" data-state={phase}>
          {stateNote}
        </p>
      ) : null}
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
      <section className="today-now" aria-label="Today’s guidance">
        <TodayGuidance
          compact
          supportAreas={props.live.supportAreas}
          view={presentTodayGuidance({
            breakDay: view.day,
            targetDays: view.targetDays,
            openEnded: false,
            planned: false,
            preparation: attempt.preparation,
            checkins: props.live.checkins,
            exposure: props.live.exposure,
          })}
        />
      </section>
      <button type="button" className="text-link today-plan-link" onClick={props.onOpenPlanDetail}>
        {ACTIVE_BREAK_CARD.viewPlan}
      </button>
      <button type="button" className="text-link today-plan-link" data-testid="today-edit-support" onClick={props.onEditSupport}>
        {props.live.supportAreas.length > 0 ? 'Edit support' : 'Personalise your plan'}
      </button>
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
      <p className="meta">{INTERRUPTED_CARD.preserved}</p>
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
      <p className="meta">{COMPLETED_CARD.historyMeta}</p>
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
          supportAreas={props.live.supportAreas}
          view={presentTodayGuidance({
            breakDay: tracking.view.day,
            targetDays: null,
            openEnded: true,
            planned: false,
            preparation: tracking.track.preparation,
            checkins: props.live.checkins,
            exposure: props.live.exposure,
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
      <button type="button" className="text-link today-plan-link" data-testid="today-edit-support" onClick={props.onEditSupport}>
        {props.live.supportAreas.length > 0 ? 'Edit support' : 'Personalise your plan'}
      </button>
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

function todayPhase(props: TodayScreenProps): string {
  switch (props.view.primary) {
    case 'first-launch': return 'welcome';
    case 'no-profile':
    case 'profile-no-break':
    case 'detection-only': return 'ready';
    case 'interrupted': return 'paused';
    case 'completed-break': return 'complete';
    case 'reduction-active': return 'reduction';
    case 'abstinence-tracking': {
      const day = props.live.tracking?.view?.day ?? 1;
      return day > 28 ? 'extended' : phaseForDay(day, null);
    }
    case 'active-break': {
      const live = props.live.active;
      if (live === null) return 'ready';
      const { day, targetDays } = live.view;
      // Past the finite planning target is its own state ("extended"), so the
      // target-reached moment is not visually identical to day 29 of a 21-day
      // plan. Exactly-on-target stays "reached".
      return live.view.pastTarget ? 'extended' : live.view.atOrPastTargetDate ? 'reached' : phaseForDay(day, targetDays);
    }
  }
}

function phaseForDay(day: number, target: number | null): string {
  if (target !== null && day >= Math.max(1, target - 3)) return 'approaching';
  if (day < 2) return 'onset';
  if (day <= 6) return 'peak';
  if (day <= 14) return 'settling';
  if (day <= 28) return 'middle';
  return 'extended';
}

// --- Active reduction (cut-down) plan --------------------------------------

const REDUCTION_CARD = {
  eyebrow: 'Cutting down',
  title: 'Your cut-down plan',
  pausedNote: 'Plan paused.',
  logUse: 'Log THC use',
  pause: 'Pause',
  pauseAndReview: 'Pause & review',
  resume: 'Resume',
  editPlan: 'Edit plan',
  endPlan: 'End plan',
  reviewBody:
    'Your plan was exceeded twice in the last 7 days. Consider a 3\u20137 day pause and review your limits.',
  endConfirmTitle: 'End your cut-down plan?',
  endConfirmBody:
    'Ending closes this plan and stops tracking use against these limits. Your saved result and history stay on this device.',
  useDayLimitCopy: 'Last 7 days: {0} / {1} use days',
  sessionLimitCopy: 'Today: {0} / {1} sessions',
  useDayLimitSingleCopy: 'Last 7 days: {0} / 1 use day',
  sessionLimitSingleCopy: 'Today: {0} / 1 session',
  aboveWeek: 'Above your use-day plan this week',
  aboveToday: 'Above your plan today',
  concentrateLogged:
    'A concentrate was logged \u2014 your plan says avoid concentrates.',
  refreshRecommendation: 'Update your break recommendation',
  trajectoryMoved: 'Your tracked use is now in a different planning band.',
  trajectoryStarted: 'Started reduction: {0}/30 use days \u00b7 plan target {1} days',
  trajectoryCurrent: 'Current tracked: {0}/30 use days \u00b7 plan target {1} days',
  trajectorySameBand:
    'Your tracked profile is currently in the same planning band.',
} as const;

function reductionStateDaysLine(rolling: number, cap: number): string {
  if (cap === 1) {
    return rolling === 1
      ? 'Last 7 days: 1 / 1 use day'
      : `Last 7 days: ${rolling} / 1 use days`;
  }
  return REDUCTION_CARD.useDayLimitCopy
    .replace('{0}', String(rolling))
    .replace('{1}', String(cap));
}

function reductionStateSessionsLine(sessions: number, cap: number): string {
  if (cap === 1) {
    return sessions === 1
      ? 'Today: 1 / 1 session'
      : `Today: ${sessions} / 1 sessions`;
  }
  return REDUCTION_CARD.sessionLimitCopy
    .replace('{0}', String(sessions))
    .replace('{1}', String(cap));
}

function ReductionTrajectoryLine({ view }: { readonly view: ReductionTrajectoryView }) {
  if (!view.moved) {
    return (
      <p className="meta" data-testid="reduction-trajectory" data-state="same-band">
        {REDUCTION_CARD.trajectorySameBand}
      </p>
    );
  }
  return (
    <section className="reduction-trajectory" data-testid="reduction-trajectory" data-state="moved">
      <p className="body">{REDUCTION_CARD.trajectoryMoved}</p>
      <p className="meta">
        {REDUCTION_CARD.trajectoryStarted
          .replace('{0}', String(view.baselineUseDays))
          .replace('{1}', String(view.baselineTargetDays))}
      </p>
      <p className="meta">
        {REDUCTION_CARD.trajectoryCurrent
          .replace('{0}', String(view.currentUseDays))
          .replace('{1}', String(view.currentTargetDays))}
      </p>
    </section>
  );
}

function ReductionActiveCard(props: TodayScreenProps) {
  const live = props.live.reduction;
  const [confirmEnd, setConfirmEnd] = useState(false);
  if (live === null) return null;
  const { plan, state } = live;
  const paused = plan.status === 'paused';
  const review = plan.status === 'review_recommended' || state.reviewRecommended;
  const pauseLabel = review ? REDUCTION_CARD.pauseAndReview : REDUCTION_CARD.pause;
  const shownStatus = paused ? 'paused' : review ? 'review_recommended' : 'active';

  return (
    <article className="today-plan-card" data-testid="reduction-card" data-status={shownStatus}>
      <p className="eyebrow">{REDUCTION_CARD.eyebrow}</p>
      <h2 className="card-title">{REDUCTION_CARD.title}</h2>
      {props.reductionFeedback !== null ? (
        <p className="today-note meta" data-testid="reduction-feedback">
          {props.reductionFeedback}
        </p>
      ) : null}
      {paused ? (
        <p className="paused-note" data-testid="reduction-paused">
          <PauseIcon size={18} />
          {REDUCTION_CARD.pausedNote}
        </p>
      ) : (
        <>
          {review ? (
            <section className="review-banner" data-testid="reduction-review">
              <p className="body">{REDUCTION_CARD.reviewBody}</p>
              <button
                type="button"
                className="cta-secondary"
                data-testid="reduction-pause-cta"
                onClick={props.onPauseReduction}
              >
                {pauseLabel}
              </button>
            </section>
          ) : null}
          <div className="stack" data-testid="reduction-state">
            <p className="meta">{reductionStateDaysLine(state.rollingUseDays, plan.limits.maxUseDaysPerWeek)}</p>
            {state.useDaysExceeded ? <p className="meta">{REDUCTION_CARD.aboveWeek}</p> : null}
            <p className="meta">{reductionStateSessionsLine(state.todaySessions, plan.limits.maxSessionsPerUseDay)}</p>
            {state.sessionsExceededToday ? <p className="meta">{REDUCTION_CARD.aboveToday}</p> : null}
            {plan.strategy.avoidConcentrates && state.strategyExceededToday ? (
              <p className="meta">{REDUCTION_CARD.concentrateLogged}</p>
            ) : null}
          </div>
          {props.reductionTrajectory !== null && props.reductionTrajectory !== undefined ? (
            <ReductionTrajectoryLine view={props.reductionTrajectory} />
          ) : null}
        </>
      )}
      <div className="today-actions">
        {paused ? (
          <button
            type="button"
            className="cta-primary"
            data-testid="reduction-resume-cta"
            onClick={props.onResumeReduction}
          >
            {REDUCTION_CARD.resume}
          </button>
        ) : (
          <button
            type="button"
            className="cta-primary"
            data-testid="log-use-cta"
            onClick={props.onLogUse}
          >
            {REDUCTION_CARD.logUse}
          </button>
        )}
      </div>
      <div className="footer-links">
        {!paused && !review ? (
          <button type="button" className="text-back" data-testid="reduction-pause" onClick={props.onPauseReduction}>
            {REDUCTION_CARD.pause}
          </button>
        ) : null}
        <button type="button" className="text-back" data-testid="reduction-edit" onClick={props.onRecommitReduction}>
          {REDUCTION_CARD.editPlan}
        </button>
        {plan.events.length > 0 ? (
          <button
            type="button"
            className="text-back"
            data-testid="reduction-refresh-cta"
            onClick={props.onOpenReductionRefresh}
          >
            {REDUCTION_CARD.refreshRecommendation}
          </button>
        ) : null}
        <button type="button" className="text-back" data-testid="reduction-end" onClick={() => setConfirmEnd(true)}>
          {REDUCTION_CARD.endPlan}
        </button>
      </div>
      {confirmEnd ? (
        <ConfirmDialog
          title={REDUCTION_CARD.endConfirmTitle}
          body={REDUCTION_CARD.endConfirmBody}
          confirmLabel={REDUCTION_CARD.endPlan}
          onConfirm={() => {
            setConfirmEnd(false);
            props.onEndReduction();
          }}
          onCancel={() => setConfirmEnd(false)}
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
  // Saved tolerance result on Today reuses the shared result lens hero so the
  // card leads with the same actionable planning target as the live result —
  // the broad evidence range stays visible underneath, exactly as in YOUR PLAN.
  return (
    <article className="today-plan-card saved-result-card" data-testid="state-profile-no-break">
      <ResultLensHero
        eyebrow={PLAN_LENS.eyebrow}
        value={view.preferredTargetDays}
        unit="days"
        summary={PLAN_LENS.summary}
        tone="plan"
      >
        <p className="result-lens-meta">{evidenceRangeLine(view.rangeDays.min, view.rangeDays.max)}</p>
        <RangeBand min={view.rangeDays.min} max={view.rangeDays.max} preferred={view.preferredTargetDays} />
        <p className="meta">{view.uncertainty}</p>
      </ResultLensHero>
      <div className="today-actions">
        <button type="button" className="cta-primary" data-testid="today-start-break" onClick={props.onStartBreak}>
          {PROFILE_NO_BREAK.startThisBreak}
        </button>
      </div>
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
      <div className="cta-row">
        <button
          type="button"
          className="cta-primary"
          data-testid="start-reduction-plan"
          onClick={props.onOpenReductionStart}
        >
          {RESULT.startReductionPlan}
        </button>
        {props.onViewResult ? (
          <button type="button" className="cta-secondary" data-testid="view-result" onClick={props.onViewResult}>
            {PROFILE_NO_BREAK.viewResult}
          </button>
        ) : null}
      </div>
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
  const node = <SharedConfirmDialog title={title} body={body} action={confirmLabel}
    actionTestId="confirm-action" onConfirm={onConfirm} onCancel={onCancel} />;
  const host = document.getElementById('app');
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
