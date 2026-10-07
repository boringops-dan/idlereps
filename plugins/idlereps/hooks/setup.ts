/**
 * The setup dialog (plan §1.2): its screens, their copy and choices, and the order they come in. Pure: the
 * pane draws a screen from here, and a choice returns the next state.
 */

import type { Answers, Equipment, Plan, Schedule, SetupScreen, SetupState, Weekday } from '../types'
import { FAILURE_TEXT, SAFETY_TEXT } from './copy'
import { generateProgram } from './programs'
import { stepsOf } from './plan'

export const START_COPY =
  'IdleReps fits your plan to the equipment you actually have. Pick a ready-made split, have one designed ' +
  'for you, or drop in your own.'

export const EQUIPMENT_COPY =
  'Tick everything you have, even a single resistance band: the plan is built around it. Have something ' +
  "that isn't listed (a kettlebell, a bench, a gym)? Go back and choose \"I'll bring my own plan\" and " +
  'describe it, equipment included.'

export const BYO_COPY = (planPath: string) => [
  "Describe your plan in plain words, including the equipment you'll use, and I'll turn it into a plan:",
  '/workout plan 5x5 squats with dumbbells, pull-ups, push-ups, Mon Wed Fri',
  `Or write the file yourself: ${planPath} (format in the README).`,
]

/** The README's example plan, for Copy example. */
export const EXAMPLE_PLAN = JSON.stringify(
  {
    name: 'My plan',
    schedule: { days: ['mon', 'wed', 'fri'] },
    workouts: [
      {
        name: 'Full body',
        exercises: [
          { name: 'Squats', reps: '12 reps', range: [12, 18], sets: 3 },
          { name: 'Push-ups', reps: '8 reps', range: [8, 12], sets: 3, note: 'knees down is fine' },
          { name: 'Goblet squats', reps: '10 reps', range: [10, 15], sets: 2, weight: { start: 10, step: 2, unit: 'kg' } },
          { name: 'Plank', reps: '20 s', range: [20, 40], sets: 2 },
        ],
      },
    ],
  },
  null,
  2,
)

export const TELEMETRY_COPY =
  'Counts like sets done and workouts rated, with a random id. Never your exercises, plan, files or prompts. ' +
  'Change it any time in the plugin settings.'

/** `hotkey`: its own key, where the answer is a count (3 days is `3`); else its place in the list. */
export type Choice = { label: string; hotkey?: string; apply: (state: SetupState) => SetupState }

const answer = (patch: Partial<Answers>) => (state: SetupState): SetupState => ({
  ...state,
  answers: { ...state.answers, ...patch },
})

/** Q5 presets per days a week (§1.2). */
export const PRESETS: Record<number, Weekday[][]> = {
  2: [['mon', 'thu'], ['tue', 'fri'], ['sat', 'sun']],
  3: [['mon', 'wed', 'fri'], ['tue', 'thu', 'sat'], ['sun', 'tue', 'thu']],
  4: [['mon', 'tue', 'thu', 'fri'], ['mon', 'wed', 'fri', 'sat']],
  5: [['mon', 'tue', 'wed', 'thu', 'fri'], ['sun', 'mon', 'tue', 'wed', 'thu']],
  6: [['mon', 'tue', 'wed', 'thu', 'fri', 'sat'], ['sun', 'mon', 'tue', 'wed', 'thu', 'fri']],
}

const DAY_LABEL: Record<Weekday, string> = { sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat' }
const ORDER: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

/** "Mon, Wed, Fri"; five or six days in a row read "Mon to Fri". */
export function presetLabel(days: readonly Weekday[]): string {
  if (days.length >= 5) {
    const first = days[0]
    const last = days[days.length - 1]
    if (first !== undefined && last !== undefined) return `${DAY_LABEL[first]} to ${DAY_LABEL[last]}`
  }
  if (days.length === 2) return days.map(d => DAY_LABEL[d]).join(' + ')
  return days.map(d => DAY_LABEL[d]).join(', ')
}

export function scheduleLabel(schedule: Schedule): string {
  if ('everyNDays' in schedule) {
    return schedule.everyNDays === 2 ? 'any days, with a rest day between' : `every ${schedule.everyNDays} days`
  }
  const sorted = [...schedule.days].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b))
  return sorted.map(d => DAY_LABEL[d]).join(' ')
}

