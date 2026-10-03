/**
 * Every band, built as a `BandSpec` (plan §4.3 item 4): what it shows is decided here, when it is made, so
 * drawing reads nothing but the spec (D19). Also the row count every band is held to (§1.10b). Pure.
 */

import type { BandKind, BandLine, BandPart, BandSpec, Cue, Draft, ExerciseMemory, LongTaskReason, Plan, RatingBasis, Weekday } from '../types'
import { actionIdsOf } from './actions'
import { introLines, line, REASON_LINE, replayLines, SAFETY_SENTENCES, setHeader } from './copy'
import type { LineContext, LineId } from './copy'
import { describeAmount, setSeconds, setsOf, shortWorkoutName, targetOf, timeWords } from './plan'
import { PUSH_NAMES } from './programs'
import { weekdayName } from './schedule'

/** Which band keeps the slot when two want it (§4.3 item 4). A logged line gives way to anything. */
export const BAND_PRIORITY: Record<BandKind, number> = { unlock: 6, program: 1, byoplan: 1, remind: 2, pulse: 0, rankup: 7, rating: 6, bonus: 5, programEnd: 5, restore: 8, erase: 8, warmup: 3, logged: 4, edit: 3, set: 3, ask: 2, ready: 2, stretch: 2, where: 1, reschedule: 2, timer: 3, switch: 3, time: 3, safety: 1, intro: 1, replay: 1, flex: 1 }

export const LOGGED_MS = 120_000

/**
 * Offering a band to the slot: it takes the slot unless the band there matters more, in which case it
 * waits in `pending`, highest priority first. A logged line gives way to anything.
 */
export function offerToSlot(current: BandSpec | null, pending: readonly BandSpec[], spec: BandSpec): { band: BandSpec | null; pending: BandSpec[]; isPlaced: boolean } {
  if (current !== null && current.kind !== 'logged' && BAND_PRIORITY[spec.kind] < BAND_PRIORITY[current.kind]) {
    return { band: current, pending: [...pending, spec].sort((a, b) => BAND_PRIORITY[b.kind] - BAND_PRIORITY[a.kind]), isPlaced: false }
  }
  return { band: spec, pending: [...pending], isPlaced: true }
}

/** The band that takes an emptied slot: the highest waiting one. */
export const nextFromPending = (pending: readonly BandSpec[]): { next: BandSpec | undefined; pending: BandSpec[] } => ({
  next: pending[0],
  pending: pending.slice(1),
})

/** Rows a band takes: Swolomon, header, body, extras, the buttons (unless inline), footer. */
export function bandRows(spec: BandSpec): number {
  return (
    (spec.coach?.length ?? 0) +
    (spec.header === undefined ? 0 : spec.headerFirst === true ? 2 : 1) +
    spec.body.length +
    (spec.extras?.length ?? 0) +
    // The buttons, and the blank row above them.
    (spec.inline === true || spec.actions.length === 0 ? 0 : 2) +
    (spec.footer?.length ?? 0)
  )
}

/**
 * Before a plan, after the first session: the first-run band again, small, at the moment it makes sense,
 * while the agent works. The last of them says so, and how to start later.
 */
export function nudgeBand(coachLine: string, day: number, isLast: boolean, hasPlan = false): BandSpec {
  return {
    kind: 'intro',
    coach: [coachLine],
    portrait: 'mini',
    body: [[{ text: line(isLast ? 'nudge-last' : 'nudge-detail', { day }), tone: 'muted' }]],
    actions: introActions(hasPlan),
    isNudge: true,
  }
}

/** The first-run band's ways in: Quick start, or with a plan already there, keeping it. */
export const introActions = (hasPlan: boolean) => [hasPlan ? 'keep' : 'quickstart', 'remind', 'program', 'notnow']

/** The first-run band (§1.5, §1.10a): the full portrait, the introduction, and the four ways in. */
export function introBand(day: number, { entrance = true, hasPlan = false }: { entrance?: boolean; hasPlan?: boolean } = {}): BandSpec {
  return {
    kind: 'intro',
    header: line('intro-header', { day }),
    headerFirst: true,
    coach: introLines(day, hasPlan),
    portrait: 'full',
    ...(entrance ? { entrance: true as const } : {}),
    body: [],
    actions: introActions(hasPlan),
    tall: true,
  }
}

