import { expect, test } from 'claude-code/testing'

import { BUSY_TOOL_CALLS, isBigAsk, toolSign } from '../hooks/signals'

const toolSignal = (tool: string, command: string | undefined, calls: number) =>
  toolSign({ tool, ...(command === undefined ? {} : { command }) }, calls)?.reason ?? null
import { line } from '../hooks/copy'
import { advance, cueFor, parseLegacyPlan, parsePlan, START, stepCount, stepsOf, stepWeight, targetOf } from '../hooks/plan'
import { generateProgram, STARTER_ANSWERS } from '../hooks/programs'
import { isTrainingDay } from '../hooks/schedule'
import type { Plan } from '../types'
import { setShown, answerSet, BAND, OPTIONS, SESSION, TINY, TODAY, WEIGHTED, workout, world } from './world'

/** The prototype's tests, on the v1 plan shape (plan §6 Task 2: fixtures, setup and copy changed; behaviour kept). */

const reasonLine = (id: Parameters<typeof line>[0]) => line(id, { day: TODAY })

test('the starter plan is 12 workouts that parse back to themselves', () => {
  const starter = generateProgram(STARTER_ANSWERS)
  expect(starter.workouts.length).toBe(12)
  expect(starter.workouts[0]?.exercises[0]?.reps).toBe('10 reps')
  expect(parsePlan(JSON.stringify(starter))).toEqual(starter)
})

test('sets advance within a workout, then it closes and the rest day applies', () => {
  expect(stepsOf(TINY.workouts[0]!).length).toBe(2)
  const first = advance(TINY, START, TODAY)
  expect(first).toEqual({ progress: { ...START, done: 1 }, finished: 'set' })
  const second = advance(TINY, first.progress, TODAY)
  expect(second.finished).toBe('workout')
  expect(isTrainingDay(TINY, second.progress, TODAY)).toBe(false)
  expect(isTrainingDay(TINY, second.progress, TODAY + 1)).toBe(false)
  expect(isTrainingDay(TINY, second.progress, TODAY + 2)).toBe(true)
  expect(cueFor(TINY, second.progress, {})?.exercise.name).toBe('Squats')
  expect(advance(TINY, { ...START, workout: 1 }, TODAY).finished).toBe('plan')
})

test('a broken plan file is refused with a reason', () => {
  expect(() => parsePlan('{"workouts": []}')).toThrow(/non-empty/)
  expect(() => parsePlan('{"workouts": [{"name": "A", "exercises": [{"name": "x"}]}]}')).toThrow(/reps/)
})

test('a set is cued once Claude has worked startAfterSeconds, and Done advances', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'build it', turnId: 't1' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const quiet = await $.ui.mount({ plugin: 'idlereps', surface, ...BAND })
    expect(await setShown(quiet)).toBe(false)
    await quiet.unmount()
  }

  await clock.advance(30_000)
  // It asks first; no set until the person says Start.
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'idlereps', surface, ...BAND })
    expect(await ui.find({ type: 'Text', text: 'First up: Push-ups, 10 reps · about 45 s.' })).toBeDefined()
    expect(await setShown(ui)).toBe(false)
    await ui.unmount()
  }

  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await ui.press({ key: 'start' })
  expect(await ui.find({ type: 'Text', text: /Push-ups: 10 reps/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /set 1 of 2/ })).toBeDefined()
  await answerSet(ui, 'done')
  expect(JSON.stringify(await $.command.run(workout('status')))).toMatch(/set 2 of 2/)
  expect(await setShown(ui)).toBe(false)

  // The next set waits out the 15-minute gap, even while the turn still runs.
  await clock.advance(14 * 60_000)
  expect(await setShown(ui)).toBe(false)
  await clock.advance(60_000)
  expect(await ui.find({ type: 'Text', text: /set 2 of 2/ })).toBeDefined()
  await ui.unmount()
})

test('Later hides the cue for the rest of the turn without advancing', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(30_000)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await ui.press({ key: 'later' })
  await clock.advance(120_000)
  expect(await setShown(ui)).toBe(false)
  expect(JSON.stringify(await $.command.run(workout('status')))).toMatch(/Workout 1 of 2 \(A\), set 1 of 2/)
  await ui.unmount()
})

