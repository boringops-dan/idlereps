/**
 * The exercise library and the program generator (plan §5). Pure and deterministic: the same answers always
 * give the same plan.
 */

import type { Answers, Equipment, Exercise, Plan, Variant, Workout } from '../types'

type Unit = 'reps' | 's' | 'each leg' | 'each side' | 's each side'
type Requires = 'any' | keyof Equipment
type Level = Answers['level']
type Entry = { name: string; value: number; unit: Unit }
type Row = { requires: Requires; levels: [Entry, Entry, Entry] }
type Slot =
  | 'PUSH1' | 'PUSH2' | 'TRI' | 'PULL1' | 'PULL2' | 'CURL' | 'LEGS1' | 'LEGS2' | 'GLUTE' | 'CALF' | 'WALL'
  | 'PLANK' | 'DEADBUG' | 'SIDEPLANK' | 'CARDIO' | 'MOB1' | 'MOB2' | 'MOB3' | 'MOB4'

const LEVELS: readonly Level[] = ['beginner', 'intermediate', 'advanced']

const e = (name: string, value: number, unit: Unit): Entry => ({ name, value, unit })
/** A row whose exercise is the same at every level, with three values. */
const same = (requires: Requires, name: string, unit: Unit, values: [number, number, number]): Row => ({
  requires,
  levels: [e(name, values[0], unit), e(name, values[1], unit), e(name, values[2], unit)],
})

/** §5.1: each slot's rows in precedence order; the first whose requirement the equipment meets wins. */
export const LIBRARY: Record<Slot, Row[]> = {
  PUSH1: [{ requires: 'any', levels: [e('Incline push-ups', 10, 'reps'), e('Push-ups', 12, 'reps'), e('Decline push-ups', 12, 'reps')] }],
  PUSH2: [
    same('dumbbells', 'Dumbbell overhead press', 'reps', [8, 10, 12]),
    same('bands', 'Band overhead press', 'reps', [10, 12, 15]),
    { requires: 'any', levels: [e('Wall push-ups', 15, 'reps'), e('Pike push-ups', 8, 'reps'), e('Pike push-ups', 12, 'reps')] },
  ],
  TRI: [
    same('dumbbells', 'Dumbbell overhead triceps extension', 'reps', [10, 12, 15]),
    same('any', 'Chair dips', 'reps', [6, 10, 15]),
  ],
  PULL1: [
    { requires: 'bar', levels: [e('Dead hang', 20, 's'), e('Pull-up negatives', 5, 'reps'), e('Pull-ups', 8, 'reps')] },
    same('dumbbells', 'Dumbbell rows', 'each side', [10, 12, 15]),
    same('bands', 'Band rows', 'reps', [12, 15, 20]),
    same('any', 'Superman hold', 's', [20, 30, 40]),
  ],
  PULL2: [
    same('dumbbells', 'Dumbbell rows', 'each side', [10, 12, 15]),
    same('bands', 'Band pull-aparts', 'reps', [15, 20, 25]),
    same('any', 'Reverse snow angels', 'reps', [10, 12, 15]),
  ],
  CURL: [
    same('dumbbells', 'Dumbbell curls', 'reps', [10, 12, 15]),
    same('bands', 'Band curls', 'reps', [12, 15, 20]),
    same('bar', 'Chin-up hold (top position)', 's', [10, 20, 30]),
    same('any', 'Prone Y-raises', 'reps', [10, 12, 15]),
  ],
  LEGS1: [
    same('dumbbells', 'Goblet squats', 'reps', [10, 12, 15]),
    { requires: 'any', levels: [e('Squats', 12, 'reps'), e('Squats', 20, 'reps'), e('Jump squats', 15, 'reps')] },
  ],
  LEGS2: [
    same('dumbbells', 'Dumbbell Romanian deadlifts', 'reps', [10, 12, 15]),
    same('any', 'Reverse lunges', 'each leg', [6, 10, 12]),
  ],
  GLUTE: [
    same('bands', 'Banded glute bridges', 'reps', [12, 15, 20]),
    { requires: 'any', levels: [e('Glute bridges', 12, 'reps'), e('Glute bridges', 15, 'reps'), e('Single-leg glute bridges', 10, 'each leg')] },
  ],
  CALF: [{ requires: 'any', levels: [e('Calf raises', 15, 'reps'), e('Calf raises', 20, 'reps'), e('Single-leg calf raises', 12, 'each leg')] }],
  WALL: [same('any', 'Wall sit', 's', [20, 40, 60])],
  PLANK: [same('any', 'Plank', 's', [20, 40, 60])],
  DEADBUG: [same('any', 'Dead bugs', 'reps', [8, 12, 16])],
  SIDEPLANK: [same('any', 'Side plank', 's each side', [15, 25, 40])],
  CARDIO: [{ requires: 'any', levels: [e('Step-back burpees', 6, 'reps'), e('Burpees', 6, 'reps'), e('Burpees', 10, 'reps')] }],
  MOB1: [same('any', 'Hip-flexor stretch', 's each side', [30, 30, 30])],
  MOB2: [same('any', 'Thoracic rotations', 'each side', [8, 8, 8])],
  MOB3: [same('any', 'Cat-cow', 'reps', [10, 10, 10])],
  MOB4: [same('any', 'Hamstring stretch', 's each side', [30, 30, 30])],
}

