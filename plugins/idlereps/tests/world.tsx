/** The machine beneath the plugin in tests: a plan file, HOME, a store, a fixed clock, and the engine's own answers. */

import { mock } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On, PromptEditInput, PromptEditResult, RenderSurface } from 'claude-code'

import type { Plan, Progress } from '../types'
import { isStoreKey } from '../types/store-keys'
import { UNLOCK_ORDER } from '../hooks/collection'
import { QUESTIONS } from '../hooks/questions'
import { dayNumberOf } from '../hooks/plan'
import { drawMove, moveById, MOVES } from '../hooks/moves'
import { encodeMove } from '../hooks/portrait'
import { SPRITE } from '../hooks/swolomon-sprite'

/** Noon UTC on Friday 2026-10-02. */
export const NOON = Date.UTC(2026, 9, 2, 12)
export const TODAY = dayNumberOf(NOON)

export const SESSION = { cwd: '/work', surface: 'terminal', isInteractive: true } as const

export const PLAN_PATH = '/home/me/.claude/idlereps/plan.json'
export const LEGACY_PATH = '/home/me/.claude/workout-plan.json'

/** `/workout <args>` as the person types it. */
export const workout = (args: string) =>
  ({
    command: 'workout',
    args,
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 100 },
  }) as const

export const BAND = {
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: true,
    maxRows: 10,
    bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 9 },
    view: {},
  },
} as const

/** The options the prototype's tests ran with: a 15-minute gap and a 30 s wait. */
/** The warm-up is off here: the tests of it turn it on. */
export const OPTIONS = { options: { cueEvery: '15', cueAfter: '30', coachAnimation: false, warmUp: false } } as const

/** As OPTIONS, with Swolomon animated: typing, moves, idling, asides. */
export const ANIMATED = { options: { ...OPTIONS.options, coachAnimation: true } } as const

/** Every blit, with where it went and the columns it was drawn at. */
export function blitLog(on: On) {
  const blits: { requestId: string; cells: string; columns: number }[] = []
  on('ui.blit', ($, e) => {
    if ('cells' in e) blits.push({ requestId: e.requestId, cells: e.cells, columns: e.columns ?? 0 })
    return { value: {} }
  })
  return blits
}

/** The band mounted at `bodyColumns` wide. */
export const mountAt = ($: Engine, bodyColumns: number) => $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND, props: { ...BAND.props, bodyColumns } })

/** A move's full-portrait cells, pose by pose. */
export const cellsOf = (id: string): string[] => encodeMove(SPRITE, id, drawMove(moveById(id) ?? MOVES[0]!))

export const TINY: Plan = {
  version: 1,
  name: 'Tiny',
  schedule: { everyNDays: 2 },
  workouts: [
    { name: 'A', exercises: [{ name: 'Push-ups', reps: '10 reps', sets: 2 }] },
    { name: 'B', exercises: [{ name: 'Squats', reps: '20 reps', sets: 1 }] },
  ],
}

export const WEIGHTED: Plan = {
  ...TINY,
  workouts: [
    { name: 'W', exercises: [{ name: 'Goblet squats', reps: '10 reps', sets: 2, weight: { start: 8, step: 2, unit: 'kg' } }] },
  ],
}

export type World = {
  /** The plan file's text, changeable mid-test; null when there is no file. */
  file: { text: string | null; mtimeMs: number }
  writes: { path: string; text: string }[]
  toasts: string[]
  prompt: { text: string }
  /** How many times the plan file was read. */
  planReads: number
  /** Panes opened, and closed by the plugin, by id. */
  opened: string[]
  closed: string[]
  /** Every other file, as last written (or put there by a test). */
  files: Map<string, string>
}

type Seed = Record<string, unknown> | 'own-store'
/** `fresh`: someone Swolomon hasn't walked in yet; otherwise the store says onboarding and the safety note are behind them. */
type WorldOptions = { legacy?: string; now?: number; surfaces?: RenderSurface[]; fresh?: true }

/** Every question of Swolomon's asked, passed on. */
export const ASKED = Object.fromEntries(QUESTIONS.map(q => [q.id, 'pass']))

export const ONBOARDED = {
  onboarded: { at: 1, n: 1 },
  safety: { at: 1, n: 1 },
  // Spot me never due, unless the test is about it (it shares the quiet turns with the questions).
  spotme: { at: 8_640_000_000_000_000, n: 1 },
}

/**
 * The seed as the store starts: onboarding and the safety note already done, every move of Swolomon's
 * already collected (so no unlock band takes a set's place), and every question of his already asked (so
 * none takes a quiet turn), unless the test is about them.
 */
