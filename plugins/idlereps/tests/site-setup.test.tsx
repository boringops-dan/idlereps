import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import type { Answers, Equipment, Plan } from '../types'
import { CELEBRATIONS, celebrationFor } from '../hooks/celebrate'
import { STARTER_MOVES, UNLOCK_ORDER } from '../hooks/collection'
import { parsePlan, setSeconds, targetOf, timeWords } from '../hooks/plan'
import { generateProgram, OFFICE_REPLACED, STARTER_ANSWERS } from '../hooks/programs'
import { setShown, ANIMATED, BAND, blitLog, cellsOf, drawnRows, movesRows, NOON, OPTIONS, ownStore, PLAN_PATH, SESSION, SETUP, TINY, workout, world } from './world'

/**
 * idlereps.app's claims about setup, plans, progression and Swolomon's moves, each proved against the
 * plugin as it runs: what the page says, the plugin must do.
 */

const ACKED = { seen: { safety: { at: NOON - 1, n: 1 } } }
const DAY_MS = 86_400_000
const planWritten = (writes: { path: string; text: string }[]): Plan | undefined => {
  const last = writes.filter(w => w.path === PLAN_PATH).at(-1)
  return last === undefined ? undefined : parsePlan(last.text)
}
/** What the helpers need of a mounted pane: finding a button by key. */
type Pane = { find(query: { key: string }): Promise<{ props: { label?: unknown; hotkey?: unknown } } | undefined> }
const labelOf = async (pane: Pane, key: string) => {
  const b = await pane.find({ key })
  return b === undefined ? undefined : { label: String(b.props.label).trim(), hotkey: String(b.props.hotkey) }
}
const choicesOf = async (pane: Pane) => {
  const out: { label: string; hotkey: string }[] = []
  for (let i = 1; ; i += 1) {
    const c = await labelOf(pane, `choice-${i}`)
    if (c === undefined) return out
    out.push(c)
  }
}

// ---------------------------------------------------------------------------------------------------------
// "Build it with me asks a few questions and builds a plan around your answers."

const SITE_QUESTIONS: [string, string[]][] = [
  ["What's the goal?", ['1: Get stronger', '2: General fitness', '3: Move more and loosen up']],
  ['What equipment do you have?', ['1: Dumbbells', '2: Pull-up bar', '3: Resistance bands']],
  ['Where do you usually work?', ['1: Home (floor exercises are fine)', '2: Office or shared space (standing only, quiet)']],
  ['Where are you starting?', ['1: New to this', '2: Some experience', '3: I train regularly']],
  ['How many days a week?', ['2: 2', '3: 3', '4: 4', '5: 5']],
  ['How big is each workout?', ['1: Short (about 6 sets)', '2: Medium (about 9)', '3: Long (about 12)']],
  ['How long is the program?', ['1: 4 weeks', '2: 8 weeks']],
]

test('site: Build it with me asks exactly the questions and answers the page lists, on those keys', OPTIONS, async ($, on) => {
  world(on, null, ACKED)
  await $.session.start(SESSION)
  await $.command.run(workout('setup'))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...SETUP })
  await pane.press({ key: 'choice-2' }) // Design one for me
  const seen: [string, string[]][] = []
  const titleOf = async () => {
    for (const [title] of SITE_QUESTIONS) if ((await pane.find({ type: 'Text', text: title })) !== undefined) return title
    return undefined
  }
  // Walk every screen up to the program length, recording its title and buttons, taking the first answer.
  for (let step = 0; step < 12; step += 1) {
    const title = await titleOf()
    if (title !== undefined && !seen.some(([t]) => t === title)) {
      if (title === 'What equipment do you have?') {
        const toggles = []
        for (const key of ['toggle-dumbbells', 'toggle-bar', 'toggle-bands']) {
          const t = await labelOf(pane, key)
          if (t !== undefined) toggles.push(`${t.hotkey}: ${t.label}`)
        }
        seen.push([title, toggles])
        await pane.press({ key: 'continue' })
        continue
      }
      seen.push([title, (await choicesOf(pane)).map(c => `${c.hotkey}: ${c.label}`)])
    }
    if (title === 'How long is the program?') break
    await pane.press({ key: 'choice-1' })
  }
  expect(seen).toEqual(SITE_QUESTIONS)
  await pane.unmount()
})