/** One alternate: an exercise (per level) a slot can take instead, and what it needs. */
type Alt = { requires: Requires; levels: [Entry, Entry, Entry] }
const alt = (requires: Requires, levels: [Entry, Entry, Entry]): Alt => ({ requires, levels })
/** An alternate with the same exercise at every level, three values. */
const alt3 = (requires: Requires, name: string, unit: Unit, values: [number, number, number]): Alt => same(requires, name, unit, values)

/**
 * Each slot's alternates (owner, 2026-10-06: "add 50 more workouts"), taken in turn after the slot's own pick
 * (`resolveSlot`): the second time a slot comes up in a week, the next one; in weeks 5 to 8, one further on.
 * Never in an office plan (office mode keeps its standing, quiet list).
 */
export const ALTS: Record<Slot, Alt[]> = {
  PUSH1: [
    alt('any', [e('Knee push-ups', 10, 'reps'), e('Wide push-ups', 10, 'reps'), e('Diamond push-ups', 10, 'reps')]),
    alt('any', [e('Plank shoulder taps', 16, 'reps'), e('Plank shoulder taps', 24, 'reps'), e('Archer push-ups', 6, 'each side')]),
  ],
  PUSH2: [
    alt3('dumbbells', 'Dumbbell Arnold press', 'reps', [8, 10, 12]),
    alt3('dumbbells', 'Dumbbell lateral raises', 'reps', [10, 12, 15]),
    alt3('bands', 'Band lateral raises', 'reps', [12, 15, 20]),
    alt3('any', 'Hindu push-ups', 'reps', [5, 8, 12]),
  ],
  TRI: [
    alt3('dumbbells', 'Dumbbell triceps kickbacks', 'reps', [10, 12, 15]),
    alt3('bands', 'Band triceps pushdowns', 'reps', [12, 15, 20]),
    alt3('any', 'Close-grip push-ups', 'reps', [6, 8, 12]),
  ],
  PULL1: [
    alt3('bar', 'Scapular pull-ups', 'reps', [6, 8, 10]),
    alt3('dumbbells', 'Dumbbell renegade rows', 'each side', [6, 8, 10]),
    alt3('bands', 'Band lat pulldowns', 'reps', [12, 15, 20]),
    alt3('any', 'Prone W-raises', 'reps', [10, 12, 15]),
  ],
  PULL2: [
    alt3('dumbbells', 'Dumbbell reverse flys', 'reps', [10, 12, 15]),
    alt3('bands', 'Band face pulls', 'reps', [12, 15, 20]),
    alt3('any', 'Prone T-raises', 'reps', [10, 12, 15]),
  ],
  CURL: [
    alt3('dumbbells', 'Dumbbell hammer curls', 'reps', [10, 12, 15]),
    alt3('bands', 'Band hammer curls', 'reps', [12, 15, 20]),
    alt3('bar', 'Chin-ups', 'reps', [3, 5, 8]),
    alt3('any', 'Towel curls', 'reps', [10, 12, 15]),
  ],
  LEGS1: [
    alt3('dumbbells', 'Dumbbell sumo squats', 'reps', [10, 12, 15]),
    alt('any', [e('Sumo squats', 12, 'reps'), e('Pulse squats', 15, 'reps'), e('Pistol squat negatives', 5, 'each leg')]),
  ],
  LEGS2: [
    alt3('dumbbells', 'Dumbbell step-ups', 'each leg', [8, 10, 12]),
    alt3('dumbbells', 'Dumbbell Bulgarian split squats', 'each leg', [6, 8, 10]),
    alt('any', [e('Lateral lunges', 6, 'each side'), e('Curtsy lunges', 10, 'each leg'), e('Jumping lunges', 8, 'each leg')]),
    alt('any', [e('Step-ups', 8, 'each leg'), e('Bulgarian split squats', 6, 'each leg'), e('Bulgarian split squats', 10, 'each leg')]),
  ],
  GLUTE: [
    alt3('bands', 'Banded lateral walks', 'each side', [10, 12, 15]),
    alt('any', [e('Donkey kicks', 10, 'each leg'), e('Fire hydrants', 12, 'each leg'), e('Frog pumps', 20, 'reps')]),
  ],
  CALF: [alt3('any', 'Tibialis raises', 'reps', [12, 15, 20])],
  WALL: [alt3('any', 'Squat hold', 's', [20, 30, 45])],
  PLANK: [alt3('any', 'Hollow hold', 's', [15, 20, 30]), alt3('any', 'Bear crawl hold', 's', [15, 25, 35])],
  DEADBUG: [
    alt3('any', 'Bird dogs', 'each side', [8, 10, 12]),
    alt('any', [e('Reverse crunches', 10, 'reps'), e('Bicycle crunches', 16, 'reps'), e('Bicycle crunches', 24, 'reps')]),
  ],
  SIDEPLANK: [alt3('any', 'Side plank hip dips', 'each side', [8, 10, 12])],
  CARDIO: [
    alt('any', [e('Jumping jacks', 20, 'reps'), e('Mountain climbers', 20, 'reps'), e('Mountain climbers', 30, 'reps')]),
    alt('any', [e('High knees', 20, 's'), e('Skaters', 12, 'reps'), e('Skaters', 20, 'reps')]),
  ],
  MOB1: [alt3('any', "World's greatest stretch", 'each side', [5, 5, 5])],
  MOB2: [alt3('any', 'Thread the needle', 'each side', [8, 8, 8])],
  MOB3: [alt3('any', "Child's pose", 's', [30, 30, 30])],
  MOB4: [alt3('any', 'Downward dog', 's', [30, 30, 30])],
}

