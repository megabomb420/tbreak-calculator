/**
 * Companion personalisation is deliberately separate from UseProfileInput.
 * It can reorder or tailor deterministic guidance, but it is never passed to
 * tolerance-v3 or tolerance-recovery-outlook-v2.
 */
/** Legacy value retained only so frozen/saved 0.10-0.12 records still decode. */
export const LEGACY_COMPANION_PERSONALISATION_VERSION = 'companion-personalisation-v1' as const;
export const COMPANION_PERSONALISATION_VERSION = 'companion-personalisation-v2' as const;

export const SUPPORT_AREA_VALUES = [
  'sleep',
  'cravings',
  'mood',
  'anxiety',
  'appetite',
  'routine',
  'dreams',
  'physical_discomfort',
  'not_sure',
] as const;

export type SupportArea = (typeof SUPPORT_AREA_VALUES)[number];

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
  if (!record.supportAreas.every(isSupportArea)) return false;
  return new Set(record.supportAreas).size === record.supportAreas.length;
}

export function migrateCompanionPersonalisation(
  legacy: CompanionPersonalisationV1 | null | undefined,
): CompanionPersonalisationV2 {
  return {
    schemaVersion: COMPANION_PERSONALISATION_VERSION,
    supportAreas: legacy === null || legacy === undefined ? [] : [legacy.supportFocus],
  };
}
