import { useState } from 'preact/hooks';
import {
  emptyPreparation,
  isPreparationEmpty,
  type BreakPreparation,
} from '../application/break/preparation.ts';
import { PREPARATION_COPY } from './break-copy.ts';
import { PreparationCard } from './preparation-card.tsx';

/** Field-by-field equality: the editor's draft is written only when it differs. */
function samePreparation(a: BreakPreparation, b: BreakPreparation | null): boolean {
  if (b === null) return isPreparationEmpty(a);
  return (
    a.customTrigger === b.customTrigger &&
    a.replacementAction === b.replacementAction &&
    a.fallbackPlan === b.fallbackPlan &&
    a.triggerIds.length === b.triggerIds.length &&
    a.triggerIds.every((id, index) => id === b.triggerIds[index])
  );
}

/**
 * The stored urge plan, edited in place. The draft stays local until the person
 * saves it, so a half-typed plan is never what Today advises with; the plan the
 * app does use is shown above the editor.
 */
export function UrgePlan({ preparation, onSave }: {
  readonly preparation: BreakPreparation | null;
  readonly onSave: (next: BreakPreparation | null) => void;
}) {
  const [draft, setDraft] = useState<BreakPreparation>(() => preparation ?? emptyPreparation());
  const dirty = !samePreparation(draft, preparation);
  const status = dirty
    ? PREPARATION_COPY.unsaved
    : preparation === null
      ? PREPARATION_COPY.empty
      : PREPARATION_COPY.saved;

  return (
    <section className="result-disclosure today-block" data-testid="today-preparation">
      <h3 className="card-title">{PREPARATION_COPY.title}</h3>
      <p className="meta">{PREPARATION_COPY.helper}</p>
      <PreparationCard value={draft} onChange={setDraft} />
      <div className="plan-actions">
        <button
          type="button"
          className="cta-secondary"
          data-testid="save-plan"
          disabled={!dirty}
          onClick={() => onSave(isPreparationEmpty(draft) ? null : draft)}
        >
          {PREPARATION_COPY.save}
        </button>
        {preparation !== null ? (
          <button
            type="button"
            className="text-back"
            data-testid="remove-plan"
            onClick={() => {
              setDraft(emptyPreparation());
              onSave(null);
            }}
          >
            {PREPARATION_COPY.remove}
          </button>
        ) : null}
      </div>
      <p className="meta" role="status" data-testid="plan-status">{status}</p>
    </section>
  );
}
