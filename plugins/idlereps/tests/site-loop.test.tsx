import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

import type { HistoryEntry } from '../types'
import { line } from '../hooks/copy'
import { misreadOf } from '../hooks/misreads'
import { START } from '../hooks/plan'
import { generateProgram, STARTER_ANSWERS } from '../hooks/programs'
import { BAND, drawnRows, editPrompt, NOON, OPTIONS, ownStore, SESSION, STATUS, tallyOf, TODAY, typing, workout, world } from './world'

/**
 * idlereps.app, its live demo and its FAQ, checked against the plugin itself: one test per claim the site
 * makes about the loop (a long task, the ask, the warm-up, the set, what pressing does, the turn's end).
 */

const H = 3_600_000
const MIN = 60_000
/** What Quick start writes (office, no gear): Mon, Wed, Fri. Today, Friday 2026-10-02, is a training day. */
const STARTER = generateProgram(STARTER_ANSWERS)
const WARM = { options: { ...OPTIONS.options, warmUp: true } }
const bash = (command: string) => ({ tool: 'Bash', command, description: 'run' }) as never
const done = (turnId = 't1') => ({ turnId, answer: '', reason: 'answer', durationMs: 372_000, isAborted: false }) as never

const band = ($: Engine) => $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })

async function rowsOf($: Engine) {
  const ui = await band($)
  const rows = drawnRows(await ui.drawn())
  await ui.unmount()
  return rows
}

async function keysOf($: Engine) {
  const ui = await band($)
  const buttons = await ui.findAll({ type: 'Button' })
  await ui.unmount()
  return buttons.map(b => String(b.key))
}

async function turnEnd($: Engine, durationMs = 372_000) {
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', component: 'TurnDuration', props: { word: 'Baked', durationMs } })
  const rows = drawnRows(await ui.drawn())
  await ui.unmount()
  return rows
}

async function spinner($: Engine) {
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', component: 'Spinner', props: { word: 'Sauteing', message: null, suffix: '…', mode: 'tool-use' } })
  const text = drawnRows(await ui.drawn()).join('')
  await ui.unmount()
  return text
}

/** A Bash call that runs until the test lets it go. */
function slowBash(on: On) {
  let release = () => {}
  on('tool.call', { tool: 'Bash' }, async () => {
    await new Promise<void>(resolve => {
      release = resolve
    })
    return { result: { stdout: '', stderr: '', interrupted: false } } as never
  })
  return { release: () => release() }
}

/** A turn where the agent starts `call` 2 s in; the ask is due 5 s after it. */
async function longTask($: Engine, clock: { advance: (ms: number) => Promise<void> }, call: never) {
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(2_000)
  await $.tool.call(call)
}

// ---------------------------------------------------------------------------------------------------------
// 1. "When your agent starts something long, like a test suite or a build, it offers you the next set."

for (const [what, call] of [
  ['a test suite', bash('npm test')],
  ['a build', bash('cargo build --release')],
  ['a helper agent', { tool: 'Agent', description: 'Review the payment changes', prompt: 'review', subagent_type: 'general-purpose' } as never],
  ['docker compose up', bash('docker compose up')],
] as const) {
  test(`site: ${what} brings the offer of the next set about 5 s later, unasked`, OPTIONS, async ($, on) => {
    const { clock } = world(on, STARTER)
    await longTask($, clock, call)
    const ui = await band($)
    await clock.advance(4_000)
    expect(await ui.find({ key: 'start' })).toBeUndefined()
    await clock.advance(1_000)
    expect(await ui.find({ key: 'start' })).toBeDefined()
    await ui.unmount()
  })
}

// ---------------------------------------------------------------------------------------------------------
// 2. The demo's ask band.

test('site: the ask for npm test: his timed line, the first set in words, the safety row, four buttons', OPTIONS, async ($, on) => {
  // Before the first Start: the safety note not yet seen.
  const { clock } = world(on, STARTER, { seen: { safety: undefined } })
  await longTask($, clock, bash('npm test'))
  await clock.advance(5_000)
  const rows = await rowsOf($)
  expect(rows).toContain(line('reason-long-run-timed', { day: TODAY, wait: 'about a minute' }))
  expect(rows).toContain('First up: Desk push-ups, 10 reps · about 45 s.')
  expect(rows).toContain(line('safety-short', { day: TODAY }))
  expect(rows.at(-1)).toBe('1: Start   2: Later   3: Not today   4: Just half')
})

