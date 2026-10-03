import { expect, test } from 'claude-code/testing'

import type { BandSpec, HistoryEntry, Plan, Seen } from '../types'
import { STORE_KEYS } from '../types/store-keys'
import { ACTIONS } from '../hooks/actions'
import { BAND_PRIORITY, LOGGED_MS, nextFromPending, offerToSlot } from '../hooks/bands'
import { due, mark, mondayOf } from '../hooks/ledger'
import { cueFor, dayNumberOf, START } from '../hooks/plan'
import { applyInverse, applyPatch, record, RECORD_KEYS } from '../hooks/record'
import type { RecordAction, RecordStore } from '../hooks/record'
import { gate } from '../hooks/schedule'
import { BAND, NOON, OPTIONS, SESSION, TINY, TODAY, editPrompt, liveClock, typing, WEIGHTED, workout, world } from './world'

/** The core mechanisms (plan §4.3, Task 22). */

const DAY = 86_400_000

test('the delivery gate, as one table', () => {
  const base = { paused: false, isQuietHours: false, promptHasText: false, soundAllowed: true }
  const rows: [Parameters<typeof gate>[0], Partial<typeof base>, ReturnType<typeof gate>][] = [
    [{ channel: 'band', cause: 'timer' }, {}, 'show'],
    [{ channel: 'band', cause: 'timer' }, { paused: true }, 'drop'],
    [{ channel: 'band', cause: 'timer' }, { isQuietHours: true }, 'drop'],
    [{ channel: 'band', cause: 'timer' }, { promptHasText: true }, 'defer'],
    [{ channel: 'band', cause: 'keypress' }, { paused: true, isQuietHours: true, promptHasText: true }, 'show'],
    [{ channel: 'band', cause: 'command' }, { paused: true, promptHasText: true }, 'show'],
    [{ channel: 'toast', cause: 'timer' }, {}, 'show'],
    [{ channel: 'toast', cause: 'timer' }, { paused: true }, 'drop'],
    [{ channel: 'toast', cause: 'timer' }, { isQuietHours: true }, 'drop'],
    [{ channel: 'toast', cause: 'timer' }, { promptHasText: true }, 'show'],
    [{ channel: 'toast', cause: 'keypress' }, { paused: true }, 'show'],
    [{ channel: 'sound', cause: 'timer' }, {}, 'show'],
    [{ channel: 'sound', cause: 'timer' }, { soundAllowed: false }, 'drop'],
    [{ channel: 'sound', cause: 'keypress' }, { soundAllowed: false }, 'drop'],
    [{ channel: 'sound', cause: 'timer' }, { paused: true }, 'drop'],
  ]
  for (const [msg, ctx, expected] of rows) expect([msg, ctx, gate(msg, { ...base, ...ctx })]).toEqual([msg, ctx, expected])
})

test('the once ledger at every scope boundary', () => {
  const at = NOON
  const seen: Seen = { x: { at, n: 1 } }
  expect(due({}, 'x', 'ever', at, dayNumberOf)).toBe(true)
  expect(due(seen, 'x', 'ever', at + 365 * DAY, dayNumberOf)).toBe(false)
  expect(due(seen, 'x', 'day', at + 60_000, dayNumberOf)).toBe(false)
  expect(due(seen, 'x', 'day', at + DAY, dayNumberOf)).toBe(true)
  // 2026-10-02 is a Friday: Sunday is the same week, Monday the next.
  expect(due(seen, 'x', 'week', at + 2 * DAY, dayNumberOf)).toBe(false)
  expect(due(seen, 'x', 'week', at + 3 * DAY, dayNumberOf)).toBe(true)
  expect(due(seen, 'x', { count: 3 }, at, dayNumberOf)).toBe(true)
  expect(due({ x: { at, n: 3 } }, 'x', { count: 3 }, at, dayNumberOf)).toBe(false)
  expect(due(seen, 'x', { everyMs: 3_600_000 }, at + 3_599_999, dayNumberOf)).toBe(false)
  expect(due(seen, 'x', { everyMs: 3_600_000 }, at + 3_600_000, dayNumberOf)).toBe(true)
  expect(mark(mark({}, 'x', 1), 'x', 2)).toEqual({ x: { at: 2, n: 2 } })
  expect(mondayOf(TODAY) + 4).toBe(TODAY)
})

