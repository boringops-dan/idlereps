import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { ASIDE_MS, ASIDES, asideSpot, asideText, hasAsides } from '../hooks/asides'
import { introBand, rankupBand, remindBand } from '../hooks/bands'
import { entryOf, line } from '../hooks/copy'
import type { LineId } from '../hooks/copy'
import { ANIMATED, BAND, drawnRows, OPTIONS, SESSION, TINY, TODAY, workout, world } from './world'

const variantsOf = (id: LineId): readonly string[] => entryOf(id).variants

/**
 * Swolomon's asides (owner, 2026-10-03: "so.. we doing this or what? hello? I'm bored"): while a band waits
 * on a choice, a quick word now and then, after a `/`, in its own colour, gone in a moment.
 */

const WIDE = { ...BAND, props: { ...BAND.props, bodyColumns: 160 } }

type Clock = { advance: (ms: number) => Promise<void> }

/** Watches the band in steps of `step` ms for `ms`: each step's drawn rows. */
async function watch($: Engine, clock: Clock, ms: number, mount: typeof BAND | typeof WIDE = BAND, step = 250) {
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...mount })
  const frames: string[][] = []
  for (let t = 0; t < ms; t += step) {
    await clock.advance(step)
    frames.push(drawnRows(await ui.drawn()))
  }
  await ui.unmount()
  return frames
}

const asideIn = (rows: readonly string[]) => rows.find(row => /(^|\s)\/ /.test(row))

/** The runs of steps an aside showed for, and its text each time. */
function runsOf(frames: readonly string[][]) {
  const runs: { from: number; steps: number; row: string }[] = []
  frames.forEach((rows, i) => {
    const row = asideIn(rows)
    if (row === undefined) return
    const last = runs.at(-1)
    if (last !== undefined && last.from + last.steps === i) last.steps += 1
    else runs.push({ from: i, steps: 1, row })
  })
  return runs
}

test('where an aside goes: under a title, else after his line when it fits; never on a set or a win', () => {
  const intro = introBand(TODAY)
  expect(asideSpot(intro, 'Hello?', { columns: 80, lineColumns: 70 })).toBe('under-title')
  expect(asideSpot(intro, 'Hello?', { columns: 5, lineColumns: 0 })).toBe('none')
  const remind = remindBand(line('remind-first', { day: TODAY }), TODAY, ['15 squats'])
  expect(asideSpot(remind, 'Hello?', { columns: 80, lineColumns: 60 })).toBe('after-line')
  expect(asideSpot(remind, 'Hello?', { columns: 80, lineColumns: 75 })).toBe('none')
  expect([intro, remind].every(hasAsides)).toBe(true)
  expect(hasAsides(rankupBand('Gym Rat', 'Yes!', 25))).toBe(false)
  expect(asideText('Hello?')).toBe('/ Hello?')
})

test('his asides: each with one address term, short, more impatient each time', () => {
  for (const { id } of ASIDES) {
    for (const variant of variantsOf(id)) {
      expect(variant.match(/\{mate\}/g)).toHaveLength(1)
      expect(asideText(variant).length).toBeLessThanOrEqual(50)
    }
  }
  const ats = ASIDES.map(a => a.at)
  expect(ats).toEqual([...ats].sort((a, b) => a - b))
  for (let i = 1; i < ats.length; i += 1) expect((ats[i] ?? 0) - (ats[i - 1] ?? 0)).toBeGreaterThan(ASIDE_MS)
})

test('animated: on the introduction, the aside shows in the blank row under the title, then goes', ANIMATED, async ($, on) => {
  const { clock } = world(on, null, {}, { fresh: true })
  await $.session.start(SESSION)
  const frames = await watch($, clock, 60_000)
  const runs = runsOf(frames)
  expect(runs.length).toBeGreaterThanOrEqual(2)
  for (const run of runs) {
    // Under the title: the second row, where the blank one was; the band no taller.
    expect(frames[run.from]?.[1]).toBe(run.row)
    expect(frames[run.from]?.length).toBe(frames[run.from - 1]?.length)
    // About three seconds, then gone.
    expect(run.steps * 250).toBeLessThanOrEqual(ASIDE_MS + 500)
    expect(run.steps * 250).toBeGreaterThanOrEqual(ASIDE_MS - 500)
  }
  const nudges = variantsOf('aside-nudge').map(v => v.split('{mate}')[0] ?? '')
  expect(nudges.some(start => runs[0]?.row.trim().startsWith(`/ ${start}`))).toBe(true)
})

test('animated: five asides in all, then he leaves it', ANIMATED, async ($, on) => {
  const { clock } = world(on, null, {}, { fresh: true })
  await $.session.start(SESSION)
  const runs = runsOf(await watch($, clock, 240_000, BAND, 500))
  expect(runs).toHaveLength(ASIDES.length)
})

test('animated: on a band without a title row, the aside goes after his line, where there is room', ANIMATED, async ($, on) => {
  const { clock } = world(on, null, { mode: 'remind' })
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  const runs = runsOf(await watch($, clock, 120_000, WIDE))
  expect(runs.length).toBeGreaterThan(0)
  for (const run of runs) expect(run.row).toMatch(/\S {3}\/ \S/)
})

test('animated: no room beside his line, no aside; nothing wraps', ANIMATED, async ($, on) => {
  const { clock } = world(on, null, { mode: 'remind' })
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  const narrow = { ...BAND, props: { ...BAND.props, bodyColumns: 70 } }
  expect(runsOf(await watch($, clock, 120_000, narrow))).toEqual([])
})

test('animated: none on a set they may be doing', ANIMATED, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  expect(runsOf(await watch($, clock, 90_000, WIDE))).toEqual([])
})

test('not animated: no asides', OPTIONS, async ($, on) => {
  const { clock } = world(on, null, {}, { fresh: true })
  await $.session.start(SESSION)
  expect(runsOf(await watch($, clock, 60_000))).toEqual([])
})

test('animated: answering the band ends its asides', ANIMATED, async ($, on) => {
  const { clock } = world(on, null, {}, { fresh: true })
  await $.session.start(SESSION)
  await watch($, clock, 20_000)
  await $.command.run(workout('notnow'))
  expect(runsOf(await watch($, clock, 120_000))).toEqual([])
})
