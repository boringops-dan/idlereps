/**
 * Every line IdleReps shows (plan §1.10): Swolomon's and the plain product voice, the address terms, the
 * daily agent storyline, and the stable variant picker. Pure. A lint test checks every entry against the
 * voice rules.
 */

import type { Cue, LongTaskReason } from '../types'

export const COACH_NAME = 'Swolomon'

/** The one site origin (§4.3 item 7): the share line, the feedback and telemetry URLs derive from it. */
export const SITE_ORIGIN = 'https://idlereps.app'
/** Where `/workout feedback` and the check-in send (§1.6); the endpoint is the site's own. */
export const FEEDBACK_URL = `${SITE_ORIGIN}/api/feedback`
/** Where opted-in usage events go (D9): the site, which forwards them; never a third-party host. */
export const TELEMETRY_URL = `${SITE_ORIGIN}/api/events`
/** The community (§1.6): ideas, questions and shared plans. */
export const COMMUNITY_URL = 'https://github.com/boringops-dan/idlereps/discussions'

/** How Swolomon addresses the person: gender-neutral, and never a rank name (§1.10, §1.13.1). */
export const ADDRESS_TERMS = [
  'swolemate',
  'gainzer',
  'champ',
  'legend',
  'beast',
  'big dog',
  'gym buddy',
  'young lifter',
  'chief',
  'tank',
] as const

export type Voice = 'swolomon' | 'plain'
export type LineEntry = { id: string; voice: Voice; variants: readonly string[] }

/**
 * The registry. Placeholders: `{mate}` (filled by `line`), `{coach}`, `{workout}` (the workout's name
 * without its week), `{n}`, `{agentDoing}` / `{AgentDoing}`, `{nextDay}`, and the plain lines' own.
 */