test('a reload never brings back what was marked', OPTIONS, async ($, on) => {
  // Marked earlier today in another load: the day toast and the first-run band do not come back.
  const { w } = world(on, null, { seen: { 'setup-prompt': { at: NOON - 60_000, n: 1 } } })
  await $.session.start(SESSION)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'quickstart' })).toBeUndefined()
  await ui.unmount()
  expect(w.toasts).toEqual([])
})

test('Undo never puts back a mark: the record reducer never touches the ledger', () => {
  expect(RECORD_KEYS).not.toContain('seen' as never)
  const store = storeOf(TINY)
  const result = record(store, setAction(store, TINY, 'done', 10), ctxOf(TINY))
  expect(Object.keys(result.patch.set)).not.toContain('seen')
  expect(Object.keys(result.inverse.restore)).not.toContain('seen')
})

test('the slot: a band that matters more stays; the waiting ones come back highest first', () => {
  const b = (kind: BandSpec['kind']): BandSpec => ({ kind, body: [], actions: [] })
  const rating = b('rating')
  let slot = offerToSlot(rating, [], b('ask'))
  expect(slot.isPlaced).toBe(false)
  slot = offerToSlot(slot.band, slot.pending, b('set'))
  expect(slot.band).toBe(rating)
  expect(slot.pending.map(x => x.kind)).toEqual(['set', 'ask'])
  const first = nextFromPending(slot.pending)
  expect(first.next?.kind).toBe('set')
  expect(nextFromPending(first.pending).next?.kind).toBe('ask')
  // A logged line gives way to anything; a higher band replaces a lower one.
  expect(offerToSlot(b('logged'), [], b('ask')).isPlaced).toBe(true)
  expect(offerToSlot(b('set'), [], b('rating')).isPlaced).toBe(true)
  expect(BAND_PRIORITY.rating).toBeGreaterThan(BAND_PRIORITY.logged)
  expect(BAND_PRIORITY.logged).toBeGreaterThan(BAND_PRIORITY.set)
  expect(BAND_PRIORITY.set).toBeGreaterThan(BAND_PRIORITY.ask)
})

test('ACTIONS is D11 for the bands and panes Phase A draws (with Replay: 1 Let\'s go)', () => {
  const table = ACTIONS.map(a => `${a.kind} ${a.hotkey} ${a.label}`)
  expect(table).toEqual([
    'intro 1 Quick start',
    'intro 2 Set up my plan',
    'intro 3 Not now',
    "intro 4 Don't ask again",
    'where 1 At a desk',
    'where 2 At home',
    'stretch 1 Done',
    'stretch 2 Not now',
    'ready 1 Try a set now',
    'ready 2 Got it',
    'reschedule 1 Move it',
    'reschedule 2 Keep it',
    "replay 1 Let's go",
    'warmup 1 Done',
    'warmup 2 Skip',
    'ask 1 Start',
    'ask 2 Later',
    'ask 3 Not today',
    'ask 4 Just half',
    'set 1 Done',
    'set 2 Edit',
    'set 3 Skip',
    'set 4 Later',
    'set 5 Timer',
    'timer 1 Done',
    'timer 2 Stop timer',
    'switch 1 Start side 2',
    'switch 2 Stop timer',
    'time 1 Done',
    'time 2 Edit',
    'edit 1 Save',
    'edit 2 < reps',
    'edit 3 reps >',
    'edit 4 < weight',
    'edit 5 weight >',
    'logged 0 Undo',
    'rating 1 Easy',
    'rating 2 Good',
    'rating 3 Tough',
    'rating 0 Undo',
    "rankup 1 Let's go",
    'rankup 0 Undo',
    'bonus 1 One more',
    'bonus 2 Done for today',
    'programEnd 1 Next block',
    'programEnd 2 Change plan',
    'programEnd 3 Later',
    'restore 1 Restore',
    'restore 2 Cancel',
    'erase 1 Erase',
    'erase 2 Cancel',
    'flex 1 Nice',
    'status 1 Start a set now',
    'status 2 Train today anyway',
    'status 3 Share week',
    'status 4 Change plan',
    'status 0 Close',
    'safety 1 I understand',
    'safety 0 Close',
    'safety 2 Back',
    'byo 1 Copy example',
    'byo b Back',
    'byo 0 Close',
  ])
  const pairs = ACTIONS.map(a => `${a.kind}/${a.hotkey}`)
  expect(new Set(pairs).size).toBe(pairs.length)
  for (const action of ACTIONS) expect(/^[0-9a-z]$/.test(action.hotkey)).toBe(true)
})

