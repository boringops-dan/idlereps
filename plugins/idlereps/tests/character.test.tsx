import { expect, test } from 'claude-code/testing'

import type { Cue, HistoryEntry, Plan } from '../types'
import { firstSetLineId, ratingBand } from '../hooks/bands'
import { COACH_NAME, introLines, line, replayLines, SAFETY_SENTENCES } from '../hooks/copy'
import { nextRank, rankFor, RANKS, weekMarks } from '../hooks/history'
import { START, cueFor } from '../hooks/plan'
import {
  BLINK_FOR_MS,
  decodeFrame,
  encodeCells,
  ENTRANCE_MS,
  entranceAt,
  fitPortrait,
  frameAt,
  STAGE_COLUMNS,
  STAGE_ROWS,
  stageGrid,
  STOP_X,
  timelineOf,
} from '../hooks/portrait'
import { generateProgram, STARTER_ANSWERS } from '../hooks/programs'
import { record } from '../hooks/record'
import type { RecordStore } from '../hooks/record'
import { rankText } from '../hooks/status'
import { SPRITE } from '../hooks/swolomon-sprite'
import type { FrameName, MiniFrameName } from '../hooks/swolomon-sprite'
import { BAND, drawnRows, NOON, OPTIONS, PLAN_PATH, SESSION, STATUS, tallyOf, TINY, TODAY, workout, ownStore, world } from './world'

/** Swolomon as a character (plan §1.11, §1.13), and the first-run and status polish around him. */

const DAY_MS = 86_400_000
/** Monday 2026-10-05: a Monday, and (day × 7 + 3) % 10 === 0, so a regulars day too. */
const MONDAY = TODAY + 3
/** Thursday 2026-10-15: a regulars day that is not a Monday. */
const REGULARS_DAY = TODAY + 13
const ACKED = { seen: { safety: { at: NOON - 1, n: 1 } } }
const ANIMATED = { options: { cueEvery: '15', cueAfter: '30', coachAnimation: true, warmUp: false } } as const

// ---------------------------------------------------------------------------------------------------------
// The sprite and the cells (pure).

test('every frame decodes to its size, full and mini', () => {
  for (const name of Object.keys(SPRITE.frames) as (FrameName | MiniFrameName)[]) {
    const grid = decodeFrame(SPRITE, name)
    const size = name.startsWith('mini') ? SPRITE.miniSize : SPRITE.width
    expect([name, grid.length, grid.every(row => row.length === size)]).toEqual([name, size, true])
  }
})

test('a frame with a wrong row length or an unknown colour is refused, naming the frame and row', () => {
  const short = { ...SPRITE, frames: { ...SPRITE.frames, idle: ['.'.repeat(15), ...SPRITE.frames.idle.slice(1)] } }
  expect(() => decodeFrame(short, 'idle')).toThrow('frame idle, row 0: 15 pixels, expected 16')
  const odd = { ...SPRITE, frames: { ...SPRITE.frames, blink: [...SPRITE.frames.blink.slice(0, 3), 'Z'.repeat(16), ...SPRITE.frames.blink.slice(4)] } }
  expect(() => decodeFrame(odd, 'blink')).toThrow('frame blink, row 3: no colour for "Z"')
})

test('cells: ▀ with top and bottom colours; ▄ when only the bottom is filled; a space when neither', () => {
  const words = (cells: string) => {
    const bytes = Uint8Array.from(atob(cells), c => c.charCodeAt(0))
    return Array.from({ length: bytes.length / 4 }, (_, i) => (bytes[i * 4] ?? 0) | ((bytes[i * 4 + 1] ?? 0) << 8) | ((bytes[i * 4 + 2] ?? 0) << 16) | ((bytes[i * 4 + 3] ?? 0) << 24))
  }
  // One column, two pixel rows: red over blue.
  expect(encodeCells([[0xff0000], [0x0000ff]])).toBe('gCUAAAAA/wD/AAAA')
  expect(words(encodeCells([[0xff0000], [0x0000ff]]))).toEqual([0x2580, 0xff0000, 0x0000ff])
  expect(words(encodeCells([[null], [0x00ff00]]))).toEqual([0x2584, 0x00ff00, 0x01000000])
  expect(words(encodeCells([[null], [null]]))).toEqual([0x20, 0x01000000, 0x01000000])
  expect(words(encodeCells([[0x123456], [null]]))).toEqual([0x2580, 0x123456, 0x01000000])
})

test('the portrait has no stray pixels: every frame is the idle frame but for its own rows', () => {
  const idle = SPRITE.frames.idle
  const differs = (name: FrameName) => SPRITE.frames[name].flatMap((row, y) => (row === idle[y] ? [] : [y]))
  expect(differs('talkA')).toEqual([9])
  expect(differs('talkB')).toEqual([10])
  expect(differs('blink')).toEqual([6])
  expect(differs('flex')).toEqual([0, 1, 2, 6, 9])
})

// ---------------------------------------------------------------------------------------------------------
// The typewriter (pure).

test('the typewriter: 20 ms a character, a hold where a sentence ends, the mouth moving between', () => {
  const timeline = timelineOf(['Go. Now'])
  expect(frameAt(timeline, 0, false)).toEqual({ shown: [0], pose: 'talkA', isDone: false })
  expect(frameAt(timeline, 20, false).shown).toEqual([1])
  // "Go." is out at 60 ms, then a 200 ms hold with the mouth at rest.
  expect(frameAt(timeline, 60, false).shown).toEqual([3])
  expect(frameAt(timeline, 150, false).pose).toBe('idle')
  expect(frameAt(timeline, 279, false).shown).toEqual([3])
  expect(frameAt(timeline, 280, false).shown).toEqual([4])
  expect(frameAt(timeline, 10_000, false)).toEqual({ shown: [7], pose: 'idle', isDone: true })
})

