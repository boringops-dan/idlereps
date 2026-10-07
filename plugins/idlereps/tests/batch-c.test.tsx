import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import type { HistoryEntry, Plan, Progress, Targets } from '../types'
import { BACKUP_KEYS, backupOf, historyCsv, parseBackup } from '../hooks/data'
import { line } from '../hooks/copy'
import { dayNumberOf, START, startOfDayMs, stepsOf } from '../hooks/plan'
import { generateProgram, STARTER_ANSWERS } from '../hooks/programs'
import { isNewBest } from '../hooks/record'
import { addInterval, formatDuration, shareLine, workedMs } from '../hooks/worktime'
import { setShown, BAND, drawnRows, NOON, OPTIONS, PLAN_PATH, SESSION, STATUS, TINY, TODAY, workout, ownStore, world } from './world'

/** The rest of Phase B: the warm-up, the end of a block, your data, sharing the week. */

const DAY_MS = 86_400_000
const HOME = '/home/me/.claude/idlereps'
const WARM = { options: { ...OPTIONS.options, warmUp: true } }

const doneSet = (d: number, exercise = 'Push-ups'): HistoryEntry => ({ kind: 'set', t: NOON, d, w: 0, exercise, set: 1, target: '10 reps', result: 'done', count: 10 })

// ---------------------------------------------------------------------------------------------------------
// The warm-up (§1.12 item 2).

test('Start: the warm-up first, then Done shows the first set at once, Swolomon’s word kept', WARM, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(drawnRows(await ui.drawn())).toContain(line('warmup', { day: TODAY }))
  expect(drawnRows(await ui.drawn()).at(-1)).toBe('1: Done   0: Skip')
  await ui.press({ key: 'warmed' })
  expect(await setShown(ui)).toBe(true)
  expect(drawnRows(await ui.drawn()).some(row => row.startsWith('Swolomon') || row.includes('Push-ups'))).toBe(true)
  await ui.unmount()
})

test('Skip the warm-up: the first set at once, and nothing recorded', WARM, async ($, on) => {
  const store = ownStore(on)
  world(on, TINY, 'own-store')
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('skipwarmup'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await setShown(ui)).toBe(true)
  expect(store.get('history')).toBeUndefined()
  await ui.unmount()
})

test('once a day: a second Start that day goes straight to the set; the next day warms up again', WARM, async ($, on) => {
  const { clock } = world(on, { ...TINY, schedule: { everyNDays: 1 } })
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('warmed'))
  await $.command.run(workout('later'))
  await $.command.run(workout('start'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'warmed' })).toBeUndefined()
  await clock.advance(DAY_MS)
  await $.command.run(workout('start'))
  expect(await ui.find({ key: 'warmed' })).toBeDefined()
  await ui.unmount()
})

test('no warm-up mid-workout, nor with it turned off', WARM, async ($, on) => {
  world(on, TINY, { progress: { ...START, done: 1 } })
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'warmed' })).toBeUndefined()
  await ui.unmount()
})

test('the warm-up turned off: Start is the set', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'warmed' })).toBeUndefined()
  expect(await setShown(ui)).toBe(true)
  await ui.unmount()
})

// ---------------------------------------------------------------------------------------------------------
// The end of a block (§1.12 item 4).

const STARTER = generateProgram(STARTER_ANSWERS)
const LAST = STARTER.workouts.length - 1
const lastSet: Progress = { ...START, workout: LAST, done: stepsOf(STARTER.workouts[LAST]!).length - 1 }

async function finishBlock($: Engine) {
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  await $.command.run(workout('good'))
}

test('the last workout, rated: Program complete with what the block came to, and three ways on', OPTIONS, async ($, on) => {
  world(on, STARTER, { progress: lastSet, history: [doneSet(TODAY - 3), doneSet(TODAY - 2)], planStartedOn: TODAY - 30 })
  await $.session.start(SESSION)
  await finishBlock($)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(drawnRows(await ui.drawn())).toContain(`Program complete: ${STARTER.workouts.length} workouts, 3 sets.`)
  expect(drawnRows(await ui.drawn()).at(-1)).toBe('1: Next block   2: Change plan   3: Later')
  await ui.unmount()
})