test('a short turn shows nothing, and a rest day stays quiet', OPTIONS, async ($, on) => {
  // Workout A was finished yesterday: with a rest day between, today is a rest day (D5).
  const { clock } = world(on, TINY, { progress: { ...START, workout: 1, lastCompletedOn: TODAY - 1 } })
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(60_000)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await setShown(ui)).toBe(false)
  expect(await ui.find({ key: 'start' })).toBeUndefined()
  expect(JSON.stringify(await $.command.run(workout('status')))).toMatch(/rest day/)
  await $.command.run(workout('today'))
  expect(await ui.find({ type: 'Text', text: /Squats: 20 reps/ })).toBeDefined()
  await ui.unmount()
})

test('a day a workout was completed on never brings a second one', OPTIONS, async ($, on) => {
  world(on, TINY, { progress: { ...START, workout: 1, lastCompletedOn: TODAY } })
  await $.session.start(SESSION)
  expect(JSON.stringify(await $.command.run(workout('now')))).toMatch(/Today's workout is done/)
  expect(JSON.stringify(await $.command.run(workout('today')))).toMatch(/Today's workout is done/)
})

test('/workout done records the showing set and hides the band', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('now'))
  const said = await $.command.run(workout('done'))
  expect(JSON.stringify(said)).toMatch(/Set done/)
  expect(JSON.stringify(await $.command.run(workout('status')))).toMatch(/set 2 of 2/)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await setShown(ui)).toBe(false)
  await ui.unmount()
})

test('/workout skip advances like Done', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('now'))
  expect(JSON.stringify(await $.command.run(workout('skip')))).toMatch(/Set skipped/)
  expect(JSON.stringify(await $.command.run(workout('status')))).toMatch(/set 2 of 2/)
})

test('/workout done with no set showing changes nothing', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  expect(JSON.stringify(await $.command.run(workout('done')))).toMatch(/No set is showing/)
  expect(JSON.stringify(await $.command.run(workout('status')))).toMatch(/set 1 of 2/)
})

test('/workout later hides the band without advancing and holds through the turn', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.command.run(workout('now'))
  expect(JSON.stringify(await $.command.run(workout('later')))).toMatch(/Hidden/)
  await clock.advance(120_000)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await setShown(ui)).toBe(false)
  await ui.unmount()
  expect(JSON.stringify(await $.command.run(workout('status')))).toMatch(/set 1 of 2/)
})

test('pressing Done on the band advances on every surface', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  for (const surface of ['terminal', 'desktop'] as const) {
    await $.command.run(workout('reset'))
    await $.command.run(workout('now'))
    const ui = await $.ui.mount({ plugin: 'idlereps', surface, ...BAND })
    await answerSet(ui, 'done')
    expect(await setShown(ui)).toBe(false)
    await ui.unmount()
    expect(JSON.stringify(await $.command.run(workout('status')))).toMatch(/set 2 of 2/)
  }
})

test('every band button shows its number on every surface', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('now'))
  const buttons = [
    ['all', '1', 'All 10'],
    ['fewer', '2', 'Fewer'],
    ['couldnt', '3', "Couldn't do it"],
  ] as const
  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ plugin: 'idlereps', surface, ...BAND })
    for (const [key, hotkey, label] of buttons) {
      const button = await ui.find({ key })
      expect(button?.props.hotkey).toBe(hotkey)
      if (surface === 'terminal') {
        // A plain terminal Button is drawn `1: All 10`: hotkey, colon, label.
        expect(button?.props.plain).toBe(true)
        expect(button?.props.label).toBe(label)
      } else {
        expect(button?.props.label).toBe(`${hotkey} · ${label}`)
      }
    }
    await ui.unmount()
  }
})

test('a new turn inside the gap stays quiet, and cues once the gap has passed', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('now'))
  await $.command.run(workout('done'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })

  await $.turn.start({ text: 'next', turnId: 't2' })
  await clock.advance(10 * 60_000)
  expect(await setShown(ui)).toBe(false)

  await clock.advance(5 * 60_000)
  expect(await ui.find({ type: 'Text', text: /set 2 of 2/ })).toBeDefined()
  await ui.unmount()
})

