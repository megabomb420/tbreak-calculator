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

/** Natural-language "when" opener per catalog trigger, written as a full
 * sentence so the generated urge plan never starts with awkward fragments. */
const URGE_OPENERS: Record<TriggerId, string> = {
  evening_after_work: 'Most evenings after work, the urge to use shows up on its own.',
  gaming: 'When I game, the urge to use tends to show up on its own.',
  sleep_difficulty: 'When I cannot fall asleep, the urge to use tends to show up.',
  weekend: 'At the weekend, the urge to use tends to show up on its own.',
  alcohol: 'When alcohol is around, the urge to use tends to show up.',
  boredom: 'When I am bored, the urge to use tends to show up.',
  stress: 'When I am stressed, the urge to use tends to show up.',
  social: 'In that social situation, the urge to use tends to show up.',
};

const GENERIC_URGE_OPENER = 'Sometimes the urge to use shows up on its own.';

function urgeStep(opener: string, replacement: string): string {
  const move = replacement.trim();
  return `${opener} When that happens, my first move is to ${move}, and only after that do I check whether the urge is still there.`;
}

/**
 * Generated urge-plan lines. Deliberately plain-language: each line names the
 * moment in a full sentence, then one concrete first move, then a reassess
 * step. No duration or medical claim is ever generated.
 */
export function implementationIntentions(preparation: BreakPreparation | null | undefined): readonly string[] {
  if (preparation == null) return [];
  const replacement = preparation.replacementAction?.trim() || 'do my chosen alternative';
  const lines: string[] = [];

  for (const id of preparation.triggerIds) {
    lines.push(urgeStep(URGE_OPENERS[id] ?? GENERIC_URGE_OPENER, replacement));
  }

  const custom = preparation.customTrigger?.trim();
  if (custom !== null && custom !== undefined && custom !== '') {
    lines.push(urgeStep(`I also named one more moment: ${custom}.`, replacement));
  }

  if (lines.length === 0 && preparation.replacementAction !== null && preparation.replacementAction.trim() !== '') {
    lines.push(urgeStep(GENERIC_URGE_OPENER, replacement));
  }

  const fallback = preparation.fallbackPlan?.trim();
  if (fallback !== null && fallback !== undefined && fallback !== '' && lines.length > 0) {
    lines.push(`If that first move is not possible, ${fallback}.`);
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
