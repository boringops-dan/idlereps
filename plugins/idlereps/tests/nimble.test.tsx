import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { ACTIONS } from '../hooks/actions'
import { line } from '../hooks/copy'
import { START } from '../hooks/plan'
import { drawnRows, mountAt, OPTIONS, ownStore, SESSION, TINY, TODAY, turnEnded, workout, world } from './world'

/**
 * Nimble sets (owner, 2026-10-07: "we're for working when the agent works"): Swolomon has the stage while
 * the agent works, steps back when it is done or the person types, and the set waits for the next turn.
 */

const mountBand = ($: Engine, isWorking: boolean) => mountAt($, undefined, isWorking)

/** The band as drawn: its kind by its buttons, and its exercise row. */
async function bandOf($: Engine) {
  const ui = await mountBand($, true)
  const rows = drawnRows(await ui.drawn())
  const keys = (await ui.findAll({ type: 'Button' })).map(b => String(b.key))
  await ui.unmount()
  return { rows, keys, exercise: rows.find(row => /^\S.*: \d/.test(row) && row.includes('(')) }
}

test('while the agent works the set has his portrait; once it is done, two rows and no portrait; working again, back', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  let ui = await mountBand($, true)
  expect(await ui.find({ key: 'swolomon' })).toBeDefined()
  await ui.unmount()
  ui = await mountBand($, false)
  expect(await ui.find({ type: 'Raster' })).toBeUndefined()
  const rows = drawnRows(await ui.drawn())
  expect(rows.length).toBe(2)
  expect(rows[0]).toMatch(/^Push-ups: /)
  expect(rows[1]).toMatch(/^1: /)
  await ui.unmount()
  ui = await mountBand($, true)
  expect(await ui.find({ key: 'swolomon' })).toBeDefined()
  await ui.unmount()
})

test('a celebration after the agent is done keeps his portrait: only the workout bands go compact', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  const ui = await mountBand($, false)
  expect(await ui.find({ key: 'swolomon' })).toBeDefined()
  await ui.unmount()
})

// A prompt puts the set away; it waits for the next turn (owner, 2026-10-07: "nimble and resumable").

test('an unanswered set, then a prompt: put away; on the next long turn the same set is back, no new ask', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  const before = await bandOf($)
  expect(before.keys).toContain('all')
  await $.turn.start({ text: 'fix the build', turnId: 't1' })
  expect((await bandOf($)).keys).toEqual([])
  await $.turn.complete(turnEnded('t1'))
  await $.turn.start({ text: 'and the tests', turnId: 't2' })
  await clock.advance(31_000)
  const after = await bandOf($)
  expect(after.keys).toEqual(before.keys)
  expect(after.exercise).toBe(before.exercise)
})

test('/workout brings a set a prompt put away straight back', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  const before = await bandOf($)
  await $.turn.start({ text: 'fix the build', turnId: 't1' })
  await $.turn.complete(turnEnded('t1'))
  await $.command.run(workout(''))
  expect((await bandOf($)).exercise).toBe(before.exercise)
})

test('an ask a prompt put away comes back as the ask, not a set', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(31_000)
  const ask = await bandOf($)
  expect(ask.keys).toContain('start')
  await $.turn.complete(turnEnded('t1'))
  await $.turn.start({ text: 'again', turnId: 't2' })
  expect((await bandOf($)).keys).toEqual([])
  await clock.advance(31_000)
  expect((await bandOf($)).keys).toEqual(ask.keys)
})

