import type { RawAnswerSnapshot } from '../questionnaire/snapshot.ts';
import type { TodayFacts } from './today-state.ts';

/** Maps an acknowledged snapshot onto Today facts. No engine numbers. */
export function todayFactsFromSnapshot(snapshot: RawAnswerSnapshot | null): Partial<TodayFacts> {
  if (snapshot === null) return {};
  if (snapshot.kind === 'detection') {
    return { hasAnyData: true, detectionOnly: true };
  }
  if (snapshot.profile.goal === 'abstinence') {
    return { hasAnyData: true, hasProfile: true };
  }
  return { hasAnyData: true, hasProfile: true };
}
