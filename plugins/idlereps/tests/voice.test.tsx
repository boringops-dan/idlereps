import { expect, test } from 'claude-code/testing'
import type { RenderElement } from 'claude-code'

import type { Plan } from '../types'
import { ACTIONS } from '../hooks/actions'
import { SEASONS } from '../hooks/season'
import {
  ADDRESS_TERMS,
  AGENT_JOBS,
  agentDoing,
  COACH_NAME,
  emphasisRuns,
  fill,
  introLines,
  line,
  LINES,
  LONG_TURN_MS,
  pickAddress,
  plainOf,
  RELEASES,
  replayLines,
  variantOf,
  whatsNewLine,
} from '../hooks/copy'
import type { LineId } from '../hooks/copy'
import { RANKS } from '../hooks/history'
import { PORTRAIT_GAP } from '../hooks/portrait'
import { LIBRARY } from '../hooks/programs'
import { BAND, NOON, OPTIONS, SESSION, SETUP, speaks, STATUS, tallyOf, TINY, TODAY, WEIGHTED, workout, world, ownStore } from './world'

/** Swolomon's voice and the line registry (plan §1.10 to §1.10c, §1.13.2, D22, Task 15). */

const RANK_LINES: readonly LineId[] = RANKS.flatMap(rank => (rank.line === null ? [] : [rank.line]))
const LONGEST_TERM = [...ADDRESS_TERMS].sort((a, b) => b.length - a.length)[0] ?? ''
const LONGEST_AGENT = AGENT_JOBS.flatMap(j => j.beats).sort((a, b) => b.length - a.length)[0] ?? ''
/** The longest workout name in §5.2, without its week. */
const LONGEST_WORKOUT = 'Core and cardio'
const EXERCISES = [...new Set(Object.values(LIBRARY).flatMap(rows => rows.flatMap(row => row.levels.map(e => e.name))))]
/** Lines drawn in a band row, held to 80 columns. */
const BAND_LINES: readonly LineId[] = ['pulse-ask', 'restore-ask', 'erase-ask', 'plan-file-stays', 'warmup', 'program-end-detail', 'stretch-note', 'where-detail', 'intro-header', 'ask-detail', 'how-it-works', 'how-it-works-later', 'first-logged', 'lead-working', 'lead-idle', 'hint', 'edit-question', 'edit-typed', 'edit-typed-weight']

const FILLS = {
  coach: COACH_NAME,
  agentDoing: LONGEST_AGENT,
  workout: LONGEST_WORKOUT,
  nextWorkout: LONGEST_WORKOUT,
  n: 999,
  then: 9999,
  now: 9999,
  weekday: 'Wednesday',
  nextDay: 'Wednesday',
  when: 'Wednesday',
  exercise: 'Dumbbell overhead triceps extension',
  amount: '15 reps at 14 kg',
  name: 'Intermediate general fitness · 5x/week · 8 weeks',
  path: '/home/me/.claude/idlereps/plan.json',
  reason: 'reason',
  version: '1.0.0',
  notes: 'notes',
  id: 'edit',
  safety: 'safety',
  workouts: 40,
  schedule: 'Mon Wed Fri',
  status: 'status',
  sets: 9999,
  worked: '23 h 59 m',
  competition: 'the Galaxy Classic',
  gym: 'a-long-project-name-here…',
  what: 'Cardio',
  ideas: 'a minute of jumping jacks · a minute of high knees · 10 lunges a leg',
  week: 9999,
  total: 33,
  next: 'Next one in 99 sets.',
  wait: 'about 55 min',
  minutes: '12 h 45 min',
  from: 'Wednesday',
  to: 'Wednesday',
  time: '1 min',
  list: 'Dumbbell overhead triceps extension 15 reps @ 14 kg',
  date: 'Sep 30, 2026',
  url: 'https://github.com/boringops-dan/idlereps/discussions',
  max: '2,000',
  backup: '/home/me/.claude/idlereps/backup.json',
  text: 'This week my agent worked 99 h 59 m while I did 9999 sets. Rank: Iron Disciple. idlereps.app',
}

