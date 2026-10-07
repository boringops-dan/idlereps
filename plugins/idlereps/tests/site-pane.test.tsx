import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

import type { HistoryEntry, Plan, Targets } from '../types'
import { STARTER_MOVES, UNLOCK_ORDER } from '../hooks/collection'
import { ADDRESS_TERMS, FEEDBACK_URL, line, LINES } from '../hooks/copy'
import { START } from '../hooks/plan'
import { nextTarget } from '../hooks/history'
import { generateProgram, STARTER_ANSWERS } from '../hooks/programs'
import { BAND, COLLECTION, drawnRows, NOON, OPTIONS, ownStore, PLAN_PATH, SESSION, STATUS, textOf, TINY, TODAY, WEIGHTED, workout, world } from './world'

/**
 * idlereps.app's claims about the Workout pane and the FAQ, each proved against the running plugin. A test
 * asserts what the site says; where it fails, the site (or the plugin) is wrong.
 */

const DAY_MS = 86_400_000
const HOME = '/home/me/.claude/idlereps'
const QUICK: Plan = generateProgram(STARTER_ANSWERS)

// ---------------------------------------------------------------------------------------------------------
// The pane mock: a Friday in week 2 of Quick start, Full body C under way, its two Squats sets done today.

/** Week 1 A, B, C (Mon, Wed, Fri) and week 2 A, B (Mon, Wed), a rep more each time an exercise comes up. */
const DAYS = [TODAY - 11, TODAY - 9, TODAY - 7, TODAY - 4, TODAY - 2]

function mockHistory(): HistoryEntry[] {
  const seen: Record<string, number> = {}
  const history: HistoryEntry[] = []
  DAYS.forEach((d, w) => {
    const t = NOON + (d - TODAY) * DAY_MS
    for (const exercise of QUICK.workouts[w]!.exercises) {
      const k = (seen[exercise.name] = (seen[exercise.name] ?? -1) + 1)
      const match = /^(\d+)(.*)$/.exec(exercise.reps)!
      const isTimed = /\bs\b/.test(match[2]!)
      const count = Number(match[1]) + (isTimed ? 0 : k)
      for (let set = 1; set <= exercise.sets; set += 1) {
        history.push({ kind: 'set', t, d, w, exercise: exercise.name, set, target: `${count}${match[2]}`, result: 'done', count })
      }
    }
    history.push({ kind: 'workout-complete', t, d, w })
  })
  for (const set of [1, 2]) history.push({ kind: 'set', t: NOON, d: TODAY, w: 5, exercise: 'Squats', set, target: '15 reps', result: 'done', count: 15 })
  return history
}

const target = (reps: number) => ({ reps, belowStreak: 0, toughStreak: 0 })
const TARGETS: Targets = {
  'Desk push-ups': target(12),
  Squats: target(15),
  'Wall angels': target(13),
  'Reverse lunges': target(8),
  'Wall push-ups': target(17),
  'Hip-flexor stretch': target(30),
}
const BESTS = { 'Desk push-ups': 11, Squats: 15, 'Wall angels': 12, 'Reverse lunges': 7, 'Wall push-ups': 16, 'Hip-flexor stretch': 30 }

/** The rows idlereps.app draws for the pane, verbatim (index.html). */
const SITE_ROWS = [
  'Full body C  Week 2: 2 of 3 workouts  ●●○',
  '2 of 6 sets today',
  '  Squats              ●●  15 reps         ▁▃▆█   best 15 reps',
  '› Wall angels         ●○  13 reps         ▁▃▅▆█   best 12 reps',
  '  Hip-flexor stretch  ○○  30 s each side   best 30 s each side',
  '1: Start a set now   3: Share week   4: Change plan   0: Close',
  'Moved 12 min this week while your agent worked · 26 min since day 1',
  'Mon ●  Tue ·  Wed ●  Thu ·  Fri ◐  Sat ·  Sun ·',
  'Streak 5 · 14 sets this week · 32 total',
  'Rank: Regular  ━━━━━━━━━━  32/100 to Rack Regular',
  // The site fills this row from the collection's size (site.js paneMoves), so it follows new moves.
  `Moves 9 of ${STARTER_MOVES.length + UNLOCK_ORDER.length}  ━━━━━━━━━━  next in 4 sets · /workout moves`,
  'Since day 1  Desk push-ups 10 → 11 reps · Squats 12 → 15 reps · Wall angels 8 → 12 reps',
]

