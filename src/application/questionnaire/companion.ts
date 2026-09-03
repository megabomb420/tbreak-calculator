/**
 * Companion personalisation is deliberately separate from UseProfileInput.
 * It can reorder or tailor deterministic guidance, but it is never passed to
 * tolerance-v3 or tolerance-recovery-outlook-v2.
 */
export const COMPANION_PERSONALISATION_VERSION = 'companion-personalisation-v1' as const;

export const SUPPORT_FOCUS_VALUES = [
  'sleep',
  'cravings',
  'routine',
  'mood',
  'appetite',
  'not_sure',
] as const;

export type SupportFocus = (typeof SUPPORT_FOCUS_VALUES)[number];

export interface CompanionPersonalisationV1 {
  readonly schemaVersion: typeof COMPANION_PERSONALISATION_VERSION;
  readonly supportFocus: SupportFocus;
}

export function isSupportFocus(value: unknown): value is SupportFocus {
  return typeof value === 'string' && (SUPPORT_FOCUS_VALUES as readonly string[]).includes(value);
}

export function isCompanionPersonalisation(value: unknown): value is CompanionPersonalisationV1 {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    record.schemaVersion === COMPANION_PERSONALISATION_VERSION &&
    isSupportFocus(record.supportFocus)
  );
}
