import { useRef, useState } from 'preact/hooks';
import { CHECKIN, SYMPTOM_FIELDS } from './break-copy.ts';
import { CheckIcon, CloseIcon } from './icons.tsx';
import { useFocusTrap } from './focus-trap.ts';
import type { SupportFocus } from '../application/questionnaire/companion.ts';
import { supportFocusCopy } from './companion-copy.ts';

export interface SymptomValues {
  readonly craving: number | null;
  readonly sleep: number | null;
  readonly irritability: number | null;
  readonly anxiety: number | null;
  readonly appetite: number | null;
}

const EMPTY_SYMPTOMS: SymptomValues = { craving: null, sleep: null, irritability: null, anxiety: null, appetite: null };

/** Unambiguous symptom-field match for a support focus. Only reorders the
 * sliders when the focus maps directly onto one of the five fields. */
const FOCUS_LEADING_FIELD: Partial<Record<SupportFocus, (typeof SYMPTOM_FIELDS)[number]['id']>> = {
  sleep: 'sleep',
  cravings: 'craving',
  appetite: 'appetite',
};

export interface CheckInProps {
  /** Abstinence day shown in the header ("Check-in — Day N"). */
  readonly day: number;
  readonly onNoUseSave: () => void;
  /** User tapped "Yes": parent suspends timing and opens confirmation. */
  readonly onUseReported: () => void;
  readonly onSymptomsSave: (symptoms: SymptomValues, note: string | null) => void;
  readonly onClose: () => void;
  /** Companion personalisation (Q7); presentation only, never stored here. */
  readonly supportFocus?: SupportFocus | null;
}

export function CheckInFlow({ day, onNoUseSave, onUseReported, onSymptomsSave, onClose, supportFocus = null }: CheckInProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  useFocusTrap(true, rootRef, onClose);
  const [screen, setScreen] = useState<'question' | 'symptoms'>('question');
  const [noSelected, setNoSelected] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <div
      className="questionnaire-overlay"
      data-testid="checkin-flow"
      data-screen={screen}
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkin-title"
      ref={rootRef}
    >
      <header className="questionnaire-header">
        <button type="button" className="icon-button" aria-label={CHECKIN.close} onClick={onClose}>
          <CloseIcon />
        </button>
        <h2 id="checkin-title" className="flow-title">
          {`${CHECKIN.title} — Day ${day}`}
        </h2>
      </header>
      {screen === 'question' ? (
        <QuestionScreen
          noSelected={noSelected}
          busy={busy}
          onSelectNo={() => setNoSelected(true)}
          onYes={() => {
            if (busy) return;
            setBusy(true);
            onUseReported();
          }}
          onSave={() => {
            if (!noSelected || busy) return;
            setBusy(true);
            onNoUseSave();
          }}
          onAddSymptoms={() => {
            setNoSelected(true);
            setScreen('symptoms');
          }}
        />
      ) : (
        <SymptomsScreen
          focus={supportFocus}
          onBack={() => setScreen('question')}
          onSave={(symptoms, note) => {
            if (busy) return;
            setBusy(true);
            onSymptomsSave(symptoms, note);
          }}
        />
      )}
    </div>
  );
}

function QuestionScreen({
  noSelected,
  busy,
  onSelectNo,
  onYes,
  onSave,
  onAddSymptoms,
}: {
  readonly noSelected: boolean;
  readonly busy: boolean;
  readonly onSelectNo: () => void;
  readonly onYes: () => void;
  readonly onSave: () => void;
  readonly onAddSymptoms: () => void;
}) {
  return (
    <>
      <div className="questionnaire-body flow-body">
        <div className="stack">
          <h3 className="card-title">{CHECKIN.question}</h3>
          <div className="two-choice">
          <button
            type="button"
            className={noSelected ? 'choice-card selected' : 'choice-card'}
            data-testid="checkin-no"
            disabled={busy}
            onClick={onSelectNo}
          >
              <span className="choice-copy">
                <span className="choice-title">{CHECKIN.no}</span>
                <span className="meta">{CHECKIN.noHelper}</span>
              </span>
              <span className="choice-check">
                <CheckIcon size={16} />
              </span>
            </button>
            <button
              type="button"
              className="choice-card"
              data-testid="checkin-yes"
              disabled={busy}
              onClick={onYes}
            >
              <span className="choice-copy">
                <span className="choice-title">{CHECKIN.yes}</span>
                <span className="meta">{CHECKIN.yesHelper}</span>
              </span>
            </button>
          </div>
        </div>
      </div>
      <footer className="questionnaire-footer">
        <button
          type="button"
          className="cta-primary"
          disabled={!noSelected || busy}
          data-testid="checkin-save"
          onClick={onSave}
        >
          {CHECKIN.save}
        </button>
        <button type="button" className="text-back" data-testid="add-symptoms" onClick={onAddSymptoms}>
          {`${CHECKIN.addSymptoms} →`}
        </button>
      </footer>
    </>
  );
}