async function paneRows($: Engine, on: On, totalDoneSets: number): Promise<string[]> {
  world(on, QUICK, {
    progress: { ...START, workout: 5, done: 2, lastCompletedOn: TODAY - 2 },
    history: mockHistory(),
    totalDoneSets,
    targets: TARGETS,
    lastByExercise: Object.fromEntries(Object.entries(BESTS).map(([name, best]) => [name, { best: { any: best } }])),
    moves: UNLOCK_ORDER.slice(0, 6),
    planStartedOn: TODAY - 11,
    startedOn: TODAY,
  })
  await $.session.start(SESSION)
  await $.command.run(workout(''))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...STATUS })
  const rows = drawnRows(await pane.drawn())
  await pane.unmount()
  return rows
}

test('site pane mock: every row is a row the real pane draws for that week, in its order', OPTIONS, async ($, on) => {
  const rows = await paneRows($, on, 32)
  expect(SITE_ROWS.filter(row => !rows.includes(row))).toEqual([])
  const at = SITE_ROWS.map(row => rows.indexOf(row))
  expect(at).toEqual([...at].sort((x, y) => x - y))
  // His line comes before today's count, as the site draws it.
  expect(rows.indexOf(line('pane-mid', { day: TODAY, n: 4 }))).toBeLessThan(rows.indexOf('2 of 6 sets today'))
})

test('site pane mock: its own numbers agree (32 total done sets is what that history adds up to)', () => {
  const done = mockHistory().filter(e => e.kind === 'set' && e.result === 'done').length
  expect(done).toBe(32)
})

test('site pane mock: its targets are the ones that week reaches (Wall angels past the top of its range, the stretch at 30 s)', () => {
  const angels = QUICK.workouts[0]!.exercises.find(e => e.name === 'Wall angels')!
  const hip = QUICK.workouts[2]!.exercises.find(e => e.name === 'Hip-flexor stretch')!
  const atTop = [1, 2].map(() => ({ result: 'done' as const, count: 12 }))
  expect(nextTarget(angels, { reps: 12, belowStreak: 0, toughStreak: 0 }, atTop, 'good', 'office').reps).toBe(13)
  expect(nextTarget(hip, { reps: 30, belowStreak: 0, toughStreak: 0 }, [1, 2].map(() => ({ result: 'done' as const, count: 30 })), 'good', 'office').reps).toBe(30)
})

test('site pane mock: Swolomon’s line is a real pane-mid line, for 4 sets to go', OPTIONS, async ($, on) => {
  const rows = await paneRows($, on, 32)
  expect(rows).toContain(line('pane-mid', { day: TODAY, n: 4 }))
  // The site shows this variant, with this address term.
  expect(LINES.find(l => l.id === 'pane-mid')?.variants).toContain("Halfway's a myth, {mate}. {n} sets to go.")
  expect(ADDRESS_TERMS).toContain('legend')
})

// ---------------------------------------------------------------------------------------------------------
// "Every set is compared with the last one, and each exercise gets a trend line once you have three days."

const pushUps = (count: number, d: number, weight?: number): HistoryEntry => ({ kind: 'set', t: NOON, d, w: 0, exercise: 'Push-ups', set: 1, target: '10 reps', result: 'done', count, ...(weight === undefined ? {} : { weight }) })

test('every set is compared with the last one: ↑N on last time', OPTIONS, async ($, on) => {
  world(on, TINY, { lastByExercise: { 'Push-ups': { last: pushUps(10, TODAY - 2), best: { any: 15 } } } })
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done 12'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(drawnRows(await ui.drawn()).some(row => row.includes('· ↑2 on last time'))).toBe(true)
  await ui.unmount()
})

test('every set is compared with the last one: a new best', OPTIONS, async ($, on) => {
  world(on, TINY, { lastByExercise: { 'Push-ups': { last: pushUps(10, TODAY - 2), best: { any: 10 } } } })
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done 11'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(drawnRows(await ui.drawn()).some(row => row.includes('· new best'))).toBe(true)
  await ui.unmount()
})

