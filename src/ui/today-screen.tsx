import { latestTodayCheckin } from '../application/presentation/today-checkin.ts';
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
import { currentSegmentAnchor } from '../application/presentation/plan-presentation.ts';
import type { ResultView } from '../application/presentation/result-presentation.ts';
import { FIRST_LAUNCH, GOAL_CHIPS, NO_PROFILE, RESUME, resumeTitle } from './copy.ts';
import { ACTIVE_BREAK_CARD, COMPLETED_CARD, GUIDANCE_CHROME, INTERRUPTED_CARD, PLAN_STATE_NOTES, PLANNED_CARD, PROFILE_NO_BREAK, TRACKING_CARD, checkinProgressLine, completedBreakTitle } from './break-copy.ts';
import { PLAN_LENS, RESULT, evidenceRangeLine, reductionDaysLine, reductionSessionsLine } from './result-copy.ts';
import { CheckIcon, DeviceIcon, IntervalMark, NoAccountIcon, OfflineIcon, PauseIcon, goalIcon } from './icons.tsx';
import { RangeBand } from './range-band.tsx';
import { formatLocalDay } from './format.ts';
import { abstinenceDayAt } from '../domain/breaks/break-time.ts';
import { parseSubmittedTimestamp } from '../domain/schemas/time.ts';
import { PostBreakSummary } from './post-break-summary.tsx';
import { DailySupport } from './daily-support.tsx';
import { ExtraBlocks, StageBlock } from './today-guidance.tsx';
import { presentDailySupport } from '../application/presentation/daily-support.ts';
import { ResultLensHero } from './result-lens.tsx';
import { BreakJourney } from './break-journey.tsx';
import { researchFactForDay } from './research-facts.ts';
import { presentBreakOutlook } from '../application/presentation/break-outlook.ts';
import { presentBreakJourney } from '../application/presentation/break-journey.ts';
import type { ExposureContext } from '../domain/guidance/break-outlook.ts';
import type { ToleranceRecoveryOutlook } from '../domain/recovery/recovery-outlook.ts';
import type { ReductionPlan, ReductionPlanState } from '../domain/reduction/reduction-engine.ts';
import type { RecoveryCheckinFactsView } from '../application/presentation/recovery-checkin-facts.ts';
import { PredictedResetPanel } from './predicted-reset.tsx';

