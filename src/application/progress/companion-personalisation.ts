import type { StorageAdapter } from '../../infrastructure/storage/storage-adapter.ts';
import {
  COMPANION_PERSONALISATION_VERSION,
  migrateCompanionPersonalisation,
  migrateSupportAreas,
  type CompanionPersonalisationV1,
  type CompanionPersonalisationV2,
  type SupportArea,
} from '../questionnaire/companion.ts';

export const COMPANION_PERSONALISATION_KEY = 'tbreak.companion-personalisation.v2';

export interface CompanionPersonalisationStore {
  readonly loadOrMigrate: (legacy?: CompanionPersonalisationV1 | null) => CompanionPersonalisationV2;
  readonly saveAreas: (areas: readonly SupportArea[]) => CompanionPersonalisationV2;
  readonly clear: () => void;
}

export function createCompanionPersonalisationStore(
  adapter: StorageAdapter,
  key: string = COMPANION_PERSONALISATION_KEY,
): CompanionPersonalisationStore {
  return {
    loadOrMigrate(legacy = null) {
      const raw = adapter.getItem(key);
      if (raw !== null) {
        try {
          const parsed: unknown = JSON.parse(raw);
          if (
            typeof parsed === 'object' &&
            parsed !== null &&
            (parsed as Record<string, unknown>).schemaVersion === COMPANION_PERSONALISATION_VERSION &&
            Array.isArray((parsed as Record<string, unknown>).supportAreas)
          ) {
            const migrated: CompanionPersonalisationV2 = {
              schemaVersion: COMPANION_PERSONALISATION_VERSION,
              supportAreas: migrateSupportAreas((parsed as Record<string, unknown>).supportAreas as unknown[]),
            };
            adapter.setItem(key, JSON.stringify(migrated));
            return migrated;
          }
        } catch {
          // Replace corrupt preference data with a valid empty/migrated record.
        }
      }
      const migrated = migrateCompanionPersonalisation(legacy);
      adapter.setItem(key, JSON.stringify(migrated));
      return migrated;
    },
    saveAreas(areas) {
      const next: CompanionPersonalisationV2 = {
        schemaVersion: COMPANION_PERSONALISATION_VERSION,
        supportAreas: migrateSupportAreas([...areas]),
      };
      adapter.setItem(key, JSON.stringify(next));
      return next;
    },
    clear() {
      adapter.removeItem(key);
    },
  };
}