/** Every exercise a slot's alternates can name (the library's other exercises, for the move and copy checks). */
export const ALT_NAMES: readonly string[] = [...new Set(Object.values(ALTS).flatMap(alts => alts.flatMap(a => a.levels.map(entry => entry.name))))]

const MOB_SLOTS: readonly Slot[] = ['MOB1', 'MOB2', 'MOB3', 'MOB4']

/** §5.1 notes, fixed. */
export const NOTES: Record<string, string> = {
  'Incline push-ups': 'a sturdy desk or counter',
  'Pull-up negatives': 'jump up, lower for 3-5 s',
  'Superman hold': 'lie face down, lift arms and legs',
  'Dead hang': 'shoulders engaged',
  'Chair dips': "a sturdy chair that won't slide",
  'Band pull-aparts': 'arms straight, squeeze shoulder blades',
  'Prone Y-raises': 'lie face down, thumbs up',
  'Desk push-ups': 'hands on the desk edge, body straight',
  'Close-grip desk push-ups': 'hands close on the desk edge, elbows in',
  'Standing cat-cow': 'hands on your thighs, round then arch',
  'Hip-flexor stretch': 'standing, one foot back, hips forward',
  'Hamstring stretch': 'standing, one heel forward, hinge at the hips',
  'Desk plank': 'forearms on the desk, body straight',
  'Wall angels': 'back and arms flat to the wall',
  'Plank shoulder taps': 'hips stay still',
  'Archer push-ups': 'shift onto one arm, the other straight',
  'Hindu push-ups': 'hips high, then swoop through',
  'Band triceps pushdowns': 'band anchored high, elbows at your sides',
  'Scapular pull-ups': 'arms straight, pull your shoulders down',
  'Band lat pulldowns': 'band anchored high, pull to your chest',
  'Band face pulls': 'band at face height, pull toward your eyes',
  'Towel curls': 'a towel under one foot, pull against it',
  'Pistol squat negatives': 'lower slowly on one leg to a chair',
  'Step-ups': 'a sturdy step or low bench',
  'Dumbbell step-ups': 'a sturdy step or low bench',
  'Bulgarian split squats': 'back foot on a sturdy chair',
  'Dumbbell Bulgarian split squats': 'back foot on a sturdy chair',
  'Hollow hold': 'lower back pressed to the floor',
  'Tibialis raises': 'back against a wall, lift your toes',
}

