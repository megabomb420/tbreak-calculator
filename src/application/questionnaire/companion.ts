/**
 * Companion personalisation is deliberately separate from UseProfileInput.
 * It can select and reorder deterministic guidance, but it is never passed to
 * tolerance-v3 or tolerance-recovery-outlook-v2.
 *
 * v3 scopes the topics to one break. `supportAreas` are the areas the person
 * asked the app to help with, `forBreak` names the break they were confirmed
 * for (null while no break is in hand, so they are meant for the break that
 * starts next), `confirmedDay` is the break day they were confirmed on — so
 * the day-to-day turn of topics is anchored to a break day rather than to a
 * list index — and `pick` remembers one hand-picked topic for one break day.
 *
 * v1 (`supportFocus`) and v2 (a device-wide list with no break attached) stay
 * readable. A v2 list is kept but left unconfirmed, so a later break offers it
 * for reuse instead of silently inheriting it.
 */
export const LEGACY_COMPANION_PERSONALISATION_VERSION = 'companion-personalisation-v1' as const;
/** The device-wide list 0.12–1.0.0 wrote. Read and upgraded, never written. */
export const DEVICE_COMPANION_PERSONALISATION_VERSION = 'companion-personalisation-v2' as const;
export const COMPANION_PERSONALISATION_VERSION = 'companion-personalisation-v3' as const;

/**
 * The canonical support-area taxonomy, in the order the app presents it. The
 * order is part of the record: a saved set is stored in this order, so the
 * day-to-day turn of topics never depends on the order the cards were tapped.
 */
export const SUPPORT_AREA_VALUES = [
  'anxiety',
  'irritability',
  'low_mood',
  'sleep',
  'dreams',
  'cravings',
  'routine',
  'boredom',
  'appetite',
  'nausea',
  'headaches',
] as const;

export type SupportArea = (typeof SUPPORT_AREA_VALUES)[number];

/** Area names from the first 0.12 support cut that are mapped forward. */
export const LEGACY_SUPPORT_AREA_VALUES = [
  'sleep',
  'cravings',
  'routine',
  'mood',
  'appetite',
  'anxiety',
  'dreams',
  'physical_discomfort',
  'not_sure',
] as const;

export type LegacySupportArea = (typeof LEGACY_SUPPORT_AREA_VALUES)[number];

export const LEGACY_SUPPORT_FOCUS_VALUES = [
  'sleep',
  'cravings',
  'routine',
  'mood',
  'appetite',
  'not_sure',
] as const;

export type LegacySupportFocus = (typeof LEGACY_SUPPORT_FOCUS_VALUES)[number];

export interface CompanionPersonalisationV1 {
  readonly schemaVersion: typeof LEGACY_COMPANION_PERSONALISATION_VERSION;
  readonly supportFocus: LegacySupportFocus;
}

export interface CompanionPersonalisationV2 {
  readonly schemaVersion: typeof DEVICE_COMPANION_PERSONALISATION_VERSION;
  readonly supportAreas: readonly SupportArea[];
}

/** One hand-picked topic, scoped to a break and the break day it was picked on. */
export interface CompanionPersonalisationPick {
  readonly breakId: string;
  readonly day: number;
  readonly area: SupportArea;
}

export interface CompanionPersonalisationV3 {
  readonly schemaVersion: typeof COMPANION_PERSONALISATION_VERSION;
  readonly supportAreas: readonly SupportArea[];
  /** The break the set was confirmed for; null means it is meant for the one
   * that starts next. */
  readonly forBreak: string | null;
  readonly confirmedDay: number | null;
  /** The topic picked by hand for one break day, independent of the set. */
  readonly pick: CompanionPersonalisationPick | null;
}

/** The record the app writes today. */
export type CompanionPersonalisation = CompanionPersonalisationV3;

/**
 * The topics a live break is being helped with, plus the ones left over from
 * an earlier break. `areas` is empty when nothing has been confirmed for this
 * break, so an inherited list can never steer the day by itself.
 */
export interface BreakFocus {
  readonly areas: readonly SupportArea[];
  /** The break day the set was confirmed on: its first topic leads that day. */
  readonly anchorDay: number;
  /** The stored set when it belongs to an earlier break, offered for reuse. */
  readonly reusable: readonly SupportArea[];
}