test('every set is compared with the last one: heavier than last time', OPTIONS, async ($, on) => {
  const last: HistoryEntry = { kind: 'set', t: NOON, d: TODAY - 2, w: 0, exercise: 'Goblet squats', set: 1, target: '10 reps', result: 'done', count: 10, weight: 8 }
  world(on, WEIGHTED, { lastByExercise: { 'Goblet squats': { last, best: { '8': 12, '10': 12 } } } })
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done 8 10'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(drawnRows(await ui.drawn()).some(row => row.includes('· heavier than last time'))).toBe(true)
  await ui.unmount()
})

test('a trend line once an exercise has three days, not before', OPTIONS, async ($, on) => {
  world(on, TINY, { history: [pushUps(10, TODAY - 6), pushUps(11, TODAY - 4)] })
  await $.session.start(SESSION)
  await $.command.run(workout(''))
  let pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...STATUS })
  expect(drawnRows(await pane.drawn()).some(row => row.startsWith('› Push-ups') && /[▁▂▃▄▅▆▇█]/.test(row))).toBe(false)
  await pane.unmount()
  await $.command.run(workout('now'))
  await $.command.run(workout('done 13'))
  await $.command.run(workout(''))
  pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...STATUS })
  expect(drawnRows(await pane.drawn()).some(row => row.includes('Push-ups') && row.includes('▁▃█'))).toBe(true)
  await pane.unmount()
})

// ---------------------------------------------------------------------------------------------------------
// "When your week's workouts are done, Swolomon celebrates."

test('when the week’s workouts are done (Quick start), Swolomon celebrates the finish line', OPTIONS, async ($, on) => {
  world(on, QUICK, { progress: { ...START, workout: 2, done: 5, lastCompletedOn: TODAY - 2 } })
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  const rows = drawnRows(await ui.drawn())
  expect(rows).toContain('Week 1: 3 of 3 workouts  ●●●')
  expect(await ui.find({ type: 'Text', text: line('week-one-done', { day: TODAY }) })).toBeDefined()
  await ui.unmount()
})

// ---------------------------------------------------------------------------------------------------------
// "after Claude Code's own Baked for 6m 12s comes · 1 set while you waited 💪"

test('the turn summary: · 1 set while you waited 💪 (the agent ran npm test)', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.tool.call({ tool: 'Bash', command: 'npm test', description: 'run' } as never)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  await $.turn.complete({ turnId: 't1', answer: '', reason: 'answer', durationMs: 372_000, isAborted: false } as never)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', component: 'TurnDuration', props: { word: 'Baked', durationMs: 372_000 } })
  expect(drawnRows(await ui.drawn())[0]).toBe('Baked for 372s · 1 set while you waited 💪')
  await ui.unmount()
})

test('the turn summary: · 1 set while you waited 💪 (a long turn with no tool call, the set taken from its band)', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  const band = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(31_000)
  expect(await band.find({ key: 'start' })).toBeDefined()
  await band.press({ key: 'start' })
  expect(await band.find({ key: 'done' })).toBeDefined()
  await band.press({ key: 'done' })
  expect(drawnRows(await band.drawn()).some(row => row.includes('✓ Logged Push-ups'))).toBe(true)
  await band.unmount()
  await $.turn.complete({ turnId: 't1', answer: '', reason: 'answer', durationMs: 372_000, isAborted: false } as never)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', component: 'TurnDuration', props: { word: 'Baked', durationMs: 372_000 } })
  expect(drawnRows(await ui.drawn())[0]).toBe('Baked for 372s · 1 set while you waited 💪')
  await ui.unmount()
})

// The summary line around it: one row for the duration and the tally, his word (if any) under it.

const turnEnd = async ($: Engine, durationMs: number) => {
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', component: 'TurnDuration', props: { word: 'Baked', durationMs } })
  const rows = drawnRows(await ui.drawn())
  await ui.unmount()
  return rows
}
const ended = (turnId: string, durationMs: number, agentId?: string) =>
  ({ turnId, answer: '', reason: 'answer', durationMs, isAborted: false, ...(agentId === undefined ? {} : { agentId }) }) as never

