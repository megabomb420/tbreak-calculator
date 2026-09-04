import { useState } from 'preact/hooks';
import {
  emptyPreparation,
  isPreparationEmpty,
  implementationIntentions,
  type BreakPreparation,
  type TriggerId,
} from '../application/break/preparation.ts';
import { TRIGGER_CATALOG_V1 } from '../domain/guidance/evidence-guidance-v1.ts';
import { GUIDANCE_CHROME } from './break-copy.ts';

export function PreparationCard({
  value,
  onSave,
  allowSkip = false,
}: {
  readonly value: BreakPreparation | null;
  readonly onSave: (next: BreakPreparation | null) => void;
  readonly allowSkip?: boolean;
}) {
  const [draft, setDraft] = useState<BreakPreparation>(value ?? emptyPreparation());
  const [custom, setCustom] = useState(value?.customTrigger ?? '');
  const [replacement, setReplacement] = useState(value?.replacementAction ?? '');
  const [fallback, setFallback] = useState(value?.fallbackPlan ?? '');

  function commit(nextIds: readonly TriggerId[] = draft.triggerIds, nextCustom = custom, nextReplacement = replacement, nextFallback = fallback): void {
    const next: BreakPreparation = {
      triggerIds: nextIds,
      customTrigger: trimOrNull(nextCustom, 80),
      replacementAction: trimOrNull(nextReplacement, 120),
      fallbackPlan: trimOrNull(nextFallback, 120),
    };
    setDraft(next);
    onSave(isPreparationEmpty(next) ? null : next);
  }

  function toggle(id: TriggerId): void {
    const has = draft.triggerIds.includes(id);
    const triggerIds = has ? draft.triggerIds.filter((row) => row !== id) : [...draft.triggerIds, id];
    commit(triggerIds);
  }

  const intentions = implementationIntentions({
    triggerIds: draft.triggerIds,
    customTrigger: trimOrNull(custom, 80),
    replacementAction: trimOrNull(replacement, 120),
    fallbackPlan: trimOrNull(fallback, 120),
  });

  return (
    <section className="card preparation-card" data-testid="preparation-card">
      <h3 className="card-title">{GUIDANCE_CHROME.triggers}</h3>
      <p className="meta">{GUIDANCE_CHROME.triggersHelper}</p>
      <div className="prep-step">
        <p className="micro-label">{GUIDANCE_CHROME.triggerStepLabel}</p>
        <div className="chip-row wrap" data-testid="trigger-chips">
          {TRIGGER_CATALOG_V1.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={draft.triggerIds.includes(entry.id) ? 'chip selected' : 'chip'}
              data-testid={`trigger-${entry.id}`}
              onClick={() => toggle(entry.id)}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </div>
      <label className="prep-field">
        <span className="meta">{GUIDANCE_CHROME.customTriggerLabel}</span>
        <input
          type="text"
          maxLength={80}
          value={custom}
          placeholder={GUIDANCE_CHROME.customTriggerPlaceholder}
          data-testid="custom-trigger"
          onInput={(event) => {
            const value = (event.target as HTMLInputElement).value;
            setCustom(value);
            commit(draft.triggerIds, value, replacement, fallback);
          }}
        />
      </label>
      <label className="prep-field">
        <span className="meta">{GUIDANCE_CHROME.replacementLabel}</span>
        <input
          type="text"
          maxLength={120}
          value={replacement}
          placeholder={GUIDANCE_CHROME.replacementPlaceholder}
          data-testid="replacement-action"
          onInput={(event) => {
            const value = (event.target as HTMLInputElement).value;
            setReplacement(value);
            commit(draft.triggerIds, custom, value, fallback);
          }}
        />
      </label>
      <label className="prep-field">
        <span className="meta">{GUIDANCE_CHROME.fallbackLabel}</span>
        <input
          type="text"
          maxLength={120}
          value={fallback}
          placeholder={GUIDANCE_CHROME.fallbackPlaceholder}
          data-testid="fallback-plan"
          onInput={(event) => {
            const value = (event.target as HTMLInputElement).value;
            setFallback(value);
            commit(draft.triggerIds, custom, replacement, value);
          }}
        />
      </label>
      {intentions.length > 0 ? (
        <div className="urge-plan">
          <p className="micro-label">{GUIDANCE_CHROME.urgePlanLabel}</p>
          <p className="meta">{GUIDANCE_CHROME.urgePlanHint}</p>
          <ul className="guidance-list intention-list" data-testid="intention-preview">
            {intentions.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {allowSkip ? (
        <button type="button" className="text-back" data-testid="skip-prep" onClick={() => onSave(null)}>
          {GUIDANCE_CHROME.skipPrep}
        </button>
      ) : null}
    </section>
  );
}

function trimOrNull(value: string, max: number): string | null {
  const trimmed = value.trim().slice(0, max);
  return trimmed === '' ? null : trimmed;
}