export const LINES = [
  // Swolomon (§1.10, §1.10c).
  {
    id: 'ask-first',
    voice: 'swolomon',
    variants: [
      '{workout} while {agentDoing}, {mate}?',
      '{coach} decrees: {workout}, {n} sets. You in, {mate}?',
      // §1.10: the plain line under it already gives the count, so this variant does not repeat it (and
      // with the name tag it stays within 80 columns).
      '{AgentDoing}, {mate}. {workout}?',
    ],
  },
  {
    id: 'pick-up',
    voice: 'swolomon',
    variants: [
      '{workout} awaits, {mate}. {n} sets left. Finish it?',
      'Unfinished business, {mate}: {n} sets of {workout}.',
      'The iron remembers, {mate}. {n} sets left in {workout}.',
    ],
  },
  {
    id: 'set',
    voice: 'swolomon',
    variants: ["Let's eat, {mate}.", '{coach} decrees this set, {mate}. Go.', 'Light work, {mate}. You got this.'],
  },
  {
    id: 'skip',
    voice: 'swolomon',
    variants: [
      'Skipped. All good, {mate}. The wise lifter listens to the body.',
      "Respect, {mate}. That set's for another day.",
      "No sweat, {mate}. Next one's yours.",
    ],
  },
  {
    id: 'not-today',
    voice: 'swolomon',
    variants: [
      'Rest is part of the program, {mate}. See you {nextDay}.',
      'Recovery day, {mate}. Eat your protein. See you {nextDay}.',
      'Respect, {mate}. {nextDay}, we ride.',
    ],
  },
  {
    id: 'workout-done',
    voice: 'swolomon',
    variants: [
      "{workout} DONE, {mate}! How'd it feel?",
      "That's {workout} in the books, {mate}. How was it?",
      '{workout} conquered, {mate}. How was it?',
    ],
  },
  {
    id: 'day-toast',
    voice: 'swolomon',
    variants: [
      '{workout} today, {mate}, while {agentDoing}.',
      '{coach} decrees {workout} today, {mate}. {n} sets.',
      "It's {workout} day, {mate}, and {agentDoing}.",
    ],
  },
  {
    // The agent said how long it will be away (it scheduled its own wake-up): the wait, said.
    id: 'reason-napping',
    voice: 'swolomon',
    variants: ["Your agent's back in {wait}, {mate}. Perfect for a set.", 'Your agent stepped out for {wait}, {mate}. Your turn.'],
  },
  {
    id: 'reason-waiting',
    voice: 'swolomon',
    variants: ["Your agent's watching the kettle, {mate}. Got time for a set?"],
  },
  {
    id: 'reason-planned',
    voice: 'swolomon',
    variants: ['Your agent wrote a whole to-do list, {mate}. Got time for a set?', "Big plan from your agent, {mate}. Let's make one too."],
  },
  {
    id: 'reason-helpers',
    voice: 'swolomon',
    variants: [
      'Your agent called in a spotter, {mate}. Looks like a long one.',
      'Your agent brought backup, {mate}. Got time for a set?',
    ],
  },
  {
    id: 'reason-long-run',
    voice: 'swolomon',
    variants: [
      "Ooh, your agent's on a heavy set, {mate}. Got time for one?",
      "Your agent's under the bar a while, {mate}. Your turn too?",
    ],
  },
  {
    id: 'reason-slow-step',
    voice: 'swolomon',
    variants: ["Your agent's grinding a long rep, {mate}. Your window's open."],
  },
  {
    id: 'reason-busy',
    voice: 'swolomon',
    variants: ["Your agent's deep in a big session, {mate}. Got time for a set?"],
  },
  {
    id: 'reason-big-ask',
    voice: 'swolomon',
    variants: ["That's a big lift for your agent, {mate}. Got time for a set?"],
  },

  {
    id: 'new-best',
    voice: 'swolomon',
    variants: ['NEW BEST, {mate}! It is written.', 'A new best. {coach} is proud, {mate}.', 'The iron does not lie, {mate}. New best.'],
  },
  {
    // After Quick start or setup on a training day: the plan is ready and so is today's workout.
    id: 'plan-ready-ask',
    voice: 'swolomon',
    variants: [
      "Plan's racked, {mate}. {workout} today. First set now?",
      'Fresh plan, {mate}! {workout} today. Want the first set?',
      '{coach} decrees: {workout}, today. Ready, {mate}?',
    ],
  },
  {
    // After a new plan on a rest day: the first workout's day, and a set now if they want a taste.
    id: 'plan-ready-later-ask',
    voice: 'swolomon',
    variants: ["Plan's racked, {mate}. First workout {when}. Want a taste?"],
  },
  // Swolomon in the Workout pane: one line for where the day stands.
  { id: 'pane-fresh', voice: 'swolomon', variants: ['{n} sets on the menu today, {mate}. Hungry?', "Today's menu: {workout}. Dig in, {mate}.", '{n} sets today, {mate}. I already warmed up. For you.', 'Fresh day, {mate}. {n} sets, zero excuses.'] },
  {
    id: 'pane-half',
    voice: 'swolomon',
    variants: ['Half today, {mate}. {n} sets to go, and every one counts.', 'You showed up, {mate}. {n} sets and the day is yours.'],
  },
  { id: 'pane-mid', voice: 'swolomon', variants: ['{n} sets to go, {mate}. The iron waits.', "Halfway's a myth, {mate}. {n} sets to go.", '{n} sets left, {mate}. Your agent believes in you. Probably.', 'Keep stacking, {mate}. {n} sets to glory.'] },
  { id: 'pane-done', voice: 'swolomon', variants: ['Done for today, {mate}. {coach} salutes you.', 'Workout done, {mate}. Go drink some water.', 'Done, {mate}. The gods are taking notes.', 'Finished, {mate}. I would carry you on my shoulders.'] },
  { id: 'pane-rest', voice: 'swolomon', variants: ['Rest day, {mate}. Muscles grow on the couch.', 'No sets today, {mate}. Recovery is a lift too.', "Rest day, {mate}. I'm resting too. Aggressively.", 'Today we recover, {mate}. Tomorrow we feast.'] },
  { id: 'pane-declined', voice: 'swolomon', variants: ['Rest is training too, {mate}. See you {nextDay}.', 'Not today, {mate}. The iron understands. See you {nextDay}.', 'Skipped, {mate}. Even legends take a breather.'] },
  { id: 'pane-paused', voice: 'swolomon', variants: ['Paused, {mate}. The iron will wait for you.', 'Paused, {mate}. I will stand here. Flexing. Waiting.'] },
  // Just remind me: a set, anything, while the agent works.
  { id: 'remind-first', voice: 'swolomon', variants: ['Deal, {mate}. Your agent works, you do a set. Try one now?'] },
  {
    id: 'remind-ask',
    voice: 'swolomon',
    variants: ["Your agent's busy, {mate}. Drop and give me a set. Anything.", '{AgentDoing}. Your turn, {mate}: one set.', 'The iron is calling, {mate}. One set, any set.'],
  },
  { id: 'moved-logged', voice: 'swolomon', variants: ['{what} logged, {mate}. {n} today.', '{what}, {mate}. Written in the scrolls. {n} today.', '{what}, {mate}. My laurel just got shinier. {n} today.', "Logged, {mate}. {what}. That's {n} today. Glorious."] },
  { id: 'remind-pane-fresh', voice: 'swolomon', variants: ["No sets yet today, {mate}. Your agent's next long task is yours.", "Fresh day, {mate}. First set is the hardest. I'll be here.", 'Nothing yet, {mate}. Your agent works hard. Do you?'] },
  { id: 'remind-pane-done', voice: 'swolomon', variants: ['{n} sets today, {mate}. The iron remembers.', '{n} sets today, {mate}. My chest swells with pride.', '{n} today, {mate}. The scrolls have been updated.'] },
  // A move unlocked: he performs it for you, the first time.
  {
    id: 'unlock',
    voice: 'swolomon',
    variants: ['New move unlocked, {mate}. Watch closely.', 'You earned this one, {mate}. Behold.', 'Showing up pays, {mate}. Witness this.', 'A gift, {mate}. Do not tell the others.'],
  },
  // Asides while a band waits (hooks/asides.ts), more impatient each time.
  { id: 'aside-nudge', voice: 'swolomon', variants: ['So... we doing this or what, {mate}?', 'No rush, {mate}. Some rush.', "I'll just stand here then, {mate}."] },
  { id: 'aside-hello', voice: 'swolomon', variants: ['Hello? You in there, {mate}?', 'Psst. Over here, {mate}.', 'Is this thing on, {mate}?'] },
  { id: 'aside-bored', voice: 'swolomon', variants: ["I'm bored, {mate}.", 'Counting ceiling tiles, {mate}. Eleven.', 'This is my waiting face, {mate}.'] },
  { id: 'aside-antics', voice: 'swolomon', variants: ['Did a few reps without you, {mate}. Your turn.', 'My pump is fading, {mate}.', 'Warmed up twice now, {mate}.'] },
  { id: 'aside-done', voice: 'swolomon', variants: ["Fine. I'm good at waiting, {mate}.", "I'll be right here, {mate}. Always am.", "Wake me when you're ready, {mate}."] },
  { id: 'program-ask', voice: 'swolomon', variants: ["A program! Now we're talking, {mate}. How do we build it?"] },
  { id: 'byoplan-ask', voice: 'swolomon', variants: ['Got your own program, {mate}? Show me.'] },
  { id: 'pane-finished', voice: 'swolomon', variants: ['The whole program, {mate}. Legends are made like this.', 'Program complete, {mate}. They will write songs about this.'] },
  { id: 'hold-go', voice: 'swolomon', variants: ['Hold it, {mate}. Breathe.', 'Steady, {mate}. The clock is on our side.'] },
  { id: 'hold-switch', voice: 'swolomon', variants: ['Side one, done. Switch, {mate}.', 'Other side, {mate}. Symmetry is beauty.'] },
  { id: 'hold-time', voice: 'swolomon', variants: ['Time! Beautiful hold, {mate}.', 'Time! Rock solid, {mate}.'] },
  { id: 'busy-day', voice: 'swolomon', variants: ["Busy day, {mate}. I'll check back every {n} min instead."] },
  // The turn-end line, when the person trained through it: Swolomon on what the agent got done.
  // What the agent got done, as Swolomon understands it: never correctly (owner: he always misreads it).
  {
    id: 'react-tests-pass',
    voice: 'swolomon',
    variants: ['Your agent passed its fitness test, {mate}. So did you.', 'All green, {mate}. Your agent made weight.'],
  },
  {
    id: 'react-tests-fail',
    voice: 'swolomon',
    variants: ['Your agent failed its fitness test, {mate}. Rest, eat, retest.', 'Your agent missed weight, {mate}. You hit your reps.'],
  },
  { id: 'react-commit', voice: 'swolomon', variants: ['Your agent made a commitment, {mate}. To leg day, I assume.'] },
  { id: 'react-pr', voice: 'swolomon', variants: ['Your agent asked for a form check, {mate}. Brave.'] },
  // Rest days: one desk stretch, once a day, while the agent works.
  {
    id: 'stretch-ask',
    voice: 'swolomon',
    variants: ['Rest day, {mate}. Loosen up while your agent works?', 'No lifting today, {mate}. A stretch keeps you moving.'],
  },
  // Showing up beats doing nothing: the half version, the comeback, the day after a tough one, and pushing
  // on the days that feel good.
  {
    id: 'half-start',
    voice: 'swolomon',
    variants: ['Half counts, {mate}. Showing up is the hard part.', 'Some days you just go through the motions, {mate}. They count.'],
  },
  {
    id: 'half-done',
    voice: 'swolomon',
    variants: ['You showed up, {mate}. That is the whole game.', 'Half a workout beats none, {mate}. Every time.'],
  },
  {
    id: 'comeback',
    voice: 'swolomon',
    variants: ['Welcome back, {mate}. No catching up. Even half counts today.', 'There you are, {mate}. Start small. Just half is fine.'],
  },
  { id: 'after-tough', voice: 'swolomon', variants: ['Last one was tough, {mate}. Half today is still a win.', 'Tough one last time, {mate}. Half today still counts.'] },
  {
    id: 'bonus-ask',
    voice: 'swolomon',
    variants: ['Easy, huh? Feeling strong, {mate}? One bonus set.', 'Good days are for pushing, {mate}. One more?'],
  },
  { id: 'warmup-coach', voice: 'swolomon', variants: ['Warm muscles lift more, {mate}. One minute.', 'First we wake the body up, {mate}.'] },
  {
    id: 'program-end',
    voice: 'swolomon',
    variants: ['The whole block, {mate}. {coach} is speechless. Almost.', 'Every workout of the block, {mate}. Legends are built like this.'],
  },
  // Not set up yet, a later session: the moment the agent is busy is the moment to ask.
  {
    id: 'nudge',
    voice: 'swolomon',
    variants: ["Your agent's on it, {mate}. Perfect time for a first set.", 'Waiting on your agent, {mate}? {coach} has a set for that.'],
  },
  // Quick start's one question.
  { id: 'where-ask', voice: 'swolomon', variants: ['Where do you train, {mate}? Iron or not, I build for it.'] },
  // The week's finish line.
  {
    id: 'week-done',
    voice: 'swolomon',
    variants: ['Week {n}, every workout, {mate}. {coach} is proud.', 'Another week conquered, {mate}. On to the next.'],
  },
  { id: 'week-one-done', voice: 'swolomon', variants: ['Week one, done. Most never finish it, {mate}. You did.'] },
  { id: 'reschedule-ask', voice: 'swolomon', variants: ['{from}s keep slipping away, {mate}. Move them?'] },
  {
    // `/workout swolomon` once a plan exists: the introduction's last line, with the plan already made.
    id: 'replay-close',
    voice: 'swolomon',
    variants: ["That's me, {mate}. Your plan's on the rack whenever you are."],
  },

  // Swolomon: ranks (§1.13.1), one line each, with the full portrait flexing.
  { id: 'rank-regular', voice: 'swolomon', variants: ["25 sets, {mate}. You're a Regular now. The front desk knows your name."] },
  { id: 'rank-rack-regular', voice: 'swolomon', variants: ['100 sets, {mate}. Rack Regular. The squat rack saves you a spot now.'] },
  { id: 'rank-iron-disciple', voice: 'swolomon', variants: ['250 sets, {mate}. Iron Disciple. {coach} is honored.'] },
  { id: 'rank-demigod', voice: 'swolomon', variants: ['500 sets, {mate}. Demigod. Big Greg asked for your autograph.'] },
  { id: 'rank-olympian', voice: 'swolomon', variants: ["1,000 sets, {mate}. Olympian. {coach}'s eyes are sweating. That's all."] },
  { id: 'rank-greek-god', voice: 'swolomon', variants: ['2,500 sets, {mate}. Greek God. Look at you now.'] },

  // Swolomon: the regulars and the gym calendar (§1.13.3, §1.13.4), on the first set band after Start.
  {
    id: 'regulars',
    voice: 'swolomon',
    variants: [
      "Big Greg says hi, {mate}. That's shake number four.",
      "Deadlift Doris PR'd again. Your turn, {mate}.",
      "Cardio Kevin's on the bike since Tuesday. You're up, {mate}.",
      "Big Greg lost the shaker again. Anyway. Let's work, {mate}.",
      'Deadlift Doris says your form looks crisp, {mate}.',
      "Cardio Kevin waved without missing a pedal. Your set, {mate}.",
    ],
  },
  { id: 'chest-day', voice: 'swolomon', variants: ['Monday. International Chest Day, {mate}. It is written.'] },
  { id: 'leg-day', voice: 'swolomon', variants: ['Leg day, {mate}. The best day. {coach} has spoken.'] },
  { id: 'recap', voice: 'swolomon', variants: ['Last week: {sets} sets, {minutes} moved, {mate}. Big Greg is jealous.'] },
  { id: 'recap-zero', voice: 'swolomon', variants: ['New week, {mate}. The iron missed you.', "New week, {mate}. Fresh scrolls. Let's fill them."] },

  // Swolomon: easter eggs (§1.13.5), the only command replies in his voice.
  { id: 'flex', voice: 'swolomon', variants: ['Behold, {mate}.', 'Behold, {mate}. And again: behold.', 'Witness, {mate}. Free of charge.', 'Look upon these, {mate}, and rejoice.'] },
  {
    id: 'protein',
    voice: 'swolomon',
    variants: [
      'It is written: protein is a food group, {mate}. All of them.',
      'Breakfast? Protein. Lunch? Protein. Feelings? Protein, {mate}.',
      'A shake a day keeps the shrimp away, {mate}.',
      'Big Greg once made a shake so big it needed a lifeguard, {mate}.',
      'Protein is a lifestyle, {mate}. Mostly a lifestyle of shaking things.',
    ],
  },
  {
    id: 'wisdom',
    voice: 'swolomon',
    variants: [
      "The bar doesn't care about your day, {mate}. {coach} does.",
      'A rep done is worth two planned, {mate}.',
      'Rest is a set too, {mate}. A very easy set.',
      'Lift with your legs, {mate}. And your heart. Mostly your legs.',
      'The wise lifter racks their weights, {mate}. Big Greg is not wise.',
      'Consistency beats intensity, {mate}. Both beat the couch.',
    ],
  },

  // Swolomon: feats (§1.13.6), one toast each, once ever.
  { id: 'feat-first-set', voice: 'swolomon', variants: ['First set ever, {mate}! {coach} will remember this day.'] },
  { id: 'feat-perfect-workout', voice: 'swolomon', variants: ['Not a single skip, {mate}. Flawless. It is written.'] },
  { id: 'feat-three-in-a-row', voice: 'swolomon', variants: ['Three in a row, {mate}. The streak is alive.'] },
  { id: 'feat-full-week', voice: 'swolomon', variants: ["A full week, {mate}. Every training day. That's how legends start."] },

  // Plain: bands.
  { id: 'remind-ideas', voice: 'plain', variants: ['Ideas: {ideas}'] },
  { id: 'remind-skipped', voice: 'plain', variants: ['Not today. Back tomorrow.'] },
  { id: 'remind-status', voice: 'plain', variants: ['Just remind me. Today: {n} sets. This week: {week} sets.'] },
  { id: 'reply-remind-on', voice: 'plain', variants: ['Just remind me is on: any set you like, while your agent works.'] },
  { id: 'reply-no-remind', voice: 'plain', variants: ['Just remind me is off. /workout remind turns it on.'] },
  { id: 'reply-dontask', voice: 'plain', variants: ["Swolomon won't ask again. /workout setup or /workout remind any time."] },
  { id: 'reply-moves', voice: 'plain', variants: ["Swolomon's moves: {n} of {total}. {next} /workout flex shows them off."] },
  { id: 'safety-short', voice: 'plain', variants: ['Not medical advice. Stop if anything hurts; ask a doctor if unsure.'] },
  { id: 'program-detail', voice: 'plain', variants: ['Quick start: a starter plan now. Build: your gear, days, goal. Own: paste yours.'] },
  { id: 'byoplan-paste', voice: 'plain', variants: ['Type /workout plan, then paste it: any format, any app. It reads it.'] },
  { id: 'byoplan-file', voice: 'plain', variants: ['Or write it by hand: {path}'] },
  { id: 'reply-meet', voice: 'plain', variants: ['Swolomon is just above the prompt: press 1 to begin.'] },
  { id: 'intro-header', voice: 'plain', variants: ['IdleReps · a workout plan and tracker that runs while your agent works'] },
  { id: 'ask-detail', voice: 'plain', variants: ['First up: {exercise}, {amount} · about {time}.'] },
  { id: 'lead-working', voice: 'plain', variants: ['While your agent works'] },
  { id: 'lead-idle', voice: 'plain', variants: ['Workout'] },
  { id: 'how-it-works', voice: 'plain', variants: ['One set at a time while your agent works, never while you type. Half counts.'] },
  { id: 'how-it-works-later', voice: 'plain', variants: ['Sets come one at a time while your agent works. Even one set counts.'] },
  { id: 'hit-targets', voice: 'plain', variants: ['↑ Every set on target: {list}.'] },
  { id: 'next-time', voice: 'plain', variants: ['Stronger already. Next time: {list}.'] },
  { id: 'turn-sets', voice: 'plain', variants: ['{sets} while you waited'] },
  { id: 'first-logged', voice: 'plain', variants: ["That's it. Even one set a day counts. /workout shows your week."] },
  { id: 'reschedule-detail', voice: 'plain', variants: ['Train on {to}s instead, from now on. Your plan file changes to match.'] },
  { id: 'rescheduled', voice: 'plain', variants: ['Moved: {from} is now {to}.'] },
  { id: 'safety-header', voice: 'plain', variants: ['Before your first set'] },
  { id: 'hint', voice: 'plain', variants: ['Press a number with your prompt empty, or type /workout done.'] },
  { id: 'edit-question', voice: 'plain', variants: ['{exercise}: how did it go?'] },
  { id: 'edit-typed', voice: 'plain', variants: ['Or type /workout done and the reps.'] },
  { id: 'edit-typed-weight', voice: 'plain', variants: ['Or type /workout done and the reps and weight.'] },

  // Plain: toasts.
  { id: 'stale', voice: 'plain', variants: ['That set was already recorded in another session.'] },
  { id: 'undo-stale', voice: 'plain', variants: ['That set was already changed in another session.'] },
  { id: 'broken-plan', voice: 'plain', variants: ["IdleReps can't use {path}: {reason}. Fix it, or run /workout setup for a new plan."] },
  { id: 'workout-complete', voice: 'plain', variants: ['Workout {n} done. Next: {nextDay}, {nextWorkout}.'] },
  { id: 'workout-complete-soon', voice: 'plain', variants: ['Workout {n} done. Next: {nextWorkout}.'] },
  { id: 'program-complete', voice: 'plain', variants: ['Program complete! /workout setup for a new plan, or /workout reset.'] },
  {
    id: 'quick-start',
    voice: 'plain',
    variants: ['Starter plan ready: no gear, no floor, Mon Wed Fri. /workout setup to change it.'],
  },
  {
    id: 'quick-start-gym',
    voice: 'plain',
    variants: ['Starter plan ready: dumbbells, a bar and bands, Mon Wed Fri. /workout setup to change it.'],
  },
  {
    id: 'quick-start-home',
    voice: 'plain',
    variants: ['Starter plan ready: no gear, Mon Wed Fri. /workout setup to change it.'],
  },
  { id: 'bonus-done', voice: 'plain', variants: ['Bonus set logged. Good days like this one add up.'] },
  { id: 'reply-half', voice: 'plain', variants: ['Half today: {n} sets. It counts, and your targets stay put.'] },
  { id: 'reply-past-half', voice: 'plain', variants: ["You're past halfway already: {n} sets to finish it."] },
  { id: 'warmup', voice: 'plain', variants: ['Warm-up, 1 minute: march in place for 30 s, then 10 arm circles each way.'] },
  { id: 'program-end-detail', voice: 'plain', variants: ['Next block: the same plan again from workout 1, your weights and reps kept.'] },
  { id: 'next-block', voice: 'plain', variants: ['Next block: workout 1, with every weight and rep where you left them.'] },
  { id: 'restore-ask', voice: 'plain', variants: ["Replace this machine's IdleReps data with the backup from {date}?"] },
  { id: 'plan-file-stays', voice: 'plain', variants: ['Your plan file stays.'] },
  { id: 'erase-ask', voice: 'plain', variants: ['Erase all IdleReps progress, history and settings on this machine?'] },
  { id: 'reply-exported', voice: 'plain', variants: ['Exported {n} sets to {path}, and a backup to {backup}.'] },
  { id: 'reply-restore-missing', voice: 'plain', variants: ["No backup to restore: {path} {reason}. /workout export makes one."] },
  { id: 'reply-restored', voice: 'plain', variants: ['Restored the backup from {date}.'] },
  { id: 'reply-erased', voice: 'plain', variants: ['Erased. Your plan file is still there: /workout to start again.'] },
  { id: 'reply-cancelled', voice: 'plain', variants: ['Cancelled. Nothing changed.'] },
  { id: 'reply-share-empty', voice: 'plain', variants: ['Nothing to share yet this week.'] },
  { id: 'reply-shared', voice: 'plain', variants: ['Copied: {text}'] },
  { id: 'reply-not-finished', voice: 'plain', variants: ['The next block starts once this one is done: {n} workouts to go.'] },
  { id: 'nudge-detail', voice: 'plain', variants: ['1 to start: one set at a time, while your agent works.'] },
  { id: 'nudge-last', voice: 'plain', variants: ["Last time I'll ask. /workout setup whenever you're ready."] },
  { id: 'reply-feedback-sent', voice: 'plain', variants: ['Sent, thank you. Ideas and discussion: {url}'] },
  { id: 'reply-feedback-sent-cut', voice: 'plain', variants: ['Sent the first {max} characters, thank you. Ideas and discussion: {url}'] },
  { id: 'reply-feedback-copied', voice: 'plain', variants: ["Couldn't send it. It's copied: paste it at {url}"] },
  { id: 'reply-feedback-failed', voice: 'plain', variants: ["Couldn't send it. Post it at {url}"] },
  { id: 'reply-feedback-usage', voice: 'plain', variants: ['Usage: /workout feedback <your thoughts>. Ideas and discussion: {url}'] },
  { id: 'pulse-ask', voice: 'plain', variants: ["How's IdleReps going?"] },
  { id: 'pulse-thanks', voice: 'plain', variants: ['Thanks, noted.'] },
  { id: 'pulse-more', voice: 'plain', variants: ['Type /workout feedback and your thoughts, or join the discussion at {url}'] },
  { id: 'installed', voice: 'plain', variants: ['IdleReps is installed. Swolomon is just above the prompt: press 1 to start.'] },
  { id: 'stretched', voice: 'plain', variants: ['Stretched: {exercise}. Rest days count too.'] },
  { id: 'stretch-note', voice: 'plain', variants: ['Easy does it: no bouncing, breathe out into it.'] },
  { id: 'where-detail', voice: 'plain', variants: ['Desk: standing moves. Home: floor work too. Weights: dumbbells, a bar, bands.'] },
  { id: 'plan-ready', voice: 'plain', variants: ['Plan ready: {name}.'] },
  { id: 'plan-ready-later', voice: 'plain', variants: ['Plan ready. First workout {when}.'] },
  { id: 'config-failed', voice: 'plain', variants: ["Couldn't save reminder settings; change them in /config"] },
  { id: 'idle-reminder', voice: 'plain', variants: ['Training day: {workout}, {n} sets left. /workout start when ready.'] },
  {
    id: 'newer-store',
    voice: 'plain',
    variants: ['Newer IdleReps data here. Update: /plugin marketplace update idlereps'],
  },
  { id: 'whats-new', voice: 'plain', variants: ["What's new in IdleReps {version}: {notes}"] },

  // Plain: command replies.
  { id: 'reply-paused-prefix', voice: 'plain', variants: ['Paused.'] },
  { id: 'reply-up-next', voice: 'plain', variants: ['Up next: {exercise}, {amount}.'] },
  { id: 'reply-rest-day', voice: 'plain', variants: ['Rest day. /workout today to train anyway.'] },
  { id: 'reply-done-today', voice: 'plain', variants: ["Today's workout is done. Next: {nextDay}."] },
  { id: 'reply-plan-finished', voice: 'plain', variants: ['Plan finished. /workout setup for a new plan, or /workout reset to go again.'] },
  { id: 'reply-no-plan', voice: 'plain', variants: ['No plan yet. Run /workout setup.'] },
  { id: 'reply-fix-plan', voice: 'plain', variants: ["Fix {path} first ({reason}), or run /workout setup for a new plan."] },
  { id: 'reply-not-today', voice: 'plain', variants: ['No workout today. See you {nextDay}.'] },
  { id: 'reply-no-set', voice: 'plain', variants: ['No set is showing. /workout start shows the next one.'] },
  { id: 'reply-set-done', voice: 'plain', variants: ['Set done.'] },
  { id: 'reply-set-done-amount', voice: 'plain', variants: ['Set done: {amount}.'] },
  { id: 'reply-set-skipped', voice: 'plain', variants: ['Set skipped.'] },
  { id: 'reply-done-usage', voice: 'plain', variants: ['Usage: /workout done [how many] [weight], e.g. /workout done 8 or /workout done 8 14'] },
  { id: 'reply-hidden', voice: 'plain', variants: ['Hidden for {n} minutes.'] },
  { id: 'reply-undone', voice: 'plain', variants: ['Undone. The set is back.'] },
  { id: 'reply-nothing-to-undo', voice: 'plain', variants: ['Nothing to undo.'] },
  { id: 'reply-rated', voice: 'plain', variants: ['Thanks, noted.'] },
  { id: 'reply-nothing-to-rate', voice: 'plain', variants: ['Nothing to rate right now.'] },
  { id: 'reply-reset', voice: 'plain', variants: ['Back to workout 1. Your history is kept.'] },
  { id: 'reply-pause', voice: 'plain', variants: ['Paused. No sets, reminders or notices until /workout resume.'] },
  { id: 'reply-resume', voice: 'plain', variants: ['Resumed.'] },
  { id: 'reply-already-paused', voice: 'plain', variants: ['Already paused. /workout resume to start again.'] },
  { id: 'reply-not-paused', voice: 'plain', variants: ["IdleReps isn't paused."] },
  { id: 'reply-nothing-showing', voice: 'plain', variants: ['Nothing is showing that answers /workout {id}.'] },
  {
    id: 'reply-usage',
    voice: 'plain',
    variants: [
      'Usage: /workout [status | now | start | done [reps] [weight] | edit | skip | later | undo | no | today | pause | resume | setup | plan <text> | reset | feedback <text>]',
    ],
  },
  { id: 'reply-plan-usage', voice: 'plain', variants: ['Describe your plan after the command, e.g. /workout plan 5x5 squats and push-ups Mon Wed Fri'] },
  { id: 'reply-plan-written', voice: 'plain', variants: ['Plan ready: {name}. {workouts} workouts, {schedule}. Written to {path}.'] },
  { id: 'reply-plan-failed', voice: 'plain', variants: ["That didn't turn into a plan ({reason}). Nothing changed. Try describing it differently."] },
  { id: 'reply-plan-unreachable', voice: 'plain', variants: ["Couldn't reach the model ({reason}). Nothing changed."] },
  { id: 'reply-setup-opened', voice: 'plain', variants: ['Setup is open.'] },
  { id: 'reply-swolomon-busy', voice: 'plain', variants: ['{coach} is spotting your set. /workout swolomon again after it.'] },
] as const satisfies readonly LineEntry[]

