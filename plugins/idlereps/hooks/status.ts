/**
 * What the person sees of their progress (plan §1.4): the status pane's facts, the status line and the
 * one-line `/workout status`. Pure: computed when a record is made or the pane opens, never while drawing.
 */

import type { BandLine, BandPart, Exercise, HistoryEntry, LastByExercise, Plan, Progress, StatusView, Targets, Workout } from '../types'
import { weekLine } from './bands'
import { equipmentLabel } from './setup'
import { line } from './copy'
import { daysShowedUp, movedSeconds, nextRank, rankFor, setsThisWeek, sparkline, streak, trendOf, weekMarks } from './history'
import { mondayOf } from './ledger'
import { describeAmount, effectiveExercise, minutesWords, shortWorkoutName, setsOf, stepsFor, targetFor, targetOf, weekProgress } from './plan'
import { isTrainingDay, nextTrainingDay, shortDayName } from './schedule'

export const PLUGIN_VERSION = '1.0.0'

export type StatusFacts = {
  plan: Plan
  progress: Progress
  history: readonly HistoryEntry[]
  targets: Targets
  today: number
  declinedOn: number | undefined
  paused: boolean
  totalDoneSets: number
  /** The plan's first day: days before it are not missed training days. */
  since: number
  /** Each exercise's last set and bests. */
  memory: LastByExercise
}

type Day = 'training' | 'rest' | 'done' | 'declined' | 'finished'

function dayOf(facts: StatusFacts): Day {
  const { plan, progress, today } = facts
  if (progress.workout >= plan.workouts.length) return 'finished'
  if (progress.lastCompletedOn === today) return 'done'
  if (!isTrainingDay(plan, progress, today)) return 'rest'
  if (facts.declinedOn === today) return 'declined'
  return 'training'
}

const nextDayText = (facts: StatusFacts): string => {
  const next = nextTrainingDay(facts.plan, facts.progress, facts.today)
  return next === null ? 'soon' : shortDayName(next)
}

/** "Push-ups 10/12", "Goblet squats 10/10 @ 12 kg", "Plank skipped": the last set, against its target. */
export function lastSetText(history: readonly HistoryEntry[], plan: Plan): string | null {
  const last = history.findLast(entry => entry.kind === 'set')
  if (last === undefined || last.kind !== 'set') return null
  if (last.result === 'skip') return `${last.exercise} skipped`
  const target = /^\s*(\d+)/.exec(last.target)?.[1]
  const count = last.count === undefined ? 'done' : target === undefined ? String(last.count) : `${last.count}/${target}`
  const unit = plan.workouts.flatMap(w => w.exercises).find(ex => ex.name === last.exercise)?.weight?.unit
  const load = last.weight !== undefined ? ` @ ${last.weight}${unit === undefined ? '' : ` ${unit}`}` : last.band !== undefined ? ` @ ${last.band} band` : ''
  return `${last.exercise} ${count}${load}`
}

/** `Rank: Rack Regular · 37 sets to Iron Disciple`, or `Rank: Greek God` at the top (§1.13.1). */
export function rankText(totalSets: number): string {
  return rankParts(totalSets).map(part => part.text).join('')
}

function rankParts(totalSets: number): BandPart[] {
  const next = nextRank(totalSets)
  const rank: BandPart = { text: `Rank: ${rankFor(totalSets).name}`, tone: 'accent', bold: true }
  if (next === null) return [rank]
  return [rank, { text: ` · ${next.setsToGo} ${next.setsToGo === 1 ? 'set' : 'sets'} to ${next.rank.name}`, tone: 'muted' }]
}

const plural = (n: number, noun: string) => `${n} ${n === 1 ? noun : `${noun}s`}`

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Monday to Sunday: done days green, today's label bold, days still to come quiet. */
function weekRow(facts: StatusFacts): BandPart[] {
  const marks = weekMarks(facts.plan, facts.progress, facts.history, facts.today, facts.since)
  const monday = mondayOf(facts.today)
  return marks.flatMap((mark, i): BandPart[] => {
    const day = monday + i
    const isToday = day === facts.today
    const label: BandPart = isToday ? { text: WEEKDAYS[i] ?? '', bold: true } : { text: WEEKDAYS[i] ?? '', tone: 'muted' }
    const tone = mark === '●' ? 'good' : mark === '◐' ? 'accent' : 'muted'
    return [...(i === 0 ? [] : [{ text: '  ' }]), label, { text: ' ' }, { text: mark, tone, ...(mark === '●' || isToday ? { bold: true as const } : {}) }]
  })
}

