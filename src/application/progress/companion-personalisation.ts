import type { StorageAdapter } from '../../infrastructure/storage/storage-adapter.ts';
import {
  decodeCompanionPersonalisation,
  emptyCompanionPersonalisation,
  migrateCompanionPersonalisation,
  withConfirmedBreak,
  withPick,
  withSupportAreas,
  type CompanionPersonalisation,
  type CompanionPersonalisationPick,
  type CompanionPersonalisationV1,
  type SupportArea,
} from '../questionnaire/companion.ts';

/** The key keeps the name it had while the record was device-wide; the
 * envelope's schemaVersion, not the key, decides the shape. */
export const COMPANION_PERSONALISATION_KEY = 'tbreak.companion-personalisation.v2';

export interface CompanionPersonalisationStore {
  readonly loadOrMigrate: (legacy?: CompanionPersonalisationV1 | null) => CompanionPersonalisation;
  /** Saves the topics for the break in hand; null means the break that starts next. */
  readonly saveAreas: (
    areas: readonly SupportArea[],
    breakInHand?: { readonly id: string; readonly day: number } | null,
  ) => CompanionPersonalisation;
  /** Marks the stored topics as the ones confirmed for the break that starts. */
  readonly confirmFor: (breakId: string, day: number) => CompanionPersonalisation;
  /** Remembers, or clears, the topic picked by hand for one break day. */
  readonly savePick: (pick: CompanionPersonalisationPick | null) => CompanionPersonalisation;
  /** Restores a whole record from a backup file, binding included. */
  readonly saveRecord: (record: CompanionPersonalisation) => CompanionPersonalisation;
  readonly clear: () => void;
}

export function createCompanionPersonalisationStore(
  adapter: StorageAdapter,
  key: string = COMPANION_PERSONALISATION_KEY,
): CompanionPersonalisationStore {
  function write(record: CompanionPersonalisation): CompanionPersonalisation {
    adapter.setItem(key, JSON.stringify(record));
    return record;
  }
  function read(legacy: CompanionPersonalisationV1 | null): CompanionPersonalisation {
    const raw = adapter.getItem(key);
    if (raw !== null) {
      try {
        const decoded = decodeCompanionPersonalisation(JSON.parse(raw));
        // A row that no longer holds together is replaced by a valid empty or
        // migrated record rather than left in place to fail again.
        if (decoded !== null) return decoded;
      } catch {
        // fall through to the migration
      }
    }
    return migrateCompanionPersonalisation(legacy);
  }
  return {
    loadOrMigrate(legacy = null) {
      return write(read(legacy));
    },
    saveAreas(areas, breakInHand = null) {
      return write(withSupportAreas(read(null), areas, breakInHand));
    },
    confirmFor(breakId, day) {
      return write(withConfirmedBreak(read(null), breakId, day));
    },
    savePick(pick) {
      return write(withPick(read(null), pick));
    },
    saveRecord(record) {
      return write(record);
    },
    clear() {
      adapter.removeItem(key);
    },
  };
}

/** Nothing chosen and nothing bound to a break: the state a fresh device is in. */
export const EMPTY_COMPANION_PERSONALISATION: CompanionPersonalisation = emptyCompanionPersonalisation();