test('a put-away set that is no longer the one due is not brought back: the due set is', OPTIONS, async ($, on) => {
  const store = ownStore(on, { startedOn: TODAY })
  const { clock } = world(on, TINY, 'own-store')
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.turn.complete(turnEnded('t1'))
  // Another session logged it meanwhile: the set moved on.
  store.set('progress', { ...START, ...((store.get('progress') as object | undefined) ?? {}), done: 1 })
  await $.turn.start({ text: 'next', turnId: 't2' })
  await clock.advance(31_000)
  expect((await bandOf($)).exercise ?? '').toMatch(/\(2\//)
})

test('a set put away, then Not today: /workout does not bring it back', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.turn.start({ text: 'fix the build', turnId: 't1' })
  await $.turn.complete(turnEnded('t1'))
  await $.command.run(workout('no'))
  await $.command.run(workout(''))
  expect((await bandOf($)).exercise).toBeUndefined()
})

test('a set put away, then pause: the next long turn does not bring it back', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.turn.start({ text: 'fix the build', turnId: 't1' })
  await $.turn.complete(turnEnded('t1'))
  await $.command.run(workout('pause'))
  await $.turn.start({ text: 'and the tests', turnId: 't2' })
  await clock.advance(20 * 60_000)
  expect((await bandOf($)).exercise).toBeUndefined()
})

test('Start swaps the hint for the one naming how to answer', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY, { startedOn: TODAY })
  const ui = await waitingSet($, clock)
  expect(drawnRows(await ui.drawn())).toContain(line('hint-start', { day: TODAY }))
  await ui.press({ key: 'start' })
  const rows = drawnRows(await ui.drawn())
  expect(rows).toContain(line('hint', { day: TODAY }))
  expect(rows).not.toContain(line('hint-start', { day: TODAY }))
  await ui.unmount()
})

test('/workout done with the set put away: it is answered, logged as if it showed', OPTIONS, async ($, on) => {
  const store = ownStore(on, { startedOn: TODAY })
  world(on, TINY, 'own-store')
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.turn.complete(turnEnded('t1'))
  const reply = (await $.command.run(workout('done 8'))).text ?? ''
  expect(reply).not.toContain(line('reply-no-set', { day: TODAY }))
  expect((store.get('progress') as { done: number }).done).toBe(1)
})

// Start, then how it went (owner, 2026-10-07: "why not START and then they can say how many they did?").

const HOLD_PLAN = { ...TINY, workouts: [{ name: 'H', exercises: [{ name: 'Plank', reps: '40 s', sets: 2 }] }] }

/** A set waiting for Start: today's workout already agreed to, its next set cued on a long turn. */
async function waitingSet($: Engine, clock: { advance: (ms: number) => Promise<void> }) {
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(31_000)
  return mountBand($, true)
}

const historyOf = (store: Map<string, unknown>) => (store.get('history') as { kind: string; result?: string; count?: number }[] | undefined) ?? []

test('a set waits for Start (1 Start, 2 Later, 0 Not today); Start asks how it went: 1 All 10, 2 Fewer, 3 Couldn’t do it', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY, { startedOn: TODAY })
  const ui = await waitingSet($, clock)
  expect(drawnRows(await ui.drawn()).at(-1)).toBe('1: Start   2: Later   0: Not today')
  await ui.press({ key: 'start' })
  expect(drawnRows(await ui.drawn()).at(-1)).toBe("1: All 10   2: Fewer   3: Couldn't do it")
  await ui.unmount()
})

test('All logs the set as prescribed, as Done did', OPTIONS, async ($, on) => {
  const store = ownStore(on, { startedOn: TODAY })
  const { clock } = world(on, TINY, 'own-store')
  const ui = await waitingSet($, clock)
  await ui.press({ key: 'start' })
  await ui.press({ key: 'all' })
  expect(historyOf(store).filter(e => e.kind === 'set').at(-1)).toMatchObject({ result: 'done', count: 10 })
  await ui.unmount()
})

test('Fewer opens the steppers at the target; a step down and Save logs the fewer', OPTIONS, async ($, on) => {
  const store = ownStore(on, { startedOn: TODAY })
  const { clock } = world(on, TINY, 'own-store')
  const ui = await waitingSet($, clock)
  await ui.press({ key: 'start' })
  await ui.press({ key: 'fewer' })
  expect(await ui.find({ key: 'save' })).toBeDefined()
  await ui.press({ key: 'fewer' })
  await ui.press({ key: 'save' })
  expect(historyOf(store).filter(e => e.kind === 'set').at(-1)).toMatchObject({ result: 'done', count: 9 })
  await ui.unmount()
})