test('a turn that starts after the gap still waits the warm-up first', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('now'))
  await $.command.run(workout('done'))
  await clock.advance(20 * 60_000)
  await $.turn.start({ text: 'later on', turnId: 't3' })
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await clock.advance(20_000)
  expect(await setShown(ui)).toBe(false)
  await clock.advance(10_000)
  expect(await setShown(ui)).toBe(true)
  await ui.unmount()
})

test('Later holds across turns for the whole gap', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('now'))
  expect(JSON.stringify(await $.command.run(workout('later')))).toMatch(/15 minutes/)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  for (const turnId of ['a', 'b', 'c']) {
    await $.turn.start({ text: 'go', turnId })
    await clock.advance(4 * 60_000)
  }
  expect(await setShown(ui)).toBe(false)
  await $.turn.start({ text: 'go', turnId: 'd' })
  await clock.advance(4 * 60_000)
  expect(await ui.find({ type: 'Text', text: /set 1 of 2/ })).toBeDefined()
  await ui.unmount()
})

test('/workout now ignores the gap', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('now'))
  await $.command.run(workout('done'))
  expect(JSON.stringify(await $.command.run(workout('now')))).toMatch(/Up next/)
})

test('a prototype plan file keeps its workouts and drops its cadence fields', () => {
  const legacy = {
    startAfterSeconds: 30,
    cueEveryMinutes: 15,
    restDaysBetween: 1,
    days: [{ name: 'A', exercises: [{ name: 'Push-ups', reps: '10 reps', sets: 2 }] }],
  }
  const plan = parseLegacyPlan(JSON.stringify(legacy))
  expect(plan).toEqual({ version: 1, name: 'My plan', schedule: { everyNDays: 2 }, workouts: legacy.days })
  expect(JSON.stringify(plan)).not.toMatch(/cueEveryMinutes|startAfterSeconds|restDaysBetween/)
})

test('Not today silences the rest of the day, across turns', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(30_000)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await ui.press({ key: 'no' })
  expect(await ui.find({ key: 'start' })).toBeUndefined()
  for (const turnId of ['t2', 't3']) {
    await $.turn.start({ text: 'go', turnId })
    await clock.advance(30 * 60_000)
  }
  expect(await ui.find({ key: 'start' })).toBeUndefined()
  expect(await setShown(ui)).toBe(false)
  await ui.unmount()
})

test('after Not today, the next day asks again', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('no'))
  await clock.advance(24 * 3_600_000)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(30_000)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'start' })).toBeDefined()
  await ui.unmount()
})

test('Later on the question asks again after the cooldown, not before', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(30_000)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await ui.press({ key: 'later' })
  await clock.advance(14 * 60_000)
  expect(await ui.find({ key: 'start' })).toBeUndefined()
  await clock.advance(60_000)
  expect(await ui.find({ key: 'start' })).toBeDefined()
  await ui.unmount()
})

test('once started today, later sets come without asking again', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(15 * 60_000)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  // The set itself (its own Start), not the ask (whose Not today is `no`).
  expect(await ui.find({ key: 'no' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /set 2 of 2/ })).toBeDefined()
  await ui.unmount()
})

test('the question shows numbered buttons on every surface, and done/skip refuse while it shows', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(30_000)
  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ plugin: 'idlereps', surface, ...BAND })
    for (const [key, hotkey, label] of [['start', '1', 'Start'], ['later', '2', 'Later'], ['no', '0', 'Not today']] as const) {
      const button = await ui.find({ key })
      expect(button?.props.hotkey).toBe(hotkey)
      expect(button?.props.label).toBe(surface === 'terminal' ? label : `${hotkey} · ${label}`)
    }
    await ui.unmount()
  }
  expect(JSON.stringify(await $.command.run(workout('done')))).toMatch(/No set is showing/)
  expect(JSON.stringify(await $.command.run(workout('status')))).toMatch(/set 1 of 2/)
})

