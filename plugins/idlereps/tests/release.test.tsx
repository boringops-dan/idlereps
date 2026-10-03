import { expect, test } from 'claude-code/testing'

import type { HistoryEntry, LastByExercise, Plan, Targets } from '../types'
import { STORE_KEYS } from '../types/store-keys'
import { actionOf, type ActionKind } from '../hooks/actions'
import { line } from '../hooks/copy'
import { HISTORY_CAP, RANKS } from '../hooks/history'
import { LIBRARY } from '../hooks/programs'
import { BAND, NOON, OPTIONS, SESSION, SETUP, STATUS, TINY, TODAY, WEIGHTED, workout, world } from './world'

/** Stored data, drawing and releases (plan §1.12 items 6 to 8, D18, D19, Task 19), and done gate 6. */

test('a store from a newer version is left untouched, with one toast to update', OPTIONS, async ($, on) => {
  const store = new Map<string, unknown>([
    ['schemaVersion', 99],
    ['progress', { future: true }],
  ])
  const writes: string[] = []
  on('store.get', ($, e) => ({ value: store.get(e.key) }))
  on('store.set', ($, e) => {
    writes.push(e.key)
    store.set(e.key, e.value)
    return { value: undefined }
  })
  on('store.delete', ($, e) => {
    writes.push(e.key)
    store.delete(e.key)
    return { value: undefined }
  })
  on('store.keys', () => ({ value: [...store.keys()] }))
  const { w } = world(on, TINY, 'own-store')
  await $.session.start(SESSION)
  expect(writes).toEqual([])
  expect(store.get('progress')).toEqual({ future: true })
  expect(w.toasts).toEqual([line('newer-store', { day: TODAY })])
})

test('the store, filled to every cap, stays under half its limit; Undo under 4 KiB', () => {
  const names = [...new Set(Object.values(LIBRARY).flatMap(rows => rows.flatMap(row => row.levels.map(e => e.name))))]
  const handWritten = Array.from({ length: 50 }, (_, i) => `My own exercise with a long hand-written name number ${i}`)
  const all = [...names, ...handWritten]
  const longest = [...all].sort((a, b) => b.length - a.length)[0] ?? ''
  const entry = (i: number): HistoryEntry => ({
    kind: 'set',
    t: NOON + i,
    d: TODAY,
    w: 39,
    exercise: longest,
    set: 3,
    target: '999 s each side',
    result: 'done',
    count: 999,
    weight: 999.5,
  })
  const history = Array.from({ length: HISTORY_CAP }, (_, i) => entry(i))
  const targets: Targets = Object.fromEntries(
    all.map(name => [name, { reps: 999, weight: 999.5, band: 'x-heavy', variant: { name: longest, reps: '999 s each side', range: [999, 999] }, belowStreak: 2, toughStreak: 1 }]),
  )
  const lastByExercise: LastByExercise = Object.fromEntries(all.map(name => [name, { last: entry(0), best: { '999.5': 999, '998.5': 999, any: 999 } }]))
  const seen = Object.fromEntries(
    [
      ...['safety', 'setup-prompt', 'hint', 'day-toast', 'idle-reminder', 'recap', 'whats-new:1.0.0'],
      ...RANKS.map(rank => `rank:${rank.name}`),
      ...['first-set', 'perfect-workout', 'three-in-a-row', 'full-week'].map(feat => `feat:${feat}`),
    ].map(id => [id, { at: NOON, n: 3 }]),
  )
  const store: Record<string, unknown> = {
    schemaVersion: 1,
    progress: { workout: 39, done: 11, lastCompletedOn: TODAY, extraDay: TODAY },
    history,
    targets,
    lastByExercise,
    totalDoneSets: 1_000_000,
    nextCueAt: NOON,
    startedOn: TODAY,
    declinedOn: TODAY,
    paused: true,
    planStartedOn: TODAY,
    agentBeat: { day: TODAY, n: 99 },
    seen,
    declines: Array.from({ length: 60 }, (_, i) => TODAY - i),
    laterStreak: { day: TODAY, n: 2 },
    easyDay: TODAY,
    mode: 'remind',
    moves: Array.from({ length: 40 }, (_, i) => `a-long-move-name-${i}`),
    lastSeenOn: TODAY,
    prep: { stage: 999, from: 999_999, isReady: true, medals: Array.from({ length: 999 }, () => 'silver') },
    about: Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`question-${i}`, 'pass'])),
    turnLengths: Array.from({ length: 30 }, () => 3_599_999),
    installId: '6f1c2a9e-0b7d-4c1e-9a55-3f8e2d7b4c10',
    // 14 days at 50 turns a day (§1.12 item 7).
    workIntervals: Object.fromEntries(Array.from({ length: 14 }, (_, d) => [String(TODAY - d), Array.from({ length: 50 }, (_, i) => [NOON + i * 600_000, NOON + i * 600_000 + 300_000])])),
  }
  // The largest Undo: a set that finished a workout, restoring every key a record writes.
  store.undo = {
    id: NOON,
    restore: { progress: store.progress, targets: Object.fromEntries(Object.entries(targets).slice(0, 4)), lastByExercise: Object.fromEntries(Object.entries(lastByExercise).slice(0, 1)), totalDoneSets: 1_000_000, nextCueAt: NOON },
    remove: [],
    drop: 2,
    cue: null,
  }
  for (const info of STORE_KEYS) expect([info.key, info.key in store]).toEqual([info.key, true])
  const size = new TextEncoder().encode(JSON.stringify(store)).length
  expect(size).toBeLessThan(2 * 1024 * 1024)
  expect(new TextEncoder().encode(JSON.stringify(store.undo)).length).toBeLessThan(4 * 1024)
})