/** Every variant of every line, filled with the longest values, for every day of a week of variants. */
function* everyLine(): Generator<{ id: LineId; voice: string; text: string }> {
  for (const entry of LINES) {
    for (const variant of entry.variants) {
      yield { id: entry.id, voice: entry.voice, text: fill(variant, { ...FILLS, mate: LONGEST_TERM }) }
      for (let day = 0; day < ADDRESS_TERMS.length; day += 1) {
        yield { id: entry.id, voice: entry.voice, text: fill(variant, { ...FILLS, mate: pickAddress(day, entry.id) }) }
      }
    }
  }
}

/** Calling the person a shrimp: "you" and "shrimp" in one sentence ("I was the shrimp. Look at you now." is fine). */
const callsShrimp = (text: string) => text.split(/(?<=[.!?])\s+/).some(sentence => /\byou\b/i.test(sentence) && /shrimp/i.test(sentence))

const words = (text: string, list: readonly string[]) => list.filter(w => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text))

test('every variant is reachable, and a day always picks the same variant and term', () => {
  for (const entry of LINES) {
    const seen = new Set<number>()
    for (let day = 0; day < 30; day += 1) seen.add(variantOf(entry.id, day).index)
    expect([entry.id, seen.size]).toEqual([entry.id, entry.variants.length])
    if (entry.voice === 'swolomon') {
      expect(line(entry.id, { day: TODAY, ...FILLS })).toBe(line(entry.id, { day: TODAY, ...FILLS }))
    }
  }
  const terms = new Set<string>()
  for (let day = 0; day < 30; day += 1) terms.add(pickAddress(day, 'set'))
  expect(terms.size).toBe(ADDRESS_TERMS.length)
})

test('every Swolomon line has exactly one address term, every plain line none; no term is a rank', () => {
  const wrong: string[] = []
  for (const { voice, text } of everyLine()) {
    const found = words(text, ADDRESS_TERMS)
    if (voice === 'swolomon' ? found.length !== 1 : found.length !== 0) wrong.push(text)
  }
  expect(wrong.slice(0, 10)).toEqual([])
  for (const term of ADDRESS_TERMS) expect(RANKS.map(r => r.name.toLowerCase())).not.toContain(term)
})

test('lines fit: Swolomon’s and band rows within 80 columns, his band lines within 70 beside his name', () => {
  const wrong: string[] = []
  // Toasts, and the tall bands' lines (§1.10b: up to 8 rows), are never drawn beside a name tag in a short band.
  const TOASTS: readonly LineId[] = [
    'day-toast',
    'shiny-first',
    'where-am-i',
    'new-gym',
    'not-spotted',
    'prep-start',
    'prep-diet',
    'prep-posing',
    'prep-peak',
    'prep-halfway',
    'prep-ready',
    'answer-noted',
    'stood-logged',
    'target-hit',
    'greet-missed',
    'greet-long-away',
    'greet-yesterday',
    'greet-yesterday-moved',
    'greet-yesterday-agent',
    'not-today',
    'recap',
    'recap-zero',
    'feat-first-set',
    'feat-perfect-workout',
    'feat-three-in-a-row',
    'feat-full-week',
    'protein',
    'wisdom',
    'replay-close',
    'week-done',
    'week-one-done',
    ...SEASONS.map(season => season.greeting),
    'anniversary',
    ...RANK_LINES,
  ]
  for (const { id, voice, text } of everyLine()) {
    if (voice === 'swolomon' && text.length > 80) wrong.push(`${text.length} ${text}`)
    if (voice === 'swolomon' && !TOASTS.includes(id) && text.length > 80 - `${COACH_NAME}: `.length) wrong.push(`band ${text.length} ${text}`)
    if (BAND_LINES.includes(id) && text.length > 80) wrong.push(`${text.length} ${text}`)
  }
  expect(wrong).toEqual([])
})

