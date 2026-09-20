// Versioned editorial guidance, separate from every scientific calculator.
// Ranking cutoffs and the 48-hour freshness limit are UI rules, not clinical
// thresholds. Only a reported rating can raise a topic as a current problem.
import type { DailyCheckin } from '../../domain/schemas/profile.ts';
import type { SupportArea } from '../questionnaire/companion.ts';
import type { BreakPreparation } from '../break/preparation.ts';
import { primaryWindowForDay, type WithdrawalWindowId } from '../../domain/guidance/evidence-guidance-v1.ts';

export const DAILY_SUPPORT_VERSION = 'daily-support-v3';
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
  readonly windows: readonly WithdrawalWindowId[];
  readonly period: string;
  readonly title: string;
  readonly text: string;
  readonly href: string;
  readonly thread: string;
}

// Curated paraphrases checked 2026-09-20. These remain individual accounts,
// not a second symptom timeline. `windows` only controls when an account is
// contextually useful; it does not turn the reported day into a prediction.
export const COMMUNITY_TIPS: readonly CommunityTip[] = [
  { id: 'day-one-mental', areas: ['cravings', 'routine', 'boredom'], windows: ['days_1_3', 'days_2_6'], period: 'Day 1 → day 6', title: 'The mental part changed before everything else', text: 'A commenter with a very heavy previous pattern described day 1 as the hardest mentally. By day 6 the urge to smoke had faded for them, even though other withdrawal discomfort had not.', href: 'https://www.reddit.com/r/Petioles/comments/17syg5o/even_a_14day_tolerance_break_seems_impossible_for/', thread: 'Even a 14-day break seems impossible' },
  { id: 'days-one-four-rough', areas: ['cravings', 'anxiety', 'appetite', 'headaches'], windows: ['days_1_3', 'days_2_6'], period: 'Days 1–4', title: 'One person’s rough opening stretch', text: 'A daily user called days 1–4 the worst part of a 30-day break, with strong cravings, nausea, headache and anxiety. Their energy and daily routine felt much better later in the month.', href: 'https://www.reddit.com/r/Petioles/comments/v2hl1r/i_took_a_break_for_30_days_ended_on_saturday_and/', thread: 'A 30-day break, day by day' },
  { id: 'days-two-four-appetite', areas: ['appetite', 'irritability'], windows: ['days_2_6'], period: 'Days 2–4', title: 'Appetite and patience took the hit', text: 'Someone writing on day 7 said days 2–4 had been their worst: almost no appetite and a much shorter temper. Craving was not their main issue, which is a useful reminder that breaks do not all feel alike.', href: 'https://www.reddit.com/r/Petioles/comments/1ggxlf3/my_current_t_break_symptoms_and_my_thoughts_on/', thread: 'Current break symptoms on day 7' },
  { id: 'days-one-four-sleep', areas: ['sleep', 'appetite'], windows: ['days_2_6', 'days_7_14'], period: 'Days 1–10', title: 'Sleep and appetite eased after day 4', text: 'A commenter on day 10 reported poor sleep and low appetite during days 1–4, then a much easier stretch. They found being around other people helped with the empty time.', href: 'https://www.reddit.com/r/Petioles/comments/17syg5o/even_a_14day_tolerance_break_seems_impossible_for/', thread: 'Even a 14-day break seems impossible' },
  { id: 'quiet-wind-down', areas: ['sleep', 'dreams'], windows: ['days_1_3', 'days_2_6', 'days_7_14'], period: 'Early nights', title: 'A quieter ending to the evening', text: 'One commenter described reading or doing light tidying before bed instead of ending the evening with scrolling or a stimulating show.', href: 'https://www.reddit.com/r/Petioles/comments/15z1nlx/sleeping_on_a_t_break_advice/', thread: 'Sleeping on a T-break' },
  { id: 'paper-puzzle', areas: ['cravings', 'boredom', 'routine'], windows: ['days_1_3', 'days_2_6', 'days_7_14'], period: 'First week', title: 'Something physical for the empty moment', text: 'A commenter found a paper sudoku book useful: holding a pencil and working on a puzzle gave their hands and attention somewhere else to go during cravings.', href: 'https://www.reddit.com/r/Petioles/comments/153a0dk/what_are_some_methods_that_helped_you_guys_get/', thread: 'Getting through the first week' },
  { id: 'day-seven-still-hard', areas: ['cravings', 'routine'], windows: ['days_7_14'], period: 'Day 7', title: 'The first week did not end on schedule', text: 'One poster reached day 7 and was still thinking about smoking constantly. Replies ranged from “day 6 was my hardest” to feeling a shift around days 10–14. Their thread shows how uneven the same week can be.', href: 'https://www.reddit.com/r/Petioles/comments/1comaqo/i_am_on_day_7_of_a_30_day_tbreak_and_it_doesnt/', thread: 'Day 7 still feels difficult' },
  { id: 'day-seven-fatigue', areas: ['low_mood', 'boredom', 'routine'], windows: ['days_7_14'], period: 'Around day 7', title: 'The acute part eased; flatness remained', text: 'A commenter said their sweating, stomach trouble and high anxiety usually eased by day 7, while fatigue and low mood could linger. Music, cooking, games, walking and seeing people were the activities they used then.', href: 'https://www.reddit.com/r/Petioles/comments/1comaqo/i_am_on_day_7_of_a_30_day_tbreak_and_it_doesnt/', thread: 'Day 7 still feels difficult' },
  { id: 'day-ten-dreams', areas: ['appetite', 'dreams', 'sleep'], windows: ['days_7_14'], period: 'Day 10', title: 'Appetite returned before dreams settled', text: 'A day-10 commenter reported that night sweats had stopped and their usual appetite was back, while dreams were still unusually vivid.', href: 'https://www.reddit.com/r/Petioles/comments/u2cmku/withdrawal_symptoms_on_day_3_of_my_tolerance_break/', thread: 'Withdrawal symptoms on day 3' },
  { id: 'days-ten-fourteen-lift', areas: ['anxiety', 'low_mood', 'routine'], windows: ['days_7_14', 'days_14_21'], period: 'Days 10–14', title: 'For some, this was the turning point', text: 'In one discussion, separate commenters described a small lift around day 10 and the good beginning to outweigh the bad by day 14. Others in the same thread still struggled, so this is experience rather than a deadline.', href: 'https://www.reddit.com/r/Petioles/comments/1comaqo/i_am_on_day_7_of_a_30_day_tbreak_and_it_doesnt/', thread: 'Day 7 still feels difficult' },
  { id: 'day-fourteen-craving-spike', areas: ['cravings', 'anxiety'], windows: ['days_7_14', 'days_14_21'], period: 'Day 14', title: 'A craving can arrive late', text: 'One poster had almost no cravings for two weeks, then experienced an abrupt, intense urge on day 14. The timing surprised them; a calmer first week had not made later cravings impossible.', href: 'https://www.reddit.com/r/Petioles/comments/1blbe76/day_14_the_cravings_are_craaazy/', thread: 'A strong craving on day 14' },
  { id: 'different-ritual', areas: ['routine', 'cravings', 'boredom'], windows: ['days_7_14', 'days_14_21'], period: 'Around week 2', title: 'Make the ritual visible', text: 'A day-14 commenter mimed their old preparation routine without using. For them, acting it out exposed how much of the pull was the familiar sequence itself.', href: 'https://www.reddit.com/r/Petioles/comments/1dvgefb/help_hit_me_with_your_best_tbreak_tips/', thread: 'Readers’ practical T-break tips' },
  { id: 'week-three-sleep', areas: ['sleep', 'dreams'], windows: ['days_14_21', 'days_21_28'], period: 'Week 3', title: 'Sleep was the last obvious problem', text: 'A commenter entering week 3 said they no longer missed THC and felt much better overall, but insomnia had taken the full three weeks to ease and sleep still was not completely normal.', href: 'https://www.reddit.com/r/Petioles/comments/1comaqo/i_am_on_day_7_of_a_30_day_tbreak_and_it_doesnt/', thread: 'Day 7 still feels difficult' },
  { id: 'day-twenty-two-rethink', areas: ['sleep', 'anxiety', 'routine'], windows: ['days_21_28'], period: 'Day 22', title: 'A seven-day plan became a longer pause', text: 'One person reached day 22 after originally planning a week. Some insomnia and anxiety remained, but feeling more productive made them question whether they wanted to return yet.', href: 'https://www.reddit.com/r/Petioles/comments/pnyhex/has_anyone_taken_a_tolerance_break_for_a_week_or/', thread: 'When a short break changes the plan' },
  { id: 'later-energy-routine', areas: ['routine', 'sleep', 'boredom'], windows: ['days_14_21', 'days_21_28', 'beyond_28'], period: 'After the early days', title: 'More energy changed the morning routine', text: 'After a difficult first four days, one person reported more energy, waking with the alarm, feeling rested and arriving at work on time during the rest of a 30-day break.', href: 'https://www.reddit.com/r/Petioles/comments/v2hl1r/i_took_a_break_for_30_days_ended_on_saturday_and/', thread: 'A 30-day break, day by day' },
  { id: 'after-month-perspective', areas: ['routine', 'anxiety'], windows: ['days_21_28', 'beyond_28'], period: 'After 39 days', title: 'The old amount no longer fit', text: 'After 39 days, a former daily user found that a relatively small return session became uncomfortably strong. The experience changed how they thought about moderation and all-night sessions.', href: 'https://www.reddit.com/r/Petioles/comments/s0dwms/to_those_who_have_completed_a_successful_30_day/', thread: 'Returning after a 30+ day break' },
  { id: 'beyond-ninety-variable', areas: ['cravings', 'anxiety', 'low_mood', 'sleep'], windows: ['beyond_28'], period: 'Around 90 days', title: 'Better did not mean symptom-free', text: 'One long-term daily user said sleep and most other things were better after 90 days, while occasional cravings, anxiety and flat days still appeared. Their account is a useful counterweight to tidy recovery stories.', href: 'https://www.reddit.com/r/Petioles/comments/159owf8/weird_day_after_90_days/', thread: 'A difficult day after 90 days' },
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
  const selections: AdviceSelection[] = ranked.map(item => ({ area: item.area, reason: `${item.label} ${item.value}/10 in your check-in`, recordedAt: item.recordedAt }));
  const comfortable = new Set(ratings.filter(item => item.severity < 4).map(item => item.area));
  // Nothing rated hard enough to act on: two stage-relevant defaults.
  if (selections.length === 0) {
    for (const area of [practice.area, 'routine', 'boredom'] as SupportArea[]) {
      if (selections.length >= 2) break;
      if (comfortable.has(area) || selections.some(item => item.area === area)) continue;
      selections.push({ area, reason: 'An option for this part of your break', recordedAt: null });
    }
  }
  const hasSymptoms = ratings.length > 0;
  const stageCommunity = COMMUNITY_TIPS.filter(tip => tip.windows.includes(window.id));
  const matchingCommunity = stageCommunity.filter(tip => tip.areas.some(area => selections.some(item => item.area === area)));
  const restCommunity = stageCommunity.filter(tip => !matchingCommunity.includes(tip));
  // Rotate accounts so the carousel changes over time, but do it inside each
  // relevance tier. A day offset must never push a matching sleep/craving/etc.
  // account behind unrelated stories.
  const rotate = <T,>(rows: readonly T[]): readonly T[] => {
    if (rows.length === 0) return [];
    const at = (day - 1) % rows.length;
    return [...rows.slice(at), ...rows.slice(0, at)];
  };
  const orderedCommunity = [...rotate(matchingCommunity), ...rotate(restCommunity)];
  const communityTips = (orderedCommunity.length > 0 ? orderedCommunity : [...COMMUNITY_TIPS]).slice(0, 5);
  const communityTip = communityTips[0]!;
  const replacement = input.preparation?.replacementAction?.trim();
  const atTarget = input.targetDays != null && (day === input.targetDays || day === input.targetDays + 1);
  return {
    version: DAILY_SUPPORT_VERSION, day, window, selections, currentCheckins, communityTip, communityTips,
    status: hasSymptoms ? 'Picked from your recent check-ins.' : 'Tap How are you feeling? to make these tips more personal.',
    allComfortable: ratings.length === FIELD_AREAS.length && ranked.length === 0,
    practice: atTarget ? { area: 'routine' as SupportArea, title: 'Review your next step', action: 'At your target, decide whether to continue or finish the break. If you plan to return, review your limits first; the old amount may feel stronger.' } : practice,
    plannedAlternative: replacement ? `At your usual use time, try your planned alternative: “${replacement}”.` : null,
  };
}
