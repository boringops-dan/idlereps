import { expect, test } from 'claude-code/testing'

import { bandFilm } from '../hooks/film'
import { cameoGrid, decodeFrame, encodeCells, idleBeat } from '../hooks/portrait'
import type { Cameo } from '../hooks/portrait'
import { REGULARS, regularWalk } from '../hooks/regulars'
import { dressed, SEASONS } from '../hooks/season'
import { SPRITE } from '../hooks/swolomon-sprite'
import { ANIMATED, BAND, blitLog, SESSION, world } from './world'

/** The regulars in person (owner, 2026-10-06): walking past behind him, now and then, and named. */

const beats = (mode: 'band' | 'set', size: 'full' | 'mini' = 'full') => Array.from({ length: 2000 }, (_, n) => idleBeat(n, size, false, ['curl'], mode))
const cameosIn = (list: ReturnType<typeof beats>) => list.flatMap(b => b.steps.flatMap(s => ('cameo' in s ? [s.cameo.who] : [])))

test('each regular is his walk, laurel off, in their own colours; no two alike, none him', () => {
  const walks = REGULARS.map(r => regularWalk(SPRITE, r, 'walkA').join(''))
  for (const walk of walks) expect(walk).not.toMatch(/g/)
  expect(new Set([...walks, SPRITE.frames.walkA.join('')]).size).toBe(REGULARS.length + 1)
  for (const r of REGULARS) for (const frame of ['walkA', 'walkB'] as const) expect(() => decodeFrame({ ...SPRITE, frames: { ...SPRITE.frames, [frame]: regularWalk(SPRITE, r, frame) } }, frame)).not.toThrow()
})

test('behind him: his pixels untouched, theirs only where he is see-through, and in the shade', () => {
  const step: Cameo = { who: 'big-greg', walk: { frame: 'walkA', facing: 'right', x: -6, y: 0 }, pose: 'glanceL' }
  const grid = cameoGrid(SPRITE, SPRITE, step)
  const him = decodeFrame(SPRITE, 'glanceL')
  let theirs = 0
  him.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell !== null) expect(grid[r]?.[c]).toBe(cell)
      else if (grid[r]?.[c] !== null) theirs += 1
    }),
  )
  expect(theirs).toBeGreaterThan(0)
  // Out of the square entirely: just him.
  expect(cameoGrid(SPRITE, SPRITE, { ...step, walk: { ...step.walk, x: -16 } })).toEqual(him)
  // Unknown: just him.
  expect(cameoGrid(SPRITE, SPRITE, { ...step, who: 'nobody' })).toEqual(him)
})

test('in costume he wears it; they do not', () => {
  const agent = SEASONS.find(s => s.id === 'halloween')!.outfit
  const step: Cameo = { who: 'deadlift-doris', walk: { frame: 'walkA', facing: 'right', x: 10, y: 0 }, pose: 'idle' }
  const navy = SPRITE.palette.n as number
  // His suit, at full strength; behind him, out of costume, nothing of it.
  expect(cameoGrid(dressed(SPRITE, agent), SPRITE, step).flat().includes(navy)).toBe(true)
  expect(cameoGrid(SPRITE, SPRITE, step).flat().includes(navy)).toBe(false)
  // Doris, dressed or not, is the same Doris.
  const theirs = (grid: ReturnType<typeof cameoGrid>) => grid.map((row, r) => row.filter((_, c) => decodeFrame(dressed(SPRITE, agent), 'idle')[r]?.[c] === null && decodeFrame(SPRITE, 'idle')[r]?.[c] === null))
  expect(theirs(cameoGrid(dressed(SPRITE, agent), SPRITE, step))).toEqual(theirs(cameoGrid(SPRITE, SPRITE, step)))
})

test('now and then between lines, each regular; never on a set, never at the mini size; then he names them', () => {
  const seen = cameosIn(beats('band'))
  for (const r of REGULARS) expect(seen).toContain(r.id)
  // Rare: under one beat in twenty.
  expect(beats('band').filter(b => b.steps.some(s => 'cameo' in s)).length).toBeLessThan(2000 / 20)
  expect(cameosIn(beats('set'))).toEqual([])
  expect(cameosIn(beats('band', 'mini'))).toEqual([])
  const one = beats('band').find(b => b.steps.some(s => 'cameo' in s))!
  const last = one.steps.findIndex(s => 'aside' in s)
  expect(last).toBeGreaterThan(one.steps.findLastIndex(s => 'cameo' in s))
  // His eyes follow them across.
  const eyes = one.steps.flatMap(s => ('cameo' in s ? [s.cameo.pose] : []))
  expect(new Set(eyes)).toEqual(new Set(['glanceL', 'glanceR']))
})

test('the desktop film leaves them out', () => {
  const film = bandFilm({ sprite: SPRITE, size: 'full', isWin: false, moves: ['curl'], beats: 200 })
  // The frames where a regular shows (at the square's edges they are out of it, and it is just him).
  const cameos = new Set(
    beats('band').flatMap(b =>
      b.steps.flatMap(s => {
        if (!('cameo' in s)) return []
        const grid = JSON.stringify(cameoGrid(SPRITE, SPRITE, s.cameo))
        return grid === JSON.stringify(decodeFrame(SPRITE, s.cameo.pose)) ? [] : [grid]
      }),
    ),
  )
  expect(cameos.size).toBeGreaterThan(0)
  expect(film.loop.length).toBeGreaterThan(0)
  expect(film.loop.some(shot => cameos.has(JSON.stringify(shot.grid)))).toBe(false)
})

test('animated: on the band, a regular walks past behind him', ANIMATED, async ($, on) => {
  const { clock } = world(on, null, { moves: [] }, { fresh: true })
  const blits = blitLog(on)
  await $.session.start(SESSION)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  for (let i = 0; i < 120; i += 1) await clock.advance(10_000)
  const seen = new Set(blits.map(b => b.cells))
  const cameos = beats('band').flatMap(b => b.steps.flatMap(s => ('cameo' in s ? [s.cameo] : [])))
  expect(cameos.some(step => seen.has(encodeCells(cameoGrid(SPRITE, SPRITE, step))))).toBe(true)
  await ui.unmount()
})