test('"..." holds once, after its last dot; a comma holds 100 ms; lines wait 400 ms for each other', () => {
  const dots = timelineOf(['a... b'])
  expect(dots.at[0]).toEqual([20, 40, 60, 80, 300, 320])
  const comma = timelineOf(['a, b'])
  expect(comma.at[0]).toEqual([20, 40, 160, 180])
  const lines = timelineOf(['ab', 'c'])
  expect(lines.at).toEqual([[20, 40], [460]])
})

test('the introduction types out in about 8 seconds: who he is, what he does, how, the choice', () => {
  const { doneAt } = timelineOf(introLines(TODAY))
  expect(doneAt).toBeGreaterThan(6_500)
  expect(doneAt).toBeLessThan(9_500)
})

test('a win holds the flex once its line is out; any other line rests', () => {
  const timeline = timelineOf(['Behold.'])
  expect(frameAt(timeline, timeline.doneAt - 1, true).pose).not.toBe('flex')
  expect(frameAt(timeline, timeline.doneAt, true).pose).toBe('flex')
  expect(frameAt(timeline, timeline.doneAt + 60_000, true).pose).toBe('flex')
  expect(frameAt(timeline, timeline.doneAt, false).pose).toBe('idle')
})

// ---------------------------------------------------------------------------------------------------------
// Fit (pure).

test('fit: only on the terminal, only approved art, never wrapping the text, never taller than the band', () => {
  const base = { wanted: 'full' as const, surface: 'terminal', approved: true, maxRows: 10, bodyColumns: 100, bandRows: 7, textColumns: 78, sprite: SPRITE }
  expect(fitPortrait(base)).toBe('full')
  expect(fitPortrait({ ...base, surface: 'desktop' })).toBe('none')
  expect(fitPortrait({ ...base, approved: false })).toBe('none')
  // Too narrow for the full portrait beside 78 columns of text, wide enough for the mini head.
  expect(fitPortrait({ ...base, bodyColumns: 96 })).toBe('full')
  expect(fitPortrait({ ...base, bodyColumns: 95 })).toBe('mini')
  expect(fitPortrait({ ...base, bodyColumns: 86 })).toBe('mini')
  expect(fitPortrait({ ...base, bodyColumns: 85 })).toBe('none')
  // A band window of 7 rows: no room for 8 rows of portrait.
  expect(fitPortrait({ ...base, maxRows: 7 })).toBe('mini')
  expect(fitPortrait({ ...base, wanted: 'mini', bandRows: 2 })).toBe('none')
  expect(fitPortrait({ ...base, wanted: 'none' })).toBe('none')
})

// ---------------------------------------------------------------------------------------------------------
// The portrait, drawn.

test('the intro draws the full portrait on a wide terminal, and an SVG of it on the desktop', OPTIONS, async ($, on) => {
  world(on, null)
  await $.session.start(SESSION)
  const terminal = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  const portrait = (await terminal.find({ key: 'swolomon' })) as { props: { columns: number; rows: number } } | undefined
  expect(portrait?.props.columns).toBe(16)
  expect(portrait?.props.rows).toBe(8)
  expect(await terminal.find({ type: 'Text', text: `${COACH_NAME}:` })).toBeUndefined()
  await terminal.unmount()
  // No terminal cells on the desktop: the same portrait as an SVG, and so no name tag.
  const desktop = await $.ui.mount({ plugin: 'idlereps', surface: 'desktop', ...BAND })
  const svg = (await desktop.find({ type: 'Svg' })) as { type: string; props: { source: string; alt: string; width: number } } | undefined
  expect([svg?.type, svg?.props.alt, svg?.props.width]).toEqual(['Svg', COACH_NAME, 64])
  expect(svg?.props.source.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"')).toBe(true)
  expect(await desktop.find({ type: 'Text', text: `${COACH_NAME}:` })).toBeUndefined()
  await desktop.unmount()
})

test('the ask band and the speaking set band draw the mini head; a silent set band none', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(30_000)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  const head = async () => ((await ui.find({ key: 'swolomon' })) as { props: { columns: number } } | undefined)?.props.columns
  expect(await head()).toBe(6)
  await ui.press({ key: 'start' })
  expect(await head()).toBe(6)
  await ui.press({ key: 'done' })
  await $.command.run(workout('now'))
  expect(await ui.find({ key: 'done' })).toBeDefined()
  expect(await head()).toBeUndefined()
  await ui.unmount()
})

// ---------------------------------------------------------------------------------------------------------
// The typewriter, drawn.

function blitLog(on: Parameters<typeof world>[0]) {
  const blits: string[] = []
  on('ui.blit', ($, e) => {
    if ('cells' in e) blits.push(e.cells)
    return { value: {} }
  })
  return blits
}

test('animated: the line types out while the buttons already work', ANIMATED, async ($, on) => {
  const { clock, w } = world(on, TINY)
  blitLog(on)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  const said = line('set', { day: TODAY })
  expect(await ui.find({ type: 'Text', text: said })).toBeUndefined()
  await clock.advance(200)
  const partial = drawnRows(await ui.drawn())[0] ?? ''
  expect(partial.length).toBeGreaterThan(0)
  expect(said.startsWith(partial)).toBe(true)
  // A press mid-line does its job at once.
  await ui.press({ key: 'done' })
  expect(await tallyOf($)).toBe('💪 1/2')
  await ui.unmount()
})