test('Swolomon stays in character: no exercise names, no code words, never Claude', () => {
  const CODE = ['code', 'commit', 'bug', 'deploy', 'prompt', 'token', 'function', 'virtual', 'screen', 'computer', 'terminal', 'app']
  const wrong: string[] = []
  for (const { voice, text } of everyLine()) {
    if (/(?<![./])claude/i.test(text)) wrong.push(`claude: ${text}`)
    if (voice !== 'swolomon') continue
    for (const name of EXERCISES) if (text.toLowerCase().includes(name.toLowerCase())) wrong.push(`exercise: ${text}`)
    if (words(text, CODE).length > 0) wrong.push(`code: ${text}`)
    if (/your agent/i.test(text) === false && /\bagent\b/i.test(text)) wrong.push(`agent: ${text}`)
  }
  for (const text of introLines(TODAY)) if (words(text, CODE).length > 0 || /claude/i.test(text)) wrong.push(`intro: ${text}`)
  expect(wrong).toEqual([])
})

test('no line shames, comments on bodies, uses gendered words, names an amount, or calls the person a shrimp', () => {
  const BANNED = ['lazy', 'weak', 'soft', 'pathetic', 'excuse', 'fat', 'skinny', 'burn', 'bro', 'king', 'queen', 'dude', 'man', 'girl', 'he', 'his', 'him', 'she', 'her', 'hers']
  const wrong: string[] = []
  for (const { text } of everyLine()) {
    if (words(text, BANNED).length > 0) wrong.push(text)
    if (/\d+\s*(g|grams)\b/i.test(text)) wrong.push(text)
    if (callsShrimp(text)) wrong.push(text)
  }
  for (const text of introLines(TODAY)) {
    if (words(text, BANNED).length > 0 || callsShrimp(text)) wrong.push(text)
  }
  expect(wrong).toEqual([])
})

test('the introduction, verbatim, its address term only in the last line', () => {
  for (let day = 0; day < ADDRESS_TERMS.length; day += 1) {
    const lines = introLines(day)
    const mate = pickAddress(day, 'intro-header')
    expect(lines).toEqual([
      "Hi! I'm Swolomon, your personal trainer.",
      'Welcome to my... your CLI. Cardio, Lifts and Ibuprofen.',
      "*You* hand your agent work? Well, *I* hand *you* work.",
      `Quick start, or just a nudge to move, ${mate}?`,
    ])
    expect(lines.map(l => words(l, ADDRESS_TERMS).length)).toEqual([0, 0, 0, 1])
    for (const l of lines) expect(fill(l, {}).length).toBeLessThanOrEqual(80)
  }
  // Emphasis: the stars mark it and never show.
  expect(plainOf(introLines(0)[2] ?? '')).toBe('You hand your agent work? Well, I hand you work.')
  expect(emphasisRuns('*You* hand, *I* hand *you*')).toEqual([
    { text: 'You', isEmphasis: true },
    { text: ' hand, ', isEmphasis: false },
    { text: 'I', isEmphasis: true },
    { text: ' hand ', isEmphasis: false },
    { text: 'you', isEmphasis: true },
  ])
  // Part of a line out, mid-word: still emphasized; no line has an unclosed star.
  expect(emphasisRuns('*Yo')).toEqual([{ text: 'Yo', isEmphasis: true }])
  for (const entry of LINES) for (const variant of entry.variants) expect(variant.split('*').length % 2).toBe(1)
  expect(line('intro-header', { day: 0 })).toBe('IdleReps · a workout plan and tracker, while your agent works')
})

