import { presentDetoxEvidence } from '../application/presentation/break-guidance.ts';
import { GUIDANCE_CHROME } from './break-copy.ts';
import { CloseIcon } from './icons.tsx';
import { useFocusTrap } from './focus-trap.ts';
import { useRef } from 'preact/hooks';

export function DetoxEvidencePanel({ onClose }: { readonly onClose: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  useFocusTrap(true, rootRef, onClose);
  const view = presentDetoxEvidence();
  return (
    <div
      className="questionnaire-overlay"
      data-testid="detox-evidence"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detox-title"
      ref={rootRef}
    >
      <header className="questionnaire-header">
        <button type="button" className="icon-button" aria-label={GUIDANCE_CHROME.closeDetox} onClick={onClose}>
          <CloseIcon />
        </button>
        <h2 id="detox-title" className="flow-title">
          {view.title}
        </h2>
      </header>
      <div className="questionnaire-body flow-body">
        <p className="body">{view.lead}</p>
        <p className="body">{view.primary}</p>
        <p className="meta">{view.notAProtocol}</p>
        <p className="meta" data-testid="evidence-scale-disclaimer">
          {view.scaleDisclaimer}
        </p>
        <dl className="evidence-scale" data-testid="evidence-scale">
          {(['A', 'B', 'C', 'D'] as const).map((grade) => (
            <div key={grade} className="evidence-scale-row">
              <dt>{grade}</dt>
              <dd>{view.scale[grade]}</dd>
            </div>
          ))}
        </dl>
        <ul className="detox-method-list">
          {view.methods.map((method) => (
            <li
              key={method.id}
              className="detox-method"
              data-testid={`detox-${method.id}`}
              data-grade={method.grade}
              data-speeds={method.speedsThcElimination ? 'true' : 'false'}
              data-wellbeing={method.wellbeing}
            >
              <div className="detox-method-head">
                <h3 className="card-title">{method.name}</h3>
                <span className="evidence-grade" data-grade={method.grade}>
                  {method.grade}
                </span>
              </div>
              <p className="body">{method.summary}</p>
              <p className="meta">{method.detail}</p>
              <p className="meta detox-split">
                Wellbeing: {wellbeingLabel(method.wellbeing)} · Speeds THC elimination: no
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function wellbeingLabel(value: 'helpful' | 'neutral' | 'not_recommended' | 'harmful_risk'): string {
  switch (value) {
    case 'helpful':
      return 'can help ordinary wellbeing';
    case 'neutral':
      return 'not a wellbeing prescription';
    case 'not_recommended':
      return 'not recommended for this purpose';
    case 'harmful_risk':
      return 'do not use for this purpose';
  }
}
