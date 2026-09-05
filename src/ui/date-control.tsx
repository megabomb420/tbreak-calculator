import { useState } from 'preact/hooks';
import type { Instant } from '../domain/schemas/time.ts';
import {
  DATE_CHIPS, DAY_PARTS, DAY_PART_HOURS, dateInputBounds, localIsoDate,
  resolveDateChip, resolvePickedDate, type DateChipId, type DateWindowKind, type DayPart,
} from '../application/questionnaire/date-answers.ts';
import { DATE_CHIP_LABELS, DAY_PART_LABELS, QUESTIONNAIRE } from './questionnaire-copy.ts';
import { formatLocalDay } from './format.ts';

/** One date editor for intake and interruption: the visible selection and
 * submitted value always agree, including when reopening a saved answer. */
export function DateControl({ window, now, value, showStillUse, from, onChange, onInvalid }: {
  readonly window: DateWindowKind;
  readonly now: Instant;
  readonly value?: string;
  readonly showStillUse?: boolean;
  readonly from?: Instant;
  readonly onChange: (iso: string) => void;
  readonly onInvalid: () => void;
}) {
  const saved = value === undefined ? NaN : Date.parse(value);
  const hasSaved = Number.isFinite(saved);
  const [chip, setChip] = useState<DateChipId | 'pick' | 'still' | null>(hasSaved ? 'pick' : null);
  const [picked, setPicked] = useState(hasSaved ? localIsoDate(saved as Instant) : '');
  const [part, setPart] = useState<DayPart>(() => {
    const hour = hasSaved ? new Date(saved).getHours() : 13;
    return [...DAY_PARTS].sort((a, b) => Math.abs(DAY_PART_HOURS[a] - hour) - Math.abs(DAY_PART_HOURS[b] - hour))[0]!;
  });
  const [error, setError] = useState<string | null>(null);
  const bounds = dateInputBounds(now, window, from);
  const isToday = chip === 'today' || chip === 'still' || (chip === 'pick' && picked === localIsoDate(now));

  function commit(iso: string | null) {
    setError(iso === null ? 'Choose a date and time within the allowed range.' : null);
    if (iso === null) onInvalid();
    else onChange(iso);
  }

  function pickDate(date: string) {
    setPicked(date);
    // Boundary dates can have only some valid day parts. Select a valid
    // estimate and show it explicitly rather than leaving Continue stuck.
    const validPart = [part, ...DAY_PARTS].find((p) => resolvePickedDate(date, p, now, window, from) !== null);
    if (validPart !== undefined) setPart(validPart);
    commit(validPart === undefined ? null : resolvePickedDate(date, validPart, now, window, from));
  }

  return (
    <div className="control-stack date-control">
      <div className="date-shortcuts" role="group" aria-label="Last use date">
        {DATE_CHIPS.filter((id) => resolveDateChip(id, part, now, window, from) !== null).map((id) => (
          <button key={id} type="button" className={chip === id ? 'chip selected' : 'chip'}
            aria-pressed={chip === id} data-date-chip={id} onClick={() => {
              setChip(id);
              commit(resolveDateChip(id, part, now, window, from));
            }}>{DATE_CHIP_LABELS[id]}</button>
        ))}
        <button type="button" className={chip === 'pick' ? 'chip selected date-custom' : 'chip date-custom'}
          aria-pressed={chip === 'pick'} data-date-chip="pick" onClick={() => {
            setChip('pick');
            if (picked !== '') pickDate(picked);
            else { onInvalid(); setError(null); }
          }}>{QUESTIONNAIRE.pickADate}</button>
        {showStillUse ? (
          <button type="button" className={chip === 'still' ? 'chip selected' : 'chip'}
            aria-pressed={chip === 'still'} data-date-chip="still-use" onClick={() => {
              setChip('still'); commit(resolveDateChip('today', part, now, window, from));
            }}>{QUESTIONNAIRE.stillUseToday}</button>
        ) : null}
      </div>
      {chip === 'pick' ? (
        <div className="date-editor">
          <label className="date-field-label">
            <span>Date</span>
            <input type="date" min={bounds.min} max={bounds.max} value={picked}
              data-testid="date-picker" aria-label={QUESTIONNAIRE.pickADate}
              aria-invalid={error !== null} aria-describedby="date-help"
              onInput={(event) => pickDate(event.currentTarget.value)}
              onChange={(event) => pickDate(event.currentTarget.value)} />
          </label>
          <p className="meta" id="date-help">{window === 'within_30_days' ? 'Within the last 30 days.' : window === 'older_than_30_days' ? 'More than 30 days ago.' : window === 'since_anchor' ? 'Since this part of your break began.' : 'Today or any earlier date.'}</p>
        </div>
      ) : null}
      {chip !== null && !isToday && (chip !== 'pick' || picked !== '') ? (
        <div>
          <p className="micro-label">Approximate time</p>
          <div className="day-part-options" role="group" aria-label="Time of day">
            {DAY_PARTS.map((p) => (
              <button type="button" key={p} className={part === p ? 'chip selected' : 'chip'}
                aria-pressed={part === p} data-day-part={p}
                disabled={chip === 'pick' ? resolvePickedDate(picked, p, now, window, from) === null : resolveDateChip(chip as DateChipId, p, now, window, from) === null}
                onClick={() => {
                  setPart(p);
                  commit(chip === 'pick' ? resolvePickedDate(picked, p, now, window, from)
                    : resolveDateChip(chip as DateChipId, p, now, window, from));
                }}>{DAY_PART_LABELS[p]}</button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="date-feedback" aria-live="polite">
        {error !== null ? <p className="warning">{error}</p> : value !== undefined ? (
          <p className="meta" data-testid="date-selection">{`Selected: ${formatLocalDay(Date.parse(value) as Instant)}${isToday ? ' · now, approximately' : ` · ${DAY_PART_LABELS[part].toLowerCase()}`}`}</p>
        ) : <p className="meta">{chip === 'pick' ? 'Select a date above to continue.' : 'Choose roughly when you last used.'}</p>}
      </div>
    </div>
  );
}
