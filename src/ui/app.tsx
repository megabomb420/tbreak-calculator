import { useMemo, useReducer, useState } from 'preact/hooks';
import {
  createQuestionnaireProgressStore,
  type QuestionnaireProgressStore,
} from '../application/progress/questionnaire-progress.ts';
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
import type { StorageAdapter } from '../infrastructure/storage/storage-adapter.ts';
import { HistoryScreen } from './history-screen.tsx';
import { SettingsModal } from './settings-modal.tsx';
import { Shell } from './shell.tsx';
import { TodayScreen } from './today-screen.tsx';

export type ExtraTodayFacts = Partial<Omit<TodayFacts, 'draft'>>;

export interface AppProps {
  readonly storage: StorageAdapter;
  /** Facts the future persistence layer will supply. Draft is always read from storage. */
  readonly extraFacts?: ExtraTodayFacts;
}

export function App({ storage, extraFacts }: AppProps) {
  const [shell, dispatch] = useReducer(shellReducer, INITIAL_SHELL_STATE);
  const progress = useMemo(() => createQuestionnaireProgressStore(storage), [storage]);
  const [factsEpoch, setFactsEpoch] = useState(0);

  const facts = useMemo(
    () => loadTodayFacts(progress, extraFacts),
    [progress, extraFacts, factsEpoch],
  );
  const view = resolveTodayState(facts);

  function refresh() {
    setFactsEpoch((value) => value + 1);
  }

  return (
    <>
      <Shell
        shell={shell}
        onSelectTab={(tab: AppTab) => dispatch({ type: 'select_tab', tab })}
        onOpenSettings={() => dispatch({ type: 'open_settings' })}
      >
        {shell.activeTab === 'today' ? (
          <TodayScreen view={view} draft={facts.draft} onStartOver={() => startOver(progress, refresh)} />
        ) : (
          <HistoryScreen />
        )}
      </Shell>
      <SettingsModal
        open={shell.settingsOpen}
        onClose={() => dispatch({ type: 'close_settings' })}
        onDeleteEverything={() => {
          deleteAllLocalData(storage);
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

function startOver(progress: QuestionnaireProgressStore, refresh: () => void): void {
  progress.clear();
  refresh();
}