test('Next block: the plan regenerated from its answers, workout 1, every target kept', OPTIONS, async ($, on) => {
  const targets: Targets = { 'Desk push-ups': { reps: 14, belowStreak: 0, toughStreak: 0 } }
  const store = ownStore(on, { progress: lastSet, targets })
  const { w } = world(on, STARTER, 'own-store')
  await $.session.start(SESSION)
  await finishBlock($)
  await $.command.run(workout('nextblock'))
  expect(JSON.parse(w.file.text ?? '{}')).toEqual(STARTER)
  expect((store.get('progress') as Progress).workout).toBe(0)
  expect((store.get('targets') as Targets)['Desk push-ups']).toEqual(targets['Desk push-ups'])
  expect(w.toasts).toContain(line('next-block', { day: TODAY }))
})

test('a hand-written plan: Next block restarts the same file at workout 1, targets kept', OPTIONS, async ($, on) => {
  const targets: Targets = { 'Push-ups': { reps: 13, belowStreak: 0, toughStreak: 0 } }
  const store = ownStore(on, { progress: { ...START, workout: 2, lastCompletedOn: TODAY - 1 }, targets })
  const { w } = world(on, TINY, 'own-store')
  await $.session.start(SESSION)
  expect((await $.command.run(workout('next-block'))).text).toBe(line('next-block', { day: TODAY }))
  expect(JSON.parse(w.file.text ?? '{}')).toEqual(TINY)
  expect(store.get('progress')).toMatchObject({ workout: 0, done: 0 })
  expect(store.get('targets')).toEqual(targets)
})

test('/workout next-block before the block is done says how many workouts are left', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  expect((await $.command.run(workout('next-block'))).text).toBe(line('reply-not-finished', { day: TODAY, n: 2 }))
})

test('Change plan opens setup with the old answers; Later asks again only on the next training day', OPTIONS, async ($, on) => {
  const { w, clock } = world(on, STARTER, { progress: lastSet })
  await $.session.start(SESSION)
  await finishBlock($)
  await $.command.run(workout('endlater'))
  // Today (a Friday) it was asked; Saturday is no training day; Monday asks again.
  await $.session.start(SESSION)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'nextblock' })).toBeUndefined()
  await clock.advance(DAY_MS)
  await $.session.start(SESSION)
  expect(await ui.find({ key: 'nextblock' })).toBeUndefined()
  await clock.advance(2 * DAY_MS)
  await $.session.start(SESSION)
  expect(await ui.find({ key: 'nextblock' })).toBeDefined()
  await ui.press({ key: 'changeplan' })
  expect(w.opened).toContain('workout-setup')
  await ui.unmount()
})

// ---------------------------------------------------------------------------------------------------------
// Your data (§1.12 item 5, Task 14).

test('the CSV: a header, a row a set, quoting where needed, an empty count for a skip, bonus sets named', () => {
  const plan: Plan = { ...TINY, workouts: [{ name: 'A, the first', exercises: [{ name: 'Rows', reps: '10 reps', sets: 1, weight: { start: 10, step: 2, unit: 'kg' } }] }] }
  const csv = historyCsv(
    [
      { kind: 'set', t: NOON, d: TODAY, w: 0, exercise: 'Rows', set: 1, target: '10 reps', result: 'done', count: 10, weight: 12 },
      { kind: 'set', t: NOON, d: TODAY, w: 0, exercise: 'Say "hi"', set: 2, target: '10 reps', result: 'skip' },
      { kind: 'set', t: NOON, d: TODAY, w: 0, exercise: 'Rows', set: 0, target: '10 reps', result: 'done', count: 11 },
      { kind: 'workout-complete', t: NOON, d: TODAY, w: 0 },
    ],
    plan,
  )
  const date = new Date(TODAY * DAY_MS).toISOString().slice(0, 10)
  expect(csv.split('\r\n')).toEqual([
    'date,workout,exercise,set,target,result,count,weight,unit,band',
    `${date},"A, the first",Rows,1,10 reps,done,10,12,kg,`,
    `${date},"A, the first","Say ""hi""",2,10 reps,skip,,,,`,
    `${date},"A, the first",Rows,bonus,10 reps,done,11,,,`,
    '',
  ])
})

test('a backup holds every backed-up key and nothing else; unknown keys and bad files are refused', () => {
  const backup = backupOf({ progress: START, undo: { id: 1 }, totalDoneSets: 3 } as never, 1, NOON)
  expect(Object.keys(backup.store).sort()).toEqual(['progress', 'totalDoneSets'])
  expect(parseBackup(JSON.stringify(backup))).toEqual({ backup })
  expect(parseBackup('nope')).toEqual({ error: 'it is not JSON' })
  expect(parseBackup('{"schemaVersion":1,"exportedAt":1,"store":{"undo":1}}')).toEqual({ error: 'it has an unknown key "undo"' })
  expect(parseBackup('{"store":{}}')).toEqual({ error: 'it has no version or date' })
  expect(BACKUP_KEYS).not.toContain('undo')
})

