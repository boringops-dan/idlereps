import { expect, test } from 'claude-code/testing'

import type { Answers, Equipment, Exercise, Plan } from '../types'
import { parsePlan } from '../hooks/plan'
import { ALT_NAMES, generateProgram, harderVariant, OFFICE_REPLACED, STARTER_ANSWERS } from '../hooks/programs'

/** The program generator (plan §5, Task 5). */

/** The generator's tests start from a home plan (the starter is an office one: no floor). */
const base: Answers = { ...STARTER_ANSWERS, setting: 'home', schedule: { days: ['mon', 'wed', 'fri'] } }
const gen = (patch: Partial<Answers>) => generateProgram({ ...base, ...patch })
const names = (plan: Plan) => plan.workouts.flatMap(w => w.exercises.map(e => e.name))
const firstWeek = (plan: Plan, days: number) => plan.workouts.slice(0, days)

const EQUIPMENT: Equipment[] = [false, true].flatMap(dumbbells =>
  [false, true].flatMap(bar => [false, true].map(bands => ({ dumbbells, bar, bands }))),
)

/** JSON with keys sorted, so two values compare equal whatever order their keys were written in. */
const canonical = (value: unknown): string =>
  JSON.stringify(value, (_, v: unknown) =>
    typeof v === 'object' && v !== null && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v,
  )

/** Every valid answer combination (§6 Task 5), with a fixed schedule, in one setting and weight unit. */
function* everyAnswer(setting: Answers['setting'] = 'home', weightUnit: Answers['weightUnit'] = 'kg'): Generator<Answers> {
  for (const template of ['designed', 'ppl'] as const) {
    const goals = template === 'ppl' ? (['strength'] as const) : (['strength', 'general', 'mobility'] as const)
    const days = template === 'ppl' ? ([3, 6] as const) : ([2, 3, 4, 5] as const)
    for (const goal of goals)
      for (const equipment of EQUIPMENT)
        for (const level of ['beginner', 'intermediate', 'advanced'] as const)
          for (const daysPerWeek of days)
            for (const size of ['short', 'medium', 'long'] as const)
              for (const weeks of [4, 8] as const)
                yield { template, goal, equipment, level, daysPerWeek, size, weeks, setting, weightUnit, schedule: { days: ['mon', 'wed', 'fri'] } }
  }
}

test('3 days for 4 weeks is 12 workouts, every week the same as week 1', () => {
  const plan = gen({})
  expect(plan.workouts.length).toBe(12)
  const week1 = firstWeek(plan, 3)
  for (let w = 1; w < 4; w += 1) {
    plan.workouts.slice(w * 3, w * 3 + 3).forEach((workout, i) => {
      expect(workout.name).toBe(week1[i]?.name.replace('Week 1', `Week ${w + 1}`))
      expect(workout.exercises).toEqual(week1[i]?.exercises)
    })
  }
})

test('the beginner bodyweight push is incline push-ups, 10 reps, with its note', () => {
  const push = gen({}).workouts[0]?.exercises[0]
  expect(push).toEqual({ name: 'Incline push-ups', reps: '10 reps', sets: 2, range: [10, 15], note: 'a sturdy desk or counter' })
})

test('ranges: reps [base, round(base × 1.5)], timed [base, base × 2]; mobility has none', () => {
  const plan = gen({ size: 'long' })
  const plank = plan.workouts[0]?.exercises[3]
  expect(plank).toEqual({ name: 'Plank', reps: '20 s', sets: 3, range: [20, 40] })
  const lunges = plan.workouts[1]?.exercises[0]
  expect(lunges?.range).toEqual([6, 9])
  const mobility = gen({ goal: 'mobility' })
  for (const workout of mobility.workouts) {
    const last = workout.exercises.at(-1)
    expect(last?.range).toBeUndefined()
    expect(['Hip-flexor stretch', 'Thoracic rotations', 'Cat-cow', 'Hamstring stretch']).toContain(last?.name)
  }
  // Rotating across a week's workouts, in order.
  expect(firstWeek(mobility, 3).map(w => w.exercises.at(-1)?.name)).toEqual(['Hip-flexor stretch', 'Thoracic rotations', 'Cat-cow'])
})

test('general fitness swaps only the last slot of the last workout of each week', () => {
  const plan = gen({ goal: 'general', size: 'long' })
  const week = firstWeek(plan, 3)
  expect(week[0]?.exercises.at(-1)?.name).toBe('Plank')
  expect(week[2]?.exercises.at(-1)?.name).toBe('Hip-flexor stretch')
  expect(gen({ goal: 'strength', size: 'long' }).workouts[2]?.exercises.at(-1)?.name).toBe('Step-back burpees')
})

test('sizes: short 3 slots × 2 sets, medium 3 × 3, long 4 × 3', () => {
  for (const [size, slots, sets] of [['short', 3, 2], ['medium', 3, 3], ['long', 4, 3]] as const) {
    const workout = gen({ size, goal: 'strength' }).workouts[0]
    expect(workout?.exercises.length).toBe(slots)
    for (const e of workout?.exercises ?? []) expect(e.sets).toBe(sets)
  }
})