// ---------------------------------------------------------------------------------------------------------
// The record reducer: record, then Undo, is the identity.

const THREE_SETS: Plan = {
  ...TINY,
  workouts: [
    { name: 'A', exercises: [{ name: 'Push-ups', reps: '10 reps', range: [10, 15], sets: 2 }, { name: 'Goblet squats', reps: '10 reps', range: [10, 15], sets: 1, weight: { start: 8, step: 2, unit: 'kg' } }] },
    { name: 'B', exercises: [{ name: 'Band rows', reps: '12 reps', range: [12, 18], sets: 1, band: { levels: ['light', 'medium'], start: 'light' } }] },
  ],
}

function storeOf(plan: Plan, history: HistoryEntry[] = []): RecordStore {
  void plan
  return { progress: START, history, targets: {}, lastByExercise: {}, totalDoneSets: 0, nextCueAt: undefined }
}

const ctxOf = (plan: Plan) => ({ plan, today: TODAY, now: NOON, gapMs: 15 * 60_000, setting: 'home' as const })

function setAction(store: RecordStore, plan: Plan, result: 'done' | 'skip', count?: number, weight?: number, band?: string): RecordAction {
  const cue = cueFor(plan, store.progress, store.targets)
  return {
    type: 'set',
    showing: { workout: cue?.workout ?? 0, step: cue?.step ?? 1 },
    result,
    ...(count === undefined ? {} : { count }),
    ...(weight === undefined ? {} : { weight }),
    ...(band === undefined ? {} : { band }),
  }
}

test('record then Undo leaves an identical store, for every action', () => {
  let store = storeOf(THREE_SETS, [{ kind: 'set', t: 1, d: TODAY - 3, w: 0, exercise: 'Push-ups', set: 1, target: '10 reps', result: 'done', count: 10 }])
  const ctx = ctxOf(THREE_SETS)
  const steps: ((s: RecordStore) => RecordAction)[] = [
    s => setAction(s, THREE_SETS, 'done', 10),
    s => setAction(s, THREE_SETS, 'skip'),
    s => setAction(s, THREE_SETS, 'done', 12, 10),
    s => setAction(s, THREE_SETS, 'done', 18, undefined, 'medium'),
  ]
  for (const make of steps) {
    const action = make(store)
    const result = record(store, action, ctx)
    const after = applyPatch(store, result.patch)
    expect(applyInverse(after, result.inverse)).toEqual(store)
    if (result.effects.workoutDone !== undefined) {
      for (const rating of ['easy', 'good', 'tough'] as const) {
        const rated = record(after, { type: 'rating', rating, basis: result.effects.workoutDone.basis }, ctx)
        const afterRating = applyPatch(after, rated.patch)
        expect(applyInverse(afterRating, rated.inverse)).toEqual(after)
      }
    }
    store = after
  }
  expect(store.progress.workout).toBe(2)
})

test('a stale band records nothing', () => {
  const store = storeOf(TINY)
  const result = record(store, { type: 'set', showing: { workout: 0, step: 2 }, result: 'done', count: 10 }, ctxOf(TINY))
  expect(result.effects.isStale).toBe(true)
  expect(result.patch).toEqual({ set: {}, append: [] })
})

// ---------------------------------------------------------------------------------------------------------
// The store registry and the plan cache.

test('every store key the plugin reads or writes is registered', OPTIONS, async ($, on) => {
  const store = new Map<string, unknown>()
  const unregistered: string[] = []
  const registered = new Set<string>(STORE_KEYS.map(k => k.key))
  // The prototype's keys are read once, by the migration step that retires them.
  const legacy = new Set(['log', 'weights'])
  const check = (key: string) => {
    if (!registered.has(key) && !legacy.has(key)) unregistered.push(key)
  }
  on('store.get', ($, e) => {
    check(e.key)
    return { value: store.get(e.key) }
  })
  on('store.set', ($, e) => {
    check(e.key)
    store.set(e.key, e.value)
    return { value: undefined }
  })
  on('store.delete', ($, e) => {
    check(e.key)
    store.delete(e.key)
    return { value: undefined }
  })
  on('store.keys', () => ({ value: [...store.keys()] }))
  const { clock } = world(on, WEIGHTED, 'own-store')
  await $.session.start(SESSION)
  await $.turn.start({ text: 'implement it', turnId: 't1' })
  await $.tool.call({ tool: 'Bash', command: 'npm test' })
  await clock.advance(5_000)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await ui.press({ key: 'start' })
  await ui.press({ key: 'edit' })
  await ui.press({ key: 'heavier' })
  await ui.press({ key: 'save' })
  await ui.press({ key: 'undo' })
  await ui.press({ key: 'done' })
  await $.command.run(workout('start'))
  await ui.press({ key: 'done' })
  await ui.press({ key: 'tough' })
  for (const args of ['status', 'pause', 'resume', 'later', 'no', 'today', 'reset', 'undo', '']) await $.command.run(workout(args))
  await ui.unmount()
  expect(unregistered).toEqual([])
})

