// User-facing copy for this slice. Scientific/message-code sentences live in
// UX_SPEC §14 and MUST NOT be invented here. First-launch and shell strings
// are taken from UX_SPEC §3; break-loop copy lives in `break-copy.ts`.

import type { BackupCount, BackupError, BackupStoreKey } from '../application/backup/backup.ts';

export const APP_NAME = 'T-Break Calculator';
export const APP_SHORT_NAME = 'T-Break';

export const FIRST_LAUNCH = {
  title: 'A little space from THC.',
  promise:
    'Taking a t-break, cutting back, or stopping? Keep your days, check-ins and practical tips in one place.',
  reassurances: [
    { id: 'offline', label: 'Works offline' },
    { id: 'local', label: 'Stored only on this device' },
    { id: 'no-account', label: 'No account needed' },
  ],
  cta: 'Get started',
  // UX_SPEC §3.3: the block ships in place; reviewed wording is a release
  // blocker and is not invented here.
  safetyPending:
    'Planning guidance only — not medical advice or a guaranteed drug-test result.',
} as const;

export const GOAL_CHIPS = [
  { id: 'tolerance_reset', title: 'Reset my tolerance', helper: 'Plan a tolerance break' },
  { id: 'reduction', title: 'Cut down', helper: 'Reduce how much I use' },
  { id: 'abstinence', title: 'Stay off THC', helper: "I'm quitting or already have" },
  { id: 'detection_information', title: 'Drug test info', helper: 'Understand detection basics' },
] as const;

export const NO_PROFILE = {
  title: 'What do you want to do?',
} as const;

export const HISTORY_EMPTY = 'No history yet.';

export const SETTINGS = {
  title: 'Settings',
  close: 'Close settings',
  installHelpTitle: 'Install on this device',
  installIos: 'iPhone / iPad: in Safari, tap Share, then Add to Home Screen.',
  installAndroid: 'Android: open the browser menu and tap Install app or Add to Home Screen.',
  installDesktop: 'Desktop: use the install icon in the address bar, or Install app in the browser menu.',
  offlineNote: 'Fully offline-capable · all data on this device',
  storageOk: 'Saving on this device.',
  storageWriteFailed: 'The latest change may not have been saved on this device.',
  storageUnavailable: "This session can't be saved — results will vanish when you close the app.",
  appInfoTitle: 'About',
  appInfoVersion: 'T-Break Calculator',
  scienceAction: "What's the science behind this calculator?",
  updateTitle: 'App update',
  updateChecking: 'Checking for updates…',
  updateCurrent: 'Up to date',
  updateAvailable: 'Update available',
  updateOffline: 'Update status unavailable offline',
  updateUnavailable: 'Update status unavailable',
  updateNow: 'Update now',
  backupTitle: 'Your data',
  backupHint: 'Save a copy of everything T-Break has stored on this device, or put a saved copy back. The file is not encrypted, so keep it somewhere private.',
  backupExport: 'Save a backup file',
  backupRestore: 'Restore from a backup file',
  backupExportDone: (file: string) => `Saved ${file} to your downloads.`,
  backupRestoreDone: (file: string) => `Restored ${file}.`,
  backupExportFailed: "This device couldn't save the file.",
  backupConfirmTitle: (file: string) => `Replace your data with ${file}?`,
  backupConfirmBody:
    'The file replaces everything T-Break has stored on this device, including an unfinished calculation. What is here now cannot be brought back. It holds:',
  backupConfirmAction: 'Replace my data',
  backupErrorUnreadable: "That file couldn't be read, so nothing was changed.",
  backupErrorFormat: "That file isn't a T-Break backup, so nothing was changed.",
  backupErrorFormatVersion: 'That backup was made by another version of T-Break, so nothing was changed.',
  backupErrorNewerFormat: 'That backup was made by a newer version of T-Break. Update the app, then try again.',
  backupErrorData: 'That backup file has nothing in it, so nothing was changed.',
  deleteTitle: 'Delete everything',
  deleteHint: 'Hold for 3 seconds to confirm. This removes all T-Break data stored on this device.',
  deleteHoldLabel: 'Hold to delete everything',
} as const;