/** One run of Design one for me, pressing the given answers; the plan it writes. */
async function designed(
  $: Engine,
  on: Parameters<typeof world>[0],
  a: { goal: number; equipment: (keyof Equipment)[]; setting: number; level: number; days: number; size: number; weeks: number },
) {
  const { w } = world(on, null, ACKED)
  await $.session.start(SESSION)
  await $.command.run(workout('setup'))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...SETUP })
  await pane.press({ key: 'choice-2' })
  await pane.press({ key: `choice-${a.goal}` })
  for (const kit of a.equipment) await pane.press({ key: `toggle-${kit}` })
  await pane.press({ key: 'continue' })
  for (const n of [a.setting, a.level, a.days, 1, a.size, a.weeks, 1, 1]) await pane.press({ key: `choice-${n}` })
  await pane.press({ key: 'start-plan' })
  await pane.unmount()
  const plan = planWritten(w.writes)
  if (plan === undefined) throw new Error('no plan written')
  return plan
}
const exercisesOf = (plan: Plan) => plan.workouts.flatMap(w => w.exercises)
const daysOf = (plan: Plan) => ('days' in plan.schedule ? plan.schedule.days.length : 0)

test('site: the answers build the plan: goal, gear, office, level, days, size and length all change it', OPTIONS, async ($, on) => {
  // Get stronger · dumbbells and bands · home · new to this · 2 days · short · 4 weeks.
  const plan = await designed($, on, { goal: 1, equipment: ['dumbbells', 'bands'], setting: 1, level: 1, days: 1, size: 1, weeks: 1 })
  expect(plan.answers?.goal).toBe('strength')
  expect(plan.builtFor).toEqual({ dumbbells: true, bar: false, bands: true })
  expect(exercisesOf(plan).some(e => e.weight !== undefined)).toBe(true)
  expect(exercisesOf(plan).every(e => !/pull-up|chin-up|dead hang/i.test(e.name))).toBe(true)
  expect(plan.answers?.level).toBe('beginner')
  expect(daysOf(plan)).toBe(2)
  expect(plan.workouts.length).toBe(2 * 4)
  // Short: about 6 sets a workout.
  for (const w of plan.workouts) expect(w.exercises.reduce((n, e) => n + e.sets, 0)).toBe(6)
})

test('site: office answers give standing-only plans; 5 days, long and 8 weeks scale the plan', OPTIONS, async ($, on) => {
  // Move more · pull-up bar · office · I train regularly · 5 days · long · 8 weeks.
  const plan = await designed($, on, { goal: 3, equipment: ['bar'], setting: 2, level: 3, days: 4, size: 3, weeks: 2 })
  expect(plan.answers?.goal).toBe('mobility')
  expect(plan.answers?.setting).toBe('office')
  expect(plan.answers?.level).toBe('advanced')
  expect(exercisesOf(plan).filter(e => OFFICE_REPLACED.includes(e.name))).toEqual([])
  expect(daysOf(plan)).toBe(5)
  expect(plan.workouts.length).toBe(5 * 8)
  // Long: about 12 sets a workout.
  for (const w of plan.workouts) expect(w.exercises.reduce((n, e) => n + e.sets, 0)).toBe(12)
})

test('site: medium is about 9 sets a workout', OPTIONS, async ($, on) => {
  const plan = await designed($, on, { goal: 2, equipment: [], setting: 1, level: 2, days: 2, size: 2, weeks: 1 })
  for (const w of plan.workouts) expect(w.exercises.reduce((n, e) => n + e.sets, 0)).toBe(9)
  expect(daysOf(plan)).toBe(3)
})

// ---------------------------------------------------------------------------------------------------------
// "In a hurry? Quick start asks only where you train, and your first set is right there."

test('site: Quick start asks only where you train, then the first set is right there', OPTIONS, async ($, on) => {
  const { w } = world(on, null, {}, { fresh: true })
  await $.session.start(SESSION)
  const band = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await band.press({ key: 'quickstart' })
  expect(w.writes).toEqual([])
  const keys = (await band.findAll({ type: 'Button' })).map(b => String(b.key))
  expect(keys).toEqual(['desk', 'home', 'gym'])
  await band.press({ key: 'desk' })
  expect(planWritten(w.writes)).toBeDefined()
  // No second question: the next thing up is the set itself.
  expect(await band.find({ key: 'start' })).toBeDefined()
  await band.press({ key: 'start' })
  expect(await setShown(band)).toBe(true)
  expect(drawnRows(await band.drawn()).some(r => /^Desk push-ups: 10 reps/.test(r))).toBe(true)
  await band.unmount()
})

