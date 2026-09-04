import { useRef } from 'preact/hooks';
import { presentConceptExplainer } from '../application/presentation/break-guidance.ts';
import { GUIDANCE_CHROME } from './break-copy.ts';
import { CloseIcon } from './icons.tsx';
import { useFocusTrap } from './focus-trap.ts';

/** Merged "How these things differ" reference page: one coherent Q&A
 * explainer instead of separate tolerance/CB1/distinction definitions. */
export function HowThingsDifferPanel({ onClose }: { readonly onClose: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  useFocusTrap(true, rootRef, onClose);
  const explainer = presentConceptExplainer();
  return (
    <div
      className="questionnaire-overlay"
      data-testid="how-things-differ"
      role="dialog"
      aria-modal="true"
      aria-labelledby="how-things-differ-title"
      ref={rootRef}
    >
      <header className="questionnaire-header">
        <button type="button" className="icon-button" aria-label={GUIDANCE_CHROME.closeReference} onClick={onClose}>
          <CloseIcon />
        </button>
        <h2 id="how-things-differ-title" className="flow-title">
          {GUIDANCE_CHROME.howThingsDiffer}
        </h2>
      </header>
      <div className="questionnaire-body flow-body">
        <p className="body" data-testid="how-things-differ-lead">
          {explainer.lead}
        </p>
        {explainer.items.map((item) => (
          <section className="result-section explainer-item" data-testid={`explainer-${item.id}`} key={item.id}>
            <h3 className="card-title">{item.question}</h3>
            <p className="body">{item.answer}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
