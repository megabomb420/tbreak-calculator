import { useRef, useState } from 'preact/hooks';
import type { SupportArea } from '../application/questionnaire/companion.ts';
import { SUPPORT_AREA_COPY, SUPPORT_AREA_GROUPS } from './companion-copy.ts';
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
    setAreas((current) =>
      current.includes(area) ? current.filter((item) => item !== area) : [...current, area],
    );
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
            <h3 id="personalisation-title" className="title">What would you like help with?</h3>
            <p className="meta">Choose any that apply. This tailors guidance but does not change your recommended days.</p>
          </header>
          <div className="support-areas-control" data-testid="support-area-cards">
            {SUPPORT_AREA_GROUPS.map((group) => (
              <div key={group.id} className="support-area-group" data-support-group={group.id}>
                <p className="micro-label">{group.label}</p>
                <div className="support-area-grid">
                  {group.areas.map((area) => {
                    const selected = areas.includes(area);
                    return (
                      <button
                        key={area}
                        type="button"
                        className={selected ? 'support-area-card selected' : 'support-area-card'}
                        data-support-area={area}
                        aria-pressed={selected}
                        onClick={() => toggle(area)}
                      >
                        <span className="choice-title">{SUPPORT_AREA_COPY[area].label}</span>
                        <span className="choice-check"><CheckIcon size={16} /></span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
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