test('Later on a set mid-turn brings the same set back when the cooldown ends', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.command.run(workout('start'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  // Started by the ask, the set asks how it went; Later is its command.
  await $.command.run(workout('later'))
  await clock.advance(15 * 60_000)
  expect(await ui.find({ type: 'Text', text: /set 1 of 2/ })).toBeDefined()
  await ui.unmount()
})

test('Later, then the turn ends: nothing appears while idle', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(30_000)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await ui.press({ key: 'later' })
  await $.turn.complete({ turnId: 't1', answer: '', reason: 'end_turn' } as never)
  await clock.advance(60 * 60_000)
  expect(await ui.find({ key: 'start' })).toBeUndefined()
  await ui.unmount()
})

test('a second Later restarts the cooldown from the second press', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(30_000)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await ui.press({ key: 'later' })
  await clock.advance(15 * 60_000)
  await ui.press({ key: 'later' })
  await clock.advance(10 * 60_000)
  expect(await ui.find({ key: 'start' })).toBeUndefined()
  await clock.advance(5 * 60_000)
  expect(await ui.find({ key: 'start' })).toBeDefined()
  await ui.unmount()
})

test('/workout later mid-turn reschedules like the button', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(30_000)
  await $.command.run(workout('later'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'start' })).toBeUndefined()
  await clock.advance(15 * 60_000)
  expect(await ui.find({ key: 'start' })).toBeDefined()
  await ui.unmount()
})

test('Later after Not today never brings the question back today', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(30_000)
  await $.command.run(workout('no'))
  await $.command.run(workout('later'))
  await clock.advance(60 * 60_000)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'start' })).toBeUndefined()
  expect(await setShown(ui)).toBe(false)
  await ui.unmount()
})

test('Done opens a stepper at the target; < and > adjust it; Save records it', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  const first = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await answerSet(first, 'edit')
  await first.unmount()
  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ plugin: 'idlereps', surface, ...BAND })
    expect(await ui.find({ type: 'Text', text: /Push-ups: how did it go\?/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '10 reps' })).toBeDefined()
    for (const [key, hotkey, label] of [['save', '1', 'Save'], ['fewer', '2', '< reps'], ['more', '3', 'reps >']] as const) {
      const button = await ui.find({ key })
      expect(button?.props.hotkey).toBe(hotkey)
      expect(button?.props.label).toBe(surface === 'terminal' ? label : `${hotkey} · ${label}`)
    }
    expect(await ui.find({ key: 'heavier' })).toBeUndefined()
    await ui.unmount()
  }
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await ui.press({ key: 'fewer' })
  await ui.press({ key: 'fewer' })
  await ui.press({ key: 'more' })
  await ui.press({ key: 'fewer' })
  expect(await ui.find({ type: 'Text', text: '8 reps' })).toBeDefined()
  await ui.press({ key: 'save' })
  await ui.unmount()
  expect(JSON.stringify(await $.command.run(workout('status')))).toMatch(/Last set: Push-ups 8\/10/)
})

test('/workout done 7 records 7 in one step; bad numbers are refused', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  expect(JSON.stringify(await $.command.run(workout('done zero')))).toMatch(/Usage/)
  expect(JSON.stringify(await $.command.run(workout('done 0')))).toMatch(/Usage/)
  expect(JSON.stringify(await $.command.run(workout('done 7')))).toMatch(/Set done: 7 reps/)
  expect(JSON.stringify(await $.command.run(workout('status')))).toMatch(/Last set: Push-ups 7\/10/)
})

test('skips are logged as skipped, with no count', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('skip'))
  expect(JSON.stringify(await $.command.run(workout('status')))).toMatch(/Last set: Push-ups skipped/)
})

test('finishing the workout asks once how it felt, and the answer clears it', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: line('workout-done', { day: TODAY, workout: 'A' }) })).toBeDefined()
  for (const [key, hotkey] of [['easy', '1'], ['good', '2'], ['tough', '3']] as const) {
    expect((await ui.find({ key }))?.props.hotkey).toBe(hotkey)
  }
  await ui.press({ key: 'tough' })
  expect(await ui.find({ key: 'tough' })).toBeUndefined()
  await ui.unmount()
  expect(JSON.stringify(await $.command.run(workout('good')))).toMatch(/Nothing to rate/)
})

