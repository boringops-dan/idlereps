import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { STARTER_MOVES, UNLOCK_ORDER, setsToNext } from '../hooks/collection'
import { FILM_MAX_CHARS, moveFilmSvg } from '../hooks/film'
import { moveById } from '../hooks/moves'
import { decodeCells } from '../hooks/portrait'
import { SPRITE } from '../hooks/swolomon-sprite'
import { ANIMATED, blitLog, cellsOf, COLLECTION, movesRows, OPTIONS, SESSION, textOf, TINY, workout, world } from './world'

/**
 * The move collection (owner, 2026-10-07: "show me what moves I've collected .. that's literally ON the
 * webpage"): /workout moves opens a pane of tiles as idlereps.app draws them.
 */

const ORDER = [...STARTER_MOVES, ...UNLOCK_ORDER]
const TOTAL = ORDER.length
const SILHOUETTE = 0x0d1130

type Pane = { find: (q: { key: string }) => Promise<unknown>; press: (q: { key: string }) => Promise<unknown>; unmount: () => Promise<unknown> }

const mountMoves = async ($: Engine, bodyColumns = 75, surface: 'terminal' | 'desktop' = 'terminal'): Promise<Pane> =>
  (await $.ui.mount({ plugin: 'idlereps', surface, ...COLLECTION, props: { ...COLLECTION.props, bodyColumns } })) as unknown as Pane

type Node = { props?: Record<string, unknown>; children?: (Node | string)[] }

/** A tile's two text rows (title, note) as drawn; undefined when the tile is not on the page. */
const tileText = async (pane: Pane, id: string): Promise<[string, string] | undefined> => {
  const tile = (await pane.find({ key: `t-${id}` })) as Node | undefined
  if (tile === undefined) return undefined
  const texts = (tile.children ?? []).slice(1).map(c => textOf(c as never))
  return [texts[0] ?? '', texts[1] ?? '']
}
const titleOf = async (pane: Pane, id: string) => (await tileText(pane, id))?.[0]
/** The footer's `Page n of m`. */
const pageOf = async (pane: Pane) => /Page \d+ of \d+/.exec(textOf((await pane.find({ key: 'footer' })) as never))?.[0]
const cellsAt = async (pane: Pane, key: string) => ((await pane.find({ key })) as { props: { cells: string } } | undefined)?.props.cells

test('a fresh install: /workout moves opens the pane, three of them and the next one’s distance', OPTIONS, async ($, on) => {
  const { w } = world(on, TINY, { moves: [], totalDoneSets: 0 })
  await $.session.start(SESSION)
  expect((await $.command.run(workout('moves'))).text ?? '').toBe('')
  expect(w.opened).toContain('workout-moves')
  const toGo = setsToNext(0, [])
  expect((await movesRows($, 75))[0]).toBe(`Moves 3 of ${TOTAL}  ·  next in ${toGo} ${toGo === 1 ? 'set' : 'sets'}`)
})

test('tiles in the reel’s order: the three they have by name, then the next as ???, then locked', OPTIONS, async ($, on) => {
  world(on, TINY, { moves: [], totalDoneSets: 0 })
  await $.session.start(SESSION)
  await $.command.run(workout('moves'))
  const pane = await mountMoves($)
  for (const id of STARTER_MOVES) expect(await titleOf(pane, id)).toBe(moveById(id)!.title.slice(0, 16))
  const toGo = setsToNext(0, [])!
  expect(await tileText(pane, ORDER[3]!)).toEqual(['???', `in ${toGo} ${toGo === 1 ? 'set' : 'sets'}`])
  expect(await tileText(pane, ORDER[4]!)).toEqual(['???', 'locked'])
  await pane.unmount()
})

