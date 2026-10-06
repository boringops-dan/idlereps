import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { line } from '../hooks/copy'
import { prepBand } from '../hooks/bands'
import { moveById } from '../hooks/moves'
import { afterSet, chapterOf, CHAPTERS, compete, competitionOf, COMPETITIONS, isPosing, PREP_SETS, resultOf } from '../hooks/prep'
import type { Prep } from '../hooks/prep'
import { ANIMATED, BAND, blitLog, cellsOf, drawnRows, OPTIONS, ownStore, SESSION, STATUS, TINY, TODAY, workout, world } from './world'

/** Swolomon's competitions (owner, 2026-10-03: "a shared goal"): your sets are his prep. */

const REMIND = { mode: 'remind' }
const prep = (sets: number, extra: Partial<Prep> = {}): Prep => ({ stage: 0, from: 100 - sets, medals: [], ...extra })

async function bandOf($: Engine) {
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  const rows = drawnRows(await ui.drawn())
  const keys = (await ui.findAll({ type: 'Button' })).map(b => String(b.key))
  const act = ((await ui.find({ key: 'swolomon' })) as unknown) !== undefined
  await ui.unmount()
  return { keys, text: rows.join('\n'), act }
}

test('the prep: begun on the second set, halfway, ready at 30, and it waits there', () => {
  expect(afterSet(undefined, 1)).toEqual({})
  expect(afterSet(undefined, 2)).toEqual({ prep: { stage: 0, from: 1, medals: [] }, news: 'prep-start' })
  expect(afterSet(prep(PREP_SETS / 2), 100).news).toBe('prep-halfway')
  expect(afterSet(prep(PREP_SETS / 2 + 1), 100).news).toBeUndefined()
  expect(afterSet(prep(PREP_SETS), 100)).toEqual({ prep: { ...prep(PREP_SETS), isReady: true }, news: 'prep-ready' })
  expect(afterSet(prep(PREP_SETS + 5, { isReady: true }), 105)).toEqual({ prep: prep(PREP_SETS + 5, { isReady: true }) })
})

test('competing: gold mostly, silver on the second and every fourth after; the next prep from now', () => {
  expect([0, 1, 2, 3, 4, 5].map(resultOf)).toEqual(['gold', 'silver', 'gold', 'gold', 'gold', 'silver'])
  expect(compete(prep(PREP_SETS, { isReady: true }), 140)).toEqual({ prep: { stage: 1, from: 140, medals: ['gold'] }, medal: 'gold', competition: 'Regionals' })
  expect(competitionOf(COMPETITIONS.length)).toBe('Regionals')
})

test('the second set ever: he enters Regionals', OPTIONS, async ($, on) => {
  const store = ownStore(on, { totalDoneSets: 1 })
  const { w } = world(on, TINY, 'own-store')
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  expect(w.toasts).toContain(line('prep-start', { day: TODAY, competition: 'Regionals' }))
  expect(store.get('prep')).toEqual({ stage: 0, from: 1, medals: [] })
})

test('the last set of his prep (Just remind me): off to compete; the pane says so', OPTIONS, async ($, on) => {
  const store = ownStore(on, { ...REMIND, totalDoneSets: 100, prep: prep(PREP_SETS - 1) })
  const { w } = world(on, null, 'own-store')
  await $.session.start(SESSION)
  await $.command.run(workout('log'))
  await $.command.run(workout('upper'))
  expect(w.toasts.some(t => t.includes('prep') || t.includes('Prep'))).toBe(true)
  expect((store.get('prep') as Prep).isReady).toBe(true)
  await $.command.run(workout(''))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...STATUS })
  expect(drawnRows(await pane.drawn()).join('\n')).toContain('Swolomon competes at Regionals before your next session')
  await pane.unmount()
})

test('the next session: back with gold, the trophy lifted; Let’s go; the next prep begun', OPTIONS, async ($, on) => {
  const store = ownStore(on, { totalDoneSets: 100, prep: prep(PREP_SETS, { isReady: true }) })
  world(on, TINY, 'own-store')
  await $.session.start(SESSION)
  const band = await bandOf($)
  expect(band.keys).toEqual(['letsgo'])
  expect(band.text).toContain('Regionals · 🥇 gold · medal 1')
  expect(band.text).toMatch(/Gold/)
  expect(store.get('prep')).toEqual({ stage: 1, from: 100, medals: ['gold'] })
  await $.command.run(workout('letsgo'))
  expect((await bandOf($)).keys).toEqual([])
})