test('drawing reads no store key (D19)', OPTIONS, async ($, on) => {
  const store = new Map<string, unknown>()
  let isDrawing = false
  const readWhileDrawing: string[] = []
  on('store.get', ($, e) => {
    if (isDrawing) readWhileDrawing.push(e.key)
    return { value: store.get(e.key) }
  })
  on('store.set', ($, e) => {
    store.set(e.key, e.value)
    return { value: undefined }
  })
  on('store.delete', ($, e) => {
    store.delete(e.key)
    return { value: undefined }
  })
  on('store.keys', () => ({ value: [...store.keys()] }))
  world(on, WEIGHTED, 'own-store')
  await $.session.start(SESSION)
  const draw = async (target: typeof BAND | typeof STATUS | typeof SETUP) => {
    isDrawing = true
    const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...target })
    await ui.drawn()
    isDrawing = false
    await ui.unmount()
  }
  await $.command.run(workout('start'))
  await draw(BAND)
  await $.command.run(workout('done'))
  await draw(BAND)
  await $.command.run(workout(''))
  await draw(STATUS)
  await $.command.run(workout('setup'))
  await draw(SETUP)
  expect(readWhileDrawing).toEqual([])
})

// ---------------------------------------------------------------------------------------------------------
// Done gate 6 (§1.7 ease 3): every band kind the renderer draws, on all four surfaces, shows each button's number.

const SURFACES = ['terminal', 'desktop', 'vscode', 'mobile'] as const

test('every band kind shows each button’s number on every surface', OPTIONS, async ($, on) => {
  const { clock } = world(on, null, { seen: { safety: { at: 1, n: 1 } } })
  const kinds = new Set<string>()
  const check = async (kind: ActionKind) => {
    kinds.add(kind)
    for (const surface of SURFACES) {
      const ui = await $.ui.mount({ plugin: 'idlereps', surface, ...BAND })
      const buttons = await ui.findAll({ type: 'Button' })
      expect([kind, surface, buttons.length > 0]).toEqual([kind, surface, true])
      for (const button of buttons) {
        const { hotkey, label, plain } = button.props as { hotkey?: string; label?: string; plain?: boolean }
        expect([kind, surface, typeof hotkey]).toEqual([kind, surface, 'string'])
        expect([kind, button.key, actionOf(kind, String(button.key)).hotkey]).toEqual([kind, button.key, hotkey])
        if (surface === 'terminal') expect([kind, plain]).toEqual([kind, true])
        else expect([kind, label?.startsWith(`${hotkey} · `)]).toEqual([kind, true])
      }
      await ui.unmount()
    }
  }
  await $.session.start(SESSION)
  await check('intro')
  await $.command.run(workout('quickstart'))
  await check('where')
  await $.command.run(workout('desk'))
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(30 * 60_000)
  await check('ask')
  await $.command.run(workout('start'))
  await check('set')
  await $.command.run(workout('edit'))
  await check('edit')
  await $.command.run(workout('save'))
  await check('logged')
  for (let i = 0; i < 5; i += 1) {
    await $.command.run(workout('now'))
    await $.command.run(workout('done'))
  }
  await check('rating')
  expect([...kinds].sort()).toEqual(['ask', 'edit', 'intro', 'logged', 'rating', 'set', 'where'])
})

