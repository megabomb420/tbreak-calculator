// An open flow must render a dialog or not stay open.
//
// The shell treats any open flow as an overlay: it hides the result screen and
// makes the background inert. A flow whose dialog cannot render — because the
// break length, the live track, the check-in day, the segment anchor or the
// reduction plan it needs is missing — would therefore leave an inert app with
// no dialog, no Escape handler, no focus trap and no close action. Every flow
// the UI can open supplies what it needs, so this state is unreachable today;
// `flowRendersDialog` is the gate that keeps it that way, and these cases pin
// its decision for every kind of flow.

import { describe, expect, it } from 'vitest';
import { flowRendersDialog, type Flow } from '../../src/ui/app.tsx';
import { toInstant } from '../../src/domain/schemas/time.ts';
import type { StoredTrack } from '../../src/application/progress/tracking-record.ts';
import type { ReductionPlan } from '../../src/domain/reduction/reduction-engine.ts';

const NOW = toInstant(Date.parse('2026-09-21T12:00:00.000Z'));
const TRACK = { id: 'track-1', status: 'tracking' } as unknown as StoredTrack;
const PLAN = { id: 'plan-1' } as unknown as ReductionPlan;

/** Nothing live is available: the state that must never open a dialog-less flow. */
const NOTHING: Parameters<typeof flowRendersDialog>[1] = {
  targetDays: 0,
  track: null,
  checkInDay: null,
  segmentStart: null,
  reductionPlan: null,
};

describe('an open flow renders its dialog', () => {
  it('refuses the flows whose input is missing', () => {
    const flows: readonly Flow[] = [
      { kind: 'break-start', customDays: null },
      { kind: 'tracking-detail' },
      { kind: 'checkin' },
      { kind: 'confirm-use', scope: 'attempt', segmentStart: NOW },
      { kind: 'log-use' },
    ];
    for (const flow of flows) {
      expect(flowRendersDialog(flow, NOTHING), flow.kind).toBe(false);
    }
  });

  it('accepts the same flows once their input is there', () => {
    expect(flowRendersDialog({ kind: 'break-start', customDays: null }, { ...NOTHING, targetDays: 1 })).toBe(true);
    expect(flowRendersDialog({ kind: 'tracking-detail' }, { ...NOTHING, track: TRACK })).toBe(true);
    // Day 0 is a real check-in day: only null means "nothing to check in for".
    expect(flowRendersDialog({ kind: 'checkin' }, { ...NOTHING, checkInDay: 0 })).toBe(true);
    expect(
      flowRendersDialog({ kind: 'confirm-use', scope: 'attempt', segmentStart: NOW }, { ...NOTHING, segmentStart: NOW }),
    ).toBe(true);
    expect(flowRendersDialog({ kind: 'log-use' }, { ...NOTHING, reductionPlan: PLAN })).toBe(true);
  });

  it('accepts the flows that never depend on the live state', () => {
    const flows: readonly Flow[] = [
      { kind: 'choose-break-days' },
      { kind: 'detox-evidence' },
      { kind: 'reduction-start' },
      { kind: 'previous-break', editId: null },
      { kind: 'previous-break', editId: 'past-1' },
    ];
    for (const flow of flows) {
      expect(flowRendersDialog(flow, NOTHING), flow.kind).toBe(true);
    }
  });

  it('keeps the chosen break length separate from the guard', () => {
    // A chosen length is folded into `targetDays` by the shell before the gate
    // sees it, so the gate only ever has to answer "is there a plan length?".
    expect(
      flowRendersDialog({ kind: 'break-start', customDays: 3 }, { ...NOTHING, targetDays: 3 }),
    ).toBe(true);
    expect(flowRendersDialog({ kind: 'break-start', customDays: 3 }, NOTHING)).toBe(false);
  });
});
