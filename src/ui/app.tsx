import { useEffect, useMemo, useReducer, useState } from 'preact/hooks';
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
  updatePostBreakPlan,
  type BreakSessionState,
  type CheckinSymptoms,
} from '../application/break/break-session.ts';
import type { PostBreakPlan } from '../application/break/post-break-plan.ts';
import { buildTodayFacts } from '../application/break/today-model.ts';
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
import {
  DEFAULT_REDUCTION_DAYS_PER_WEEK,
  DEFAULT_REDUCTION_SESSIONS,
  REDUCTION_PLAN_SCHEMA_VERSION,
} from '../application/progress/reduction-plan.ts';
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
import { toPreviousBreakInput } from '../application/persistence/previous-break-store.ts';
import { findPreviousBreak } from '../application/history/history-model.ts';
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
import type { Goal, PostBreakMode } from '../domain/schemas/enums.ts';
import { parseSubmittedTimestamp, type Instant } from '../domain/schemas/time.ts';
import { abstinenceDayAt } from '../domain/breaks/break-time.ts';
import { systemClock, type Clock } from '../infrastructure/clock.ts';
import type { StorageAdapter } from '../infrastructure/storage/storage-adapter.ts';
import { BreakStartSheet } from './break-start-sheet.tsx';
import { CheckInFlow } from './checkin-flow.tsx';
import { ConfirmUse, type ConfirmScope } from './confirm-use.tsx';
import { PlanDetail } from './plan-detail.tsx';
import { HistoryScreen } from './history-screen.tsx';
import { QuestionnaireFlow } from './questionnaire-flow.tsx';
import { ResultScreen } from './result-screen.tsx';
import { SettingsModal } from './settings-modal.tsx';
import { Shell } from './shell.tsx';
import { TodayScreen, type TodayLiveData, type TodayProfileData } from './today-screen.tsx';
import {
  applyAnswer,
  countAnsweredSteps,
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

export type Flow =
  | { readonly kind: 'break-start' }
  | { readonly kind: 'plan-detail' }
  | { readonly kind: 'checkin' }
  | { readonly kind: 'confirm-use'; readonly scope: ConfirmScope; readonly segmentStart: Instant }
  | { readonly kind: 'previous-break'; readonly editId: string | null };

export interface AppProps {
  readonly storage: StorageAdapter;
  readonly clock?: Clock;
  readonly durable?: DurablePersistence;
  readonly persistent?: boolean;
  readonly updateReady?: boolean;
  readonly onReloadUpdate?: () => void;
  readonly onDismissUpdate?: () => void;
}

export function App({
  storage,
  clock = systemClock,
  durable: durableProp,
  persistent = true,
  updateReady = false,
  onReloadUpdate,
  onDismissUpdate,
}: AppProps) {
  const [shell, dispatch] = useReducer(shellReducer, INITIAL_SHELL_STATE);
  const progress = useMemo(() => createQuestionnaireProgressStore(storage), [storage]);
  const resultViews = useMemo(() => createResultViewStore(storage), [storage]);
  const durable = useMemo(
    () =>
      durableProp ??
      createWebBackedDurable(storage, {
        persistent,
        backend: persistent ? 'web-storage' : 'memory',
      }),
    [durableProp, storage, persistent],
  );
  const [factsEpoch, setFactsEpoch] = useState(0);
  const [session, setSession] = useState<QuestionnaireSession | null>(null);
  const [lastUseWarning, setLastUseWarning] = useState(false);
  const [flow, setFlow] = useState<Flow | null>(null);
  const [now, setNow] = useState<Instant>(() => clock.now());
  const [installHintDismissed, setInstallHintDismissed] = useState(false);

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

  const snapshotRecord = useMemo(() => {
    const loaded = durable.load();
    // v0.3.x snapshots never stored a calculation id. Materialize once.
    // A snapshot that already has runId but no matching row was deleted.
    if (loaded.snapshot !== null && loaded.snapshot.runId === undefined) {
      ensureCalculationFromSnapshot(durable, loaded.snapshot);
      return durable.load().snapshot;
    }
    return loaded.snapshot;
  }, [durable, factsEpoch]);
  const resultRecord = useMemo(() => resultViews.load(), [resultViews, factsEpoch]);
  const draft = useMemo(() => progress.load(), [progress, factsEpoch]);
  const durableSnap = useMemo(() => durable.load(), [durable, factsEpoch]);
  const attemptsRecord = durableSnap.attempts;
  const trackingRecord = durableSnap.tracking;
  const checkinsRecord = durableSnap.checkins;
  const reductionPlan = durableSnap.reductionPlan;

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

  // Activate any planned break whose start has arrived. Re-read stores so a
  // stale tab cannot resurrect a cancelled plan over a newer write.
  useEffect(() => {
    const current = readSessionState();
    const anchor = profileAnchor(durable.load().snapshot);
    const activated = activateDuePlans(current, () => anchor, now);
    if (activated !== current) {
      persistBreakSession(activated);
      refresh();
    }
  }, [factsEpoch, now, attemptsRecord, trackingRecord, checkinsRecord, snapshotRecord, durable]);

  const snapshotFacts = todayFactsFromSnapshot(snapshotRecord?.snapshot ?? null);
  const acknowledged = resultRecord?.status === 'acknowledged';
  const facts: TodayFacts = buildTodayFacts({
    snapshotFacts: acknowledged ? snapshotFacts : {},
    attempts: sessionState.attempts,
    tracking: sessionState.tracking,
    draft,
  });
  const view = resolveTodayState(facts);

  const showResult =
    session === null &&
    snapshotRecord !== null &&
    draft === null &&
    resultRecord?.status !== 'acknowledged';
  const resultModel: ResultView | null = showResult && snapshotRecord !== null
    ? runCalculation(snapshotRecord.snapshot, now)
    : null;
  // Profile summary for the Today card (result saved and acknowledged).
  const profileView: ResultView | null =
    !showResult && acknowledged && snapshotRecord !== null && snapshotRecord.snapshot.kind === 'use_profile'
      ? runCalculation(snapshotRecord.snapshot, now)
      : null;

  const liveAttempt = currentLiveAttempt(sessionState.attempts);
  const liveTracking = currentLiveTracking(sessionState.tracking);
  const scheduled = liveAttempt?.status === 'planned' ? liveAttempt : null;
  const anchor = profileAnchor(snapshotRecord);
  const activeView = liveAttempt !== null && liveAttempt.status === 'active' ? activeBreakView(liveAttempt, now) : null;

  const liveData: TodayLiveData = {
    active: activeView !== null ? { attempt: liveAttempt!, view: activeView } : null,
    interruptedAttempt: liveAttempt?.status === 'interrupted_time_needed' ? liveAttempt : null,
    interruptedTracking: liveTracking?.status === 'interrupted_time_needed' ? liveTracking : null,
    completed: liveAttempt?.status === 'completed' ? liveAttempt : null,
    tracking:
      liveTracking !== null && liveTracking.status === 'tracking'
        ? { track: liveTracking, view: trackingDayView(liveTracking, now) }
        : null,
  };
  const profileData: TodayProfileData = {
    resultView: profileView,
    scheduled,
    plannedView: scheduled !== null ? plannedBreakView(scheduled, anchor) : null,
    reductionPlan:
      reductionPlan === null
        ? { maxUseDaysPerWeek: DEFAULT_REDUCTION_DAYS_PER_WEEK, maxSessionsPerUseDay: DEFAULT_REDUCTION_SESSIONS }
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

  function snapshotRunId(): string | null {
    if (snapshotRecord === null) return null;
    if (snapshotRecord.runId !== undefined) return snapshotRecord.runId;
    const existing = durable.load().calculations[0];
    if (existing !== undefined) {
      durable.saveSnapshot({ ...snapshotRecord, runId: existing.id, updatedAt: clock.now() });
      return existing.id;
    }
    const frozen = ensureCalculationFromSnapshot(durable, snapshotRecord);
    return frozen?.id ?? null;
  }

  /** The authoritative last-use instant from the current profile, if any. */
  function currentAnchor(): Instant | null {
    return profileAnchor(snapshotRecord);
  }

  function openBreakStart(): void {
    setFlow({ kind: 'break-start' });
  }

  function startPlan(mode: PostBreakMode, startAt: Instant): void {
    const latest = readSessionState();
    if (currentLiveAttempt(latest.attempts) !== null || currentLiveTracking(latest.tracking) !== null) {
      return;
    }
    const calcId = snapshotRunId();
    const lastUse = currentAnchor();
    if (calcId === null || lastUse === null) return;
    const viewForTarget = toleranceTargetDays(resultModel ?? profileView);
    if (viewForTarget === null) return;
    const nowAt = clock.now();
    const next = createBreakPlan(latest, {
      id: newRecordId('break', nowAt),
      calculationRecordId: calcId,
      targetDurationDays: viewForTarget,
      mode,
      planStart: startAt,
      now: nowAt,
      anchor: lastUse,
    });
    persistBreakSession(next);
    markResult('acknowledged');
    setFlow(null);
    refresh();
  }

  function startTracking(): void {
    const latest = readSessionState();
    if (currentLiveAttempt(latest.attempts) !== null || currentLiveTracking(latest.tracking) !== null) {
      return;
    }
    const lastUse = currentAnchor();
    if (lastUse === null) return;
    const calcId = snapshotRunId();
    const nowAt = clock.now();
    const next = createTracking(latest, {
      id: newRecordId('track', nowAt),
      calculationRecordId: calcId,
      startedAt: nowAt,
      anchor: lastUse,
    });
    persistBreakSession(next);
    markResult('acknowledged');
    refresh();
  }

  function openCheckIn(): void {
    setFlow({ kind: 'checkin' });
  }

  function confirmWhen(): void {
    if (liveData.interruptedAttempt !== null) {
      const start = currentSegmentAnchor(liveData.interruptedAttempt.segments);
      if (start !== null) setFlow({ kind: 'confirm-use', scope: 'attempt', segmentStart: start });
    } else if (liveData.interruptedTracking !== null) {
      const start = currentSegmentAnchor(liveData.interruptedTracking.segments);
      if (start !== null) setFlow({ kind: 'confirm-use', scope: 'tracking', segmentStart: start });
    }
  }

  function handleUseReported(): void {
    const nowAt = clock.now();
    const latest = readSessionState();
    const attempt = currentLiveAttempt(latest.attempts);
    const tracking = currentLiveTracking(latest.tracking);
    if (attempt?.status === 'interrupted_time_needed') {
      const start = currentSegmentAnchor(attempt.segments);
      if (start !== null) setFlow({ kind: 'confirm-use', scope: 'attempt', segmentStart: start });
      return;
    }
    if (tracking?.status === 'interrupted_time_needed') {
      const start = currentSegmentAnchor(tracking.segments);
      if (start !== null) setFlow({ kind: 'confirm-use', scope: 'tracking', segmentStart: start });
      return;
    }
    let scope: ConfirmScope = attempt?.status === 'active' ? 'attempt' : 'tracking';
    let segmentStart: Instant | null = null;
    if (attempt?.status === 'active') {
      const outcome = suspendBreak(latest, attempt.id, nowAt);
      if (outcome.ok) {
        persistBreakSession(outcome.state);
        segmentStart = currentSegmentAnchor(outcome.state.attempts.find((row) => row.id === attempt.id)?.segments ?? []);
      }
    } else if (tracking?.status === 'tracking') {
      const outcome = suspendTracking(latest, tracking.id, nowAt);
      if (outcome.ok) {
        persistBreakSession(outcome.state);
        scope = 'tracking';
        segmentStart = currentSegmentAnchor(outcome.state.tracking.find((row) => row.id === tracking.id)?.segments ?? []);
      }
    }
    if (segmentStart !== null) {
      setFlow({ kind: 'confirm-use', scope, segmentStart });
    }
    refresh();
  }

  function confirmUse(scope: ConfirmScope, usedAt: Instant, usedAtIso: string): boolean {
    const nowAt = clock.now();
    const latest = readSessionState();
    const attempt = currentLiveAttempt(latest.attempts);
    const tracking = currentLiveTracking(latest.tracking);
    const id = scope === 'attempt' ? attempt?.id : tracking?.id;
    if (id === undefined) return false;
    const outcome =
      scope === 'attempt'
        ? confirmBreakUse(latest, { id, usedAt, usedAtIso, now: nowAt })
        : confirmTrackingUse(latest, { id, usedAt, usedAtIso, now: nowAt });
    if (!outcome.ok) return false;
    persistBreakSession(outcome.state);
    const snapshot = durable.load().snapshot;
    if (snapshot !== null && snapshot.snapshot.kind === 'use_profile') {
      const profile = snapshot.snapshot.profile;
      try {
        durable.saveSnapshot({
          ...snapshot,
          snapshot: { kind: 'use_profile', profile: { ...profile, lastUseAt: { value: usedAtIso, provenance: 'user_estimate' } } },
          updatedAt: nowAt,
        });
      } catch {
        // Profile last-use is best-effort; the open segment remains the clock.
      }
    }
    refresh();
    return true;
  }

  function openPlanDetail(): void {
    setFlow({ kind: 'plan-detail' });
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

  function updatePostBreak(id: string, mode: PostBreakMode, plan: PostBreakPlan): void {
    const outcome = updatePostBreakPlan(readSessionState(), id, { mode, plan, now: clock.now() });
    if (outcome.ok) persistBreakSession(outcome.state);
    refresh();
  }

  function saveNoUse(): void {
    persistBreakSession(recordNoUseCheckin(readSessionState(), clock.now()));
    setFlow(null);
    refresh();
  }

  function saveSymptoms(symptoms: CheckinSymptoms, note: string | null): void {
    persistBreakSession(recordSymptomCheckin(readSessionState(), { now: clock.now(), symptoms, note }));
    setFlow(null);
    refresh();
  }

  // --- questionnaire plumbing (unchanged behaviour) ------------------------

  function persist(next: QuestionnaireSession): void {
    const answered = countAnsweredSteps(next.answers, clock.now());
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
    durable.saveSnapshot(null);
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
    const answers = answersFromSnapshot(snapshotRecord.snapshot);
    const next = { currentStep: 'Q2R' as const, answers: { ...answers, goal: 'reduction' as const } };
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
    if (snapshotRecord === null) return;
    const answers = answersFromSnapshot(snapshotRecord.snapshot);
    const nowAt = clock.now();
    const next = { currentStep: restoreStep(answers, nowAt), answers };
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
        progress.clear();
        const runId = newRecordId('calc', nowAt);
        const frozen = freezeCalculation(runId, finished.snapshot, nowAt);
        durable.putCalculation(frozen);
        durable.saveSnapshot({
          schemaVersion: QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION,
          snapshot: finished.snapshot,
          updatedAt: nowAt,
          runId: frozen.id,
        });
        markResult('open');
        setSession(null);
        setLastUseWarning(false);
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
    durable.putCalculation(frozen);
    durable.saveSnapshot({
      ...snapshotRecord,
      snapshot: merged,
      runId: frozen.id,
      updatedAt: nowAt,
    });
    markResult('open');
    setFlow(null);
    refresh();
  }

  function savePreviousBreak(draft: PreviousBreakDraft, addAnother: boolean) {
    const nowAt = clock.now();
    const editing = flow?.kind === 'previous-break' ? flow.editId : null;
    const existing = editing === null ? null : findPreviousBreak(durable.load(), editing);
    const id = existing?.id ?? newRecordId('pb', nowAt);
    durable.putPreviousBreak({
      id,
      durationDays: draft.durationDays,
      toleranceReductionScore: draft.toleranceReductionScore,
      endedAt: draft.endedAt,
      createdAt: existing?.createdAt ?? createdAtIso(nowAt),
      updatedAt: nowAt,
    });
    if (addAnother) {
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

  // --- render --------------------------------------------------------------

  const canStartPlan = liveAttempt === null && liveTracking === null;
  const breakSheetTarget = toleranceTargetDays(resultModel ?? profileView);
  const breakDayAtStart = anchor === null ? 1 : abstinenceDayAt(now, anchor);

  const checkInDay =
    liveData.active !== null
      ? liveData.active.view.day
      : liveData.tracking !== null && liveData.tracking.view !== null
        ? liveData.tracking.view.day
        : null;
  const planDetailAttempt =
    liveAttempt?.status === 'active' || liveAttempt?.status === 'planned' ? liveAttempt : null;

  const overlayOpen =
    session !== null || (resultModel !== null && flow === null) || flow !== null || shell.settingsOpen;
  const showInstallHint =
    !overlayOpen &&
    !installHintDismissed &&
    durableSnap.calculations.length > 0 &&
    !isStandaloneDisplay();

  return (
    <>
      {!persistent ? <StorageBanner /> : null}
      <Shell
        shell={shell}
        inert={overlayOpen}
        onSelectTab={(tab: AppTab) => dispatch({ type: 'select_tab', tab })}
        onOpenSettings={() => dispatch({ type: 'open_settings' })}
      >
        {shell.activeTab === 'today' ? (
          <TodayScreen
            view={view}
            draft={facts.draft}
            live={liveData}
            profile={profileData}
            onStartOver={abandonDraft}
            onGetStarted={openStart}
            onSelectGoal={openGoal}
            onResume={openResume}
            onViewResult={
              snapshotRecord !== null
                ? () => {
                    markResult('open');
                    refresh();
                  }
                : undefined
            }
            onStartBreak={openBreakStart}
            onRecalculate={openRecalculate}
            onSeeBreakRange={seeBreakRange}
            onStartTracking={startTracking}
            onCheckIn={openCheckIn}
            onConfirmWhen={confirmWhen}
            onOpenPlanDetail={openPlanDetail}
            onMarkComplete={markComplete}
            onAcknowledgeComplete={acknowledgeCompletion}
            onStopTracking={stopCurrentTracking}
          />
        ) : (
          <HistoryScreen
            snapshot={durableSnap}
            now={now}
            onAddPastBreak={() => setFlow({ kind: 'previous-break', editId: null })}
            onEditPastBreak={(id) => setFlow({ kind: 'previous-break', editId: id })}
            onDelete={(kind, id) => {
              deleteHistoryRecord(durable, kind, id);
              refresh();
            }}
            onRecalculate={openRecalculateFrom}
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
          onAcknowledge={acknowledgeResult}
          onEditStep={editFromResult}
          onSeeBreakRange={seeBreakRange}
          onCheckAnotherTest={checkAnotherTest}
          onBreakRecommendation={breakRecommendation}
          onDetectionBasics={() => openGoal('detection_information')}
          onStartOver={resetFailedCalculation}
          onStartBreak={canStartPlan ? openBreakStart : undefined}
          onStartTracking={canStartPlan ? startTracking : undefined}
          trackingAvailable={resultModel.kind === 'baseline_low' ? anchor !== null : true}
          reductionPlan={
            reductionPlan === null
              ? null
              : {
                  maxUseDaysPerWeek: reductionPlan.maxUseDaysPerWeek,
                  maxSessionsPerUseDay: reductionPlan.maxSessionsPerUseDay,
                }
          }
          onReductionPlanChange={(plan) => {
            durable.saveReductionPlan({
              schemaVersion: REDUCTION_PLAN_SCHEMA_VERSION,
              maxUseDaysPerWeek: plan.maxUseDaysPerWeek,
              maxSessionsPerUseDay: plan.maxSessionsPerUseDay,
              updatedAt: clock.now(),
            });
            refresh();
          }}
          onAddPastBreak={
            resultModel.kind === 'tolerance_result' ? () => setFlow({ kind: 'previous-break', editId: null }) : undefined
          }
          onRecalculateWithHistory={canRecalculateWithHistory ? recalculateWithHistory : undefined}
        />
      ) : null}
      {flow !== null && flow.kind !== 'previous-break' ? (
        <FlowRenderer
          flow={flow}
          targetDays={breakSheetTarget ?? 0}
          breakDayAtStart={breakDayAtStart}
          now={now}
          attempt={planDetailAttempt}
          anchor={anchor}
          segmentStart={flow.kind === 'confirm-use' ? flow.segmentStart : null}
          checkInDay={checkInDay}
          onClose={() => setFlow(null)}
          onStartBreak={startPlan}
          onCheckInNo={saveNoUse}
          onCheckInSymptoms={saveSymptoms}
          onUseReported={handleUseReported}
          onConfirmUse={confirmUse}
          onMarkComplete={markComplete}
          onEndEarly={endEarly}
          onCancelPlanned={cancelPlanned}
          onRecalculate={openRecalculate}
          onUpdatePostBreak={updatePostBreak}
        />
      ) : null}
      {flow?.kind === 'previous-break' ? (
        <PreviousBreakSheet
          now={now}
          initial={flow.editId === null ? null : findPreviousBreak(durableSnap, flow.editId)}
          onSave={savePreviousBreak}
          onDelete={
            flow.editId === null
              ? undefined
              : () => {
                  deleteHistoryRecord(durable, 'previous-break', flow.editId!);
                  setFlow(null);
                  refresh();
                }
          }
          onClose={() => setFlow(null)}
        />
      ) : null}
      <SettingsModal
        open={shell.settingsOpen}
        persistent={persistent}
        onClose={() => dispatch({ type: 'close_settings' })}
        onDeleteEverything={() => {
          deleteAllLocalData(storage, durable);
          setSession(null);
          setFlow(null);
          refresh();
          dispatch({ type: 'close_settings' });
        }}
      />
      {updateReady ? (
        <UpdateSnackbar
          onReload={() => onReloadUpdate?.()}
          onDismiss={() => onDismissUpdate?.()}
        />
      ) : showInstallHint ? (
        <InstallHint onDismiss={() => setInstallHintDismissed(true)} />
      ) : null}
    </>
  );
}

function FlowRenderer({
  flow,
  targetDays,
  breakDayAtStart,
  now,
  attempt,
  anchor,
  segmentStart,
  checkInDay,
  onClose,
  onStartBreak,
  onCheckInNo,
  onCheckInSymptoms,
  onUseReported,
  onConfirmUse,
  onMarkComplete,
  onEndEarly,
  onCancelPlanned,
  onRecalculate,
  onUpdatePostBreak,
}: {
  readonly flow: Flow;
  readonly targetDays: number;
  readonly breakDayAtStart: number;
  readonly now: Instant;
  readonly attempt: StoredAttempt | null;
  readonly anchor: Instant | null;
  readonly segmentStart: Instant | null;
  readonly checkInDay: number | null;
  readonly onClose: () => void;
  readonly onStartBreak: (mode: PostBreakMode, startAt: Instant) => void;
  readonly onCheckInNo: () => void;
  readonly onCheckInSymptoms: (symptoms: CheckinSymptoms, note: string | null) => void;
  readonly onUseReported: () => void;
  readonly onConfirmUse: (scope: ConfirmScope, usedAt: Instant, usedAtIso: string) => boolean;
  readonly onMarkComplete: (id: string) => void;
  readonly onEndEarly: (id: string) => void;
  readonly onCancelPlanned: (id: string) => void;
  readonly onRecalculate: () => void;
  readonly onUpdatePostBreak: (id: string, mode: PostBreakMode, plan: PostBreakPlan) => void;
}) {
  switch (flow.kind) {
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
    case 'plan-detail':
      return attempt !== null ? (
        <PlanDetail
          attempt={attempt}
          now={now}
          anchor={anchor}
          onBack={onClose}
          onMarkComplete={onMarkComplete}
          onEndEarly={onEndEarly}
          onCancelPlanned={onCancelPlanned}
          onRecalculate={onRecalculate}
          onUpdatePostBreak={onUpdatePostBreak}
        />
      ) : null;
    case 'checkin':
      return checkInDay !== null ? (
        <CheckInFlow
          day={checkInDay}
          onNoUseSave={onCheckInNo}
          onUseReported={onUseReported}
          onSymptomsSave={onCheckInSymptoms}
          onClose={onClose}
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
          onConfirm={(usedAt, iso) => onConfirmUse(scope, usedAt, iso)}
          onClose={onClose}
          onRecalculate={onRecalculate}
        />
      );
    }
    case 'previous-break':
      return null;
  }
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