export function equipmentLabel(equipment: Equipment | undefined): string {
  if (equipment === undefined) return 'Your own plan.'
  const have = [equipment.dumbbells && 'dumbbells', equipment.bar && 'a pull-up bar', equipment.bands && 'resistance bands'].filter(
    (x): x is string => typeof x === 'string',
  )
  return have.length === 0 ? 'bodyweight only (no equipment)' : have.join(', ')
}

/** Picks a template; a days-a-week answer the template does not offer goes back to 3, with its schedule. */
function withTemplate(state: SetupState, template: Answers['template']): SetupState {
  const allowed: readonly number[] = template === 'ppl' ? [3, 6] : [2, 3, 4, 5]
  const answers: Partial<Answers> = { ...state.answers, template, ...(template === 'ppl' ? { goal: 'strength' as const } : {}) }
  if (answers.daysPerWeek !== undefined && !allowed.includes(answers.daysPerWeek)) {
    delete answers.daysPerWeek
    delete answers.schedule
  }
  if (template === 'designed' && state.answers.template === 'ppl') delete answers.goal
  return { ...state, answers }
}

export type Screen = {
  title: string
  copy?: string[]
  /**
   * Drawn after the buttons. A pane above the prompt grows only to a cap, and what it cuts is its last rows
   * (owner, 2026-10-07: the summary's Start plan was cut, so the plan was never saved): the buttons go above
   * anything long, so a short pane cuts only this.
   */
  more?: string[]
  choices?: Choice[]
  /** The choice drawn as primary: the current answer, else the default. */
  primary?: number
}

const CUE_EVERY = [
  ['10', 'Every 10 minutes'],
  ['15', 'Every 15 minutes'],
  ['30', 'Every 30 minutes'],
  ['60', 'Every hour'],
] as const
const IDLE = [
  ['60', 'Every hour'],
  ['120', 'Every 2 hours'],
  ['off', 'No'],
] as const

/** Every question in order; `goal` is not asked for Push / Pull / Legs, nor Q10 while telemetry is not live (D9). */
const SCREEN_ORDER: readonly SetupScreen[] = ['start', 'goal', 'equipment', 'setting', 'level', 'days', 'schedule', 'size', 'weeks', 'cueEvery', 'idleReminder', 'telemetry', 'summary']

/** The screen after `screen` on the way to the summary. */
function after(screen: SetupScreen, state: SetupState): SetupScreen {
  if (screen === 'safety') return 'start'
  const order = SCREEN_ORDER.filter(s => !(s === 'goal' && state.answers.template === 'ppl') && !(s === 'telemetry' && state.telemetry === undefined))
  return order[order.indexOf(screen) + 1] ?? 'summary'
}

/** Moves on from the current screen, remembering it for Back. */
export const forward = (state: SetupState, to?: SetupScreen): SetupState => ({
  ...state,
  screen: to ?? after(state.screen, state),
  trail: [...state.trail, state.screen],
})

/** Back to the previous screen, answers kept. */
export const back = (state: SetupState): SetupState => {
  const previous = state.trail.at(-1)
  return previous === undefined ? state : { ...state, screen: previous, trail: state.trail.slice(0, -1) }
}

const indexOr = <T>(list: readonly T[], found: number) => (found < 0 ? 0 : found)

/** The answers with every default filled in: what Start plan builds from. */
export function completeAnswers(partial: Partial<Answers>): Answers {
  const template = partial.template ?? 'designed'
  const daysPerWeek = partial.daysPerWeek ?? 3
  const equipment = partial.equipment ?? { dumbbells: false, bar: false, bands: false }
  return {
    template,
    goal: template === 'ppl' ? 'strength' : (partial.goal ?? 'general'),
    equipment,
    level: partial.level ?? 'beginner',
    daysPerWeek,
    setting: partial.setting ?? 'home',
    weightUnit: equipment.dumbbells ? (partial.weightUnit ?? 'kg') : 'kg',
    schedule: partial.schedule ?? { days: PRESETS[daysPerWeek]?.[0] ?? ['mon', 'wed', 'fri'] },
    size: partial.size ?? 'short',
    weeks: partial.weeks ?? 4,
  }
}