/** §5.1a: office replacements by the looked-up name, per level. Office mode never uses the floor or jumping. */
export const OFFICE: Record<string, [Entry, Entry, Entry]> = (() => {
  const by = (name: string, unit: Unit, values: [number, number, number]): [Entry, Entry, Entry] => [
    e(name, values[0], unit),
    e(name, values[1], unit),
    e(name, values[2], unit),
  ]
  const desk = by('Desk push-ups', 'reps', [10, 15, 20])
  const angels = by('Wall angels', 'reps', [8, 10, 12])
  const kickbacks = by('Standing glute kickbacks', 'each leg', [12, 15, 20])
  const march = by('March in place', 's', [30, 45, 60])
  return {
    'Push-ups': desk,
    'Decline push-ups': desk,
    'Incline push-ups': desk,
    'Pike push-ups': by('Wall push-ups', 'reps', [15, 20, 25]),
    'Superman hold': angels,
    'Reverse snow angels': angels,
    'Prone Y-raises': by('Standing Y-raises', 'reps', [10, 12, 15]),
    'Jump squats': by('Squats', 'reps', [25, 25, 25]),
    'Glute bridges': kickbacks,
    'Single-leg glute bridges': kickbacks,
    'Banded glute bridges': kickbacks,
    Plank: by('Desk plank', 's', [30, 45, 60]),
    'Dead bugs': by('Standing knee-to-elbow', 'each side', [10, 12, 15]),
    'Side plank': by('Standing side bends', 'each side', [10, 12, 15]),
    'Step-back burpees': march,
    Burpees: march,
    'Cat-cow': by('Standing cat-cow', 'reps', [10, 10, 10]),
    'Chair dips': by('Close-grip desk push-ups', 'reps', [10, 12, 15]),
    // A bar in the office: hang from it, never jump to it.
    'Pull-up negatives': by('Dead hang', 's', [20, 30, 40]),
  }
})()

/** The exercises office mode replaces: never in an office plan. */
export const OFFICE_REPLACED: readonly string[] = Object.keys(OFFICE)

/** Every push exercise the library can name, office swaps included: what makes a Monday Chest Day (§1.13.4). */
export const PUSH_NAMES: ReadonlySet<string> = new Set(
  (['PUSH1', 'PUSH2', 'TRI'] as const).flatMap(slot =>
    [...LIBRARY[slot], ...ALTS[slot]].flatMap(row => row.levels.flatMap(entry => [entry.name, ...(OFFICE[entry.name] ?? []).map(swap => swap.name)])),
  ),
)

const meets = (equipment: Equipment, requires: Requires) => requires === 'any' || equipment[requires]

/** A row's entry at a level, after office substitution. */
function entryAt(row: Row, level: number, setting: Answers['setting']): Entry {
  const entry = row.levels[level] ?? row.levels[0]
  if (setting !== 'office') return entry
  return OFFICE[entry.name]?.[level] ?? entry
}