/** Plain names for each backed-up record family, used in the restore list. */
export const BACKUP_STORE_LABELS = {
  snapshot: 'Saved answers',
  calculations: 'Saved results',
  attempts: 'Break attempts',
  tracking: 'Tracking runs',
  checkins: 'Check-ins',
  previousBreaks: 'Past breaks',
  reductionRecords: 'Cutting-down plans',
  reductionPlan: 'Saved limits',
  outcomeMarks: 'Break ratings',
  companionPersonalisation: 'Support areas',
} satisfies Record<BackupStoreKey, string>;

export function backupCountLines(counts: readonly BackupCount[]): readonly string[] {
  return counts.map(({ store, count }) => `${BACKUP_STORE_LABELS[store]}: ${count}`);
}

export function backupErrorMessage(error: BackupError): string {
  switch (error.kind) {
    case 'unreadable':
      return SETTINGS.backupErrorUnreadable;
    case 'format':
      return SETTINGS.backupErrorFormat;
    case 'format_version':
      return SETTINGS.backupErrorFormatVersion;
    case 'newer_format':
      return SETTINGS.backupErrorNewerFormat;
    case 'data':
      return SETTINGS.backupErrorData;
    case 'store_invalid':
      return `That file's ${BACKUP_STORE_LABELS[error.store].toLowerCase()} data couldn't be read, so nothing was changed.`;
  }
}

export const OPEN_SETTINGS = 'Settings';

export const HISTORY = {
  emptyTitle: HISTORY_EMPTY,
  emptyBody: 'Past calculations and breaks appear here.',
  pastBreaks: 'Past breaks',
  addPastBreak: 'Add a past break',
  timeline: 'Activity',
  openRecord: 'Open',
  delete: 'Delete',
  deleteConfirmTitle: 'Delete this record?',
  deleteConfirmBody: 'This only removes this item. Everything else stays.',
  deleteConfirmAction: 'Delete',
  cancel: 'Cancel',
  unavailable: 'Unavailable',
  unavailableBody: 'This record could not be read. Unrelated history is untouched.',
  recalculate: 'Recalculate',
  closeDetail: 'Back to History',
} as const;

export const PREVIOUS_BREAK = {
  title: 'Add a past break',
  editTitle: 'Edit past break',
  duration: 'How long did it last?',
  durationUnit: 'days',
  chips: [
    { label: '1 week', days: 7 },
    { label: '2 weeks', days: 14 },
    { label: '3 weeks', days: 21 },
    { label: '1 month', days: 30 },
  ],
  score: 'How much did it reduce your tolerance afterwards?',
  scoreZero: 'Not at all',
  scoreTen: 'Very large reduction',
  notSure: 'Not sure',
  ended: 'When did it end?',
  skipEnded: 'Skip',
  save: 'Save',
  saveAnother: 'Save & add another',
  close: 'Close',
  delete: 'Delete this past break',
} as const;

export const STORAGE_BANNER = {
  message: "This session can't be saved — results will vanish when you close the app.",
  /** A write this session was rejected; the in-memory copy may not survive. */
  writeFailed: 'The latest change may not have been saved on this device.',
} as const;

export const PWA_UPDATE = {
  message: 'Update ready — it will apply the next time you open the app.',
  reload: 'Reload',
  dismiss: 'Not now',
} as const;

export const INSTALL_HINT = {
  message: 'Install from Settings to keep T-Break on your home screen.',
  dismiss: 'Dismiss',
} as const;

export function resumeTitle(answeredSteps: number): string {
  const noun = answeredSteps === 1 ? 'answer' : 'answers';
  return `Finish your calculation — ${answeredSteps} ${noun} saved`;
}

export const RESUME = {
  resume: 'Resume',
  startOver: 'Start over',
  draftOnly: 'This only discards the unfinished calculation — your current break stays.',
} as const;
