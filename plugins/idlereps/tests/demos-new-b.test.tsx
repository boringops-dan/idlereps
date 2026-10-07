import { expect, test } from 'claude-code/testing'

import { ADDRESS_TERMS, fill, isLineId, LINES } from '../hooks/copy'
import { NEW_B_DEMO_BY_NAME, NEW_B_DEMO_LINES, NEW_B_DEMOS } from '../hooks/demos-new-b'
import { drawMicro, MICRO_HEIGHT, MICRO_WIDTH } from '../hooks/figure'
import { DEMOS, drawMove, GESTURES, moveById, moveForExercise, moveMs, MOVES } from '../hooks/moves'
import { encodeMicro, encodeMove } from '../hooks/portrait'
import { SPRITE } from '../hooks/swolomon-sprite'

/** The second batch of new exercise demos (owner, 2026-10-06: "add 50 more workouts"): legs, core, cardio, mobility. */

const NAMES: Record<string, string> = {
  'Dumbbell sumo squats': 'dumbbell-sumo-squat',
  'Sumo squats': 'sumo-squat',
  'Pulse squats': 'pulse-squat',
  'Pistol squat negatives': 'pistol-squat-negative',
  'Dumbbell step-ups': 'dumbbell-step-up',
  'Dumbbell Bulgarian split squats': 'dumbbell-bulgarian-split-squat',
  'Lateral lunges': 'lateral-lunge',
  'Curtsy lunges': 'curtsy-lunge',
  'Jumping lunges': 'jumping-lunge',
  'Step-ups': 'step-up',
  'Bulgarian split squats': 'bulgarian-split-squat',
  'Banded lateral walks': 'banded-lateral-walk',
  'Donkey kicks': 'donkey-kick',
  'Fire hydrants': 'fire-hydrant',
  'Frog pumps': 'frog-pump',
  'Tibialis raises': 'tibialis-raise',
  'Squat hold': 'squat-hold',
  'Hollow hold': 'hollow-hold',
  'Bear crawl hold': 'bear-crawl-hold',
  'Bird dogs': 'bird-dog',
  'Bicycle crunches': 'bicycle-crunch',
  'Reverse crunches': 'reverse-crunch',
  'Side plank hip dips': 'side-plank-hip-dip',
  'Mountain climbers': 'mountain-climber',
  'High knees': 'high-knee',
  Skaters: 'skater',
  "World's greatest stretch": 'worlds-greatest-stretch',
  'Thread the needle': 'thread-the-needle',
  "Child's pose": 'childs-pose',
  'Downward dog': 'downward-dog',
}

const IDS = new Set(NEW_B_DEMOS.map(m => m.id))
const LONGEST_TERM = [...ADDRESS_TERMS].sort((a, b) => b.length - a.length)[0] ?? ''

test('thirty demos, one per exercise: kebab-case ids, unique across every move, all exercises', () => {
  expect(NEW_B_DEMOS.length).toBe(30)
  expect(NEW_B_DEMOS.map(m => m.id).sort()).toEqual(Object.values(NAMES).sort())
  const all = [...MOVES, ...GESTURES, ...DEMOS].map(m => m.id)
  for (const move of NEW_B_DEMOS) {
    expect([move.id, /^[a-z]+(-[a-z]+)*$/.test(move.id), move.family, all.filter(id => id === move.id).length]).toEqual([move.id, true, 'exercise', 1])
    expect(moveById(move.id)).toBe(move)
  }
  expect(NEW_B_DEMOS.every(m => DEMOS.includes(m))).toBe(true)
})

test('every pose is a 16 × 16 frame in the sprite’s colours, with him in it, and every demo really moves', () => {
  for (const move of NEW_B_DEMOS) {
    const poses = drawMove(move)
    expect([move.id, poses.length >= 2]).toEqual([move.id, true])
    for (const rows of poses) expect([move.id, rows.length, rows.every(r => r.length === 16)]).toEqual([move.id, 16, true])
    expect(() => encodeMove(SPRITE, move.id, poses)).not.toThrow()
    for (const [pose] of move.beats) expect([move.id, pose >= 0 && pose < poses.length]).toEqual([move.id, true])
    expect([move.id, new Set(move.beats.map(([pose]) => poses[pose]?.join('\n'))).size >= 2]).toEqual([move.id, true])
    for (const [i, rows] of poses.entries()) expect([move.id, i, rows.some(r => /[gh]/.test(r))]).toEqual([move.id, i, true])
  }
})