test('the first-run band: header, four lines, live buttons; /workout swolomon replays it and changes nothing', OPTIONS, async ($, on) => {
  const store = ownStore(on)
  const { w } = world(on, null, 'own-store')
  await $.session.start(SESSION)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  for (const text of introLines(TODAY)) expect(await ui.find({ type: 'Text', text: plainOf(text) })).toBeDefined()
  // *I* drawn in italics, its stars gone.
  const italic = (await ui.findAll({ type: 'Text' })).filter(t => (t as { props: { italic?: boolean } }).props.italic === true)
  expect(italic.map(t => (t as { text?: string }).text)).toEqual(['You', 'I', 'you'])
  expect(JSON.stringify(await ui.drawn())).not.toContain('*')
  // Header, four lines and the buttons beside the 8-row portrait: the tall band's budget, exactly (§1.10b).
  expect(await ui.find({ key: 'swolomon' })).toBeDefined()
  expect(rowsOf(await ui.drawn(), BAND.props.bodyColumns)).toBe(8)
  await ui.press({ key: 'program' })
  await ui.press({ key: 'setup' })
  expect(w.opened).toEqual(['workout-setup'])
  // With a plan: the replay ends on the plan being ready, offers Let's go, and writes nothing.
  w.file.text = JSON.stringify(TINY)
  const before = JSON.stringify([...store.entries()])
  await $.command.run(workout('swolomon'))
  for (const text of replayLines(TODAY)) expect(await ui.find({ type: 'Text', text: plainOf(text) })).toBeDefined()
  expect(await ui.find({ key: 'program' })).toBeUndefined()
  expect(await ui.find({ key: 'letsgo' })).toBeDefined()
  expect(JSON.stringify([...store.entries()])).toBe(before)
  await $.turn.start({ text: 'go', turnId: 't1' })
  expect(await ui.find({ type: 'Text', text: introLines(TODAY)[0] ?? '' })).toBeUndefined()
  await ui.unmount()
})

// ---------------------------------------------------------------------------------------------------------
// Row budgets (§1.10b), counted as drawn at 80 columns.

/**
 * Rows a drawn band takes at `columns`: each row of the column wraps at the edge; truncating text never does.
 * With the portrait beside the text, the band is as tall as the taller of the two.
 */
function rowsOf(tree: RenderElement, columns = 80): number {
  const top = tree as { children?: (RenderElement | string)[] }
  const raster = top.children?.find(c => typeof c !== 'string' && c.type === 'Raster') as { props: { columns: number; rows: number } } | undefined
  const text = top.children?.at(-1)
  if (raster !== undefined && text !== undefined && typeof text !== 'string') {
    return Math.max(raster.props.rows, rowsOf(text, columns - raster.props.columns - PORTRAIT_GAP))
  }
  // Beside an SVG portrait (no terminal cells): the text's rows, or the picture's at 16 px a row.
  const svg = top.children?.find(c => typeof c !== 'string' && c.type === 'Svg') as { props: { height: number } } | undefined
  if (svg !== undefined && text !== undefined && typeof text !== 'string') return Math.max(Math.ceil(svg.props.height / 16), rowsOf(text, columns))
  const textOf = (el: RenderElement | string): { wraps: string; cut: string } => {
    if (typeof el === 'string') return { wraps: el, cut: '' }
    const own = el as { props?: Record<string, unknown>; children?: (RenderElement | string)[] }
    const props = own.props ?? {}
    const kids = (own.children ?? []).map(textOf)
    const label = typeof props.label === 'string' ? (props.plain === true ? `${String(props.hotkey)}: ${props.label}` : props.label) : ''
    const all = kids.map(k => k.wraps).join('') + label
    const cut = kids.map(k => k.cut).join('')
    if (props.wrap === 'truncate-end') return { wraps: '', cut: all + cut }
    return { wraps: all, cut }
  }
  const children = ((tree as { children?: (RenderElement | string)[] }).children ?? []).filter(c => typeof c !== 'string' || c.trim() !== '')
  return children.reduce((rows, child) => rows + Math.max(1, Math.ceil(textOf(child).wraps.length / columns)), 0)
}

const LONG: Plan = {
  ...TINY,
  workouts: [
    {
      name: 'Week 8 · Core and cardio',
      exercises: [
        { name: 'Dumbbell overhead triceps extension', reps: '15 reps', range: [15, 23], sets: 3, note: "a sturdy chair that won't slide", weight: { start: 14, step: 2, unit: 'kg' } },
      ],
    },
  ],
}

