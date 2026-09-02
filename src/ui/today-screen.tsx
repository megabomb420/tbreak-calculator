import type { TodayPrimaryState, TodayView } from '../application/shell/today-state.ts';
import type { QuestionnaireProgressRecord } from '../application/progress/questionnaire-progress.ts';
import {
  DEFERRED_TODAY_SHELL,
  FIRST_LAUNCH,
  GOAL_CHIPS,
  NO_PROFILE,
  RESUME,
  resumeTitle,
} from './copy.ts';

export interface TodayScreenProps {
  readonly view: TodayView;
  readonly draft: QuestionnaireProgressRecord | null;
  readonly onStartOver: () => void;
}

export function TodayScreen({ view, draft, onStartOver }: TodayScreenProps) {
  const resume =
    view.resume !== 'none' && draft !== null ? (
      <ResumeCard answeredSteps={draft.answeredSteps} placement={view.resume} onStartOver={onStartOver} />
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
          <PrimaryStateShell state={view.primary} />
          {view.resume === 'secondary' ? resume : null}
        </>
      )}
    </section>
  );
}

function PrimaryStateShell({ state }: { readonly state: TodayPrimaryState }) {
  switch (state) {
    case 'first-launch':
      return <FirstLaunch />;
    case 'no-profile':
      return <NoProfile />;
    default:
      return <DeferredStateShell state={state} />;
  }
}

function FirstLaunch() {
  return (
    <div className="stack" data-testid="state-first-launch">
      <h2 className="title">{FIRST_LAUNCH.title}</h2>
      <p className="body">{FIRST_LAUNCH.promise}</p>
      <ul className="reassurance-list">
        {FIRST_LAUNCH.reassurances.map((item) => (
          <li key={item.id} className="reassurance-item">
            <span className="reassurance-mark" aria-hidden="true" />
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
      <aside className="safety-slot" data-slot="safety_first_launch" aria-label="Safety information">
        <p className="meta">{FIRST_LAUNCH.safetyPending}</p>
      </aside>
      <button type="button" className="cta-primary">
        {FIRST_LAUNCH.cta}
      </button>
    </div>
  );
}

function NoProfile() {
  return (
    <div className="stack" data-testid="state-no-profile">
      <h2 className="title">{NO_PROFILE.title}</h2>
      <div className="choice-list">
        {GOAL_CHIPS.map((goal) => (
          <button key={goal.id} type="button" className="choice-card" data-goal={goal.id}>
            <span className="choice-title">{goal.title}</span>
            <span className="meta">{goal.helper}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function DeferredStateShell({
  state,
}: {
  readonly state: Exclude<TodayPrimaryState, 'first-launch' | 'no-profile'>;
}) {
  const copy = DEFERRED_TODAY_SHELL[state];
  return (
    <article className="card" data-testid={`state-${state}`}>
      <p className="micro-label">Today</p>
      <h2 className="card-title">{copy.title}</h2>
      <p className="body">{copy.body}</p>
      {copy.cta ? (
        <button type="button" className="cta-primary">
          {copy.cta}
        </button>
      ) : null}
    </article>
  );
}

function ResumeCard({
  answeredSteps,
  placement,
  onStartOver,
}: {
  readonly answeredSteps: number;
  readonly placement: 'secondary' | 'replaces-primary';
  readonly onStartOver: () => void;
}) {
  return (
    <article className="card" data-testid="resume-card" data-resume-placement={placement}>
      <p className="micro-label">Unfinished</p>
      <h2 className="card-title">{resumeTitle(answeredSteps)}</h2>
      <div className="cta-row">
        <button type="button" className="cta-primary">
          {RESUME.resume}
        </button>
        <button type="button" className="cta-secondary" onClick={onStartOver}>
          {RESUME.startOver}
        </button>
      </div>
    </article>
  );
}
