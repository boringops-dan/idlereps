import { expect, test } from 'claude-code/testing'

import type { Cue } from '../types'
import { duringSetLineId } from '../hooks/bands'
import { line } from '../hooks/copy'
import { drawFigure } from '../hooks/figure'
import { bandFilmSvg } from '../hooks/film'
import { drawMove, GESTURES, MOVES, moveById } from '../hooks/moves'
import { dayNumberOf } from '../hooks/plan'
import { decodeCells, decodeFrame, encodeMove } from '../hooks/portrait'
import { dressed, monthDayOf, SEASONS, seasonBeganOn, seasonOf } from '../hooks/season'
import { SPRITE } from '../hooks/swolomon-sprite'
import { BAND, OPTIONS, SESSION, TINY, workout, world } from './world'

/** His seasons (owner, 2026-10-06: "more Swolomon"): dressed for the day, and saying so. */

const dayOf = (month: number, date: number, year = 2026) => dayNumberOf(Date.UTC(year, month - 1, date, 12))
const noonOf = (month: number, date: number, year = 2026) => Date.UTC(year, month - 1, date, 12)
/** His Halloween suit's navy: on none of his bust frames out of costume. */
const NAVY = SPRITE.palette.n as number

test('the calendar: each season on its days, none between, New Year across the year’s end', () => {
  expect(seasonOf(dayOf(10, 20))?.id).toBe('birthday')
  expect(seasonOf(dayOf(10, 23))).toBeNull()
  expect(seasonOf(dayOf(10, 24))?.id).toBe('halloween')
  expect(seasonOf(dayOf(10, 31))?.id).toBe('halloween')
  expect(seasonOf(dayOf(11, 1))).toBeNull()
  expect(seasonOf(dayOf(12, 25))?.id).toBe('winter')
  expect(seasonOf(dayOf(12, 31))?.id).toBe('new-year')
  expect(seasonOf(dayOf(1, 2, 2027))?.id).toBe('new-year')
  expect(seasonOf(dayOf(1, 3, 2027))).toBeNull()
  expect(seasonOf(dayOf(2, 14, 2027))?.id).toBe('valentines')
  expect(seasonOf(dayOf(3, 17, 2027))?.id).toBe('st-patricks')
  expect(seasonOf(dayOf(4, 1, 2027))?.id).toBe('april-fools')
  expect(seasonOf(dayOf(7, 4, 2027))).toBeNull()
  expect(monthDayOf(dayOf(2, 29, 2028))).toEqual([2, 29])
})

test('when a season began: its first day, across the new year; out of season, the day itself', () => {
  expect(seasonBeganOn(dayOf(10, 28))).toBe(dayOf(10, 24))
  expect(seasonBeganOn(dayOf(1, 2, 2027))).toBe(dayOf(12, 31))
  expect(seasonBeganOn(dayOf(7, 4))).toBe(dayOf(7, 4))
})

test('every outfit: every frame still decodes, and the portrait, walk and mini head all wear it', () => {
  for (const { outfit } of SEASONS) {
    const sprite = dressed(SPRITE, outfit)
    for (const name of Object.keys(sprite.frames) as (keyof typeof sprite.frames)[]) expect(() => decodeFrame(sprite, name)).not.toThrow()
    for (const name of ['idle', 'talkA', 'blink', 'walkA', 'walkB', 'miniIdle'] as const) {
      expect([outfit.id, name, decodeFrame(sprite, name)]).not.toEqual([outfit.id, name, decodeFrame(SPRITE, name)])
    }
  }
  expect(dressed(SPRITE, null)).toBe(SPRITE)
})

test('his moves wear it too: every move decodes dressed; the hat comes off with the laurel', () => {
  for (const { outfit } of SEASONS) {
    for (const move of [...MOVES, ...GESTURES]) expect(() => encodeMove(dressed(SPRITE, outfit), move.id, drawMove(move, outfit))).not.toThrow()
  }
  const agent = SEASONS.find(s => s.id === 'halloween')!.outfit
  const curl = moveById('curl')!.poses[0]!
  // His shades and antenna over his head; off with the laurel.
  expect(drawFigure(curl, agent).join('\n')).toContain('kkkkkk')
  expect(drawFigure(curl).join('\n')).not.toContain('kkkkkk')
  expect(drawFigure({ ...curl, head: { ...curl.head!, bare: true } }, agent)).toEqual(drawFigure({ ...curl, head: { ...curl.head!, bare: true } }))
  // Facing either way, dressed, and mirrored.
  for (const facing of ['right', 'left'] as const) {
    const turnedHead = { ...curl, head: { ...curl.head!, facing } }
    expect(drawFigure(turnedHead, agent)).not.toEqual(drawFigure(turnedHead))
  }
})

test('the desktop film wears it', () => {
  const agent = SEASONS.find(s => s.id === 'halloween')!.outfit
  const opts = { size: 'full' as const, isWin: false, act: 'curl', moves: ['curl'] }
  expect(bandFilmSvg({ sprite: dressed(SPRITE, agent), ...opts })).not.toBe(bandFilmSvg({ sprite: SPRITE, ...opts }))
})

test('the set band’s banter is the season’s, in season', () => {
  const cue = { step: 2, exercise: { name: 'Push-ups' } } as unknown as Cue
  expect(duringSetLineId(cue)).toBe('set-banter')
  expect(duringSetLineId(cue, seasonOf(dayOf(10, 31)))).toBe('season-halloween-banter')
  expect(duringSetLineId({ ...cue, step: 1 } as Cue, seasonOf(dayOf(10, 31)))).toBe('set-cheer')
})

test('Halloween: he comes as your agent (his idea of one) on the band, and says so once that season', OPTIONS, async ($, on) => {
  const today = dayOf(10, 31)
  const { w, clock } = world(on, TINY, { lastSeenOn: today - 1 }, { now: noonOf(10, 31) })
  await $.session.start(SESSION)
  expect(w.toasts).toContain(line('season-halloween', { day: today }))
  await $.command.run(workout('flex'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  const raster = (await ui.find({ key: 'swolomon' })) as unknown as { props: { cells: string; columns: number } }
  expect(decodeCells(raster.props.cells, raster.props.columns).flat().some(cell => cell === NAVY)).toBe(true)
  await ui.unmount()
  // Next day, still Halloween: the usual hello, not the season's again.
  w.toasts.length = 0
  await clock.advance(24 * 3_600_000)
  await $.session.start(SESSION)
  expect(w.toasts).not.toContain(line('season-halloween', { day: today + 1 }))
})

test('out of season he wears nothing extra; the first session ever has no season hello', OPTIONS, async ($, on) => {
  const { w } = world(on, TINY, {}, { now: noonOf(10, 31) })
  await $.session.start(SESSION)
  expect(w.toasts).not.toContain(line('season-halloween', { day: dayOf(10, 31) }))
})