for (const surface of ['terminal', 'desktop'] as const) {
  test(`every band kind fits its row budget at 80 columns on ${surface}`, OPTIONS, async ($, on) => {
    const { clock } = world(on, LONG, { lastByExercise: { 'Dumbbell overhead triceps extension': { last: { kind: 'set', t: 1, d: 1, w: 0, exercise: 'Dumbbell overhead triceps extension', set: 1, target: '15 reps', result: 'done', count: 15, weight: 14 }, best: {} } } })
    const narrow = { ...BAND, props: { ...BAND.props, bodyColumns: 80 } }
    const ui = await $.ui.mount({ plugin: 'idlereps', surface, ...narrow })
    const rows = async () => rowsOf(await ui.drawn())
    await $.session.start(SESSION)
    // Ask-first, opened by a sign: Swolomon · detail · buttons.
    await $.turn.start({ text: 'go', turnId: 't1' })
    await $.tool.call({ tool: 'Agent', description: 'x', prompt: 'y', subagent_type: 'Explore' } as never)
    await clock.advance(5_000)
    expect(['ask', await rows()]).toEqual(['ask', 4])
    // The first set after Start speaks, with the form note and the control hint: 4 + 2.
    await ui.press({ key: 'start' })
    expect(['set speaking', await rows()]).toEqual(['set speaking', 7])
    // Edit: question · values · buttons · typed hint.
    await ui.press({ key: 'edit' })
    expect(['edit', await rows()]).toEqual(['edit', 5])
    await ui.press({ key: 'save' })
    // The first set ever adds one row: what happens next; and his celebration above it (owner, 2026-10-06).
    expect(['logged, first ever', await rows()]).toEqual(['logged, first ever', surface === 'terminal' ? 3 : 4])
    // A later set is silent; no form note after the first set; the hint still shows (bands 2 and 3).
    await $.command.run(workout('now'))
    // Later sets have his line too now (owner, 2026-10-06): one row more.
    expect(['set, later', await rows()]).toEqual(['set, later', 6])
    await ui.press({ key: 'skip' })
    expect(['logged after a skip', await rows()]).toEqual(['logged after a skip', 2])
    await $.command.run(workout('now'))
    expect(['set, later', await rows()]).toEqual(['set, later', 6])
    await ui.press({ key: 'done' })
    // The plan's one week-8 workout: finishing it crosses the week's finish line, a tall band (§1.10b).
    expect(['rating, week done', (await rows()) <= 8]).toEqual(['rating, week done', true])
    await ui.unmount()
  })
}

test('a silent set band (Quiet) without the note or hint is 4 rows, the blank above its buttons', { options: { ...OPTIONS.options, coachChat: 'quiet' } }, async ($, on) => {
  world(on, TINY, { seen: { hint: { at: 1, n: 3 } } })
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  await $.command.run(workout('now'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'done' })).toBeDefined()
  expect(rowsOf(await ui.drawn())).toBe(4)
  await ui.unmount()
})

// ---------------------------------------------------------------------------------------------------------
// Regression coverage: Swolomon speaks on the first set after Start, and on no other set band.

const coachRow = speaks

test('Start from the ask band: the first set speaks', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(30_000)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await ui.press({ key: 'start' })
  expect(await ui.find({ type: 'Text', text: line('set', { day: TODAY }) })).toBeDefined()
  await ui.unmount()
})

test('/workout now on a day not yet started counts as Start and speaks', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('now'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await coachRow(ui)).toBe(true)
  await ui.unmount()
})

test('/workout now after today was started: his set line, not the Start line; Quiet: silent', OPTIONS, async ($, on) => {
  world(on, TINY, { startedOn: TODAY })
  await $.session.start(SESSION)
  await $.command.run(workout('now'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'done' })).toBeDefined()
  expect(await coachRow(ui)).toBe(true)
  expect(await ui.find({ type: 'Text', text: line('set', { day: TODAY }) })).toBeUndefined()
  await ui.unmount()
})

