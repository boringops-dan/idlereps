import { expect, test } from 'claude-code/testing'

import type { Plan } from '../types'
import { line, SAFETY_SENTENCES, SAFETY_TEXT } from '../hooks/copy'
import { parsePlan } from '../hooks/plan'
import { generateProgram, STARTER_ANSWERS } from '../hooks/programs'
import { BYO_COPY, EQUIPMENT_COPY, EXAMPLE_PLAN, START_COPY } from '../hooks/setup'
import { BAND, NOON, OPTIONS, PLAN_PATH, SESSION, SETUP, TINY, TODAY, workout, world } from './world'

/** Setup and first run (plan §1.2, §1.5, Task 6). */

const ACKED = { seen: { safety: { at: NOON - 1, n: 1 } } }
const planWritten = (writes: { path: string; text: string }[]): Plan | undefined => {
  const last = writes.filter(w => w.path === PLAN_PATH).at(-1)
  return last === undefined ? undefined : parsePlan(last.text)
}

test('the first-run band: Quick start, after the safety step, writes exactly the starter plan', OPTIONS, async ($, on) => {
  const { w } = world(on, null)
  await $.session.start(SESSION)
  const band = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await band.find({ type: 'Text', text: 'IdleReps · a workout plan and tracker that runs while your agent works' })).toBeDefined()
  await band.press({ key: 'program' })
  await band.press({ key: 'quickstart' })
  expect(w.writes).toEqual([])
  // The safety step shows in the band itself, a sentence a row; no pane opens.
  expect(w.opened).toEqual([])
  for (const sentence of SAFETY_SENTENCES) expect(await band.find({ type: 'Text', text: sentence })).toBeDefined()
  expect(SAFETY_SENTENCES.join(' ')).toBe(SAFETY_TEXT)
  await band.press({ key: 'understand' })
  // One question first: where the person trains. Nothing is written until it is answered.
  expect(w.writes).toEqual([])
  expect(await band.find({ type: 'Text', text: line('where-detail', { day: TODAY }) })).toBeDefined()
  await band.press({ key: 'desk' })
  expect(planWritten(w.writes)).toEqual(generateProgram(STARTER_ANSWERS))
  expect(w.toasts).toContain('Starter plan ready: no gear, no floor, Mon Wed Fri. /workout setup to change it.')
  expect(await band.find({ key: 'program' })).toBeUndefined()
  await band.unmount()
})

test('Quick start once the safety step was acknowledged writes the plan at once', OPTIONS, async ($, on) => {
  const { w } = world(on, null, ACKED)
  await $.session.start(SESSION)
  const band = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await band.press({ key: 'program' })
  await band.press({ key: 'quickstart' })
  await band.press({ key: 'home' })
  expect(planWritten(w.writes)?.name).toBe('Beginner general fitness · 3x/week · 4 weeks')
  expect(planWritten(w.writes)).toEqual(generateProgram({ ...STARTER_ANSWERS, setting: 'home' }))
  expect(w.toasts).toContain(line('quick-start-home', { day: TODAY }))
  await band.unmount()
})

test('Close on the safety step writes nothing, and the step never shows once acknowledged', OPTIONS, async ($, on) => {
  const { w } = world(on, null)
  await $.session.start(SESSION)
  await $.command.run(workout('setup'))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...SETUP })
  await pane.press({ key: 'close' })
  expect(w.writes).toEqual([])
  await $.command.run(workout('setup'))
  await pane.press({ key: 'understand' })
  expect(await pane.find({ type: 'Text', text: START_COPY })).toBeDefined()
  await $.command.run(workout('setup'))
  expect(await pane.find({ type: 'Text', text: SAFETY_TEXT })).toBeUndefined()
  expect(await pane.find({ type: 'Text', text: START_COPY })).toBeDefined()
  await pane.unmount()
})

test('/workout plan before the safety step writes nothing and answers with its copy', OPTIONS, async ($, on) => {
  const { w } = world(on, null)
  await $.session.start(SESSION)
  const said = JSON.stringify(await $.command.run(workout('plan 5x5 squats Mon Wed Fri')))
  expect(said).toContain('it is not medical advice')
  expect(said).toContain('Run /workout setup to accept it first.')
  expect(w.writes).toEqual([])
})

test('the safety copy is verbatim', () => {
  expect(SAFETY_TEXT).toBe(
    'IdleReps suggests exercises; it is not medical advice. Stop any exercise that causes pain, dizziness or shortness of breath. If you have an injury, a heart or joint condition, are pregnant, or a doctor has told you to limit exercise, check with a professional before starting.',
  )
})