export const EMPTY_BREAK_FOCUS: BreakFocus = { areas: [], anchorDay: 1, reusable: [] };

export function isSupportArea(value: unknown): value is SupportArea {
  return typeof value === 'string' && (SUPPORT_AREA_VALUES as readonly string[]).includes(value);
}

export function isLegacySupportArea(value: unknown): value is LegacySupportArea {
  return typeof value === 'string' && (LEGACY_SUPPORT_AREA_VALUES as readonly string[]).includes(value);
}

export function isLegacySupportFocus(value: unknown): value is LegacySupportFocus {
  return typeof value === 'string' && (LEGACY_SUPPORT_FOCUS_VALUES as readonly string[]).includes(value);
}

export function isCompanionPersonalisation(value: unknown): value is CompanionPersonalisationV1 {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    record.schemaVersion === LEGACY_COMPANION_PERSONALISATION_VERSION &&
    isLegacySupportFocus(record.supportFocus)
  );
}

export function isCompanionPersonalisationV2(value: unknown): value is CompanionPersonalisationV2 {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== DEVICE_COMPANION_PERSONALISATION_VERSION || !Array.isArray(record.supportAreas)) return false;
  return record.supportAreas.every(isSupportArea);
}

function isOptionalId(value: unknown): value is string | null {
  return value === null || (typeof value === 'string' && value.length > 0);
}

function isOptionalDay(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isInteger(value) && value >= 1);
}

/** A stored v3 row: every field present and well-formed. Order is normalised
 * on load rather than rejected, so a set written by another build still opens. */
export function isCompanionPersonalisationV3(value: unknown): value is CompanionPersonalisationV3 {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== COMPANION_PERSONALISATION_VERSION || !Array.isArray(record.supportAreas)) return false;
  if (!record.supportAreas.every(isSupportArea)) return false;
  if (!isOptionalId(record.forBreak)) return false;
  if (!isOptionalDay(record.confirmedDay)) return false;
  const pick = record.pick;
  if (pick === null) return true;
  if (typeof pick !== 'object' || Array.isArray(pick)) return false;
  const row = pick as Record<string, unknown>;
  return isOptionalId(row.breakId) && row.breakId !== null && isOptionalDay(row.day) && row.day !== null && isSupportArea(row.area);
}

const LEGACY_AREA_MIGRATION: Record<LegacySupportArea, readonly SupportArea[]> = {
  sleep: ['sleep'],
  cravings: ['cravings'],
  routine: ['routine'],
  mood: ['irritability'],
  appetite: ['appetite'],
  anxiety: ['anxiety'],
  dreams: ['dreams'],
  physical_discomfort: ['headaches', 'nausea'],
  not_sure: [],
};

const LEGACY_FOCUS_MIGRATION: Record<LegacySupportFocus, readonly SupportArea[]> = {
  sleep: ['sleep'],
  cravings: ['cravings'],
  routine: ['routine'],
  mood: ['irritability'],
  appetite: ['appetite'],
  not_sure: [],
};

/** Normalises canonical and legacy area names to the current taxonomy,
 * preserving order and dropping duplicates. Unknown values are ignored. */
export function migrateSupportAreas(areas: readonly unknown[]): SupportArea[] {
  const out: SupportArea[] = [];
  const seen = new Set<SupportArea>();
  for (const raw of areas) {
    if (isSupportArea(raw)) {
      if (!seen.has(raw)) {
        seen.add(raw);
        out.push(raw);
      }
      continue;
    }
    if (isLegacySupportArea(raw)) {
      for (const mapped of LEGACY_AREA_MIGRATION[raw]) {
        if (!seen.has(mapped)) {
          seen.add(mapped);
          out.push(mapped);
        }
      }
    }
  }
  return out;
}

/** A saved set in taxonomy order: what the store writes, so the turn of topics
 * follows the app's own order rather than the order cards were tapped in. */
export function canonicalSupportAreas(areas: readonly unknown[]): SupportArea[] {
  return migrateSupportAreas(areas).sort(
    (a, b) => SUPPORT_AREA_VALUES.indexOf(a) - SUPPORT_AREA_VALUES.indexOf(b),
  );
}