test('the turn summary: two sets with no tool call, still one row', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  await $.command.run(workout('now'))
  await $.command.run(workout('done'))
  await $.turn.complete(ended('t1', 400_000))
  expect(await turnEnd($, 400_000)).toEqual([`Baked for 400s · ${line('turn-sets', { day: TODAY, sets: '2 sets' })} 💪`])
})

test('the turn summary: no sets and no tool call, the duration alone', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.turn.complete(ended('t1', 90_000))
  expect(await turnEnd($, 90_000)).toEqual(['Baked for 90s'])
})

test('the turn summary: a set during a build, the tally on the duration’s row and his reading under it', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.tool.call({ tool: 'Bash', command: 'cargo build --release', description: 'build' } as never)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  await $.turn.complete(ended('t1', 250_000))
  const rows = await turnEnd($, 250_000)
  expect(rows[0]).toBe(`Baked for 250s · ${line('turn-sets', { day: TODAY, sets: '1 set' })} 💪`)
  expect(rows).toHaveLength(2)
  expect(rows[1]?.startsWith('Swolomon: ')).toBe(true)
})

test('the turn summary: a helper agent’s turn ending says nothing of your sets', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  await $.turn.complete(ended('t1', 120_000, 'helper-1'))
  expect(await turnEnd($, 120_000)).toEqual(['Baked for 120s'])
})

test('the turn summary: the next turn, with no set of its own, carries no tally over', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  await $.turn.complete(ended('t1', 300_000))
  await $.turn.start({ text: 'again', turnId: 't2' })
  await $.turn.complete(ended('t2', 310_000))
  expect(await turnEnd($, 300_000)).toEqual([`Baked for 300s · ${line('turn-sets', { day: TODAY, sets: '1 set' })} 💪`])
  expect(await turnEnd($, 310_000)).toEqual(['Baked for 310s'])
})

// ---------------------------------------------------------------------------------------------------------
// FAQ: "Can I move my progress to another machine?"

test('export writes history.csv and backup.json to ~/.claude/idlereps/', OPTIONS, async ($, on) => {
  const { w } = world(on, TINY, { history: [pushUps(10, TODAY)], totalDoneSets: 1 })
  await $.session.start(SESSION)
  await $.command.run(workout('export'))
  expect(w.files.has(`${HOME}/history.csv`)).toBe(true)
  expect(w.files.has(`${HOME}/backup.json`)).toBe(true)
})

test('restore brings a backup back, asking first', OPTIONS, async ($, on) => {
  const { w } = world(on, TINY, { history: [pushUps(10, TODAY)], totalDoneSets: 4 })
  await $.session.start(SESSION)
  await $.command.run(workout('export'))
  await $.command.run(workout('erase'))
  await $.command.run(workout('erase'))
  expect(JSON.stringify(await $.command.run(workout('status')))).not.toMatch(/4 total|Streak/)
  expect(w.files.has(`${HOME}/backup.json`)).toBe(true)
  await $.command.run(workout('restore'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  // Asked first: the confirm is up, nothing restored yet.
  expect(await ui.find({ key: 'restore' })).toBeDefined()
  await ui.press({ key: 'restore' })
  await ui.unmount()
  await $.command.run(workout(''))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...STATUS })
  expect(drawnRows(await pane.drawn()).some(row => row.includes('4 total'))).toBe(true)
  await pane.unmount()
})

test('erase asks first, removes progress and history; the plan file and /config settings stay', OPTIONS, async ($, on) => {
  const configWrites: string[] = []
  on('config.set', ($, e) => {
    configWrites.push(e.key)
    return { value: e.value }
  })
  const store = ownStore(on, { history: [pushUps(10, TODAY)], totalDoneSets: 4, progress: { ...START, done: 1 } })
  const { w } = world(on, TINY, 'own-store')
  await $.session.start(SESSION)
  const planBefore = w.file.text
  await $.command.run(workout('erase'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'erase' })).toBeDefined()
  // Asked first: nothing gone until it is confirmed.
  expect(store.get('totalDoneSets')).toBe(4)
  await ui.press({ key: 'erase' })
  await ui.unmount()
  expect([store.get('progress'), store.get('history'), store.get('totalDoneSets')]).toEqual([undefined, undefined, undefined])
  expect(w.file.text).toBe(planBefore)
  expect(w.writes.filter(x => x.path === PLAN_PATH)).toEqual([])
  expect(configWrites).toEqual([])
})

