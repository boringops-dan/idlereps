import { expect, test } from 'claude-code/testing'

import { DEMOS, drawMove, GESTURES, moveById, moveMs, MOVES } from '../hooks/moves'
import type { Move } from '../hooks/moves'
import { IDLES } from '../hooks/idles'
import { IDLES_A } from '../hooks/idles-a'
import { IDLES_B } from '../hooks/idles-b'
import { IDLES_C } from '../hooks/idles-c'
import { IDLES_D } from '../hooks/idles-d'
import { encodeMove, idleBeat } from '../hooks/portrait'
import { SPRITE } from '../hooks/swolomon-sprite'

/** His idle animations (owner, 2026-10-12: "He also needs like 100 more idle animations to keep it fun"). */

const pictures = (move: Move): string[] => drawMove(move).map(rows => rows.join('\n'))
const IDS = new Set(IDLES.map(m => m.id))

test('a hundred, twenty-five a set, each its own id, all idle', () => {
  expect(IDLES.length).toBeGreaterThanOrEqual(100)
  for (const set of [IDLES_A, IDLES_B, IDLES_C, IDLES_D]) expect(set.length).toBeGreaterThanOrEqual(25)
  expect(IDS.size).toBe(IDLES.length)
  for (const m of IDLES) expect([m.id, /^[a-z]+(-[a-z]+)*$/.test(m.id), m.family]).toEqual([m.id, true, 'idle'])
})

test('no id taken by a move, gesture or demo; never in the collection', () => {
  const others = [...MOVES, ...GESTURES, ...DEMOS].map(m => m.id)
  expect(others.filter(id => IDS.has(id))).toEqual([])
  for (const m of IDLES) expect(moveById(m.id)).toBe(m)
  expect(MOVES.filter(m => m.family === 'idle')).toEqual([])
})

test('titles are short, plain and each its own', () => {
  for (const m of IDLES) expect([m.id, m.title.length >= 3 && m.title.length <= 22, /^[A-Z]/.test(m.title)]).toEqual([m.id, true, true])
  expect(new Set(IDLES.map(m => m.title)).size).toBe(IDLES.length)
})

test('every pose a 16 × 16 frame in his colours, with him in it, and every animation really moves', () => {
  for (const move of IDLES) {
    const poses = drawMove(move)
    expect([move.id, poses.length >= 2]).toEqual([move.id, true])
    for (const rows of poses) expect([move.id, rows.length, rows.every(r => r.length === 16), rows.some(r => /[gh]/.test(r))]).toEqual([move.id, 16, true, true])
    expect(() => encodeMove(SPRITE, move.id, poses)).not.toThrow()
    for (const [pose] of move.beats) expect([move.id, pose >= 0 && pose < poses.length]).toEqual([move.id, true])
    expect([move.id, new Set(move.beats.map(([pose]) => poses[pose]?.join('\n'))).size >= 2]).toEqual([move.id, true])
  }
})

test('every pose is played, and one play is one to eight seconds', () => {
  for (const move of IDLES) {
    expect([move.id, new Set(move.beats.map(([pose]) => pose)).size]).toEqual([move.id, move.poses.length])
    expect([move.id, moveMs(move) >= 1000 && moveMs(move) <= 8000]).toEqual([move.id, true])
  }
})

test('no two animations play the same pictures, and none plays another move’s', () => {
  const seen = new Map<string, string>()
  for (const move of [...MOVES, ...GESTURES, ...DEMOS]) seen.set(pictures(move).join('\n\n'), move.id)
  for (const move of IDLES) {
    const key = pictures(move).join('\n\n')
    expect([move.id, seen.get(key)]).toEqual([move.id, undefined])
    seen.set(key, move.id)
  }
})

test('his idle beats play them from the first day, at full size only, and many of them in an hour', () => {
  const played = new Set<string>()
  for (let n = 0; n < 900; n++) {
    for (const step of idleBeat(n, 'full', false, []).steps) if ('move' in step) played.add(step.move)
    expect(idleBeat(n, 'mini', false, []).steps.some(step => 'move' in step)).toBe(false)
  }
  expect([...played].every(id => IDS.has(id))).toBe(true)
  expect(played.size).toBeGreaterThanOrEqual(Math.min(60, IDLES.length))
})