test('the plan file is read again only when its size or time changed', OPTIONS, async ($, on) => {
  const { w } = world(on, TINY)
  await $.session.start(SESSION)
  const after = w.planReads
  await $.command.run(workout('status'))
  await $.command.run(workout('status'))
  expect(w.planReads).toBe(after)
  w.file.mtimeMs += 1
  await $.command.run(workout('status'))
  expect(w.planReads).toBe(after + 1)
})

test('a broken plan file toasts once per change, then stays quiet', OPTIONS, async ($, on) => {
  const { w } = world(on, TINY)
  w.file.text = '{"workouts": []}'
  await $.session.start(SESSION)
  await $.command.run(workout('status'))
  await $.command.run(workout('now'))
  expect(w.toasts.filter(t => /can't use/.test(t)).length).toBe(1)
  expect(JSON.stringify(await $.command.run(workout('status')))).toMatch(/Fix .*plan.json first/)
  w.file.text = '{"workouts": 3}'
  w.file.mtimeMs += 1
  await $.command.run(workout('status'))
  expect(w.toasts.filter(t => /can't use/.test(t)).length).toBe(2)
})

// ---------------------------------------------------------------------------------------------------------
// Timers have owners.

test('the logged line’s own timer goes with it: Undo’s set band is not cleared at two minutes', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await ui.press({ key: 'done' })
  await ui.press({ key: 'undo' })
  await clock.advance(3 * 60_000)
  expect(await ui.find({ key: 'done' })).toBeDefined()
  await ui.unmount()
})

test('a turn that ends before its wait leaves nothing behind', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(10_000)
  await $.turn.complete({ turnId: 't1', answer: '', reason: 'end_turn' } as never)
  await clock.advance(60 * 60_000)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'start' })).toBeUndefined()
  await ui.unmount()
})

// ---------------------------------------------------------------------------------------------------------
// Never while typing (the gate's clause (c)).

test('a due cue waits while the prompt has text, and shows when it empties', OPTIONS, async ($, on) => {
  const { clock, w } = world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  w.prompt.text = 'abc'
  await clock.advance(30_000)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'start' })).toBeUndefined()
  await editPrompt($, typing('abc', 'abcd'))
  expect(await ui.find({ key: 'start' })).toBeUndefined()
  await editPrompt($, typing('abcd', ''))
  await clock.settle()
  expect(await ui.find({ key: 'start' })).toBeDefined()
  await ui.unmount()
})

test('the first set after Start shows at once even with text in the prompt', OPTIONS, async ($, on) => {
  const { w } = world(on, TINY)
  await $.session.start(SESSION)
  w.prompt.text = 'half a thought'
  await $.command.run(workout('start'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'done' })).toBeDefined()
  await ui.unmount()
})

test('when the turn ends first, the waiting cue is dropped', OPTIONS, async ($, on) => {
  const { clock, w } = world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  w.prompt.text = 'abc'
  await clock.advance(30_000)
  await $.turn.complete({ turnId: 't1', answer: '', reason: 'end_turn' } as never)
  await editPrompt($, typing('abc', ''))
  await clock.settle()
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'start' })).toBeUndefined()
  await ui.unmount()
})

// ---------------------------------------------------------------------------------------------------------
// Regression coverage: Undo and Edit replace the band they answer, whatever its priority.

test('Undo from the logged line shows the set again', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await ui.press({ key: 'done' })
  expect(await ui.find({ type: 'Text', text: /✓ Logged Push-ups 10 reps/ })).toBeDefined()
  await ui.press({ key: 'undo' })
  expect(await ui.find({ type: 'Text', text: /\(1\/2\)/ })).toBeDefined()
  expect(await ui.find({ key: 'undo' })).toBeUndefined()
  await ui.unmount()
})