/** A bar of `width` segments, `filled` of them full: a heavy line, the full part bright and the rest dim. */
export function bar(filled: number, width: number): BandPart[] {
  const full = Math.max(0, Math.min(width, filled))
  return [
    ...(full > 0 ? [{ text: '━'.repeat(full), tone: 'accent' as const }] : []),
    ...(full < width ? [{ text: '━'.repeat(width - full), tone: 'muted' as const }] : []),
  ]
}

/** The best set an exercise has on record: "12 reps", "10 reps @ 14 kg", "40 s"; null with none. */
export function bestText(exercise: Exercise, memory: LastByExercise): string | null {
  const best = memory[exercise.name]?.best ?? {}
  const unit = targetOf(exercise.reps)?.unit ?? ''
  if (exercise.weight !== undefined) {
    const loads = Object.keys(best).map(Number).filter(Number.isFinite)
    if (loads.length === 0) return best.any === undefined ? null : `${best.any}${unit}`
    const load = Math.max(...loads)
    return `${best[String(load)] ?? 0}${unit} @ ${load} ${exercise.weight.unit}`
  }
  const counts = Object.values(best)
  return counts.length === 0 ? null : `${Math.max(...counts)}${unit}`
}

/**
 * A workout as a table, one exercise a row: its sets as dots (done, this one, still to come), the amount,
 * and the best on record. `done` is how many of the workout's sets are done; `current` marks the one up next.
 */
function workoutTable(workout: Workout, facts: StatusFacts, done: number, isCurrent: boolean): BandLine[] {
  const exercises = workout.exercises.map(planned => {
    const target = targetFor(planned, facts.targets)
    const shown = effectiveExercise(planned, target)
    return { planned, shown, amount: describeAmount(shown, null, target.weight ?? planned.weight?.start, target.band ?? planned.band?.start) }
  })
  const nameWidth = Math.max(...exercises.map(e => e.shown.name.length))
  const amountWidth = Math.max(...exercises.map(e => e.amount.length))
  // The half version of today's workout draws its halved sets.
  const half = isCurrent && facts.progress.half === true
  const setsWidth = Math.max(...workout.exercises.map(e => setsOf(e, half)))
  let step = 0
  return exercises.map(({ planned, shown, amount }) => {
    const sets = setsOf(planned, half)
    const first = step
    step += sets
    const isNext = isCurrent && done >= first && done < step
    const best = bestText(shown, facts.memory)
    // The line going up is the point: a sparkline once there are three days to draw.
    const trend = trendOf(facts.history, shown.name)
    const dots: BandPart[] = Array.from({ length: sets }, (_, i): BandPart => {
      const at = first + i
      if (at < done) return { text: '●', tone: 'good' }
      if (isCurrent && at === done) return { text: '●', tone: 'accent' }
      return { text: '○', tone: 'muted' }
    })
    return [
      isNext ? { text: '› ', tone: 'accent', bold: true } : { text: '  ' },
      { text: shown.name.padEnd(nameWidth + 2), ...(isNext ? { bold: true as const } : {}) },
      ...dots,
      { text: ' '.repeat(setsWidth - sets + 2) },
      { text: amount.padEnd(amountWidth), ...(isNext ? { tone: 'accent' as const } : {}) },
      ...(trend.length >= 3 ? [{ text: `  ${sparkline(trend)}`, tone: 'good' as const }] : []),
      ...(best === null ? [] : [{ text: `   best ${best}`, tone: 'muted' as const, truncate: true as const }]),
    ]
  })
}

/**
 * How far each exercise has come since its first set: a harder move ("Incline push-ups → Push-ups"), more
 * weight ("Goblet squats 8 → 12 kg"), or more reps or seconds ("Squats 12 → 15 reps"). Moves first.
 */
export function gainsOf(facts: Pick<StatusFacts, 'plan' | 'targets' | 'history'>): string[] {
  const moves: string[] = []
  const more: string[] = []
  const seen = new Set<string>()
  for (const planned of facts.plan.workouts.flatMap(w => w.exercises)) {
    if (seen.has(planned.name)) continue
    seen.add(planned.name)
    const target = targetFor(planned, facts.targets)
    const shown = effectiveExercise(planned, target)
    if (shown.name !== planned.name) {
      moves.push(`${planned.name} → ${shown.name}`)
      continue
    }
    const sets = facts.history.filter(
      (entry): entry is Extract<HistoryEntry, { kind: 'set' }> => entry.kind === 'set' && entry.result === 'done' && entry.exercise === shown.name,
    )
    const first = sets[0]
    if (first === undefined) continue
    if (shown.weight !== undefined && first.weight !== undefined) {
      const heaviest = Math.max(...sets.map(set => set.weight ?? 0))
      if (heaviest > first.weight) {
        more.push(`${shown.name} ${first.weight} → ${heaviest} ${shown.weight.unit}`)
        continue
      }
    }
    if (first.count === undefined) continue
    const atFirstLoad = sets.filter(set => set.weight === first.weight && set.band === first.band && set.count !== undefined)
    const most = Math.max(...atFirstLoad.map(set => set.count ?? 0))
    if (most > first.count) more.push(`${shown.name} ${first.count} → ${most}${targetOf(shown.reps)?.unit ?? ''}`)
  }
  return [...moves, ...more]
}