test('a set started yesterday is a new Start today and speaks again', OPTIONS, async ($, on) => {
  world(on, TINY, { startedOn: TODAY - 1, progress: { workout: 0, done: 1, lastCompletedOn: null, extraDay: null } })
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await coachRow(ui)).toBe(true)
  await ui.unmount()
})

test('the set Undo brings back is silent in Quiet, and so is /workout today mid-workout', { options: { ...OPTIONS.options, coachChat: 'quiet' } }, async ($, on) => {
  world(on, { ...TINY, workouts: [{ name: 'A', exercises: [{ name: 'Push-ups', reps: '10 reps', sets: 3 }] }] })
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await ui.press({ key: 'done' })
  await ui.press({ key: 'undo' })
  expect(await ui.find({ key: 'done' })).toBeDefined()
  expect(await coachRow(ui)).toBe(false)
  await ui.press({ key: 'done' })
  await $.command.run(workout('today'))
  expect(await ui.find({ type: 'Text', text: /set 2 of 3/ })).toBeDefined()
  expect(await coachRow(ui)).toBe(false)
  await ui.unmount()
})

// ---------------------------------------------------------------------------------------------------------
// Regression coverage: the first-run band leaves once a plan exists, however it came.

test('a plan written by hand dismisses the first-run band at the next prompt', OPTIONS, async ($, on) => {
  const { w } = world(on, null)
  await $.session.start(SESSION)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'program' })).toBeDefined()
  w.file.text = JSON.stringify(TINY)
  await $.turn.start({ text: 'go', turnId: 't1' })
  expect(await ui.find({ key: 'program' })).toBeUndefined()
  await ui.unmount()
})

test('with the first-run band gone, the same turn can cue', OPTIONS, async ($, on) => {
  const { clock, w } = world(on, null)
  await $.session.start(SESSION)
  w.file.text = JSON.stringify(TINY)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(30_000)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'start' })).toBeDefined()
  await ui.unmount()
})

test('a session start that finds a plan clears a first-run band left from before', OPTIONS, async ($, on) => {
  const { w } = world(on, null)
  await $.session.start(SESSION)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  w.file.text = JSON.stringify(TINY)
  await $.session.start(SESSION)
  expect(await ui.find({ key: 'program' })).toBeUndefined()
  await ui.unmount()
})

test('with no plan, the next prompt leaves the first-run band in place', OPTIONS, async ($, on) => {
  world(on, null)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'program' })).toBeDefined()
  await ui.unmount()
})

test('Set up my plan, finished, takes the first-run band down', OPTIONS, async ($, on) => {
  world(on, null, { seen: { safety: { at: 1, n: 1 } } })
  await $.session.start(SESSION)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await ui.press({ key: 'program' })
  await ui.press({ key: 'setup' })
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...SETUP })
  await pane.press({ key: 'choice-2' })
  for (const key of ['choice-1', 'continue', 'choice-1', 'choice-1', 'choice-1', 'choice-1', 'choice-1', 'choice-1', 'choice-1', 'choice-1']) await pane.press({ key })
  await pane.press({ key: 'start-plan' })
  expect(await ui.find({ key: 'program' })).toBeUndefined()
  await pane.unmount()
  await ui.unmount()
})

// ---------------------------------------------------------------------------------------------------------
// The control hint (§1.1 step 4).

test('the control hint shows on the first three set bands ever, across a reload', OPTIONS, async ($, on) => {
  const hint = line('hint', { day: TODAY })
  world(on, WEIGHTED, { seen: { hint: { at: 1, n: 2 } } })
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: hint })).toBeDefined()
  await ui.press({ key: 'done' })
  await $.command.run(workout('start'))
  expect(await ui.find({ key: 'done' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: hint })).toBeUndefined()
  await ui.unmount()
})

// ---------------------------------------------------------------------------------------------------------
// What Swolomon says: one ordering test per slot Phase A builds (§1.10c).