/** Build my own: Quick start, build it in the setup pane, or bring their own. */
export function programBand(coachLine: string, day: number): BandSpec {
  return { kind: 'program', coach: [coachLine], portrait: 'mini', body: [[{ text: line('program-detail', { day }), tone: 'muted' }]], actions: actionIdsOf('program') }
}

/** I have my own: how to hand it over. */
export function byoplanBand(coachLine: string, day: number, path: string): BandSpec {
  return {
    kind: 'byoplan',
    coach: [coachLine],
    portrait: 'mini',
    body: [[{ text: line('byoplan-paste', { day }) }], [{ text: line('byoplan-file', { day, path }), tone: 'muted', truncate: true }]],
    actions: actionIdsOf('byoplan'),
  }
}

/** The safety note, short, on the first offer until something on it is pressed (§1.2). */
const safetyRow = (day: number): BandPart[] => [{ text: line('safety-short', { day }), tone: 'muted' }]

/** Just remind me, while the agent works: a set, anything, logged by what it worked. */
export function remindBand(coachLine: string, day: number, ideas: readonly string[], opts: { withSafety?: boolean } = {}): BandSpec {
  return {
    kind: 'remind',
    coach: [coachLine],
    portrait: 'mini',
    body: [[{ text: line('remind-ideas', { day, ideas: ideas.join(' · ') }), tone: 'muted' }], ...(opts.withSafety === true ? [safetyRow(day)] : [])],
    actions: actionIdsOf('remind'),
  }
}

/** A new plan on a rest day: when the first workout is, and a set now for a taste. */
export function readyBand(coachLine: string, day: number): BandSpec {
  return {
    kind: 'ready',
    coach: [coachLine],
    portrait: 'mini',
    body: [[{ text: line('how-it-works-later', { day }), tone: 'muted' }]],
    actions: actionIdsOf('ready'),
  }
}

/** Before the first set of a day's workout (§1.12 item 2): a minute, standing and quiet. */
export function warmupBand(cue: Cue, day: number, thenCoach: string | undefined): BandSpec {
  return {
    kind: 'warmup',
    coach: [line('warmup-coach', { day })],
    portrait: 'mini',
    body: [[{ text: line('warmup', { day }) }]],
    actions: actionIdsOf('warmup'),
    cue,
    ...(thenCoach === undefined ? {} : { thenCoach }),
  }
}

/** The last workout of the plan, rated (§1.12 item 4): what the block came to, and what next. */
export function programEndBand(day: number, facts: { workouts: number; sets: number; stronger: number }): BandSpec {
  const stronger = facts.stronger === 0 ? '' : `, ${facts.stronger === 1 ? '1 exercise' : `${facts.stronger} exercises`} stronger`
  return {
    kind: 'programEnd',
    coach: [line('program-end', { day })],
    portrait: 'full',
    isWin: true,
    act: 'laurel-toss',
    tall: true,
    header: `Program complete: ${facts.workouts} workouts, ${facts.sets} sets${stronger}.`,
    headerFirst: true,
    body: [[{ text: line('program-end-detail', { day }), tone: 'muted' }]],
    actions: actionIdsOf('programEnd'),
  }
}

/** D20: restore asks first, naming the backup's date. */
export function restoreBand(day: number, date: string): BandSpec {
  return { kind: 'restore', body: [[{ text: line('restore-ask', { day, date }), bold: true }], [{ text: line('plan-file-stays', { day }), tone: 'muted' }]], actions: actionIdsOf('restore') }
}

/** D20: erase asks first. */
export function eraseBand(day: number): BandSpec {
  return { kind: 'erase', body: [[{ text: line('erase-ask', { day }), bold: true }], [{ text: line('plan-file-stays', { day }), tone: 'muted' }]], actions: actionIdsOf('erase') }
}