// ---------------------------------------------------------------------------------------------------------
// FAQ: "Use Quick start in desk mode: standing only, quiet, no gear, and about a minute a set in work clothes."

test('site: desk mode is standing only, no gear, and about a minute a set or less', () => {
  const desk = generateProgram(STARTER_ANSWERS)
  const all = exercisesOf(desk)
  // The plugin's own floor and jumping list (office mode replaces every one of them).
  expect(all.filter(e => OFFICE_REPLACED.includes(e.name)).map(e => e.name)).toEqual([])
  expect(all.filter(e => e.weight !== undefined || e.band !== undefined || /dumbbell|band|pull-up|chin-up|dead hang/i.test(e.name)).map(e => e.name)).toEqual([])
  // Nothing that is plainly seated or lying down, by name or note.
  expect(all.filter(e => /seated|lie|lying|floor|kneel|chair dips|bridge/i.test(`${e.name} ${e.note ?? ''}`)).map(e => e.name)).toEqual([])
  // About a minute a set: no set at its starting target over 75 s.
  const long = [...new Set(all.filter(e => setSeconds(e, targetOf(e.reps)?.value) > 75).map(e => `${e.name} ${e.reps} ${timeWords(setSeconds(e, targetOf(e.reps)?.value))}`))]
  expect(long).toEqual([])
})

// ---------------------------------------------------------------------------------------------------------
// "You can also start from the standard push, pull, legs split."

test('site: setup offers the standard push, pull, legs split and writes it', OPTIONS, async ($, on) => {
  const { w } = world(on, null, ACKED)
  await $.session.start(SESSION)
  await $.command.run(workout('setup'))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...SETUP })
  expect((await labelOf(pane, 'choice-1'))?.label).toBe('Standard Push / Pull / Legs')
  await pane.press({ key: 'choice-1' })
  await pane.press({ key: 'continue' })
  for (let i = 0; i < 8; i += 1) await pane.press({ key: 'choice-1' })
  await pane.press({ key: 'start-plan' })
  await pane.unmount()
  const plan = planWritten(w.writes)
  expect(plan?.workouts.slice(0, 3).map(w => w.name)).toEqual(['Week 1 · Push', 'Week 1 · Pull', 'Week 1 · Legs'])
})

// ---------------------------------------------------------------------------------------------------------
// "…or paste a plan you already have after /workout plan, in any format."

test('site: /workout plan takes a plan in any format, hands it to the model as written, and writes the result', OPTIONS, async ($, on) => {
  const prompts: string[] = []
  on('model.complete', ($, e) => {
    prompts.push(String(e.prompt))
    return { value: { isAnswered: true, text: JSON.stringify(TINY), usage: { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } } }
  })
  const { w } = world(on, null, ACKED)
  await $.session.start(SESSION)
  const pasted = 'Day | Exercise | Sets x Reps — Mon: bench 3x8, rows 3x10; Thu: squat 5x5 (85%)'
  await $.command.run(workout(`plan ${pasted}`))
  expect(prompts.length).toBe(1)
  expect(prompts[0]).toContain(pasted)
  expect(planWritten(w.writes)?.name).toBe(TINY.name)
})

test('site: /workout plan changes nothing when the model gives no plan', OPTIONS, async ($, on) => {
  on('model.complete', () => ({ value: { isAnswered: true, text: 'Sorry, I could not read that.', usage: { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } } }))
  const { w } = world(on, TINY, ACKED)
  await $.session.start(SESSION)
  await $.command.run(workout('plan squats sometimes'))
  expect(w.writes).toEqual([])
})

// ---------------------------------------------------------------------------------------------------------
// "Hit your target on every set and next time asks for one more rep. Reach the top of the range and you
// move up to more weight, a harder band or a harder variant."

/** One workout of one exercise a day, every day. */
const daily = (exercise: Plan['workouts'][number]['exercises'][number]): Plan => ({
  version: 1,
  name: 'Daily',
  schedule: { everyNDays: 1 },
  workouts: [
    { name: 'A', exercises: [exercise] },
    { name: 'B', exercises: [exercise] },
  ],
})

