import { expect, test } from 'claude-code/testing'

import { drawMove, DEMOS, GESTURES, moveById, moveMs, MOVES } from '../hooks/moves'
import { collected, STARTER_MOVES, UNLOCK_ORDER } from '../hooks/collection'
import { drawFigure, shift, turned } from '../hooks/figure'
import type { Figure } from '../hooks/figure'
import { MORE_MOVES, MORE_UNLOCK_ORDER } from '../hooks/moves-more'
import { encodeMove } from '../hooks/portrait'
import { SPRITE } from '../hooks/swolomon-sprite'

/** His moves to collect, the second fifty (hooks/moves-more.ts): flexes and gags, the slacking off among them. */

const MORE_IDS = new Set(MORE_MOVES.map(m => m.id))

test('at least fifty more, each its own, flexes and gags only', () => {
  expect(MORE_MOVES.length).toBeGreaterThanOrEqual(50)
  expect(MORE_IDS.size).toBe(MORE_MOVES.length)
  for (const m of MORE_MOVES) expect([m.id, /^[a-z]+(-[a-z]+)*$/.test(m.id), m.family === 'flex' || m.family === 'gag']).toEqual([m.id, true, true])
  const count = (family: string) => MORE_MOVES.filter(m => m.family === family).length
  expect([count('flex') >= 15, count('gag') >= 30]).toEqual([true, true])
})

test('no id taken by another move, gesture or demo', () => {
  const others = [...MOVES.filter(m => !MORE_MOVES.includes(m)), ...GESTURES, ...DEMOS].map(m => m.id)
  expect(others.filter(id => MORE_IDS.has(id))).toEqual([])
  for (const m of MORE_MOVES) expect(moveById(m.id)).toBe(m)
})

test('titles are short and plain: they show on the unlock and in the list', () => {
  for (const m of MORE_MOVES) expect([m.id, m.title.length >= 3 && m.title.length <= 22, /^[A-Z]/.test(m.title)]).toEqual([m.id, true, true])
  expect(new Set(MORE_MOVES.map(m => m.title)).size).toBe(MORE_MOVES.length)
})

test('every pose a 16 × 16 frame in his colours, with him in it, and every move really moves', () => {
  for (const move of MORE_MOVES) {
    const poses = drawMove(move)
    expect([move.id, poses.length >= 2]).toEqual([move.id, true])
    for (const rows of poses) expect([move.id, rows.length, rows.every(r => r.length === 16), rows.some(r => /[gh]/.test(r))]).toEqual([move.id, 16, true, true])
    expect(() => encodeMove(SPRITE, move.id, poses)).not.toThrow()
    for (const [pose] of move.beats) expect([move.id, pose >= 0 && pose < poses.length]).toEqual([move.id, true])
    const played = new Set(move.beats.map(([pose]) => poses[pose]?.join('\n')))
    expect([move.id, played.size >= 2]).toEqual([move.id, true])
  }
})

test('every pose is played, and one play is one to eight seconds', () => {
  for (const move of MORE_MOVES) {
    const used = new Set(move.beats.map(([pose]) => pose))
    expect([move.id, used.size]).toEqual([move.id, move.poses.length])
    expect([move.id, moveMs(move) >= 1000 && moveMs(move) <= 8000]).toEqual([move.id, true])
  }
})

test('all of them collectable, once each, after the first thirty', () => {
  expect([...MORE_UNLOCK_ORDER].sort()).toEqual([...MORE_IDS].sort())
  expect(new Set(MORE_UNLOCK_ORDER).size).toBe(MORE_UNLOCK_ORDER.length)
  expect(UNLOCK_ORDER.slice(-MORE_UNLOCK_ORDER.length)).toEqual([...MORE_UNLOCK_ORDER])
  expect(STARTER_MOVES.length + UNLOCK_ORDER.length).toBe(MOVES.length)
  expect(new Set([...STARTER_MOVES, ...UNLOCK_ORDER]).size).toBe(MOVES.length)
  expect(collected([...UNLOCK_ORDER]).map(m => m.id).slice(-MORE_UNLOCK_ORDER.length)).toEqual([...MORE_UNLOCK_ORDER])
})

test('the unlock order spreads the flexes between the gags: never more than three of a family in a row', () => {
  const families = MORE_UNLOCK_ORDER.map(id => moveById(id)?.family)
  const longest = families.reduce<{ run: number; best: number; last?: string }>((acc, f) => (f === acc.last ? { run: acc.run + 1, best: Math.max(acc.best, acc.run + 1), last: f } : { run: 1, best: Math.max(acc.best, 1), last: f }), { run: 0, best: 0 })
  expect(longest.best).toBeLessThanOrEqual(3)
})

// ---------------------------------------------------------------------------------------------------------
// The slacking-off props (figure.ts): drawn, moved and turned like the others.

const SNACKS = ['pizza', 'donut', 'burger', 'soda', 'handheld', 'phone', 'remote', 'headphones', 'pad'] as const
const bare: Figure = { head: { at: [5, 0], facing: 'front' } }

test('each new prop draws, in the palette, where it is put', () => {
  for (const kind of SNACKS) {
    const rows = drawFigure({ ...bare, props: [{ kind, at: [8, 9] }] })
    expect([kind, rows.slice(9).some(r => r.slice(8) !== '.'.repeat(8))]).toEqual([kind, true])
    expect([kind, rows.slice(0, 9).join('') === drawFigure(bare).slice(0, 9).join('')]).toEqual([kind, true])
    expect(() => encodeMove(SPRITE, kind, [rows])).not.toThrow()
  }
  const small = drawFigure({ ...bare, props: [{ kind: 'bubble', at: [7, 10] }] }).join('')
  const big = drawFigure({ ...bare, props: [{ kind: 'bubble', at: [7, 10], big: true }] }).join('')
  expect([...big].filter(c => c === 'u').length).toBeGreaterThan([...small].filter(c => c === 'u').length)
})

test('the beanbag is behind him, the snacks in front', () => {
  const seat = drawFigure({ torso: { from: [8, 6], to: [8, 10] }, props: [{ kind: 'beanbag', at: [2, 6] }] })
  expect(seat[8]?.[8]).toBe('t')
  const snack = drawFigure({ torso: { from: [8, 6], to: [8, 10] }, props: [{ kind: 'burger', at: [6, 7] }] })
  expect(snack[9]?.slice(6, 10)).toBe('RRRR')
})

test('a new prop moves with him and turns with him', () => {
  const f: Figure = { ...bare, props: [{ kind: 'bubble', at: [3, 4], big: true }, { kind: 'phone', at: [12, 2] }] }
  expect(shift(f, 1, 2).props).toEqual([
    { kind: 'bubble', at: [4, 6], big: true },
    { kind: 'phone', at: [13, 4] },
  ])
  expect(turned(f).props).toEqual([
    { kind: 'bubble', at: [12, 4], big: true },
    { kind: 'phone', at: [3, 2] },
  ])
})
