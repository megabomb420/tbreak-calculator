// Versioned editorial guidance, separate from every scientific calculator.
// Ranking cutoffs and the 48-hour freshness limit are UI rules, not clinical
// thresholds. Only a reported rating can raise a topic as a current problem.
import type { DailyCheckin } from '../../domain/schemas/profile.ts';
import type { SupportArea } from '../questionnaire/companion.ts';
import type { BreakPreparation } from '../break/preparation.ts';
import { triggerLabel } from '../break/preparation.ts';
import { primaryWindowForDay, type WithdrawalWindowContent, type WithdrawalWindowId } from '../../domain/guidance/evidence-guidance-v1.ts';

export const DAILY_SUPPORT_VERSION = 'daily-support-v5';

/** How many accounts the carousel holds. Enough that a picked topic has
 * company, few enough that the position dots stay tappable. */
export const COMMUNITY_TIP_LIMIT = 8;
export const SUPPORT_SOURCES = {
  withdrawal: { label: 'NSW Health · cannabis withdrawal', href: 'https://www.health.nsw.gov.au/aod/professionals/Publications/clinical-guidance-withdrawal-alcohol-and-other-drugs.pdf#page=34', kind: 'Clinical guidance' },
  cravings: { label: 'NSW Health · do-it-yourself quitting guide', href: 'https://yourroom.health.nsw.gov.au/publicationdocuments/do-it-yourself-guide-to-quitting.pdf', kind: 'Clinical guidance' },
  turningPoint: { label: 'Turning Point · getting through cannabis withdrawal', href: 'https://turning-point-website-prod.s3.ap-southeast-2.amazonaws.com/drupal-s3fs/s3fs-public/2020-04/TP_Getting%20Through%20Cannabis%20Withdrawal.pdf', kind: 'Clinical guidance' },
  camh: { label: 'CAMH · getting through cannabis withdrawal', href: 'https://camh.ca/-/media/professionals-files/treating-conditions-and-disorders/getting-through-cannabis-withdrawal-camh-pdf.pdf', kind: 'Clinical guidance' },
  sleep: { label: 'NHS · sleep advice', href: 'https://www.nhs.uk/conditions/insomnia/', kind: 'General self-care' },
  sleepRoutine: { label: 'NHS Every Mind Matters · sleep', href: 'https://www.nhs.uk/every-mind-matters/mental-wellbeing-tips/how-to-fall-asleep-faster-and-sleep-better', kind: 'General self-care' },
  relaxation: { label: 'healthdirect · relaxation techniques', href: 'https://www.healthdirect.gov.au/relaxation-techniques-for-stress-relief', kind: 'General self-care' },
  wellbeing: { label: 'NHS · 5 steps to mental wellbeing', href: 'https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/five-steps-to-mental-wellbeing/', kind: 'General self-care' },
  nausea: { label: 'NHS · nausea', href: 'https://www.nhs.uk/symptoms/feeling-sick-nausea/', kind: 'General self-care' },
  headaches: { label: 'NHS · headaches', href: 'https://www.nhs.uk/symptoms/headaches/', kind: 'General self-care' },
  dreams: { label: 'Lee et al. · sleep during abstinence', href: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3986824/', kind: 'Human study' },
  symptoms: { label: 'NIDA · cannabis withdrawal symptoms', href: 'https://nida.nih.gov/research-topics/cannabis-marijuana', kind: 'Research overview' },
  habits: { label: 'University of Vermont · practical break guide', href: 'https://www.uvm.edu/health/t-break-week-1', kind: 'Practical guidance' },
} as const;
export type SupportSourceId = keyof typeof SUPPORT_SOURCES;

export interface SupportGuide {
  readonly title: string;
  readonly explanation: string;
  readonly steps: readonly string[];
  readonly avoid: string;
  readonly seekHelp: string | null;
  readonly sources: readonly SupportSourceId[];
}

// Every guide follows the same shape: why it helps, then what else can help,
// then what tends to make it worse, then when to get advice. Steps stay
// practical and non-prescriptive — no doses, no products, no timelines.
export const SUPPORT_GUIDES: Record<SupportArea, SupportGuide> = {
  sleep: {
    title: 'Trouble sleeping',
    explanation: 'Difficulty falling asleep, waking often and feeling unrefreshed are common early in a break, and sleep often takes longer to settle than appetite or irritability. A steady routine also replaces the part of the evening that used to signal bedtime.',
    steps: [
      'Keep the same wake-up time every day, even after a rough night.',
      'Keep caffeine to the earlier part of the day, and avoid alcohol as a way of getting to sleep.',
      'Use the last hour before bed for something quiet: reading, a breathing exercise, calming music or a podcast.',
      'Go to bed only when you feel sleepy. If you are still awake after about twenty minutes, get up, do something relaxing somewhere comfortable, and go back when you feel drowsy.',
      'Keep the room dark, quiet and cool, with clocks out of view and your phone silenced and face down.',
      'If you wake in the night, settle back into the quiet routine instead of checking the time.',
      'Be active during the day rather than close to bedtime, and keep large meals away from the last hours before sleep.',
    ],
    avoid: 'Chasing a perfect night, sleeping in for hours or going to bed early to catch up usually makes the next night harder.',
    seekHelp: 'Speak to a clinician if sleep loss is making daily life hard to manage, or if a steady routine and time are not helping.',
    sources: ['sleep', 'sleepRoutine', 'turningPoint', 'dreams'],
  },
  cravings: {
    title: 'When an urge hits',
    explanation: 'An urge is usually tied to a time, place, feeling or activity rather than to physical withdrawal, and it can return after the early discomfort has eased. Urges rise and fall, and how long one lasts varies, so the useful thing to have ready is the next step rather than a way to stop the feeling.',
    steps: [
      'Remove the cannabis and the equipment from the room you usually use in. Seeing them is a trigger in itself.',
      'Delay the decision. An urge passes if you do not act on it, so give yourself a few minutes first.',
      'Distract yourself with something that uses your hands or gets you moving: music, tidying, a walk, a game.',
      'Breathe out slowly a few times, and drink some water in small sips.',
      'Change the high-risk situation rather than testing yourself in it: leave, ring someone, or start something unrelated.',
      'Notice what happened just before the urge — time, place, mood, company — and write it down while it is fresh.',
      'Plan for the situations you cannot avoid: who will be there, what you will say, and when you will leave.',
      'Expect urges to come back even in a good week. A returning urge is not a failed break.',
    ],
    avoid: 'Keeping the usual session set up in front of you makes the decision harder, and waiting to “feel ready” keeps the choice open. Craving is a normal part of stopping for regular users, not a sign that the break is failing.',
    seekHelp: 'If repeated urges keep ending breaks you want to take, a clinician or drug support service can help you make a workable plan.',
    sources: ['cravings', 'turningPoint', 'habits'],
  },
  appetite: {
    title: 'Eating with little appetite',
    explanation: 'Food can be less appealing early in a break, especially if using before meals was part of the routine. Appetite usually returns gradually, and eating on a schedule in the meantime keeps the missed meals from adding headaches, low energy and irritability.',
    steps: [
      'Aim for small, light meals regularly through the day rather than waiting until you feel very hungry.',
      'Keep familiar, easy food within reach: toast, yoghurt, soup, a banana, nuts or a sandwich.',
      'Sip fluids through the day, and eat at your usual meal times even when the portion is small.',
      'Choose something balanced where you can — a steady diet helps with mood and energy as well as appetite.',
      'Prepare or buy one easy meal in advance, so the decision is already made when you are tired.',
      'If nausea is the main problem, start with the nausea topic instead — a settled stomach makes eating easier.',
    ],
    avoid: 'Forcing a large meal, skipping food all day, or filling up on caffeine can leave you feeling worse.',
    seekHelp: 'Get medical advice if you cannot eat enough, are losing weight, or poor appetite is not improving. Repeated vomiting needs separate assessment.',
    sources: ['withdrawal', 'camh', 'nausea'],
  },
  anxiety: {
    title: 'Anxiety or restlessness',
    explanation: 'Tension, restlessness and a racing mind can occur after stopping, and missed sleep, skipped meals and extra caffeine all add to it. New or worrying physical symptoms deserve attention rather than being written off as withdrawal.',
    steps: [
      'Make the space around you quieter and calmer, and reduce what you are trying to do at once.',
      'Breathe slowly and count: in for three, out for three, letting the out-breath be the longer one.',
      'Try a relaxation you can repeat: a slow walk, gentle stretching, a warm bath, or tensing and releasing each muscle group in turn.',
      'Ground yourself by naming what you can hear and see, and where your body is resting.',
      'Have a small meal if you have missed one, and keep caffeine and energy drinks to the earlier part of the day.',
      'Write down what is on your mind. Most lists can wait until tomorrow.',
      'Tell one person what today is like, even briefly. Saying it out loud usually makes the day smaller.',
    ],
    avoid: 'Do not automatically label new physical symptoms as anxiety or withdrawal.',
    seekHelp: 'Seek medical advice if anxiety is severe, worsening or stopping you from functioning. Chest pain, fainting or serious breathing difficulty need urgent assessment.',
    sources: ['relaxation', 'withdrawal', 'turningPoint'],
  },
  irritability: {
    title: 'A shorter temper',
    explanation: 'Irritability can be part of early withdrawal, and being tired, hungry or in a noisy place adds to it. It tends to come and go rather than climbing steadily.',
    steps: [
      'Pause before replying when you feel the temperature rising. A few seconds is usually enough to change the reply.',
      'Say plainly that you need a short break, then leave the room.',
      'Come back to the subject after food, rest or a walk.',
      'Postpone one avoidable demand instead of pushing through everything at once.',
      'Give the tension somewhere physical to go: a walk, a shower, stretching, or tidying one room.',
      'Plan ahead for the situations where patience is thinnest — the evening, driving, or a crowded house.',
      'Cut back on caffeine while this lasts: it can add to restlessness and a short fuse.',
      'Where you can, keep your surroundings quiet, calm and private rather than noisy and crowded.',
    ],
    avoid: 'A difficult day does not make every disagreement a withdrawal symptom.',
    seekHelp: 'Get help if anger feels unmanageable or you are worried about harming yourself or someone else.',
    sources: ['withdrawal', 'symptoms'],
  },
  low_mood: {
    title: 'Feeling flat',
    explanation: 'Low mood can occur during a break, but the calendar cannot tell you its cause or when it will lift. Small, concrete activity usually helps more than waiting to feel motivated, because the mood tends to follow the activity rather than the other way round.',
    steps: [
      'Pick one small task with a clear end: make lunch, wash up, or walk around the block.',
      'Do it before you feel like it, and treat finishing as enough for now.',
      'Get moving and outside for a while — exercise lifts mood even when it does not remove the cause.',
      'Arrange some contact with someone you know, even a short call, a shared meal or a game.',
      'Learn or make something small: cooking something new, a repair, a craft, or a puzzle.',
      'Keep a manageable plan for the rest of the day rather than filling every hour.',
      'Write down three things that went all right at the end of the day.',
      'Expect this to take a while. Mood commonly takes a week or two — sometimes longer — to return to its usual level, so do not judge your baseline after a few days.',
    ],
    avoid: 'Do not dismiss persistent or worsening low mood as something you simply have to wait out.',
    seekHelp: 'Contact a clinician if low mood persists, worsens or makes everyday life difficult. If you might act on thoughts of self-harm, seek emergency help now.',
    sources: ['wellbeing', 'camh', 'withdrawal'],
  },
  dreams: {
    title: 'Vivid or unsettling dreams',
    explanation: 'Dreams often become more noticeable during abstinence, usually alongside lighter or broken sleep. They do not measure how much THC has left your body, and they usually settle as sleep does.',
    steps: [
      'After waking, take a moment to orient yourself: name the room, the day, and one thing you can see.',
      'Keep the same quiet wind-down routine tonight instead of building the evening around the worry of another dream.',
      'Keep a small light or a familiar object nearby if waking in a dark room makes a vivid dream harder to shake off.',
      'Write the dream down briefly if it helps to get it out of your head before going back to sleep.',
      'Note how rested you felt in the morning rather than how strange the dream was.',
      'Keep caffeine and screens out of the last part of the evening, as you would for any disturbed sleep.',
      'If waking in the night has become the pattern, treat it as a sleep problem: keep the wake time steady and follow the sleep topic below.',
    ],
    avoid: 'A vivid dream is not evidence of a completed tolerance reset, and it is not a sign that the break is going wrong. Vivid or unsettling dreams are commonly reported during cannabis withdrawal.',
    seekHelp: 'Talk to a clinician if nightmares repeatedly disrupt sleep or leave you distressed during the day.',
    sources: ['dreams', 'symptoms', 'sleepRoutine'],
  },
  nausea: {
    title: 'Nausea or an unsettled stomach',
    explanation: 'Stomach symptoms have several possible causes, and being on a break does not establish that withdrawal is responsible. Small amounts of fluid and plain food are usually easier to keep down than a large meal.',
    steps: [
      'Take small, regular sips of a cool drink rather than a large glass at once, and keep drinking through the day.',
      'Try small, light meals rather than a full plate: toast, crackers, rice, yoghurt or soup.',
      'Avoid strong-smelling or greasy food while it is making things worse.',
      'Eat slowly and stay upright for a while after eating.',
      'Get some air and loosen tight clothing.',
      'If vomiting starts, keep sipping fluids and seek advice early rather than waiting for it to pass.',
    ],
    avoid: 'Repeated vomiting or severe abdominal pain should not be treated as an ordinary part of a break.',
    seekHelp: 'Seek prompt medical advice for repeated vomiting, inability to keep fluids down or severe abdominal pain. If nausea persists for several days, arrange a review.',
    sources: ['nausea', 'withdrawal', 'turningPoint'],
  },
  headaches: {
    title: 'Headaches',
    explanation: 'Headaches can have many causes, including missed meals, changes in caffeine, poor sleep, stress and illness. Noting when they happen is more useful than assuming they are withdrawal.',
    steps: [
      'Have some water and something to eat if you have missed a meal.',
      'If you are cutting down on caffeine, do it gradually — stopping suddenly can bring its own headache.',
      'A warm bath, a gentle walk or some slow breathing can ease the tension that often comes with withdrawal.',
      'Rest somewhere quiet and dim, and take a break from screens.',
      'Keep meals and sleep reasonably regular while they are recurring.',
      'Note when each headache started, what you had eaten, and how you slept, so a pattern can be seen rather than guessed at.',
    ],
    avoid: 'Extra water does not speed THC clearance. Do not assume an unusual headache is withdrawal.',
    seekHelp: 'A sudden, extremely painful headache, or one with weakness, confusion or speech problems, needs emergency assessment. Recurrent or worsening headaches need medical review.',
    sources: ['turningPoint', 'headaches'],
  },
  routine: {
    title: 'The usual time to use',
    explanation: 'A familiar time, place or activity can prompt the habit even when you are not feeling much withdrawal. The old routine keeps its pull when nothing else occupies that slot.',
    steps: [
      'Name the moment you would normally use: after work, after dinner, before bed, or the first hour of the day.',
      'Change one part of it — a different room, a different chair, a walk, or a different order to the evening.',
      'Decide what you will actually do in that slot, and put what you need in reach beforehand.',
      'Move the things that belong to the old routine out of sight: equipment, papers, paraphernalia, the usual spot on the table.',
      'If you are still using at all, delay the first session of the day rather than cutting it out completely; that one change weakens the automatic part fastest.',
      'Keep a note of when you use and what set it off. A written record shows the pattern far better than memory.',
      'Keep the rest of the day’s shape with regular meals, a steady wake-up time and something to look forward to.',
    ],
    avoid: 'Leaving the old routine completely unchanged can keep prompting the same decision, and an abstract plan with no time in it is easy to postpone. Bulk-buying or restocking soon after being paid strengthens the same pull.',
    seekHelp: null,
    sources: ['camh', 'habits', 'withdrawal'],
  },
  boredom: {
    title: 'Filling the empty time',
    explanation: 'A break can leave a gap where a session used to be. Empty time is the hardest thing to fill with a decision you have not made yet, so choosing something specific in advance — ideally something you would want to do anyway — works better than a general intention to stay busy.',
    steps: [
      'Write out a short list in advance of things you can do instead: films, cooking, music, a walk, ringing someone.',
      'Pick easy activities while withdrawal is strong. Long concentration is not required, and short trips out count.',
      'Choose something with a natural end so it does not become another task to avoid.',
      'Set it up before your usual session time, so nothing has to be decided in the moment.',
      'Keep one option that uses your hands, one that gets you out of the house, and one for when you are tired.',
      'Use part of what you are not spending on cannabis for something you would actually enjoy.',
      'Notice which activities helped, and use those again rather than starting from scratch.',
    ],
    avoid: 'An empty evening and an abstract promise to stay busy are a difficult combination.',
    seekHelp: null,
    sources: ['cravings', 'wellbeing', 'habits'],
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
  { id: 'nausea-day-two-vomiting', areas: ['nausea'], windows: ['days_1_3', 'days_2_6'], period: 'Day 2', title: 'The flu-like version', text: 'After heavy cart use, one person reported vomiting several times at night on day 2, sweating and chills, and managing only a piece of toast the next morning. A commenter in the same thread described the same flu-like pattern and judged day 3 the peak.', href: 'https://www.reddit.com/r/Petioles/comments/1vrwaa1/nausea_and_vomiting_from_tolerance_break/', thread: 'Nausea and vomiting from a tolerance break' },
  { id: 'nausea-morning-stomach', areas: ['nausea', 'appetite'], windows: ['days_1_3', 'days_2_6', 'days_7_14'], period: 'First days', title: 'Morning stomach upset derailed attempts', text: 'A five-year smoker described attempts to cut back being derailed by morning stomach upset that only the first smoke relieved. A commenter said the first four or five days were the worst and ate snacks rather than meals.', href: 'https://www.reddit.com/r/Petioles/comments/1vy0soi/how_do_i_get_past_the_nausea/', thread: 'How do I get past the nausea' },
  { id: 'nausea-eating-triggered', areas: ['nausea', 'appetite'], windows: ['days_1_3', 'days_2_6'], period: 'First week', title: 'Eating itself triggered nausea', text: 'A heavy cart user who stopped before a trip lost their appetite almost completely and found that eating brought on nausea; fruit smoothies were what they could manage. A commenter said this had happened on every break for one to two weeks.', href: 'https://www.reddit.com/r/Petioles/comments/mbxmes/ive_been_using_carts_heavily_for_a_couple_years/', thread: 'Appetite gone, and eating made it worse' },
  { id: 'appetite-first-three-days', areas: ['appetite', 'nausea'], windows: ['days_1_3', 'days_2_6'], period: 'Days 1–3', title: 'Three days of almost no food', text: 'One person reported managing only fruit for a day and being sick several times, then eating a banana, crackers and a small plate of pasta on day 3. A commenter described a similar first three days.', href: 'https://www.reddit.com/r/Petioles/comments/cxur22/struggling_the_most_i_ever_have_on_a_tolerance/', thread: 'Struggling the most on a tolerance break' },
  { id: 'headache-day-four', areas: ['headaches'], windows: ['days_2_6', 'days_7_14'], period: 'Day 4', title: 'A headache that outlasted the night', text: 'A daily heavy user described an excruciating headache that began one night on day 4 and was still there on waking, easing after drinking more water. A commenter reported constant headaches through the first two to three weeks.', href: 'https://www.reddit.com/r/Petioles/comments/1v3clgb/on_day_4_of_t_break_and_my_head_is_killing_me/', thread: 'Day 4 and my head is killing me' },
  { id: 'irritability-day-one-rage', areas: ['irritability', 'low_mood'], windows: ['days_1_3', 'days_2_6'], period: 'Day 1', title: 'Day one brought rage, then flatness', text: 'After a year of daily edibles, one person described day one as seething rage, being short with their children at bedtime, crying, and finding food, sleep, television and books uninteresting. A commenter in the same thread wrote at day 46 that the rage and irritability had eased after the first week or two while feeling flat remained.', href: 'https://www.reddit.com/r/Petioles/comments/1r6sn2c/taking_my_first_break_i_had_no_idea_it_would_be/', thread: 'My first break — I had no idea it would be like this' },
  { id: 'irritability-then-sadness', areas: ['irritability', 'low_mood', 'cravings'], windows: ['days_2_6', 'days_7_14'], period: 'First week', title: 'Irritability, then sadness', text: 'One person described their mood flipping to irritability and anger about nothing in particular after about a week without smoking, followed by sadness and crying. A commenter in week two replaced the session with slow breathing, or drinking through a straw, to satisfy the physical urge.', href: 'https://www.reddit.com/r/Petioles/comments/1ntrv0y/t_break_help_pleaseeee/', thread: 'T-break help, please' },
  { id: 'irritability-sweating-aggression', areas: ['irritability', 'headaches'], windows: ['days_1_3', 'days_2_6'], period: 'First days', title: 'Uncharacteristic anger, headaches and sweating', text: 'A recreational user used to sleep changes, vivid dreams and a few days of poor appetite reported this break bringing uncharacteristic aggression along with headaches and sweating, and said both eased within a few days.', href: 'https://www.reddit.com/r/Petioles/comments/1u9xsn1/how_to_deal_with_annoying_sweating_and_aggression/', thread: 'Sweating and aggression during a break' },
  { id: 'sleep-day-five', areas: ['sleep'], windows: ['days_2_6', 'days_7_14'], period: 'Day 5', title: 'Good habits did not fix it overnight', text: 'On day 5 one person reported almost no sleep despite daily exercise, strict caffeine, meal, fluid and screen cut-offs, and daily meditation: too tired to follow a film, and still unable to fall asleep.', href: 'https://www.reddit.com/r/Petioles/comments/18z85ru/tbreak_insomnia/', thread: 'T-break insomnia' },
  { id: 'sleep-night-one', areas: ['sleep', 'cravings'], windows: ['days_1_3'], period: 'Night 1', title: 'Night one can be the hardest', text: 'A nightly-only user described giving in on the first night after hours of restlessness and anxiety. A commenter who vaped heavily through the day said they could sleep through without night sweats by around day 4–5.', href: 'https://www.reddit.com/r/Petioles/comments/s3wunh/ive_been_a_nightly_only_cannabis_user_for_a_few/', thread: 'Nightly user who failed the first night' },
  { id: 'sleep-three-weeks', areas: ['sleep', 'appetite', 'low_mood'], windows: ['days_14_21', 'days_21_28'], period: 'Week 3', title: 'Sleep and appetite still unsettled at three weeks', text: 'A lighter user stopping before surgery reported at three weeks being unable to sleep before around 3am, waking early, and appetite swinging between constant hunger and none, describing the stretch as just surviving instead of living.', href: 'https://www.reddit.com/r/Petioles/comments/1vnv4nc/3_weeks_without_and_my_sleep_and_appetite_is/', thread: 'Three weeks without, sleep and appetite unsettled' },
  { id: 'dreams-day-23', areas: ['dreams', 'sleep'], windows: ['days_21_28', 'beyond_28'], period: 'Day 23', title: 'Intense dreams at day 23', text: 'Someone on day 23 of a month-long break, after daily use for most of a decade, still had intense conflict-heavy dreams. A commenter six months in said the dreams had stayed vivid and they had grown used to them.', href: 'https://www.reddit.com/r/Petioles/comments/1w90kb7/day_23_why_are_my_dreams_still_insane/', thread: 'Day 23: why are my dreams still intense?' },
  { id: 'dreams-forty-two-days', areas: ['dreams', 'sleep'], windows: ['beyond_28'], period: 'Day 42', title: 'Dreaming was the worst part', text: 'At 42 days one person said vivid dreams affected their mood on waking and sometimes continued after waking mid-night, and that dreaming was the hardest part of stopping. A commenter at 60 days described vivid dreams about ordinary events leaving them emotionally drained.', href: 'https://www.reddit.com/r/Petioles/comments/1thr1sn/42_days_no_weed_but_my_dreams_are_horrible/', thread: '42 days without, and the dreams are horrible' },
  { id: 'dreams-nightmares-eased', areas: ['dreams'], windows: ['days_7_14', 'days_14_21'], period: 'Around day 11', title: 'Nightmares that eased', text: 'Around day 11 after five months of use, one person described terrifying, violent nightmares and wrote that they missed dreamless sleep. A commenter said their nightmares eased within the first two weeks and then appeared only occasionally.', href: 'https://www.reddit.com/r/Petioles/comments/1w6ps28/any_advice_on_dealing_with_the_weird_messed_up/', thread: 'Advice on the nightmares after quitting' },
  { id: 'mood-week-two-crochet', areas: ['low_mood', 'boredom'], windows: ['days_7_14', 'days_14_21'], period: 'Week 2', title: 'Keeping hands busy through the flat stretch', text: 'After seven years of daily use one person crocheted through the first withdrawal days, then found motivation low in week two and said the hardest part was having nothing to reach for. A commenter at day 23 called days 6–18 awful on very little sleep, then noticed laughing more easily and their creative drive returning.', href: 'https://www.reddit.com/r/Petioles/comments/1pbv2sg/day_15_off_weed_picked_up_crochet_as_a_way_to/', thread: 'Day 15 off, crochet as a way through' },
  { id: 'boredom-main-driver', areas: ['boredom', 'cravings'], windows: ['days_1_3', 'days_2_6', 'days_7_14'], period: 'Early days', title: 'Boredom as the main driver', text: 'One person called boredom the biggest reason they smoked, warned that the first stretch feels like sitting around as a sad lump before energy returns, and advised against forcing a hobby you like the idea of but do not enjoy. Walking the dog with music and cooking a proper meal helped most.', href: 'https://www.reddit.com/r/Petioles/comments/a9wl9i/tips_with_boredom_on_a_t_break/', thread: 'Tips for boredom on a T-break' },
  { id: 'boredom-low-effort', areas: ['boredom'], windows: ['days_2_6', 'days_7_14'], period: 'Mid-break', title: 'Low-effort immersion', text: 'Someone who had been smoking heavily at home out of boredom found being at home sober unbearable. A commenter suggested paint-by-numbers or colour-by-numbers as low-stress and absorbing, and they planned to colour old sketches and arrange a walk with friends.', href: 'https://www.reddit.com/r/Petioles/comments/k49mql/advice_for_being_bored_on_a_tbreak/', thread: 'Advice for being bored on a T-break' },
  { id: 'boredom-day-two-argument', areas: ['boredom', 'irritability', 'routine'], windows: ['days_1_3'], period: 'Day 2', title: 'Boredom can turn into a row', text: 'On day 2 one person said irritability was taking over and they argued with their partner about being intensely bored, having already cleaned everything in the house. A commenter suggested starting an activity they had never done while high, and evenings became dog walks.', href: 'https://www.reddit.com/r/Petioles/comments/p2fyqq/first_major_t_break/', thread: 'First major T-break' },
  { id: 'craving-cold-shower', areas: ['cravings', 'routine'], windows: ['days_2_6', 'days_7_14', 'days_14_21'], period: 'Strong urges', title: 'Treating the urge as information', text: 'One person treats a craving as information rather than a command and, for the strongest ones where their mind argues for just one hit, uses a cold shower to break the moment. A commenter added that leaving the house for a park walk helps with the thinking.', href: 'https://www.reddit.com/r/Petioles/comments/u49oa6/for_those_on_tbreaks_every_time_you_overcome_a/', thread: 'Every craving you overcome counts' },
  { id: 'craving-month-three', areas: ['cravings'], windows: ['beyond_28'], period: 'About 2½ months', title: 'A late spike after a quiet month', text: 'About two and a half months into a three-month break, one person had almost no cravings in the second month and then a brutal week around weeks 8–10, naming job stress as the trigger. A commenter argued the spike was about meeting more triggers, not about the week count.', href: 'https://www.reddit.com/r/Petioles/comments/1vus5yt/stronger_urges_in_month_3/', thread: 'Stronger urges in month 3?' },
  { id: 'craving-four-weeks', areas: ['cravings', 'routine'], windows: ['days_21_28', 'beyond_28'], period: 'Week 4', title: 'Physical eased before the urges did', text: 'A heavy user at four weeks said cravings were as strong as in week one and that the usual reassurance had not matched their experience so far. A commenter reported most physical effects gone by four weeks, with cravings taking months.', href: 'https://www.reddit.com/r/Petioles/comments/1seimzx/4_weeks_not_smoking_and_really_struggling/', thread: 'Four weeks without and really struggling' },
  { id: 'routine-hide-the-stash', areas: ['routine', 'cravings', 'dreams'], windows: ['days_1_3', 'days_2_6', 'days_7_14'], period: 'Weeks 1–3', title: 'Box it up before you start', text: 'A diary-style account: boxing up and hiding everything before starting; vivid dreams and a clearer head in week one; cravings strong enough in week two that having anything in the house would have ended it; by week three the pull felt more like a want than a need. Drinking water, less caffeine, training and walks were what helped.', href: 'https://www.reddit.com/r/Petioles/comments/l4sbek/tips_tricks_and_tales_from_my_tolerance_break/', thread: 'Tips and tales from my tolerance break' },
  { id: 'routine-morning-session', areas: ['routine', 'low_mood'], windows: ['days_1_3', 'days_2_6'], period: 'Tapering', title: 'The morning session was the last to go', text: 'After tapering from nine joints a day to three or four, one person could not drop the morning one because their mood was very low without it. They later reported that a slow morning routine — hot drinks, reading, then a walk — worked better than forcing a workout.', href: 'https://www.reddit.com/r/Petioles/comments/1v43v29/advice_for_stopping_morning_smoke/', thread: 'Advice for stopping the morning smoke' },
  { id: 'return-first-hit-stronger', areas: ['routine', 'cravings'], windows: ['days_21_28', 'beyond_28'], period: 'First session back', title: 'The first sessions back hit much harder', text: 'After six days off, someone who had been dabbing heavily described nearly greening out on two cart hits, then doing so again on a single bowl. A commenter advised starting with a very small hit.', href: 'https://www.reddit.com/r/Petioles/comments/18jmng6/update_on_my_6_day_t_break/', thread: 'Update on my six-day break' },
  { id: 'return-ninety-days', areas: ['routine', 'cravings'], windows: ['beyond_28'], period: 'After 90 days', title: 'A long break did not promise a dramatic first high', text: 'After 90 days off one person felt underwhelmed by their first smoke and wondered whether tolerance had really reset. A commenter described keeping to one or two very small hits, hours apart, and finding the effects strong for months afterwards.', href: 'https://www.reddit.com/r/Petioles/comments/196wd98/after_a_90_day_break_from_weed_the_first_smoke/', thread: 'The first smoke after a 90-day break' },
  { id: 'return-eight-months', areas: ['routine'], windows: ['beyond_28'], period: 'After 8 months', title: 'Comfortable, then much too strong', text: 'After roughly eight months off, one person felt only mildly affected by two puffs, took three more after dinner, and became extremely stoned and uncomfortable in company, feeling flat the next day. A commenter described the same pattern becoming milder after about a week of smoking again.', href: 'https://www.reddit.com/r/Petioles/comments/wdt5fx/smoked_again_after_8_months/', thread: 'Smoked again after eight months' },
  { id: 'routine-training-felt-different', areas: ['routine', 'sleep'], windows: ['days_14_21', 'days_21_28'], period: 'Week 3', title: 'Training felt different for a while', text: 'A daily smoker of more than a year found at week three that they could no longer manage more than five to ten minutes of cardio, down from an hour, and felt overheated and drenched. A commenter attributed the temperature regulation to withdrawal and said it commonly settles within a few weeks.', href: 'https://www.reddit.com/r/Petioles/comments/1s85dmj/struggling_with_endurance_while_working_out_after/', thread: 'Endurance while working out after three weeks' },
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

/** What Today shows for one topic: why it is here and the line to act on. */
export interface AdviceSection {
  readonly area: SupportArea;
  readonly reason: string;
  readonly recordedAt: string | null;
  /** The person's own plan first wherever their plan covers this topic. */
  readonly action: string;
  readonly usesPersonalPlan: boolean;
  readonly triggerLine: string | null;
  readonly fallbackLine: string | null;
}

/** The one card Today renders for the day. */
export interface DailySupportView {
  readonly version: string;
  readonly day: number;
  readonly window: WithdrawalWindowContent;
  /** Hard ratings only (severity >= 4), severity descending, FIELD_AREAS order
   * on a tie. Empty when nothing was rated hard enough to act on; ratings are
   * no longer collected on Today, so this is empty for a fresh break. */
  readonly selections: readonly AdviceSelection[];
  /** The topic Today shows until the person picks another one. */
  readonly defaultArea: SupportArea;
  /** The person's own plan, as far as it applies to any topic. */
  readonly plan: {
    readonly replacement: string;
    readonly triggerLine: string | null;
    readonly fallbackLine: string | null;
  };
  readonly currentCheckins: readonly DailyCheckin[];
  readonly communityTip: CommunityTip;
  readonly communityTips: readonly CommunityTip[];
  readonly allComfortable: boolean;
  readonly practice: { readonly area: SupportArea; readonly title: string; readonly action: string };
}

/** Areas where the person's own plan outranks generic advice. */
const PLAN_FIRST_AREAS: readonly SupportArea[] = ['routine', 'cravings', 'boredom'];

/** The accounts the carousel shows for the topic on screen: the ones that
 * speak to that topic first, then the rest of the stage's accounts, so the
 * experiences follow whatever the person is dealing with. */
export function communityTipsFor(view: DailySupportView, area: SupportArea | null): readonly CommunityTip[] {
  if (area === null) return view.communityTips.slice(0, COMMUNITY_TIP_LIMIT);
  const matching = view.communityTips.filter((tip) => tip.areas.includes(area));
  const rest = view.communityTips.filter((tip) => !tip.areas.includes(area));
  return [...matching, ...rest].slice(0, COMMUNITY_TIP_LIMIT);
}

/** One topic's block. The picker can ask for any topic, so the plan rules live
 * here rather than in the components. */
export function adviceSectionFor(view: DailySupportView, area: SupportArea): AdviceSection {
  const selection = view.selections.find((item) => item.area === area);
  const planFirst = PLAN_FIRST_AREAS.includes(area);
  return {
    area,
    reason: selection?.reason ?? 'For this stage of the break',
    recordedAt: selection?.recordedAt ?? null,
    action: planFirst && view.plan.replacement !== ''
      ? `Try your plan first: “${view.plan.replacement}”.`
      : SUPPORT_GUIDES[area].steps[0]!,
    usesPersonalPlan: planFirst && view.plan.replacement !== '',
    triggerLine: planFirst ? view.plan.triggerLine : null,
    fallbackLine: planFirst ? view.plan.fallbackLine : null,
  };
}

export function presentDailySupport(input: DailySupportInput): DailySupportView {
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
  // Only a reported rating can raise a topic as a current problem, and only at
  // severity 4 or harder. A quiet day keeps the day's own practice instead of
  // two generic essays.
  const ranked = ratings.filter(item => item.severity >= 4).sort((a, b) => b.severity - a.severity);
  const selections: AdviceSelection[] = ranked.map(item => ({ area: item.area, reason: `${item.label} ${item.value}/10 in your check-in`, recordedAt: item.recordedAt }));
  const replacement = input.preparation?.replacementAction?.trim() ?? '';
  const fallback = input.preparation?.fallbackPlan?.trim() ?? '';
  const customTrigger = input.preparation?.customTrigger?.trim() ?? '';
  const triggerLabels = [
    ...(input.preparation?.triggerIds ?? []).map(triggerLabel),
    ...(customTrigger === '' ? [] : [customTrigger]),
  ];
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
  const communityTips = orderedCommunity.length > 0 ? orderedCommunity : [...COMMUNITY_TIPS];
  const communityTip = communityTips[0]!;
  const atTarget = input.targetDays != null && (day === input.targetDays || day === input.targetDays + 1);
  return {
    version: DAILY_SUPPORT_VERSION, day, window, selections,
    defaultArea: selections[0]?.area ?? (atTarget ? 'routine' : practice.area),
    plan: {
      replacement,
      triggerLine: triggerLabels.length > 0 ? `You flagged: ${triggerLabels.join(', ')}.` : null,
      fallbackLine: fallback !== '' ? `If that is not possible: ${fallback}.` : null,
    },
    currentCheckins, communityTip, communityTips,
    allComfortable: ratings.length === FIELD_AREAS.length && ranked.length === 0,
    practice: atTarget ? { area: 'routine' as SupportArea, title: 'Review your next step', action: 'At your target, decide whether to continue or finish the break. If you plan to return, review your limits first; the old amount may feel stronger.' } : practice,
  };
}