test('one play is one to eight seconds', () => {
  for (const move of NEW_B_DEMOS) expect([move.id, moveMs(move) >= 1000 && moveMs(move) <= 8000]).toEqual([move.id, true])
})

test('every demo draws tiny: 8 × 6, his colours, his laurel, and the poses differ', () => {
  for (const move of NEW_B_DEMOS) {
    const poses = move.poses.map(drawMicro)
    for (const rows of poses) expect([move.id, rows.length, rows.every(r => r.length === MICRO_WIDTH), rows.some(r => r.includes('g'))]).toEqual([move.id, MICRO_HEIGHT, true, true])
    expect(() => encodeMicro(SPRITE, move.id, poses, MICRO_WIDTH, MICRO_HEIGHT)).not.toThrow()
    expect([move.id, new Set(move.beats.map(([p]) => poses[p]?.join('\n'))).size >= 2]).toEqual([move.id, true])
  }
})

test('no two demos are the same picture: each reads as its own exercise', () => {
  const firsts = new Map<string, string>()
  for (const move of NEW_B_DEMOS) {
    const key = drawMove(move).join('|')
    expect([move.id, firsts.get(key)]).toEqual([move.id, undefined])
    firsts.set(key, move.id)
  }
})

test('every exercise name maps to its own demo, in any case and singular', () => {
  for (const [name, id] of Object.entries(NAMES)) {
    expect([name, moveForExercise(name)]).toEqual([name, id])
    expect([name, moveForExercise(name.toLowerCase())]).toEqual([name, id])
  }
  expect(['Sumo squat', 'Step-up', 'Bird dog', 'Bicycle crunch', 'High knee', 'Skater', "World’s greatest stretch", 'Childs pose'].map(moveForExercise)).toEqual([
    'sumo-squat',
    'step-up',
    'bird-dog',
    'bicycle-crunch',
    'high-knee',
    'skater',
    'worlds-greatest-stretch',
    'childs-pose',
  ])
})

test('the names are whole: general exercises and longer names never land on these demos', () => {
  for (const name of ['Squats', 'Reverse lunges', 'Side plank', 'Plank', 'Jumping jacks', 'Glute bridges', 'Goblet squats', 'Hamstring stretch', 'Squat hold and press', 'Weighted step-ups'])
    expect([name, IDS.has(moveForExercise(name) ?? '')]).toEqual([name, false])
  for (const [pattern] of NEW_B_DEMO_BY_NAME) expect([String(pattern), pattern.source.startsWith('^') && pattern.source.endsWith('$')]).toEqual([String(pattern), true])
})

test('every demo has its form cue: one or two variants, one {mate}, within 70 columns, never the exercise’s name', () => {
  expect(NEW_B_DEMO_LINES.map(l => l.id).sort()).toEqual(NEW_B_DEMOS.map(m => `form-${m.id}`).sort())
  for (const move of NEW_B_DEMOS) {
    const id = `form-${move.id}`
    expect([id, isLineId(id)]).toEqual([id, true])
    const entry = LINES.find(l => l.id === id)
    expect([id, entry?.voice, entry !== undefined && entry.variants.length >= 1 && entry.variants.length <= 2]).toEqual([id, 'swolomon', true])
    for (const variant of entry?.variants ?? []) {
      const text = fill(variant, { mate: LONGEST_TERM })
      expect([variant, variant.split('{mate}').length - 1, text.length <= 70]).toEqual([variant, 1, true])
      for (const name of [move.title, ...Object.keys(NAMES)]) expect([variant, text.toLowerCase().includes(name.toLowerCase())]).toEqual([variant, false])
    }
  }
})