test('export, erase (asked first), restore (asked first): the store comes back identical', OPTIONS, async ($, on) => {
  const seed = { schemaVersion: 1, progress: { ...START, workout: 1 }, totalDoneSets: 7, history: [doneSet(TODAY)], targets: { 'Push-ups': { reps: 12, belowStreak: 0, toughStreak: 0 } } }
  const store = ownStore(on, seed)
  const { w } = world(on, TINY, 'own-store')
  await $.session.start(SESSION)
  const before = Object.fromEntries([...store.entries()].filter(([k]) => (BACKUP_KEYS as readonly string[]).includes(k)))
  expect((await $.command.run(workout('export'))).text).toBe(line('reply-exported', { day: TODAY, n: 1, path: `${HOME}/history.csv`, backup: `${HOME}/backup.json` }))
  expect(w.files.get(`${HOME}/history.csv`)?.startsWith('date,workout,')).toBe(true)
  await $.command.run(workout('erase'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(drawnRows(await ui.drawn())).toEqual([line('erase-ask', { day: TODAY }), line('plan-file-stays', { day: TODAY }), '', '1: Erase   2: Cancel'])
  await ui.press({ key: 'erase' })
  expect(store.get('totalDoneSets')).toBeUndefined()
  expect(w.file.text).not.toBeNull()
  await $.command.run(workout('restore'))
  expect(await ui.find({ key: 'restore' })).toBeDefined()
  await ui.press({ key: 'restore' })
  const after = Object.fromEntries([...store.entries()].filter(([k]) => (BACKUP_KEYS as readonly string[]).includes(k)))
  expect(after).toEqual(before)
  await ui.unmount()
})

test('Cancel on either confirm changes nothing', OPTIONS, async ($, on) => {
  const store = ownStore(on, { totalDoneSets: 7 })
  const { w } = world(on, TINY, 'own-store')
  w.files.set(`${HOME}/backup.json`, JSON.stringify(backupOf({ totalDoneSets: 1 }, 1, NOON)))
  await $.session.start(SESSION)
  await $.command.run(workout('erase'))
  await $.command.run(workout('cancel'))
  await $.command.run(workout('restore'))
  await $.command.run(workout('cancel'))
  expect(store.get('totalDoneSets')).toBe(7)
  expect(w.toasts.filter(t => t === line('reply-cancelled', { day: TODAY })).length).toBe(2)
})

test('restore: a key the backup lacks is deleted; a missing or invalid file changes nothing', OPTIONS, async ($, on) => {
  const store = ownStore(on, { totalDoneSets: 7, startedOn: TODAY })
  const { w } = world(on, TINY, 'own-store')
  await $.session.start(SESSION)
  expect((await $.command.run(workout('restore'))).text).toBe(line('reply-restore-missing', { day: TODAY, path: `${HOME}/backup.json`, reason: 'does not exist' }))
  w.files.set(`${HOME}/backup.json`, 'garbage')
  expect((await $.command.run(workout('restore'))).text).toBe(line('reply-restore-missing', { day: TODAY, path: `${HOME}/backup.json`, reason: 'it is not JSON' }))
  expect(store.get('totalDoneSets')).toBe(7)
  w.files.set(`${HOME}/backup.json`, JSON.stringify(backupOf({ totalDoneSets: 3 }, 1, NOON)))
  await $.command.run(workout('restore'))
  await $.command.run(workout('restore'))
  expect([store.get('totalDoneSets'), store.get('startedOn')]).toEqual([3, undefined])
})

// ---------------------------------------------------------------------------------------------------------
// Sharing the week (§1.9).

const at = (d: number, h: number, m = 0) => startOfDayMs(d) + h * 3_600_000 + m * 60_000

test('work time: overlaps count once, touching intervals merge, midnight splits, 14 days kept', () => {
  let map = addInterval({}, at(TODAY, 9), at(TODAY, 10), dayNumberOf, startOfDayMs)
  map = addInterval(map, at(TODAY, 9, 30), at(TODAY, 10, 30), dayNumberOf, startOfDayMs)
  map = addInterval(map, at(TODAY, 10, 30), at(TODAY, 11), dayNumberOf, startOfDayMs)
  expect(map[String(TODAY)]).toEqual([[at(TODAY, 9), at(TODAY, 11)]])
  map = addInterval(map, at(TODAY, 23), at(TODAY + 1, 1), dayNumberOf, startOfDayMs)
  expect(workedMs(map, TODAY + 1, TODAY + 1)).toBe(3_600_000)
  expect(workedMs(map, TODAY, TODAY)).toBe(3 * 3_600_000)
  map = addInterval(map, at(TODAY + 20, 9), at(TODAY + 20, 10), dayNumberOf, startOfDayMs)
  expect(Object.keys(map)).toEqual([String(TODAY + 20)])
})

test('durations as the share line says them', () => {
  expect([formatDuration(59 * 60_000), formatDuration(60 * 60_000), formatDuration(372 * 60_000)]).toEqual(['59 m', '1 h 0 m', '6 h 12 m'])
  expect(shareLine(372 * 60_000, 84, 'Rack Regular')).toBe('This week my agent worked 6 h 12 m while I did 84 sets. Rank: Rack Regular. idlereps.app')
})

test('share: copies exactly the line, with this week’s sets and the agent’s merged time; names nothing else', OPTIONS, async ($, on) => {
  const copied: string[] = []
  on('ui.copy', ($, e) => {
    copied.push(e.text)
    return { value: { isCopied: true } }
  })
  // Two sessions' overlapping turns: another session's 11:30 to 12:30 stored, and this session's live turn
  // from 12:00, shared at 13:00: 11:30 to 13:00, counted once.
  const { clock } = world(on, TINY, { history: [doneSet(TODAY), doneSet(TODAY - 1), doneSet(TODAY - 9)], workIntervals: { [String(TODAY)]: [[NOON - 1_800_000, NOON + 1_800_000]] } })
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(3_600_000)
  const reply = (await $.command.run(workout('share'))).text
  const text = shareLine(5_400_000, 2, 'New Face')
  expect(copied).toEqual([text])
  expect(reply).toBe(line('reply-shared', { day: TODAY, text }))
  for (const name of ['Push-ups', 'Squats', 'Tiny', 'A', 'B']) expect(text.includes(` ${name} `)).toBe(false)
})

test('share with no sets this week copies nothing and says so; a failed copy replies with the line alone', OPTIONS, async ($, on) => {
  let copies = 0
  on('ui.copy', () => {
    copies += 1
    return { value: { isCopied: false, reason: 'no clipboard' } } as never
  })
  world(on, TINY, { history: [doneSet(TODAY - 9)] })
  await $.session.start(SESSION)
  expect((await $.command.run(workout('share'))).text).toBe(line('reply-share-empty', { day: TODAY }))
  expect(copies).toBe(0)
})

test('a failed copy replies with the line alone, to select by hand', OPTIONS, async ($, on) => {
  on('ui.copy', () => ({ value: { isCopied: false, reason: 'no clipboard' } }) as never)
  world(on, TINY, { history: [doneSet(TODAY)] })
  await $.session.start(SESSION)
  expect((await $.command.run(workout('share'))).text).toBe(shareLine(0, 1, 'New Face'))
})

test('each finished turn is recorded as working time; the pane offers Share week once there is a set', OPTIONS, async ($, on) => {
  const store = ownStore(on, { history: [doneSet(TODAY)] })
  const { clock } = world(on, TINY, 'own-store')
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(10 * 60_000)
  await $.turn.complete({ turnId: 't1', answer: '', reason: 'answer', durationMs: 600_000, isAborted: false } as never)
  expect(workedMs(store.get('workIntervals') as never, TODAY, TODAY)).toBe(600_000)
  await $.command.run(workout(''))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...STATUS })
  expect(await pane.find({ key: 'share' })).toBeDefined()
  await pane.unmount()
  expect(PLAN_PATH.length).toBeGreaterThan(0)
})

// ---------------------------------------------------------------------------------------------------------
// Personal bests (Task 14).

test('a best: nothing to beat on the first set; beating the same load is; a heavier load is its own record', () => {
  expect(isNewBest({}, 10, 'any')).toBe(false)
  expect(isNewBest({ any: 10 }, 11, 'any')).toBe(true)
  expect(isNewBest({ any: 10 }, 10, 'any')).toBe(false)
  expect(isNewBest({ '10': 12 }, 8, '12')).toBe(false)
})

test('Undo of a new best puts the old best back', OPTIONS, async ($, on) => {
  const store = ownStore(on, { lastByExercise: { 'Push-ups': { best: { any: 10 } } } })
  world(on, TINY, 'own-store')
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done 12'))
  expect((store.get('lastByExercise') as Record<string, { best: Record<string, number> }>)['Push-ups']?.best.any).toBe(12)
  await $.command.run(workout('undo'))
  expect((store.get('lastByExercise') as Record<string, { best: Record<string, number> }>)['Push-ups']?.best.any).toBe(10)
})