/** The one-time check-in (§1.6): the lowest priority, so it waits behind everything else. */
export function pulseBand(day: number): BandSpec {
  return { kind: 'pulse', body: [[{ text: line('pulse-ask', { day }), bold: true }]], actions: actionIdsOf('pulse') }
}

/** Quick start's one question: a desk plan (standing, no floor) or a home one (floor work too). */
export function whereBand(day: number): BandSpec {
  return {
    kind: 'where',
    coach: [line('where-ask', { day })],
    portrait: 'mini',
    body: [[{ text: line('where-detail', { day }), tone: 'muted' }]],
    actions: actionIdsOf('where'),
  }
}

/** A rest day's one desk stretch, while the agent works. */
export function stretchBand(coachLine: string, stretch: { name: string; seconds: number; note: string }, day: number): BandSpec {
  return {
    kind: 'stretch',
    coach: [coachLine],
    portrait: 'mini',
    body: [
      [{ text: `${stretch.name}: `, bold: true }, { text: timeWords(stretch.seconds) }],
      [{ text: `↳ ${stretch.note} ${line('stretch-note', { day })}`, tone: 'muted', truncate: true }],
    ],
    actions: actionIdsOf('stretch'),
    stretch: { exercise: stretch.name, seconds: stretch.seconds },
  }
}

/** After an Easy workout: one bonus set, for the days that feel good. */
export function bonusBand(coachLine: string, bonus: NonNullable<BandSpec['bonus']>, amount: string): BandSpec {
  return {
    kind: 'bonus',
    coach: [coachLine],
    portrait: 'mini',
    body: [[{ text: `${bonus.exercise}: `, bold: true }, { text: amount, tone: 'accent' }]],
    actions: actionIdsOf('bonus'),
    bonus,
  }
}

/** The week's finish line: `Week 1: 2 of 3 workouts  ●●○`. */
export function weekLine(week: { week: number; done: number; total: number }): BandPart[] {
  return [
    { text: `Week ${week.week}: `, bold: true },
    { text: `${week.done} of ${week.total} workouts  `, tone: week.done === week.total ? 'good' : 'muted' },
    ...Array.from({ length: week.total }, (_, i): BandPart => (i < week.done ? { text: '●', tone: 'good' } : { text: '○', tone: 'muted' })),
  ]
}

/** A training weekday declined three weeks running: Swolomon offers to move it. */
export function rescheduleBand(coachLine: string, detail: string, move: { from: Weekday; to: Weekday }): BandSpec {
  return { kind: 'reschedule', coach: [coachLine], portrait: 'mini', body: [[{ text: detail, tone: 'muted' }]], actions: actionIdsOf('reschedule'), move }
}

/** `/workout swolomon` with a plan (§1.10a): the introduction again, its last line saying the plan is ready. */
export function replayBand(day: number): BandSpec {
  return {
    kind: 'replay',
    header: line('intro-header', { day }),
    headerFirst: true,
    coach: replayLines(day),
    portrait: 'full',
    entrance: true,
    act: 'double-biceps',
    body: [],
    actions: actionIdsOf('replay'),
    tall: true,
  }
}

/** `/workout flex` (§1.13.5): the full portrait flexes, then shows off one of his moves, named under his line. */
export function flexBand(day: number, move: { id: string; title: string }): BandSpec {
  return {
    kind: 'flex',
    coach: [line('flex', { day })],
    portrait: 'full',
    isWin: true,
    act: move.id,
    body: [[{ text: `▸ ${move.title}`, tone: 'muted' }]],
    actions: actionIdsOf('flex'),
    tall: true,
  }
}

/** A new rank (§1.13.1): its line with the portrait flexing, in place of the logged line. */
export function rankupBand(rank: string, coachLine: string, totalSets: number, undoId?: number): BandSpec {
  return {
    kind: 'rankup',
    header: `Rank up: ${rank} · ${totalSets.toLocaleString('en-US')} sets`,
    coach: [coachLine],
    portrait: 'full',
    isWin: true,
    act: 'trophy',
    body: [],
    // A set with nothing to undo (Just remind me) has only Let's go.
    actions: undoId === undefined ? ['letsgo'] : actionIdsOf('rankup'),
    ...(undoId === undefined ? {} : { undoId }),
    tall: true,
  }
}

