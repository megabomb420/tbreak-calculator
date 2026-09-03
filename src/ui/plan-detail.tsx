import { useRef, useState } from 'preact/hooks';
import type { DailyCheckin, UseProfileInput } from '../domain/schemas/profile.ts';
import type { Instant } from '../domain/schemas/time.ts';
import type { PostBreakMode } from '../domain/schemas/enums.ts';
import type { StoredAttempt } from '../application/progress/break-attempt-record.ts';
import {
  MAX_SESSIONS_PER_USE_DAY,
  MAX_USE_DAYS_PER_WEEK,
  MIN_SESSIONS_PER_USE_DAY,
  MIN_USE_DAYS_PER_WEEK,
  defaultPostBreakPlan,
  type PostBreakPlan,
  type PotencyStrategy,
  type QuantityStrategy,
} from '../application/break/post-break-plan.ts';
import type { ActiveBreakView, PlannedBreakView } from '../application/presentation/plan-presentation.ts';
import { activeBreakView, plannedBreakView } from '../application/presentation/plan-presentation.ts';
import { formatLocalDay } from './format.ts';
import { PlanRing } from './plan-ring.tsx';
import { PLAN_DETAIL, PLAN_STATE_NOTES, POST_BREAK_MESSAGES, POST_BREAK_MODE_COPY, POST_BREAK_SETTINGS, POTENCY_STRATEGY_OPTIONS, QUANTITY_STRATEGY_OPTIONS, PLANNED_CARD, GUIDANCE_CHROME } from './break-copy.ts';
import { BackIcon, CloseIcon, MoreIcon } from './icons.tsx';
import { useFocusTrap } from './focus-trap.ts';
import { TodayGuidance } from './today-guidance.tsx';
import { BreakOutlook } from './break-outlook.tsx';
import { PreparationCard } from './preparation-card.tsx';
import { DetoxEvidencePanel } from './detox-evidence.tsx';
import { presentBreakGuidance, presentCb1Education, presentPostBreakGuidance } from '../application/presentation/break-guidance.ts';
import { exposureFromProfile } from '../domain/guidance/break-outlook.ts';
import { presentOutlookForProfile } from '../application/presentation/break-outlook.ts';
import { currentSegmentAnchor } from '../application/presentation/plan-presentation.ts';
import type { BreakPreparation } from '../application/break/preparation.ts';
import type { BreakOutlookView } from '../application/presentation/break-outlook.ts';
import type { SupportFocus } from '../application/questionnaire/companion.ts';
import { supportFocusCopy } from './companion-copy.ts';

export interface PlanDetailProps {
  readonly attempt: StoredAttempt;
  readonly now: Instant;
  /** Authoritative last-use anchor (for the planned view's target date). */
  readonly anchor: Instant | null;
  readonly onBack: () => void;
  readonly onMarkComplete: (id: string) => void;
  readonly onEndEarly: (id: string) => void;
  readonly onCancelPlanned: (id: string) => void;
  readonly onRecalculate: () => void;
  readonly onUpdatePostBreak: (id: string, mode: PostBreakMode, plan: PostBreakPlan) => void;
  readonly onUpdatePreparation: (id: string, preparation: BreakPreparation | null) => void;
  readonly checkins: readonly DailyCheckin[];
  readonly profile: UseProfileInput | null;
  readonly supportFocus?: SupportFocus | null;
}

