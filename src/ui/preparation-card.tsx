import {
  implementationIntentions,
  MAX_CUSTOM_TRIGGER_CHARS,
  MAX_FALLBACK_CHARS,
  MAX_REPLACEMENT_CHARS,
  MAX_SELECTED_TRIGGERS,
  type BreakPreparation,
  type TriggerId,
} from '../application/break/preparation.ts';
import { TRIGGER_CATALOG_V1 } from '../domain/guidance/evidence-guidance-v1.ts';
import { GUIDANCE_CHROME } from './break-copy.ts';

/**
 * The urge plan editor: which moments set an urge off, what to do first, and
 * what to do when that first move is not possible. Controlled — the caller
 * owns the draft and decides when it is written, so typing never writes storage.
 */
export function PreparationCard({ value, onChange }: {
  readonly value: BreakPreparation;
  readonly onChange: (next: BreakPreparation) => void;
}) {
  const atCap = value.triggerIds.length >= MAX_SELECTED_TRIGGERS;

  function toggle(id: TriggerId): void {
    const has = value.triggerIds.includes(id);
    if (!has && atCap) return;
    const triggerIds = has ? value.triggerIds.filter((row) => row !== id) : [...value.triggerIds, id];
    onChange({ ...value, triggerIds });
  }

  const intentions = implementationIntentions(value);

  return (
    <section className="preparation-card" data-testid="preparation-card">
      <div className="prep-step">
        <p className="micro-label">{GUIDANCE_CHROME.triggerStepLabel}</p>
        <div className="chip-row wrap" data-testid="trigger-chips">
          {TRIGGER_CATALOG_V1.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={value.triggerIds.includes(entry.id) ? 'chip selected' : 'chip'}
              data-testid={`trigger-${entry.id}`}
              aria-pressed={value.triggerIds.includes(entry.id)}
              disabled={!value.triggerIds.includes(entry.id) && atCap}
              onClick={() => toggle(entry.id)}
            >
              {entry.label}
            </button>
          ))}
        </div>
        <p className="meta" data-testid="trigger-cap">
          {value.triggerIds.length} of {MAX_SELECTED_TRIGGERS} moments chosen.
        </p>
      </div>
      <label className="prep-field">
        <span className="meta">{GUIDANCE_CHROME.customTriggerLabel}</span>
        <input
          type="text"
          maxLength={MAX_CUSTOM_TRIGGER_CHARS}
          value={value.customTrigger ?? ''}
          placeholder={GUIDANCE_CHROME.customTriggerPlaceholder}
          data-testid="custom-trigger"
          onInput={(event) => onChange({ ...value, customTrigger: textOrNull((event.target as HTMLInputElement).value, MAX_CUSTOM_TRIGGER_CHARS) })}
        />
      </label>
      <label className="prep-field">
        <span className="meta">{GUIDANCE_CHROME.replacementLabel}</span>
        <input
          type="text"
          maxLength={MAX_REPLACEMENT_CHARS}
          value={value.replacementAction ?? ''}
          placeholder={GUIDANCE_CHROME.replacementPlaceholder}
          data-testid="replacement-action"
          onInput={(event) => onChange({ ...value, replacementAction: textOrNull((event.target as HTMLInputElement).value, MAX_REPLACEMENT_CHARS) })}
        />
      </label>
      <label className="prep-field">
        <span className="meta">{GUIDANCE_CHROME.fallbackLabel}</span>
        <input
          type="text"
          maxLength={MAX_FALLBACK_CHARS}
          value={value.fallbackPlan ?? ''}
          placeholder={GUIDANCE_CHROME.fallbackPlaceholder}
          data-testid="fallback-plan"
          onInput={(event) => onChange({ ...value, fallbackPlan: textOrNull((event.target as HTMLInputElement).value, MAX_FALLBACK_CHARS) })}
        />
      </label>
      {intentions.length > 0 ? (
        <div className="urge-plan">
          <p className="micro-label">{GUIDANCE_CHROME.urgePlanLabel}</p>
          <ul className="guidance-list intention-list" data-testid="intention-preview">
            {intentions.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="meta">{GUIDANCE_CHROME.urgePlanHint}</p>
        </div>
      ) : null}
    </section>
  );
}

function textOrNull(value: string, max: number): string | null {
  const trimmed = value.trim().slice(0, max);
  return trimmed === '' ? null : trimmed;
}