test('a locked tile is the move’s first pose as a dark shape: one colour, nothing else', OPTIONS, async ($, on) => {
  world(on, TINY, { moves: [], totalDoneSets: 0 })
  await $.session.start(SESSION)
  await $.command.run(workout('moves'))
  const pane = await mountMoves($)
  const id = ORDER[4]!
  const grid = decodeCells((await cellsAt(pane, `tile-${id}`)) ?? '', SPRITE.width)
  const first = decodeCells(cellsOf(id)[0]!, SPRITE.width)
  expect(grid.map(row => row.map(c => c !== null))).toEqual(first.map(row => row.map(c => c !== null)))
  expect(new Set(grid.flat().filter(c => c !== null))).toEqual(new Set([SILHOUETTE]))
  await pane.unmount()
})

test('pages: four to a row at 75 columns, eight to a page; Next and Previous, each only where it goes', OPTIONS, async ($, on) => {
  world(on, TINY, { moves: [], totalDoneSets: 0 })
  await $.session.start(SESSION)
  await $.command.run(workout('moves'))
  const pages = Math.ceil(TOTAL / 8)
  let pane = await mountMoves($)
  expect([await pane.find({ key: 'prev' }), await pageOf(pane)]).toEqual([undefined, `Page 1 of ${pages}`])
  expect(await tileText(pane, ORDER[7]!)).toBeDefined()
  expect(await tileText(pane, ORDER[8]!)).toBeUndefined()
  await pane.press({ key: 'next' })
  await pane.unmount()
  pane = await mountMoves($)
  expect([await pageOf(pane), (await tileText(pane, ORDER[8]!)) !== undefined]).toEqual([`Page 2 of ${pages}`, true])
  await pane.press({ key: 'prev' })
  await pane.unmount()
  pane = await mountMoves($)
  expect(await pageOf(pane)).toBe(`Page 1 of ${pages}`)
  for (let i = 1; i < pages; i += 1) await pane.press({ key: 'next' })
  await pane.unmount()
  pane = await mountMoves($)
  expect([await pageOf(pane), await pane.find({ key: 'next' })]).toEqual([`Page ${pages} of ${pages}`, undefined])
  await pane.unmount()
})

test('it opens on the page holding the next move to unlock', OPTIONS, async ($, on) => {
  world(on, TINY, { moves: UNLOCK_ORDER.slice(0, 12), totalDoneSets: 200 })
  await $.session.start(SESSION)
  await $.command.run(workout('moves'))
  const pane = await mountMoves($)
  // Fifteen in hand (three and twelve): the next is the sixteenth, on page 2 at eight a page.
  expect(await pageOf(pane)).toBe(`Page 2 of ${Math.ceil(TOTAL / 8)}`)
  expect(await tileText(pane, ORDER[15]!)).toBeDefined()
  await pane.unmount()
})

test('animated: the moves they have play, each through its poses; a locked one never moves', ANIMATED, async ($, on) => {
  const { clock } = world(on, TINY, { moves: [], totalDoneSets: 0 })
  const blits = blitLog(on)
  await $.session.start(SESSION)
  await $.command.run(workout('moves'))
  const pane = await mountMoves($)
  await clock.advance(2_000)
  const squat = blits.filter(b => b.key === 'tile-squat').map(b => b.cells)
  expect(new Set(squat).size).toBeGreaterThanOrEqual(2)
  expect(squat.every(cells => cellsOf('squat').includes(cells))).toBe(true)
  expect(blits.some(b => !STARTER_MOVES.map(id => `tile-${id}`).includes(b.key))).toBe(false)
  await pane.unmount()
})

test('not animated: every tile still, no blits', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY, { moves: [], totalDoneSets: 0 })
  const blits = blitLog(on)
  await $.session.start(SESSION)
  await $.command.run(workout('moves'))
  const pane = await mountMoves($)
  await clock.advance(5_000)
  expect(blits).toEqual([])
  expect(await cellsAt(pane, 'tile-squat')).toBe(cellsOf('squat')[0])
  await pane.unmount()
})