test('/workout undo while the rating shows reopens the last set', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'good' })).toBeDefined()
  expect(JSON.stringify(await $.command.run(workout('undo')))).toMatch(/Undone/)
  expect(await ui.find({ key: 'good' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /\(2\/2\)/ })).toBeDefined()
  await ui.unmount()
  expect(JSON.stringify(await $.command.run(workout('status')))).toMatch(/set 2 of 2/)
})

test('Undo after a rating takes back only the rating', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  await $.command.run(workout('tough'))
  expect(JSON.stringify(await $.command.run(workout('undo')))).toMatch(/Undone/)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'done' })).toBeUndefined()
  await ui.unmount()
  // The workout stays finished: the rating was the last record, not the set.
  expect(JSON.stringify(await $.command.run(workout('status')))).toMatch(/Workout 2 of 2/)
  expect(JSON.stringify(await $.command.run(workout('undo')))).toMatch(/Nothing to undo/)
})

test('a band’s Undo for a record another session replaced records nothing', OPTIONS, async ($, on) => {
  const store = new Map<string, unknown>()
  on('store.get', ($, e) => ({ value: store.get(e.key) }))
  on('store.set', ($, e) => {
    store.set(e.key, e.value)
    return { value: undefined }
  })
  on('store.delete', ($, e) => {
    store.delete(e.key)
    return { value: undefined }
  })
  on('store.keys', () => ({ value: [...store.keys()] }))
  const { w } = world(on, TINY, 'own-store')
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await ui.press({ key: 'done' })
  // Another session recorded since: its record is the one `undo` holds now.
  const theirs = { ...(store.get('undo') as object), id: NOON + 1 }
  store.set('undo', theirs)
  const progress = store.get('progress')
  await ui.press({ key: 'undo' })
  expect(store.get('progress')).toEqual(progress)
  expect(store.get('undo')).toEqual(theirs)
  expect(w.toasts).toContain('That set was already changed in another session.')
  expect(await ui.find({ key: 'undo' })).toBeUndefined()
  await ui.unmount()
})

test('Edit replaces the set band, and Save from it logs and offers Undo', OPTIONS, async ($, on) => {
  world(on, WEIGHTED)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await ui.press({ key: 'edit' })
  expect(await ui.find({ key: 'done' })).toBeUndefined()
  expect(await ui.find({ key: 'save' })).toBeDefined()
  await ui.press({ key: 'fewer' })
  await ui.press({ key: 'save' })
  expect(await ui.find({ type: 'Text', text: /✓ Logged Goblet squats 9 reps @ 8 kg/ })).toBeDefined()
  await ui.press({ key: 'undo' })
  expect(await ui.find({ type: 'Text', text: /Goblet squats: 10 reps @ 8 kg/ })).toBeDefined()
  await ui.unmount()
})

// ---------------------------------------------------------------------------------------------------------
// Timers have owners (§4.3 item 3): a band leaving the slot ends its timers; the turn ending ends the turn's.

test('a band leaving the slot takes its timers with it: Undo, the next prompt, a new band', OPTIONS, async ($, on) => {
  const clock = liveClock(on)
  world(on, TINY, {}, { ownClock: true })
  await $.session.start(SESSION)
  const loggedTimers = () => clock.live().filter(ms => ms === LOGGED_MS).length
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  expect(loggedTimers()).toBe(1)
  await $.command.run(workout('undo'))
  expect(loggedTimers()).toBe(0)
  await $.command.run(workout('done'))
  expect(loggedTimers()).toBe(1)
  await $.turn.start({ text: 'next', turnId: 't1' })
  expect(loggedTimers()).toBe(0)
  await $.command.run(workout('undo'))
  await $.command.run(workout('done'))
  expect(loggedTimers()).toBe(1)
  await $.command.run(workout('now'))
  expect(loggedTimers()).toBe(0)
})

test('the turn ending takes its timers with it, and leaves the session’s', OPTIONS, async ($, on) => {
  const clock = liveClock(on)
  world(on, TINY, {}, { ownClock: true })
  await $.session.start(SESSION)
  const sessionTimers = clock.live().sort((a, b) => a - b)
  await $.turn.start({ text: 'go', turnId: 't1' })
  expect(clock.live()).toContain(30_000)
  await $.turn.complete({ turnId: 't1', answer: '', reason: 'end_turn' } as never)
  expect(clock.live().sort((a, b) => a - b)).toEqual(sessionTimers)
})