test('site: the ask after a helper agent opens with the helpers line', OPTIONS, async ($, on) => {
  const { clock } = world(on, STARTER)
  await longTask($, clock, { tool: 'Agent', description: 'Review the payment changes', prompt: 'review', subagent_type: 'general-purpose' } as never)
  await clock.advance(5_000)
  expect(await rowsOf($)).toContain(line('reason-helpers', { day: TODAY }))
})

test('site: the safety row goes once you have started a set', OPTIONS, async ($, on) => {
  const { clock } = world(on, STARTER, { seen: { safety: undefined } })
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  // Monday, the next training day: the first ask of the day.
  await clock.advance(3 * 24 * H)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(2_000)
  await $.tool.call(bash('npm test'))
  await clock.advance(5_000)
  const rows = await rowsOf($)
  expect(rows.some(row => row.startsWith('First up:'))).toBe(true)
  expect(rows).not.toContain(line('safety-short', { day: TODAY }))
})

// ---------------------------------------------------------------------------------------------------------
// 3. The spinner's word is his misreading of the command.

test('site: while npm test runs, the spinner says his misreading of it', OPTIONS, async ($, on) => {
  const slow = slowBash(on)
  world(on, STARTER)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  const running = $.tool.call(bash('npm test'))
  await Promise.resolve()
  expect(await spinner($)).toBe(`${misreadOf({ tool: 'Bash', command: 'npm test' })?.verb}…`)
  slow.release()
  await running
})

// ---------------------------------------------------------------------------------------------------------
// 4. Start: the one-minute warm-up, then the set band.

test('site: Start brings the one-minute warm-up (1 Done, 2 Skip) before a workout’s first set', WARM, async ($, on) => {
  const { clock } = world(on, STARTER)
  await longTask($, clock, bash('npm test'))
  await clock.advance(5_000)
  const ui = await band($)
  await ui.press({ key: 'start' })
  const rows = drawnRows(await ui.drawn())
  expect(rows).toContain(line('warmup', { day: TODAY }))
  expect(line('warmup', { day: TODAY })).toMatch(/minute|60 s/i)
  expect(rows.at(-1)).toBe('1: Done   2: Skip')
  await ui.unmount()
})

test('site: the set band: lead, workout, dots and set 1 of 6; his line; the set; the note; the hint; four buttons; his move', WARM, async ($, on) => {
  const { clock } = world(on, STARTER)
  await longTask($, clock, bash('npm test'))
  await clock.advance(5_000)
  const ui = await band($)
  await ui.press({ key: 'start' })
  await ui.press({ key: 'warmed' })
  const rows = drawnRows(await ui.drawn())
  expect(rows).toContain('While your agent works · Week 1 · Full body A   ●○○○○○  set 1 of 6')
  expect(rows).toContain(line('reason-long-run', { day: TODAY }))
  expect(rows).toContain('Desk push-ups: 10 reps  (1/2)')
  expect(rows).toContain('↳ hands on the desk edge, body straight')
  expect(rows).toContain(line('hint', { day: TODAY }))
  expect(rows.at(-1)).toBe('1: Done   2: Edit   3: Skip   4: Later')
  // He demonstrates the move: the portrait plays it (a Raster), not the name tag.
  expect(await ui.find({ type: 'Raster' })).toBeDefined()
  await ui.unmount()
})

// ---------------------------------------------------------------------------------------------------------
// 5. Done, the celebration, Undo.

test('site: Done logs it: the logged line, today’s count, the first-ever line, a celebration on 1, Undo on 0', OPTIONS, async ($, on) => {
  const { clock } = world(on, STARTER)
  await longTask($, clock, bash('npm test'))
  await clock.advance(5_000)
  const ui = await band($)
  await ui.press({ key: 'start' })
  await ui.press({ key: 'done' })
  const rows = drawnRows(await ui.drawn())
  // The logged line carries its buttons on the same row.
  expect(rows).toContainEqual(expect.stringMatching(/^✓ Logged Desk push-ups 10 reps · 1 of 6 today {3}1: [A-Z][\w !-]+ {3}0: Undo$/))
  expect(rows).toContain(line('first-logged', { day: TODAY }))
  await ui.unmount()
})

