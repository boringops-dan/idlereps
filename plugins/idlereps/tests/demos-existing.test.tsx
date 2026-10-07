import { expect, test } from 'claude-code/testing'

import { isLineId } from '../hooks/copy'
import { EXISTING_DEMO_BY_NAME, EXISTING_DEMO_LINES, EXISTING_DEMOS } from '../hooks/demos-existing'
import { drawMicro, MICRO_HEIGHT, MICRO_WIDTH } from '../hooks/figure'
import { CELEBRATION_MOVES, DEMOS, drawMove, GESTURES, moveById, moveForExercise, moveMs, MOVES } from '../hooks/moves'
import { encodeMicro, encodeMove } from '../hooks/portrait'
import { DESK_STRETCHES } from '../hooks/programs'
import { SPRITE } from '../hooks/swolomon-sprite'

/** The exercises IdleReps already prescribed on a shared move, each with its own demo (owner, 2026-10-06). */

/** Every name these demos are for, as IdleReps prescribes it, and the demo it plays. */
const NAMES: readonly (readonly [string, string])[] = [
  ['Incline push-ups', 'incline-push-up'],
  ['Decline push-ups', 'decline-push-up'],
  ['Pike push-ups', 'pike-push-up'],
  ['Wall push-ups', 'wall-push-up'],
  ['Band overhead press', 'band-overhead-press'],
  ['Dumbbell overhead triceps extension', 'dumbbell-overhead-triceps-extension'],
  ['Dead hang', 'dead-hang'],
  ['Pull-up negatives', 'pull-up-negative'],
  ['Chin-up hold (top position)', 'chin-up-hold'],
  ['Band rows', 'band-row'],
  ['Prone Y-raises', 'prone-y-raise'],
  ['Reverse snow angels', 'reverse-snow-angel'],
  ['Band curls', 'band-curl'],
  ['Goblet squats', 'goblet-squat'],
  ['Jump squats', 'jump-squat'],
  ['Banded glute bridges', 'banded-glute-bridge'],
  ['Single-leg glute bridges', 'single-leg-glute-bridge'],
  ['Single-leg calf raises', 'single-leg-calf-raise'],
  ['Side plank', 'side-plank'],
  ['Step-back burpees', 'step-back-burpee'],
  ['Hip-flexor stretch', 'hip-flexor-stretch'],
  ['Thoracic rotations', 'thoracic-rotation'],
  ['Cat-cow', 'cat-cow'],
  ['Hamstring stretch', 'hamstring-stretch'],
  ['Desk push-ups', 'desk-push-up'],
  ['Wall angels', 'wall-angel'],
  ['Standing glute kickbacks', 'standing-glute-kickback'],
  ['March in place', 'march-in-place'],
  ['Standing Y-raises', 'standing-y-raise'],
  ['Desk plank', 'desk-plank'],
  ['Standing knee-to-elbow', 'standing-knee-to-elbow'],
  ['Standing side bends', 'standing-side-bend'],
  ['Seated cat-cow', 'seated-cat-cow'],
  ['Neck rolls', 'neck-roll'],
  ['Chest opener', 'chest-opener'],
  ['Seated twist', 'seated-twist'],
  ['Wrist stretch', 'wrist-stretch'],
  ['Standing hamstring stretch', 'standing-hamstring-stretch'],
  ['Shoulder rolls', 'shoulder-roll'],
  ['Calf raises and reach', 'calf-raise-and-reach'],
]

const OWN = new Set(EXISTING_DEMOS.map(m => m.id))

test('a demo for each exercise: forty, every one an exercise, ids kebab-case and unique across every move', () => {
  expect(EXISTING_DEMOS.length).toBe(NAMES.length)
  expect(EXISTING_DEMOS.every(m => m.family === 'exercise')).toBe(true)
  expect(EXISTING_DEMOS.filter(m => !/^[a-z]+(-[a-z]+)*$/.test(m.id)).map(m => m.id)).toEqual([])
  const every = [...MOVES, ...GESTURES, ...DEMOS].map(m => m.id)
  expect(every.length).toBe(new Set(every).size)
  // Each found by its id, and none collected: they live in DEMOS, not the flex reel.
  for (const move of EXISTING_DEMOS) expect([move.id, moveById(move.id) === move, MOVES.includes(move), CELEBRATION_MOVES.includes(move)]).toEqual([move.id, true, false, false])
})