test('equipment precedence', () => {
  const pull = (equipment: Equipment, level: Answers['level'] = 'beginner') =>
    gen({ template: 'ppl', goal: 'strength', equipment, level, daysPerWeek: 3, size: 'long' }).workouts[1]?.exercises.map(e => e.name)
  expect(pull({ dumbbells: false, bar: true, bands: false })?.[0]).toBe('Dead hang')
  const barAndDumbbells = pull({ dumbbells: true, bar: true, bands: false })
  expect(barAndDumbbells?.[0]).toBe('Dead hang')
  expect(barAndDumbbells?.[1]).toBe('Dumbbell rows')
  const bands = gen({ template: 'ppl', goal: 'strength', equipment: { dumbbells: false, bar: false, bands: true }, daysPerWeek: 3, size: 'long' })
  expect(names(bands)).toEqual(expect.arrayContaining(['Band rows', 'Band pull-aparts', 'Band curls', 'Band overhead press']))
})

test('the starter plan never uses the floor: no exercise office mode replaces', () => {
  const starter = generateProgram(STARTER_ANSWERS)
  const names = starter.workouts.flatMap(w => w.exercises.map(e => e.name))
  expect(names.filter(name => OFFICE_REPLACED.includes(name))).toEqual([])
  expect(names).toContain('Desk push-ups')
})

test('a slot never repeats an exercise its workout already has', () => {
  // Dumbbells only: PULL1 and PULL2 both look up Dumbbell rows first; PULL2 takes its next row.
  const pull = gen({ template: 'ppl', goal: 'strength', equipment: { dumbbells: true, bar: false, bands: false }, daysPerWeek: 3, size: 'long' }).workouts[1]
  expect(pull?.exercises.map(e => e.name)).toEqual(['Dumbbell rows', 'Reverse snow angels', 'Dumbbell curls', 'Dead bugs'])
})

test('bodyweight only never names dumbbells, bars or bands', () => {
  const wrong: string[] = []
  for (const setting of ['home', 'office'] as const) {
    for (const answers of everyAnswer(setting)) {
      if (Object.values(answers.equipment).some(Boolean)) continue
      for (const e of generateProgram(answers).workouts.flatMap(w => w.exercises)) {
        if (/dumbbell|band|pull-up|chin-up|dead hang/i.test(e.name) || e.weight !== undefined || e.band !== undefined) wrong.push(e.name)
      }
    }
  }
  expect(wrong.slice(0, 10)).toEqual([])
})