test('site: Undo brings the set back with a during-set line, not the reason line', OPTIONS, async ($, on) => {
  const { clock } = world(on, STARTER)
  await longTask($, clock, bash('npm test'))
  await clock.advance(5_000)
  const ui = await band($)
  await ui.press({ key: 'start' })
  await ui.press({ key: 'done' })
  await ui.press({ key: 'undo' })
  const rows = drawnRows(await ui.drawn())
  expect(rows).toContain('Desk push-ups: 10 reps  (1/2)')
  expect(rows).not.toContain(line('reason-long-run', { day: TODAY }))
  const during = ['set-cheer', 'set-banter', 'form-push-up'].flatMap(id => [0, 1, 2, 3, 4, 5, 6].map(d => line(id as never, { day: TODAY + d })))
  expect(rows.some(row => during.includes(row))).toBe(true)
  await ui.unmount()
})

// ---------------------------------------------------------------------------------------------------------
// 6. Edit.

test('site: Edit: 1 Save, 2 < reps, 3 reps >; a press steps one rep; Save logs that count', OPTIONS, async ($, on) => {
  world(on, STARTER)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  const ui = await band($)
  await ui.press({ key: 'edit' })
  expect(drawnRows(await ui.drawn())).toContain('1: Save   2: < reps   3: reps >')
  await ui.press({ key: 'more' })
  expect(drawnRows(await ui.drawn()).join('\n')).toMatch(/\b11 reps\b/)
  await ui.press({ key: 'save' })
  expect(drawnRows(await ui.drawn())).toContainEqual(expect.stringMatching(/^✓ Logged Desk push-ups 11 reps · 1 of 6 today /))
  await ui.unmount()
})

// ---------------------------------------------------------------------------------------------------------
// 7. Skip.

test('site: Skip: “✓ Skipped Desk push-ups · 1 of 6 today”, with 1 High five and 0 Undo', OPTIONS, async ($, on) => {
  world(on, STARTER)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  const ui = await band($)
  await ui.press({ key: 'skip' })
  const rows = drawnRows(await ui.drawn())
  expect(rows).toContain('✓ Skipped Desk push-ups · 1 of 6 today   1: High five   0: Undo')
  await ui.unmount()
})

// ---------------------------------------------------------------------------------------------------------
// 8. The gap: "the next one waits at least 15 minutes after the last" (and so, one set a turn).

test('site: after a set, no next set inside 15 minutes, even with the agent still working; then the next one', OPTIONS, async ($, on) => {
  const { clock } = world(on, STARTER)
  await longTask($, clock, bash('npm test'))
  await clock.advance(5_000)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  // The logged line goes by itself; the turn runs on.
  await clock.advance(14 * MIN)
  expect(await keysOf($)).not.toContain('done')
  await clock.advance(2 * MIN)
  expect(await keysOf($)).toContain('done')
})

// ---------------------------------------------------------------------------------------------------------
// 9. The turn's end.

test('site: the turn ends “· 1 set while you waited 💪”, and Swolomon on the passing tests', OPTIONS, async ($, on) => {
  const { clock } = world(on, STARTER)
  await longTask($, clock, bash('npm test'))
  await clock.advance(5_000)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  await $.turn.complete(done())
  const rows = await turnEnd($)
  expect(rows[0]).toBe(`Baked for 372s · ${line('turn-sets', { day: TODAY, sets: '1 set' })} 💪`)
  expect(line('turn-sets', { day: TODAY, sets: '1 set' })).toBe('1 set while you waited')
  expect(rows[1]).toBe(`Swolomon: ${line('react-tests-pass', { day: TODAY })}`)
})

test('site: a set done through a run with no outcome: the turn ends with his reading of it', OPTIONS, async ($, on) => {
  const { clock } = world(on, STARTER)
  await longTask($, clock, bash('cargo build --release'))
  await clock.advance(5_000)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  await $.turn.complete(done())
  const rows = await turnEnd($)
  expect(rows[1]).toMatch(/^Swolomon: Your agent built some muscle/)
})

// ---------------------------------------------------------------------------------------------------------
// 10. Later.

test('site: Later: the band goes and nothing is said; it asks again after the gap', OPTIONS, async ($, on) => {
  const { clock, w } = world(on, STARTER)
  await longTask($, clock, bash('npm test'))
  await clock.advance(5_000)
  const ui = await band($)
  const toasts = w.toasts.length
  await ui.press({ key: 'later' })
  expect(await ui.find({ key: 'start' })).toBeUndefined()
  expect(await ui.find({ key: 'later' })).toBeUndefined()
  expect(w.toasts.length).toBe(toasts)
  await clock.advance(14 * MIN)
  expect(await ui.find({ key: 'start' })).toBeUndefined()
  await clock.advance(2 * MIN)
  expect(await ui.find({ key: 'start' })).toBeDefined()
  await ui.unmount()
})