test('ask-first slot: a sign’s reason, else pick up, else ask first', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY, { progress: { workout: 0, done: 1, lastCompletedOn: null, extraDay: null } })
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(30_000)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  // Started on an earlier day: pick up.
  expect(await ui.find({ type: 'Text', text: line('pick-up', { day: TODAY, workout: 'A', n: 1 }) })).toBeDefined()
  await ui.press({ key: 'later' })
  await $.turn.complete({ turnId: 't1', answer: '', reason: 'end_turn' } as never)
  await clock.advance(15 * 60_000)
  // A sign wins over pick up.
  await $.turn.start({ text: 'go', turnId: 't2' })
  await $.tool.call({ tool: 'Bash', command: 'npm test' })
  await clock.advance(5_000)
  expect(await ui.find({ type: 'Text', text: line('reason-long-run-timed', { day: TODAY, wait: 'about a minute' }) })).toBeDefined()
  await ui.unmount()
})

test('ask-first slot: a fresh workout gets the ask-first line', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(30_000)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  const texts = (await ui.findAll({ type: 'Text' })).map(t => t.text)
  const firstLines = [0, 1, 2].map(i => fill(LINES.find(l => l.id === 'ask-first')?.variants[i] ?? '', { ...FILLS, workout: 'A', n: 2, mate: pickAddress(TODAY, 'ask-first'), agentDoing: agentDoing(TODAY, 1, 30_000) }))
  expect(texts.some(t => firstLines.includes(t))).toBe(true)
  await ui.unmount()
})

test('after a record: a celebration, or the skip reassurance', OPTIONS, async ($, on) => {
  world(on, { ...TINY, workouts: [{ name: 'A', exercises: [{ name: 'Push-ups', reps: '10 reps', sets: 3 }] }] })
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await ui.press({ key: 'done' })
  expect(await speaks(ui)).toBe(true)
  await $.command.run(workout('start'))
  await ui.press({ key: 'skip' })
  expect(await ui.find({ type: 'Text', text: line('skip', { day: TODAY }) })).toBeDefined()
  await ui.unmount()
})

test('workout finished: the rating opens with Swolomon’s line; Not today is his toast', OPTIONS, async ($, on) => {
  const { w } = world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: line('workout-done', { day: TODAY, workout: 'A' }) })).toBeDefined()
  await ui.unmount()
  expect(w.toasts.at(-1)).toMatch(/^Workout 1 done\. Next: /)
})

test('Not today: his toast names the next training day', OPTIONS, async ($, on) => {
  const { w } = world(on, { ...TINY, schedule: { days: ['fri', 'mon'] } })
  await $.session.start(SESSION)
  await $.command.run(workout('no'))
  expect(w.toasts).toContain(line('not-today', { day: TODAY, nextDay: 'Monday' }))
})

test('session start: what’s new, plus the day toast', OPTIONS, async ($, on) => {
  const { w } = world(on, TINY, { schemaVersion: 1 })
  await $.session.start(SESSION)
  expect(w.toasts.length).toBe(2)
  expect(w.toasts[0]).toBe(whatsNewLine('1.0.0', TODAY))
  expect(w.toasts[1]).toMatch(/\bA\b/)
  await $.session.start(SESSION)
  expect(w.toasts.filter(t => t === whatsNewLine('1.0.0', TODAY)).length).toBe(1)
})

test('what’s new never shows on a first install, nor for a release with only Under the hood', OPTIONS, async ($, on) => {
  const { w } = world(on, TINY)
  await $.session.start(SESSION)
  expect(w.toasts.some(t => t.startsWith("What's new"))).toBe(false)
  expect(whatsNewLine('9.9.9', TODAY, [{ version: '9.9.9', forYou: [], underTheHood: ['internal'] }])).toBe(null)
  expect(RELEASES.find(r => r.version === '1.0.0')?.forYou.length).toBeGreaterThan(0)
})

// ---------------------------------------------------------------------------------------------------------
// The daily agent storyline (§1.13.2).

