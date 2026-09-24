import { latestTodayCheckin } from '../application/presentation/today-checkin.ts';
import { presentSavedResult, savedUseProfile } from '../application/calculation/saved-result.ts';
import { useEffect, useMemo, useReducer, useRef, useState } from 'preact/hooks';
import { answersFromSnapshot } from '../application/calculation/answers-from-snapshot.ts';
import { runCalculation } from '../application/calculation/run-calculation.ts';
import {
  acknowledgeCompletedBreak,
  activateDuePlans,
  cancelPlannedBreak,
  completeBreakPlan,
  confirmBreakUse,
  confirmTrackingUse,
  createBreakPlan,
  createTracking,
  currentLiveAttempt,
  currentLiveTracking,
  endBreakEarly,
  recordNoUseCheckin,
  recordSymptomCheckin,
  stopTracking,
  suspendBreak,
  suspendTracking,
  type BreakSessionState,
  type CheckinSymptoms,
} from '../application/break/break-session.ts';
import type { BreakPreparation } from '../application/break/preparation.ts';
import { buildTodayFacts, currentLiveReductionPlan } from '../application/break/today-model.ts';
import {
  createQuestionnaireProgressStore,
  QUESTIONNAIRE_PROGRESS_SCHEMA_VERSION,
} from '../application/progress/questionnaire-progress.ts';
import {
  QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION,
  type QuestionnaireSnapshotRecord,
} from '../application/progress/questionnaire-snapshot.ts';
import { createResultViewStore, RESULT_VIEW_SCHEMA_VERSION } from '../application/progress/result-view.ts';
import { type StoredAttempt } from '../application/progress/break-attempt-record.ts';
import { type StoredTrack } from '../application/progress/tracking-record.ts';
import { type PwaUpdateStatus, APP_VERSION } from '../application/settings/settings.ts';
import {
  createWebBackedDurable,
  deleteAllLocalData,
  deleteHistoryRecord,
  ensureCalculationFromSnapshot,
  type DurablePersistence,
} from '../application/persistence/durable.ts';
import {
  freezeCalculation,
  withPreviousBreaks,
  type CalculationRecord,
} from '../application/persistence/calculation-record.ts';
import { createdAtIso, PreviousBreakSheet, type PreviousBreakDraft } from './previous-break-sheet.tsx';
import { newRecordId } from '../application/persistence/ids.ts';
import {
  applyBackup,
  backupCounts,
  backupFileName,
  createBackup,
  parseBackup,
  serializeBackup,
  type ParsedBackup,
} from '../application/backup/backup.ts';
import { downloadTextFile, pickTextFile, type PickedTextFile } from './backup-file.ts';
import { toPreviousBreakInput } from '../application/persistence/previous-break-store.ts';
import type { StoredPreviousBreak } from '../application/persistence/previous-break-store.ts';
import { findPreviousBreak, lastedDays } from '../application/history/history-model.ts';
import { pendingOutcomeForReturn } from '../domain/recovery/outcome-capture.ts';
import { INSTALL_HINT_DISMISSED_KEY } from '../application/persistence/durable.ts';
import { StorageBanner } from './storage-banner.tsx';
import { InstallHint, UpdateSnackbar, isStandaloneDisplay } from './pwa-ui.tsx';
import { INITIAL_SHELL_STATE, shellReducer, type AppTab } from '../application/shell/shell-controller.ts';
import { todayFactsFromSnapshot } from '../application/shell/today-facts-from-snapshot.ts';
import { resolveTodayState, type TodayFacts } from '../application/shell/today-state.ts';
import {
  activeBreakView,
  currentSegmentAnchor,
  plannedBreakView,
  trackingDayView,
} from '../application/presentation/plan-presentation.ts';
import type { ResultView } from '../application/presentation/result-presentation.ts';
import { exposureFromProfile } from '../domain/guidance/break-outlook.ts';
import {
  endPlan as endReductionPlan,
  deleteUseEvent as removeReductionUseEvent,
  logUseEvent as appendReductionUseEvent,
  pausePlan as pauseReductionPlan,
  recommitPlan as recommitReductionPlan,
  resumePlan as resumeReductionPlan,
  startReductionPlan as createReductionPlan,
} from '../domain/reduction/reduction-plan-lifecycle.ts';
import {
  derivePlanState,
  suggestedReductionLimits,
  type ReductionBaseline,
  type ReductionLimits,
  type ReductionPlan,
  type ThcStrategy,
  type UseEvent,
} from '../domain/reduction/reduction-engine.ts';
import type { Goal, PostBreakMode, ProductKind, Route } from '../domain/schemas/enums.ts';
import type { UseProfileInput } from '../domain/schemas/profile.ts';
import { parseSubmittedTimestamp, type Instant } from '../domain/schemas/time.ts';
import { abstinenceDayAt } from '../domain/breaks/break-time.ts';
import { systemClock, type Clock } from '../infrastructure/clock.ts';
import type { StorageAdapter } from '../infrastructure/storage/storage-adapter.ts';
import { BreakStartSheet } from './break-start-sheet.tsx';
import { NewPlanSheet } from './new-plan-sheet.tsx';
import { SupportAreasSheet } from './support-areas-sheet.tsx';
import { RideItOut } from './ride-it-out.tsx';
import {
  CHECKIN_REMINDER_SCHEMA_VERSION,
  type CheckinReminderRecord,
} from '../application/progress/reminder-store.ts';
import { isCheckinReminderDue } from '../domain/reminders/checkin-reminder.ts';
import { requestNotificationPermission, showLocalNotification } from './notifications.ts';
import {
  pruneUrgeSessions,
  type UrgeOutcome,
  type UrgeSession,
} from '../application/progress/urge-session-record.ts';
import {
  finishUrgeSession,
  openUrgeSession,
  startUrgeSession,
  summariseUrgeSessions,
} from '../domain/urges/urge-session.ts';
import { ConfirmUse, type ConfirmScope } from './confirm-use.tsx';
import { TrackingDetail } from './tracking-detail.tsx';
import { DetoxEvidencePanel } from './detox-evidence.tsx';
import { HistoryScreen } from './history-screen.tsx';
import { QuestionnaireFlow } from './questionnaire-flow.tsx';
import { ResultScreen } from './result-screen.tsx';
import { RESULT } from './result-copy.ts';
import { ChooseBreakDays } from './choose-break-days.tsx';
import { CHOSEN_BREAK, CHOSEN_BREAK_MAX_DAYS, CHOSEN_BREAK_MIN_DAYS } from './break-copy.ts';
import { SettingsModal, type BackupStatus } from './settings-modal.tsx';
import { ScienceBasicsPanel } from './science-basics.tsx';
import { Shell } from './shell.tsx';
import { LogUseSheet } from './log-use.tsx';
import { OutcomeCapture } from './outcome-capture.tsx';
import { ReductionStartSheet } from './reduction-start-sheet.tsx';
import { TodayScreen, type TodayLiveData, type TodayProfileData } from './today-screen.tsx';
import {
  applyAnswer,
  countSubstantiveAnswers,
  lastUseNeedsReselect,
  nextDestination,
  previousStep,
  restoreStep,
  startSession,
  type QuestionnaireSession,
  type QuestionnaireStepId,
  type StepAnswer,
} from '../application/questionnaire/engine.ts';
import { finishQuestionnaire } from '../application/questionnaire/snapshot.ts';
import { breakFocus, type CompanionPersonalisationV1, type SupportArea } from '../application/questionnaire/companion.ts';
import { createCompanionPersonalisationStore } from '../application/progress/companion-personalisation.ts';

export type Flow =
  | { readonly kind: 'break-start'; /** Present when the plan length was chosen
    * by the user (3–28 days) rather than derived from a calculation. */
    readonly customDays: number | null }
  | { readonly kind: 'choose-break-days' }
  | { readonly kind: 'tracking-detail' }
  | { readonly kind: 'confirm-use'; readonly scope: ConfirmScope; readonly segmentStart: Instant }
  | { readonly kind: 'previous-break'; readonly editId: string | null }
  | { readonly kind: 'detox-evidence' }
  | { readonly kind: 'reduction-start' }
  | { readonly kind: 'log-use' }
  | { readonly kind: 'new-plan' };

export interface AppProps {
  readonly storage: StorageAdapter;
  readonly clock?: Clock;
  readonly durable?: DurablePersistence;
  readonly persistent?: boolean;
  /** A durable write this session was rejected (prop-driven in tests). */
  readonly writeFailed?: boolean;
  /** Subscribes to durable write failures so the banner can follow them. */
  readonly onWriteFailure?: (listener: (failed: boolean) => void) => () => void;
  readonly updateReady?: boolean;
  readonly onReloadUpdate?: () => void;
  readonly onDismissUpdate?: () => void;
  /** PWA freshness shown in Settings About (from the same updater). */
  readonly updateStatus?: PwaUpdateStatus;
  /** Applies an available update from Settings (same mechanism as snackbar). */
  readonly onUpdateNow?: () => void;
  /** Saves a backup file on the device (overridable in tests). */
  readonly saveBackupFile?: (name: string, text: string) => void;
  /** Reads the file chosen for a restore (overridable in tests). */
  readonly pickBackupFile?: () => Promise<PickedTextFile | null>;
}