export type LineId = (typeof LINES)[number]['id']

const INDEX: ReadonlyMap<string, number> = new Map(LINES.map((entry, i) => [entry.id, i]))

export const entryOf = (id: LineId): LineEntry => LINES[INDEX.get(id) ?? 0] as LineEntry

/** The address term for a day and a line: `ADDRESS_TERMS[(day × 3 + kindIndex) % length]`. */
export const pickAddress = (day: number, kind: LineId): string =>
  ADDRESS_TERMS[(((day * 3 + (INDEX.get(kind) ?? 0)) % ADDRESS_TERMS.length) + ADDRESS_TERMS.length) % ADDRESS_TERMS.length] ?? 'champ'

export type LineContext = { day: number } & Record<string, string | number>

const capitalize = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`

/** Fills `template`; throws naming the placeholder a context leaves out, so no line ever shows a brace. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{([A-Za-z]+)\}/g, (_, name: string) => {
    if (name === 'AgentDoing' && values.agentDoing !== undefined) return capitalize(String(values.agentDoing))
    const value = values[name]
    if (value === undefined) throw new Error(`line needs {${name}}`)
    return String(value)
  })
}

/** Variant `(day + idIndex) % count` of a line: stable within a day, the same in every session. */
export function variantOf(id: LineId, day: number): { template: string; index: number } {
  const entry = entryOf(id)
  const index = (((day + (INDEX.get(id) ?? 0)) % entry.variants.length) + entry.variants.length) % entry.variants.length
  return { template: entry.variants[index] ?? entry.variants[0] ?? '', index }
}

/** The line `id` for a day, filled. Swolomon's lines get his address term. */
export function line(id: LineId, ctx: LineContext): string {
  const { template } = variantOf(id, ctx.day)
  return singular(fill(template, { coach: COACH_NAME, ...ctx, mate: pickAddress(ctx.day, id) }))
}

/** "1 sets" reads "1 set": templates say `{n} sets`, and n is sometimes 1. */
export const singular = (text: string): string => text.replace(/(?<![\d.])1 (set|workout|day|minute)s\b/g, '1 $1')

/** Whether the day's variant of a line names the agent, so the storyline's beat moves on. */
export const usesAgent = (id: LineId, day: number): boolean => /\{agentDoing\}|\{AgentDoing\}/.test(variantOf(id, day).template)

export const REASON_LINE: Record<LongTaskReason, LineId> = {
  helpers: 'reason-helpers',
  'long-run': 'reason-long-run',
  'slow-step': 'reason-slow-step',
  busy: 'reason-busy',
  'big-ask': 'reason-big-ask',
  waiting: 'reason-waiting',
  planned: 'reason-planned',
}

/** §1.10a: the introduction, verbatim; the address term only in the last line. */
const INTRO = [
  "Hi! I'm {coach}, your IdleReps trainer.",
  'Welcome to my... your CLI. Come Lift It. Says so right on the door.',
  "You hand your agent work? Cute. While it's out, I hand YOU work.",
  'Quick start, or just a nudge to move, {mate}?',
] as const

/** The introduction's last line when a plan is already there (made by hand, or brought from before). */
const INTRO_WITH_PLAN = 'You brought your own plan! Keep it, or just get nudges, {mate}?'

export const introLines = (day: number, hasPlan = false): string[] =>
  (hasPlan ? [...INTRO.slice(0, -1), INTRO_WITH_PLAN] : INTRO).map(text => fill(text, { coach: COACH_NAME, mate: pickAddress(day, 'intro-header') }))

/** The introduction replayed once a plan exists: its last line no longer offers to make one. */
export const replayLines = (day: number): string[] => [...introLines(day).slice(0, -1), line('replay-close', { day })]

/** §1.13.2: each day, one theory of the agent's job, told in beats. */
export const AGENT_JOBS = [
  { job: 'spy', beats: ["your agent's undercover", "your agent's still undercover", "your agent's deep undercover"] },
  { job: 'travel', beats: ["your agent's booking flights", "your agent's still booking", "your agent's on a world tour"] },
  { job: 'sports', beats: ["your agent's on a contract call", "your agent's still negotiating", "your agent's holding out"] },
  { job: 'real estate', beats: ["your agent's showing a house", "your agent's on house two", "your agent's showing a mansion"] },
  { job: 'insurance', beats: ["your agent's reading fine print", "your agent's on more fine print", "your agent's on very fine print"] },
] as const

export const LONG_TURN_MS = 10 * 60_000

/** `{agentDoing}`: today's job, its first beat, then the next; a turn running 10 minutes or more is the long beat. */
export function agentDoing(day: number, beat: number, turnMs: number): string {
  const job = AGENT_JOBS[((day % AGENT_JOBS.length) + AGENT_JOBS.length) % AGENT_JOBS.length] ?? AGENT_JOBS[0]
  if (turnMs >= LONG_TURN_MS) return job.beats[2]
  return beat <= 1 ? job.beats[0] : job.beats[1]
}

/** The safety step (§1.2), verbatim, a sentence to a row where the band shows it. */
export const SAFETY_SENTENCES = [
  'IdleReps suggests exercises; it is not medical advice.',
  'Stop any exercise that causes pain, dizziness or shortness of breath.',
  'If you have an injury, a heart or joint condition, are pregnant, or a doctor has told you to limit ' +
    'exercise, check with a professional before starting.',
] as const
export const SAFETY_TEXT = SAFETY_SENTENCES.join(' ')

/** §1.7 real-world 3. */
export const FAILURE_TEXT = "You don't need to go to failure: stop each set with 2 or 3 good reps left."

/** A set band's header after its lead: "Week 1 · Legs"; the band draws the sets as dots after it. */
export const setHeader = (cue: Cue): string => cue.workoutName

/** The sets of a workout as dots: done, this one, still to come; and "set 2 of 9" for words. */
export const progressDots = (done: number, total: number) => ({
  done: '●'.repeat(Math.min(done, total)),
  current: done < total ? '●' : '',
  rest: '○'.repeat(Math.max(0, total - done - 1)),
  words: done < total ? `set ${done + 1} of ${total}` : `${total} of ${total}`,
})

/** What changed per release, in two parts (plan §1.12 item 8); kept in step with CHANGELOG.md. */
export type Release = { version: string; forYou: readonly string[]; underTheHood: readonly string[] }

export const RELEASES: readonly Release[] = [
  {
    version: '1.0.0',
    forYou: [
      'A workout plan built around your equipment, one set at a time while your agent works.',
      'Press 1 to log a set, 0 to undo it, and /workout to see your week.',
      'Meet Swolomon, your coach: every set counts toward your next rank.',
    ],
    underTheHood: ['First release.'],
  },
]

/** The what's-new toast for a version: its For you lines, or null when it has none. */
export function whatsNewLine(version: string, day: number, releases: readonly Release[] = RELEASES): string | null {
  const release = releases.find(r => r.version === version)
  if (release === undefined || release.forYou.length === 0) return null
  return line('whats-new', { day, version, notes: release.forYou.join(' ') })
}