export function emptyCompanionPersonalisation(): CompanionPersonalisation {
  return {
    schemaVersion: COMPANION_PERSONALISATION_VERSION,
    supportAreas: [],
    forBreak: null,
    confirmedDay: null,
    pick: null,
  };
}

/** The topics as they are used today: bound to the break in hand or inert. */
export function breakFocus(
  record: CompanionPersonalisation,
  breakId: string | null,
  day: number | null,
): BreakFocus {
  if (breakId !== null && record.forBreak === breakId) {
    const current = Math.max(1, day ?? 1);
    return {
      areas: record.supportAreas,
      anchorDay: Math.min(Math.max(1, record.confirmedDay ?? 1), current),
      reusable: [],
    };
  }
  return { areas: [], anchorDay: 1, reusable: record.supportAreas };
}

/** Reads any stored shape forward: v1 focus, v2 device-wide list, or v3. The
 * break binding is dropped when it does not hold together, so a half-written
 * row cannot attach topics to the wrong break. The day's own pick stands on
 * its own: a topic can be chosen by hand on a break that has no topics yet. */
export function decodeCompanionPersonalisation(value: unknown): CompanionPersonalisation | null {
  if (isCompanionPersonalisationV3(value)) {
    const forBreak = value.forBreak;
    return {
      schemaVersion: COMPANION_PERSONALISATION_VERSION,
      supportAreas: canonicalSupportAreas(value.supportAreas),
      forBreak,
      confirmedDay: forBreak === null ? null : value.confirmedDay,
      pick: value.pick,
    };
  }
  if (isCompanionPersonalisationV2(value)) {
    return { ...emptyCompanionPersonalisation(), supportAreas: canonicalSupportAreas(value.supportAreas) };
  }
  if (isCompanionPersonalisation(value)) {
    return migrateCompanionPersonalisation(value);
  }
  return null;
}

/** Strict read for backup files: the same three shapes, but a row that
 * contradicts itself fails instead of being quietly rewritten. */
export function parseCompanionPersonalisation(value: unknown): CompanionPersonalisation | null {
  if (isCompanionPersonalisationV3(value)) {
    if (new Set(value.supportAreas).size !== value.supportAreas.length) return null;
    if (value.forBreak === null && value.confirmedDay !== null) return null;
    return { ...value, supportAreas: canonicalSupportAreas(value.supportAreas) };
  }
  if (isCompanionPersonalisationV2(value)) {
    if (new Set(value.supportAreas).size !== value.supportAreas.length) return null;
    return { ...emptyCompanionPersonalisation(), supportAreas: canonicalSupportAreas(value.supportAreas) };
  }
  if (isCompanionPersonalisation(value)) return migrateCompanionPersonalisation(value);
  return null;
}

export function migrateCompanionPersonalisation(
  legacy: CompanionPersonalisationV1 | null | undefined,
): CompanionPersonalisation {
  return {
    ...emptyCompanionPersonalisation(),
    supportAreas: legacy === null || legacy === undefined ? [] : [...LEGACY_FOCUS_MIGRATION[legacy.supportFocus]],
  };
}

/** Saves the topics for the break in hand, or for the one about to start. The
 * day's own pick is left alone: it is a choice about today, not about the set. */
export function withSupportAreas(
  record: CompanionPersonalisation,
  areas: readonly SupportArea[],
  breakInHand: { readonly id: string; readonly day: number } | null,
): CompanionPersonalisation {
  return {
    schemaVersion: COMPANION_PERSONALISATION_VERSION,
    supportAreas: canonicalSupportAreas(areas),
    forBreak: breakInHand === null ? null : breakInHand.id,
    confirmedDay: breakInHand === null ? null : Math.max(1, Math.floor(breakInHand.day)),
    pick: record.pick,
  };
}

/** Binds the topics already stored to a break that is starting. */
export function withConfirmedBreak(
  record: CompanionPersonalisation,
  breakId: string,
  day: number,
): CompanionPersonalisation {
  return {
    ...record,
    forBreak: breakId,
    confirmedDay: Math.max(1, Math.floor(day)),
    pick: null,
  };
}

export function withPick(
  record: CompanionPersonalisation,
  pick: CompanionPersonalisationPick | null,
): CompanionPersonalisation {
  return { ...record, pick };
}