export const repsText = (value: number, unit: Unit): string => (unit === 'reps' ? `${value} reps` : `${value} ${unit}`)

const isTimedUnit = (unit: Unit) => unit === 's' || unit === 's each side'

/** The double-progression range (§5.3): reps [base, round(base × 1.5)], timed [base, base × 2]. */
export const rangeOf = (value: number, unit: Unit): [number, number] =>
  isTimedUnit(unit) ? [value, value * 2] : [value, Math.round(value * 1.5)]

const DUMBBELL_START: Record<'kg' | 'lb', [number, number, number]> = { kg: [6, 10, 14], lb: [12, 20, 30] }
const DUMBBELL_STEP = { kg: 2, lb: 5 } as const
export const BAND_LEVELS = ['light', 'medium', 'heavy', 'x-heavy'] as const

function exerciseOf(picked: { entry: Entry; requires: Requires; isReplaced: boolean }, answers: Answers, sets: number, isMobility: boolean): Exercise {
  const { entry, requires, isReplaced } = picked
  const level = LEVELS.indexOf(answers.level)
  const exercise: Exercise = { name: entry.name, reps: repsText(entry.value, entry.unit), sets }
  if (!isMobility) exercise.range = rangeOf(entry.value, entry.unit)
  const note = NOTES[entry.name]
  if (note !== undefined) exercise.note = note
  // An office replacement is bodyweight, whatever row it replaced.
  if (requires === 'dumbbells' && !isReplaced) {
    const unit = answers.weightUnit
    exercise.weight = { start: DUMBBELL_START[unit][level] ?? 6, step: DUMBBELL_STEP[unit], unit }
  }
  if (requires === 'bands' && !isReplaced) {
    exercise.band = { levels: [...BAND_LEVELS], start: BAND_LEVELS[level] ?? 'light' }
  }
  return exercise
}

/**
 * Resolves a slot for a workout: the first row the equipment meets whose exercise is not already in the
 * workout (a slot never repeats an exercise the workout has; with no other row, the repeat stands).
 */
function resolveSlot(slot: Slot, answers: Answers, taken: ReadonlySet<string>, turn = 0): { entry: Entry; requires: Requires; isReplaced: boolean } {
  const level = LEVELS.indexOf(answers.level)
  const rows = LIBRARY[slot].filter(row => meets(answers.equipment, row.requires))
  const pick = rows.find(row => !taken.has(entryAt(row, level, answers.setting).name)) ?? rows[0]
  if (pick === undefined) throw new Error(`slot ${slot} has no row for this equipment`)
  const own = { entry: entryAt(pick, level, answers.setting), requires: pick.requires, isReplaced: answers.setting === 'office' && OFFICE[pick.levels[level]?.name ?? ''] !== undefined }
  if (answers.setting === 'office') return own
  // Its turn: the slot's own pick first, then each alternate the equipment allows, in order.
  const options = [own, ...ALTS[slot].filter(a => meets(answers.equipment, a.requires)).map(a => ({ entry: a.levels[level] ?? a.levels[0], requires: a.requires, isReplaced: false }))]
  for (let i = 0; i < options.length; i += 1) {
    const option = options[(turn + i) % options.length]
    if (option !== undefined && !taken.has(option.entry.name)) return option
  }
  return own
}

type Template = { name: string; slots: Slot[] }

const PPL: Template[] = [
  { name: 'Push', slots: ['PUSH1', 'PUSH2', 'TRI', 'PLANK'] },
  { name: 'Pull', slots: ['PULL1', 'PULL2', 'CURL', 'DEADBUG'] },
  { name: 'Legs', slots: ['LEGS1', 'LEGS2', 'GLUTE', 'CALF'] },
]

