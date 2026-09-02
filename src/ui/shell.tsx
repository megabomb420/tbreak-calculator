import type { ComponentChildren } from 'preact';
import type { AppTab, ShellState } from '../application/shell/shell-controller.ts';
import { OPEN_SETTINGS } from './copy.ts';
import { GearIcon, HistoryIcon, TodayIcon } from './icons.tsx';

export interface ShellProps {
  readonly shell: ShellState;
  readonly onSelectTab: (tab: AppTab) => void;
  readonly onOpenSettings: () => void;
  readonly children: ComponentChildren;
}

const TABS: ReadonlyArray<{ id: AppTab; label: string; icon: typeof TodayIcon }> = [
  { id: 'today', label: 'Today', icon: TodayIcon },
  { id: 'history', label: 'History', icon: HistoryIcon },
];

export function Shell({ shell, onSelectTab, onOpenSettings, children }: ShellProps) {
  const title = shell.activeTab === 'today' ? 'Today' : 'History';
  return (
    <div className="app-shell" data-testid="app-shell" data-active-tab={shell.activeTab}>
      <header className="app-header">
        <h1 className="screen-title">{title}</h1>
        <button
          type="button"
          className="icon-button"
          aria-label={OPEN_SETTINGS}
          aria-haspopup="dialog"
          aria-expanded={shell.settingsOpen}
          data-testid="open-settings"
          onClick={onOpenSettings}
        >
          <GearIcon />
        </button>
      </header>
      <main className="app-main">{children}</main>
      <nav className="tab-bar" aria-label="Primary">
        {TABS.map((tab) => {
          const selected = shell.activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              className={selected ? 'tab-button selected' : 'tab-button'}
              aria-current={selected ? 'page' : undefined}
              data-tab={tab.id}
              onClick={() => onSelectTab(tab.id)}
            >
              <Icon size={20} />
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
