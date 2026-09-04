import { useRef, useState } from 'preact/hooks';
import {
  SUPPORT_AREA_VALUES,
  type SupportArea,
} from '../application/questionnaire/companion.ts';
import { SUPPORT_AREA_COPY } from './companion-copy.ts';
import { CheckIcon, CloseIcon } from './icons.tsx';
import { useFocusTrap } from './focus-trap.ts';

export function PersonalisationFlow({
  initialAreas,
  onSave,
  onClose,
}: {
  readonly initialAreas: readonly SupportArea[];
  readonly onSave: (areas: readonly SupportArea[]) => void;
  readonly onClose: () => void;
}) {
  const [areas, setAreas] = useState<readonly SupportArea[]>(initialAreas);
  const rootRef = useRef<HTMLDivElement>(null);
  useFocusTrap(true, rootRef, onClose);

  function toggle(area: SupportArea): void {
    setAreas((current) => {
      if (current.includes(area)) return current.filter((item) => item !== area);
      if (area === 'not_sure') return ['not_sure'];
      return [...current.filter((item) => item !== 'not_sure'), area];
    });
  }

  return (
    <div
      className="questionnaire-overlay personalisation-flow"
      data-testid="personalisation-flow"
      role="dialog"
      aria-modal="true"
      aria-labelledby="personalisation-title"
      ref={rootRef}
    >
      <header className="questionnaire-header">
        <button type="button" className="icon-button" aria-label="Close personalisation" onClick={onClose}>
          <CloseIcon />
        </button>
        <h2 className="flow-title">Personalise your plan</h2>
      </header>
      <div className="questionnaire-body flow-body">
        <section className="stack">
          <header>
            <h3 id="personalisation-title" className="title">Where would support help?</h3>
            <p className="meta">Choose any that fit. This only tailors guidance — it never changes your recommended days.</p>
          </header>
          <div className="support-focus-grid" data-testid="support-area-cards">
            {SUPPORT_AREA_VALUES.map((area) => {
              const selected = areas.includes(area);
              return (
                <button
                  key={area}
                  type="button"
                  className={selected ? 'support-focus-card selected' : 'support-focus-card'}
                  data-support-area={area}
                  aria-pressed={selected}
                  onClick={() => toggle(area)}
                >
                  <span className={`support-focus-symbol is-${area}`} aria-hidden="true" />
                  <span className="choice-title">{SUPPORT_AREA_COPY[area].label}</span>
                  <span className="choice-check"><CheckIcon size={16} /></span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
      <footer className="questionnaire-footer">
        <button type="button" className="cta-primary" data-testid="save-support-areas" onClick={() => onSave(areas)}>
          Save support areas
        </button>
        <button type="button" className="text-back" onClick={onClose}>Back</button>
      </footer>
    </div>
  );
}
