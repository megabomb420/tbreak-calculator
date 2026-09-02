// Settings model (UX_SPEC 3.1 gear modal, 3.3 install, 13.3 deletion).
//
// The gear opens a modal screen with a fixed set of entries. Rendering and
// copy live in the UI layer; this module owns the entry ids and the
// delete-everything effect: wiping all local key-value data returns the app
// to the empty first-launch state. Future IndexedDB record stores will be
// cleared by the same action when the persistence slice lands.

import type { StorageAdapter } from '../../infrastructure/storage/storage-adapter.ts';
import { QUESTIONNAIRE_PROGRESS_KEY } from '../progress/questionnaire-progress.ts';
import { QUESTIONNAIRE_SNAPSHOT_KEY } from '../progress/questionnaire-snapshot.ts';
import { RESULT_VIEW_KEY } from '../progress/result-view.ts';
import { BREAK_ATTEMPTS_KEY } from '../progress/break-attempt-record.ts';
import { TRACKING_RECORDS_KEY } from '../progress/tracking-record.ts';
import { CHECKINS_KEY } from '../progress/checkin-store.ts';
import { REDUCTION_PLAN_KEY } from '../progress/reduction-plan.ts';

export const SETTINGS_MENU = ['install-help', 'offline-note', 'delete-everything'] as const;
export type SettingsMenuId = (typeof SETTINGS_MENU)[number];

/** Every versioned envelope this app writes. Delete-everything removes only
 * these keys so a shared origin (GitHub Pages) is not wiped wholesale. */
export const LOCAL_DATA_KEYS = [
  QUESTIONNAIRE_PROGRESS_KEY,
  QUESTIONNAIRE_SNAPSHOT_KEY,
  RESULT_VIEW_KEY,
  BREAK_ATTEMPTS_KEY,
  TRACKING_RECORDS_KEY,
  CHECKINS_KEY,
  REDUCTION_PLAN_KEY,
] as const;

/** Wipes all local data stored through the key-value adapter. After this the
 * questionnaire-progress store reports no draft and the `Today` router
 * resolves to first-launch. */
export function deleteAllLocalData(adapter: StorageAdapter): void {
  for (const key of LOCAL_DATA_KEYS) {
    adapter.removeItem(key);
  }
}