export interface TodayLiveData {
  readonly now: number;
  readonly active: { readonly attempt: StoredAttempt; readonly view: ActiveBreakView } | null;
  readonly interruptedAttempt: StoredAttempt | null;
  readonly interruptedTracking: StoredTrack | null;
  readonly completed: StoredAttempt | null;
  readonly tracking: { readonly track: StoredTrack; readonly view: TrackingDayView | null } | null;
  readonly reduction: { readonly plan: ReductionPlan; readonly state: ReductionPlanState } | null;
  readonly checkins: readonly DailyCheckin[];
  readonly exposure: ExposureContext | null;
  /** Recovery outlook of the active break's own frozen record, when it has
   * one; drives the closed Recovery outlook disclosure on the active card. */
  readonly outlook: ToleranceRecoveryOutlook | null;
  /** Live check-in facts for that outlook panel (the result screen's view). */
  readonly checkinFacts: RecoveryCheckinFactsView | null;
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
  readonly onUndoCheckin: () => void;
  readonly onConfirmWhen: () => void;
  readonly onDismissUnconfirmedUse: () => void;
  readonly onEndEarly: (id: string) => void;
  readonly onCancelPlanned: (id: string) => void;
  readonly onOpenTrackingDetail: () => void;
  readonly onMarkComplete: (id: string) => void;
  readonly onAcknowledgeComplete: () => void;
  readonly onStopTracking: () => void;
  readonly onOpenReductionStart: () => void;
  readonly onLogUse: () => void;
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
        <p className="meta">{FIRST_LAUNCH.safety[0]}</p>
        {FIRST_LAUNCH.safety.length > 1 ? (
          <details className="safety-more">
            <summary>Before you start</summary>
            {FIRST_LAUNCH.safety.slice(1).map((line) => (
              <p key={line} className="meta">
                {line}
              </p>
            ))}
          </details>
        ) : null}
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

function QuickCheckinActions({ props, checked }: { readonly props: TodayScreenProps; readonly checked: boolean }) {
  return <div className="quick-checkin" data-testid="quick-checkin">
    <button type="button" className={checked ? 'cta-primary is-checked' : 'cta-primary'}
      data-testid="checkin-cta" aria-pressed={checked} disabled={checked} onClick={props.onCheckIn}>
      {checked ? <><CheckIcon size={20} /><span>Checked in today</span></> : <><CheckIcon size={20} /><span>Check in</span></>}
    </button>
    {checked ? (
      <div className="checkin-receipt">
        <p className="meta" role="status">Saved · No THC reported</p>
        <button type="button" className="text-back" data-testid="undo-checkin" aria-label="Undo latest check-in" onClick={props.onUndoCheckin}>Undo</button>
      </div>
    ) : <p className="meta checkin-meaning">Records no THC for this break day. You can undo it.</p>}
  </div>;
}

// --- Live timing states -----------------------------------------------------

function ActiveBreakCard(props: TodayScreenProps) {
  const active = props.live.active;
  const [confirmEnd, setConfirmEnd] = useState(false);
  if (active === null) return null;
  const { attempt, view } = active;
  const outlook = props.live.outlook;
  const phaseRaw = view.pastTarget ? 'extended' : view.atOrPastTargetDate ? 'reached' : phaseForDay(view.day, view.targetDays);
  const phase = phaseRaw as keyof typeof ACTIVE_BREAK_CARD.phaseEyebrow;
  const chosen = attempt.targetSource === 'chosen';
  const stateNote =
    phase === 'reached'
      ? chosen ? PLAN_STATE_NOTES.chosenReached(view.targetDays) : PLAN_STATE_NOTES.reached(view.targetDays)
      : phase === 'extended'
        ? chosen ? PLAN_STATE_NOTES.chosenExtended(view.day, view.targetDays) : PLAN_STATE_NOTES.extended(view.day, view.targetDays)
        : null;
  const anchor = currentSegmentAnchor(attempt.segments);
  // Days with a recorded no-use check-in up to and including today, used for
  // the quiet progress line and the "Checked in today" CTA state.
  const recordedDays = new Set<number>();
  const todayIndex = latestTodayCheckin(props.live.checkins, anchor, props.live.now);
  const checkedToday = todayIndex >= 0;
  if (anchor !== null) {
    for (const row of props.live.checkins) {
      if (row.usedThc) continue;
      const recorded = parseSubmittedTimestamp(row.recordedAt);
      if (recorded === null || recorded < anchor || recorded > props.live.now) continue;
      const day = abstinenceDayAt(recorded, anchor);
      if (day < 1 || day > view.day) continue;
      recordedDays.add(day);
    }
  }
  const support = presentDailySupport({
    day: view.day, now: props.live.now,
    anchor,
    targetDays: view.targetDays,
    checkins: props.live.checkins,
    preparation: attempt.preparation,
  });
  const journey = presentBreakJourney(
    presentBreakOutlook({
      targetDays: view.targetDays,
      openEnded: false,
      currentDay: view.day,
      exposure: props.live.exposure ?? DEFAULT_EXPOSURE,
      checkins: props.live.checkins,
      lastUseAt: anchor,
    }),
  );
  return (
    <article className="today-plan-card today-live-card" data-testid="state-active-break">
      <header className="today-live-head">
          <p className="eyebrow" data-testid="break-phase-eyebrow">{ACTIVE_BREAK_CARD.phaseEyebrow[phase]}</p>
          <h2 className="plan-day-title" data-testid="break-day-label">{view.dayOfLabel}</h2>
          <p className="meta" data-testid="target-date-line">
            {`${ACTIVE_BREAK_CARD.targetDateLabel} ${formatLocalDay(view.targetDate)}`}
          </p>
          {recordedDays.size > 0 ? (
            <p className="meta" data-testid="checkin-progress">
              {checkinProgressLine(recordedDays.size, view.targetDays, view.day <= view.targetDays)}
            </p>
          ) : null}
      </header>
      {stateNote !== null ? (
        <p className={phase === 'reached' ? 'today-state-note is-reached' : 'today-state-note is-extended'} data-testid="plan-target-note" data-state={phase}>
          {stateNote}
        </p>
      ) : null}
      <div className="today-actions">
        <QuickCheckinActions props={props} checked={checkedToday} />
        {view.atOrPastTargetDate ? (
          <button type="button" className="cta-secondary" data-testid="mark-complete-cta" onClick={() => props.onMarkComplete(attempt.id)}>
            {ACTIVE_BREAK_CARD.markComplete}
          </button>
        ) : null}
      </div>
      <StageBlock support={support} />
      <DailySupport view={support} />
      <ExtraBlocks support={support} />
      <details className="result-disclosure today-block" data-testid="today-timeline">
        <summary>Your break timeline</summary>
        <BreakJourney view={journey} />
        <BreakResearchNote day={view.day} />
      </details>
      {outlook !== null ? (
        <details className="result-disclosure today-block" data-testid="today-outlook">
          <summary>Recovery outlook</summary>
          <p className="meta">Research context, not a measure of your recovery.</p>
          <PredictedResetPanel outlook={outlook} historical={false} contextLabel={null} checkinFacts={props.live.checkinFacts} />
        </details>
      ) : null}
      <details className="result-disclosure today-block">
        <summary>Manage break</summary>
        <p className="meta">Used THC since you started? Update the clock without losing your earlier days.</p>
        <button type="button" className="cta-secondary" data-testid="update-last-use" onClick={props.onConfirmWhen}>Update last use</button>
        <button type="button" className="text-back" data-testid="end-early" onClick={() => setConfirmEnd(true)}>
          {ACTIVE_BREAK_CARD.endEarly}
        </button>
      </details>
      {confirmEnd ? (
        <ConfirmDialog
          title={ACTIVE_BREAK_CARD.endEarlyConfirmTitle}
          body={ACTIVE_BREAK_CARD.endEarlyConfirmBody}
          confirmLabel={ACTIVE_BREAK_CARD.endEarlyConfirm}
          onConfirm={() => {
            setConfirmEnd(false);
            props.onEndEarly(attempt.id);
          }}
          onCancel={() => setConfirmEnd(false)}
        />
      ) : null}
    </article>
  );
}

/** One quiet, curated research-context line for the active-break card,
 * keyed to the current abstinence day. Never coaching; the source link opens
 * the same PubMed reference the Science screen uses. */
function BreakResearchNote({ day }: { readonly day: number }) {
  const fact = researchFactForDay(day);
  return (
    <section className="today-research-note" data-testid="today-research-fact" data-fact={fact.id}>
      <h3 className="guidance-kicker">{GUIDANCE_CHROME.research}</h3>
      <p className="body">{fact.text}</p>
      <a className="text-link" href={fact.sourceUrl} target="_blank" rel="noopener noreferrer">
        {fact.sourceLabel} ↗
      </a>
    </section>
  );
}

const DEFAULT_EXPOSURE: ExposureContext = {
  useDaysLast30: null,
  sessionsPerUseDay: null,
  products: [],
  routes: [],
  currentPatternDuration: null,
};

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
      <button type="button" className="text-back" data-testid="dismiss-unconfirmed-use" onClick={props.onDismissUnconfirmedUse}>I didn’t use THC — undo report</button>
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
  const anchor = currentSegmentAnchor(tracking.track.segments);
  const todayIndex = latestTodayCheckin(props.live.checkins, anchor, props.live.now);
  const support = tracking.view === null ? null : presentDailySupport({
    day: tracking.view.day, now: props.live.now,
    anchor,
    targetDays: null,
    checkins: props.live.checkins,
    preparation: tracking.track.preparation,
  });
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
      <div className="today-actions">
        <QuickCheckinActions props={props} checked={todayIndex >= 0} />
      </div>
      {support !== null ? (
        <>
          <StageBlock support={support} />
          <DailySupport view={support} />
          <ExtraBlocks support={support} />
        </>
      ) : null}
      <button type="button" className="text-link today-plan-link" onClick={props.onOpenTrackingDetail}>{TRACKING_CARD.viewGuidance}</button>
      <button type="button" className="text-back today-plan-link" data-testid="update-last-use" onClick={props.onConfirmWhen}>Update last use</button>
      <button type="button" className="text-back today-plan-link" data-testid="stop-tracking" onClick={() => setConfirmStop(true)}>{TRACKING_CARD.stop}</button>
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
  title: 'This rolling week',
  pausedNote: 'Plan paused.',
  logUse: 'Log a session',
  pause: 'Pause',
  resume: 'Resume',
  editPlan: 'Edit plan',
  endPlan: 'End plan',
  reviewBody:
    'Your limits were crossed on two days in this rolling week. Adjust the plan if it was unrealistic, or pause it if you want some space.',
  endConfirmTitle: 'End your cut-down plan?',
  endConfirmBody:
    'Ending closes this plan and stops tracking use against these limits. Your saved result and history stay on this device.',
  aboveWeek: 'Weekly cap passed',
  aboveToday: 'Today’s session cap passed',
  concentrateLogged:
    'A concentrate was logged \u2014 your plan says avoid concentrates.',
} as const;