test('steppers: reps by 1, timed by 5 s, weight by its step; floors and ceilings hold', () => {
  expect(stepCount(10, false, -1)).toBe(9)
  expect(stepCount(1, false, -1)).toBe(1)
  expect(stepCount(40, true, 1)).toBe(45)
  expect(stepCount(5, true, -1)).toBe(5)
  expect(stepCount(999, false, 1)).toBe(999)
  expect(stepWeight(12, 2, 1)).toBe(14)
  expect(stepWeight(1, 2, -1)).toBe(0)
  expect(stepWeight(0.1, 0.2, 1)).toBe(0.3)
  expect(targetOf('40 s each side')).toEqual({ value: 40, unit: ' s each side', isTimed: true })
  expect(targetOf('10 each leg')).toEqual({ value: 10, unit: ' each leg', isTimed: false })
  expect(targetOf('AMRAP')).toBe(null)
})

test('a target with no number is recorded straight from Done, without asking', OPTIONS, async ($, on) => {
  const free: Plan = { ...TINY, workouts: [{ name: 'F', exercises: [{ name: 'Stretch', reps: 'as long as it feels good', sets: 2 }] }] }
  world(on, free)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await answerSet(ui, 'done')
  expect(await ui.find({ type: 'Text', text: /how many/ })).toBeUndefined()
  await ui.unmount()
  expect(JSON.stringify(await $.command.run(workout('status')))).toMatch(/set 2 of 2/)
})

test('a stale band (set already recorded in another session) clears without recording twice', OPTIONS, async ($, on) => {
  // A store this test can change behind the plugin's back, as a second session writing to it would.
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
  world(on, TINY, 'own-store')
  await $.session.start(SESSION)
  await $.command.run(workout('start'))

  // The other session records set 1 while this one still shows it.
  store.set('progress', { ...START, done: 1 })

  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await answerSet(ui, 'skip')
  expect(await ui.find({ key: 'skip' })).toBeUndefined()
  await ui.unmount()
  expect(store.get('progress')).toEqual({ ...START, done: 1 })
  expect(store.get('history')).toBeUndefined()
})

test('a weighted exercise adds a weight stepper starting at its start weight', OPTIONS, async ($, on) => {
  world(on, WEIGHTED)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await answerSet(ui, 'edit')
  expect(await ui.find({ type: 'Text', text: 'at 8 kg' })).toBeDefined()
  expect((await ui.find({ key: 'lighter' }))?.props.hotkey).toBe('4')
  expect((await ui.find({ key: 'heavier' }))?.props.hotkey).toBe('5')
  await ui.press({ key: 'heavier' })
  await ui.press({ key: 'heavier' })
  await ui.press({ key: 'lighter' })
  expect(await ui.find({ type: 'Text', text: 'at 10 kg' })).toBeDefined()
  await ui.press({ key: 'save' })
  await ui.unmount()
  expect(JSON.stringify(await $.command.run(workout('status')))).toMatch(/Last set: Goblet squats 10\/10 @ 10 kg/)
})

test('the next set of a weighted exercise starts at the weight used last', OPTIONS, async ($, on) => {
  world(on, WEIGHTED)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done 10 12'))
  await $.command.run(workout('start'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await answerSet(ui, 'edit')
  expect(await ui.find({ type: 'Text', text: 'at 12 kg' })).toBeDefined()
  await ui.unmount()
})

test('/workout done with reps and weight records both; plain done uses the last weight', OPTIONS, async ($, on) => {
  world(on, WEIGHTED)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  expect(JSON.stringify(await $.command.run(workout('done 9 14')))).toMatch(/Set done: 9 reps at 14 kg/)
  await $.command.run(workout('start'))
  expect(JSON.stringify(await $.command.run(workout('done')))).toMatch(/Set done: 10 reps at 14 kg/)
})

test('a negative or non-numeric weight is refused and nothing is recorded', OPTIONS, async ($, on) => {
  world(on, WEIGHTED)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  expect(JSON.stringify(await $.command.run(workout('done 10 -2')))).toMatch(/Usage/)
  expect(JSON.stringify(await $.command.run(workout('done 10 heavy')))).toMatch(/Usage/)
  expect(JSON.stringify(await $.command.run(workout('status')))).toMatch(/set 1 of 2/)
})

test('a plan whose weight is malformed is refused with a reason', () => {
  const bad = (weight: unknown) =>
    JSON.stringify({ ...WEIGHTED, workouts: [{ name: 'W', exercises: [{ name: 'Goblet squats', reps: '10 reps', weight }] }] })
  expect(() => parsePlan(bad({ start: 8, step: 0, unit: 'kg' }))).toThrow(/weight/)
  expect(() => parsePlan(bad({ start: -1, step: 2, unit: 'kg' }))).toThrow(/weight/)
  expect(() => parsePlan(bad({ start: 8, step: 2, unit: '' }))).toThrow(/weight/)
  expect(parsePlan(bad({ start: 8, step: 2, unit: 'lb' })).workouts[0]?.exercises[0]?.weight?.unit).toBe('lb')
})

test('Done logs the set as prescribed in one key, weight included, and shows it with Undo', OPTIONS, async ($, on) => {
  world(on, WEIGHTED)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /Goblet squats: 10 reps @ 8 kg/ })).toBeDefined()
  await answerSet(ui, 'done')
  expect(await ui.find({ type: 'Text', text: /✓ Logged Goblet squats 10 reps @ 8 kg/ })).toBeDefined()
  expect((await ui.find({ key: 'undo' }))?.props.hotkey).toBe('0')
  await ui.unmount()
  expect(JSON.stringify(await $.command.run(workout('status')))).toMatch(/Last set: Goblet squats 10\/10 @ 8 kg/)
})

