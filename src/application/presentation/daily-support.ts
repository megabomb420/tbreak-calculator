// Versioned editorial guidance, separate from every scientific calculator.
// Ranking cutoffs and the 48-hour freshness limit are UI rules, not clinical
// thresholds. A preference is a request for advice, never a reported symptom.
import type { DailyCheckin } from '../../domain/schemas/profile.ts';
import type { SupportArea } from '../questionnaire/companion.ts';
import type { BreakPreparation } from '../break/preparation.ts';
import { primaryWindowForDay } from '../../domain/guidance/evidence-guidance-v1.ts';

export const DAILY_SUPPORT_VERSION = 'daily-support-v1';
export const SUPPORT_SOURCES = {
  withdrawal: { label: 'NSW Health · cannabis withdrawal', href: 'https://www.health.nsw.gov.au/aod/professionals/Publications/clinical-guidance-withdrawal-alcohol-and-other-drugs.pdf#page=34', kind: 'Clinical guidance' },
  sleep: { label: 'NHS · sleep advice', href: 'https://www.nhs.uk/conditions/insomnia/', kind: 'General self-care' },
  nausea: { label: 'NHS · nausea', href: 'https://www.nhs.uk/symptoms/feeling-sick-nausea/', kind: 'General self-care' },
  headaches: { label: 'NHS · headaches', href: 'https://www.nhs.uk/symptoms/headaches/', kind: 'General self-care' },
  dreams: { label: 'Lee et al. · sleep during abstinence', href: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3986824/', kind: 'Human study' },
  habits: { label: 'University of Vermont · practical break guide', href: 'https://www.uvm.edu/health/t-break-week-1', kind: 'Practical guidance' },
} as const;
export type SupportSourceId = keyof typeof SUPPORT_SOURCES;

export interface SupportGuide {
  readonly title: string;
  readonly explanation: string;
  readonly steps: readonly [string, string, string];
  readonly avoid: string;
  readonly seekHelp: string | null;
  readonly sources: readonly SupportSourceId[];
}

export const SUPPORT_GUIDES: Record<SupportArea, SupportGuide> = {
  sleep: {
    title: 'Trouble sleeping',
    explanation: 'Difficulty falling asleep, waking often and feeling unrefreshed can occur during a break. Sleep may take longer to settle than appetite or irritability.',
    steps: ['Choose a wake-up time you can keep tomorrow, even after a rough night.', 'Keep caffeine out of the six hours before bed. Use the last hour for something quiet, such as reading.', 'Go to bed when sleepy. Keep the room dark and quiet, and avoid using alcohol as a sleep aid.'],
    avoid: 'Trying to force an early bedtime or sleeping in for hours can make the next night harder.',
    seekHelp: 'Speak to a clinician if sleep loss is making daily life hard to manage or changes to your routine are not helping.',
    sources: ['sleep', 'dreams'],
  },
  cravings: {
    title: 'When an urge hits',
    explanation: 'An urge can be tied to a familiar time, place or activity. It can return after the early physical discomfort has eased.',
    steps: ['Leave the place where you would usually use. Put the cannabis and equipment out of sight.', 'Give yourself a short pause before deciding anything. Try one song, a shower, a walk or a small task.', 'If the urge is still strong, contact someone or switch activities. Note the trigger for next time.'],
    avoid: 'Keeping the usual session set up in front of you makes the decision harder. There is no fixed number of minutes every craving lasts.',
    seekHelp: 'If repeated urges keep ending breaks you want to take, a clinician or drug support service can help you make a workable plan.',
    sources: ['habits', 'withdrawal'],
  },
  appetite: {
    title: 'Eating with little appetite',
    explanation: 'Food may be less appealing early in a break, especially if using before meals was part of the routine.',
    steps: ['Try a small portion of something familiar: toast, yoghurt, soup or a banana.', 'Set a time for the next small meal rather than waiting until you feel very hungry.', 'Sip fluids regularly. If nausea is the main problem, open the nausea guide below.'],
    avoid: 'Forcing a large meal or skipping food all day can leave you feeling worse.',
    seekHelp: 'Get medical advice if you cannot eat enough, are losing weight, or poor appetite is not improving. Repeated vomiting needs separate assessment.',
    sources: ['withdrawal', 'nausea'],
  },
  anxiety: {
    title: 'Anxiety or restlessness',
    explanation: 'Tension and restlessness can occur after stopping. Sleep loss, caffeine and existing anxiety can also contribute.',
    steps: ['Move somewhere quieter and reduce what you are trying to do at once.', 'Try a gentle walk or a familiar, repetitive task. If comfortable, breathe slowly without holding your breath.', 'Have a small meal if you have missed one, and skip extra coffee or energy drinks for now.'],
    avoid: 'Do not automatically label new physical symptoms as anxiety or withdrawal.',
    seekHelp: 'Seek medical advice if anxiety is severe, worsening or stopping you from functioning. Chest pain, fainting or serious breathing difficulty need urgent assessment.',
    sources: ['withdrawal'],
  },
  irritability: {
    title: 'A shorter temper',
    explanation: 'Irritability can be part of early withdrawal. Being tired or hungry may add to it.',
    steps: ['Pause the conversation before replying if you can feel yourself getting wound up.', 'Tell the other person you need a short break, then move somewhere quieter.', 'Return to the issue after food, rest or a walk. Delay an avoidable argument if possible.'],
    avoid: 'A difficult day does not make every disagreement a withdrawal symptom.',
    seekHelp: 'Get help if anger feels unmanageable or you are worried about harming yourself or someone else.',
    sources: ['withdrawal'],
  },
  low_mood: {
    title: 'Feeling flat',
    explanation: 'Low mood can occur during a break, but the calendar cannot tell you its cause or when it will lift.',
    steps: ['Pick one small activity with a clear end: make lunch, wash up or walk around the block.', 'Arrange some contact with someone you know, even if it is a short call.', 'Keep a manageable plan for the next part of the day rather than filling every hour.'],
    avoid: 'Do not dismiss persistent or worsening low mood as something you must simply wait out.',
    seekHelp: 'Contact a clinician if low mood persists, worsens or makes everyday life difficult. If you might act on thoughts of self-harm, seek emergency help now.',
    sources: ['withdrawal'],
  },
  dreams: {
    title: 'Vivid or unsettling dreams',
    explanation: 'Dreams can become more noticeable during abstinence. They do not measure how much THC has left your body.',
    steps: ['After waking, take a moment to orient yourself to the room before trying to sleep again.', 'Use the same quiet wind-down routine tonight; avoid building the evening around worrying about another dream.', 'Record how rested you feel in your sleep check-in, not how unusual the dream was.'],
    avoid: 'A vivid dream is not evidence of a completed tolerance reset.',
    seekHelp: 'Talk to a clinician if nightmares repeatedly disrupt sleep or leave you distressed during the day.',
    sources: ['dreams', 'sleep'],
  },
  nausea: {
    title: 'Nausea or an unsettled stomach',
    explanation: 'Stomach symptoms have several possible causes. Being on a break does not establish that withdrawal is responsible.',
    steps: ['Take small, regular sips of a cool drink.', 'Try smaller portions and avoid strong-smelling, greasy food if it makes nausea worse.', 'Eat slowly and stay upright after eating.'],
    avoid: 'Repeated vomiting or severe abdominal pain should not be treated as an ordinary part of a break.',
    seekHelp: 'Seek prompt medical advice for repeated vomiting, inability to keep fluids down or severe abdominal pain. If nausea persists for several days, arrange a review.',
    sources: ['nausea', 'withdrawal'],
  },
  headaches: {
    title: 'Headaches',
    explanation: 'Headaches can have many causes, including missed meals, changes in caffeine, stress and illness.',
    steps: ['Have water and something to eat if you have missed a meal.', 'Take a screen break and relax somewhere comfortable.', 'Note when the headache started and whether it is unusual for you.'],
    avoid: 'Extra water does not speed THC clearance. Do not assume an unusual headache is withdrawal.',
    seekHelp: 'A sudden, extremely painful headache, or one with weakness, confusion or speech problems, needs emergency assessment. Recurrent or worsening headaches need medical review.',
    sources: ['headaches'],
  },
  routine: {
    title: 'The usual time to use',
    explanation: 'A familiar setting can prompt the habit even when you are not feeling much withdrawal.',
    steps: ['Identify the next moment you would normally use: after work, after dinner or before bed.', 'Change one part of that moment. Move rooms, go outside or start a different activity.', 'Prepare the alternative now so you do not have to invent it when the urge arrives.'],
    avoid: 'Leaving the old routine completely unchanged can keep prompting the same decision.',
    seekHelp: null,
    sources: ['habits'],
  },
  boredom: {
    title: 'Filling the empty time',
    explanation: 'A break can leave a gap where a session used to be. It helps to choose something specific for that gap.',
    steps: ['Pick a task that uses your hands: cook, draw, do a puzzle or fix one small thing.', 'Put what you need within reach before your usual session time.', 'If you lose interest, change the activity or location. The first choice does not have to work.'],
    avoid: 'An empty evening and an abstract promise to stay busy are a difficult combination.',
    seekHelp: null,
    sources: ['habits'],
  },
};

// Original editorial prompts, arranged as a practical sequence. The day is
// a scheduling choice, not a claim that the body changes on that exact day.
const DAILY_PRACTICES: readonly { area: SupportArea; title: string; action: string }[] = [
  { area: 'routine', title: 'Prepare your usual session time', action: 'Put your equipment away and choose what you will do at the time you would normally use.' },
  { area: 'sleep', title: 'Make tonight easier to set up', action: 'Choose tomorrow’s wake-up time and set aside something quiet to do before bed.' },
  { area: 'appetite', title: 'Have an easy meal ready', action: 'Prepare a small meal or snack now, before low appetite or tiredness makes it harder.' },
  { area: 'cravings', title: 'Give the next urge a different setting', action: 'Choose where you will go if an urge appears: another room, outside, or somewhere you do not use.' },
  { area: 'irritability', title: 'Leave room for a pause', action: 'If patience is low, postpone one avoidable demand and decide where you can take a quiet break.' },
  { area: 'boredom', title: 'Plan the empty part of the evening', action: 'Pick a specific activity and get it ready: ingredients, a puzzle, a book or a playlist.' },
  { area: 'routine', title: 'Keep what actually helped', action: 'Look back at the week. Keep one useful change and replace one plan that did not fit your day.' },
  { area: 'sleep', title: 'Check the sleep pattern', action: 'Compare your recorded sleep, if available. Keep a regular wake-up time rather than chasing a perfect night.' },
  { area: 'cravings', title: 'Name the recurring cue', action: 'Notice whether urges cluster around a time, a place or particular company. Change that situation where possible.' },
  { area: 'appetite', title: 'Make regular eating convenient', action: 'Restock a few meals you can manage without much preparation.' },
  { area: 'routine', title: 'Plan a social situation', action: 'If you will be around people using, decide what to say and how to leave before you arrive.' },
  { area: 'boredom', title: 'Try a different reward', action: 'Put one enjoyable activity where a session used to be. Choose something you would want to do anyway.' },
  { area: 'anxiety', title: 'Reduce one source of friction', action: 'Make one part of tomorrow easier: prepare food, clear a task or arrange a quieter evening.' },
  { area: 'routine', title: 'Review the second week', action: 'Use your check-ins to spot what is changing and what still needs attention. Do not infer tolerance from symptoms.' },
  { area: 'dreams', title: 'Look at rest, not just dreams', action: 'If dreams are vivid, note whether they actually disrupted sleep. Keep the usual wind-down routine.' },
  { area: 'routine', title: 'Change an automatic moment', action: 'Choose one use-linked cue and deliberately do something different when it appears today.' },
  { area: 'boredom', title: 'Give a neglected activity some time', action: 'Set up a short session of a hobby you have been meaning to return to.' },
  { area: 'cravings', title: 'Check the backup plan', action: 'Choose an alternative you can use when the weather, work or other plans rule out your first choice.' },
  { area: 'sleep', title: 'Review persistent sleep trouble', action: 'If sleep is still making daily life difficult, arrange advice instead of waiting for a particular break day.' },
  { area: 'routine', title: 'Plan the next unstructured day', action: 'Put one activity in the part of your next free day when you are most likely to use automatically.' },
  { area: 'cravings', title: 'Separate the urge from the routine', action: 'When an urge appears, note what happened just before it. Keep the alternative that fits that cue.' },
  { area: 'routine', title: 'Look beyond the target date', action: 'Consider whether you want to continue the break or return with clear limits. There is no obligation to resume.' },
  { area: 'boredom', title: 'Keep a useful evening plan', action: 'Repeat an activity that made an evening easier, without adding more tasks just to fill time.' },
  { area: 'routine', title: 'Prepare for an offer', action: 'Decide how to respond if someone offers cannabis before you intended to use again.' },
  { area: 'cravings', title: 'Plan for a difficult day', action: 'Choose who you can contact and what you can do if stress makes the old routine tempting.' },
  { area: 'routine', title: 'Review any return plan', action: 'If you intend to return, decide how you will avoid slipping back into the frequency you wanted to change.' },
  { area: 'sleep', title: 'Keep the routines worth keeping', action: 'Choose which sleep, meal or evening changes you want to carry beyond this break.' },
  { area: 'routine', title: 'Review what the break gave you', action: 'Look at your own records and decide your next step. A day count alone cannot tell you how THC will feel.' },
];

const MAINTENANCE_PRACTICES = [DAILY_PRACTICES[8]!, DAILY_PRACTICES[10]!, DAILY_PRACTICES[11]!, DAILY_PRACTICES[17]!, DAILY_PRACTICES[21]!, DAILY_PRACTICES[24]!, DAILY_PRACTICES[26]!];

export interface CommunityTip {
  readonly id: string;
  readonly areas: readonly SupportArea[];
  readonly title: string;
  readonly text: string;
  readonly href: string;
  readonly thread: string;
}

// Curated paraphrases checked 2026-09-20. Only the named practical idea is
// included; linking a discussion does not endorse its other comments.
export const COMMUNITY_TIPS: readonly CommunityTip[] = [
  { id: 'quiet-wind-down', areas: ['sleep', 'dreams'], title: 'Give the evening a quieter ending', text: 'One r/Petioles commenter described reading or light tidying before bed instead of ending the evening with scrolling or a stimulating show.', href: 'https://www.reddit.com/r/Petioles/comments/15z1nlx/sleeping_on_a_t_break_advice/', thread: 'Sleeping on a T Break advice' },
  { id: 'paper-puzzle', areas: ['cravings', 'boredom', 'routine'], title: 'Keep your hands occupied', text: 'A commenter in r/Petioles found a paper sudoku book useful: holding a pencil and working on a puzzle gave their hands something to do during cravings.', href: 'https://www.reddit.com/r/Petioles/comments/153a0dk/what_are_some_methods_that_helped_you_guys_get/', thread: 'Getting through the first week' },
  { id: 'different-ritual', areas: ['routine', 'cravings', 'boredom'], title: 'Replace the preparation ritual', text: 'One r/Petioles commenter replaced reaching for the grinder with making tea, including choosing the cup and taking time over preparation. The idea was having a different ritual to reach for.', href: 'https://www.reddit.com/r/Petioles/comments/1dvgefb/help_hit_me_with_your_best_tbreak_tips/', thread: 'Readers’ practical t-break tips' },
];

type RatedField = 'craving' | 'sleep' | 'irritability' | 'anxiety' | 'appetite';
const FIELD_AREAS: readonly [RatedField, SupportArea, string, boolean][] = [
  ['sleep', 'sleep', 'Sleep quality', true], ['craving', 'cravings', 'Craving', false],
  ['anxiety', 'anxiety', 'Anxiety', false], ['irritability', 'irritability', 'Irritability', false],
  ['appetite', 'appetite', 'Appetite', true],
];
export interface AdviceSelection { readonly area: SupportArea; readonly reason: string; readonly recordedAt: string | null }
export interface DailySupportInput {
  readonly day: number;
  readonly now: number;
  readonly anchor: number | null;
  readonly checkins: readonly DailyCheckin[];
  readonly supportAreas: readonly SupportArea[];
  readonly preparation: BreakPreparation | null;
  readonly targetDays?: number | null;
}

export function presentDailySupport(input: DailySupportInput) {
  const day = Math.max(1, Math.floor(input.day));
  const window = primaryWindowForDay(day);
  const practice = day <= 28 ? DAILY_PRACTICES[day - 1]! : MAINTENANCE_PRACTICES[(day - 29) % MAINTENANCE_PRACTICES.length]!;
  const currentCheckins = input.anchor === null ? [] : input.checkins.filter(row => {
    const time = Date.parse(row.recordedAt);
    return Number.isFinite(time) && time >= input.anchor! && time <= input.now && !row.usedThc;
  });
  // Latest *rated* value per field: a later "No THC" tap contains no symptom
  // information and must not erase an earlier rating or turn it into zero.
  const recent = currentCheckins.filter(row => input.now - Date.parse(row.recordedAt) < 48 * 3_600_000).reverse()
    .sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt));
  const ratings = FIELD_AREAS.flatMap(([field, area, label, reverse]) => {
    const row = recent.find(item => typeof item[field] === 'number' && item[field]! >= 0 && item[field]! <= 10);
    return row === undefined ? [] : [{ area, label, value: row[field]!, severity: reverse ? 10 - row[field]! : row[field]!, recordedAt: row.recordedAt }];
  });
  const ranked = ratings.filter(item => item.severity >= 4).sort((a, b) => b.severity - a.severity);
  const selections: AdviceSelection[] = ranked.slice(0, 2).map(item => ({ area: item.area, reason: `${item.label} ${item.value}/10 in your check-in`, recordedAt: item.recordedAt }));
  const comfortable = new Set(ratings.filter(item => item.severity < 4).map(item => item.area));
  // Every selected preference participates; rotate the fallback between days.
  const preferred = [...input.supportAreas];
  const offset = preferred.length ? (day - 1) % preferred.length : 0;
  const ordered = [...preferred.slice(offset), ...preferred.slice(0, offset)];
  const candidates = [...ordered, practice.area, 'routine', 'boredom'] as SupportArea[];
  for (const area of candidates) {
    if (selections.length >= 2) break;
    if (comfortable.has(area) || selections.some(item => item.area === area)) continue;
    selections.push({ area, reason: preferred.includes(area) ? 'A topic you chose' : 'An option for this part of your break', recordedAt: null });
  }
  const hasSymptoms = ratings.length > 0;
  const community = COMMUNITY_TIPS.filter(tip => tip.areas.some(area => selections.some(item => item.area === area)));
  const communityTip = community.length ? community[(day - 1) % community.length]! : COMMUNITY_TIPS[(day - 1) % COMMUNITY_TIPS.length]!;
  const replacement = input.preparation?.replacementAction?.trim();
  const atTarget = input.targetDays != null && (day === input.targetDays || day === input.targetDays + 1);
  return {
    version: DAILY_SUPPORT_VERSION, day, window, selections, currentCheckins, communityTip,
    status: hasSymptoms ? 'Advice uses your recent ratings and chosen topics.' : 'No symptom ratings from the last 48 hours. These are suggestions for this stage; a check-in can make them more relevant.',
    allComfortable: ratings.length === FIELD_AREAS.length && ranked.length === 0,
    practice: atTarget ? { area: 'routine' as SupportArea, title: 'Review your next step', action: 'At your target, decide whether to continue or finish the break. If you plan to return, review your limits first; the old amount may feel stronger.' } : practice,
    plannedAlternative: replacement ? `At your usual use time, try your planned alternative: “${replacement}”.` : null,
  };
}