test('site: three Laters in a row: twice the wait for the rest of the day', OPTIONS, async ($, on) => {
  world(on, STARTER)
  await $.session.start(SESSION)
  expect((await $.command.run(workout('later'))).text).toBe(line('reply-hidden', { day: TODAY, n: 15 }))
  expect((await $.command.run(workout('later'))).text).toBe(line('reply-hidden', { day: TODAY, n: 15 }))
  expect((await $.command.run(workout('later'))).text).toBe(line('reply-hidden', { day: TODAY, n: 30 }))
  expect((await $.command.run(workout('later'))).text).toBe(line('reply-hidden', { day: TODAY, n: 30 }))
})

// ---------------------------------------------------------------------------------------------------------
// 11. Not today.

test('site: Not today: a toast naming the next training day; no more sets today; the footer count goes', OPTIONS, async ($, on) => {
  const { clock, w } = world(on, STARTER)
  await longTask($, clock, bash('npm test'))
  await clock.advance(5_000)
  expect(await tallyOf($)).toBe('💪 0/6')
  const ui = await band($)
  await ui.press({ key: 'no' })
  expect(w.toasts).toContain(line('not-today', { day: TODAY, nextDay: 'Monday' }))
  expect(await tallyOf($)).toBeUndefined()
  await $.turn.complete(done())
  await $.turn.start({ text: 'again', turnId: 't2' })
  await $.tool.call(bash('npm test'))
  await clock.advance(2 * H)
  expect(await ui.find({ key: 'start' })).toBeUndefined()
  expect(await ui.find({ key: 'done' })).toBeUndefined()
  await ui.unmount()
})

// ---------------------------------------------------------------------------------------------------------
// 12. Just half.

test('site: Just half: half the sets (3 of 6), and it counts for the week and the streak', OPTIONS, async ($, on) => {
  const store = ownStore(on)
  const { clock } = world(on, STARTER, 'own-store')
  await longTask($, clock, bash('npm test'))
  await clock.advance(5_000)
  const ui = await band($)
  await ui.press({ key: 'half' })
  expect(drawnRows(await ui.drawn()).some(row => row.endsWith('set 1 of 3'))).toBe(true)
  expect(await tallyOf($)).toBe('💪 0/3')
  await ui.unmount()
  for (let i = 0; i < 3; i += 1) {
    await $.command.run(workout('now'))
    await $.command.run(workout('done'))
  }
  const history = store.get('history') as HistoryEntry[]
  expect(history.filter(e => e.kind === 'set' && e.result === 'done').length).toBe(3)
  expect(history.some(e => e.kind === 'workout-complete' && e.d === TODAY)).toBe(true)
  await $.command.run(workout(''))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...STATUS })
  const rows = drawnRows(await pane.drawn())
  expect(rows.some(row => /\bFri ●/.test(row))).toBe(true)
  expect(rows.some(row => row.startsWith('Streak 1'))).toBe(true)
  await pane.unmount()
})

// ---------------------------------------------------------------------------------------------------------
// 13. Never while you type.

test('site: a set never pops up while you type; it waits for the prompt to empty', OPTIONS, async ($, on) => {
  const { clock, w } = world(on, STARTER)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  w.prompt.text = 'half a thought'
  await $.tool.call(bash('npm test'))
  await clock.advance(30_000)
  const ui = await band($)
  expect(await ui.find({ key: 'start' })).toBeUndefined()
  await editPrompt($, typing('half a thought', ''))
  await clock.settle()
  expect(await ui.find({ key: 'start' })).toBeDefined()
  await ui.unmount()
})

// ---------------------------------------------------------------------------------------------------------
// 14. "It never changes or blocks a tool call."

test('site: a long command runs exactly as the agent called it, and its result comes back untouched', OPTIONS, async ($, on) => {
  let ran: unknown = null
  on('tool.call', { tool: 'Bash' }, ($, e) => {
    ran = (e as unknown as { command: string }).command
    return { result: { stdout: 'all 712 pass', stderr: '', interrupted: false } } as never
  })
  const { clock } = world(on, STARTER)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  const result = await $.tool.call(bash('npm test'))
  expect(ran).toBe('npm test')
  expect(result).toMatchObject({ result: { stdout: 'all 712 pass' } })
  expect(JSON.stringify(result)).not.toMatch(/deny/)
  // And with a set on screen, the agent's calls still run.
  await clock.advance(5_000)
  await $.command.run(workout('start'))
  expect(await $.tool.call(bash('npm test'))).toMatchObject({ result: { stdout: 'all 712 pass' } })
})