test('Couldn’t do it logs the set as skipped', OPTIONS, async ($, on) => {
  const store = ownStore(on, { startedOn: TODAY })
  const { clock } = world(on, TINY, 'own-store')
  const ui = await waitingSet($, clock)
  await ui.press({ key: 'start' })
  await ui.press({ key: 'couldnt' })
  expect(historyOf(store).filter(e => e.kind === 'set').at(-1)?.result).toBe('skip')
  await ui.unmount()
})

test('a timed set: Start runs its hold timer; at zero it asks how it went, All naming the seconds', OPTIONS, async ($, on) => {
  const { clock } = world(on, HOLD_PLAN, { startedOn: TODAY })
  const ui = await waitingSet($, clock)
  await ui.press({ key: 'start' })
  expect(drawnRows(await ui.drawn()).some(row => row.startsWith('Plank: 0:40 left'))).toBe(true)
  await clock.advance(41_000)
  expect(drawnRows(await ui.drawn()).at(-1)).toBe("1: All 40 s   2: Fewer   3: Couldn't do it")
  await ui.unmount()
})

test('the ask’s Start lands on the first set already started: how it went, one press in', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(31_000)
  const ui = await mountBand($, true)
  await ui.press({ key: 'start' })
  expect(await ui.find({ key: 'all' })).toBeDefined()
  await ui.unmount()
})

test('the old commands answer a set before and after Start: done 8 before, edit after', OPTIONS, async ($, on) => {
  const store = ownStore(on, { startedOn: TODAY })
  const { clock } = world(on, TINY, 'own-store')
  const ui = await waitingSet($, clock)
  await $.command.run(workout('done 8'))
  expect(historyOf(store).filter(e => e.kind === 'set').at(-1)).toMatchObject({ result: 'done', count: 8 })
  await ui.unmount()
  await $.command.run(workout('now'))
  await $.command.run(workout('edit'))
  const edit = await mountBand($, true)
  expect(await edit.find({ key: 'save' })).toBeDefined()
  await edit.unmount()
})

test('/workout skip and /workout later answer a set waiting for Start', OPTIONS, async ($, on) => {
  const store = ownStore(on, { startedOn: TODAY })
  const { clock } = world(on, TINY, 'own-store')
  const ui = await waitingSet($, clock)
  await ui.unmount()
  await $.command.run(workout('later'))
  expect((await bandOf($)).keys).toEqual([])
  expect(historyOf(store).filter(e => e.kind === 'set')).toEqual([])
  await $.command.run(workout('now'))
  await $.command.run(workout('skip'))
  expect(historyOf(store).filter(e => e.kind === 'set').at(-1)?.result).toBe('skip')
})

test('0 is the way out on every band that has one', () => {
  // The ids that put a band away without doing what it asks.
  const WAY_OUT = new Set(['notnow', 'no', 'notoday', 'skipwarmup', 'gotit', 'nospot', 'enough', 'close', 'undo', 'back', 'skipday', 'pass'])
  const kinds = [...new Set(ACTIONS.map(a => a.kind))]
  const missing = kinds.filter(kind => {
    const own = ACTIONS.filter(a => a.kind === kind)
    // A band of one button (byoplan's Back) has no other choice to keep 1 for.
    return own.length > 1 && own.some(a => WAY_OUT.has(a.id)) && !own.some(a => a.hotkey === '0' && WAY_OUT.has(a.id))
  })
  expect(missing).toEqual([])
  // Still's only way out is its Later: on 0 too.
  expect(ACTIONS.find(a => a.kind === 'still' && a.id === 'later')?.hotkey).toBe('0')
})