test('animated: the whole line is out once its time has passed, and the mouth moved while it typed', ANIMATED, async ($, on) => {
  const { clock } = world(on, TINY)
  const blits = blitLog(on)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await clock.advance(5_000)
  expect(await ui.find({ type: 'Text', text: line('set', { day: TODAY }) })).toBeDefined()
  expect(blits.length).toBeGreaterThan(0)
  await ui.unmount()
})

test('animated: once the line has been out a while, nothing moves any more', ANIMATED, async ($, on) => {
  const { clock } = world(on, TINY)
  const blits = blitLog(on)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await clock.advance(5_000 + BLINK_FOR_MS + 1_000)
  const settled = blits.length
  await clock.advance(60_000)
  expect(blits.length).toBe(settled)
  await ui.unmount()
})

test('animated: over the intro the band redraws only when more text shows, never once per tick', ANIMATED, async ($, on) => {
  const writes: { shown: number[]; isEntering?: true }[] = []
  on('state.set', ($, e, next) => {
    const write = e as unknown as { key: string; value: { shown: number[]; isEntering?: true } | null }
    if (write.key === 'talk' && write.value !== null) writes.push(write.value)
    return next(e)
  })
  const { clock } = world(on, null)
  blitLog(on)
  await $.session.start(SESSION)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await clock.advance(20_000)
  const talking = writes.filter(w => w.isEntering !== true)
  // The last write settles the pose with the whole line out; every other one reveals more of it.
  const reveals = talking.slice(0, -1).map(w => w.shown.join(','))
  expect(new Set(reveals).size).toBe(reveals.length)
  expect(talking.at(-1)?.shown).toEqual(introLines(TODAY).map(l => [...l].length))
  // Far fewer redraws than the 50 ms ticks over 20 s.
  expect(talking.length).toBeLessThan(20_000 / 50)
  await ui.unmount()
})

test('not animated: the whole line at once and no blits', OPTIONS, async ($, on) => {
  world(on, TINY)
  const blits = blitLog(on)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: line('set', { day: TODAY }) })).toBeDefined()
  expect(blits).toEqual([])
  await ui.unmount()
})

// ---------------------------------------------------------------------------------------------------------
// The entrance (§1.11 Entrance): walking past, the double take, back to the portrait's place.

test('the entrance: in from off the stage in profile, a stop, the double take, then back to the left edge', () => {
  expect(entranceAt(0)).toEqual({ x: -16, y: 0, frame: 'walkA', isBang: false, isDone: false })
  const walking = Array.from({ length: 40 }, (_, i) => entranceAt(i * 30))
  expect(walking.every(at => at.frame === 'walkA' || at.frame === 'walkB')).toBe(true)
  expect(new Set(walking.map(at => at.frame)).size).toBe(2)
  expect(walking.map(at => at.x)).toEqual([...walking.map(at => at.x)].sort((a, b) => a - b))
  // The double take: facing us, the "!" up, at the farthest point.
  const takes = Array.from({ length: ENTRANCE_MS / 10 }, (_, i) => entranceAt(i * 10)).filter(at => at.isBang)
  expect(takes.length).toBeGreaterThan(0)
  expect(takes.every(at => at.frame === 'notice' && at.x === STOP_X)).toBe(true)
  expect(Math.max(...Array.from({ length: ENTRANCE_MS / 10 }, (_, i) => entranceAt(i * 10).x))).toBe(STOP_X)
  expect(entranceAt(ENTRANCE_MS - 1)).toEqual({ x: 0, y: 0, frame: 'idle', isBang: false, isDone: false })
  expect(entranceAt(ENTRANCE_MS)).toEqual({ x: 0, y: 0, frame: 'idle', isBang: false, isDone: true })
  expect(entranceAt(ENTRANCE_MS + 60_000).isDone).toBe(true)
})

test('the entrance is short: under four seconds before the first word', () => {
  expect(ENTRANCE_MS).toBeGreaterThan(2_000)
  expect(ENTRANCE_MS).toBeLessThan(4_000)
})

test('the stage: empty before the first step, clipped at its edges, the "!" beside the head', () => {
  const empty = stageGrid(SPRITE, { x: -16, y: 0, frame: 'walkA', isBang: false })
  expect(empty.length).toBe(STAGE_ROWS * 2)
  expect(empty.every(row => row.length === STAGE_COLUMNS && row.every(c => c === null))).toBe(true)
  // Half on: only the sprite's right half, at the stage's left edge.
  const half = stageGrid(SPRITE, { x: -8, y: 0, frame: 'idle', isBang: false })
  const idle = decodeFrame(SPRITE, 'idle')
  expect(half.map(row => row.slice(0, 8))).toEqual(idle.slice(0, STAGE_ROWS * 2).map(row => row.slice(8)))
  const bang = stageGrid(SPRITE, { x: STOP_X, y: 0, frame: 'notice', isBang: true })
  expect([0, 1, 2, 4].map(y => bang[y]?.[STOP_X + 17])).toEqual([0xfad048, 0xfad048, 0xfad048, 0xfad048])
  expect(bang[3]?.[STOP_X + 17]).toBeNull()
  // A bob lifts by a pixel: the sprite's blank top row goes off the stage.
  const bob = stageGrid(SPRITE, { x: 0, y: -1, frame: 'idle', isBang: false })
  expect(bob[0]?.slice(0, 16)).toEqual(idle[1])
})