const DESIGNED: Record<2 | 3 | 4 | 5, Template[]> = {
  2: [
    { name: 'Full body A', slots: ['PUSH1', 'LEGS1', 'PULL1', 'PLANK'] },
    { name: 'Full body B', slots: ['LEGS2', 'PUSH2', 'PULL2', 'CARDIO'] },
  ],
  3: [
    { name: 'Full body A', slots: ['PUSH1', 'LEGS1', 'PULL1', 'PLANK'] },
    { name: 'Full body B', slots: ['LEGS2', 'PUSH2', 'PULL2', 'SIDEPLANK'] },
    { name: 'Full body C', slots: ['LEGS1', 'PULL1', 'PUSH2', 'CARDIO'] },
  ],
  4: [
    { name: 'Upper A', slots: ['PUSH1', 'PULL1', 'PUSH2', 'PLANK'] },
    { name: 'Lower A', slots: ['LEGS1', 'LEGS2', 'GLUTE', 'SIDEPLANK'] },
    { name: 'Upper B', slots: ['PULL1', 'PUSH1', 'PULL2', 'DEADBUG'] },
    { name: 'Lower B', slots: ['LEGS2', 'WALL', 'LEGS1', 'CARDIO'] },
  ],
  5: [
    { name: 'Push', slots: ['PUSH1', 'PUSH2', 'PLANK', 'DEADBUG'] },
    { name: 'Legs', slots: ['LEGS1', 'LEGS2', 'GLUTE', 'WALL'] },
    { name: 'Pull', slots: ['PULL1', 'PULL2', 'SIDEPLANK', 'PLANK'] },
    { name: 'Core and cardio', slots: ['PLANK', 'CARDIO', 'DEADBUG', 'SIDEPLANK'] },
    { name: 'Full body', slots: ['PUSH1', 'LEGS1', 'PULL1', 'CARDIO'] },
  ],
}

/** One week's workout templates, in order. */
function weekTemplates(answers: Answers): Template[] {
  if (answers.template === 'ppl') return answers.daysPerWeek === 6 ? [...PPL, ...PPL] : PPL
  const days = answers.daysPerWeek
  if (days === 6) throw new Error('a designed plan is 2 to 5 days a week')
  return DESIGNED[days]
}

const SIZE = { short: { slots: 3, sets: 2 }, medium: { slots: 3, sets: 3 }, long: { slots: 4, sets: 3 } } as const

/**
 * One week of workouts: size trimming, then the goal swaps (§5.2), then each slot resolved, a slot that comes
 * up again in the week taking its next alternate; `block` (weeks 5 to 8: 1) moves every slot one further on.
 */
