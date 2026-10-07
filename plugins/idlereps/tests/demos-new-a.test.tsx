import { expect, test } from 'claude-code/testing'

import { LINES } from '../hooks/copy'
import { NEW_A_DEMO_BY_NAME, NEW_A_DEMO_LINES, NEW_A_DEMOS } from '../hooks/demos-new-a'
import { drawMicro, MICRO_HEIGHT, MICRO_WIDTH } from '../hooks/figure'
import { DEMOS, drawMove, GESTURES, moveById, moveForExercise, moveMs, MOVES } from '../hooks/moves'
import { encodeMicro, encodeMove } from '../hooks/portrait'
import { SPRITE } from '../hooks/swolomon-sprite'

/** The demos for 23 upper-body exercises (owner, 2026-10-06: "add 50 more workouts"), each its own. */

const NAMES: Record<string, string> = {
  'Knee push-ups': 'knee-push-up',
  'Wide push-ups': 'wide-push-up',
  'Diamond push-ups': 'diamond-push-up',
  'Plank shoulder taps': 'plank-shoulder-tap',
  'Archer push-ups': 'archer-push-up',
  'Dumbbell Arnold press': 'dumbbell-arnold-press',
  'Dumbbell lateral raises': 'dumbbell-lateral-raise',
  'Band lateral raises': 'band-lateral-raise',
  'Hindu push-ups': 'hindu-push-up',
  'Dumbbell triceps kickbacks': 'dumbbell-triceps-kickback',
  'Band triceps pushdowns': 'band-triceps-pushdown',
  'Close-grip push-ups': 'close-grip-push-up',
  'Scapular pull-ups': 'scapular-pull-up',
  'Dumbbell renegade rows': 'dumbbell-renegade-row',
  'Band lat pulldowns': 'band-lat-pulldown',
  'Prone W-raises': 'prone-w-raise',
  'Dumbbell reverse flys': 'dumbbell-reverse-fly',
  'Band face pulls': 'band-face-pull',
  'Prone T-raises': 'prone-t-raise',
  'Dumbbell hammer curls': 'dumbbell-hammer-curl',
  'Band hammer curls': 'band-hammer-curl',
  'Chin-ups': 'chin-up',
  'Towel curls': 'towel-curl',
}

test('one exercise demo per name, titled with it, its id kebab-case and unique everywhere', () => {
  expect(NEW_A_DEMOS.map(m => [m.title, m.id, m.family])).toEqual(Object.entries(NAMES).map(([name, id]) => [name, id, 'exercise']))
  for (const move of NEW_A_DEMOS) expect([move.id, /^[a-z]+(-[a-z]+)*$/.test(move.id)]).toEqual([move.id, true])
  const ids = [...MOVES, ...GESTURES, ...DEMOS].map(m => m.id)
  expect(new Set(ids).size).toBe(ids.length)
  for (const move of NEW_A_DEMOS) expect(moveById(move.id)).toBe(move)
})

test('every pose a 16 × 16 frame in his colours, with his laurel or beard, and the beats play two pictures or more', () => {
  for (const move of NEW_A_DEMOS) {
    const poses = drawMove(move)
    expect([move.id, poses.length >= 2]).toEqual([move.id, true])
    for (const rows of poses) expect([move.id, rows.length, rows.every(r => r.length === 16), rows.some(r => /[gh]/.test(r))]).toEqual([move.id, 16, true, true])
    expect(() => encodeMove(SPRITE, move.id, poses)).not.toThrow()
    for (const [pose] of move.beats) expect([move.id, pose >= 0 && pose < poses.length]).toEqual([move.id, true])
    expect([move.id, new Set(move.beats.map(([pose]) => poses[pose]?.join('\n'))).size >= 2]).toEqual([move.id, true])
  }
})

test('one play lasts one to eight seconds', () => {
  for (const move of NEW_A_DEMOS) expect([move.id, moveMs(move) >= 1000 && moveMs(move) <= 8000]).toEqual([move.id, true])
})

test('each draws tiny beside a set: 8 × 6, his colours, his laurel, the poses differing', () => {
  for (const move of NEW_A_DEMOS) {
    const poses = move.poses.map(drawMicro)
    for (const rows of poses) expect([move.id, rows.length, rows.every(r => r.length === MICRO_WIDTH), rows.some(r => r.includes('g'))]).toEqual([move.id, MICRO_HEIGHT, true, true])
    expect(() => encodeMicro(SPRITE, move.id, poses, MICRO_WIDTH, MICRO_HEIGHT)).not.toThrow()
    expect([move.id, new Set(move.beats.map(([p]) => poses[p]?.join('\n'))).size >= 2]).toEqual([move.id, true])
  }
})

test('no two of them look alike: every demo’s first pose its own picture', () => {
  const firsts = NEW_A_DEMOS.map(m => drawMove(m).join('|'))
  expect(new Set(firsts).size).toBe(firsts.length)
  // Nor the same picture as any other move's.
  const others = new Set([...MOVES, ...GESTURES, ...DEMOS].filter(m => !NEW_A_DEMOS.includes(m)).flatMap(m => drawMove(m).map(p => p.join('\n'))))
  for (const move of NEW_A_DEMOS) for (const [i, pose] of drawMove(move).entries()) expect([move.id, i, others.has(pose.join('\n'))]).toEqual([move.id, i, false])
})

test('each exercise’s name finds its own demo, plural or singular, any case', () => {
  for (const [name, id] of Object.entries(NAMES)) {
    expect([name, moveForExercise(name)]).toEqual([name, id])
    expect([name, moveForExercise(name.toLowerCase())]).toEqual([name, id])
    expect([name, moveForExercise(name.replace(/(?<!s)s$/, ''))]).toEqual([name, id])
  }
  expect(NEW_A_DEMO_BY_NAME.length).toBe(NEW_A_DEMOS.length)
})

test('the patterns hold to the whole name: the general exercises and longer names keep their own moves', () => {
  const ours = new Set(NEW_A_DEMOS.map(m => m.id))
  const others = ['Push-ups', 'Pull-ups', 'Dumbbell curls', 'Chin-up hold (top position)', 'Plank', 'Band rows', 'Dumbbell rows', 'Band curls', 'Dumbbell overhead press', 'Incline push-ups', 'Pull-up negatives', 'Prone Y-raises', 'Knee push-ups to plank']
  for (const name of others) expect([name, ours.has(moveForExercise(name) ?? '')]).toEqual([name, false])
  expect(['Push-ups', 'Pull-ups', 'Dumbbell curls', 'Chin-up hold (top position)'].map(moveForExercise)).toEqual(['push-up', 'pull-up', 'curl', 'chin-up-hold'])
})

test('each demo has its form cue, in the registry: one or two variants of Swolomon’s', () => {
  expect(NEW_A_DEMO_LINES.map(l => l.id)).toEqual(NEW_A_DEMOS.map(m => `form-${m.id}`))
  for (const entry of NEW_A_DEMO_LINES) {
    expect([entry.id, entry.voice, entry.variants.length >= 1 && entry.variants.length <= 2]).toEqual([entry.id, 'swolomon', true])
    expect(LINES.filter(l => l.id === entry.id).length).toBe(1)
  }
})