test('animated: the intro walks on over the buttons first, 8 rows in all, then talks beside the portrait', ANIMATED, async ($, on) => {
  const { clock } = world(on, null)
  const blits: { key: string }[] = []
  on('ui.blit', ($, e) => {
    blits.push({ key: e.key })
    return { value: {} }
  })
  await $.session.start(SESSION)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  const stage = (await ui.find({ key: 'stage' })) as { props: { columns: number; rows: number } } | undefined
  expect([stage?.props.columns, stage?.props.rows]).toEqual([STAGE_COLUMNS, STAGE_ROWS])
  // The stage and the buttons' row: the tall bands' 8 rows (§1.10b), never more.
  expect(STAGE_ROWS + 1).toBe(8)
  expect(await ui.find({ key: 'program' })).toBeDefined()
  expect(await ui.find({ key: 'swolomon' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: line('intro-header', { day: TODAY }) })).toBeUndefined()
  await clock.advance(1_000)
  expect(blits.length).toBeGreaterThan(0)
  expect(blits.every(b => b.key === 'stage')).toBe(true)
  await clock.advance(ENTRANCE_MS)
  expect(await ui.find({ key: 'stage' })).toBeUndefined()
  expect(await ui.find({ key: 'swolomon' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: line('intro-header', { day: TODAY }) })).toBeDefined()
  // The line has only just started.
  expect(await ui.find({ type: 'Text', text: introLines(TODAY)[0] })).toBeUndefined()
  await clock.advance(15_000)
  expect(await ui.find({ type: 'Text', text: introLines(TODAY).at(-1) })).toBeDefined()
  await ui.unmount()
})

test('animated: a button pressed during the entrance does its job at once', ANIMATED, async ($, on) => {
  const { clock, w } = world(on, null)
  blitLog(on)
  await $.session.start(SESSION)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await clock.advance(500)
  expect(await ui.find({ key: 'stage' })).toBeDefined()
  await ui.press({ key: 'quickstart' })
  // Quick start's next step, its one question, takes the band at once.
  expect(await ui.find({ key: 'desk' })).toBeDefined()
  expect(w.writes).toEqual([])
  await ui.unmount()
})

for (const columns of [80, 60]) {
  test(`animated: at ${columns} columns, no room for the stage: no entrance, and the line starts at once`, ANIMATED, async ($, on) => {
    const { clock } = world(on, null)
    blitLog(on)
    await $.session.start(SESSION)
    const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND, props: { ...BAND.props, bodyColumns: columns } })
    expect(await ui.find({ key: 'stage' })).toBeUndefined()
    await clock.advance(300)
    const first = introLines(TODAY)[0] ?? ''
    // Beside the mini head, or after the name tag where even that has no room.
    const typed = (drawnRows(await ui.drawn())[1] ?? '').replace(`${COACH_NAME}: `, '')
    expect(typed.length).toBeGreaterThan(0)
    expect(typed.length).toBeLessThan(first.length)
    expect(first.startsWith(typed)).toBe(true)
    await ui.unmount()
  })
}

test('animated: the replay walks on too; the flex and the rank-up do not', ANIMATED, async ($, on) => {
  world(on, TINY)
  blitLog(on)
  await $.session.start(SESSION)
  await $.command.run(workout('swolomon'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'stage' })).toBeDefined()
  await ui.press({ key: 'letsgo' })
  await $.command.run(workout('flex'))
  expect(await ui.find({ key: 'stage' })).toBeUndefined()
  expect(await ui.find({ key: 'swolomon' })).toBeDefined()
  await ui.unmount()
})

test('not animated: the intro has no entrance', OPTIONS, async ($, on) => {
  world(on, null)
  await $.session.start(SESSION)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'stage' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: introLines(TODAY)[0] })).toBeDefined()
  await ui.unmount()
})

// ---------------------------------------------------------------------------------------------------------
// Ranks (§1.13.1).

test('ranks at their boundaries', () => {
  for (const [sets, name] of [
    [0, 'New Face'],
    [24, 'New Face'],
    [25, 'Regular'],
    [99, 'Regular'],
    [100, 'Rack Regular'],
    [2499, 'Olympian'],
    [2500, 'Greek God'],
    [10_000, 'Greek God'],
  ] as const) {
    expect([sets, rankFor(sets).name]).toEqual([sets, name])
  }
  expect(nextRank(0)).toEqual({ rank: RANKS[1], setsToGo: 25 })
  expect(nextRank(2500)).toBeNull()
  expect(rankText(213)).toBe('Rank: Rack Regular · 37 sets to Iron Disciple')
  expect(rankText(249)).toBe('Rank: Rack Regular · 1 set to Iron Disciple')
  expect(rankText(2500)).toBe('Rank: Greek God')
})

test('crossing 25 on a Done: the rank-up band, flexing, once; Undo drops the rank', OPTIONS, async ($, on) => {
  world(on, TINY, { totalDoneSets: 24 })
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: line('rank-regular', { day: TODAY }) })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: 'Rank up: Regular · 25 sets' })).toBeDefined()
  expect(await ui.find({ key: 'swolomon' })).toBeDefined()
  expect(JSON.stringify(await $.command.run(workout('status')))).toMatch(/rank=Regular/)
  await ui.press({ key: 'undo' })
  expect(JSON.stringify(await $.command.run(workout('status')))).toMatch(/rank=New Face/)
  // Crossing again: the mark stayed, so the logged line, not a second band.
  await $.command.run(workout('done'))
  expect(await ui.find({ key: 'letsgo' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /✓ Logged Push-ups/ })).toBeDefined()
  await ui.unmount()
})

