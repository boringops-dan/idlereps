// Seeds IdleReps for the launch checklist's rows that need history (markdown/qa/launch-checklist.md in hq).
// Writes ~/.claude/idlereps/backup.json for a scenario; then `/workout restore` in Claude Code loads it.
//
//   npx -y tsx scripts/seed-checklist.mts <scenario>     (from the mod repo root)
//   npx -y tsx scripts/seed-checklist.mts mine           (puts your own backup back; then /workout restore)
//
// Run `/workout export` first: the backup.json already there is kept as backup.before-seed.json, and `mine`
// puts it back. Scenarios that use your plan read ~/.claude/idlereps/plan.json (Quick start makes one).
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'

import type { HistoryEntry, LastByExercise, Plan } from '../plugins/idlereps/types'
import { UNLOCK_ORDER, unlocksEarned } from '../plugins/idlereps/hooks/collection'
import { backupOf, backupPathOf, dataDirOf } from '../plugins/idlereps/hooks/data'
import { CURRENT_SCHEMA } from '../plugins/idlereps/hooks/migrations'
import { dayNumberOf, parsePlan, planPathOf, START, startOfDayMs, targetOf, WEEKDAYS } from '../plugins/idlereps/hooks/plan'
import type { Prep } from '../plugins/idlereps/hooks/prep'
import { loadKey } from '../plugins/idlereps/hooks/record'

type SetEntry = Extract<HistoryEntry, { kind: 'set' }>

const home = homedir()
const backupPath = backupPathOf(home)
const keptPath = `${dataDirOf(home)}/backup.before-seed.json`
const today = dayNumberOf(Date.now())
const noonOf = (day: number) => startOfDayMs(day) + 12 * 3_600_000

function readPlan(): Plan {
  const path = planPathOf(home)
  if (!existsSync(path)) throw new Error(`${path} does not exist: make a plan first (Quick start, or /workout setup).`)
  return parsePlan(readFileSync(path, 'utf8'))
}

/** A done set of `exercise` (by index in workout 0) on `day`, at the plan's starting target and load. */
function setOf(plan: Plan, exercise: number, day: number, set: number): SetEntry {
  const planned = plan.workouts[0]?.exercises[exercise]
  if (planned === undefined) throw new Error('the plan has no first workout')
  const count = targetOf(planned.reps)?.value
  return {
    kind: 'set',
    t: noonOf(day) + set * 60_000,
    d: day,
    w: 0,
    exercise: planned.name,
    set,
    target: planned.reps,
    result: 'done',
    ...(count === undefined ? {} : { count }),
    ...(planned.weight === undefined ? {} : { weight: planned.weight.start }),
    ...(planned.band === undefined ? {} : { band: planned.band.start }),
  }
}

/** `n` done sets, three a session every other day, the last session on `lastDay`, through workout 0's exercises. */
function sessions(plan: Plan, n: number, lastDay: number): SetEntry[] {
  const count = plan.workouts[0]?.exercises.length ?? 1
  return Array.from({ length: n }, (_, i) => setOf(plan, i % count, lastDay - 2 * Math.floor((n - 1 - i) / 3), (i % 3) + 1))
}

/** The store a history implies: totals, last and best by exercise, and the moves those sets earned. */
function storeOf(history: readonly SetEntry[], extra: { totalDoneSets?: number; prep?: Prep; moves?: readonly string[]; declines?: number[] } = {}) {
  const total = extra.totalDoneSets ?? history.length
  const lastByExercise: LastByExercise = {}
  for (const e of history) {
    const memory = lastByExercise[e.exercise] ?? { best: {} }
    const load = loadKey(e.weight, e.band)
    if (e.count !== undefined) memory.best[load] = Math.max(memory.best[load] ?? 0, e.count)
    lastByExercise[e.exercise] = { last: e, best: memory.best }
  }
  const first = history[0]?.d ?? today
  const seen = Object.fromEntries(['safety', 'setup-prompt', 'hint'].map(id => [id, { at: noonOf(first), n: 3 }]))
  return {
    schemaVersion: CURRENT_SCHEMA,
    progress: START,
    history,
    targets: {},
    lastByExercise,
    totalDoneSets: total,
    startedOn: first,
    planStartedOn: first,
    seen,
    moves: extra.moves ?? UNLOCK_ORDER.slice(0, unlocksEarned(total)),
    ...(extra.prep === undefined ? (total >= 2 ? { prep: { stage: 0, from: 1, medals: [] } } : {}) : { prep: extra.prep }),
    ...(extra.declines === undefined ? {} : { declines: extra.declines }),
  }
}