function SymptomsScreen({
  focus,
  onBack,
  onSave,
}: {
  readonly focus: SupportFocus | null;
  readonly onBack: () => void;
  readonly onSave: (symptoms: SymptomValues, note: string | null) => void;
}) {
  const [symptoms, setSymptoms] = useState<SymptomValues>(EMPTY_SYMPTOMS);
  const [note, setNote] = useState('');
  const leading = focus === null ? null : FOCUS_LEADING_FIELD[focus] ?? null;
  const orderedFields =
    leading === null
      ? SYMPTOM_FIELDS
      : [
          SYMPTOM_FIELDS.find((field) => field.id === leading)!,
          ...SYMPTOM_FIELDS.filter((field) => field.id !== leading),
        ];

  function setField(field: keyof SymptomValues, value: number | null) {
    setSymptoms((current) => ({ ...current, [field]: value }));
  }

  function submit() {
    onSave(symptoms, note === '' ? null : note);
  }

  return (
    <form
      className="checkin-symptoms-form"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="questionnaire-body flow-body">
        <div className="stack">
          <header>
            <h3 className="title" style={{ fontSize: '1.5rem' }}>
              {CHECKIN.symptomsTitle}
            </h3>
            {focus !== null && focus !== 'not_sure' ? (
              <p className="meta checkin-focus-line" data-testid="checkin-focus-line">
                {`Your focus · ${supportFocusCopy(focus).shortLabel} — ${supportFocusCopy(focus).todayAction}`}
              </p>
            ) : null}
            <p className="meta" data-testid="symptoms-helper">
              {`(${CHECKIN.symptomsHelper})`}
            </p>
          </header>
          {orderedFields.map((field) => (
            <SymptomSlider
              key={field.id}
              id={field.id}
              label={field.label}
              zero={field.zero}
              ten={field.ten}
              value={symptoms[field.id]}
              onChange={(value) => setField(field.id, value)}
            />
          ))}
          <label className="note-field">
            <span className="settings-entry-title">{CHECKIN.noteLabel}</span>
            <input
              type="text"
              maxLength={500}
              value={note}
              data-testid="checkin-note"
              aria-label={CHECKIN.noteLabel}
              enterKeyHint="done"
              onInput={(event) => setNote((event.target as HTMLInputElement).value)}
            />
            <span className="meta">{CHECKIN.noteHelper}</span>
          </label>
        </div>
      </div>
      <footer className="questionnaire-footer">
        <button
          type="submit"
          className="cta-primary"
          data-testid="symptoms-save"
        >
          {CHECKIN.save}
        </button>
        <button type="button" className="text-back" onClick={onBack}>
          {CHECKIN.backToQuestion}
        </button>
      </footer>
    </form>
  );
}

function SymptomSlider({
  id,
  label,
  zero,
  ten,
  value,
  onChange,
}: {
  readonly id: string;
  readonly label: string;
  readonly zero: string;
  readonly ten: string;
  readonly value: number | null;
  readonly onChange: (value: number) => void;
}) {
  const armedRef = useRef(false);
  const shown = value ?? 0;
  const pct = `${(shown / 10) * 100}%`;

  function arm() {
    armedRef.current = true;
  }

  return (
    <section
      className={value === null ? 'symptom-field unset' : 'symptom-field'}
      data-testid={`symptom-${id}`}
      data-value={value ?? 'unset'}
    >
      <header className="symptom-head">
        <span className="choice-title">{label}</span>
        <output className="symptom-output" aria-live="polite" data-testid={`symptom-${id}-readout`}>
          {value === null ? 'Not set' : String(value)}
        </output>
      </header>
      <div className="slider-wrap symptom-slider" style={{ '--slider-pct': pct } as Record<string, string>}>
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={shown}
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={10}
          aria-valuenow={value === null ? undefined : shown}
          aria-valuetext={value === null ? 'Not set' : String(value)}
          className="slider"
          onFocus={arm}
          onPointerDown={arm}
          onMouseDown={arm}
          onInput={(event) => {
            // A parked thumb stays null until the user deliberately touches
            // the control; an untouched slider is never stored as 0.
            if (!armedRef.current) return;
            onChange(Number((event.target as HTMLInputElement).value));
          }}
        />
      </div>
      <div className="symptom-anchors meta" aria-hidden="true">
        <span>
          {zero} · 0
        </span>
        <span>
          10 · {ten}
        </span>
      </div>
    </section>
  );
}