test("Let's go clears the rank-up band; a workout's rating then takes its turn", OPTIONS, async ($, on) => {
  world(on, TINY, { totalDoneSets: 24, progress: { ...START, done: 1 } })
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'letsgo' })).toBeDefined()
  await ui.press({ key: 'letsgo' })
  expect(await ui.find({ key: 'good' })).toBeDefined()
  await ui.unmount()
})

test('a skipped set never counts toward a rank', OPTIONS, async ($, on) => {
  world(on, TINY, { totalDoneSets: 24 })
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('skip'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'letsgo' })).toBeUndefined()
  expect(JSON.stringify(await $.command.run(workout('status')))).toMatch(/rank=New Face/)
  await ui.unmount()
})

test('the pane carries the rank line, at the top rank too', OPTIONS, async ($, on) => {
  world(on, TINY, { totalDoneSets: 2500 })
  await $.session.start(SESSION)
  await $.command.run(workout(''))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...STATUS })
  expect(drawnRows(await pane.drawn())).toContain('Rank: Greek God · the top. It is written.')
  await pane.unmount()
})

// ---------------------------------------------------------------------------------------------------------
// Feats (§1.13.6).

const storeOf = (patch: Partial<RecordStore> = {}): RecordStore => ({
  progress: START,
  history: [],
  targets: {},
  lastByExercise: {},
  totalDoneSets: 0,
  nextCueAt: undefined,
  ...patch,
})

/** A store the test can look into. */
const ctxOf = (plan: Plan, today: number) => ({ plan, today, now: today * DAY_MS, gapMs: 0, setting: 'home' as const })

test('the first set ever is a feat, toasted once ever', OPTIONS, async ($, on) => {
  const { w } = world(on, TINY)
  await $.session.start(SESSION)
  w.toasts.length = 0
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  expect(w.toasts).toEqual([line('feat-first-set', { day: TODAY })])
  await $.command.run(workout('undo'))
  await $.command.run(workout('done'))
  expect(w.toasts.filter(t => t === line('feat-first-set', { day: TODAY })).length).toBe(1)
})

test('a workout with no skip is perfect; one with a skip is not', () => {
  const plan: Plan = { ...TINY, workouts: [{ name: 'A', exercises: [{ name: 'Push-ups', reps: '10 reps', sets: 1 }] }] }
  const done = record(storeOf({ totalDoneSets: 5 }), { type: 'set', showing: { workout: 0, step: 1 }, result: 'done', count: 10 }, ctxOf(plan, TODAY))
  expect(done.effects.feats).toContain('perfect-workout')
  const skipped = record(storeOf({ totalDoneSets: 5 }), { type: 'set', showing: { workout: 0, step: 1 }, result: 'skip' }, ctxOf(plan, TODAY))
  expect(skipped.effects.feats ?? []).not.toContain('perfect-workout')
})

test('three workouts in a row is a feat; a full week only for a days plan', () => {
  const plan: Plan = {
    version: 1,
    name: 'Daily',
    schedule: { days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
    workouts: Array.from({ length: 10 }, (_, i) => ({ name: `W${i}`, exercises: [{ name: 'Push-ups', reps: '10 reps', sets: 1 }] })),
  }
  const complete = (d: number, w: number): HistoryEntry => ({ kind: 'workout-complete', t: d * DAY_MS, d, w })
  const history = [complete(MONDAY, 0), complete(MONDAY + 1, 1)]
  const third = record(
    storeOf({ history, progress: { ...START, workout: 2, lastCompletedOn: MONDAY + 1 }, totalDoneSets: 2 }),
    { type: 'set', showing: { workout: 2, step: 1 }, result: 'done', count: 10 },
    ctxOf(plan, MONDAY + 2),
  )
  expect(third.effects.feats).toContain('three-in-a-row')
  expect(third.effects.feats ?? []).not.toContain('full-week')
  const week = [0, 1, 2, 3, 4, 5].map(i => complete(MONDAY + i, i))
  const sunday = record(
    storeOf({ history: week, progress: { ...START, workout: 6, lastCompletedOn: MONDAY + 5 }, totalDoneSets: 6 }),
    { type: 'set', showing: { workout: 6, step: 1 }, result: 'done', count: 10 },
    ctxOf(plan, MONDAY + 6),
  )
  expect(sunday.effects.feats).toContain('full-week')
  const everyOther: Plan = { ...plan, schedule: { everyNDays: 1 } }
  const never = record(
    storeOf({ history: week, progress: { ...START, workout: 6, lastCompletedOn: MONDAY + 5 }, totalDoneSets: 6 }),
    { type: 'set', showing: { workout: 6, step: 1 }, result: 'done', count: 10 },
    ctxOf(everyOther, MONDAY + 6),
  )
  expect(never.effects.feats ?? []).not.toContain('full-week')
})

// ---------------------------------------------------------------------------------------------------------
// The regulars and the gym calendar (§1.13.3, §1.13.4).

const cueOn = (plan: Plan) => cueFor(plan, START, {}) as Cue

test('the first set line: a sign, then Chest Day, leg day, a regular, else the set line', () => {
  const push = cueOn(TINY)
  expect(firstSetLineId(push, TINY, MONDAY, 'busy')).toBe('reason-busy')
  expect(firstSetLineId(push, TINY, MONDAY, undefined)).toBe('chest-day')
  const ownNames: Plan = { ...TINY, workouts: [{ name: 'A', exercises: [{ name: 'Bench press', reps: '5 reps', sets: 5 }] }] }
  expect(firstSetLineId(cueOn(ownNames), ownNames, MONDAY, undefined)).toBe('regulars')
  const legs: Plan = { ...TINY, workouts: [{ name: 'Week 1 · Legs', exercises: [{ name: 'Squats', reps: '20 reps', sets: 1 }] }] }
  expect(firstSetLineId(cueOn(legs), legs, TODAY, undefined)).toBe('leg-day')
  const lower: Plan = { ...legs, workouts: [{ ...legs.workouts[0]!, name: 'Lower A' }] }
  expect(firstSetLineId(cueOn(lower), lower, TODAY, undefined)).toBe('leg-day')
  expect(firstSetLineId(push, TINY, REGULARS_DAY, undefined)).toBe('regulars')
  expect(firstSetLineId(push, TINY, TODAY, undefined)).toBe('set')
})

test('a regular shows on the first set after Start only', OPTIONS, async ($, on) => {
  world(on, TINY, {}, { now: NOON + 13 * DAY_MS })
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: line('regulars', { day: REGULARS_DAY }) })).toBeDefined()
  await ui.press({ key: 'done' })
  await $.command.run(workout('now'))
  expect(await ui.find({ type: 'Text', text: line('regulars', { day: REGULARS_DAY }) })).toBeUndefined()
  await ui.unmount()
})