/** A move unlocked (collection.ts): Swolomon performs it for the first time; Again plays it once more. */
export function unlockBand(move: { id: string; title: string }, n: number, total: number, coachLine: string, undoId?: number): BandSpec {
  return {
    kind: 'unlock',
    header: `New move: ${move.title} · ${n} of ${total}`,
    coach: [coachLine],
    portrait: 'full',
    isWin: true,
    act: move.id,
    body: [],
    actions: undoId === undefined ? ['nice', 'again'] : actionIdsOf('unlock'),
    ...(undoId === undefined ? {} : { undoId }),
    tall: true,
  }
}

/** The ask-first band (§1.1 step 3): Swolomon's line, the plain detail, Start / Later / Not today. */
export function askBand(cue: Cue, coachLine: string, day: number, reason: LongTaskReason | undefined, opts: { isNewPlan?: boolean; withSafety?: boolean } = {}): BandSpec {
  // A small, concrete first step: what it is and about how long it takes. A new plan's first offer says
  // how the rest will come instead, once, where the person is looking.
  const detail =
    opts.isNewPlan === true
      ? line('how-it-works', { day })
      : line('ask-detail', {
          day,
          exercise: cue.exercise.name,
          amount: describeAmount(cue.exercise, cue.count, cue.weight, cue.band),
          time: timeWords(setSeconds(cue.exercise, cue.count)),
        })
  return {
    kind: 'ask',
    coach: [coachLine],
    portrait: 'mini',
    body: [[{ text: detail, tone: 'muted' }], ...(opts.withSafety === true ? [safetyRow(day)] : [])],
    actions: actionIdsOf('ask').filter(id => id !== 'half' || cue.canHalve === true),
    cue,
    ...(reason === undefined ? {} : { reason }),
  }
}

/**
 * Which line opens the ask band (§1.10c): the sign's reason (saying the wait when the agent said how long
 * it will be away), else pick up, else ask first.
 */
export function askLineId(cue: Cue, reason: LongTaskReason | undefined, waitMs?: number): LineId {
  if (reason === 'waiting' && waitMs !== undefined) return 'reason-napping'
  if (reason !== undefined) return REASON_LINE[reason]
  return cue.step > 1 ? ('pick-up' as const) : ('ask-first' as const)
}

/**
 * Swolomon's line on the first set band after Start (§1.10c): the sign's reason, then Chest Day (a Monday
 * workout with a library push exercise), leg day, a regular (about one day in ten), else the set line.
 */
export function firstSetLineId(cue: Cue, plan: Plan, day: number, reason: LongTaskReason | undefined): LineId {
  if (reason !== undefined) return REASON_LINE[reason]
  const workout = plan.workouts[cue.workout]
  if (weekdayName(day) === 'mon' && workout !== undefined && workout.exercises.some(e => PUSH_NAMES.has(e.name))) return 'chest-day'
  if (/\b(Legs|Lower)\b/.test(cue.workoutName)) return 'leg-day'
  if ((((day * 7 + 3) % 10) + 10) % 10 === 0) return 'regulars'
  return 'set'
}

/** The context the ask-first, pick-up and day-toast lines fill from. */
export function cueLineContext(cue: Cue, day: number, agentDoing: string): LineContext {
  return { day, workout: shortWorkoutName(cue.workoutName), n: cue.stepCount - cue.step + 1, agentDoing }
}

