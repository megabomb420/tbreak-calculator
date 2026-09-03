import { useState } from 'preact/hooks';
import type { Instant } from '../domain/schemas/time.ts';
import type { DailyCheckin } from '../domain/schemas/profile.ts';
import type { DurableSnapshot } from '../application/persistence/durable.ts';
import type { CalculationRecord } from '../application/persistence/calculation-record.ts';
import type { StoredAttempt } from '../application/progress/break-attempt-record.ts';
import type { StoredTrack } from '../application/progress/tracking-record.ts';
import {
  attemptStatusLabel,
  buildHistoryModel,
  checkinsForAttempt,
  checkinsForTracking,
  findAttempt,
  findCalculation,
  findCheckin,
  findCorrupt,
  findTracking,
  segmentLabel,
  type HistoryEntry,
} from '../application/history/history-model.ts';
import { presentCalculationRecord } from '../application/history/present-calculation.ts';
import type { QuestionnaireStepId } from '../application/questionnaire/engine.ts';
import { HISTORY } from './copy.ts';
import { ConfirmDialog } from './confirm-dialog.tsx';
import { formatLocalDay, formatShortDay } from './format.ts';
import { ChevronIcon, IntervalMark, PlusIcon } from './icons.tsx';
import { PostBreakSummary } from './post-break-summary.tsx';
import { ResultScreen } from './result-screen.tsx';

export interface HistoryScreenProps {
  readonly snapshot: DurableSnapshot;
  readonly now: Instant;
  readonly onAddPastBreak: () => void;
  readonly onEditPastBreak: (id: string) => void;
  readonly onDelete: (kind: HistoryEntry['kind'], id: string) => void;
  readonly onRecalculate: (record: CalculationRecord, step?: QuestionnaireStepId) => void;
}