// ---------------------------------------------------------------------------------------------------------
// FAQ: "Does it send my data anywhere?"

type Sent = { url: string; body: string }
function network(on: On) {
  const sent: Sent[] = []
  on('http.fetch', ($, e) => {
    sent.push({ url: e.url, body: e.init?.body ?? '' })
    return { value: { status: 204, ok: true, headers: {}, text: '' } }
  })
  return sent
}

test('/workout plan sends only the description, to Claude Haiku through Claude Code', OPTIONS, async ($, on) => {
  const sent = network(on)
  const asked: { model: string; prompt: string }[] = []
  on('model.complete', ($, e) => {
    asked.push({ model: e.model, prompt: e.prompt })
    return { value: { isAnswered: true, text: '{"name": "S", "schedule": {"days": ["mon"]}, "workouts": [{"name": "A", "exercises": [{"name": "Squats", "reps": "5 reps", "sets": 5}]}]}', usage: { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } } }
  })
  world(on, TINY, { history: [pushUps(10, TODAY)] })
  await $.session.start(SESSION)
  await $.command.run(workout('plan 5x5 squats on Mondays'))
  expect(asked).toEqual([{ model: 'claude-haiku-4-5-20251001', prompt: '5x5 squats on Mondays' }])
  expect(sent).toEqual([])
})

test('/workout feedback sends what you wrote to idlereps.app', OPTIONS, async ($, on) => {
  const sent = network(on)
  world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('feedback love the high fives'))
  expect(sent.map(s => s.url)).toEqual([FEEDBACK_URL])
  expect(FEEDBACK_URL.startsWith('https://idlereps.app/')).toBe(true)
  expect(JSON.parse(sent[0]!.body).text).toBe('love the high fives')
})

async function finishTiny($: Engine) {
  for (let i = 0; i < 2; i += 1) {
    await $.command.run(workout('now'))
    await $.command.run(workout('done'))
  }
  await $.command.run(workout('good'))
}
const completed = (n: number): HistoryEntry[] => Array.from({ length: n }, (_, i) => ({ kind: 'workout-complete', t: NOON, d: TODAY - 2 * (i + 1), w: 0 }))

for (const [id, sends] of [['love', true], ['fine', true], ['notforme', true], ['tellmore', false]] as const) {
  test(`the check-in after the third workout: answer ${id} ${sends ? 'sends it' : 'sends nothing'}`, OPTIONS, async ($, on) => {
    const sent = network(on)
    world(on, TINY, { history: completed(2) })
    await $.session.start(SESSION)
    await finishTiny($)
    await $.command.run(workout(id))
    await $.command.run(workout('status'))
    expect(sent.length).toBe(sends ? 1 : 0)
  })
}

test('the check-in comes after the third workout, not the second', OPTIONS, async ($, on) => {
  network(on)
  world(on, TINY, { history: completed(1) })
  await $.session.start(SESSION)
  await finishTiny($)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'love' })).toBeUndefined()
  await ui.unmount()
})

test('usage counts aren’t sent at all, even turned on; normal use makes no other network call', { options: { ...OPTIONS.options, telemetry: true } }, async ($, on) => {
  const sent = network(on)
  const { clock } = world(on, QUICK)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'run the tests', turnId: 't1' })
  await $.tool.call({ tool: 'Bash', command: 'npm test', description: 'run' } as never)
  await clock.advance(60_000)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  await $.command.run(workout('later'))
  await $.turn.complete({ turnId: 't1', answer: '', reason: 'answer', durationMs: 372_000, isAborted: false } as never)
  for (const args of ['', 'status', 'moves', 'flex', 'export', 'share', 'pause', 'resume', 'no', 'swolomon']) await $.command.run(workout(args))
  await clock.advance(3 * 60 * 60_000)
  expect(sent).toEqual([])
})

