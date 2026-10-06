/**
 * Swolomon on the desktop, alive (owner, 2026-10-06: "do the desktop work"): where there are no terminal
 * cells to blit, his idling, his moves and his celebrations are baked into one SVG that animates itself
 * (SMIL, drawn in the surface's sandboxed frame): the band's act once, then a loop of idle beats, for as long
 * as the band shows. Pure.
 */

import { drawFigure } from './figure'
import { moveById } from './moves'
import { BREATH_HALF_MS, decodeFrame, decodeRows, frameFor, idleBeat, rectsOf } from './portrait'
import type { Grid, Pose, PortraitSize } from './portrait'
import type { Sprite } from './swolomon-sprite'

/** One frame of the film and how long it shows. */
export type Shot = { grid: Grid; ms: number }

/** The engine's bound on an Svg's source; the film stays under it with room to spare. */
export const FILM_MAX_CHARS = 120_000

/** Idle beats in one loop: about a minute of him, before it comes round again. */
export const FILM_BEATS = 12

/** The pauses between beats, shortened: a picture with no voice has to move more to look alive. */
const FILM_WAIT = 0.5

/** Every this many beats, one of his moves (when he has any), so a loop is never only blinking. */
const FILM_MOVE_EVERY = 3

/** His breathing: a pixel up and back, all the time, under everything else (the terminal's pace). */
const BREATH_MS = BREATH_HALF_MS * 2

/** A move's poses as grids, played through its beats and reps. */
function moveShots(sprite: Sprite, id: string): Shot[] {
  const move = moveById(id)
  if (move === undefined) return []
  const grids = move.poses.map((pose, i) => decodeRows(sprite, drawFigure(pose, sprite.outfit), `${id} pose ${i}`, sprite.width, sprite.height))
  return Array.from({ length: move.reps }, () => move.beats.flatMap(([pose, ms]) => (grids[pose] === undefined ? [] : [{ grid: grids[pose], ms }]))).flat()
}

/**
 * A band's film: its act (a move, at full size) once, then FILM_BEATS idle beats on a loop; on a set, the set
 * beats with its move. Walks and the regulars passing are left out (each step of one is a frame of its own,
 * too many for the source).
 */
export function bandFilm(opts: {
  sprite: Sprite
  size: PortraitSize
  isWin: boolean
  act?: string
  setMove?: string
  moves: readonly string[]
  beats?: number
}): { intro: Shot[]; loop: Shot[] } {
  const { sprite, size, isWin } = opts
  const pose = (p: Pose) => decodeFrame(sprite, frameFor(size, p))
  const intro = opts.act !== undefined && size === 'full' ? moveShots(sprite, opts.act) : []
  const moves = size === 'full' ? (opts.setMove !== undefined ? [opts.setMove, opts.setMove, ...opts.moves] : opts.moves) : []
  const loop: Shot[] = []
  for (let n = 0, taken = 0; taken < (opts.beats ?? FILM_BEATS) && n < 200; n += 1) {
    const picked = idleBeat(n, size, isWin, moves, opts.setMove === undefined ? 'band' : 'set')
    if (picked.steps.some(step => 'walk' in step || 'cameo' in step)) continue
    const isMoveDue = moves.length > 0 && taken % FILM_MOVE_EVERY === FILM_MOVE_EVERY - 1 && !picked.steps.some(step => 'move' in step)
    const beat = isMoveDue ? { ...picked, steps: [{ move: moves[Math.floor(taken / FILM_MOVE_EVERY) % moves.length] ?? '', ms: 0 }] } : picked
    taken += 1
    loop.push({ grid: pose(beat.rest), ms: Math.round(beat.wait * FILM_WAIT) })
    for (const step of beat.steps) {
      if ('pose' in step) loop.push({ grid: pose(step.pose), ms: step.ms })
      else if ('move' in step) loop.push(...moveShots(sprite, step.move))
    }
  }
  return { intro, loop }
}

/** Each run of shots for one frame, as SMIL's discrete visibility values over a timeline. */
function visibility(shots: readonly Shot[], key: (grid: Grid) => string, frame: string): { values: string; keyTimes: string } | null {
  const total = shots.reduce((sum, shot) => sum + shot.ms, 0)
  if (total <= 0 || !shots.some(shot => key(shot.grid) === frame)) return null
  const values: string[] = []
  const times: number[] = []
  let at = 0
  for (const shot of shots) {
    const value = key(shot.grid) === frame ? 'visible' : 'hidden'
    if (values.at(-1) !== value) {
      values.push(value)
      times.push(at / total)
    }
    at += shot.ms
  }
  return { values: values.join(';'), keyTimes: times.map(t => Number(t.toFixed(5))).join(';') }
}

/**
 * The film as one SVG: every distinct frame once, each shown and hidden by its own discrete animation; the
 * intro plays once from the start, the loop from its end, forever. With nothing to play, the first frame.
 */
export function filmSvg(film: { intro: readonly Shot[]; loop: readonly Shot[] }, width: number, height: number): string {
  const key = (grid: Grid) => JSON.stringify(grid)
  const frames = new Map<string, Grid>()
  for (const shot of [...film.intro, ...film.loop]) frames.set(key(shot.grid), shot.grid)
  const introMs = film.intro.reduce((sum, shot) => sum + shot.ms, 0)
  const loopMs = film.loop.reduce((sum, shot) => sum + shot.ms, 0)
  const groups = [...frames.entries()].map(([frame, grid]) => {
    const once = visibility(film.intro, key, frame)
    const always = visibility(film.loop, key, frame)
    const animations = [
      once === null ? '' : `<animate attributeName="visibility" calcMode="discrete" begin="0ms" dur="${introMs}ms" values="${once.values}" keyTimes="${once.keyTimes}"/>`,
      always === null ? '' : `<animate attributeName="visibility" calcMode="discrete" begin="${introMs}ms" dur="${loopMs}ms" repeatCount="indefinite" values="${always.values}" keyTimes="${always.keyTimes}"/>`,
    ].join('')
    // Hidden until its animation shows it; a film of one frame simply shows it.
    const shown = frames.size === 1 ? 'visible' : 'hidden'
    return `<g visibility="${shown}">${animations}${rectsOf(grid)}</g>`
  })
  // Breathing: the whole of him a pixel up for half of each breath, so even a still frame lives.
  const breath = frames.size > 1 ? `<animateTransform attributeName="transform" type="translate" calcMode="discrete" dur="${BREATH_MS}ms" repeatCount="indefinite" values="0 0;0 -1" keyTimes="0;0.5"/>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges"><g>${breath}${groups.join('')}</g></svg>`
}

/** A band's film as an SVG under the engine's bound: fewer idle beats until it fits. */
export function bandFilmSvg(opts: Parameters<typeof bandFilm>[0]): string {
  const side = opts.size === 'full' ? opts.sprite.width : opts.sprite.miniSize
  for (let beats = opts.beats ?? FILM_BEATS; beats >= 1; beats -= 1) {
    const svg = filmSvg(bandFilm({ ...opts, beats }), side, side)
    if (svg.length <= FILM_MAX_CHARS || beats === 1) return svg
  }
  return filmSvg({ intro: [], loop: [] }, side, side)
}
