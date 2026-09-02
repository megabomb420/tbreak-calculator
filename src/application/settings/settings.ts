// Settings model (UX_SPEC 3.1 gear modal, 3.3 install, 13.3 deletion).
//
// The gear opens a modal screen with a fixed set of entries. Rendering and
// copy live in the UI layer; this module owns the entry ids and the
// delete-everything effect: wiping all local key-value data returns the app
// to the empty first-launch state. Future IndexedDB record stores will be
// cleared by the same action when the persistence slice lands.

import type { StorageAdapter } from '../../infrastructure/storage/storage-adapter.ts';

export const SETTINGS_MENU = ['install-help', 'offline-note', 'delete-everything'] as const;
export type SettingsMenuId = (typeof SETTINGS_MENU)[number];

/** Wipes all local data stored through the key-value adapter. After this the
 * questionnaire-progress store reports no draft and the `Today` router
 * resolves to first-launch. */
export function deleteAllLocalData(adapter: StorageAdapter): void {
  adapter.clear();
}