test('the Monday recap: last week’s sets, in place of the day toast, once a week', OPTIONS, async ($, on) => {
  const lastWeek: HistoryEntry[] = [0, 1, 2].map(i => ({ kind: 'set', t: 1, d: TODAY - i, w: 0, exercise: 'Push-ups', set: 1, target: '10 reps', result: 'done', count: 10 }))
  const { w } = world(on, TINY, { schemaVersion: 1, history: lastWeek, seen: { 'whats-new:1.0.0': { at: 1, n: 1 } } }, { now: NOON + 3 * DAY_MS })
  await $.session.start(SESSION)
  // Three sets of 10 reps: 40 s each, 2 minutes moved.
  expect(w.toasts).toEqual([line('recap', { day: MONDAY, sets: 3, minutes: '2 min' })])
  await $.session.start(SESSION)
  expect(w.toasts.length).toBe(1)
})

test('the Monday recap after an empty week', OPTIONS, async ($, on) => {
  const { w } = world(on, TINY, { schemaVersion: 1, seen: { 'whats-new:1.0.0': { at: 1, n: 1 } } }, { now: NOON + 3 * DAY_MS })
  await $.session.start(SESSION)
  expect(w.toasts).toEqual([line('recap-zero', { day: MONDAY })])
})

// Regression coverage: the session-start toast slot (§1.10c), after the recap reused the day toast's day.

const NEWS_SEEN = { schemaVersion: 1, seen: { 'whats-new:1.0.0': { at: 1, n: 1 } } }

test('a Monday recap already shown this week: the next Monday-week start gets nothing, not the day toast', OPTIONS, async ($, on) => {
  const { w } = world(on, TINY, { ...NEWS_SEEN, seen: { ...NEWS_SEEN.seen, recap: { at: NOON + 3 * DAY_MS - 1, n: 1 }, 'day-toast': { at: NOON + 3 * DAY_MS - 1, n: 1 } } }, { now: NOON + 3 * DAY_MS })
  await $.session.start(SESSION)
  expect(w.toasts).toEqual([])
})

test('on Tuesday after a Monday recap, the day toast is back', OPTIONS, async ($, on) => {
  const { w } = world(on, TINY, { ...NEWS_SEEN, seen: { ...NEWS_SEEN.seen, recap: { at: NOON + 3 * DAY_MS, n: 1 }, 'day-toast': { at: NOON + 3 * DAY_MS, n: 1 } } }, { now: NOON + 4 * DAY_MS })
  await $.session.start(SESSION)
  expect(w.toasts.length).toBe(1)
  expect(w.toasts[0]).not.toBe(line('recap-zero', { day: MONDAY + 1 }))
})

test('the recap comes after what’s new on a Monday, and the day toast does not', OPTIONS, async ($, on) => {
  const { w } = world(on, TINY, { schemaVersion: 1 }, { now: NOON + 3 * DAY_MS })
  await $.session.start(SESSION)
  expect(w.toasts.length).toBe(2)
  expect(w.toasts[1]).toBe(line('recap-zero', { day: MONDAY }))
})

test('no recap on any other day: a Tuesday start gets the day toast', OPTIONS, async ($, on) => {
  const { w } = world(on, TINY, NEWS_SEEN, { now: NOON + 4 * DAY_MS })
  await $.session.start(SESSION)
  expect(w.toasts.length).toBe(1)
  expect(w.toasts.some(t => t === line('recap-zero', { day: MONDAY + 1 }) || t.startsWith('Last week'))).toBe(false)
})

test('paused: no recap, and the recap is still due once resumed on that Monday', OPTIONS, async ($, on) => {
  const { w } = world(on, TINY, { ...NEWS_SEEN, paused: true }, { now: NOON + 3 * DAY_MS })
  await $.session.start(SESSION)
  expect(w.toasts).toEqual([])
  await $.command.run(workout('resume'))
  await $.session.start(SESSION)
  expect(w.toasts).toEqual([line('recap-zero', { day: MONDAY })])
})

// ---------------------------------------------------------------------------------------------------------
// Easter eggs (§1.13.5).