test('every pose is a 16 × 16 frame in the sprite’s colours, with his laurel or beard, and the beats play two pictures', () => {
  for (const move of EXISTING_DEMOS) {
    const poses = drawMove(move)
    expect([move.id, poses.length >= 2]).toEqual([move.id, true])
    for (const rows of poses) expect([move.id, rows.length, rows.every(r => r.length === 16)]).toEqual([move.id, 16, true])
    expect(() => encodeMove(SPRITE, move.id, poses)).not.toThrow()
    for (const [pose] of move.beats) expect([move.id, pose >= 0 && pose < poses.length]).toEqual([move.id, true])
    expect([move.id, new Set(move.beats.map(([pose]) => poses[pose]?.join('\n'))).size >= 2]).toEqual([move.id, true])
    for (const [i, rows] of poses.entries()) expect([move.id, i, rows.some(r => /[gh]/.test(r))]).toEqual([move.id, i, true])
  }
})

test('no two poses of a demo are the same picture', () => {
  for (const move of EXISTING_DEMOS) {
    const pictures = drawMove(move).map(rows => rows.join('\n'))
    expect([move.id, new Set(pictures).size]).toEqual([move.id, pictures.length])
  }
})

test('one play is a moment: one to eight seconds', () => {
  for (const move of EXISTING_DEMOS) expect([move.id, moveMs(move) >= 1000 && moveMs(move) <= 8000]).toEqual([move.id, true])
})

test('each draws tiny beside a set: 8 × 6, his colours, his laurel, and the poses it plays differ', () => {
  for (const move of EXISTING_DEMOS) {
    const poses = move.poses.map(drawMicro)
    for (const rows of poses) expect([move.id, rows.length, rows.every(r => r.length === MICRO_WIDTH)]).toEqual([move.id, MICRO_HEIGHT, true])
    expect(() => encodeMicro(SPRITE, move.id, poses, MICRO_WIDTH, MICRO_HEIGHT)).not.toThrow()
    expect([move.id, new Set(move.beats.map(([p]) => poses[p]?.join('\n'))).size >= 2]).toEqual([move.id, true])
    for (const rows of poses) expect([move.id, rows.some(r => r.includes('g'))]).toEqual([move.id, true])
  }
})

test('each demo looks unlike the general move it replaces: no pose shared with any other move', () => {
  const others = new Set([...MOVES, ...GESTURES].flatMap(m => drawMove(m).map(rows => rows.join('\n'))))
  for (const move of EXISTING_DEMOS) for (const [i, rows] of drawMove(move).entries()) expect([move.id, i, others.has(rows.join('\n'))]).toEqual([move.id, i, false])
})

test('each demo has its form cue: one {mate}, a band line’s length, never its own name', () => {
  for (const move of EXISTING_DEMOS) expect([move.id, isLineId(`form-${move.id}`)]).toEqual([move.id, true])
  expect(EXISTING_DEMO_LINES.map(l => l.id).sort()).toEqual(EXISTING_DEMOS.map(m => `form-${m.id}`).sort())
  for (const entry of EXISTING_DEMO_LINES) {
    expect([entry.id, entry.variants.length >= 1 && entry.variants.length <= 2]).toEqual([entry.id, true])
    const move = EXISTING_DEMOS.find(m => `form-${m.id}` === entry.id)
    for (const variant of entry.variants) {
      expect([variant, variant.split('{mate}').length - 1]).toEqual([variant, 1])
      expect([variant, variant.replace('{mate}', 'young lifter').length <= 70]).toEqual([variant, true])
      expect([variant, variant.toLowerCase().includes(move?.title.toLowerCase() ?? '')]).toEqual([variant, false])
    }
  }
})

test('every name maps to its own demo, desk stretches included', () => {
  expect(NAMES.map(([name]) => moveForExercise(name))).toEqual(NAMES.map(([, id]) => id))
  for (const { name } of DESK_STRETCHES) expect([name, OWN.has(moveForExercise(name) ?? '')]).toEqual([name, true])
  // Written by hand: the case and the plural do not matter.
  expect(['incline push-up', 'GOBLET SQUAT', 'Pull-up negative', 'Chin-up hold', 'Side planks'].map(moveForExercise)).toEqual(['incline-push-up', 'goblet-squat', 'pull-up-negative', 'chin-up-hold', 'side-plank'])
})

test('a pattern is the whole name: longer and neighbouring names never land on these demos', () => {
  for (const name of ['Side plank hip dips', 'Chin-ups', 'Knee push-ups', 'Close-grip push-ups', 'Single-leg wall sit', 'Push-ups', 'Squats', 'Calf raises', 'Burpees', 'Pull-ups', 'Glute bridges'])
    expect([name, OWN.has(moveForExercise(name) ?? '')]).toEqual([name, false])
  for (const [pattern] of EXISTING_DEMO_BY_NAME) expect([String(pattern), pattern.source.startsWith('^') && pattern.source.endsWith('$')]).toEqual([String(pattern), true])
})