export function App({
  storage,
  clock = systemClock,
  durable: durableProp,
  persistent = true,
  writeFailed: writeFailedProp = false,
  onWriteFailure,
  updateReady = false,
  onReloadUpdate,
  onDismissUpdate,
  updateStatus,
  onUpdateNow,
  saveBackupFile = downloadTextFile,
  pickBackupFile = pickTextFile,
}: AppProps) {
  const [shell, dispatch] = useReducer(shellReducer, INITIAL_SHELL_STATE);
  const progress = useMemo(() => createQuestionnaireProgressStore(storage), [storage]);
  const resultViews = useMemo(() => createResultViewStore(storage), [storage]);
  const companionPreferences = useMemo(() => createCompanionPersonalisationStore(storage), [storage]);
  const durable = useMemo(
    () =>
      durableProp ??
      createWebBackedDurable(storage, {
        persistent,
        backend: persistent ? 'web-storage' : 'memory',
      }),
    [durableProp, storage, persistent],
  );
  // A rejected durable write must not leave the app claiming it saves.
  const [storageWriteFailed, setStorageWriteFailed] = useState(writeFailedProp);
  useEffect(() => {
    const subscribe = onWriteFailure ?? ((listener: (failed: boolean) => void) => durable.onWriteFailure(listener));
    return subscribe(setStorageWriteFailed);
  }, [durable, onWriteFailure]);
  const [factsEpoch, setFactsEpoch] = useState(0);
  const [session, setSession] = useState<QuestionnaireSession | null>(null);
  const [lastUseWarning, setLastUseWarning] = useState(false);
  const [flow, setFlow] = useState<Flow | null>(null);
  const [now, setNow] = useState<Instant>(() => clock.now());
  // Dismissing the install hint is a decision, not a per-session accident: it
  // is stored so it does not come back on the next tab or the next launch.
  const [installHintDismissed, setInstallHintDismissed] = useState(() => storage.getItem(INSTALL_HINT_DISMISSED_KEY) === '1');
  /** Completed break awaiting the one-time 0-10 outcome rating after a return
   * to THC. Null unless a return use was just logged for an eligible attempt. */
  const [outcomeAttempt, setOutcomeAttempt] = useState<StoredAttempt | null>(null);
  const [scienceOpen, setScienceOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [urgeOpen, setUrgeOpen] = useState(false);
  /** The session the open timer is about; null means "whichever is running". */
  const [urgeFocusId, setUrgeFocusId] = useState<string | null>(null);
  const [previousBreakRevision, setPreviousBreakRevision] = useState(0);
  const [scienceFromSettings, setScienceFromSettings] = useState(false);
  const [backupStatus, setBackupStatus] = useState<BackupStatus | null>(null);
  const [pendingRestore, setPendingRestore] = useState<{
    readonly fileName: string;
    readonly backup: ParsedBackup;
  } | null>(null);

  // A live day counter should not drift while the app stays open. Re-render
  // from the injected clock on a slow tick and when the tab regains focus.
  useEffect(() => {
    if (clock !== systemClock) return;
    const id = window.setInterval(() => setNow(clock.now()), 60_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') setNow(clock.now());
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [clock]);

  function refresh(): void {
    setNow(clock.now());
    setFactsEpoch((value) => value + 1);
  }
  /** A rejected synchronous save leaves the form open with its data. The
   * durable facade already reports the failure through the storage banner. */
  function tryWrite(work: () => void): boolean {
    try {
      work();
      return true;
    } catch {
      return false;
    }
  }

  const snapshotRecord = useMemo(() => {
    const loaded = durable.load();
    // v0.3.x snapshots never stored a calculation id. Materialize once.
    // A snapshot that already has runId but no matching row was deleted.
    if (loaded.snapshot !== null && loaded.snapshot.runId === undefined) {
      ensureCalculationFromSnapshot(durable, loaded.snapshot);
      return durable.load().snapshot;
    }
    return loaded.snapshot?.runId !== undefined && !loaded.calculations.some(record => record.id === loaded.snapshot!.runId)
      ? null : loaded.snapshot;
  }, [durable, factsEpoch]);
  const resultRecord = useMemo(() => resultViews.load(), [resultViews, factsEpoch]);
  const draft = useMemo(() => progress.load(), [progress, factsEpoch]);
  const durableSnap = useMemo(() => durable.load(), [durable, factsEpoch]);
  // Loading still migrates a legacy record forward and rewrites it, so a
  // backup keeps a device's data; the sheet is what writes new choices. The
  // record is re-read on every refresh, so a write is always what the day
  // shows and no shadow copy can drift from it.
  const storedCompanion = useMemo(
    () => companionPreferences.loadOrMigrate(findLegacyCompanion(durable.load())),
    [companionPreferences, factsEpoch],
  );
  const attemptsRecord = durableSnap.attempts;
  const trackingRecord = durableSnap.tracking;
  const checkinsRecord = durableSnap.checkins;
  const reductionPlan = durableSnap.reductionPlan;
  const reductionRecords = durableSnap.reductionRecords;
  const liveReductionPlan = currentLiveReductionPlan(reductionRecords);

  const sessionState: BreakSessionState = {
    attempts: attemptsRecord,
    tracking: trackingRecord,
    checkins: checkinsRecord,
  };

  function readSessionState(): BreakSessionState {
    const loaded = durable.load();
    return {
      attempts: loaded.attempts,
      tracking: loaded.tracking,
      checkins: loaded.checkins,
    };
  }

  /** The frozen record behind the live result screen, when this run owns one.
   * Used to present saved numbers, never to re-run the engine. */
  const liveResultRecord = useMemo(() => {
    const runId = snapshotRecord?.runId;
    if (runId === undefined) return null;
    return durableSnap.calculations.find((record) => record.id === runId) ?? null;
  }, [snapshotRecord, durableSnap.calculations]);

  const profileSnapshot = savedUseProfile(durableSnap.calculations, snapshotRecord);
  const profileCalculation = durableSnap.calculations.find((record) => record.id === profileSnapshot?.runId) ?? null;
  const ownerId = currentLiveAttempt(sessionState.attempts)?.calculationRecordId
    ?? currentLiveTracking(sessionState.tracking)?.calculationRecordId;
  const companionSnapshot = savedUseProfile(durableSnap.calculations, snapshotRecord, ownerId);

  /** After a confirmed return use, surface the one-time outcome capture for
   * the newest eligible completed attempt without a mark, if any. */
  function offerOutcomeAfterReturn(returnedAt: Instant): void {
    const loaded = durable.load();
    const pending = pendingOutcomeForReturn(loaded.attempts, loaded.outcomeMarks, {
      returnedAt,
    });
    if (pending !== null) setOutcomeAttempt(pending);
  }

  // Activate any planned break whose start has arrived. Re-read stores so a
  // stale tab cannot resurrect a cancelled plan over a newer write.
  useEffect(() => {
    const current = readSessionState();
    const loaded = durable.load();
    const activated = activateDuePlans(current, (attempt) =>
      attempt.calculationRecordId === null && attempt.targetSource === 'chosen'
        ? attempt.startedAt
        : profileAnchor(savedUseProfile(loaded.calculations, loaded.snapshot, attempt.calculationRecordId)),
    now);
    if (activated !== current) {
      persistBreakSession(activated);
      refresh();
    }
  }, [factsEpoch, now, attemptsRecord, trackingRecord, checkinsRecord, snapshotRecord, durable]);

  const snapshotFacts = todayFactsFromSnapshot(profileSnapshot?.snapshot ?? snapshotRecord?.snapshot ?? null);
  const acknowledged = resultRecord?.status === 'acknowledged';
  const facts: TodayFacts = buildTodayFacts({
    snapshotFacts: acknowledged ? snapshotFacts : {},
    attempts: sessionState.attempts,
    tracking: sessionState.tracking,
    reductionPlans: reductionRecords,
    draft,
  });
  const view = resolveTodayState(facts);

  const showResult =
    session === null &&
    snapshotRecord !== null &&
    draft === null &&
    resultRecord?.status !== 'acknowledged';
  const resultModel: ResultView | null = showResult && snapshotRecord !== null
    ? (liveResultRecord !== null ? presentSavedResult(liveResultRecord, now) : runCalculation(snapshotRecord.snapshot, snapshotRecord.updatedAt))
    : null;
  // Profile summary for the Today card (result saved and acknowledged).
  const profileView: ResultView | null =
    !showResult && acknowledged && profileSnapshot !== null
      ? (profileCalculation !== null ? presentSavedResult(profileCalculation, now) : runCalculation(profileSnapshot.snapshot, profileSnapshot.updatedAt))
      : null;

  const urgeSessions = durableSnap.urgeSessions;
  const runningUrge = openUrgeSession(urgeSessions, now);
  const reminder = durableSnap.reminder;
  const urgeFocus = urgeSessions.find((session) => session.id === urgeFocusId) ?? null;
  // A countdown needs a second-by-second clock, unlike the day counter.
  const urgeTickKey = runningUrge?.id ?? null;
  useEffect(() => {
    if (clock !== systemClock) return;
    if (urgeTickKey === null && !urgeOpen) return;
    const id = window.setInterval(() => setNow(clock.now()), 1_000);
    return () => window.clearInterval(id);
  }, [clock, urgeTickKey, urgeOpen]);

  const liveAttempt = currentLiveAttempt(sessionState.attempts);
  const liveTracking = currentLiveTracking(sessionState.tracking);
  // The reminder asks the same question the check-in card answers: is today
  // recorded in the segment that is running now?
  const liveAnchor = liveAttempt !== null
    ? currentSegmentAnchor(liveAttempt.segments)
    : liveTracking !== null
      ? currentSegmentAnchor(liveTracking.segments)
      : null;
  const reminderDue =
    (view.primary === 'active-break' || view.primary === 'abstinence-tracking')
    && isCheckinReminderDue({
      enabled: reminder?.enabled ?? false,
      time: reminder?.time ?? null,
      now,
      checkedInToday: latestTodayCheckin(sessionState.checkins, liveAnchor, now) >= 0,
    });
  // One notification per local day, and only when the person allowed them.
  const notifiedDay = useRef<string | null>(null);
  useEffect(() => {
    if (!reminderDue) return;
    const day = new Date(now).toDateString();
    if (notifiedDay.current === day) return;
    notifiedDay.current = day;
    showLocalNotification('T-Break', 'Time to check in for today.', 'tbreak-checkin');
  }, [reminderDue, now]);
  const scheduled = liveAttempt?.status === 'planned' ? liveAttempt : null;
  const anchor = profileAnchor(companionSnapshot);
  const activeView = liveAttempt !== null && liveAttempt.status === 'active' ? activeBreakView(liveAttempt, now) : null;
  const utcOffsetMinutes = -new Date().getTimezoneOffset();
  const reductionView =
    liveReductionPlan !== null
      ? {
          plan: liveReductionPlan,
          state: derivePlanState(
            liveReductionPlan.events,
            liveReductionPlan.limits,
            liveReductionPlan.strategy,
            now,
            utcOffsetMinutes,
          ),
        }
      : null;

  const liveData: TodayLiveData = {
    now,
    active: activeView !== null ? { attempt: liveAttempt!, view: activeView } : null,
    interruptedAttempt: liveAttempt?.status === 'interrupted_time_needed' ? liveAttempt : null,
    interruptedTracking: liveTracking?.status === 'interrupted_time_needed' ? liveTracking : null,
    completed: liveAttempt?.status === 'completed' ? liveAttempt : null,
    tracking:
      liveTracking !== null && liveTracking.status === 'tracking'
        ? { track: liveTracking, view: trackingDayView(liveTracking, now) }
        : null,
    reduction: reductionView,
    checkins: sessionState.checkins,
    exposure:
      companionSnapshot !== null && companionSnapshot.snapshot.kind === 'use_profile'
        ? exposureFromProfile(companionSnapshot.snapshot.profile)
        : null,
  };
  const suggestedLimits = profileSnapshot?.snapshot.kind === 'use_profile'
    ? suggestedReductionLimits({
      thcUseDaysLast30: profileSnapshot.snapshot.profile.thcUseDaysLast30.value ?? 0,
      sessionsPerUseDay: profileSnapshot.snapshot.profile.sessionsPerUseDay.value,
    }) : null;
  /** The break Today is inside, whether it is running or waiting for a
   * confirmation, with the break day the topics and the day's pick belong to. */
  const liveBreak = liveData.active !== null
    ? { id: liveData.active.attempt.id, day: liveData.active.view.day }
    : liveData.tracking !== null && liveData.tracking.view !== null
      ? { id: liveData.tracking.track.id, day: liveData.tracking.view.day }
      // A suspended break resumes at day 1 of a new segment, so that is the day
      // its topics and any hand-picked topic belong to.
      : liveData.interruptedAttempt !== null
        ? { id: liveData.interruptedAttempt.id, day: 1 }
        : liveData.interruptedTracking !== null
          ? { id: liveData.interruptedTracking.id, day: 1 }
          : null;
  const focus = useMemo(
    () => breakFocus(storedCompanion, liveBreak?.id ?? null, liveBreak?.day ?? null),
    [storedCompanion, liveBreak?.id, liveBreak?.day],
  );
  const pickedArea = storedCompanion.pick !== null && liveBreak !== null
    && storedCompanion.pick.breakId === liveBreak.id && storedCompanion.pick.day === liveBreak.day
    ? storedCompanion.pick.area
    : null;
  /** Topics kept from an earlier break: offered for reuse, never applied. */
  const carriedTopics = storedCompanion.supportAreas.length > 0 && focus.areas.length === 0;
  /** A break with no topics of its own is the one moment the sheet is asked
   * for rather than opened by hand. */
  const supportNeedsReview = storedCompanion.supportAreas.length === 0
    || (liveBreak === null ? storedCompanion.forBreak !== null : focus.areas.length === 0);

  const profileData: TodayProfileData = {
    resultView: profileView,
    scheduled,
    plannedView: scheduled !== null ? plannedBreakView(scheduled, anchor) : null,
    reductionPlan:
      liveReductionPlan !== null
        ? {
            maxUseDaysPerWeek: liveReductionPlan.limits.maxUseDaysPerWeek,
            maxSessionsPerUseDay: liveReductionPlan.limits.maxSessionsPerUseDay,
          }
        : reductionPlan === null
          ? suggestedLimits
          : {
              maxUseDaysPerWeek: reductionPlan.maxUseDaysPerWeek,
              maxSessionsPerUseDay: reductionPlan.maxSessionsPerUseDay,
            },
  };

  function persistBreakSession(next: BreakSessionState): void {
    try {
      durable.saveAttempts(next.attempts);
      durable.saveTracking(next.tracking);
      durable.saveCheckins(next.checkins);
    } catch {
      // Quota or a late adapter failure must not crash the shell.
    }
  }

  function markResult(status: 'open' | 'acknowledged'): void {
    resultViews.save({ schemaVersion: RESULT_VIEW_SCHEMA_VERSION, status, updatedAt: clock.now() });
  }

  function acknowledgeResult(): void {
    markResult('acknowledged');
    refresh();
  }

  /** Saving from the sheet is a decision about the break in hand: the topics
   * are bound to it, or kept for the break that starts next. */
  function saveSupportAreas(areas: readonly SupportArea[]): void {
    companionPreferences.saveAreas(areas, liveBreak);
    setSupportOpen(false);
    refresh();
  }

  /** One tap that reuses the topics kept from an earlier break. */
  function reuseSupportAreas(): void {
    if (liveBreak === null) return;
    companionPreferences.confirmFor(liveBreak.id, liveBreak.day);
    refresh();
  }

  /** The topic picked by hand, remembered for this break day only. */
  function pickSupportArea(area: SupportArea | null): void {
    if (liveBreak === null) return;
    companionPreferences.savePick(area === null ? null : { breakId: liveBreak.id, day: liveBreak.day, area });
    refresh();
  }

  /** Topics chosen before a break starts are the ones that break runs with; a
   * set already bound to an earlier break is offered instead of inherited. */
  function bindSupportToNewBreak(breakId: string): void {
    const record = companionPreferences.loadOrMigrate(findLegacyCompanion(durable.load()));
    if (record.forBreak !== null) return;
    companionPreferences.confirmFor(breakId, 1);
  }

  function saveReminder(next: CheckinReminderRecord): void {
    if (!tryWrite(() => durable.saveReminder(next))) return;
    // A reminder is only useful with notifications allowed; asking here is the
    // gesture the platform requires, and a refusal changes nothing else.
    if (next.enabled) void requestNotificationPermission();
    refresh();
  }

  function writeUrgeSessions(next: readonly UrgeSession[]): boolean {
    return tryWrite(() => durable.saveUrgeSessions(pruneUrgeSessions(next, clock.now())));
  }

  function startUrge(minutes: number): void {
    const nowAt = clock.now();
    const started = startUrgeSession(newRecordId('urge', nowAt), minutes, nowAt);
    // One timer at a time: a running one is replaced, not stacked.
    const rest = urgeSessions.filter((session) => session.endedAt !== null);
    if (!writeUrgeSessions([started, ...rest])) return;
    setUrgeFocusId(started.id);
    refresh();
  }

  function finishUrge(outcome: UrgeOutcome): void {
    const target = urgeFocus ?? runningUrge;
    if (target === null) return;
    const nowAt = clock.now();
    const finished = finishUrgeSession(target, outcome, nowAt);
    if (!writeUrgeSessions(urgeSessions.map((session) => (session.id === finished.id ? finished : session)))) return;
    setUrgeFocusId(finished.id);
    refresh();
  }

  /** Stopping is not an outcome: the row leaves no trace at all. */
  function stopUrge(): void {
    const target = urgeFocus ?? runningUrge;
    setUrgeOpen(false);
    setUrgeFocusId(null);
    if (target === null) return;
    if (!writeUrgeSessions(urgeSessions.filter((session) => session.id !== target.id))) return;
    refresh();
  }

  function closeUrge(): void {
    setUrgeOpen(false);
    setUrgeFocusId(null);
  }

  function snapshotRunId(): string | null {
    return profileSnapshot?.runId ?? null;
  }

  /** The authoritative last-use instant from the current profile, if any. */
  function currentAnchor(): Instant | null {
    return profileAnchor(profileSnapshot);
  }

  function openBreakStart(): void {
    setFlow({ kind: 'break-start', customDays: null });
  }

  /** "Choose my break length": open the 3–28 day scheduling flow. */
  function openChooseBreakDays(): void {
    setFlow({ kind: 'choose-break-days' });
  }

  /** Confirm a chosen duration and move into the normal break-start sheet. */
  function confirmChosenDays(days: number): void {
    if (!Number.isInteger(days) || days < CHOSEN_BREAK_MIN_DAYS || days > CHOSEN_BREAK_MAX_DAYS) return;
    setFlow({ kind: 'break-start', customDays: days });
  }

  function startPlan(mode: PostBreakMode, startAt: Instant, preparation: BreakPreparation | null): void {
    const latest = readSessionState();
    if (currentLiveAttempt(latest.attempts) !== null || currentLiveTracking(latest.tracking) !== null || currentLiveReductionPlan(durable.load().reductionRecords) !== null) {
      return;
    }
    const nowAt = clock.now();
    const chosenDays = flow?.kind === 'break-start' ? flow.customDays : null;
    if (chosenDays !== null) {
      // Chosen-duration plan: no calculation exists, so nothing is recorded as
      // recommended and the day counter anchors to the chosen plan start.
      const planId = newRecordId('break', nowAt);
      const next = createBreakPlan(latest, {
        id: planId,
        calculationRecordId: null,
        targetDurationDays: chosenDays,
        targetSource: 'chosen',
        mode,
        planStart: startAt,
        now: nowAt,
        anchor: startAt,
        preparation,
      });
      persistBreakSession(next);
      bindSupportToNewBreak(planId);
      markResult('acknowledged');
      dispatch({ type: 'select_tab', tab: 'today' });
      setFlow(null);
      refresh();
      return;
    }
    const calcId = snapshotRunId();
    const lastUse = currentAnchor();
    if (calcId === null || lastUse === null) return;
    const viewForTarget = toleranceTargetDays(resultModel ?? profileView);
    if (viewForTarget === null) return;
    const planId = newRecordId('break', nowAt);
    const next = createBreakPlan(latest, {
      id: planId,
      calculationRecordId: calcId,
      targetDurationDays: viewForTarget,
      mode,
      planStart: startAt,
      now: nowAt,
      anchor: lastUse,
      preparation,
    });
    persistBreakSession(next);
    bindSupportToNewBreak(planId);
    markResult('acknowledged');
    dispatch({ type: 'select_tab', tab: 'today' });
    setFlow(null);
    refresh();
  }

  function startTracking(): void {
    const latest = readSessionState();
    if (currentLiveAttempt(latest.attempts) !== null || currentLiveTracking(latest.tracking) !== null || currentLiveReductionPlan(durable.load().reductionRecords) !== null) {
      return;
    }
    const lastUse = currentAnchor();
    if (lastUse === null) return;
    const calcId = snapshotRunId();
    const nowAt = clock.now();
    const trackId = newRecordId('track', nowAt);
    const next = createTracking(latest, {
      id: trackId,
      calculationRecordId: calcId,
      startedAt: nowAt,
      anchor: lastUse,
    });
    persistBreakSession(next);
    bindSupportToNewBreak(trackId);
    markResult('acknowledged');
    dispatch({ type: 'select_tab', tab: 'today' });
    refresh();
  }

  function confirmWhen(): void {
    const attempt = liveData.interruptedAttempt ?? liveData.active?.attempt;
    const tracking = liveData.interruptedTracking ?? liveData.tracking?.track;
    if (attempt != null) {
      const start = currentSegmentAnchor(attempt.segments);
      if (start !== null) setFlow({ kind: 'confirm-use', scope: 'attempt', segmentStart: start });
    } else if (tracking != null) {
      const start = currentSegmentAnchor(tracking.segments);
      if (start !== null) setFlow({ kind: 'confirm-use', scope: 'tracking', segmentStart: start });
    }
  }

  function dismissUnconfirmedUse(): void {
    const state = readSessionState();
    const at = clock.now();
    const attemptId = liveData.interruptedAttempt?.id;
    const trackId = attemptId === undefined ? liveData.interruptedTracking?.id : undefined;
    // Older releases persisted a pending interruption on the first tap.
    // No confirmed use or closed segment exists to undo in this state.
    persistBreakSession({ ...state,
      attempts: state.attempts.map(row => row.id === attemptId && row.status === 'interrupted_time_needed' ? { ...row, status: 'active' as const, updatedAt: at } : row),
      tracking: state.tracking.map(row => row.id === trackId && row.status === 'interrupted_time_needed' ? { ...row, status: 'tracking' as const, updatedAt: at } : row),
    });
    refresh();
  }

  function confirmUse(scope: ConfirmScope, usedAt: Instant, usedAtIso: string): boolean {
    const nowAt = clock.now();
    const latest = readSessionState();
    const attempt = currentLiveAttempt(latest.attempts);
    const tracking = currentLiveTracking(latest.tracking);
    const id = scope === 'attempt' ? attempt?.id : tracking?.id;
    if (id === undefined) return false;
    const pending = scope === 'attempt' && attempt?.status === 'active'
      ? suspendBreak(latest, id, nowAt)
      : scope === 'tracking' && tracking?.status === 'tracking'
        ? suspendTracking(latest, id, nowAt) : { ok: true as const, state: latest };
    if (!pending.ok) return false;
    const outcome = scope === 'attempt'
      ? confirmBreakUse(pending.state, { id, usedAt, usedAtIso, now: nowAt })
      : confirmTrackingUse(pending.state, { id, usedAt, usedAtIso, now: nowAt });
    if (!outcome.ok) return false;
    persistBreakSession(outcome.state);
    const snapshot = durable.load().snapshot;
    if (snapshot !== null && snapshot.snapshot.kind === 'use_profile') {
      const profile = snapshot.snapshot.profile;
      try {
        durable.saveSnapshot({
          ...snapshot,
          snapshot: {
            ...snapshot.snapshot,
            profile: { ...profile, lastUseAt: { value: usedAtIso, provenance: 'user_estimate' } },
          },
          updatedAt: nowAt,
        });
      } catch {
        // Profile last-use is best-effort; the open segment remains the clock.
      }
    }
    refresh();
    // A confirmed return to THC is when a completed break becomes ratable.
    offerOutcomeAfterReturn(usedAt);
    return true;
  }

  function openTrackingDetail(): void {
    setFlow({ kind: 'tracking-detail' });
  }

  function markComplete(id: string): void {
    const nowAt = clock.now();
    const outcome = completeBreakPlan(readSessionState(), id, nowAt, nowAt);
    if (outcome.ok) persistBreakSession(outcome.state);
    setFlow(null);
    refresh();
  }

  function acknowledgeCompletion(): void {
    const completed = currentLiveAttempt(readSessionState().attempts);
    if (completed === null || completed.status !== 'completed') return;
    const outcome = acknowledgeCompletedBreak(readSessionState(), completed.id, clock.now());
    if (outcome.ok) persistBreakSession(outcome.state);
    // Post-break continuity: when the finished break chose occasional or
    // reduced-regular use, hand the user over to the same active reduction
    // tracker (limits from the post-break plan) instead of dropping them back
    // on an empty profile card.
    const finished = completed;
    const plan = finished.postBreakPlan;
    if (plan !== null && (plan.mode === 'occasional' || plan.mode === 'reduced_regular_use')) {
      if (currentLiveReductionPlan(durable.load().reductionRecords) === null) {
        const baseline = reductionBaselineFromProfile();
        if (baseline !== null) {
          const nowAt = clock.now();
          const created = createReductionPlan({
            id: newRecordId('reduction', nowAt),
            origin: 'post_break',
            limits: {
              maxUseDaysPerWeek: plan.maxUseDaysPerWeek,
              maxSessionsPerUseDay: plan.mode === 'occasional' ? 1 : plan.maxSessionsPerUseDay,
            },
            strategy: reductionStrategyFromProfile(),
            baseline,
            now: nowAt,
            utcOffsetMinutes: -new Date().getTimezoneOffset(),
          });
          upsertReductionPlan(created);
        }
      }
    }
    refresh();
  }

  // --- Active reduction plan -------------------------------------------------

  function reductionBaselineFromProfile(): ReductionBaseline | null {
    const loaded = durable.load();
    const snapshot = savedUseProfile(loaded.calculations, loaded.snapshot, ownerId);
    if (snapshot === null || snapshot.snapshot.kind !== 'use_profile') return null;
    const profile = snapshot.snapshot.profile;
    const useDays = profile.thcUseDaysLast30?.value ?? 0;
    return {
      thcUseDaysLast30: useDays,
      sessionsPerUseDay: profile.sessionsPerUseDay?.value ?? null,
      products: [...profile.products],
      routes: [...profile.routes],
      currentPatternDuration: profile.currentPatternDuration?.value ?? null,
    };
  }

  function reductionStrategyFromProfile(): ThcStrategy {
    return { avoidConcentrates: false, lowerPotency: false, lowerAmount: false };
  }

  function upsertReductionPlan(plan: ReductionPlan): void {
    const current = durable.load().reductionRecords;
    try {
      durable.saveReductionRecords([plan, ...current.filter((item) => item.id !== plan.id)]);
    } catch {
      // Quota or adapter failure must not crash the shell.
    }
  }

  /** Starts an active reduction plan (origin `direct`) from the saved profile. */
  function startReductionFromProfile(
    limits: ReductionLimits,
    strategy: ThcStrategy,
  ): boolean {
    if (liveReductionPlan !== null) return false;
    const baseline = reductionBaselineFromProfile();
    if (baseline === null) return false;
    const nowAt = clock.now();
    const plan = createReductionPlan({
      id: newRecordId('reduction', nowAt),
      origin: 'direct',
      limits,
      strategy,
      baseline,
      now: nowAt,
      utcOffsetMinutes: -new Date().getTimezoneOffset(),
    });
    upsertReductionPlan(plan);
    // A v1 limit-only record is superseded by the real plan.
    try {
      durable.saveReductionPlan(null);
    } catch {
      // Best-effort cleanup.
    }
    markResult('acknowledged');
    dispatch({ type: 'select_tab', tab: 'today' });
    setFlow(null);
    refresh();
    return true;
  }

  /** Recommits limits/strategy on the live plan (used by the edit sheet). */
  function recommitLiveReduction(limits: ReductionLimits, strategy: ThcStrategy): boolean {
    const live = currentLiveReductionPlan(durable.load().reductionRecords);
    if (live === null || live.status === 'ended') return false;
    const updated = recommitReductionPlan({
      plan: live,
      limits,
      strategy,
      now: clock.now(),
      utcOffsetMinutes: -new Date().getTimezoneOffset(),
    });
    upsertReductionPlan(updated);
    setFlow(null);
    refresh();
    return true;
  }

  /** Opens the reduction start/edit sheet: creates when no live plan exists,
   * otherwise the sheet commits the edited limits/strategy. */
  function openRecommitReduction(): void {
    setFlow({ kind: 'reduction-start' });
  }

  /** Opens the quick THC-use log sheet for the live plan. */
  function openLogUse(): void {
    setFlow({ kind: 'log-use' });
  }

  function pauseLiveReduction(): void {
    const live = currentLiveReductionPlan(durable.load().reductionRecords);
    if (live === null) return;
    upsertReductionPlan(pauseReductionPlan(live, clock.now()));
    refresh();
  }

  function resumeLiveReduction(): void {
    const live = currentLiveReductionPlan(durable.load().reductionRecords);
    if (live === null) return;
    upsertReductionPlan(
      resumeReductionPlan(live, clock.now(), -new Date().getTimezoneOffset()),
    );
    refresh();
  }

  function endLiveReduction(): void {
    const live = currentLiveReductionPlan(durable.load().reductionRecords);
    if (live === null) return;
    upsertReductionPlan(endReductionPlan(live, clock.now()));
    refresh();
  }

  function logReductionUseEvent(
    planId: string,
    usedAt: Instant,
    product: ProductKind,
    route: Route,
  ): boolean {
    const plans = durable.load().reductionRecords;
    const plan = plans.find((item) => item.id === planId);
    if (plan === undefined || plan.status === 'ended') return false;
    const nowAt = clock.now();
    const event: UseEvent = {
      id: newRecordId('use', nowAt),
      usedAt,
      product,
      route,
      createdAt: nowAt,
      // The offset where the session was logged, so the day it is counted
      // against survives a later daylight-saving change.
      utcOffsetMinutes: -new Date(usedAt).getTimezoneOffset(),
    };
    const updated = appendReductionUseEvent({
      plan,
      event,
      now: nowAt,
      utcOffsetMinutes: -new Date().getTimezoneOffset(),
    });
    upsertReductionPlan(updated);
    refresh();
    // A logged THC use on the reduction tracker is a return after the break:
    // offer the one-time outcome rating for an eligible completed break.
    offerOutcomeAfterReturn(usedAt);
    return true;
  }

  function deleteReductionUse(planId: string, eventId: string): void {
    const plan = durable.load().reductionRecords.find((item) => item.id === planId);
    if (plan === undefined) return;
    upsertReductionPlan(removeReductionUseEvent({
      plan, eventId, now: clock.now(), utcOffsetMinutes: -new Date().getTimezoneOffset(),
    }));
    // Correct counts only. Historical calculation results remain immutable.
    refresh();
  }

  /** Persists the outcome score as a linked PreviousBreak and marks the
   * attempt captured. Guards: one mark per attempt, ever. */
  function saveOutcomeScore(attempt: StoredAttempt, score: number): void {
    const nowAt = clock.now();
    const current = durable.load();
    if (current.outcomeMarks.some((mark) => mark.attemptId === attempt.id)) {
      setOutcomeAttempt(null);
      return;
    }
    const endedSegment = attempt.segments[attempt.segments.length - 1];
    const endedAt = endedSegment !== undefined && endedSegment.endedAt !== null ? endedSegment.endedAt : attempt.updatedAt;
    // The rating describes the abstinence that actually happened, so the linked
    // previous break records the elapsed days rather than the plan's target. A
    // segment list that yields no elapsed day keeps the target.
    const elapsedDays = lastedDays(attempt.segments, nowAt);
    const record: StoredPreviousBreak = {
      id: newRecordId('pb', nowAt),
      durationDays: elapsedDays !== null && elapsedDays >= 1 ? elapsedDays : attempt.targetDurationDays,
      toleranceReductionScore: score,
      endedAt: new Date(endedAt).toISOString(),
      createdAt: new Date(nowAt).toISOString(),
      updatedAt: nowAt,
      sourceAttemptId: attempt.id,
    };
    if (!tryWrite(() => {
      durable.putPreviousBreak(record);
      durable.saveOutcomeMarks([
        ...current.outcomeMarks,
        { attemptId: attempt.id, status: 'captured', updatedAt: nowAt },
      ]);
    })) return;
    setOutcomeAttempt(null);
    refresh();
  }

  /** Marks the attempt skipped so the app never asks again. */
  function skipOutcome(attempt: StoredAttempt): void {
    const nowAt = clock.now();
    const current = durable.load();
    if (current.outcomeMarks.some((mark) => mark.attemptId === attempt.id)) {
      setOutcomeAttempt(null);
      return;
    }
    if (!tryWrite(() => durable.saveOutcomeMarks([
      ...current.outcomeMarks,
      { attemptId: attempt.id, status: 'skipped', updatedAt: nowAt },
    ]))) return;
    setOutcomeAttempt(null);
    refresh();
  }

  function endEarly(id: string): void {
    const nowAt = clock.now();
    const outcome = endBreakEarly(readSessionState(), id, nowAt, nowAt);
    if (outcome.ok) persistBreakSession(outcome.state);
    setFlow(null);
    refresh();
  }

  function cancelPlanned(id: string): void {
    const outcome = cancelPlannedBreak(readSessionState(), id);
    if (outcome.ok) persistBreakSession(outcome.state);
    setFlow(null);
    refresh();
  }

  function stopCurrentTracking(): void {
    const tracking = currentLiveTracking(readSessionState().tracking);
    if (tracking === null) return;
    const nowAt = clock.now();
    const outcome = stopTracking(readSessionState(), tracking.id, nowAt, nowAt);
    if (outcome.ok) persistBreakSession(outcome.state);
    refresh();
  }


  function currentCheckinContext() {
    const state = readSessionState();
    const attempt = currentLiveAttempt(state.attempts);
    const track = currentLiveTracking(state.tracking);
    const owner = attempt?.status === 'active' ? attempt : track?.status === 'tracking' ? track : null;
    const at = clock.now();
    return { state, at, owner, index: latestTodayCheckin(state.checkins, owner ? currentSegmentAnchor(owner.segments) : null, at) };
  }

  function saveNoUse(): void {
    const { state, at, owner, index } = currentCheckinContext();
    if (owner === null || index >= 0) return;
    persistBreakSession(recordNoUseCheckin(state, at));
    refresh();
  }

  function undoCheckin(): void {
    const { state, index } = currentCheckinContext();
    if (index < 0) return;
    // Remove exactly the latest entry. Earlier ratings and other days survive.
    try { durable.saveCheckins(state.checkins.filter((_, i) => i !== index)); } catch { /* Storage status is shown by the shell. */ }
    refresh();
  }

  // --- questionnaire plumbing (unchanged behaviour) ------------------------

  function persist(next: QuestionnaireSession): void {
    const answered = countSubstantiveAnswers(next.answers, clock.now());
    if (answered < 1) {
      progress.clear();
      return;
    }
    progress.save({
      schemaVersion: QUESTIONNAIRE_PROGRESS_SCHEMA_VERSION,
      answeredSteps: answered,
      updatedAt: clock.now(),
      currentStep: next.currentStep,
      answers: next.answers,
    });
  }

  function openStart() {
    setLastUseWarning(false);
    setSession(startSession());
  }

  function openGoal(goal: Goal) {
    const next = startSession(goal);
    persist(next);
    setLastUseWarning(false);
    setSession(next);
    refresh();
  }

  function openResume() {
    const loaded = progress.load();
    if (loaded === null) return;
    const nowAt = clock.now();
    const currentStep = restoreStep(loaded.answers, nowAt, loaded.currentStep);
    setLastUseWarning(lastUseNeedsReselect(loaded.answers, nowAt));
    setSession({ currentStep, answers: loaded.answers });
  }

  function closeSession() {
    if (session !== null) persist(session);
    setSession(null);
    setLastUseWarning(false);
    refresh();
  }

  /** Abandon an unfinished questionnaire without touching a saved profile or live plan. */
  function abandonDraft() {
    progress.clear();
    setSession(null);
    setLastUseWarning(false);
    refresh();
  }

  /** Recovery for a snapshot that cannot produce a result. Keeps any live plan. */
  function resetFailedCalculation() {
    progress.clear();
    if (!tryWrite(() => durable.saveSnapshot(null))) return;
    resultViews.clear();
    setSession(null);
    setLastUseWarning(false);
    setFlow(null);
    refresh();
  }

  function editFromResult(step: QuestionnaireStepId) {
    if (snapshotRecord === null) return;
    const answers = answersFromSnapshot(snapshotRecord.snapshot);
    const nowAt = clock.now();
    const next = { currentStep: restoreStep(answers, nowAt, step), answers };
    persist(next);
    setSession(next);
    setLastUseWarning(lastUseNeedsReselect(answers, nowAt));
    refresh();
  }

  function seeBreakRange() {
    if (snapshotRecord === null) return;
    const prior = answersFromSnapshot(snapshotRecord.snapshot);
    const answers = { ...prior, goal: 'tolerance_reset' as const, breakRequested: undefined };
    const next = { currentStep: restoreStep(answers, clock.now()), answers };
    persist(next);
    setSession(next);
    refresh();
  }

  function checkAnotherTest() {
    if (snapshotRecord === null) return;
    const answers = answersFromSnapshot(snapshotRecord.snapshot);
    const next = { currentStep: 'Q2D' as const, answers };
    persist(next);
    setSession(next);
    refresh();
  }

  function breakRecommendation() {
    const next = startSession('tolerance_reset');
    persist(next);
    setSession(next);
    refresh();
  }

  /** Explicit recalculation with the saved answers preloaded. */
  function openRecalculate() {
    const source = showResult ? snapshotRecord : profileSnapshot ?? snapshotRecord;
    if (source === null) return;
    const answers = answersFromSnapshot(source.snapshot);
    const nowAt = clock.now();
    const next = { currentStep: 'Q1' as const, answers };
    persist(next);
    setSession(next);
    setLastUseWarning(lastUseNeedsReselect(answers, nowAt));
    setFlow(null);
    refresh();
  }

  function goBack() {
    if (session === null) return;
    const prev = previousStep(session.currentStep, session.answers);
    if (prev === null) return;
    const next = { currentStep: prev, answers: session.answers };
    persist(next);
    setSession(next);
  }

  function submitAnswer(answer: StepAnswer) {
    if (session === null) return;
    const nowAt = clock.now();
    const answers = applyAnswer(session.answers, answer, nowAt);
    const warning = lastUseNeedsReselect(answers, nowAt);
    setLastUseWarning(warning);
    const dest = nextDestination(answer.step, answers, nowAt);
    if (dest === 'TERMINAL') {
      const finished = finishQuestionnaire(answers, nowAt);
      if (finished.status === 'complete') {
        const runId = newRecordId('calc', nowAt);
        const frozen = freezeCalculation(runId, finished.snapshot, nowAt);
        if (!tryWrite(() => {
          durable.putCalculation(frozen);
          durable.saveSnapshot({
            schemaVersion: QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION,
            snapshot: finished.snapshot,
            updatedAt: nowAt,
            runId: frozen.id,
          });
        })) return;
        progress.clear();
        markResult('open');
        setSession(null);
        setLastUseWarning(false);
        // A finished break plan is the moment the app can ask what to help
        // with; a drug-test question has no daily advice to personalise.
        // A finished plan is the moment to ask what to help with: nothing
        // chosen yet, or a list kept from an earlier break to review.
        if (finished.snapshot.kind === 'use_profile' && supportNeedsReview) setSupportOpen(true);
        refresh();
        return;
      }
      const resumeAt = finished.currentStep;
      const next = { currentStep: resumeAt, answers };
      persist(next);
      setSession(next);
      setLastUseWarning(lastUseNeedsReselect(answers, nowAt));
      refresh();
      return;
    }
    const next = { currentStep: dest, answers };
    persist(next);
    setSession(next);
    refresh();
  }

  function openRecalculateFrom(record: CalculationRecord, step?: QuestionnaireStepId) {
    const answers = answersFromSnapshot(record.snapshot);
    const nowAt = clock.now();
    const next = { currentStep: restoreStep(answers, nowAt, step), answers };
    persist(next);
    setSession(next);
    setLastUseWarning(lastUseNeedsReselect(answers, nowAt));
    setFlow(null);
    refresh();
  }

  function recalculateWithHistory() {
    if (snapshotRecord === null || snapshotRecord.snapshot.kind !== 'use_profile') return;
    const nowAt = clock.now();
    const previous = durable.load().previousBreaks;
    const merged = withPreviousBreaks(snapshotRecord.snapshot, previous.map(toPreviousBreakInput));
    const frozen = freezeCalculation(newRecordId('calc', nowAt), merged, nowAt);
    if (!tryWrite(() => {
      durable.putCalculation(frozen);
      durable.saveSnapshot({
        ...snapshotRecord,
        snapshot: merged,
        runId: frozen.id,
        updatedAt: nowAt,
      });
    })) return;
    markResult('open');
    setFlow(null);
    refresh();
  }

  function savePreviousBreak(draft: PreviousBreakDraft, addAnother: boolean) {
    const nowAt = clock.now();
    const editing = flow?.kind === 'previous-break' ? flow.editId : null;
    const existing = editing === null ? null : findPreviousBreak(durable.load(), editing);
    const id = existing?.id ?? newRecordId('pb', nowAt);
    if (!tryWrite(() => durable.putPreviousBreak({
      ...existing,
      id,
      durationDays: draft.durationDays,
      toleranceReductionScore: draft.toleranceReductionScore,
      endedAt: draft.endedAt,
      createdAt: existing?.createdAt ?? createdAtIso(nowAt),
      updatedAt: nowAt,
    }))) return;
    if (addAnother) {
      setPreviousBreakRevision((value) => value + 1);
      setFlow({ kind: 'previous-break', editId: null });
      refresh();
      return;
    }
    setFlow(null);
    refresh();
  }

  function snapshotIncludesPreviousBreaks(): boolean {
    const previous = durableSnap.previousBreaks;
    if (previous.length === 0) return true;
    if (snapshotRecord === null || snapshotRecord.snapshot.kind !== 'use_profile') return false;
    const ids = new Set(snapshotRecord.snapshot.profile.previousBreaks.map((item) => item.id));
    return previous.every((item) => ids.has(item.id));
  }

  const canRecalculateWithHistory =
    resultModel?.kind === 'tolerance_result' && durableSnap.previousBreaks.length > 0 && !snapshotIncludesPreviousBreaks();

  function skipOptionalLastUse() {
    submitAnswer({ step: 'Q3-opt', value: { skip: true } });
  }

  // --- local backup (export / restore) -------------------------------------

  function exportData(): void {
    const nowAt = clock.now();
    const file = createBackup({ durable, adapter: storage }, { exportedAt: nowAt, appVersion: APP_VERSION });
    const name = backupFileName(nowAt);
    try {
      saveBackupFile(name, serializeBackup(file));
      setBackupStatus({ kind: 'exported', fileName: name });
    } catch {
      setBackupStatus({ kind: 'export_failed' });
    }
  }

  async function restoreData(): Promise<void> {
    const picked = await pickBackupFile();
    if (picked === null) return;
    const result = parseBackup(picked.text);
    if (!result.ok) {
      setPendingRestore(null);
      setBackupStatus({ kind: 'rejected', error: result.error });
      return;
    }
    setBackupStatus(null);
    setPendingRestore({ fileName: picked.name, backup: result.backup });
  }

  function confirmRestore(): void {
    if (pendingRestore === null) return;
    const fileName = pendingRestore.fileName;
    applyBackup({ durable, adapter: storage }, pendingRestore.backup);
    setSession(null);
    setFlow(null);
    setScienceOpen(false);
    setOutcomeAttempt(null);
    setPendingRestore(null);
    setBackupStatus({ kind: 'restored', fileName });
    refresh();
  }

  // --- render --------------------------------------------------------------

  const canStartPlan = liveAttempt === null && liveTracking === null && liveReductionPlan === null;
  const breakSheetTarget = toleranceTargetDays(resultModel ?? profileView);
  const breakDayAtStart = anchor === null ? 1 : abstinenceDayAt(now, anchor);
  const breakSheetTargetDays =
    flow?.kind === 'break-start' && flow.customDays !== null ? flow.customDays : (breakSheetTarget ?? 0);
  const flowTrack = liveTracking?.status === 'tracking' ? liveTracking : null;


  // The open flow, but only while it can actually render its dialog. An
  // unrenderable flow would leave the background inert with no dialog, no
  // Escape handler and no close action; the app would freeze with no way out.
  const openFlow =
    flow !== null &&
    flowRendersDialog(flow, {
      targetDays: breakSheetTargetDays,
      track: flowTrack,
      segmentStart: flow.kind === 'confirm-use' ? flow.segmentStart : null,
      reductionPlan: liveReductionPlan,
    })
      ? flow
      : null;

  const overlayOpen =
    session !== null || (resultModel !== null && openFlow === null) || openFlow !== null || shell.settingsOpen || scienceOpen || outcomeAttempt !== null || supportOpen || urgeOpen;
  // One passive notice at a time: a storage problem outranks the install hint.
  const showInstallHint =
    !overlayOpen &&
    persistent &&
    !storageWriteFailed &&
    !installHintDismissed &&
    durableSnap.calculations.length > 0 &&
    !isStandaloneDisplay();

  return (
    <>
      {!persistent ? (
        <StorageBanner />
      ) : storageWriteFailed ? (
        <StorageBanner variant="write-failed" />
      ) : null}
      <Shell
        shell={shell}
        banner={
          updateReady && !overlayOpen ? (
            <UpdateSnackbar
              onReload={() => onReloadUpdate?.()}
              onDismiss={() => onDismissUpdate?.()}
            />
          ) : showInstallHint ? (
            <InstallHint
              onDismiss={() => {
                try {
                  storage.setItem(INSTALL_HINT_DISMISSED_KEY, '1');
                } catch {
                  /* Storage status is shown by the shell. */
                }
                setInstallHintDismissed(true);
              }}
            />
          ) : null
        }
        onSelectTab={(tab: AppTab) => dispatch({ type: 'select_tab', tab })}
        onOpenSettings={() => dispatch({ type: 'open_settings' })}
        onOpenScience={() => { setScienceFromSettings(false); setScienceOpen(true); }}
      >
        {shell.activeTab === 'today' ? (
          <TodayScreen
            view={view}
            draft={facts.draft}
            onOpenNewPlan={() => setFlow({ kind: 'new-plan' })}
            support={{
              focus,
              pickedArea,
              count: liveBreak === null ? storedCompanion.supportAreas.length : focus.areas.length,
              onPickArea: pickSupportArea,
              onUseLast: reuseSupportAreas,
              onChange: () => setSupportOpen(true),
            }}
            urge={{ running: runningUrge, now, onOpen: () => { setUrgeFocusId(null); setUrgeOpen(true); } }}
            reminder={{ due: reminderDue, time: reminder?.time ?? null }}
            live={liveData}
            profile={profileData}
            onStartOver={abandonDraft}
            onGetStarted={openStart}
            onSelectGoal={openGoal}
            onResume={openResume}
            onViewResult={
              snapshotRecord !== null
                ? () => {
                    if (profileSnapshot !== null && !tryWrite(() => durable.saveSnapshot(profileSnapshot))) return;
                    markResult('open');
                    refresh();
                  }
                : undefined
            }
            onStartBreak={openBreakStart}
            onRecalculate={openRecalculate}
            onSeeBreakRange={seeBreakRange}
            onStartTracking={startTracking}
            onCheckIn={saveNoUse}
            onUndoCheckin={undoCheckin}
            onConfirmWhen={confirmWhen}
            onDismissUnconfirmedUse={dismissUnconfirmedUse}
            onEndEarly={endEarly}
            onCancelPlanned={cancelPlanned}
            onOpenTrackingDetail={openTrackingDetail}
            onMarkComplete={markComplete}
            onAcknowledgeComplete={acknowledgeCompletion}
            onStopTracking={stopCurrentTracking}
            onOpenReductionStart={() => setFlow({ kind: 'reduction-start' })}
            onLogUse={openLogUse}
            onPauseReduction={pauseLiveReduction}
            onResumeReduction={resumeLiveReduction}
            onEndReduction={endLiveReduction}
            onRecommitReduction={openRecommitReduction}
          />
        ) : (
          <HistoryScreen
            snapshot={durableSnap}
            now={now}
            onSelectGoal={openGoal}
            onAddPastBreak={() => setFlow({ kind: 'previous-break', editId: null })}
            onEditPastBreak={(id) => setFlow({ kind: 'previous-break', editId: id })}
            onDelete={(kind, id) => {
              deleteHistoryRecord(durable, kind, id);
              refresh();
            }}
            onRecalculate={openRecalculateFrom}
            onRemoveReductionEvent={deleteReductionUse}
          />
        )}
      </Shell>
      {session !== null ? (
        <QuestionnaireFlow
          session={session}
          now={now}
          lastUseWarning={lastUseWarning}
          onSession={(next) => {
            setSession(next);
            persist(next);
          }}
          onAnswerAndAdvance={submitAnswer}
          onClose={closeSession}
          onBack={goBack}
          onContinue={submitAnswer}
          onSkip={skipOptionalLastUse}
        />
      ) : null}
      {resultModel !== null && flow === null ? (
        <ResultScreen
          view={resultModel}
          runningPlanNotice={!canStartPlan && (resultModel.kind === 'tolerance_result' || resultModel.kind === 'abstinence_planning' || resultModel.kind === 'baseline_low')}
          onAcknowledge={acknowledgeResult}
          onEditStep={editFromResult}
          onSeeBreakRange={seeBreakRange}
          onCheckAnotherTest={checkAnotherTest}
          onBreakRecommendation={breakRecommendation}
          onDetectionBasics={() => openGoal('detection_information')}
          onStartOver={resetFailedCalculation}
          onStartBreak={canStartPlan ? openBreakStart : undefined}
          onStartTracking={canStartPlan ? startTracking : undefined}
          onStartReduction={canStartPlan ? () => setFlow({ kind: 'reduction-start' }) : undefined}
          trackingAvailable={resultModel.kind === 'baseline_low' ? anchor !== null : true}
          outlookRecord={liveResultRecord}
          onAddPastBreak={
            resultModel.kind === 'tolerance_result' ? () => setFlow({ kind: 'previous-break', editId: null }) : undefined
          }
          onRecalculateWithHistory={canRecalculateWithHistory ? recalculateWithHistory : undefined}
        />
      ) : null}
      {/* Asked once after a calculation finishes, then editable from Today's
          footer. Over the result rather than inside a flow, so the plan the
          person just calculated stays visible behind it. */}
      {supportOpen ? (
        <SupportAreasSheet
          initialAreas={storedCompanion.supportAreas}
          carried={carriedTopics}
          onSave={saveSupportAreas}
          onClose={() => setSupportOpen(false)}
        />
      ) : null}
      {urgeOpen ? (
        <RideItOut
          session={urgeFocus ?? runningUrge}
          now={now}
          replacement={
            liveAttempt?.preparation?.replacementAction?.trim()
            ?? liveTracking?.preparation?.replacementAction?.trim()
            ?? ''
          }
          summary={summariseUrgeSessions(urgeSessions, now)}
          onStart={startUrge}
          onFinish={finishUrge}
          onStop={stopUrge}
          onClose={closeUrge}
        />
      ) : null}
      {openFlow !== null && openFlow.kind === 'new-plan' ? (
        <NewPlanSheet
          draft={draft}
          hasSavedPlan={profileSnapshot !== null}
          onSelectGoal={(goal) => {
            setFlow(null);
            openGoal(goal);
          }}
          onChooseLength={() => setFlow({ kind: 'choose-break-days' })}
          onResume={() => {
            setFlow(null);
            openResume();
          }}
          onDiscardDraft={abandonDraft}
          onViewSavedPlan={() => {
            if (profileSnapshot === null || !tryWrite(() => durable.saveSnapshot(profileSnapshot))) return;
            progress.clear();
            markResult('open');
            setFlow(null);
            refresh();
          }}
          onClose={() => setFlow(null)}
        />
      ) : null}
      {openFlow !== null && openFlow.kind !== 'previous-break' && openFlow.kind !== 'new-plan' ? (
        <FlowRenderer
          flow={openFlow}
          targetDays={breakSheetTargetDays}
          breakDayAtStart={openFlow.kind === 'break-start' && openFlow.customDays !== null ? 1 : breakDayAtStart}
          now={now}
          track={flowTrack}
          anchor={anchor}
          segmentStart={openFlow.kind === 'confirm-use' ? openFlow.segmentStart : null}
          onClose={() => setFlow(null)}
          onStartBreak={startPlan}
          onChooseBreakDays={confirmChosenDays}
          canStartPlan={canStartPlan}
          onConfirmUse={confirmUse}
          onRecalculate={openRecalculate}
          checkins={sessionState.checkins}
          preparation={liveAttempt?.preparation ?? liveTracking?.preparation ?? null}
          profile={
            companionSnapshot !== null && companionSnapshot.snapshot.kind === 'use_profile'
              ? companionSnapshot.snapshot.profile
              : null
          }
          reductionPlan={liveReductionPlan}
          savedReductionLimits={reductionPlan}
          onStartReduction={startReductionFromProfile}
          onCommitReduction={recommitLiveReduction}
          onLogReductionUse={(planId, usedAt, product, route) =>
            logReductionUseEvent(planId, usedAt, product, route)
          }
        />
      ) : null}
      {openFlow?.kind === 'previous-break' ? (
        <PreviousBreakSheet
          key={`${openFlow.editId ?? "new"}-${previousBreakRevision}`}
          now={now}
          initial={openFlow.editId === null ? null : findPreviousBreak(durableSnap, openFlow.editId)}
          onSave={savePreviousBreak}
          onDelete={
            openFlow.editId === null
              ? undefined
              : () => {
                  deleteHistoryRecord(durable, 'previous-break', openFlow.editId!);
                  setFlow(null);
                  refresh();
                }
          }
          onClose={() => setFlow(null)}
        />
      ) : null}
      {outcomeAttempt !== null ? (
        <OutcomeCapture
          attempt={outcomeAttempt}
          onSave={saveOutcomeScore}
          onSkip={skipOutcome}
          onClose={() => setOutcomeAttempt(null)}
        />
      ) : null}
      {scienceOpen ? (
        <ScienceBasicsPanel onClose={() => { setScienceOpen(false); if (scienceFromSettings) dispatch({ type: 'open_settings' }); }} />
      ) : null}
      <SettingsModal
        open={shell.settingsOpen}
        persistent={persistent}
        storageWriteFailed={storageWriteFailed}
        reminder={reminder}
        onSaveReminder={saveReminder}
        updateStatus={updateStatus}
        onUpdateNow={() => onUpdateNow?.()}
        onOpenScience={() => {
          dispatch({ type: 'close_settings' });
          setScienceFromSettings(true);
          setScienceOpen(true);
        }}
        onClose={() => {
          setPendingRestore(null);
          dispatch({ type: 'close_settings' });
        }}
        onExportData={exportData}
        onRestoreData={() => {
          void restoreData();
        }}
        backupStatus={backupStatus}
        pendingRestore={
          pendingRestore === null
            ? null
            : { fileName: pendingRestore.fileName, counts: backupCounts(pendingRestore.backup) }
        }
        onConfirmRestore={confirmRestore}
        onCancelRestore={() => setPendingRestore(null)}
        onDeleteEverything={() => {
          deleteAllLocalData(storage, durable);
          setSession(null);
          setFlow(null);
          setScienceOpen(false);
          refresh();
          dispatch({ type: 'close_settings' });
        }}
      />
    </>
  );
}

/**
 * Whether an open flow can render its own dialog. Each `FlowRenderer` branch
 * returns null when the input it needs is missing, and a flow that renders
 * nothing is worse than no flow: the shell treats *any* open flow as an overlay
 * and makes the background inert, so with no dialog on screen there is no
 * Escape handler, no focus trap and no close action — the app would freeze with
 * no way out. Every caller supplies what its flow needs, so this is unreachable
 * from the UI today; the gate keeps a future caller from getting there, and the
 * two must agree whenever a branch changes.
 */
export function flowRendersDialog(
  flow: Flow,
  inputs: {
    readonly targetDays: number;
    readonly track: StoredTrack | null;
    readonly segmentStart: Instant | null;
    readonly reductionPlan: ReductionPlan | null;
  },
): boolean {
  switch (flow.kind) {
    case 'break-start':
      return inputs.targetDays >= 1;
    case 'tracking-detail':
      return inputs.track !== null;
    case 'confirm-use':
      return inputs.segmentStart !== null;
    case 'log-use':
      return inputs.reductionPlan !== null;
    default:
      return true;
  }
}

function FlowRenderer({
  flow,
  targetDays,
  breakDayAtStart,
  now,
  track,
  anchor,
  segmentStart,
  onClose,
  onStartBreak,
  onChooseBreakDays,
  canStartPlan,
  onConfirmUse,
  onRecalculate,
  checkins,
  preparation,
  profile,
  reductionPlan,
  savedReductionLimits,
  onStartReduction,
  onCommitReduction,
  onLogReductionUse,
}: {
  readonly flow: Flow;
  readonly targetDays: number;
  readonly breakDayAtStart: number;
  readonly now: Instant;
  readonly track: StoredTrack | null;
  readonly anchor: Instant | null;
  readonly segmentStart: Instant | null;
  readonly onClose: () => void;
  readonly onStartBreak: (mode: PostBreakMode, startAt: Instant, preparation: BreakPreparation | null) => void;
  readonly onChooseBreakDays: (days: number) => void;
  readonly canStartPlan: boolean;
  readonly onConfirmUse: (scope: ConfirmScope, usedAt: Instant, usedAtIso: string) => boolean;
  readonly onRecalculate: () => void;
  readonly checkins: readonly import('../domain/schemas/profile.ts').DailyCheckin[];
  readonly preparation: BreakPreparation | null;
  readonly profile: import('../domain/schemas/profile.ts').UseProfileInput | null;
  readonly reductionPlan: ReductionPlan | null;
  readonly savedReductionLimits: ReductionLimits | null;
  readonly onStartReduction: (limits: ReductionLimits, strategy: ThcStrategy) => boolean;
  readonly onCommitReduction: (limits: ReductionLimits, strategy: ThcStrategy) => boolean;
  readonly onLogReductionUse: (planId: string, usedAt: Instant, product: ProductKind, route: Route) => boolean;
}) {
  switch (flow.kind) {
    case 'choose-break-days':
      return (
        <ChooseBreakDays
          canStart={canStartPlan}
          onStart={onChooseBreakDays}
          onClose={onClose}
        />
      );
    case 'break-start':
      return targetDays >= 1 ? (
        <BreakStartSheet
          targetDays={targetDays}
          breakDayAtStart={breakDayAtStart}
          now={now}
          onStart={onStartBreak}
          onClose={onClose}
        />
      ) : null;
    case 'tracking-detail':
      return track !== null ? (
        <TrackingDetail
          track={track}
          now={now}
          checkins={checkins}
          onBack={onClose}
          profile={profile}
        />
      ) : null;
    case 'confirm-use': {
      if (segmentStart === null) return null;
      const scope = flow.scope;
      return (
        <ConfirmUse
          scope={scope}
          segmentStart={segmentStart}
          now={now}
          preparation={preparation}
          onConfirm={(usedAt, iso) => onConfirmUse(scope, usedAt, iso)}
          onClose={onClose}
          onRecalculate={onRecalculate}
        />
      );
    }
    case 'detox-evidence':
      return <DetoxEvidencePanel onClose={onClose} />;
    case 'previous-break':
      return null;
    case 'reduction-start':
      return (
        <ReductionStartSheet
          now={now}
          profile={profile}
          existing={reductionPlan}
          savedLimits={savedReductionLimits}
          onStart={onStartReduction}
          onCommit={onCommitReduction}
          onClose={onClose}
        />
      );
    case 'log-use':
      return reductionPlan !== null ? (
        <LogUseSheet
          plan={reductionPlan}
          now={now}
          onLog={(usedAt, product, route) =>
            onLogReductionUse(reductionPlan.id, usedAt, product, route)
          }
          onClose={onClose}
        />
      ) : null;
  }
}

function findLegacyCompanion(snapshot: ReturnType<DurablePersistence['load']>): CompanionPersonalisationV1 | null {
  if (snapshot.snapshot?.snapshot.kind === 'use_profile' && snapshot.snapshot.snapshot.companion !== undefined) {
    return snapshot.snapshot.snapshot.companion;
  }
  for (const calculation of snapshot.calculations) {
    if (calculation.snapshot.kind === 'use_profile' && calculation.snapshot.companion !== undefined) {
      return calculation.snapshot.companion;
    }
  }
  return null;
}

/** Preferred-target days from a tolerance result view, or null. */
function toleranceTargetDays(view: ResultView | null): number | null {
  if (view === null || view.kind !== 'tolerance_result') return null;
  return view.preferredTargetDays;
}

function profileAnchor(snapshot: QuestionnaireSnapshotRecord | null): Instant | null {
  if (snapshot === null || snapshot.snapshot.kind !== 'use_profile') return null;
  const iso = snapshot.snapshot.profile.lastUseAt.value;
  if (iso === null) return null;
  return parseSubmittedTimestamp(iso);
}