test('the tall bands (replay, rank-up, flex) show each button’s number on every surface', OPTIONS, async ($, on) => {
  world(on, TINY, { totalDoneSets: 24 })
  await $.session.start(SESSION)
  const check = async (kind: ActionKind) => {
    for (const surface of SURFACES) {
      const ui = await $.ui.mount({ plugin: 'idlereps', surface, ...BAND })
      const buttons = await ui.findAll({ type: 'Button' })
      expect([kind, surface, buttons.length > 0]).toEqual([kind, surface, true])
      for (const button of buttons) {
        const { hotkey, label, plain } = button.props as { hotkey?: string; label?: string; plain?: boolean }
        expect([kind, button.key, actionOf(kind, String(button.key)).hotkey]).toEqual([kind, button.key, hotkey])
        if (surface === 'terminal') expect([kind, plain]).toEqual([kind, true])
        else expect([kind, label?.startsWith(`${hotkey} · `)]).toEqual([kind, true])
      }
      await ui.unmount()
    }
  }
  await $.command.run(workout('swolomon'))
  await check('replay')
  await $.command.run(workout('flex'))
  await check('flex')
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  await check('rankup')
})

test('the panes show each button’s number on every surface', OPTIONS, async ($, on) => {
  world(on, TINY, { seen: { safety: { at: 1, n: 1 } } })
  await $.session.start(SESSION)
  await $.command.run(workout(''))
  await $.command.run(workout('setup'))
  for (const surface of SURFACES) {
    for (const target of [STATUS, SETUP]) {
      const ui = await $.ui.mount({ plugin: 'idlereps', surface, ...target })
      for (const button of await ui.findAll({ type: 'Button' })) {
        const { hotkey, label, plain } = button.props as { hotkey?: string; label?: string; plain?: boolean }
        expect(typeof hotkey).toBe('string')
        if (surface === 'terminal') expect(plain).toBe(true)
        else expect(label?.startsWith(`${hotkey} · `)).toBe(true)
      }
      await ui.unmount()
    }
  }
})

test('the newer bands (warm-up, bonus, program end, erase, restore) show each button’s number on every surface', { options: { ...OPTIONS.options, warmUp: true } }, async ($, on) => {
  const one = (name: string) => ({ name, exercises: [{ name: 'Push-ups', reps: '10 reps', range: [10, 12] as [number, number], sets: 1 }] })
  const ONE: Plan = { ...TINY, schedule: { everyNDays: 1 }, workouts: [one('A'), one('B')] }
  const { w, clock } = world(on, ONE)
  await $.session.start(SESSION)
  const check = async (kind: ActionKind) => {
    for (const surface of SURFACES) {
      const ui = await $.ui.mount({ plugin: 'idlereps', surface, ...BAND })
      const buttons = await ui.findAll({ type: 'Button' })
      expect([kind, surface, buttons.length > 0]).toEqual([kind, surface, true])
      for (const button of buttons) {
        const { hotkey, label, plain } = button.props as { hotkey?: string; label?: string; plain?: boolean }
        expect([kind, button.key, actionOf(kind, String(button.key)).hotkey]).toEqual([kind, button.key, hotkey])
        if (surface === 'terminal') expect([kind, plain]).toEqual([kind, true])
        else expect([kind, label?.startsWith(`${hotkey} · `)]).toEqual([kind, true])
      }
      await ui.unmount()
    }
  }
  await $.command.run(workout('start'))
  await check('warmup')
  await $.command.run(workout('warmed'))
  await $.command.run(workout('done'))
  await $.command.run(workout('easy'))
  await check('bonus')
  await $.command.run(workout('enough'))
  await clock.advance(86_400_000)
  await $.command.run(workout('start'))
  await $.command.run(workout('warmed'))
  await $.command.run(workout('done'))
  await $.command.run(workout('easy'))
  await check('programEnd')
  await $.command.run(workout('endlater'))
  await $.command.run(workout('erase'))
  await check('erase')
  await $.command.run(workout('cancel'))
  await $.command.run(workout('export'))
  await $.command.run(workout('restore'))
  await check('restore')
  expect(w.files.size).toBe(2)
})