/** The last `n` days before today that fall on `weekday`. */
function lastWeekdays(weekday: string, n: number): number[] {
  const days: number[] = []
  for (let d = today - 1; days.length < n; d -= 1) if (WEEKDAYS[new Date(noonOf(d)).getDay()] === weekday) days.push(d)
  return days
}

const SCENARIOS: Record<string, { row: string; what: string; build: () => ReturnType<typeof storeOf> }> = {
  'rank-up': { row: '22b', what: '24 sets done: the next set is the 25th, Regular.', build: () => storeOf(sessions(readPlan(), 24, today - 1)) },
  away: { row: '23j', what: '12 sets, the last 9 days ago.', build: () => storeOf(sessions(readPlan(), 12, today - 9)) },
  declines: {
    row: '23b',
    what: 'Not today said on each of the last two Fridays (your plan must train on Fridays).',
    build: () => {
      const plan = readPlan()
      if (!('days' in plan.schedule) || !plan.schedule.days.includes('fri')) throw new Error('the plan does not train on Fridays: Quick start makes a Mon Wed Fri plan.')
      return storeOf(sessions(plan, 6, today - 3), { declines: lastWeekdays('fri', 2) })
    },
  },
  'set-ten': {
    row: '29c',
    what: "9 done sets of the plan's first exercise: the next of it is the 10th.",
    build: () => {
      const plan = readPlan()
      return storeOf(Array.from({ length: 9 }, (_, i) => setOf(plan, 0, today - 2 * (9 - i), 1)))
    },
  },
  posing: {
    row: '29d',
    what: '22 sets done, his prep 21 sets in: the next set starts posing practice.',
    build: () => storeOf(sessions(readPlan(), 22, today - 1), { prep: { stage: 0, from: 1, medals: [] } }),
  },
  'all-moves': {
    row: '29h',
    what: 'Every move unlocked (3570 sets, all time).',
    build: () => storeOf(sessions(readPlan(), 30, today - 1), { totalDoneSets: 3570, moves: UNLOCK_ORDER, prep: { stage: 0, from: 3570, medals: [] } }),
  },
}

const name = process.argv[2] ?? ''
if (name === 'mine') {
  if (!existsSync(keptPath)) throw new Error(`no ${keptPath} to put back`)
  copyFileSync(keptPath, backupPath)
  console.log(`Your backup is back at ${backupPath}. Now /workout restore in Claude Code.`)
} else {
  const scenario = SCENARIOS[name]
  if (scenario === undefined) {
    console.log('Scenarios (checklist row: what it seeds):')
    for (const [id, s] of Object.entries(SCENARIOS)) console.log(`  ${id.padEnd(10)} ${s.row.padEnd(4)} ${s.what}`)
    console.log('  mine            put your own backup back')
    process.exit(name === '' ? 0 : 1)
  }
  const store = scenario.build()
  if (existsSync(backupPath) && !existsSync(keptPath)) copyFileSync(backupPath, keptPath)
  writeFileSync(backupPath, `${JSON.stringify(backupOf(store, CURRENT_SCHEMA, Date.now()))}\n`)
  console.log(`Seeded "${name}" (row ${scenario.row}): ${scenario.what}\nNow /workout restore in Claude Code.`)
}
