import { useRef } from 'preact/hooks';
import type { JSX } from 'preact';
import { RESET_MODE } from './recovery-copy.ts';

/**
 * The `Your plan` | `Recovery outlook` segmented control. It is the same
 * control on the live result and on the running-break card, so the two surfaces
 * cannot drift: `scope` names the tab/panel ids and the test ids it drives.
 */
export function ResultModeControl({
  resetMode,
  onChange,
  scope,
  ariaLabel,
}: {
  readonly resetMode: boolean;
  readonly onChange: (reset: boolean) => void;
  /** Id and test-id prefix, e.g. `result` or `today`. */
  readonly scope: string;
  readonly ariaLabel: string;
}) {
  const planRef = useRef<HTMLButtonElement>(null);
  const resetRef = useRef<HTMLButtonElement>(null);

  function select(id: 'plan' | 'reset'): void {
    onChange(id === 'reset');
    const button = id === 'plan' ? planRef.current : resetRef.current;
    button?.focus();
  }

  function keyActivate(
    event: JSX.TargetedKeyboardEvent<HTMLButtonElement>,
    id: 'plan' | 'reset',
  ): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      select(id);
    }
  }

  return (
    <div
      className="result-mode"
      role="tablist"
      aria-label={ariaLabel}
      data-testid={`${scope}-mode`}
      onKeyDown={(event) => {
        let next: 'plan' | 'reset' | null = null;
        if (event.key === 'ArrowRight') next = 'reset';
        else if (event.key === 'ArrowLeft') next = 'plan';
        else if (event.key === 'Home') next = 'plan';
        else if (event.key === 'End') next = 'reset';
        if (next !== null) {
          event.preventDefault();
          select(next);
        }
      }}
    >
      <button
        id={`${scope}-tab-plan`}
        type="button"
        role="tab"
        aria-selected={!resetMode}
        aria-controls={`${scope}-panel-plan`}
        tabIndex={resetMode ? -1 : 0}
        className={resetMode ? 'result-mode-option' : 'result-mode-option selected'}
        data-testid={`${scope}-mode-plan`}
        ref={planRef}
        onClick={() => onChange(false)}
        onKeyDown={(event) => keyActivate(event, 'plan')}
      >
        {RESET_MODE.plan}
      </button>
      <button
        id={`${scope}-tab-reset`}
        type="button"
        role="tab"
        aria-selected={resetMode}
        aria-controls={`${scope}-panel-reset`}
        tabIndex={resetMode ? 0 : -1}
        className={resetMode ? 'result-mode-option selected' : 'result-mode-option'}
        data-testid={`${scope}-mode-reset`}
        ref={resetRef}
        onClick={() => onChange(true)}
        onKeyDown={(event) => keyActivate(event, 'reset')}
      >
        {RESET_MODE.reset}
      </button>
    </div>
  );
}