/** The set band (§1.1 step 4): target pre-filled, last time beside it, the workout's sets as dots. */
export function setBand(
  cue: Cue,
  opts: { coach?: string; memory?: ExerciseMemory; showHint: boolean; hint: string },
): BandSpec {
  const { exercise, planExercise } = cue
  const parts: BandPart[] = [
    { text: `${exercise.name}: `, bold: true },
    { text: describeAmount(exercise, cue.count, cue.weight, cue.band), bold: true, tone: 'accent' },
  ]
  // The half version counts its own, halved sets.
  const sets = setsOf(planExercise, cue.isHalf === true)
  if (sets > 1) parts.push({ text: `  (${cue.set}/${sets})`, tone: 'muted' })
  const last = opts.memory?.last
  if (last?.kind === 'set' && last.result === 'done') {
    parts.push({ text: `   last: ${describeAmount(exercise, last.count ?? null, last.weight ?? null, last.band ?? null)}`, tone: 'muted', truncate: true })
  }
  const extras = [
    ...(cue.set === 1 && exercise.note !== undefined ? [`↳ ${exercise.note}`] : []),
    ...(opts.showHint ? [opts.hint] : []),
  ]
  return {
    kind: 'set',
    ...(opts.coach === undefined ? {} : { coach: [opts.coach], portrait: 'mini' as const }),
    header: setHeader(cue),
    headerLead: true,
    progress: { done: cue.step - 1, total: cue.stepCount },
    body: [parts],
    ...(extras.length === 0 ? {} : { extras }),
    // A timed set gets the hold timer (§1.12 item 1).
    actions: actionIdsOf('set').filter(id => id !== 'timer' || targetOf(exercise.reps)?.isTimed === true),
    cue,
  }
}

/** `0:23`, `1:05`. */
export const clockText = (seconds: number): string => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

/**
 * The hold timer (§1.12 item 1): counting down (`timer`), between sides (`switch`), or done (`time`).
 * Swolomon counts the last three seconds; the line under the header is the time left and a draining bar.
 */
export function holdBand(cue: Cue, hold: NonNullable<BandSpec['hold']>, coachLine: string): BandSpec {
  const name: BandPart = { text: `${cue.exercise.name}${hold.sides === 2 ? ` (side ${hold.side})` : ''}: `, bold: true }
  const kind: BandKind = hold.left > 0 ? 'timer' : hold.side === 1 && hold.sides === 2 ? 'switch' : 'time'
  const width = 20
  const full = Math.round((hold.left / Math.max(1, hold.seconds)) * width)
  const body: BandLine =
    kind === 'timer'
      ? [
          name,
          { text: clockText(hold.left), bold: true, tone: 'accent' },
          { text: ' left   ', tone: 'muted' },
          ...(full > 0 ? [{ text: '━'.repeat(full), tone: 'accent' as const }] : []),
          ...(full < width ? [{ text: '━'.repeat(width - full), tone: 'muted' as const }] : []),
        ]
      : kind === 'switch'
        ? [name, { text: 'Side 1 done.', bold: true, tone: 'good' }]
        : [name, { text: 'Time!', bold: true, tone: 'good' }]
  return {
    kind,
    coach: [hold.left > 0 && hold.left <= 3 ? `${hold.left}…` : coachLine],
    portrait: 'mini',
    header: setHeader(cue),
    headerLead: true,
    progress: { done: cue.step - 1, total: cue.stepCount },
    body: [body],
    actions: actionIdsOf(kind),
    cue,
    hold,
  }
}

/** The values row of Edit: "10 reps", "at 12 kg" or "@ medium band". */
function draftParts(cue: Cue, draft: Draft): BandLine {
  const target = targetOf(cue.exercise.reps)
  const parts: BandPart[] = []
  if (target !== null) parts.push({ text: `${draft.count}${target.unit}`, bold: true, tone: 'accent' })
  if (draft.weight !== null && cue.exercise.weight !== undefined) parts.push({ text: `at ${draft.weight} ${cue.exercise.weight.unit}`, bold: true, tone: 'accent' })
  if (draft.band !== null && cue.exercise.band !== undefined) parts.push({ text: `@ ${draft.band} band`, bold: true, tone: 'accent' })
  return parts.flatMap((part, i) => (i === 0 ? [part] : [{ text: '   ' }, part]))
}