/** The plan the summary describes and Start plan writes. */
export const planOf = (state: SetupState): Plan => generateProgram(completeAnswers(state.answers))

/** What each screen shows and offers. */
export function screenOf(state: SetupState, planPath: string): Screen {
  const a = completeAnswers(state.answers)
  switch (state.screen) {
    case 'safety':
      return { title: 'Before you start', copy: [SAFETY_TEXT] }
    case 'start':
      return {
        title: 'How do you want to start?',
        copy: [START_COPY],
        choices: [
          { label: 'Standard Push / Pull / Legs', apply: s => forward(withTemplate(s, 'ppl'), 'equipment') },
          { label: 'Design one for me', apply: s => forward(withTemplate(s, 'designed'), 'goal') },
          { label: "I'll bring my own plan", apply: s => forward(s, 'byo') },
        ],
      }
    case 'byo':
      return { title: 'Bring your own plan', copy: BYO_COPY(planPath) }
    case 'goal': {
      const goals = [
        ['strength', 'Get stronger'],
        ['general', 'General fitness'],
        ['mobility', 'Move more and loosen up'],
      ] as const
      return {
        title: "What's the goal?",
        choices: goals.map(([goal, label]) => ({ label, apply: s => forward(answer({ goal })(s)) })),
        primary: indexOr(goals, goals.findIndex(([goal]) => goal === a.goal)),
      }
    }
    case 'equipment':
      return { title: 'What equipment do you have?', copy: [EQUIPMENT_COPY] }
    case 'setting': {
      const settings = [
        ['home', 'Home (floor exercises are fine)'],
        ['office', 'Office or shared space (standing only, quiet)'],
      ] as const
      return {
        title: 'Where do you usually work?',
        choices: settings.map(([setting, label]) => ({ label, apply: s => forward(answer({ setting })(s)) })),
        primary: indexOr(settings, settings.findIndex(([setting]) => setting === a.setting)),
      }
    }
    case 'level': {
      const levels = [
        ['beginner', 'New to this'],
        ['intermediate', 'Some experience'],
        ['advanced', 'I train regularly'],
      ] as const
      return {
        title: 'Where are you starting?',
        choices: levels.map(([level, label]) => ({ label, apply: s => forward(answer({ level })(s)) })),
        primary: indexOr(levels, levels.findIndex(([level]) => level === a.level)),
      }
    }
    case 'days': {
      const options: { days: Answers['daysPerWeek']; label: string }[] =
        a.template === 'ppl'
          ? [
              { days: 3, label: '3 (each day once)' },
              { days: 6, label: '6 (each day twice)' },
            ]
          : [2, 3, 4, 5].map(days => ({ days: days as Answers['daysPerWeek'], label: String(days) }))
      return {
        title: 'How many days a week?',
        choices: options.map(({ days, label }) => ({
          label,
          hotkey: String(days),
          apply: s => {
            const keepsSchedule = s.answers.daysPerWeek === days
            const next = answer({ daysPerWeek: days })(s)
            if (!keepsSchedule) delete next.answers.schedule
            return forward(next)
          },
        })),
        primary: indexOr(options, options.findIndex(({ days }) => days === a.daysPerWeek)),
      }
    }
    case 'schedule': {
      const presets = PRESETS[a.daysPerWeek] ?? []
      const choices: Choice[] = presets.map(days => ({ label: presetLabel(days), apply: s => forward(answer({ schedule: { days } })(s)) }))
      if (a.daysPerWeek !== 6) {
        choices.push({ label: 'Any days, with a rest day between', apply: s => forward(answer({ schedule: { everyNDays: 2 } })(s)) })
      }
      const current = a.schedule
      const found =
        'everyNDays' in current
          ? choices.length - 1
          : presets.findIndex(days => days.length === current.days.length && days.every((d, i) => current.days[i] === d))
      return { title: 'Which days?', choices, primary: indexOr(choices, found) }
    }
    case 'size': {
      const sizes = [
        ['short', 'Short (about 6 sets)'],
        ['medium', 'Medium (about 9)'],
        ['long', 'Long (about 12)'],
      ] as const
      return {
        title: 'How big is each workout?',
        choices: sizes.map(([size, label]) => ({ label, apply: s => forward(answer({ size })(s)) })),
        primary: indexOr(sizes, sizes.findIndex(([size]) => size === a.size)),
      }
    }
    case 'weeks': {
      const weeks = [
        [4, '4 weeks'],
        [8, '8 weeks'],
      ] as const
      return {
        title: 'How long is the program?',
        choices: weeks.map(([w, label]) => ({ label, apply: s => forward(answer({ weeks: w })(s)) })),
        primary: indexOr(weeks, weeks.findIndex(([w]) => w === a.weeks)),
      }
    }
    case 'cueEvery':
      return {
        title: 'How often should I give you a set?',
        choices: CUE_EVERY.map(([value, label]) => ({ label, apply: s => forward({ ...s, cueEvery: value }) })),
        primary: indexOr(CUE_EVERY, CUE_EVERY.findIndex(([value]) => value === state.cueEvery)),
      }
    case 'idleReminder':
      return {
        title: "Remind me when I'm not doing it?",
        choices: IDLE.map(([value, label]) => ({ label, apply: s => forward({ ...s, idleReminder: value }) })),
        primary: indexOr(IDLE, IDLE.findIndex(([value]) => value === state.idleReminder)),
      }
    case 'telemetry': {
      const shares = [
        [true, 'Yes'],
        [false, 'No'],
      ] as const
      return {
        title: 'Share anonymous usage to help improve it?',
        copy: [TELEMETRY_COPY],
        choices: shares.map(([telemetry, label]) => ({ label, apply: s => forward({ ...s, telemetry }) })),
        primary: indexOr(shares, shares.findIndex(([telemetry]) => telemetry === state.telemetry)),
      }
    }
    case 'summary': {
      const { head, rest } = summaryOf(state)
      return { title: 'Your plan', copy: head, more: rest }
    }
  }
}

