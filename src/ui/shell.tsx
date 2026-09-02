import type { ComponentChildren } from 'preact';
import type { AppTab, ShellState } from '../application/shell/shell-controller.ts';
import { OPEN_SETTINGS } from './copy.ts';

export interface ShellProps {
  readonly shell: ShellState;
  readonly onSelectTab: (tab: AppTab) => void;
  readonly onOpenSettings: () => void;
  readonly children: ComponentChildren;
}

const TABS: ReadonlyArray<{ id: AppTab; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: 'history', label: 'History' },
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
          return (
            <button
              key={tab.id}
              type="button"
              className={selected ? 'tab-button selected' : 'tab-button'}
              aria-current={selected ? 'page' : undefined}
              data-tab={tab.id}
              onClick={() => onSelectTab(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function GearIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <path
        d="M9.1 2.4h3.8l.5 2.1a6.6 6.6 0 0 1 1.7.9l2-.9 1.9 3.3-1.6 1.5c.1.4.2.9.2 1.4s-.1 1-.2 1.4l1.6 1.5-1.9 3.3-2-.9a6.6 6.6 0 0 1-1.7.9l-.5 2.1H9.1l-.5-2.1a6.6 6.6 0 0 1-1.7-.9l-2 .9-1.9-3.3 1.6-1.5A6.2 6.2 0 0 1 4.4 11c0-.5.1-1 .2-1.4L3 8.1 4.9 4.8l2 .9a6.6 6.6 0 0 1 1.7-.9l.5-2.4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="11" cy="11" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