// ---------------------------------------------------------------------------------------------------------
// 15. Quiet hours, pause.

test('site: none in quiet hours', { options: { ...OPTIONS.options, quietHours: '22-07' } }, async ($, on) => {
  const { clock } = world(on, STARTER, {}, { now: new Date(2026, 9, 2, 23, 0).getTime() })
  await longTask($, clock, bash('npm test'))
  await clock.advance(10 * MIN)
  expect(await keysOf($)).toEqual([])
})

test('site: /workout pause stops every set until /workout resume', OPTIONS, async ($, on) => {
  const { clock } = world(on, STARTER)
  await $.session.start(SESSION)
  await $.command.run(workout('pause'))
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.tool.call(bash('npm test'))
  await clock.advance(H)
  expect(await keysOf($)).not.toContain('start')
  await $.turn.complete(done())
  await $.command.run(workout('resume'))
  await $.turn.start({ text: 'again', turnId: 't2' })
  await clock.advance(30_000)
  expect(await keysOf($)).toContain('start')
})

// ---------------------------------------------------------------------------------------------------------
// 16. Rest days.

test('site: on a rest day, one optional stretch instead of sets', OPTIONS, async ($, on) => {
  // Saturday: Quick start trains Mon, Wed, Fri.
  const { clock } = world(on, STARTER, {}, { now: NOON + 24 * H })
  await longTask($, clock, bash('npm test'))
  await clock.advance(MIN)
  const keys = await keysOf($)
  expect(keys).toEqual(['stretched', 'notnow'])
  expect(keys).not.toContain('start')
})

// ---------------------------------------------------------------------------------------------------------
// 17. The stand-up band.

/** Today: the agent worked 2.5 hours this morning, nothing moved. */
const SAT = { workIntervals: { [String(TODAY)]: [[NOON - 3 * H, NOON - H / 2]] } }

test('site: two hours of agent work and nothing moved: stand up, 1 Stood up / 2 Later; Later just closes it, once a day', OPTIONS, async ($, on) => {
  const { clock, w } = world(on, STARTER, SAT)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(61_000)
  const ui = await band($)
  expect((await ui.findAll({ type: 'Button' })).map(b => String(b.key))).toEqual(['stood', 'later'])
  const rows = drawnRows(await ui.drawn())
  expect(rows).toContain(line('still-detail', { day: TODAY }))
  expect(rows.at(-1)).toBe('1: Stood up   2: Later')
  const toasts = w.toasts.length
  await ui.press({ key: 'later' })
  expect(await ui.find({ key: 'stood' })).toBeUndefined()
  expect(w.toasts.length).toBe(toasts)
  await $.turn.complete(done())
  await $.turn.start({ text: 'again', turnId: 't2' })
  await clock.advance(30 * MIN)
  expect(await ui.find({ key: 'stood' })).toBeUndefined()
  await ui.unmount()
})

// ---------------------------------------------------------------------------------------------------------
// 18. Pressing the buttons.

test('site: every button carries its number as its hotkey, drawn as “N: Label”', OPTIONS, async ($, on) => {
  world(on, STARTER)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  const ui = await band($)
  const buttons = await ui.findAll({ type: 'Button' })
  expect(buttons.map(b => [String(b.key), b.props.hotkey])).toEqual([
    ['done', '1'],
    ['edit', '2'],
    ['skip', '3'],
    ['later', '4'],
  ])
  await ui.unmount()
})

test('site: /workout done and the other button commands work', OPTIONS, async ($, on) => {
  const store = ownStore(on)
  world(on, STARTER, 'own-store')
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  expect(store.get('progress')).toMatchObject({ ...START, done: 1 })
  await $.command.run(workout('undo'))
  expect(store.get('progress')).toMatchObject({ done: 0 })
  await $.command.run(workout('skip'))
  expect(store.get('progress')).toMatchObject({ done: 1 })
  await $.command.run(workout('now'))
  await $.command.run(workout('later'))
  expect(await keysOf($)).not.toContain('done')
})