/** The Workout pane's Swolomon line: where the day stands, and whether it is a win worth a flex. */
function paneLine(facts: StatusFacts, day: Day, steps: number): { coach: string; isWin: boolean } {
  const { today, progress, plan } = facts
  const workout = plan.workouts[progress.workout]
  const ctx = { day: today, nextDay: nextDayText(facts), workout: workout === undefined ? '' : shortWorkoutName(workout.name) }
  if (facts.paused) return { coach: line('pane-paused', ctx), isWin: false }
  if (day === 'finished') return { coach: line('pane-finished', ctx), isWin: true }
  if (day === 'done') return { coach: line('pane-done', ctx), isWin: true }
  if (day === 'declined') return { coach: line('pane-declined', ctx), isWin: false }
  if (day === 'rest') return { coach: line('pane-rest', ctx), isWin: false }
  // The half version chosen: said as the win it is, never "halfway".
  if (progress.half === true) return { coach: line('pane-half', { ...ctx, n: steps - progress.done }), isWin: false }
  if (progress.done === 0) return { coach: line('pane-fresh', { ...ctx, n: steps }), isWin: false }
  return { coach: line('pane-mid', { ...ctx, n: steps - progress.done }), isWin: false }
}

/**
 * The Workout pane (§1.4): Swolomon's line; `head`, beside the portrait, is the workout, where today
 * stands and the workout as a table, with the buttons under it; `more`, full width under that, is the
 * week, the streak, the rank and the bests.
 */
export function statusViewOf(facts: StatusFacts): StatusView {
  const { plan, progress, history, today } = facts
  const day = dayOf(facts)
  const workout = plan.workouts[progress.workout]
  const steps = workout === undefined ? [] : stepsFor(workout, progress)
  const head: BandLine[] = []
  if (facts.paused) head.push([{ text: 'Paused. ', bold: true, tone: 'accent' }, { text: '/workout resume to start again.', tone: 'muted' }])
  if (workout === undefined) head.push([{ text: `All ${plan.workouts.length} workouts done`, bold: true, tone: 'good' }])
  else if (weekProgress(plan, progress.workout, progress.workout) !== null) {
    // A plan with weeks: the week's finish line is nearer, and more worth seeing, than the program's.
    head.push([{ text: shortWorkoutName(workout.name), bold: true }, { text: '  ' }, ...weekLine(weekProgress(plan, progress.workout, progress.workout)!)])
  } else {
    const total = plan.workouts.length
    const width = Math.min(total, 12)
    head.push([
      { text: shortWorkoutName(workout.name), bold: true },
      { text: `  workout ${progress.workout + 1} of ${total}  `, tone: 'muted' },
      ...bar(Math.round((progress.workout / total) * width), width),
    ])
  }
  if (day === 'training') {
    head.push([
      { text: `${progress.done} of ${steps.length} sets today`, ...(progress.done > 0 ? { bold: true as const } : {}) },
    ])
  } else {
    head.push(
      {
        rest: [{ text: `Rest day · next workout ${nextDayText(facts)}`, tone: 'muted' }],
        done: [{ text: '✓ ', tone: 'good', bold: true }, { text: `Today's workout is done · next ${nextDayText(facts)}` }],
        declined: [{ text: `Not today · next workout ${nextDayText(facts)}`, tone: 'muted' }],
        finished: [{ text: 'Program complete', tone: 'good', bold: true }],
      }[day] as BandPart[],
    )
  }
  if (workout !== undefined && day !== 'finished') {
    head.push('')
    head.push(...workoutTable(workout, facts, day === 'training' ? progress.done : 0, day === 'training'))
  }

  const more: BandLine[] = []
  // Time moved while the agent worked: the headline the whole product earns.
  const total = movedSeconds(history)
  if (total > 0) {
    more.push([
      { text: 'Moved ', tone: 'muted' },
      { text: `${minutesWords(movedSeconds(history, mondayOf(today), today))} this week`, bold: true, tone: 'good' },
      { text: ` while your agent worked · ${minutesWords(total)} since day 1`, tone: 'muted' },
    ])
  }
  more.push(weekRow(facts))
  const run = streak(plan, history, today)
  const showedUp = daysShowedUp(history, today)
  more.push([
    // A broken streak is not a zero: what counts is showing up.
    run === 0 && showedUp > 0
      ? { text: `Showed up ${plural(showedUp, 'day')} this month`, bold: true as const }
      : { text: `Streak ${run}`, ...(run > 0 ? { bold: true as const } : {}) },
    { text: ` · ${plural(setsThisWeek(history, today), 'set')} this week · ${facts.totalDoneSets} total`, tone: 'muted' },
  ])
  more.push(rankBar(facts.totalDoneSets))
  const bests = plan.workouts
    .flatMap(w => w.exercises)
    .map(planned => effectiveExercise(planned, targetFor(planned, facts.targets)))
    .filter((exercise, i, all) => all.findIndex(other => other.name === exercise.name) === i)
    .flatMap(exercise => {
      const best = bestText(exercise, facts.memory)
      return best === null ? [] : [`${exercise.name} ${best}`]
    })
  // How far each exercise has come is the point of it all, so it leads; the bests stand in until then.
  const gains = gainsOf(facts)
  if (gains.length > 0) more.push([{ text: 'Since day 1  ', tone: 'muted' }, { text: gains.slice(0, 3).join(' · '), tone: 'good', truncate: true }])
  else if (bests.length > 0) more.push([{ text: 'Bests  ', tone: 'muted' }, { text: bests.slice(0, 4).join(' · '), truncate: true }])
  more.push('')
  const last = lastSetText(history, plan)
  if (last !== null) more.push([{ text: `Last set: ${last}`, tone: 'muted' }])
  more.push([{ text: plan.name, tone: 'muted' }])
  more.push([
    {
      text:
        plan.builtFor === undefined
          ? 'Your own plan.'
          : Object.values(plan.builtFor).some(Boolean)
            ? `Built for: ${equipmentLabel(plan.builtFor)}.`
            : plan.answers?.setting === 'office'
              ? 'Built for: no gear, no floor, standing and desk moves. Want floor work or gear? Change plan.'
              : 'Built for: bodyweight only. Have equipment? Change plan to fit it, or /workout plan to drop in your own.',
      tone: 'muted',
    },
  ])
  return { ...paneLine(facts, day, steps.length), head, more, isRestDay: day === 'rest', canShare: setsThisWeek(history, today) > 0 }
}

