// Settings model (UX_SPEC 3.1 gear modal, 3.3 install, 13.3 deletion).
//
// The gear opens a modal screen with a fixed set of entries. Rendering and
// copy live in the UI layer; this module owns the entry ids and the
// delete-everything effect.

import type { StorageAdapter } from '../../infrastructure/storage/storage-adapter.ts';
import {
  deleteAllLocalData as wipeDurable,
  LOCAL_DATA_KEYS,
  type DurablePersistence,
} from '../persistence/durable.ts';

export const APP_VERSION = '0.14.2';

/**
 * PWA update freshness for Settings. `current` is only ever produced by a
 * completed service-worker update check that found nothing newer;
 * `offline`/`unavailable` never claim the app is current.
 */
export type PwaUpdateStatus = 'checking' | 'current' | 'available' | 'offline' | 'unavailable';

export const SETTINGS_MENU = ['install-help', 'offline-note', 'app-info', 'delete-everything'] as const;
export type SettingsMenuId = (typeof SETTINGS_MENU)[number];

export { LOCAL_DATA_KEYS };

/** Wipes all T-Break-owned local data (Web Storage envelopes + IndexedDB).
 * Never calls storage.clear() so a shared origin is not wiped wholesale. */
export function deleteAllLocalData(adapter: StorageAdapter, durable?: DurablePersistence): void {
  wipeDurable(adapter, durable);
}
