import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_SHELL_STATE,
  shellReducer,
  type ShellState,
} from '../../src/application/shell/shell-controller.ts';
import { SETTINGS_MENU } from '../../src/application/settings/settings.ts';

describe('shell controller (UX_SPEC 3.1)', () => {
  it('starts on the Today tab with settings closed', () => {
    assert.deepEqual(INITIAL_SHELL_STATE, { activeTab: 'today', settingsOpen: false });
  });

  it('selects either of the two tabs', () => {
    let state: ShellState = shellReducer(INITIAL_SHELL_STATE, { type: 'select_tab', tab: 'history' });
    assert.equal(state.activeTab, 'history');
    state = shellReducer(state, { type: 'select_tab', tab: 'today' });
    assert.equal(state.activeTab, 'today');
  });

  it('opens and closes the settings modal without touching the active tab', () => {
    let state: ShellState = shellReducer(INITIAL_SHELL_STATE, { type: 'select_tab', tab: 'history' });
    state = shellReducer(state, { type: 'open_settings' });
    assert.deepEqual(state, { activeTab: 'history', settingsOpen: true });
    state = shellReducer(state, { type: 'close_settings' });
    assert.deepEqual(state, { activeTab: 'history', settingsOpen: false });
  });

  it('defaults to the initial state when called without a state', () => {
    assert.deepEqual(shellReducer(undefined, { type: 'open_settings' }), {
      activeTab: 'today',
      settingsOpen: true,
    });
  });

  it('exposes exactly the documented settings entries', () => {
    assert.deepEqual(SETTINGS_MENU, ['install-help', 'offline-note', 'delete-everything']);
  });
});