/** The rank and how far the next one is, as a bar: `Rank: Regular ▰▰▰▱▱▱▱▱▱▱ 40/100 to Rack Regular`. */
function rankBar(totalSets: number): BandPart[] {
  const next = nextRank(totalSets)
  const rank: BandPart = { text: `Rank: ${rankFor(totalSets).name}`, tone: 'accent', bold: true }
  if (next === null) return [rank, { text: ' · the top. It is written.', tone: 'muted' }]
  const from = rankFor(totalSets).sets
  const span = next.rank.sets - from
  return [
    rank,
    { text: '  ' },
    ...bar(Math.floor(((totalSets - from) / span) * 10), 10),
    { text: `  ${totalSets}/${next.rank.sets} to ${next.rank.name}`, tone: 'muted' },
  ]
}

/** The status line (§1.4): `💪 3/9` with sets left today, `💪 done` once finished today, else nothing. */
export function statusLineOf(facts: StatusFacts): string | undefined {
  const day = dayOf(facts)
  if (day === 'done') return '💪 done'
  if (day !== 'training') return undefined
  const workout = facts.plan.workouts[facts.progress.workout]
  return workout === undefined ? undefined : `💪 ${facts.progress.done}/${stepsFor(workout, facts.progress).length}`
}

/** `/workout status`: the same facts as one line. */
export function statusTextOf(facts: StatusFacts): string {
  const { plan, progress } = facts
  const workout = plan.workouts[progress.workout]
  const where =
    workout === undefined
      ? 'Plan finished'
      : `Workout ${progress.workout + 1} of ${plan.workouts.length} (${shortWorkoutName(workout.name)}), set ${progress.done + 1} of ${stepsFor(workout, progress).length}`
  const day = {
    training: 'training day',
    rest: `rest day, next ${nextDayText(facts)}`,
    done: `done today, next ${nextDayText(facts)}`,
    declined: `not today, next ${nextDayText(facts)}`,
    finished: 'program complete',
  }[dayOf(facts)]
  const last = lastSetText(facts.history, plan)
  const parts = [
    ...(facts.paused ? ['Paused.'] : []),
    `IdleReps ${PLUGIN_VERSION}`,
    where,
    day,
    ...(last === null ? [] : [`Last set: ${last}`]),
    `streak ${streak(plan, facts.history, facts.today)}`,
    `rank=${rankFor(facts.totalDoneSets).name}`,
  ]
  return parts.join(' · ')
}