test('Undo puts the set back exactly: progress, log, weight memory and cooldown', OPTIONS, async ($, on) => {
  const { clock } = world(on, WEIGHTED)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done 10 12'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await ui.press({ key: 'undo' })
  expect(await ui.find({ type: 'Text', text: /Goblet squats: 10 reps @ 8 kg/ })).toBeDefined()
  expect(await ui.find({ key: 'undo' })).toBeUndefined()
  await ui.unmount()
  const status = JSON.stringify(await $.command.run(workout('status')))
  expect(status).toMatch(/set 1 of 2/)
  expect(status).not.toMatch(/Last set/)
  expect(JSON.stringify(await $.command.run(workout('undo')))).toMatch(/Nothing to undo/)
  // The cooldown the undone set started is gone too: with the band cleared, a new turn cues after the
  // 30 s warm-up, not after 15 minutes.
  await $.command.run(workout('reset'))
  await $.turn.start({ text: 'go', turnId: 't9' })
  await clock.advance(30_000)
  const again = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await setShown(again)).toBe(true)
  await again.unmount()
})

test('Undo on the last set of a workout clears the rating and reopens the set', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'tough' })).toBeDefined()
  await ui.press({ key: 'undo' })
  expect(await ui.find({ key: 'tough' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /\(2\/2\)/ })).toBeDefined()
  await ui.unmount()
  expect(JSON.stringify(await $.command.run(workout('status')))).toMatch(/set 2 of 2/)
})

test('the set band shows last time beside the target', OPTIONS, async ($, on) => {
  world(on, WEIGHTED)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done 9 12'))
  await $.command.run(workout('start'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /Goblet squats: 10 reps @ 12 kg/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /last: 9 reps @ 12 kg/ })).toBeDefined()
  await ui.unmount()
})

test('the next prompt dismisses an unanswered rating and the Undo line', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'undo' })).toBeDefined()
  await $.turn.start({ text: 'next prompt', turnId: 't2' })
  expect(await ui.find({ key: 'undo' })).toBeUndefined()
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  expect(await ui.find({ key: 'good' })).toBeDefined()
  await $.turn.start({ text: 'another', turnId: 't3' })
  expect(await ui.find({ key: 'good' })).toBeUndefined()
  await ui.unmount()
})

test('the Undo line goes away by itself after two minutes', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await clock.advance(119_000)
  expect(await ui.find({ key: 'undo' })).toBeDefined()
  await clock.advance(1_000)
  expect(await ui.find({ key: 'undo' })).toBeUndefined()
  await ui.unmount()
  // The record itself stays; only the band's chance to undo ended. The command still works.
  expect(JSON.stringify(await $.command.run(workout('undo')))).toMatch(/Undone/)
})

