/**
 * Companion personalisation is deliberately separate from UseProfileInput.
 * It can select and reorder deterministic guidance, but it is never passed to
 * tolerance-v3 or tolerance-recovery-outlook-v2.
 *
 * v2 stores an ordered list of support areas so a user can express several
 * needs at once; the first area leads the plan and the rest follow. Legacy v1
 * (`supportFocus`) and the interim 0.12 v2 area names remain readable so no
 * stored preference is silently dropped.
 */
export const LEGACY_COMPANION_PERSONALISATION_VERSION = 'companion-personalisation-v1' as const;
export const COMPANION_PERSONALISATION_VERSION = 'companion-personalisation-v2' as const;

/**
 * The canonical support-area taxonomy. Deliberately a bounded, grouped set of
 * real THC-break problems — not a medical symptom checklist.
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
  readonly schemaVersion: typeof COMPANION_PERSONALISATION_VERSION;
  readonly supportAreas: readonly SupportArea[];
}

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
  if (record.schemaVersion !== COMPANION_PERSONALISATION_VERSION || !Array.isArray(record.supportAreas)) return false;
  return record.supportAreas.every(isSupportArea);
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

export function migrateCompanionPersonalisation(
  legacy: CompanionPersonalisationV1 | null | undefined,
): CompanionPersonalisationV2 {
  return {
    schemaVersion: COMPANION_PERSONALISATION_VERSION,
    supportAreas: legacy === null || legacy === undefined ? [] : [...LEGACY_FOCUS_MIGRATION[legacy.supportFocus]],
  };
}