test('silver at Nationals, taken well', OPTIONS, async ($, on) => {
  world(on, TINY, { totalDoneSets: 100, prep: prep(PREP_SETS, { stage: 1, isReady: true, medals: ['gold'] }) })
  await $.session.start(SESSION)
  const band = await bandOf($)
  expect(band.text).toContain('Nationals · 🥈 silver · medal 2')
  expect(band.text).toMatch(/Silver|Second/)
})

test('the pane: his prep bar and medals', OPTIONS, async ($, on) => {
  world(on, TINY, { totalDoneSets: 100, prep: prep(12, { stage: 2, medals: ['gold', 'silver'] }) })
  await $.session.start(SESSION)
  await $.command.run(workout(''))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...STATUS })
  expect(drawnRows(await pane.drawn()).join('\n')).toMatch(/Swolomon's prep for Worlds +\S+ +12\/30 · meal prep +🥇🥈/)
  await pane.unmount()
})

test('the next prompt puts the medal band away', OPTIONS, async ($, on) => {
  world(on, TINY, { totalDoneSets: 100, prep: prep(PREP_SETS, { isReady: true }) })
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  expect((await bandOf($)).keys).toEqual([])
})

test('his story in chapters: meal prep at 8, halfway, posing practice at 22, peak week at 28; once each', () => {
  expect(afterSet(prep(8), 100).news).toBe('prep-diet')
  expect(afterSet(prep(9), 100).news).toBeUndefined()
  expect(afterSet(prep(22), 100).news).toBe('prep-posing')
  expect(afterSet(prep(28), 100).news).toBe('prep-peak')
  expect(Object.values(CHAPTERS)).toEqual(['prep-diet', 'prep-halfway', 'prep-posing', 'prep-peak'])
})

test('the chapter he is in, and when he practises his poses', () => {
  expect(chapterOf(prep(3), 100)).toBeNull()
  expect(chapterOf(prep(8), 100)).toBe('meal prep')
  expect(chapterOf(prep(23), 100)).toBe('posing practice')
  expect(chapterOf(prep(29), 100)).toBe('peak week')
  expect(isPosing(prep(21), 100)).toBe(false)
  expect(isPosing(prep(22), 100)).toBe(true)
  expect(isPosing(prep(PREP_SETS, { isReady: true }), 100)).toBe(false)
  expect(isPosing(undefined, 100)).toBe(false)
})

test('show day: the medal band plays his posing routine, gold or silver', () => {
  expect(moveById('posing-routine')?.poses.length).toBe(5)
  expect(prepBand('x', 'Regionals', 'gold', 1).act).toBe('posing-routine')
  expect(prepBand('x', 'Nationals', 'silver', 2).act).toBe('posing-routine')
})

test('animated: in posing practice, between lines he practises his flexes and his routine, not his other moves', ANIMATED, async ($, on) => {
  const { clock } = world(on, null, { moves: [], totalDoneSets: 100, prep: prep(25) }, { fresh: true })
  const blits = blitLog(on)
  await $.session.start(SESSION)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  for (let i = 0; i < 40; i += 1) await clock.advance(10_000)
  const seen = new Set(blits.map(b => b.cells))
  expect(cellsOf('posing-routine').some(cells => seen.has(cells))).toBe(true)
  expect(['squat', 'curl'].some(id => cellsOf(id).some(cells => seen.has(cells) && !cellsOf('posing-routine').includes(cells)))).toBe(false)
  await ui.unmount()
})

test('the pane names the chapter', OPTIONS, async ($, on) => {
  world(on, TINY, { totalDoneSets: 100, prep: prep(24) })
  await $.session.start(SESSION)
  await $.command.run(workout(''))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...STATUS })
  expect(drawnRows(await pane.drawn()).join('\n')).toContain('24/30 · posing practice')
  await pane.unmount()
})