function withOnboarding(seed: Record<string, unknown>, fresh: boolean): Record<string, unknown> {
  if (fresh) return seed
  return { moves: [...UNLOCK_ORDER], about: ASKED, ...seed, seen: { ...ONBOARDED, ...(seed.seen as Record<string, unknown> | undefined) } }
}
type Clock = ReturnType<typeof mock.clock>

/** Every engine answer the plugin needs, the store seeded from `seed`; with `ownClock` the test answers the clock itself. */
export function world(on: On, plan: Plan | null, seed?: Seed, opts?: WorldOptions): { clock: Clock; w: World }
export function world(on: On, plan: Plan | null, seed: Seed, opts: WorldOptions & { ownClock: true }): { clock: null; w: World }
export function world(on: On, plan: Plan | null, seed: Seed = {}, opts: WorldOptions & { ownClock?: true } = {}): { clock: Clock | null; w: World } {
  mock.env(on, { HOME: '/home/me' })
  if (seed !== 'own-store') mock.store(on, withOnboarding(seed, opts.fresh === true))
  const clock = opts.ownClock === true ? null : mock.clock(on, { now: opts.now ?? NOON })
  const w: World = {
    file: { text: plan === null ? null : JSON.stringify(plan), mtimeMs: 1 },
    writes: [],
    toasts: [],
    prompt: { text: '' },
    planReads: 0,
    opened: [],
    closed: [],
    files: new Map(),
  }
  on('fs.stat', ($, e) => {
    if (e.path !== PLAN_PATH || w.file.text === null) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
    return { value: { kind: 'file', size: w.file.text.length, mtimeMs: w.file.mtimeMs, isLink: false } }
  })
  on('fs.read', ($, e) => {
    if (e.path === PLAN_PATH) w.planReads += 1
    return { value: e.path === PLAN_PATH ? (w.file.text ?? '') : e.path === LEGACY_PATH ? (opts.legacy ?? '') : (w.files.get(e.path) ?? '') }
  })
  on('fs.exists', ($, e) => ({ value: (e.path === PLAN_PATH && w.file.text !== null) || (e.path === LEGACY_PATH && opts.legacy !== undefined) || w.files.has(e.path) }))
  on('fs.write', ($, e) => {
    w.writes.push({ path: e.path, text: e.text })
    if (e.path === PLAN_PATH) {
      w.file.text = e.text
      w.file.mtimeMs += 1
    } else w.files.set(e.path, e.text)
    return { value: undefined }
  })
  on('command.register', () => ({ value: { command: 'workout' } }))
  // A terminal session unless a test attaches others.
  on('session.surfaces', () => ({ value: opts.surfaces ?? ['terminal'] }))
  on('ui.toast', ($, e) => {
    w.toasts.push(e.text)
    return { value: undefined }
  })
  // The spinner and the line that closes a turn, drawn as text from their props, so a test can read rewrites.
  on('ui.render', { component: 'Spinner' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text key="spinner">{`${e.props.message ?? e.props.word}${e.props.suffix}`}</Text>
  })
  on('ui.render', { component: 'TurnDuration' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text key="duration">{`${e.props.word} for ${Math.round(e.props.durationMs / 1000)}s`}</Text>
  })
  // The prompt footer's mode labels, drawn as text, so a test can read the plugin's tally there.
  on('ui.render', { component: 'SessionMode' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text key="modes">{e.props.modes.join(' & ')}</Text>
  })
  on('ui.log', () => ({ value: undefined }))
  on('ui.open', ($, e) => {
    w.opened.push(e.id)
    return { value: { isPlaced: true } }
  })
  on('ui.close', ($, e) => {
    w.closed.push(e.id)
    return { value: undefined }
  })
  on('prompt.read', () => ({ value: { text: w.prompt.text, cursor: w.prompt.text.length } }))
  // The prompt box: an edit applies its splice.
  on('prompt.edit', ($, e) => {
    const text = `${e.text.slice(0, e.start)}${e.inputText}${e.text.slice(e.end)}`
    w.prompt.text = text
    return { text, cursor: e.start + e.inputText.length }
  })
  on('session.start', () => ({ cwd: '/work' }))
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  // Tools the agent calls during a test answer at once unless a test hooks them itself.
  on('tool.call', () => ({ result: { stdout: '', stderr: '' } }))
  // The engine's own band, drawn when the plugin has nothing to show.
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text key="engine">prompt</Text>
  })
  return { clock, w }
}

/** A store the test holds itself (with `world`'s 'own-store' seed): read it, or change it between steps. */
export function ownStore(on: On, seed: Record<string, unknown> = {}, opts: { fresh?: true } = {}) {
  const store = new Map<string, unknown>(Object.entries(withOnboarding(seed, opts.fresh === true)))
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
  return store
}