function ReductionActiveCard(props: TodayScreenProps) {
  const live = props.live.reduction;
  const [confirmEnd, setConfirmEnd] = useState(false);
  if (live === null) return null;
  const { plan, state } = live;
  const paused = plan.status === 'paused';
  const review = state.reviewRecommended;
  const shownStatus = paused ? 'paused' : review ? 'review_recommended' : 'active';
  const useProgress = Math.min(100, (state.rollingUseDays / plan.limits.maxUseDaysPerWeek) * 100);
  const sessionProgress = Math.min(100, (state.todaySessions / plan.limits.maxSessionsPerUseDay) * 100);
  const daysLeft = Math.max(0, plan.limits.maxUseDaysPerWeek - state.rollingUseDays);
  const sessionsLeft = Math.max(0, plan.limits.maxSessionsPerUseDay - state.todaySessions);

  return (
    <article className="today-plan-card" data-testid="reduction-card" data-status={shownStatus}>
      <p className="eyebrow">{REDUCTION_CARD.eyebrow}</p>
      <h2 className="card-title">{REDUCTION_CARD.title}</h2>
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
              <div className="cta-row">
                <button
                  type="button"
                  className="cta-secondary"
                  data-testid="reduction-adjust-cta"
                  onClick={props.onRecommitReduction}
                >
                  Adjust limits
                </button>
                <button
                  type="button"
                  className="text-back"
                  data-testid="reduction-pause-cta"
                  onClick={props.onPauseReduction}
                >
                  Pause plan
                </button>
              </div>
            </section>
          ) : null}
          <div className="reduction-metrics" data-testid="reduction-state">
            <section className={state.useDaysExceeded ? 'reduction-metric is-over' : 'reduction-metric'}>
              <p className="micro-label">Use days · last 7 days</p>
              <p className="reduction-metric-value" data-testid="reduction-use-days-value"><strong>{state.rollingUseDays}</strong><span>of {plan.limits.maxUseDaysPerWeek}</span></p>
              <div className="reduction-meter" aria-hidden="true"><span style={{ width: `${useProgress}%` }} /></div>
              <p className="meta" data-testid="reduction-use-days-status">{state.useDaysExceeded ? REDUCTION_CARD.aboveWeek : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left under your cap`}</p>
            </section>
            <section className={state.sessionsExceededToday ? 'reduction-metric is-over' : 'reduction-metric'}>
              <p className="micro-label">Sessions · today</p>
              <p className="reduction-metric-value" data-testid="reduction-sessions-value"><strong>{state.todaySessions}</strong><span>of {plan.limits.maxSessionsPerUseDay}</span></p>
              <div className="reduction-meter" aria-hidden="true"><span style={{ width: `${sessionProgress}%` }} /></div>
              <p className="meta" data-testid="reduction-sessions-status">{state.sessionsExceededToday ? REDUCTION_CARD.aboveToday : state.todaySessions === 0 ? 'Nothing logged today' : `${sessionsLeft} ${sessionsLeft === 1 ? 'session' : 'sessions'} left under your cap`}</p>
            </section>
            {plan.strategy.avoidConcentrates && state.strategyExceededToday ? (
              <p className="meta">{REDUCTION_CARD.concentrateLogged}</p>
            ) : null}
          </div>
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
  const [confirmCancel, setConfirmCancel] = useState(false);
  if (scheduled !== null) {
    return (
      <article className="today-plan-card" data-testid="state-profile-no-break" data-scheduled="true">
        <p className="eyebrow">{PLANNED_CARD.eyebrow}</p>
        <h2 className="card-title" data-testid="scheduled-start">
          {plannedView === null ? 'Break scheduled' : `${PLANNED_CARD.startsLabel} ${formatLocalDay(plannedView.startDate)}`}
        </h2>
        <p className="meta" data-testid="scheduled-start-note">
          {scheduled.targetSource === 'chosen'
            ? 'Your break starts on this date and your day count begins then.'
            : 'Your break will start on this date. Day counters run from your last use.'}
        </p>
        <div className="footer-links">
          <button type="button" className="text-back" data-testid="cancel-planned" onClick={() => setConfirmCancel(true)}>
            {PLANNED_CARD.cancelPlanTitle}
          </button>
          <button type="button" className="text-back" data-testid="today-recalculate" onClick={props.onRecalculate}>
            {PROFILE_NO_BREAK.recalculate}
          </button>
          {props.onViewResult ? (
            <button type="button" className="text-back" data-testid="view-result" onClick={props.onViewResult}>
              {PROFILE_NO_BREAK.viewResult}
            </button>
          ) : null}
        </div>
        {confirmCancel ? (
          <ConfirmDialog
            title={PLANNED_CARD.cancelPlanTitle}
            body={PLANNED_CARD.cancelPlanBody}
            confirmLabel={PLANNED_CARD.cancelConfirm}
            onConfirm={() => {
              setConfirmCancel(false);
              props.onCancelPlanned(scheduled.id);
            }}
            onCancel={() => setConfirmCancel(false)}
          />
        ) : null}
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
      <h2 className="card-title">Set limits, then log only when you use.</h2>
      {plan !== null ? (
        <ul className="driver-list" data-testid="reduction-limits" aria-label="Suggested starting limits">
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
      <p className="meta">The tracker counts sessions and use days across a rolling week. Days off need no entry.</p>
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