export function HistoryScreen({
  snapshot,
  now,
  onAddPastBreak,
  onEditPastBreak,
  onDelete,
  onRecalculate,
}: HistoryScreenProps) {
  const model = buildHistoryModel(snapshot, now);
  const [selected, setSelected] = useState<HistoryEntry | null>(null);
  const [pendingDelete, setPendingDelete] = useState<HistoryEntry | null>(null);

  function open(entry: HistoryEntry) {
    if (entry.kind === 'previous-break') {
      onEditPastBreak(entry.id);
      return;
    }
    setSelected(entry);
  }

  const confirm =
    pendingDelete !== null ? (
      <ConfirmDialog
        title={HISTORY.deleteConfirmTitle}
        body={pendingDelete.kind === 'corrupt' ? HISTORY.unavailableBody : HISTORY.deleteConfirmBody}
        action={HISTORY.deleteConfirmAction}
        onConfirm={() => {
          onDelete(pendingDelete.kind, pendingDelete.id);
          setPendingDelete(null);
          setSelected(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    ) : null;

  if (selected !== null) {
    return (
      <>
        <HistoryDetail
          entry={selected}
          snapshot={snapshot}
          now={now}
          onBack={() => setSelected(null)}
          onDelete={() => setPendingDelete(selected)}
          onRecalculate={onRecalculate}
        />
        {confirm}
      </>
    );
  }

  return (
    <>
      <section className="history-screen" data-testid="history-view">
        <section className="history-section">
          <header className="history-section-head">
            <h2 className="card-title">{HISTORY.pastBreaks}</h2>
            <button
              type="button"
              className="text-back history-add"
              data-testid="history-add-past-break"
              onClick={onAddPastBreak}
            >
              <PlusIcon size={16} />
              {HISTORY.addPastBreak}
            </button>
          </header>
          {model.previousBreaks.length === 0 ? (
            <p className="meta">None added yet. They never change the recommended range.</p>
          ) : (
            <ul className="history-list">
              {model.previousBreaks.map((entry) => (
                <HistoryRow key={entry.id} entry={entry} onOpen={() => open(entry)} />
              ))}
            </ul>
          )}
        </section>
        {model.empty ? (
          <div className="history-empty">
            <div className="brand-mark">
              <IntervalMark size={32} />
            </div>
            <p className="eyebrow">History</p>
            <p className="title">{HISTORY.emptyTitle}</p>
            <p className="meta">{HISTORY.emptyBody}</p>
          </div>
        ) : (
          model.groups.map((group) => (
            <section key={group.label} className="history-section">
              <h2 className="eyebrow">{group.label}</h2>
              <ul className="history-list">
                {group.entries.map((entry) => (
                  <HistoryRow key={`${entry.kind}-${entry.id}`} entry={entry} onOpen={() => open(entry)} />
                ))}
              </ul>
            </section>
          ))
        )}
      </section>
      {confirm}
    </>
  );
}

function HistoryRow({ entry, onOpen }: { readonly entry: HistoryEntry; readonly onOpen: () => void }) {
  return (
    <li>
      <button
        type="button"
        className={entry.kind === 'corrupt' ? 'history-row unavailable' : 'history-row'}
        data-testid="history-row"
        data-kind={entry.kind}
        data-id={entry.id}
        onClick={onOpen}
      >
        <span className="history-row-copy">
          <span className="history-row-title">{entry.title}</span>
          <span className="meta">{entry.subtitle}</span>
        </span>
        <ChevronIcon size={18} />
      </button>
    </li>
  );
}

function HistoryDetail({
  entry,
  snapshot,
  now,
  onBack,
  onDelete,
  onRecalculate,
}: {
  readonly entry: HistoryEntry;
  readonly snapshot: DurableSnapshot;
  readonly now: Instant;
  readonly onBack: () => void;
  readonly onDelete: () => void;
  readonly onRecalculate: (record: CalculationRecord, step?: QuestionnaireStepId) => void;
}) {
  switch (entry.kind) {
    case 'calculation': {
      const record = findCalculation(snapshot, entry.id);
      if (record === null) return <MissingDetail onBack={onBack} onDelete={onDelete} />;
      const view = presentCalculationRecord(record);
      return (
        <ResultScreen
          view={view}
          historical
          onAcknowledge={onBack}
          onEditStep={(step) => onRecalculate(record, step)}
          onSeeBreakRange={() => onRecalculate(record)}
          onCheckAnotherTest={() => onRecalculate(record)}
          onBreakRecommendation={() => onRecalculate(record)}
          onDetectionBasics={() => onRecalculate(record)}
          onStartOver={onBack}
          onRecalculate={() => onRecalculate(record)}
          onDelete={onDelete}
        />
      );
    }
    case 'attempt': {
      const attempt = findAttempt(snapshot, entry.id);
      if (attempt === null) return <MissingDetail onBack={onBack} onDelete={onDelete} />;
      return (
        <AttemptDetail
          attempt={attempt}
          checkins={checkinsForAttempt(snapshot, attempt, now)}
          now={now}
          onBack={onBack}
          onDelete={onDelete}
        />
      );
    }
    case 'tracking': {
      const track = findTracking(snapshot, entry.id);
      if (track === null) return <MissingDetail onBack={onBack} onDelete={onDelete} />;
      return (
        <TrackingDetail
          track={track}
          checkins={checkinsForTracking(snapshot, track, now)}
          now={now}
          onBack={onBack}
          onDelete={onDelete}
        />
      );
    }
    case 'checkin': {
      const checkin = findCheckin(snapshot, entry.id);
      if (checkin === null) return <MissingDetail onBack={onBack} onDelete={onDelete} />;
      return <CheckinDetail checkin={checkin} onBack={onBack} onDelete={onDelete} />;
    }
    case 'corrupt': {
      const row = findCorrupt(snapshot, entry.id);
      return (
        <section className="history-detail" data-testid="history-detail" data-kind="corrupt">
          <button type="button" className="text-back" onClick={onBack}>
            {HISTORY.closeDetail}
          </button>
          <h2 className="title">{HISTORY.unavailable}</h2>
          <p className="body">{HISTORY.unavailableBody}</p>
          {row !== null ? <p className="meta">{row.reason}</p> : null}
          <button type="button" className="cta-danger" data-testid="history-delete" onClick={onDelete}>
            {HISTORY.delete}
          </button>
        </section>
      );
    }
    case 'previous-break':
      return null;
  }
}

function MissingDetail({ onBack, onDelete }: { readonly onBack: () => void; readonly onDelete: () => void }) {
  return (
    <section className="history-detail" data-testid="history-detail">
      <button type="button" className="text-back" onClick={onBack}>
        {HISTORY.closeDetail}
      </button>
      <h2 className="title">{HISTORY.unavailable}</h2>
      <p className="body">{HISTORY.unavailableBody}</p>
      <button type="button" className="cta-danger" onClick={onDelete}>
        {HISTORY.delete}
      </button>
    </section>
  );
}

function AttemptDetail({
  attempt,
  checkins,
  now,
  onBack,
  onDelete,
}: {
  readonly attempt: StoredAttempt;
  readonly checkins: readonly DailyCheckin[];
  readonly now: Instant;
  readonly onBack: () => void;
  readonly onDelete: () => void;
}) {
  return (
    <section className="history-detail stack" data-testid="history-detail" data-kind="attempt">
      <button type="button" className="text-back" onClick={onBack}>
        {HISTORY.closeDetail}
      </button>
      <header>
        <p className="eyebrow">Break</p>
        <h2 className="title">{attempt.targetDurationDays}-day break</h2>
        <p className="meta">{attemptStatusLabel(attempt.status)}</p>
        <p className="meta">Started {formatLocalDay(attempt.startedAt)}</p>
      </header>
      <section>
        <h3 className="card-title">Segments</h3>
        <ul className="history-list">
          {attempt.segments.map((segment, index) => (
            <li key={`${segment.startedFromLastUseAt}-${index}`} className="history-static-row">
              <p className="history-row-title">{segmentLabel(segment)}</p>
              <p className="meta">
                From {formatShortDay(segment.startedFromLastUseAt)}
                {segment.endedAt !== null ? ` · to ${formatShortDay(segment.endedAt)}` : ` · open as of ${formatShortDay(now)}`}
              </p>
            </li>
          ))}
        </ul>
      </section>
      {attempt.postBreakPlan !== null ? <PostBreakSummary plan={attempt.postBreakPlan} /> : null}
      <CheckinList checkins={checkins} />
      <button type="button" className="cta-danger" data-testid="history-delete" onClick={onDelete}>
        {HISTORY.delete}
      </button>
    </section>
  );
}

function TrackingDetail({
  track,
  checkins,
  now,
  onBack,
  onDelete,
}: {
  readonly track: StoredTrack;
  readonly checkins: readonly DailyCheckin[];
  readonly now: Instant;
  readonly onBack: () => void;
  readonly onDelete: () => void;
}) {
  const status = track.status === 'ended' ? 'Ended' : track.status === 'interrupted_time_needed' ? 'Paused' : 'Tracking';
  return (
    <section className="history-detail stack" data-testid="history-detail" data-kind="tracking">
      <button type="button" className="text-back" onClick={onBack}>
        {HISTORY.closeDetail}
      </button>
      <header>
        <p className="eyebrow">Tracking</p>
        <h2 className="title">Abstinence tracking</h2>
        <p className="meta">{status}</p>
        <p className="meta">Started {formatLocalDay(track.startedAt)}</p>
      </header>
      <section>
        <h3 className="card-title">Segments</h3>
        <ul className="history-list">
          {track.segments.map((segment, index) => (
            <li key={`${segment.startedFromLastUseAt}-${index}`} className="history-static-row">
              <p className="history-row-title">{segmentLabel(segment)}</p>
              <p className="meta">
                From {formatShortDay(segment.startedFromLastUseAt)}
                {segment.endedAt !== null ? ` · to ${formatShortDay(segment.endedAt)}` : ` · open as of ${formatShortDay(now)}`}
              </p>
            </li>
          ))}
        </ul>
      </section>
      <CheckinList checkins={checkins} />
      <button type="button" className="cta-danger" data-testid="history-delete" onClick={onDelete}>
        {HISTORY.delete}
      </button>
    </section>
  );
}

function CheckinDetail({
  checkin,
  onBack,
  onDelete,
}: {
  readonly checkin: DailyCheckin;
  readonly onBack: () => void;
  readonly onDelete: () => void;
}) {
  const at = Date.parse(checkin.recordedAt);
  return (
    <section className="history-detail stack" data-testid="history-detail" data-kind="checkin">
      <button type="button" className="text-back" onClick={onBack}>
        {HISTORY.closeDetail}
      </button>
      <header>
        <p className="eyebrow">Check-in</p>
        <h2 className="title">{checkin.usedThc ? 'Used THC' : 'No THC'}</h2>
        {Number.isFinite(at) ? <p className="meta">{formatLocalDay(at as Instant)}</p> : null}
      </header>
      <ul className="meta">
        <li>Craving: {fmtScore(checkin.craving)}</li>
        <li>Sleep: {fmtScore(checkin.sleep)}</li>
        <li>Irritability: {fmtScore(checkin.irritability)}</li>
        <li>Anxiety: {fmtScore(checkin.anxiety)}</li>
        <li>Appetite: {fmtScore(checkin.appetite)}</li>
      </ul>
      {checkin.note !== null && checkin.note !== '' ? <p className="body">{checkin.note}</p> : null}
      <button type="button" className="cta-danger" data-testid="history-delete" onClick={onDelete}>
        {HISTORY.delete}
      </button>
    </section>
  );
}

function CheckinList({ checkins }: { readonly checkins: readonly DailyCheckin[] }) {
  if (checkins.length === 0) return null;
  return (
    <section>
      <h3 className="card-title">Check-ins</h3>
      <ul className="history-list">
        {checkins.map((checkin) => {
          const at = Date.parse(checkin.recordedAt);
          return (
            <li key={checkin.recordedAt} className="history-static-row">
              <p className="history-row-title">{checkin.usedThc ? 'Used THC' : 'No THC'}</p>
              <p className="meta">{Number.isFinite(at) ? formatShortDay(at as Instant) : checkin.recordedAt}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function fmtScore(value: number | null): string {
  return value === null ? '—' : String(value);
}
