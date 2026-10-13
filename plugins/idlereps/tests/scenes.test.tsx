import { expect, test } from 'claude-code/testing'

import { LINES } from '../hooks/copy'
import { STARTER_MOVES, UNLOCK_ORDER } from '../hooks/collection'
import { moveById, MOVES } from '../hooks/moves'
import { BUST_SCALE, DOLLY_STEP, framed, idleBeat, isOffFrame, scaleOf } from '../hooks/portrait'
import type { IdleStep } from '../hooks/portrait'
import { SCENES } from '../hooks/scenes'
import { asideText } from '../hooks/asides'
import { ANIMATED, BAND, drawnRows, SESSION, world } from './world'

/** His scenes (owner, 2026-10-12: "Add even more personality. 50 more scenes"). */

const movesIn = (steps: readonly IdleStep[]): string[] =>
  steps.flatMap(step => ('move' in step ? [step.move] : 'far' in step && 'move' in step.far.src ? [step.far.src.move] : []))
const wordsIn = (steps: readonly IdleStep[]): string[] => steps.flatMap(step => ('aside' in step ? [step.aside] : []))
const msOf = (steps: readonly IdleStep[]): number =>
  steps.reduce((sum, step) => {
    if (!('move' in step)) return sum + step.ms
    const move = moveById(step.move)!
    return sum + step.reps * move.beats.reduce((ms, [, length]) => ms + length, 0)
  }, 0)
const IDS = new Set(LINES.map(entry => entry.id as string))

test('fifty of them, each its own', () => {
  expect(SCENES.length).toBeGreaterThanOrEqual(50)
  expect(new Set(SCENES.map(s => s.id)).size).toBe(SCENES.length)
  expect(new Set(SCENES.map(s => JSON.stringify(s.steps))).size).toBe(SCENES.length)
})

test('everything he does in one is a move of his, and never a move still to be collected', () => {
  const locked = new Set(MOVES.map(m => m.id).filter(id => !STARTER_MOVES.includes(id)))
  for (const scene of SCENES) {
    const used = movesIn(scene.steps)
    expect([scene.id, used.filter(id => moveById(id) === undefined)]).toEqual([scene.id, []])
    expect([scene.id, used.filter(id => locked.has(id))]).toEqual([scene.id, []])
  }
  expect(UNLOCK_ORDER.every(id => locked.has(id) || !MOVES.some(m => m.id === id))).toBe(true)
})

test('his words are lines of his, most scenes have some, and no two scenes share them', () => {
  const words = SCENES.flatMap(s => wordsIn(s.steps))
  for (const id of words) expect([id, IDS.has(id), id.startsWith('scene-')]).toEqual([id, true, true])
  expect(new Set(words).size).toBe(words.length)
  expect(SCENES.filter(s => wordsIn(s.steps).length > 0).length).toBeGreaterThanOrEqual(40)
  // Short, as his asides are: one address term each.
  for (const entry of LINES.filter(e => e.id.startsWith('scene-'))) {
    for (const variant of entry.variants) expect([variant, variant.match(/\{mate\}/g)?.length, asideText(variant).length <= 50]).toEqual([variant, 1, true])
  }
})

test('a word said up close is held long enough to read', () => {
  for (const scene of SCENES) {
    scene.steps.forEach((step, i) => {
      const next = scene.steps[i + 1]
      if ('aside' in step && next !== undefined && 'pose' in next) expect([scene.id, next.ms >= 400]).toEqual([scene.id, true])
    })
  }
})

test('each starts and ends up close, never jumps in size, and plays in under half a minute', () => {
  for (const scene of SCENES) {
    const steps = framed(scene.steps)
    let at: number | null = BUST_SCALE
    for (const step of [...steps, { pose: 'idle', ms: 0 } as const]) {
      if (isOffFrame(step)) at = null
      const scale = scaleOf(step)
      if (scale === null) continue
      if (at !== null) expect([scene.id, Math.abs(scale - at) <= DOLLY_STEP + 1e-9]).toEqual([scene.id, true])
      at = scale
    }
    // Home at the end: up close, or a step from it, never off his square to pop back in.
    const last = steps.findLast(step => !('aside' in step))!
    expect([scene.id, !isOffFrame(last) && scaleOf(last)! >= BUST_SCALE - DOLLY_STEP]).toEqual([scene.id, true])
    expect([scene.id, msOf(steps) < 30_000]).toEqual([scene.id, true])
  }
})

test('in the gym he walks, never jumps: a few pixels a frame at the same depth, his feet where that depth puts them', () => {
  for (const scene of SCENES) {
    let prev: { scale: number; x: number; feet: number } | null = null
    for (const step of framed(scene.steps)) {
      if (!('far' in step)) {
        prev = null
        continue
      }
      const { scale, x, feet } = step.far
      if (prev !== null && prev.scale === scale) expect([scene.id, Math.abs(x - prev.x) <= 3, feet]).toEqual([scene.id, true, prev.feet])
      prev = { scale, x, feet }
    }
  }
})

test('between lines, every scene now and then; never through a set, never at the mini size', () => {
  const steps = (n: number, size: 'full' | 'mini', mode: 'band' | 'set') => JSON.stringify(idleBeat(n, size, false, ['curl'], mode).steps)
  const all = new Map(SCENES.map(s => [JSON.stringify(framed(s.steps)), s.id]))
  const seen = new Set<string>()
  for (let n = 0; n < 3000; n++) {
    const id = all.get(steps(n, 'full', 'band'))
    if (id !== undefined) seen.add(id)
    expect(all.has(steps(n, 'full', 'set'))).toBe(false)
    expect(all.has(steps(n, 'mini', 'band'))).toBe(false)
  }
  expect([...SCENES.map(s => s.id)].filter(id => !seen.has(id))).toEqual([])
})

test('live: on the band he says his word in a scene, beside his line', ANIMATED, async ($, on) => {
  const { clock } = world(on, null, { moves: [] }, { fresh: true })
  await $.session.start(SESSION)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND, props: { ...BAND.props, bodyColumns: 160 } })
  const variants = LINES.filter(entry => entry.id.startsWith('scene-')).flatMap(entry => entry.variants.map(v => v.split('{mate}')[0]!.trim()))
  let isSaid = false
  for (let i = 0; i < 120 && !isSaid; i += 1) {
    await clock.advance(5_000)
    const rows = drawnRows(await ui.drawn())
    isSaid = rows.some(row => variants.some(v => v.length > 3 && row.includes(`/ ${v}`)))
  }
  expect(isSaid).toBe(true)
  await ui.unmount()
})
