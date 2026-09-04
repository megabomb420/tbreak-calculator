// Optional trigger / precommitment plan stored with a break attempt or
// open-ended tracking record. Missing on v0.4.x records — treat as absent.

import { TRIGGER_CATALOG_V1 } from '../../domain/guidance/evidence-guidance-v1.ts';
import { isRecord } from '../progress/record-codec.ts';

export const TRIGGER_IDS = TRIGGER_CATALOG_V1.map((entry) => entry.id);
export type TriggerId = (typeof TRIGGER_CATALOG_V1)[number]['id'];

export const MAX_CUSTOM_TRIGGER_CHARS = 80;
export const MAX_REPLACEMENT_CHARS = 120;
export const MAX_FALLBACK_CHARS = 120;
export const MAX_SELECTED_TRIGGERS = 8;

export interface BreakPreparation {
  readonly triggerIds: readonly TriggerId[];
  readonly customTrigger: string | null;
  readonly replacementAction: string | null;
  readonly fallbackPlan: string | null;
}

export function emptyPreparation(): BreakPreparation {
  return { triggerIds: [], customTrigger: null, replacementAction: null, fallbackPlan: null };
}

export function isPreparationEmpty(value: BreakPreparation): boolean {
  return (
    value.triggerIds.length === 0 &&
    value.customTrigger === null &&
    value.replacementAction === null &&
    value.fallbackPlan === null
  );
}

export function isTriggerId(value: unknown): value is TriggerId {
  return typeof value === 'string' && (TRIGGER_IDS as readonly string[]).includes(value);
}

export function isValidPreparation(value: unknown): value is BreakPreparation {
  if (!isRecord(value)) return false;
  if (!Array.isArray(value.triggerIds)) return false;
  if (value.triggerIds.length > MAX_SELECTED_TRIGGERS) return false;
  const seen = new Set<string>();
  for (const id of value.triggerIds) {
    if (!isTriggerId(id) || seen.has(id)) return false;
    seen.add(id);
  }
  if (!isOptionalTrimmed(value.customTrigger, MAX_CUSTOM_TRIGGER_CHARS)) return false;
  if (!isOptionalTrimmed(value.replacementAction, MAX_REPLACEMENT_CHARS)) return false;
  if (!isOptionalTrimmed(value.fallbackPlan, MAX_FALLBACK_CHARS)) return false;
  return true;
}

/** Decode optional preparation from a stored row. Absent / null → null.
 * Corrupt objects fail the row rather than inventing a default plan. */
export function decodePreparation(value: unknown): { ok: true; preparation: BreakPreparation | null } | { ok: false } {
  if (value === undefined || value === null) return { ok: true, preparation: null };
  if (!isValidPreparation(value)) return { ok: false };
  return { ok: true, preparation: isPreparationEmpty(value) ? null : value };
}

export function triggerLabel(id: TriggerId): string {
  return TRIGGER_CATALOG_V1.find((entry) => entry.id === id)?.label ?? id;
}

/**
 * Generated urge-plan lines. The app labels the user's selections instead of
 * inventing first-person statements on their behalf. User-written actions are
 * preserved verbatim inside quotation marks.
 */
export function implementationIntentions(preparation: BreakPreparation | null | undefined): readonly string[] {
  if (preparation == null) return [];
  const lines: string[] = [];
  const triggers = preparation.triggerIds.map(triggerLabel);
  const custom = preparation.customTrigger?.trim();

  if (custom !== null && custom !== undefined && custom !== '') {
    triggers.push(custom);
  }

  if (triggers.length > 0) {
    lines.push(`Triggers: ${triggers.join('; ')}.`);
  }

  const replacement = preparation.replacementAction?.trim();
  if (replacement !== null && replacement !== undefined && replacement !== '') {
    lines.push(`Plan: When an urge shows up, use “${replacement}” first, then reassess.`);
  }

  const fallback = preparation.fallbackPlan?.trim();
  if (fallback !== null && fallback !== undefined && fallback !== '' && lines.length > 0) {
    lines.push(`Fallback: If the first move is not possible, ${fallback}.`);
  }

  return lines;
}

function isOptionalTrimmed(value: unknown, max: number): value is string | null {
  if (value === null) return true;
  if (typeof value !== 'string') return false;
  if (value !== value.trim()) return false;
  if (value === '') return false;
  return value.length <= max;
}