export function PlanDetail(props: PlanDetailProps) {
  const { attempt } = props;
  const rootRef = useRef<HTMLDivElement>(null);
  useFocusTrap(true, rootRef, props.onBack);
  const active = attempt.status === 'active' ? activeBreakView(attempt, props.now) : null;
  const planned = attempt.status === 'planned' ? plannedBreakView(attempt, props.anchor) : null;
  const [confirm, setConfirm] = useState<'end-early' | 'cancel' | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [showDetox, setShowDetox] = useState(false);
  const exposure = props.profile === null ? null : exposureFromProfile(props.profile);
  const bundle = presentBreakGuidance({
    breakDay: active?.day ?? null,
    targetDays: attempt.targetDurationDays,
    openEnded: false,
    planned: attempt.status === 'planned',
    preparation: attempt.preparation,
    checkins: props.checkins,
    exposure,
  });
  const outlook =
    attempt.status === 'planned'
      ? presentOutlookForProfile({
          profile: props.profile ?? emptyProfile(),
          targetDays: attempt.targetDurationDays,
          openEnded: false,
          currentDay: null,
          planned: true,
          preview: true,
        })
      : presentOutlookForProfile({
          profile: props.profile ?? emptyProfile(),
          targetDays: attempt.targetDurationDays,
          openEnded: false,
          currentDay: active?.day ?? null,
          planned: false,
          preview: false,
          checkins: props.checkins,
          lastUseAt: props.anchor,
        });

  return (
    <div className="questionnaire-overlay" data-testid="plan-detail" role="dialog" aria-modal="true" aria-label={PLAN_DETAIL.title} ref={rootRef}>
      <header className="questionnaire-header">
        <button type="button" className="icon-button" aria-label={PLAN_DETAIL.back} onClick={props.onBack}>
          <BackIcon />
        </button>
        <h2 className="flow-title">{attempt.status === 'planned' ? PLANNED_CARD.eyebrow : PLAN_DETAIL.title}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label={PLAN_DETAIL.more}
          aria-expanded={moreOpen}
          data-testid="plan-more"
          onClick={() => setMoreOpen((open) => !open)}
        >
          <MoreIcon />
        </button>
      </header>
      <div className="questionnaire-body flow-body plan-detail-body">
        {active !== null ? (
          <ActivePlanContent
            active={active}
            guidance={bundle}
            outlook={outlook}
            supportFocus={props.supportFocus ?? null}
            clockStart={currentSegmentAnchor(attempt.segments)}
          />
        ) : planned !== null ? (
          <PlannedPlanContent planned={planned} outlook={outlook} />
        ) : null}
        <PreparationCard value={attempt.preparation} onSave={(next) => props.onUpdatePreparation(attempt.id, next)} />
        <PostBreakCard
          attempt={attempt}
          onUpdate={(mode, plan) => props.onUpdatePostBreak(attempt.id, mode, plan)}
        />
        <Cb1Note />
        <button type="button" className="cta-secondary" data-testid="open-detox-evidence" onClick={() => setShowDetox(true)}>
          {GUIDANCE_CHROME.openDetox}
        </button>
        <details className="card plan-overflow" data-testid="plan-overflow" open={moreOpen} onToggle={(event) => setMoreOpen((event.target as HTMLDetailsElement).open)}>
          <summary className="overflow-summary">
            <span className="card-title">{PLAN_DETAIL.more}</span>
          </summary>
          <div className="overflow-actions">
            {attempt.status === 'planned' ? (
              <button type="button" className="text-back" data-testid="cancel-planned" onClick={() => setConfirm('cancel')}>
                {PLAN_DETAIL.cancelPlanTitle}
              </button>
            ) : null}
            {attempt.status === 'active' ? (
              <button type="button" className="text-back" data-testid="end-early" onClick={() => setConfirm('end-early')}>
                {PLAN_DETAIL.endEarly}
              </button>
            ) : null}
            <button type="button" className="text-back" data-testid="recalculate-profile" onClick={props.onRecalculate}>
              {PLAN_DETAIL.recalculate}
            </button>
          </div>
        </details>
      </div>
      <footer className="questionnaire-footer">
        {attempt.status === 'active' && active?.atOrPastTargetDate === true ? (
          <button type="button" className="cta-primary" data-testid="mark-complete" onClick={() => props.onMarkComplete(attempt.id)}>
            {PLAN_DETAIL.markComplete}
          </button>
        ) : null}
      </footer>
      {confirm === 'end-early' ? (
        <ConfirmDialog
          title={PLAN_DETAIL.endEarlyConfirmTitle}
          body={PLAN_DETAIL.endEarlyConfirmBody}
          confirmLabel={PLAN_DETAIL.confirm}
          onConfirm={() => {
            props.onEndEarly(attempt.id);
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      ) : null}
      {confirm === 'cancel' ? (
        <ConfirmDialog
          title={PLAN_DETAIL.cancelPlanTitle}
          body={PLAN_DETAIL.cancelPlanBody}
          confirmLabel={PLAN_DETAIL.confirm}
          onConfirm={() => {
            props.onCancelPlanned(attempt.id);
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      ) : null}
      {showDetox ? <DetoxEvidencePanel onClose={() => setShowDetox(false)} /> : null}
    </div>
  );
}

function ActivePlanContent({
  active,
  guidance,
  outlook,
  supportFocus,
  clockStart,
}: {
  readonly active: ActiveBreakView;
  readonly guidance: ReturnType<typeof presentBreakGuidance>;
  readonly outlook: BreakOutlookView;
  readonly supportFocus: SupportFocus | null;
  readonly clockStart: Instant | null;
}) {
  const stateNote = active.pastTarget
    ? PLAN_STATE_NOTES.extended(active.day, active.targetDays)
    : active.atOrPastTargetDate
      ? PLAN_STATE_NOTES.reached(active.targetDays)
      : null;
  return (
    <section className="plan-hero" data-testid="active-plan-content">
      <PlanRing day={active.day} targetDays={active.targetDays} />
      <dl className="plan-facts">
        <div className="plan-fact">
          <dt className="meta">{PLAN_DETAIL.targetDateLabel}</dt>
          <dd data-testid="target-date">{formatLocalDay(active.targetDate)}</dd>
        </div>
        {clockStart !== null ? (
          <div className="plan-fact">
            <dt className="meta">{PLAN_DETAIL.clockStartLabel}</dt>
            <dd data-testid="clock-start">{formatLocalDay(clockStart)}</dd>
          </div>
        ) : null}
      </dl>
      {stateNote !== null ? (
        <p className={active.pastTarget ? 'today-state-note is-extended' : 'today-state-note is-reached'} data-testid="plan-detail-target-note" data-state={active.pastTarget ? 'extended' : 'reached'}>
          {stateNote}
        </p>
      ) : null}
      <section className="plan-focus-card" data-testid="plan-focus-card">
        <p className="micro-label">Your focus · {supportFocusCopy(supportFocus).shortLabel}</p>
        <p className="body">{supportFocusCopy(supportFocus).planLead}</p>
      </section>
      <TodayGuidance view={guidance.today} supportFocus={supportFocus} />
      <BreakOutlook view={outlook} />
    </section>
  );
}

function PlannedPlanContent({
  planned,
  outlook,
}: {
  readonly planned: PlannedBreakView;
  readonly outlook: BreakOutlookView;
}) {
  return (
    <section className="plan-hero" data-testid="planned-plan-content">
      <p className="eyebrow">{PLANNED_CARD.eyebrow}</p>
      <h3 className="title" data-testid="planned-start">
        {`${PLANNED_CARD.startsLabel} ${formatLocalDay(planned.startDate)}`}
      </h3>
      <p className="meta" data-testid="planned-target">
        {planned.targetDate === null
          ? `Plan for ${planned.targetDays} days`
          : `Plan for ${planned.targetDays} days — target date ${formatLocalDay(planned.targetDate)}`}
      </p>
      <p className="meta">This break has not started yet. It will begin on the start date.</p>
      <BreakOutlook view={outlook} />
    </section>
  );
}

function emptyProfile(): UseProfileInput {
  return {
    goal: 'tolerance_reset',
    breakRequested: true,
    postBreakMode: null,
    thcUseDaysLast30: { value: null, provenance: 'missing' },
    sessionsPerUseDay: { value: null, provenance: 'missing' },
    products: [],
    routes: [],
    lastUseAt: { value: null, provenance: 'missing' },
    currentPatternDuration: { value: null, provenance: 'missing' },
    previousBreaks: [],
  };
}

function PostBreakCard({
  attempt,
  onUpdate,
}: {
  readonly attempt: StoredAttempt;
  readonly onUpdate: (mode: PostBreakMode, plan: PostBreakPlan) => void;
}) {
  const mode = attempt.postBreakMode;
  const [draft, setDraft] = useState<PostBreakPlan>(() => attempt.postBreakPlan ?? defaultPostBreakPlan(mode ?? 'undecided'));
  const [savedMode, setSavedMode] = useState<PostBreakMode>(mode ?? draft.mode);
  const dirty = savedMode !== draft.mode || JSON.stringify(attempt.postBreakPlan) !== JSON.stringify(draft);

  function persist(next: PostBreakPlan) {
    setDraft(next);
    onUpdate(next.mode, next);
    setSavedMode(next.mode);
  }

  function changeMode(nextMode: PostBreakMode) {
    persist(defaultPostBreakPlan(nextMode));
  }

  const returnMode = draft.mode !== 'continue_abstinence';

  return (
    <section className="card plan-post-break" data-testid="post-break-card">
      <h3 className="card-title">{PLAN_DETAIL.postBreakHeading}</h3>
      <div className="choice-list">
        {POST_BREAK_MODE_COPY.map((option) => (
          <button
            key={option.id}
            type="button"
            className={draft.mode === option.id ? 'choice-card selected compact' : 'choice-card compact'}
            data-mode={option.id}
            onClick={() => changeMode(option.id)}
          >
            <span className="choice-copy">
              <span className="choice-title">{option.title}</span>
              {option.helper ? <span className="meta">{option.helper}</span> : null}
            </span>
          </button>
        ))}
      </div>
      {returnMode ? (
        <div className="post-break-guidance" data-testid="post-break-guidance">
          <p className="body">{POST_BREAK_MESSAGES.lowerTolerance}</p>
          <p className="body">{POST_BREAK_MESSAGES.notASafeRestartAmount}</p>
          <p className="body">{POST_BREAK_MESSAGES.previousIsNotRestart}</p>
        </div>
      ) : (
        <p className="meta" data-testid="abstinence-post-break">
          {presentPostBreakGuidance({ mode: 'continue_abstinence' }).lead}
        </p>
      )}
      {draft.mode === 'occasional' ? (
        <StepperField
          label={POST_BREAK_SETTINGS.maxDaysWeek}
          value={draft.maxUseDaysPerWeek}
          min={MIN_USE_DAYS_PER_WEEK}
          max={MAX_USE_DAYS_PER_WEEK}
          onChange={(value) => persist({ mode: 'occasional', maxUseDaysPerWeek: value })}
        />
      ) : null}
      {draft.mode === 'reduced_regular_use' ? (
        <div className="reduced-settings">
          <StepperField
            label={POST_BREAK_SETTINGS.maxDaysWeek}
            value={draft.maxUseDaysPerWeek}
            min={MIN_USE_DAYS_PER_WEEK}
            max={MAX_USE_DAYS_PER_WEEK}
            onChange={(value) => persist({ ...draft, mode: 'reduced_regular_use', maxUseDaysPerWeek: value })}
          />
          <StepperField
            label={POST_BREAK_SETTINGS.maxSessions}
            value={draft.maxSessionsPerUseDay}
            min={MIN_SESSIONS_PER_USE_DAY}
            max={MAX_SESSIONS_PER_USE_DAY}
            onChange={(value) => persist({ ...draft, mode: 'reduced_regular_use', maxSessionsPerUseDay: value })}
          />
          <ChipGroup
            label={POST_BREAK_SETTINGS.potencyStrategy}
            options={POTENCY_STRATEGY_OPTIONS.map((option) => ({ id: option.id, title: option.title }))}
            value={draft.potencyStrategy}
            onChange={(value) => persist({ ...draft, mode: 'reduced_regular_use', potencyStrategy: value as PotencyStrategy })}
          />
          <ChipGroup
            label={POST_BREAK_SETTINGS.quantityStrategy}
            options={QUANTITY_STRATEGY_OPTIONS.map((option) => ({ id: option.id, title: option.title }))}
            value={draft.quantityStrategy}
            onChange={(value) => persist({ ...draft, mode: 'reduced_regular_use', quantityStrategy: value as QuantityStrategy })}
          />
        </div>
      ) : null}
      {draft.mode === 'undecided' ? (
        <p className="meta" data-testid="undecided-note">
          You can decide your return plan later.
        </p>
      ) : null}
      {returnMode ? (
        <ul className="guidance-chips" data-testid="return-principles">
          {presentPostBreakGuidance(draft).principles.map((line) => (
            <li key={line} className="chip">
              {line}
            </li>
          ))}
        </ul>
      ) : null}
      <button
        type="button"
        className="cta-secondary"
        disabled={!dirty}
        data-testid="save-post-break"
        onClick={() => {
          onUpdate(draft.mode, draft);
          setSavedMode(draft.mode);
        }}
      >
        Save changes
      </button>
    </section>
  );
}

function StepperField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly onChange: (value: number) => void;
}) {
  const labelId = `stepper-label-${slug(label)}`;
  return (
    <div className="stepper-field meta">
      <span id={labelId}>{label}</span>
      <span className="stepper">
        <button type="button" className="stepper-button" aria-label={`Decrease ${label}`} onClick={() => onChange(Math.max(min, value - 1))}>
          −
        </button>
        <output className="stepper-value" data-testid={`stepper-${slug(label)}`} aria-labelledby={labelId}>
          {value}
        </output>
        <button type="button" className="stepper-button" aria-label={`Increase ${label}`} onClick={() => onChange(Math.min(max, value + 1))}>
          +
        </button>
      </span>
    </div>
  );
}

function ChipGroup({
  label,
  options,
  value,
  onChange,
}: {
  readonly label: string;
  readonly options: ReadonlyArray<{ id: string; title: string }>;
  readonly value: string;
  readonly onChange: (value: string) => void;
}) {
  return (
    <fieldset className="chip-group">
      <legend className="meta">{label}</legend>
      <div className="chip-row">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={value === option.id ? 'chip selected' : 'chip'}
            data-testid={`${slug(label)}-${option.id}`}
            onClick={() => onChange(option.id)}
          >
            {option.title}
          </button>
        ))}
      </div>
    </fieldset>
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
  return (
    <div className="modal-root" data-testid="confirm-dialog">
      <div className="modal-backdrop" onClick={onCancel} />
      <div className="modal-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-handle" aria-hidden="true" />
        <header className="modal-header">
          <h2 className="card-title">{title}</h2>
          <button type="button" className="icon-button" aria-label="Close" onClick={onCancel}>
            <CloseIcon />
          </button>
        </header>
        <p className="body">{body}</p>
        <button type="button" className="cta-primary" data-testid="confirm-action" onClick={onConfirm}>
          {confirmLabel}
        </button>
        <button type="button" className="cta-secondary" onClick={onCancel}>
          {PLAN_DETAIL.cancel}
        </button>
      </div>
    </div>
  );
}

function slug(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function Cb1Note() {
  const cb1 = presentCb1Education();
  return (
    <details className="card guidance-why" data-testid="cb1-note">
      <summary className="card-title">{cb1.title}</summary>
      {cb1.paragraphs.map((paragraph) => (
        <p key={paragraph} className="body">
          {paragraph}
        </p>
      ))}
    </details>
  );
}