test('/workout protein and /workout wisdom answer in Swolomon’s voice', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  expect((await $.command.run(workout('protein'))).text).toBe(`${COACH_NAME}: ${line('protein', { day: TODAY })}`)
  expect((await $.command.run(workout('wisdom'))).text).toBe(`${COACH_NAME}: ${line('wisdom', { day: TODAY })}`)
})

test('every band’s buttons answer their command: /workout nice puts the flex away, /workout letsgo the replay', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await $.command.run(workout('flex'))
  expect((await $.command.run(workout('nice'))).text).toBeUndefined()
  expect(await ui.find({ key: 'nice' })).toBeUndefined()
  await $.command.run(workout('swolomon'))
  expect(await ui.find({ key: 'letsgo' })).toBeDefined()
  await $.command.run(workout('letsgo'))
  expect(await ui.find({ key: 'letsgo' })).toBeUndefined()
  await ui.unmount()
})

test('a button’s command with nothing showing says so; an unknown word gets the usage', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  for (const id of ['nice', 'letsgo', 'gotit', 'tellmore']) expect((await $.command.run(workout(id))).text).toBe(line('reply-nothing-showing', { day: TODAY, id }))
  expect((await $.command.run(workout('jump'))).text).toBe(line('reply-usage', { day: TODAY }))
})

test('/workout flex: the portrait flexes; Nice or the next prompt puts it away', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('flex'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: line('flex', { day: TODAY }) })).toBeDefined()
  expect(await ui.find({ key: 'swolomon' })).toBeDefined()
  await ui.press({ key: 'nice' })
  expect(await ui.find({ key: 'nice' })).toBeUndefined()
  await $.command.run(workout('flex'))
  await $.turn.start({ text: 'go', turnId: 't1' })
  expect(await ui.find({ key: 'nice' })).toBeUndefined()
  await ui.unmount()
})

test('/workout flex during a set: the set stays, Swolomon answers in words, and nothing pops up later', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  expect((await $.command.run(workout('flex'))).text).toBe(`${COACH_NAME}: ${line('flex', { day: TODAY })}`)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'done' })).toBeDefined()
  await ui.press({ key: 'done' })
  expect(await ui.find({ key: 'nice' })).toBeUndefined()
  // Shown, it needs no reply: the band is the answer.
  expect((await $.command.run(workout('swolomon'))).text).toBeUndefined()
  await ui.unmount()
})

test('/workout swolomon during a set leaves the set alone', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  expect((await $.command.run(workout('swolomon'))).text).toBe(line('reply-swolomon-busy', { day: TODAY }))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'done' })).toBeDefined()
  await ui.unmount()
})

// ---------------------------------------------------------------------------------------------------------
// First run: a plan, then today's workout at once.

test('Quick start on a training day offers today’s workout at once', OPTIONS, async ($, on) => {
  world(on, null, ACKED)
  await $.session.start(SESSION)
  await $.command.run(workout('quickstart'))
  await $.command.run(workout('desk'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  const cue = cueOn(generateProgram(STARTER_ANSWERS))
  expect(await ui.find({ type: 'Text', text: line('plan-ready-ask', { day: TODAY, workout: 'Full body A', n: cue.stepCount }) })).toBeDefined()
  await ui.press({ key: 'start' })
  expect(await ui.find({ key: 'done' })).toBeDefined()
  await ui.unmount()
})

test('Quick start on a rest day: the plan, and a taste of it offered at once', OPTIONS, async ($, on) => {
  // Saturday: the starter plan trains Mon, Wed and Fri.
  const { w } = world(on, null, ACKED, { now: NOON + DAY_MS })
  await $.session.start(SESSION)
  await $.command.run(workout('quickstart'))
  await $.command.run(workout('desk'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'start' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: line('plan-ready-later-ask', { day: TODAY + 1, when: 'Monday' }) })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: line('how-it-works-later', { day: TODAY + 1 }) })).toBeDefined()
  expect(w.toasts).toContain(line('quick-start', { day: TODAY + 1 }))
  // Try a set now: a set, on a rest day.
  await ui.press({ key: 'now' })
  expect(await ui.find({ key: 'done' })).toBeDefined()
  await ui.unmount()
})

test('the rest-day offer: Got it puts it away, and so does the next prompt', OPTIONS, async ($, on) => {
  world(on, null, ACKED, { now: NOON + DAY_MS })
  await $.session.start(SESSION)
  await $.command.run(workout('quickstart'))
  await $.command.run(workout('desk'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await ui.press({ key: 'gotit' })
  expect(await ui.find({ key: 'now' })).toBeUndefined()
  await $.command.run(workout('reset'))
  await $.command.run(workout('setup'))
  await ui.unmount()
})

test('the rest-day offer goes when the person sends a prompt', OPTIONS, async ($, on) => {
  world(on, null, ACKED, { now: NOON + DAY_MS })
  await $.session.start(SESSION)
  await $.command.run(workout('quickstart'))
  await $.command.run(workout('desk'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'now' })).toBeDefined()
  await $.turn.start({ text: 'go', turnId: 't1' })
  expect(await ui.find({ key: 'now' })).toBeUndefined()
  await ui.unmount()
})

test('Quick start on a training day: the first set offered with how the rest will come', OPTIONS, async ($, on) => {
  world(on, null, ACKED)
  await $.session.start(SESSION)
  await $.command.run(workout('quickstart'))
  await $.command.run(workout('desk'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'start' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: line('how-it-works', { day: TODAY }) })).toBeDefined()
  await ui.unmount()
})