test('screen 0 offers the three paths; Push / Pull / Legs skips the goal and offers 3 or 6 days', OPTIONS, async ($, on) => {
  world(on, null, ACKED)
  await $.session.start(SESSION)
  await $.command.run(workout('setup'))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...SETUP })
  for (const [key, label] of [['choice-1', 'Standard Push / Pull / Legs'], ['choice-2', 'Design one for me'], ['choice-3', "I'll bring my own plan"]] as const) {
    expect((await pane.find({ key }))?.props.label).toBe(label)
  }
  await pane.press({ key: 'choice-1' })
  expect(await pane.find({ type: 'Text', text: 'What equipment do you have?' })).toBeDefined()
  await pane.press({ key: 'continue' })
  await pane.press({ key: 'choice-1' })
  await pane.press({ key: 'choice-1' })
  expect(await pane.find({ type: 'Text', text: 'How many days a week?' })).toBeDefined()
  expect((await pane.find({ key: 'choice-1' }))?.props.label).toBe('3 (each day once)')
  expect((await pane.find({ key: 'choice-2' }))?.props.label).toBe('6 (each day twice)')
  expect(await pane.find({ key: 'choice-3' })).toBeUndefined()
  await pane.unmount()
})

test('equipment toggles flip their tick; Continue with none ticked is bodyweight only', OPTIONS, async ($, on) => {
  const { w } = world(on, null, ACKED)
  await $.session.start(SESSION)
  await $.command.run(workout('setup'))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...SETUP })
  await pane.press({ key: 'choice-2' })
  await pane.press({ key: 'choice-1' })
  expect(await pane.find({ type: 'Text', text: EQUIPMENT_COPY })).toBeDefined()
  expect((await pane.find({ key: 'toggle-dumbbells' }))?.props.label).toBe('  Dumbbells')
  await pane.press({ key: 'toggle-dumbbells' })
  expect((await pane.find({ key: 'toggle-dumbbells' }))?.props.label).toBe('✓ Dumbbells')
  expect(await pane.find({ key: 'unit-lb' })).toBeDefined()
  await pane.press({ key: 'toggle-dumbbells' })
  expect((await pane.find({ key: 'toggle-dumbbells' }))?.props.label).toBe('  Dumbbells')
  expect(await pane.find({ key: 'unit-lb' })).toBeUndefined()
  await pane.press({ key: 'continue' })
  for (let i = 0; i < 8; i += 1) await pane.press({ key: 'choice-1' })
  expect(await pane.find({ type: 'Text', text: 'Built for: bodyweight only (no equipment)' })).toBeDefined()
  await pane.press({ key: 'start-plan' })
  expect(planWritten(w.writes)?.builtFor).toEqual({ dumbbells: false, bar: false, bands: false })
  await pane.unmount()
})

test('bring your own plan: its copy, and Copy example puts the example on the clipboard', OPTIONS, async ($, on) => {
  const copied: string[] = []
  on('ui.copy', ($, e) => {
    copied.push(e.text)
    return { value: { isCopied: true } }
  })
  world(on, null, ACKED)
  await $.session.start(SESSION)
  await $.command.run(workout('setup'))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...SETUP })
  await pane.press({ key: 'choice-3' })
  for (const text of BYO_COPY(PLAN_PATH)) expect(await pane.find({ type: 'Text', text })).toBeDefined()
  await pane.press({ key: 'copy' })
  expect(copied).toEqual([EXAMPLE_PLAN])
  expect(() => parsePlan(EXAMPLE_PLAN)).not.toThrow()
  await pane.press({ key: 'back' })
  expect(await pane.find({ type: 'Text', text: START_COPY })).toBeDefined()
  await pane.unmount()
})

test('Back returns to the previous screen with the answers kept', OPTIONS, async ($, on) => {
  world(on, null, ACKED)
  await $.session.start(SESSION)
  await $.command.run(workout('setup'))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...SETUP })
  await pane.press({ key: 'choice-2' })
  await pane.press({ key: 'choice-3' })
  await pane.press({ key: 'toggle-bar' })
  await pane.press({ key: 'back' })
  expect(await pane.find({ type: 'Text', text: "What's the goal?" })).toBeDefined()
  expect((await pane.find({ key: 'choice-3' }))?.props.variant).toBe('primary')
  await pane.press({ key: 'choice-3' })
  expect((await pane.find({ key: 'toggle-bar' }))?.props.label).toBe('✓ Pull-up bar')
  await pane.unmount()
})