/** Does today's workout (every set as prescribed), rates it Good, and goes to tomorrow's first set; its band rows. */
async function trainThenNext($: Engine, clock: { advance: (ms: number) => Promise<void> }, sets: number) {
  await $.command.run(workout('start'))
  for (let i = 0; i < sets; i += 1) {
    if (i > 0) await $.command.run(workout('now'))
    await $.command.run(workout('done'))
  }
  await $.command.run(workout('good'))
  await clock.advance(DAY_MS)
  await $.command.run(workout('start'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  const rows = drawnRows(await ui.drawn())
  await ui.unmount()
  return rows
}

test('site: every set on target, and next time asks for one more rep', OPTIONS, async ($, on) => {
  const { clock } = world(on, daily({ name: 'Squats', reps: '12 reps', range: [12, 18], sets: 1 }), ACKED)
  await $.session.start(SESSION)
  const rows = await trainThenNext($, clock, 1)
  expect(rows.some(r => /^Squats: 13 reps/.test(r))).toBe(true)
})

test('site: the top of the range on every set moves you to more weight, reps back to the bottom', OPTIONS, async ($, on) => {
  const { clock } = world(on, daily({ name: 'Goblet squats', reps: '10 reps', range: [10, 15], sets: 1, weight: { start: 10, step: 2, unit: 'kg' } }), {
    ...ACKED,
    targets: { 'Goblet squats': { reps: 15, weight: 10, belowStreak: 0, toughStreak: 0 } },
  })
  await $.session.start(SESSION)
  const rows = await trainThenNext($, clock, 1)
  expect(rows.some(r => /^Goblet squats: 10 reps @ 12 kg/.test(r))).toBe(true)
})

test('site: the top of the range on every set moves you to a harder band', OPTIONS, async ($, on) => {
  const { clock } = world(on, daily({ name: 'Band rows', reps: '12 reps', range: [12, 18], sets: 1, band: { levels: ['light', 'medium', 'heavy'], start: 'light' } }), {
    ...ACKED,
    targets: { 'Band rows': { reps: 18, band: 'light', belowStreak: 0, toughStreak: 0 } },
  })
  await $.session.start(SESSION)
  const rows = await trainThenNext($, clock, 1)
  expect(rows.some(r => /^Band rows: 12 reps @ medium band/.test(r))).toBe(true)
})

test('site: the top of the range on every set moves you to a harder variant', OPTIONS, async ($, on) => {
  const { clock } = world(on, daily({ name: 'Incline push-ups', reps: '10 reps', range: [10, 15], sets: 1 }), {
    ...ACKED,
    targets: { 'Incline push-ups': { reps: 15, belowStreak: 0, toughStreak: 0 } },
  })
  await $.session.start(SESSION)
  const rows = await trainThenNext($, clock, 1)
  expect(rows.some(r => /^Push-ups: 12 reps/.test(r))).toBe(true)
})

// ---------------------------------------------------------------------------------------------------------
// "The designed plans follow … two or three sets an exercise."

test('site: every generated plan has two or three sets an exercise', { timeoutMs: 30_000 }, () => {
  const wrong: string[] = []
  const EQUIPMENT: Equipment[] = [false, true].flatMap(dumbbells => [false, true].flatMap(bar => [false, true].map(bands => ({ dumbbells, bar, bands }))))
  for (const template of ['designed', 'ppl'] as const)
    for (const goal of template === 'ppl' ? (['strength'] as const) : (['strength', 'general', 'mobility'] as const))
      for (const daysPerWeek of template === 'ppl' ? ([3, 6] as const) : ([2, 3, 4, 5] as const))
        for (const equipment of EQUIPMENT)
          for (const setting of ['home', 'office'] as const)
            for (const size of ['short', 'medium', 'long'] as const) {
              const answers: Answers = { ...STARTER_ANSWERS, template, goal, daysPerWeek, equipment, setting, size, level: 'intermediate', weeks: 4, schedule: { days: ['mon', 'wed', 'fri'] } }
              for (const e of exercisesOf(generateProgram(answers))) if (e.sets !== 2 && e.sets !== 3) wrong.push(`${JSON.stringify(answers)}: ${e.name} ${e.sets}`)
            }
  expect(wrong.slice(0, 5)).toEqual([])
})

// ---------------------------------------------------------------------------------------------------------
// "He starts with three. Every set you do brings the next one closer, and he celebrates your sets with you:
// high fives, fist bumps, confetti and more." (FAQ-free: /workout flex is in the Guide.)

test('site: he starts with three moves', OPTIONS, async ($, on) => {
  world(on, TINY, { ...ACKED, moves: [], totalDoneSets: 0 })
  await $.session.start(SESSION)
  expect(STARTER_MOVES.length).toBe(3)
  await $.command.run(workout('moves'))
  expect((await movesRows($))[0]).toMatch(new RegExp(`^Moves 3 of ${STARTER_MOVES.length + UNLOCK_ORDER.length}`))
})

test('site: every set brings the next move closer, and the next one unlocks, performed for you', ANIMATED, async ($, on) => {
  const store = ownStore(on, { ...ACKED, moves: [], totalDoneSets: 1 })
  // Three sets in the workout, so the set that earns the move is not the one that ends it.
  const { clock } = world(on, { ...TINY, workouts: [{ name: 'A', exercises: [{ name: 'Push-ups', reps: '10 reps', sets: 3 }] }] }, 'own-store')
  const blits = blitLog(on)
  await $.session.start(SESSION)
  await $.command.run(workout('moves'))
  expect((await movesRows($))[0]).toContain('next in 2 sets')
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  expect((await movesRows($))[0]).toContain('next in 1 set')
  await $.command.run(workout('now'))
  await $.command.run(workout('done'))
  expect(store.get('moves')).toEqual([UNLOCK_ORDER[0]])
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(drawnRows(await ui.drawn()).some(r => r.startsWith('New move: '))).toBe(true)
  // Performed: his portrait draws the move's poses.
  const poses = new Set(cellsOf(UNLOCK_ORDER[0] ?? ''))
  await clock.advance(8_000)
  expect(blits.some(b => poses.has(b.cells))).toBe(true)
  await ui.unmount()
})

test('site: he celebrates sets with high fives, fist bumps and confetti, each one he really picks', OPTIONS, async ($, on) => {
  const picked = new Set(Array.from({ length: 5000 }, (_, i) => celebrationFor(i + 1).id))
  for (const id of ['high-five', 'fist-bump', 'confetti']) {
    expect(CELEBRATIONS.some(c => c.id === id)).toBe(true)
    expect(picked.has(id)).toBe(true)
  }
  // And a set done in the plugin gets one: its button is named for it.
  world(on, TINY, ACKED)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  const labels = (await ui.findAll({ type: 'Button' })).map(b => String((b.props as { label?: string }).label))
  expect(labels.some(l => CELEBRATIONS.some(c => (c.label ?? 'High five') === l))).toBe(true)
  await ui.unmount()
})

// ---------------------------------------------------------------------------------------------------------
// "Your plan and your log stay on your machine."

test('site: a set from offer to rating writes no file but the plan and sends nothing over the network', OPTIONS, async ($, on) => {
  const fetched: string[] = []
  on('http.fetch', ($, e) => {
    fetched.push(String(e.url))
    return { value: { ok: true, status: 200, headers: {}, text: '' } }
  })
  const { w } = world(on, TINY, ACKED)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  await $.command.run(workout('now'))
  await $.command.run(workout('done'))
  await $.command.run(workout('good'))
  expect(w.writes.filter(x => x.path !== PLAN_PATH).map(x => x.path)).toEqual([])
  expect(fetched).toEqual([])
  expect(PLAN_PATH).toBe('/home/me/.claude/idlereps/plan.json')
})

// The setup answer the page repeats: "Office or shared space (standing only, quiet)".

test('site: an office plan is standing only and quiet, whatever the other answers', { timeoutMs: 30_000 }, () => {
  const wrong = new Set<string>()
  const EQUIPMENT: Equipment[] = [false, true].flatMap(dumbbells => [false, true].flatMap(bar => [false, true].map(bands => ({ dumbbells, bar, bands }))))
  for (const template of ['designed', 'ppl'] as const)
    for (const goal of template === 'ppl' ? (['strength'] as const) : (['strength', 'general', 'mobility'] as const))
      for (const daysPerWeek of template === 'ppl' ? ([3, 6] as const) : ([2, 3, 4, 5] as const))
        for (const equipment of EQUIPMENT)
          for (const level of ['beginner', 'intermediate', 'advanced'] as const)
            for (const size of ['short', 'medium', 'long'] as const) {
              const answers: Answers = { ...STARTER_ANSWERS, template, goal, daysPerWeek, equipment, level, size, setting: 'office', weeks: 8, schedule: { days: ['mon', 'wed', 'fri'] } }
              for (const e of exercisesOf(generateProgram(answers))) {
                if (/seated|chair dips/i.test(e.name) || /jump|lie |lying|floor/i.test(e.note ?? '')) wrong.add(`${e.name}${e.note === undefined ? '' : ` (${e.note})`}`)
              }
            }
  expect([...wrong].sort()).toEqual([])
})