test('long-task signs: which tool calls and requests count', () => {
  expect(toolSignal('Agent', undefined, 1)).toBe('helpers')
  expect(toolSignal('Bash', 'npm test', 1)).toBe('long-run')
  expect(toolSignal('Bash', 'npm run build', 1)).toBe('long-run')
  expect(toolSignal('Bash', 'cd app && npx playwright test', 1)).toBe('long-run')
  expect(toolSignal('Bash', 'pytest -q', 1)).toBe('long-run')
  expect(toolSignal('Bash', 'ls -la', 1)).toBe(null)
  expect(toolSignal('Bash', 'git status', 1)).toBe(null)
  expect(toolSignal('Read', undefined, BUSY_TOOL_CALLS - 1)).toBe(null)
  expect(toolSignal('Read', undefined, BUSY_TOOL_CALLS)).toBe('busy')
  expect(isBigAsk('fix the typo')).toBe(false)
  expect(isBigAsk('Refactor the scoring module')).toBe(true)
  expect(isBigAsk('x'.repeat(400))).toBe(true)
})

test('a test run mid-turn brings the question forward to 5 s, opening with why', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'check it', turnId: 't1' })
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await clock.advance(2_000)
  await $.tool.call({ tool: 'Bash', command: 'npm test' })
  await clock.advance(4_000)
  expect(await ui.find({ key: 'start' })).toBeUndefined()
  await clock.advance(1_000)
  expect(await ui.find({ key: 'start' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: line('reason-long-run-timed', { day: TODAY, wait: 'about a minute' }) })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: 'First up: Push-ups, 10 reps · about 45 s.' })).toBeDefined()
  await ui.unmount()
})

test('a helper agent counts as a long task', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'look into it', turnId: 't1' })
  await $.tool.call({ tool: 'Agent', description: 'search', prompt: 'find it', subagent_type: 'Explore' } as never)
  await clock.advance(5_000)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: reasonLine('reason-helpers') })).toBeDefined()
  await ui.unmount()
})

test('one step running 20 s counts as a long task', OPTIONS, async ($, on) => {
  // A tool that runs until the test says so: its answer waits on a gate the test opens itself (a test
  // hook may only make the `$` calls the plugin makes, so it cannot sleep on the clock). Registered before
  // world()'s instant answer so this one answers Bash.
  let finishTool = () => {}
  const toolDone = new Promise<void>(resolve => {
    finishTool = resolve
  })
  on('tool.call', { tool: 'Bash' }, async () => {
    await toolDone
    return { result: { stdout: '', stderr: '' } }
  })
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  const running = $.tool.call({ tool: 'Bash', command: 'sleep 27' })
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await clock.advance(20_000)
  expect(await ui.find({ key: 'start' })).toBeUndefined()
  await clock.advance(5_000)
  expect(await ui.find({ type: 'Text', text: reasonLine('reason-slow-step') })).toBeDefined()
  finishTool()
  await running
  await ui.unmount()
})

test('a busy turn (8 tool calls) counts as a long task', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  for (let i = 0; i < BUSY_TOOL_CALLS; i += 1) await $.tool.call({ tool: 'Bash', command: 'ls' })
  await clock.advance(5_000)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: reasonLine('reason-busy') })).toBeDefined()
  await ui.unmount()
})

test('a big request alone shortens the warm-up to 20 s; a small one waits the full warm-up', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'Refactor the whole thing', turnId: 't1' })
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await clock.advance(19_000)
  expect(await ui.find({ key: 'start' })).toBeUndefined()
  await clock.advance(1_000)
  expect(await ui.find({ type: 'Text', text: reasonLine('reason-big-ask') })).toBeDefined()
  await ui.press({ key: 'later' })
  await ui.unmount()
})

test('a strong sign inside the cooldown still waits for the cooldown to end', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.tool.call({ tool: 'Bash', command: 'npm test' })
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await clock.advance(10 * 60_000)
  expect(await setShown(ui)).toBe(false)
  await clock.advance(5 * 60_000)
  expect(await ui.find({ type: 'Text', text: /set 2 of 2/ })).toBeDefined()
  await ui.unmount()
})

test('tool calls after the turn has ended never bring a cue', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.turn.complete({ turnId: 't1', answer: '', reason: 'end_turn' } as never)
  await $.tool.call({ tool: 'Bash', command: 'npm test' })
  await clock.advance(60_000)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'start' })).toBeUndefined()
  await ui.unmount()
})