test('Push / Pull / Legs: 3 days is each once, 6 days each twice, named by week', () => {
  const three = gen({ template: 'ppl', goal: 'strength', daysPerWeek: 3 })
  expect(three.workouts.length).toBe(12)
  expect(three.workouts.slice(0, 4).map(w => w.name)).toEqual(['Week 1 · Push', 'Week 1 · Pull', 'Week 1 · Legs', 'Week 2 · Push'])
  const six = gen({ template: 'ppl', goal: 'strength', daysPerWeek: 6, schedule: { days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'] } })
  expect(six.workouts.slice(0, 6).map(w => w.name.replace('Week 1 · ', ''))).toEqual(['Push', 'Pull', 'Legs', 'Push', 'Pull', 'Legs'])
  expect(three.name).toBe('Beginner Push / Pull / Legs · 3x/week · 4 weeks')
  expect(gen({}).name).toBe('Beginner general fitness · 3x/week · 4 weeks')
})

test('dumbbell exercises carry their start weight and step in kg and lb; band exercises their levels', () => {
  for (const [level, kg, lb] of [['beginner', 6, 12], ['intermediate', 10, 20], ['advanced', 14, 30]] as const) {
    const inKg = gen({ level, equipment: { dumbbells: true, bar: false, bands: false } }).workouts[0]?.exercises.find(e => e.weight !== undefined)
    expect(inKg?.weight).toEqual({ start: kg, step: 2, unit: 'kg' })
    const inLb = gen({ level, weightUnit: 'lb', equipment: { dumbbells: true, bar: false, bands: false } }).workouts[0]?.exercises.find(e => e.weight !== undefined)
    expect(inLb?.weight).toEqual({ start: lb, step: 5, unit: 'lb' })
  }
  const band = gen({ level: 'intermediate', equipment: { dumbbells: false, bar: false, bands: true }, template: 'ppl', goal: 'strength' })
    .workouts.flatMap(w => w.exercises)
    .find(e => e.band !== undefined)
  expect(band?.band).toEqual({ levels: ['light', 'medium', 'heavy', 'x-heavy'], start: 'medium' })
})

test('every answer combination gives a plan that parses back to itself', { timeoutMs: 30_000 }, () => {
  const MOBILITY = new Set(['Hip-flexor stretch', 'Thoracic rotations', 'Cat-cow', 'Hamstring stretch', "World's greatest stretch", 'Thread the needle', "Child's pose", 'Downward dog'])
  const wrong: string[] = []
  let count = 0
  for (const answers of everyAnswer()) {
    const plan = generateProgram(answers)
    const id = JSON.stringify(answers)
    if (canonical(parsePlan(JSON.stringify(plan))) !== canonical(plan)) wrong.push(`${id}: does not parse back`)
    if (canonical(plan.builtFor) !== canonical(answers.equipment)) wrong.push(`${id}: builtFor`)
    if (plan.workouts.length !== answers.weeks * answers.daysPerWeek) wrong.push(`${id}: workout count`)
    for (const e of plan.workouts.flatMap(w => w.exercises)) {
      if ((e.range === undefined) !== MOBILITY.has(e.name)) wrong.push(`${id}: ${e.name} range`)
    }
    count += 1
  }
  expect(wrong.slice(0, 10)).toEqual([])
  // (designed: 3 goals × 4 day counts; PPL: 2 day counts) × 8 equipment × 3 levels × 3 sizes × 2 lengths
  expect(count).toBe((3 * 4 + 2) * 8 * 3 * 3 * 2)
})

test('an office plan never uses the floor or jumping', () => {
  const wrong: string[] = []
  for (const answers of everyAnswer('office')) {
    for (const name of names(generateProgram(answers))) if (OFFICE_REPLACED.includes(name)) wrong.push(`${JSON.stringify(answers)}: ${name}`)
  }
  expect(wrong.slice(0, 10)).toEqual([])
})

test('office mode leaves equipment exercises as they are', () => {
  const equipment = { dumbbells: true, bar: false, bands: false }
  const home = gen({ equipment, template: 'ppl', goal: 'strength', size: 'long' })
  const office = gen({ equipment, template: 'ppl', goal: 'strength', size: 'long', setting: 'office' })
  const dumbbells = (plan: Plan) => plan.workouts.flatMap(w => w.exercises).filter((e: Exercise) => e.weight !== undefined)
  expect(dumbbells(office)).toEqual(dumbbells(home))
})

// Alternates (owner, 2026-10-06: "add 50 more workouts").

test('fifty-odd more exercises: the slots\' alternates, every one with its own name', () => {
  expect(ALT_NAMES.length).toBeGreaterThanOrEqual(50)
  expect(new Set(ALT_NAMES).size).toBe(ALT_NAMES.length)
})

test('a slot that comes up again in a week takes its next alternate', () => {
  // Three full-body days: legs come up in A and again in C.
  const week = firstWeek(gen({ goal: 'strength', size: 'long', level: 'beginner' }), 3).map(w => w.exercises.map(e => e.name))
  expect(week[0]).toContain('Squats')
  expect(week[2]).toContain('Sumo squats')
  expect(week[2]).not.toContain('Squats')
})

test('within a 4-week block every week is the same; weeks 5 to 8 move every slot one alternate on', () => {
  const plan = gen({ goal: 'strength', size: 'long', weeks: 8 })
  const week = (w: number) => plan.workouts.slice(w * 3, w * 3 + 3).map(x => x.exercises.map(e => e.name))
  for (const w of [1, 2, 3]) expect(week(w)).toEqual(week(0))
  for (const w of [5, 6, 7]) expect(week(w)).toEqual(week(4))
  expect(week(4)).not.toEqual(week(0))
  // Block two's first push is the first alternate.
  expect(week(4)[0]).toContain('Knee push-ups')
})

/** Every home plan's answers and its exercise names, made once for the tests that walk them all. */
let homePlans: { answers: Answers; names: string[] }[] | undefined
const everyHomePlan = () => (homePlans ??= [...everyAnswer()].map(answers => ({ answers, names: names(generateProgram(answers)) })))
const ALL = { timeoutMs: 60_000 }

test('the gear decides: alternates needing what they lack never come up', ALL, () => {
  const wrong: string[] = []
  for (const { answers, names: planNames } of everyHomePlan()) {
    const gear = answers.equipment
    for (const name of planNames) {
      if (!gear.dumbbells && /dumbbell/i.test(name)) wrong.push(name)
      if (!gear.bands && /\bband/i.test(name)) wrong.push(name)
      if (!gear.bar && /pull-up|chin-up|dead hang/i.test(name)) wrong.push(name)
    }
  }
  expect([...new Set(wrong)]).toEqual([])
})

test('office plans never take an alternate', ALL, () => {
  const taken = new Set<string>()
  for (const answers of everyAnswer('office')) for (const name of names(generateProgram(answers))) if (ALT_NAMES.includes(name)) taken.add(name)
  expect([...taken]).toEqual([])
})

test('the alternates are all reachable somewhere, and progress like the rest', ALL, () => {
  const seen = new Set(everyHomePlan().flatMap(plan => plan.names))
  expect(ALT_NAMES.filter(name => !seen.has(name))).toEqual([])
  expect(harderVariant('Knee push-ups', 'home')?.name).toBe('Wide push-ups')
  expect(harderVariant('Lateral lunges', 'home')?.name).toBe('Curtsy lunges')
  expect(harderVariant('Bird dogs', 'home')).toBeNull()
})