for (const surface of ['terminal', 'desktop'] as const) {
  test(`every step pressed through on ${surface} writes a plan named for its answers`, OPTIONS, async ($, on) => {
    const sets: { key: string; value: unknown }[] = []
    on('config.set', ($, e) => {
      sets.push({ key: e.key, value: e.value })
      return { value: e.value }
    })
    const { w } = world(on, null, ACKED)
    await $.session.start(SESSION)
    await $.command.run(workout('setup'))
    const pane = await $.ui.mount({ plugin: 'idlereps', surface, ...SETUP })
    await pane.press({ key: 'choice-2' }) // designed
    await pane.press({ key: 'choice-1' }) // get stronger
    await pane.press({ key: 'toggle-dumbbells' })
    await pane.press({ key: 'unit-lb' })
    await pane.press({ key: 'continue' })
    await pane.press({ key: 'choice-2' }) // office
    await pane.press({ key: 'choice-2' }) // some experience
    await pane.press({ key: 'choice-3' }) // 4 days
    await pane.press({ key: 'choice-2' }) // Mon, Wed, Fri, Sat
    await pane.press({ key: 'choice-3' }) // long
    await pane.press({ key: 'choice-2' }) // 8 weeks
    await pane.press({ key: 'choice-3' }) // every 30 minutes
    await pane.press({ key: 'choice-3' }) // no idle reminder
    expect(await pane.find({ type: 'Text', text: 'Intermediate strength · 4x/week · 8 weeks' })).toBeDefined()
    await pane.press({ key: 'start-plan' })
    const plan = planWritten(w.writes)
    expect(plan?.name).toBe('Intermediate strength · 4x/week · 8 weeks')
    expect(plan?.schedule).toEqual({ days: ['mon', 'wed', 'fri', 'sat'] })
    expect(plan?.answers?.setting).toBe('office')
    expect(plan?.workouts[0]?.exercises.find(e => e.weight !== undefined)?.weight?.unit).toBe('lb')
    expect(sets).toEqual([
      { key: 'idlereps.cueEvery', value: '30' },
      { key: 'idlereps.idleReminder', value: 'off' },
    ])
    expect(w.toasts.some(t => t.startsWith('Plan ready: Intermediate strength'))).toBe(true)
    await pane.unmount()
  })
}

test('a refused config write is said once, and the plan is still written', OPTIONS, async ($, on) => {
  on('config.set', () => ({ deny: 'locked' }))
  const { w } = world(on, null, ACKED)
  await $.session.start(SESSION)
  await $.command.run(workout('setup'))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...SETUP })
  await pane.press({ key: 'choice-2' })
  for (const key of ['choice-1', 'continue', 'choice-1', 'choice-1', 'choice-1', 'choice-1', 'choice-1', 'choice-1', 'choice-1', 'choice-1']) await pane.press({ key })
  await pane.press({ key: 'start-plan' })
  expect(planWritten(w.writes)).toBeDefined()
  expect(w.toasts.filter(t => t === "Couldn't save reminder settings; change them in /config").length).toBe(1)
  await pane.unmount()
})

test('a new plan starts at workout 1 and keeps the history', OPTIONS, async ($, on) => {
  const history = [{ kind: 'workout-complete', t: 1, d: 1, w: 0 }]
  world(on, TINY, { ...ACKED, progress: { workout: 1, done: 0, lastCompletedOn: 1, extraDay: null }, history })
  await $.session.start(SESSION)
  await $.command.run(workout('setup'))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...SETUP })
  await pane.press({ key: 'choice-2' })
  for (const key of ['choice-1', 'continue', 'choice-1', 'choice-1', 'choice-1', 'choice-1', 'choice-1', 'choice-1', 'choice-1', 'choice-1']) await pane.press({ key })
  await pane.press({ key: 'start-plan' })
  await pane.unmount()
  expect(JSON.stringify(await $.command.run(workout('status')))).toMatch(/Workout 1 of /)
})

test('Change plan opens setup with the plan’s answers selected', OPTIONS, async ($, on) => {
  const answers = { ...STARTER_ANSWERS, level: 'advanced' as const, size: 'long' as const }
  world(on, generateProgram(answers), ACKED)
  await $.session.start(SESSION)
  await $.command.run(workout('setup'))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...SETUP })
  await pane.press({ key: 'choice-2' })
  await pane.press({ key: 'choice-1' })
  await pane.press({ key: 'continue' })
  await pane.press({ key: 'choice-1' })
  expect((await pane.find({ key: 'choice-3' }))?.props.variant).toBe('primary')
  await pane.unmount()
})

test('the first-run band: Set up opens the setup dialog', OPTIONS, async ($, on) => {
  const { w } = world(on, null)
  await $.session.start(SESSION)
  const band = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await band.press({ key: 'program' })
  await band.press({ key: 'setup' })
  expect(w.opened).toEqual(['workout-setup'])
  await band.unmount()
})

test('the first-run band: Not now hides it for this session, a reload included', OPTIONS, async ($, on) => {
  world(on, null)
  await $.session.start(SESSION)
  const band = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await band.press({ key: 'notnow' })
  expect(await band.find({ key: 'program' })).toBeUndefined()
  await $.session.start(SESSION)
  expect(await band.find({ key: 'program' })).toBeUndefined()
  await band.unmount()
})

test('the first-run band: Don’t ask again marks it for good', OPTIONS, async ($, on) => {
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
  world(on, null, 'own-store')
  await $.session.start(SESSION)
  const band = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await band.press({ key: 'dontask' })
  expect(await band.find({ key: 'program' })).toBeUndefined()
  expect((store.get('seen') as Record<string, unknown>)['setup-prompt']).toBeDefined()
  await band.unmount()
})

test('Don’t ask again holds across sessions', OPTIONS, async ($, on) => {
  world(on, null, { seen: { 'setup-prompt': { at: 1, n: 1 } } })
  await $.session.start(SESSION)
  const band = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await band.find({ key: 'program' })).toBeUndefined()
  await band.unmount()
  expect(JSON.stringify(await $.command.run(workout('status')))).toMatch(/No plan yet/)
})