function buildWeek(answers: Answers, block = 0): Workout[] {
  const goal = answers.template === 'ppl' ? 'strength' : answers.goal
  const size = SIZE[answers.size]
  const templates = weekTemplates(answers)
  let mob = 0
  const nextMob = (): Slot => MOB_SLOTS[mob++ % MOB_SLOTS.length] ?? 'MOB1'
  const seen = new Map<Slot, number>()
  return templates.map((template, i) => {
    const slots = template.slots.slice(0, size.slots)
    const last = slots.length - 1
    if (goal === 'mobility' || (goal === 'general' && i === templates.length - 1)) slots[last] = nextMob()
    const taken = new Set<string>()
    const exercises = slots.map(slot => {
      const turn = (seen.get(slot) ?? 0) + block
      seen.set(slot, (seen.get(slot) ?? 0) + 1)
      const picked = resolveSlot(slot, answers, taken, turn)
      taken.add(picked.entry.name)
      return exerciseOf(picked, answers, size.sets, slot.startsWith('MOB'))
    })
    return { name: template.name, exercises }
  })
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const capitalized = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`

export function planNameOf(answers: Answers): string {
  const level = capitalized(answers.level)
  const what =
    answers.template === 'ppl'
      ? 'Push / Pull / Legs'
      : { strength: 'strength', general: 'general fitness', mobility: 'mobility' }[answers.goal]
  return `${level} ${what} · ${answers.daysPerWeek}x/week · ${answers.weeks} weeks`
}

/** Weeks in a block: within one, every week is the same; the next block takes the slots' next alternates. */
const BLOCK_WEEKS = 4

/** §5: the whole program, `weeks × daysPerWeek` workouts, every week of a 4-week block the same. */
export function generateProgram(answers: Answers): Plan {
  const blocks = new Map<number, Workout[]>()
  const workouts: Workout[] = []
  for (let w = 0; w < answers.weeks; w += 1) {
    const block = Math.floor(w / BLOCK_WEEKS)
    const week = blocks.get(block) ?? buildWeek(answers, block)
    blocks.set(block, week)
    for (const workout of week) {
      workouts.push({ name: `Week ${w + 1} · ${workout.name}`, exercises: workout.exercises.map(ex => clone(ex)) })
    }
  }
  return {
    version: 1,
    name: planNameOf(answers),
    schedule: answers.schedule,
    workouts,
    builtFor: { ...answers.equipment },
    answers: clone(answers),
  }
}

/**
 * Office mode's next steps (its swaps are one exercise at every level): standing and quiet, each with its own
 * demo. An exercise not here, nor further along its library row, has no harder variant.
 */
export const OFFICE_HARDER: Record<string, Entry> = {
  'Wall push-ups': e('Desk push-ups', 10, 'reps'),
  'Desk push-ups': e('Close-grip desk push-ups', 10, 'reps'),
  Squats: e('Pulse squats', 12, 'reps'),
  'Pulse squats': e('Bulgarian split squats', 8, 'each leg'),
  'Reverse lunges': e('Bulgarian split squats', 8, 'each leg'),
}

/**
 * The next level's different exercise for an exercise: office mode's own step-up, else the library row's next level (after office substitution),
 * with that level's base and range; null at the top, for same-name rows, and for names not in the library.
 */
export function harderVariant(exerciseName: string, setting: Answers['setting']): Variant | null {
  const office = setting === 'office' ? OFFICE_HARDER[exerciseName] : undefined
  if (office !== undefined) return { name: office.name, reps: repsText(office.value, office.unit), range: rangeOf(office.value, office.unit) }
  for (const rows of [...Object.values(LIBRARY), ...Object.values(ALTS)]) {
    for (const row of rows) {
      const names = [0, 1, 2].map(level => entryAt(row, level, setting))
      const at = names.map(entry => entry.name).lastIndexOf(exerciseName)
      if (at < 0) continue
      const next = names[at + 1]
      if (next === undefined || next.name === exerciseName) return null
      return { name: next.name, reps: repsText(next.value, next.unit), range: rangeOf(next.value, next.unit) }
    }
  }
  return null
}

/**
 * The starter plan Quick start writes (plan §1.5): no gear and no floor (office mode's standing and desk
 * moves), so the first set can be done right there at the desk, in work clothes, in under a minute.
 */
export const STARTER_ANSWERS: Answers = {
  template: 'designed',
  goal: 'general',
  equipment: { dumbbells: false, bar: false, bands: false },
  level: 'beginner',
  daysPerWeek: 3,
  setting: 'office',
  schedule: { days: ['mon', 'wed', 'fri'] },
  size: 'short',
  weeks: 4,
  weightUnit: 'kg',
}

/**
 * Rest-day desk stretches: standing or seated, no floor, no gear, one at a time. One a rest day, the day
 * picking which, so a week of rest days walks the list.
 */
export const DESK_STRETCHES: readonly { name: string; seconds: number; note: string }[] = [
  { name: 'Neck rolls', seconds: 30, note: 'Slow circles, then the other way.' },
  { name: 'Chest opener', seconds: 30, note: 'Hands clasped behind you, lift your chest.' },
  { name: 'Seated twist', seconds: 30, note: 'Hand on the far knee, turn and look back. Both sides.' },
  { name: 'Wrist stretch', seconds: 30, note: 'Arm out, palm up, ease the fingers back. Both hands.' },
  { name: 'Standing hamstring stretch', seconds: 30, note: 'Heel on a low step, hinge forward. Both legs.' },
  { name: 'Shoulder rolls', seconds: 30, note: 'Big slow circles, backwards.' },
  { name: 'Calf raises and reach', seconds: 30, note: 'Up on your toes, arms overhead, slow down.' },
]

export const stretchFor = (day: number) => DESK_STRETCHES[((day % DESK_STRETCHES.length) + DESK_STRETCHES.length) % DESK_STRETCHES.length] ?? DESK_STRETCHES[0]!