test('Close closes it, and its moves stop with it', ANIMATED, async ($, on) => {
  const { clock, w } = world(on, TINY, { moves: [], totalDoneSets: 0 })
  const blits = blitLog(on)
  await $.session.start(SESSION)
  await $.command.run(workout('moves'))
  const pane = await mountMoves($)
  await clock.advance(1_000)
  await pane.press({ key: 'close' })
  expect(w.closed).toContain('workout-moves')
  const after = blits.length
  await clock.advance(10_000)
  expect(blits.length).toBe(after)
  await pane.unmount()
})

test('one timer for the page: a second’s blits never pass ten ticks for each tile playing', ANIMATED, async ($, on) => {
  // Seven in hand, the next on page 1 with them: seven tiles play.
  const { clock } = world(on, TINY, { moves: UNLOCK_ORDER.slice(0, 4), totalDoneSets: 200 })
  const blits = blitLog(on)
  await $.session.start(SESSION)
  await $.command.run(workout('moves'))
  const pane = await mountMoves($)
  await clock.advance(1_000)
  const playing = new Set(blits.map(b => b.key))
  expect(playing.size).toBe(7)
  expect(blits.length).toBeLessThanOrEqual(10 * 7 + 7)
  await pane.unmount()
})

test('desktop: the moves they have as playing films, the rest still dark shapes, one page, Close only', ANIMATED, async ($, on) => {
  world(on, TINY, { moves: [], totalDoneSets: 0 })
  await $.session.start(SESSION)
  await $.command.run(workout('moves'))
  const pane = await mountMoves($, 75, 'desktop')
  // The tile's art is its first child (an Svg keeps no key of its own in the drawn tree).
  const svg = async (id: string) => ((await pane.find({ key: `t-${id}` })) as { children?: { type?: string; props: { source: string; isInteractive?: boolean } }[] } | undefined)?.children?.[0]
  const have = await svg('squat')
  expect(have?.props.source).toContain('<animate')
  expect(have?.props.isInteractive).toBe(true)
  const locked = await svg(ORDER.at(-1)!)
  expect(locked?.props.source).not.toContain('<animate')
  expect(locked?.props.source).toContain('#0d1130')
  expect([await pane.find({ key: 'next' }), await pane.find({ key: 'prev' }), (await pane.find({ key: 'close' })) !== undefined]).toEqual([undefined, undefined, true])
  await pane.unmount()
})

test('too narrow for a tile: the collection as lines of text', OPTIONS, async ($, on) => {
  world(on, TINY, { moves: [], totalDoneSets: 0 })
  await $.session.start(SESSION)
  await $.command.run(workout('moves'))
  const rows = await movesRows($, 12)
  expect(rows.join('\n')).toContain(`3 of ${TOTAL}`)
  expect(rows.join('\n')).toContain(moveById('squat')!.title)
})

test('where the pane cannot open, /workout moves answers in text', OPTIONS, async ($, on) => {
  world(on, TINY, { moves: [], totalDoneSets: 0 }, { refuseOpen: true })
  await $.session.start(SESSION)
  const text = (await $.command.run(workout('moves'))).text ?? ''
  expect(text).toContain(`3 of ${TOTAL}`)
  expect(text).toContain(moveById('squat')!.title)
})

test('every move collected: All of them, and no locked tile anywhere', OPTIONS, async ($, on) => {
  world(on, TINY, { moves: [...UNLOCK_ORDER], totalDoneSets: 100_000 })
  await $.session.start(SESSION)
  await $.command.run(workout('moves'))
  expect((await movesRows($, 75))[0]).toBe(`Moves ${TOTAL} of ${TOTAL}  ·  All of them. Legend.`)
  const pane = await mountMoves($, 75, 'desktop')
  for (const id of ORDER) expect([id, await titleOf(pane, id)]).not.toEqual([id, '???'])
  await pane.unmount()
})

test('every move he can collect fits the desktop’s bound as a film of its own', () => {
  for (const id of ORDER) expect([id, moveFilmSvg(SPRITE, id).length <= FILM_MAX_CHARS]).toEqual([id, true])
})
