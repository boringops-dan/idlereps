import { expect, test } from 'claude-code/testing'

import { CELEBRATIONS, gestureOf } from '../hooks/celebrate'
import { MORE_CELEBRATION_LINES, MORE_CELEBRATION_MOVES, MORE_CELEBRATIONS } from '../hooks/celebrations-more'
import { isLineId, LINES } from '../hooks/copy'
import { DEMOS, drawMove, GESTURES, moveById, moveMs, MOVES } from '../hooks/moves'
import { encodeMove } from '../hooks/portrait'
import { SPRITE } from '../hooks/swolomon-sprite'

/** Fifty more celebrations (owner, 2026-10-06: "add 50 more ... celebrations"). */

test('fifty more, each its own: offered and shown, no id twice anywhere', () => {
  expect(MORE_CELEBRATIONS.length).toBeGreaterThanOrEqual(50)
  const offered = MORE_CELEBRATIONS.filter(c => c.kind === 'offer').length
  expect([offered >= 15, MORE_CELEBRATIONS.length - offered >= 30]).toEqual([true, true])
  expect(new Set(CELEBRATIONS.map(c => c.id)).size).toBe(CELEBRATIONS.length)
  const moveIds = [...MOVES, ...GESTURES, ...DEMOS].map(m => m.id)
  expect(new Set(moveIds).size).toBe(moveIds.length)
  for (const move of MORE_CELEBRATION_MOVES) expect([move.id, /^[a-z]+(-[a-z]+)*$/.test(move.id)]).toEqual([move.id, true])
})

test('an offered one: its hand held out, the contact, a short label, a landed line; a shown one: its gesture', () => {
  for (const c of MORE_CELEBRATIONS) {
    expect([c.id, c.line]).toEqual([c.id, `cel-${c.id}`])
    if (c.kind === 'offer') {
      expect([c.id, moveById(`${c.id}-offer`) !== undefined, moveById(c.id) !== undefined]).toEqual([c.id, true, true])
      // A short label, so the band still fits 80 columns.
      expect([c.id, (c.label ?? '').length > 0 && (c.label ?? '').length <= 12]).toEqual([c.id, true])
      expect([c.id, c.landed]).toEqual([c.id, `cel-${c.id}-landed`])
    } else {
      expect([c.id, moveById(gestureOf(c, 'shown'))?.id, c.label, c.landed, c.isFive]).toEqual([c.id, c.id, undefined, undefined, undefined])
    }
  }
  // Every gesture belongs to one of them: no strays.
  const wanted = new Set(MORE_CELEBRATIONS.flatMap(c => (c.kind === 'offer' ? [c.id, `${c.id}-offer`] : [c.id])))
  expect(MORE_CELEBRATION_MOVES.map(m => m.id).sort()).toEqual([...wanted].sort())
})

test('every gesture: 16 × 16 in his colours, really moves, shows him, over in under 3 seconds', () => {
  for (const move of MORE_CELEBRATION_MOVES) {
    const poses = drawMove(move)
    expect([move.id, poses.length >= 2]).toEqual([move.id, true])
    for (const [i, rows] of poses.entries()) {
      expect([move.id, i, rows.length, rows.every(r => r.length === 16)]).toEqual([move.id, i, 16, true])
      expect([move.id, i, rows.some(r => /[gh]/.test(r))]).toEqual([move.id, i, true])
    }
    expect(() => encodeMove(SPRITE, move.id, poses)).not.toThrow()
    for (const [pose] of move.beats) expect([move.id, pose >= 0 && pose < poses.length]).toEqual([move.id, true])
    expect([move.id, new Set(move.beats.map(([pose]) => poses[pose]?.join('\n'))).size >= 2]).toEqual([move.id, true])
    expect([move.id, moveMs(move) > 0 && moveMs(move) < 3000]).toEqual([move.id, true])
  }
})

test('every line they name exists, and every line here is named by one', () => {
  for (const c of MORE_CELEBRATIONS) {
    expect([c.id, isLineId(c.line), c.landed === undefined || isLineId(c.landed)]).toEqual([c.id, true, true])
  }
  const named = new Set(MORE_CELEBRATIONS.flatMap(c => [c.line, ...(c.landed === undefined ? [] : [c.landed])]))
  expect(MORE_CELEBRATION_LINES.map(l => l.id).filter(id => !named.has(id))).toEqual([])
  expect(new Set(LINES.map(l => l.id)).size).toBe(LINES.length)
})