/** Edit (§1.1 step 4): the steppers, pre-filled with the prescribed values. */
export function editBand(cue: Cue, draft: Draft, day: number): BandSpec {
  const hasCount = targetOf(cue.exercise.reps) !== null
  const hasLoad = cue.exercise.weight !== undefined || cue.exercise.band !== undefined
  const actions = ['save', ...(hasCount ? ['fewer', 'more'] : []), ...(hasLoad ? ['lighter', 'heavier'] : [])]
  const values = draftParts(cue, draft)
  return {
    kind: 'edit',
    body: [[{ text: line('edit-question', { day, exercise: cue.exercise.name }), bold: true }], ...(values.length === 0 ? [] : [values])],
    actions,
    footer: [line(cue.exercise.weight === undefined ? 'edit-typed' : 'edit-typed-weight', { day })],
    cue,
    draft,
  }
}

/**
 * The logged line (§1.1 step 4): what was recorded, a new best when it is one, today's sets so far, and
 * `0: Undo`. Swolomon speaks above it for a new best or a skip (§1.10c).
 */
export function loggedBand(
  text: string,
  undoId: number,
  opts: {
    coach?: string
    isBest?: boolean
    today?: { done: number; total: number }
    isFirstEver?: boolean
    /** Better than last time (a new best says more, so it wins). */
    gain?: { more: number } | { heavier: true }
  },
): BandSpec {
  const parts: BandPart[] = [{ text: '✓ ', tone: 'good', bold: true }, { text }]
  if (opts.isBest === true) parts.push({ text: ' · new best', tone: 'accent', bold: true })
  else if (opts.gain !== undefined) parts.push({ text: 'more' in opts.gain ? ` · ↑${opts.gain.more} on last time` : ' · heavier than last time', tone: 'accent' })
  if (opts.today !== undefined) parts.push({ text: ` · ${opts.today.done} of ${opts.today.total} today`, tone: 'muted', truncate: true })
  return {
    kind: 'logged',
    ...(opts.coach === undefined ? {} : { coach: [opts.coach] }),
    body: [parts],
    // The first set ever: what happens next, once.
    ...(opts.isFirstEver === true ? { extras: [line('first-logged', { day: 0 })] } : {}),
    inline: true,
    actions: ['undo'],
    undoId,
  }
}

/**
 * The workout's rating (§1.1 step 6): Easy / Good / Tough, and Undo of the set that finished it; after the
 * buttons, every set of the workout as a green dot.
 */
export function ratingBand(
  workoutName: string,
  day: number,
  basis: RatingBasis,
  undoId: number,
  levelUps: readonly string[] = [],
  week: { week: number; done: number; total: number } | null = null,
): BandSpec {
  const sets = Object.values(basis.results).flat()
  const done = sets.filter(set => set.result === 'done').length
  // The week's last workout is a finish line crossed: Swolomon flexes, the first week loudest of all.
  const isWeekDone = week !== null && week.done === week.total
  // The week's finish line outranks everything; then the half version, said as the win it is.
  const coachText = isWeekDone
    ? line(week.week === 1 ? 'week-one-done' : 'week-done', { day, n: week.week })
    : basis.half === true
      ? line('half-done', { day })
      : line('workout-done', { day, workout: shortWorkoutName(workoutName) })
  return {
    kind: 'rating',
    coach: [coachText],
    ...(isWeekDone ? { isWin: true as const, portrait: 'full' as const, tall: true as const, act: 'victory-jump' } : {}),
    // What the workout earned, said as a fact: the exercises done on target every set move up.
    body: [
      ...(week === null ? [] : [weekLine(week)]),
      ...(levelUps.length === 0 ? [] : [[{ text: line('hit-targets', { day, list: levelUps.join(', ') }), tone: 'accent' as const, truncate: true as const }]]),
    ],
    actions: actionIdsOf('rating'),
    ...(sets.length > 0 && sets.length <= 16
      ? {
          trailing: [
            { text: '      ' },
            ...sets.map((set): BandPart => (set.result === 'done' ? { text: '●', tone: 'good' } : { text: '○', tone: 'muted' })),
            { text: `  ${done} of ${sets.length} done`, tone: 'muted' },
          ],
        }
      : {}),
    basis,
    undoId,
  }
}