test('Build my own: Back returns to the introduction, without walking on again', ANIMATED, async ($, on) => {
  const { w } = world(on, null)
  blitLog(on)
  await $.session.start(SESSION)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await ui.press({ key: 'program' })
  expect(await ui.find({ key: 'own' })).toBeDefined()
  await ui.press({ key: 'back' })
  expect(await ui.find({ key: 'quickstart' })).toBeDefined()
  expect(await ui.find({ key: 'stage' })).toBeUndefined()
  expect(w.writes).toEqual([])
  await ui.unmount()
})

test('Quick start again after the plan file went: straight to its question, then the plan', OPTIONS, async ($, on) => {
  const { w } = world(on, null)
  await $.session.start(SESSION)
  await $.command.run(workout('quickstart'))
  await $.command.run(workout('desk'))
  expect(w.writes.some(write => write.path === PLAN_PATH)).toBe(true)
  await $.command.run(workout('later'))
  w.file.text = null
  await $.command.run(workout('swolomon'))
  const before = w.writes.length
  await $.command.run(workout('quickstart'))
  await $.command.run(workout('home'))
  expect(w.writes.length).toBeGreaterThan(before)
})

test('the safety note on the first offer: one row, within the band at 80 columns', OPTIONS, async ($, on) => {
  world(on, null, {}, { fresh: true })
  await $.session.start(SESSION)
  await $.command.run(workout('quickstart'))
  await $.command.run(workout('desk'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND, props: { ...BAND.props, bodyColumns: 80 } })
  const rows = drawnRows(await ui.drawn())
  expect(rows).toContain(line('safety-short', { day: TODAY }))
  expect(rows.every(row => row.length <= 80)).toBe(true)
  await ui.unmount()
})

test('the first set ever: the logged line says what happens next, once ever', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await ui.press({ key: 'done' })
  expect(await ui.find({ type: 'Text', text: line('first-logged', { day: TODAY }) })).toBeDefined()
  await $.command.run(workout('now'))
  await ui.press({ key: 'done' })
  expect(await ui.find({ type: 'Text', text: line('first-logged', { day: TODAY }) })).toBeUndefined()
  await ui.unmount()
})

test('/workout swolomon that shows needs no reply; busy, it says why', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  expect((await $.command.run(workout('swolomon'))).text).toBeUndefined()
  await $.command.run(workout('start'))
  expect((await $.command.run(workout('swolomon'))).text).toBe(line('reply-swolomon-busy', { day: TODAY }))
})

test("the replay with a plan: the introduction ending on the plan, and Let's go", OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('swolomon'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(drawnRows(await ui.drawn())).toEqual([line('intro-header', { day: TODAY }), ...replayLines(TODAY), "1: Let's go"])
  await ui.press({ key: 'letsgo' })
  expect(await ui.find({ key: 'letsgo' })).toBeUndefined()
  await ui.unmount()
})

// ---------------------------------------------------------------------------------------------------------
// The logged line, the rating, and the week.

test('the logged line: today’s count, and a new best with Swolomon’s line', OPTIONS, async ($, on) => {
  world(on, TINY, { totalDoneSets: 3, lastByExercise: { 'Push-ups': { best: { any: 9 } } } })
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(drawnRows(await ui.drawn())).toEqual([
    `${COACH_NAME}: ${line('new-best', { day: TODAY })}`,
    '✓ Logged Push-ups 10 reps · new best · 1 of 2 today   0: Undo',
  ])
  await ui.unmount()
})

test('the rating shows the finished workout as dots after its buttons', () => {
  const band = ratingBand('A', TODAY, { workout: 0, targetsBefore: {}, results: { 'Push-ups': [{ result: 'done', count: 10 }, { result: 'skip' }] } }, 1)
  expect(band.trailing?.map(part => part.text).join('')).toBe('      ●○  1 of 2 done')
})

test('week marks: days before the plan began are never missed training days', () => {
  const plan: Plan = { ...TINY, schedule: { days: ['mon', 'wed', 'fri'] } }
  expect(weekMarks(plan, START, [], TODAY)).toEqual(['○', '·', '○', '·', '○', '·', '·'])
  expect(weekMarks(plan, START, [], TODAY, TODAY)).toEqual(['·', '·', '·', '·', '○', '·', '·'])
  expect(weekMarks(plan, START, [], TODAY, TODAY - 2)).toEqual(['·', '·', '○', '·', '○', '·', '·'])
})

test('a new plan records its first day, and the pane counts from it', OPTIONS, async ($, on) => {
  const store = ownStore(on, ACKED)
  world(on, null, 'own-store')
  await $.session.start(SESSION)
  await $.command.run(workout('quickstart'))
  await $.command.run(workout('desk'))
  expect(store.get('planStartedOn')).toBe(TODAY)
  await $.command.run(workout(''))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...STATUS })
  expect(drawnRows(await pane.drawn())).toContain('Mon ·  Tue ·  Wed ·  Thu ·  Fri ○  Sat ·  Sun ·')
  await pane.unmount()
})

test('paused: the pane says so first', OPTIONS, async ($, on) => {
  world(on, TINY, { paused: true })
  await $.session.start(SESSION)
  await $.command.run(workout(''))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...STATUS })
  expect(drawnRows(await pane.drawn())[0]).toBe('Paused. /workout resume to start again.')
  await pane.unmount()
})

test('one set this week reads as one set', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  await $.command.run(workout(''))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...STATUS })
  expect(drawnRows(await pane.drawn())).toContain('Showed up 1 day this month · 1 set this week · 1 total')
  await pane.unmount()
})
