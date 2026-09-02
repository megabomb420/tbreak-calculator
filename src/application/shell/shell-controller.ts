// Shell controller: the two-tab model and the gear/settings modal
// (UX_SPEC 3.1). Pure state transitions a UI layer binds to; no rendering,
// no storage access here.

export type AppTab = 'today' | 'history';

export interface ShellState {
  readonly activeTab: AppTab;
  readonly settingsOpen: boolean;
}

export type ShellAction =
  | { readonly type: 'select_tab'; readonly tab: AppTab }
  | { readonly type: 'open_settings' }
  | { readonly type: 'close_settings' };

export const INITIAL_SHELL_STATE: ShellState = { activeTab: 'today', settingsOpen: false };

export function shellReducer(state: ShellState = INITIAL_SHELL_STATE, action: ShellAction): ShellState {
  switch (action.type) {
    case 'select_tab':
      return { ...state, activeTab: action.tab };
    case 'open_settings':
      return { ...state, settingsOpen: true };
    case 'close_settings':
      return { ...state, settingsOpen: false };
  }
}