test('agentDoing: every job at beat 1, 2, 5 and a long turn', () => {
  AGENT_JOBS.forEach((job, i) => {
    expect(agentDoing(i, 1, 0)).toBe(job.beats[0])
    expect(agentDoing(i, 2, 0)).toBe(job.beats[1])
    expect(agentDoing(i, 5, 0)).toBe(job.beats[1])
    expect(agentDoing(i, 1, LONG_TURN_MS)).toBe(job.beats[2])
    expect(agentDoing(i + 5, 1, 0)).toBe(job.beats[0])
  })
})

/** A day whose ask-first and day-toast variants both name the agent. */
const AGENT_DAY = (() => {
  for (let day = TODAY; day < TODAY + 60; day += 1) {
    if (/agentDoing/i.test(variantOf('ask-first', day).template) && /agentDoing/i.test(variantOf('day-toast', day).template)) return day
  }
  return TODAY
})()

test('the beat moves on with each line that names the agent, shared by sessions, and resets on a new day', OPTIONS, async ($, on) => {
  const now = NOON + (AGENT_DAY - TODAY) * 86_400_000
  const { clock, w } = world(on, TINY, { schemaVersion: 1, seen: { 'whats-new:1.0.0': { at: 1, n: 1 } }, agentBeat: { day: AGENT_DAY, n: 1 } }, { now })
  await $.session.start(SESSION)
  // Another session already used beat 1 today: the day toast is beat 2.
  expect(w.toasts[0]).toContain(agentDoing(AGENT_DAY, 2, 0))
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(30_000)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  const texts = (await ui.findAll({ type: 'Text' })).map(t => t.text).join('\n')
  expect(texts.toLowerCase()).toContain(agentDoing(AGENT_DAY, 3, 0).toLowerCase())
  await ui.unmount()
  expect(agentDoing(AGENT_DAY + 1, 1, 0)).not.toBe(agentDoing(AGENT_DAY, 1, 0))
})

// ---------------------------------------------------------------------------------------------------------
// D22: nothing the product shows says "Claude".

test('no band, pane, toast, status line or reply says Claude', OPTIONS, async ($, on) => {
  on('model.complete', () => ({ value: { isAnswered: false, reason: 'aborted', usage: { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } } }))
  const { clock, w } = world(on, null)
  const shown: string[] = []
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  const look = async () => {
    for (const el of await ui.findAll({ type: 'Text' })) shown.push(el.text)
    for (const el of await ui.findAll({ type: 'Button' })) shown.push(String(el.props.label))
  }
  const say = async (args: string) => shown.push((await $.command.run(workout(args))).text ?? '')
  await $.session.start(SESSION)
  await look()
  await say('status')
  await say('plan squats')
  w.file.text = JSON.stringify(TINY)
  w.file.mtimeMs += 1
  await $.session.start(SESSION)
  await $.turn.start({ text: 'implement it', turnId: 't1' })
  await $.tool.call({ tool: 'Agent', description: 'x', prompt: 'y', subagent_type: 'Explore' } as never)
  await clock.advance(5_000)
  await look()
  await ui.press({ key: 'start' })
  await look()
  await ui.press({ key: 'edit' })
  await look()
  await ui.press({ key: 'save' })
  await look()
  for (const args of ['now', 'skip', 'now', 'done', 'undo', 'done', 'later', 'no', 'today', 'pause', 'resume', 'reset', 'swolomon', 'nonsense', 'easy', '']) {
    await say(args)
    await look()
  }
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...STATUS })
  for (const el of await pane.findAll({ type: 'Text' })) shown.push(el.text)
  await pane.unmount()
  await ui.unmount()
  const everything = [...shown, ...w.toasts, (await tallyOf($)) ?? '', ...ACTIONS.map(a => a.label)]
  // The plan file's path (`~/.claude/idlereps/plan.json`) is a path, not a name.
  expect(everything.filter(t => /(?<![./])claude/i.test(t))).toEqual([])
  expect(everything.length).toBeGreaterThan(40)
})
