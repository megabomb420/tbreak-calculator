import { useMemo, useReducer, useState } from 'preact/hooks';
import {
  createQuestionnaireProgressStore,
  QUESTIONNAIRE_PROGRESS_SCHEMA_VERSION,
  type QuestionnaireProgressStore,
} from '../application/progress/questionnaire-progress.ts';
import {
  createQuestionnaireSnapshotStore,
  QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION,
} from '../application/progress/questionnaire-snapshot.ts';
import { deleteAllLocalData } from '../application/settings/settings.ts';
import {
  INITIAL_SHELL_STATE,
  shellReducer,
  type AppTab,
} from '../application/shell/shell-controller.ts';
import {
  emptyTodayFacts,
  resolveTodayState,
  type TodayFacts,
} from '../application/shell/today-state.ts';
import {
  applyAnswer,
  countAnsweredSteps,
  lastUseNeedsReselect,
  nextDestination,
  previousStep,
  restoreStep,
  startSession,
  type QuestionnaireSession,
  type StepAnswer,
} from '../application/questionnaire/engine.ts';
import { finishQuestionnaire } from '../application/questionnaire/snapshot.ts';
import type { Goal } from '../domain/schemas/enums.ts';
import { systemClock, type Clock } from '../infrastructure/clock.ts';
import type { StorageAdapter } from '../infrastructure/storage/storage-adapter.ts';
import { HistoryScreen } from './history-screen.tsx';
import { QuestionnaireFlow } from './questionnaire-flow.tsx';
import { SettingsModal } from './settings-modal.tsx';
import { Shell } from './shell.tsx';
import { TodayScreen } from './today-screen.tsx';

export type ExtraTodayFacts = Partial<Omit<TodayFacts, 'draft'>>;

export interface AppProps {
  readonly storage: StorageAdapter;
  /** Facts the future persistence layer will supply. Draft is always read from storage. */
  readonly extraFacts?: ExtraTodayFacts;
  readonly clock?: Clock;
}

export function App({ storage, extraFacts, clock = systemClock }: AppProps) {
  const [shell, dispatch] = useReducer(shellReducer, INITIAL_SHELL_STATE);
  const progress = useMemo(() => createQuestionnaireProgressStore(storage), [storage]);
  const snapshots = useMemo(() => createQuestionnaireSnapshotStore(storage), [storage]);
  const [factsEpoch, setFactsEpoch] = useState(0);
  const [session, setSession] = useState<QuestionnaireSession | null>(null);
  const [lastUseWarning, setLastUseWarning] = useState(false);

  const facts = useMemo(
    () => loadTodayFacts(progress, extraFacts),
    [progress, extraFacts, factsEpoch],
  );
  const view = resolveTodayState(facts);

  function refresh() {
    setFactsEpoch((value) => value + 1);
  }

  function persist(next: QuestionnaireSession): void {
    const now = clock.now();
    const answered = countAnsweredSteps(next.answers, now);
    if (answered < 1) {
      progress.clear();
      return;
    }
    progress.save({
      schemaVersion: QUESTIONNAIRE_PROGRESS_SCHEMA_VERSION,
      answeredSteps: answered,
      updatedAt: now,
      currentStep: next.currentStep,
      answers: next.answers,
    });
  }

  function openStart() {
    setLastUseWarning(false);
    setSession(startSession());
  }

  function openGoal(goal: Goal) {
    const next = startSession(goal);
    persist(next);
    setLastUseWarning(false);
    setSession(next);
    refresh();
  }

  function openResume() {
    const draft = progress.load();
    if (draft === null) return;
    const now = clock.now();
    const currentStep = restoreStep(draft.answers, now, draft.currentStep);
    setLastUseWarning(lastUseNeedsReselect(draft.answers, now));
    setSession({ currentStep, answers: draft.answers });
  }

  function closeSession() {
    if (session !== null) persist(session);
    setSession(null);
    setLastUseWarning(false);
    refresh();
  }

  function startOver() {
    progress.clear();
    setSession(null);
    setLastUseWarning(false);
    refresh();
  }

  function goBack() {
    if (session === null) return;
    const prev = previousStep(session.currentStep, session.answers);
    if (prev === null) return;
    const next = { currentStep: prev, answers: session.answers };
    persist(next);
    setSession(next);
  }

  function submitAnswer(answer: StepAnswer) {
    if (session === null) return;
    const now = clock.now();
    const answers = applyAnswer(session.answers, answer, now);
    const warning = lastUseNeedsReselect(answers, now);
    setLastUseWarning(warning);
    const dest = nextDestination(answer.step, answers, now);
    if (dest === 'TERMINAL') {
      const finished = finishQuestionnaire(answers, now);
      if (finished.status === 'complete') {
        progress.clear();
        snapshots.save({
          schemaVersion: QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION,
          snapshot: finished.snapshot,
          updatedAt: now,
        });
        setSession(null);
        setLastUseWarning(false);
        refresh();
        return;
      }
      const resumeAt = finished.status === 'incomplete' ? finished.currentStep : finished.currentStep;
      const next = { currentStep: resumeAt, answers };
      persist(next);
      setSession(next);
      setLastUseWarning(lastUseNeedsReselect(answers, now));
      refresh();
      return;
    }
    const next = { currentStep: dest, answers };
    persist(next);
    setSession(next);
    refresh();
  }

  function skipOptionalLastUse() {
    submitAnswer({ step: 'Q3-opt', value: { skip: true } });
  }

  return (
    <>
      <Shell
        shell={shell}
        onSelectTab={(tab: AppTab) => dispatch({ type: 'select_tab', tab })}
        onOpenSettings={() => dispatch({ type: 'open_settings' })}
      >
        {shell.activeTab === 'today' ? (
          <TodayScreen
            view={view}
            draft={facts.draft}
            onStartOver={startOver}
            onGetStarted={openStart}
            onSelectGoal={openGoal}
            onResume={openResume}
          />
        ) : (
          <HistoryScreen />
        )}
      </Shell>
      {session !== null ? (
        <QuestionnaireFlow
          session={session}
          now={clock.now()}
          lastUseWarning={lastUseWarning}
          onSession={(next) => {
            setSession(next);
            persist(next);
          }}
          onAnswerAndAdvance={submitAnswer}
          onClose={closeSession}
          onBack={goBack}
          onContinue={submitAnswer}
          onSkip={skipOptionalLastUse}
        />
      ) : null}
      <SettingsModal
        open={shell.settingsOpen}
        onClose={() => dispatch({ type: 'close_settings' })}
        onDeleteEverything={() => {
          deleteAllLocalData(storage);
          setSession(null);
          refresh();
          dispatch({ type: 'close_settings' });
        }}
      />
    </>
  );
}

function loadTodayFacts(
  progress: QuestionnaireProgressStore,
  extraFacts: ExtraTodayFacts | undefined,
): TodayFacts {
  return {
    ...emptyTodayFacts(),
    ...extraFacts,
    draft: progress.load(),
  };
}
