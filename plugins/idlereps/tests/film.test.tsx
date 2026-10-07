import { expect, test } from 'claude-code/testing'

import { bandFilm, bandFilmSvg, FILM_MAX_CHARS, filmSvg } from '../hooks/film'
import { IDLE_SET_REPS, moveById, moveMs } from '../hooks/moves'
import { drawFigure } from '../hooks/figure'
import { decodeFrame, decodeRows } from '../hooks/portrait'
import { SPRITE } from '../hooks/swolomon-sprite'
import { ANIMATED, BAND, OPTIONS, SESSION, STATUS, TINY, workout, world } from './world'

/** Swolomon alive on the desktop (owner, 2026-10-06): his act and idling baked into one animated SVG. */

const base = { sprite: SPRITE, size: 'full' as const, isWin: false, moves: [] as string[] }

test('a film: the act once, as long as the move; then idle beats, no walks', () => {
  const { intro, loop } = bandFilm({ ...base, act: 'low-five' })
  const move = moveById('low-five')!
  expect(intro.reduce((sum, shot) => sum + shot.ms, 0)).toBe(moveMs(move))
  expect(loop.length).toBeGreaterThan(10)
  // The walks' frames are profiles: none in a film.
  const walk = JSON.stringify(decodeFrame(SPRITE, 'walkA'))
  expect(loop.some(shot => JSON.stringify(shot.grid) === walk)).toBe(false)
})

test('the mini head: no act, no moves; blinks and glances only', () => {
  const { intro, loop } = bandFilm({ ...base, size: 'mini', act: 'squat', moves: ['squat'] })
  expect(intro).toEqual([])
  expect(loop.every(shot => shot.grid.length === SPRITE.miniSize)).toBe(true)
})

test('on a set, the set’s move turns up in the loop', () => {
  const squat = moveById('squat')!
  const { loop } = bandFilm({ ...base, setMove: 'squat', moves: [] })
  const ms = loop.reduce((sum, shot) => sum + shot.ms, 0)
  expect(ms).toBeGreaterThan(moveMs(squat))
  expect(bandFilmSvg({ ...base, setMove: 'squat', moves: [] })).toContain('repeatCount="indefinite"')
})

test('the SVG: every frame once, hidden until its animation shows it; the act once, the loop forever', () => {
  const svg = filmSvg(bandFilm({ ...base, act: 'confetti' }), 16, 16)
  expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"')).toBe(true)
  expect(svg).toContain('begin="0ms"')
  expect(svg).toContain('repeatCount="indefinite"')
  const groups = svg.match(/<g visibility="hidden">/g) ?? []
  expect(groups.length).toBeGreaterThan(3)
  // keyTimes start at 0, as discrete animation needs.
  for (const [, times] of svg.matchAll(/keyTimes="([^"]*)"/g)) expect(times?.split(';')[0]).toBe('0')
})

test('one frame: shown as is, nothing to animate', () => {
  const grid = decodeFrame(SPRITE, 'idle')
  const svg = filmSvg({ intro: [], loop: [{ grid, ms: 1000 }] }, 16, 16)
  expect(svg).toContain('<g visibility="visible">')
})

test('under the engine’s bound for every act, with every move he has', () => {
  const all = ['squat', 'push-up', 'curl', 'dance', 'nap', 'moonwalk', 'press', 'row', 'deadlift', 'burpee']
  for (const act of ['high-five', 'confetti', 'fireworks', 'secret-handshake', 'victory-jump']) {
    expect([act, bandFilmSvg({ ...base, act, moves: all }).length <= FILM_MAX_CHARS]).toEqual([act, true])
  }
})

test('desktop, animated: once his line is out, the portrait is a living film', ANIMATED, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await clock.advance(10_000)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'desktop', ...BAND })
  const svg = (await ui.find({ type: 'Svg' })) as { props: { source: string; isInteractive?: boolean } } | undefined
  await ui.unmount()
  expect(svg?.props.isInteractive).toBe(true)
  expect(svg?.props.source).toContain('<animate')
})

test('desktop, not animated: the still picture', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'desktop', ...BAND })
  const svg = (await ui.find({ type: 'Svg' })) as { props: { source: string; isInteractive?: boolean } } | undefined
  await ui.unmount()
  expect(svg?.props.isInteractive).toBeUndefined()
  expect(svg?.props.source).not.toContain('<animate')
})

test('desktop, animated: the status pane has him living too', ANIMATED, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout(''))
  const pane = await $.ui.mount({ plugin: 'idlereps', surface: 'desktop', ...STATUS })
  const svg = (await pane.find({ type: 'Svg' })) as { props: { source: string; isInteractive?: boolean } } | undefined
  await pane.unmount()
  expect(svg?.props.isInteractive).toBe(true)
})

test('alive even between beats: he breathes, a pixel up and back, forever', () => {
  const svg = filmSvg(bandFilm({ ...base }), 16, 16)
  expect(svg).toMatch(/<animateTransform attributeName="transform" type="translate" calcMode="discrete" dur="\d+ms" repeatCount="indefinite" keyTimes="0;0.5" values="0 0;0 -1"/)
})

test('his breath keeps him planted: the whole picture never moves, only the part above his bottom rows', () => {
  const svg = filmSvg(bandFilm({ ...base }), 16, 16)
  expect(svg).not.toMatch(/<svg[^>]*><g><animateTransform/)
  expect(svg).toMatch(/<animate attributeName="visibility" calcMode="discrete" dur="\d+ms" repeatCount="indefinite" keyTimes="0;0.5" values="hidden;visible"\/>/)
})

test('idling, an exercise is a set of 20; the act at the start plays as drawn', () => {
  const squat = moveById('squat')!
  const once = squat.beats.length
  const squatFrames = new Set(squat.poses.map(p => JSON.stringify(decodeRows(SPRITE, drawFigure(p), 'squat', 16, 16))))
  const { intro, loop } = bandFilm({ ...base, act: 'squat', moves: ['squat'] })
  expect(intro.length).toBe(once * squat.reps)
  const shown = loop.filter(shot => squatFrames.has(JSON.stringify(shot.grid))).length
  expect(shown).toBeGreaterThan(0)
  expect(shown % (once * IDLE_SET_REPS)).toBe(0)
})

test('a loop is never only blinking: one of his moves every few beats when he has any', () => {
  const squat = moveById('squat')!
  const { loop } = bandFilm({ ...base, moves: ['squat'] })
  const squatFrames = new Set(squat.poses.map(p => JSON.stringify(decodeRows(SPRITE, drawFigure(p), 'squat', 16, 16))))
  const shown = loop.filter(shot => squatFrames.has(JSON.stringify(shot.grid))).length
  expect(shown).toBeGreaterThanOrEqual(squat.poses.length * 3)
})