/** A seeded store: progress, and anything else. */
export const seeded = (progress: Progress, rest: Record<string, unknown> = {}) => ({ progress, ...rest })

export { isStoreKey }

/**
 * A clock that counts the timers the plugin starts and never fires them (`release` lets them go at the end):
 * for tests about whether a timer is started at all.
 */
export function countingClock(on: On) {
  const held: (() => void)[] = []
  const counter = { timers: 0, release: () => held.splice(0).forEach(go => go()) }
  on('clock.now', () => ({ value: NOON }))
  on('clock.after', async () => {
    counter.timers += 1
    await new Promise<void>(resolve => held.push(resolve))
    return { value: undefined }
  })
  return counter
}

/**
 * A clock that never fires and knows which timers are live: a timer the plugin cancels aborts its wait
 * (`next.signal`). `live()` lists the live timers' lengths in ms, in the order they were started.
 */
export function liveClock(on: On) {
  const live = new Map<number, number>()
  let made = 0
  on('clock.now', () => ({ value: NOON }))
  on('clock.after', async ($, e, next) => {
    const id = (made += 1)
    live.set(id, e.ms)
    next.signal?.addEventListener('abort', () => live.delete(id))
    await new Promise<void>(() => {})
    return { value: undefined }
  })
  return { live: () => [...live.values()] }
}

/** One edit of the prompt box: typing `text` over what is there, or clearing it with ''. */
export const typing = (before: string, after: string): PromptEditInput => ({
  origin: { kind: 'composer' },
  text: before,
  cursor: before.length,
  start: 0,
  end: before.length,
  inputText: after,
})

/**
 * Raises `prompt.edit` as the composer does. The engine's `$` in tests carries it, but the test kit's
 * `Engine` type (2.1.287) leaves it out of `prompt`, so this is the one place that says so.
 */
export const editPrompt = ($: Engine, e: PromptEditInput): Promise<PromptEditResult> =>
  ($.prompt as unknown as { edit: (e: PromptEditInput) => Promise<PromptEditResult> }).edit(e)

const PANE_PROPS = {
  title: 'IdleReps',
  isFocused: true,
  bodyColumns: 80,
  placement: 'dock',
  scroll: { offset: 0, bodyRows: 30 },
  view: {},
} as const

/** The setup dialog, as a mount target. */
export const SETUP = { component: 'Pane', requestId: 'workout-setup', props: { ...PANE_PROPS, title: 'Set up IdleReps' } } as const
/** The status pane, as a mount target. */
export const STATUS = { component: 'Pane', requestId: 'workout-status', props: PANE_PROPS } as const

/** The tally the plugin puts in the prompt footer (`💪 1/2`), or undefined when it shows none. */
export async function tallyOf($: Engine): Promise<string | undefined> {
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', component: 'SessionMode', props: { modes: [] } })
  const text = textOf((await ui.drawn()) as Drawn)
  await ui.unmount()
  return text === '' ? undefined : text
}

/** Whether Swolomon speaks on a drawn band: his name tag (text-only form) or his portrait. */
export const speaks = async (ui: { find: (q: { type?: string; key?: string; text?: string }) => Promise<unknown> }) =>
  (await ui.find({ type: 'Text', text: 'Swolomon:' })) !== undefined || (await ui.find({ key: 'swolomon' })) !== undefined

type Drawn = { type?: string; props?: Record<string, unknown>; children?: (Drawn | string)[] }

/** A drawn element's text as a person reads it: nested pieces joined, a Button as its numbered label. */
export function textOf(node: Drawn | string): string {
  if (typeof node === 'string') return node
  const props = node.props ?? {}
  const label = typeof props.label === 'string' ? (props.plain === true ? `${String(props.hotkey)}: ${props.label}` : props.label) : ''
  return (node.children ?? []).map(textOf).join('') + label
}

/**
 * The rows of a drawn band or pane, top to bottom, as text: a column's rows in turn, and beside a portrait
 * (a row holding a Raster) the text column's rows; the portrait itself is left out.
 */
export function drawnRows(tree: unknown): string[] {
  const rows: string[] = []
  const walk = (node: Drawn | string, isTop: boolean) => {
    if (typeof node === 'string') {
      rows.push(node.trimEnd())
      return
    }
    const kids = node.children ?? []
    const hasPortrait = kids.some(c => typeof c !== 'string' && c.type === 'Raster')
    if (hasPortrait && node.props?.flexDirection === 'row') walk(kids.at(-1) ?? '', false)
    else if (node.type === 'Box' && (isTop || node.props?.flexDirection === 'column')) kids.forEach(kid => walk(kid, false))
    else if (node.type !== 'Raster') rows.push(textOf(node).trimEnd())
  }
  walk(tree as Drawn, true)
  return rows
}
