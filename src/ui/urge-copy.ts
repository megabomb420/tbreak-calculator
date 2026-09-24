// Copy for the delay timer. Every line stays a description of what the timer
// does and what the person reported; nothing claims that an urge was beaten,
// that a craving peaks at a particular time, or that a count means anything
// about tolerance.

export const RIDE_IT_OUT = {
  title: 'Ride it out',
  /** The choice step, before a timer exists. */
  question: 'How long will you wait before deciding anything?',
  intro:
    'Delay is the part you control. Pick a length, put the phone down if you can, and use the time for something else. The timer keeps the promise for you.',
  choice: 'Start the timer',
  /** The running step. */
  remaining: 'Time left',
  planLead: 'Your own plan for this:',
  ideas: 'What can help while it runs',
  stop: 'Stop the timer',
  stopNote: 'Stopping records nothing.',
  /** The step after the countdown reaches zero. */
  elapsed: 'The timer is done. How is it now?',
  easier: 'Easier',
  stillThere: 'Still there',
  outcomeNote:
    'Either answer only records how the last few minutes went. It is not a score, and it says nothing about your tolerance.',
  done: 'Logged.',
  doneCount: (count: number): string =>
    count === 1 ? 'This was your first one.' : `That is ${count} of these you have sat with.`,
  /** Today's entry point. */
  open: 'Ride it out',
  runningCta: (remaining: string): string => `Ride it out · ${remaining} left`,
  summary: (total: number, lastSevenDays: number): string =>
    total === 0
      ? ''
      : `${total} finished${lastSevenDays > 0 ? `, ${lastSevenDays} in the last seven days` : ''}.`,
} as const;