// ---------------------------------------------------------------------------------------------------------
// FAQ: "Where does it run?" and "How do I press the buttons?"

test('VS Code: sets open in their own IdleReps panel', OPTIONS, async ($, on) => {
  const { w } = world(on, TINY, {}, { surfaces: ['vscode'] })
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  expect(w.opened).toContain('workout-band')
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'vscode', component: 'Pane', requestId: 'workout-band', props: { ...STATUS.props } })
  expect(await pane.find({ key: 'done' })).toBeDefined()
  await pane.unmount()
})

test('the desktop app: buttons click, and Swolomon is a picture', OPTIONS, async ($, on) => {
  world(on, TINY, {}, { surfaces: ['desktop'] })
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'desktop', ...BAND })
  expect(await ui.find({ type: 'Svg' })).toBeDefined()
  await ui.press({ key: 'done' })
  await ui.unmount()
  expect(JSON.stringify(await $.command.run(workout('status')))).toMatch(/set 2 of 2/)
})

test('the terminal: with the prompt empty, the button’s number presses it', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  const done = await ui.find({ key: 'done' })
  expect([done?.props.hotkey, done?.props.label]).toEqual(['1', 'Done'])
  await ui.unmount()
})

// ---------------------------------------------------------------------------------------------------------
// FAQ: "How do I turn it off?" and "Will it interrupt me?"

test('/workout pause stops every set and reminder until /workout resume', OPTIONS, async ($, on) => {
  const { clock, w } = world(on, TINY, { schemaVersion: 1, seen: { 'whats-new:1.0.0': { at: 1, n: 1 }, 'day-toast': { at: NOON, n: 1 } } })
  await $.session.start(SESSION)
  await $.command.run(workout('pause'))
  w.toasts.length = 0
  // Idle: no reminder for hours.
  await clock.advance(3 * 60 * 60_000)
  expect(w.toasts).toEqual([])
  // A long turn: no set.
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.tool.call({ tool: 'Bash', command: 'npm test', description: 'run' } as never)
  await clock.advance(60 * 60_000)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'start' })).toBeUndefined()
  await $.turn.complete({ turnId: 't1', answer: '', reason: 'answer', durationMs: 60_000, isAborted: false } as never)
  await $.command.run(workout('resume'))
  await $.turn.start({ text: 'go', turnId: 't2' })
  await $.tool.call({ tool: 'Bash', command: 'npm test', description: 'run' } as never)
  await clock.advance(60_000)
  expect(await ui.find({ key: 'start' })).toBeDefined()
  await ui.unmount()
})

test('quiet hours keep it silent: no set, no reminder', { options: { ...OPTIONS.options, quietHours: '22-07' } }, async ($, on) => {
  const { clock, w } = world(on, TINY, { schemaVersion: 1, seen: { 'whats-new:1.0.0': { at: 1, n: 1 }, 'day-toast': { at: NOON, n: 1 } } }, { now: new Date(2026, 9, 2, 22, 30).getTime() })
  await $.session.start(SESSION)
  await clock.advance(2 * 60 * 60_000)
  expect(w.toasts).toEqual([])
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.tool.call({ tool: 'Bash', command: 'npm test', description: 'run' } as never)
  await clock.advance(30 * 60_000)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'start' })).toBeUndefined()
  await ui.unmount()
})

// "Collect Swolomon's moves. He starts with three." (idlereps.app #moves): the tiles the page shows, in the plugin.
test('site: /workout moves shows the collection, three of his moves in hand on a fresh install', OPTIONS, async ($, on) => {
  const { w } = world(on, TINY, { moves: [], totalDoneSets: 0 })
  await $.session.start(SESSION)
  await $.command.run(workout('moves'))
  expect(w.opened).toContain('workout-moves')
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...COLLECTION })
  const titled = await Promise.all([...STARTER_MOVES, ...UNLOCK_ORDER].map(async id => textOf(((await pane.find({ key: `t-${id}` })) as { children?: never[] } | undefined)?.children?.[1] ?? '')))
  expect(titled.filter(t => t !== '' && t !== '???').length).toBe(3)
  await pane.unmount()
})