/**
 * The summary screen (Q11): its head (the plan, what it is built for, the schedule) above Start plan, and the
 * rest (the first workout, what happens next, the notes) below it.
 */
export function summaryOf(state: SetupState): { head: string[]; rest: string[] } {
  const plan = planOf(state)
  const first = plan.workouts[0]
  const sets = first === undefined ? [] : stepsOf(first)
  return {
    head: [plan.name, `Built for: ${equipmentLabel(plan.builtFor)}`, `Schedule: ${scheduleLabel(plan.schedule)}`],
    rest: [
      `First workout: ${first?.name ?? ''}, ${sets.length} sets`,
      ...(first?.exercises ?? []).map(ex => `  ${ex.name}: ${ex.reps} × ${ex.sets}`),
      "What happens next: I'll ask once while your agent is working, then hand you one set at a time.",
      FAILURE_TEXT,
      SAFETY_TEXT,
    ],
  }
}

/** A new setup, at the safety step until it is acknowledged; Change plan starts from the plan's answers. */
export function newSetup(opts: {
  isSafetyAcknowledged: boolean
  isQuickStart: boolean
  answers?: Answers
  cueEvery: string
  idleReminder: string
  /** The current telemetry option, passed only while telemetry is live: Q10 is asked then. */
  telemetry?: boolean
}): SetupState {
  return {
    screen: opts.isSafetyAcknowledged ? 'start' : 'safety',
    trail: [],
    answers: opts.answers === undefined ? {} : { ...opts.answers },
    cueEvery: opts.cueEvery,
    idleReminder: opts.idleReminder,
    ...(opts.telemetry === undefined ? {} : { telemetry: opts.telemetry }),
    isQuickStart: opts.isQuickStart,
  }
}

/** The equipment screen's toggles. */
export const toggleEquipment = (state: SetupState, key: keyof Equipment): SetupState => {
  const equipment = state.answers.equipment ?? { dumbbells: false, bar: false, bands: false }
  return { ...state, answers: { ...state.answers, equipment: { ...equipment, [key]: !equipment[key] } } }
}

export const setUnit = (state: SetupState, weightUnit: Answers['weightUnit']): SetupState => ({
  ...state,
  answers: { ...state.answers, weightUnit },
})

/** Continue on the equipment screen: nothing ticked means bodyweight only. */
export const continueEquipment = (state: SetupState): SetupState =>
  forward({
    ...state,
    answers: { ...state.answers, equipment: state.answers.equipment ?? { dumbbells: false, bar: false, bands: false } },
  })
