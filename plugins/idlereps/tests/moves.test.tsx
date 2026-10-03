import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

import type { Answers, Plan } from '../types'
import { flexBand } from '../hooks/bands'
import { drawMove, moveById, moveForExercise, moveMs, MOVES, poseAt, REEL } from '../hooks/moves'
import { encodeMove, encodeSprite } from '../hooks/portrait'
import { DESK_STRETCHES, generateProgram, LIBRARY } from '../hooks/programs'
import { SPRITE } from '../hooks/swolomon-sprite'
import { BAND, drawnRows, SESSION, STATUS, TINY, TODAY, workout, world } from './world'

/** Swolomon's moves (§1.11 Moves): his whole body, acting out exercises, flexes and gags. */

const ANIMATED = { options: { cueEvery: '15', cueAfter: '30', coachAnimation: true, warmUp: false } } as const
const STILL = { options: { cueEvery: '15', cueAfter: '30', coachAnimation: false, warmUp: false } } as const
const FRAMES = encodeSprite(SPRITE)
const cellsOf = (id: string) => encodeMove(SPRITE, id, drawMove(moveById(id) ?? MOVES[0]!))

/** Every blit, with where it went. */
function blitLog(on: On) {
  const blits: { requestId: string; cells: string }[] = []
  on('ui.blit', ($, e) => {
    if ('cells' in e) blits.push({ requestId: e.requestId, cells: e.cells })
    return { value: {} }
  })
  return blits
}

// ---------------------------------------------------------------------------------------------------------
// The moves themselves.

test('at least twenty moves, each its own: exercises, flexes and gags', () => {
  expect(MOVES.length).toBeGreaterThanOrEqual(20)
  expect(new Set(MOVES.map(m => m.id)).size).toBe(MOVES.length)
  const count = (family: string) => MOVES.filter(m => m.family === family).length
  expect([count('exercise') >= 15, count('flex') >= 5, count('gag') >= 4]).toEqual([true, true, true])
})

test('every pose is a 16 × 16 frame in the sprite’s colours, and every move really moves', () => {
  for (const move of MOVES) {
    const poses = drawMove(move)
    expect([move.id, poses.length >= 2]).toEqual([move.id, true])
    for (const rows of poses) expect([move.id, rows.length, rows.every(r => r.length === 16)]).toEqual([move.id, 16, true])
    // Decoding throws naming the move and pose on a colour the palette lacks.
    expect(() => encodeMove(SPRITE, move.id, poses)).not.toThrow()
    // Every beat names a pose, and the poses it plays are not all the same picture.
    for (const [pose] of move.beats) expect([move.id, pose >= 0 && pose < poses.length]).toEqual([move.id, true])
    const played = new Set(move.beats.map(([pose]) => poses[pose]?.join('\n')))
    expect([move.id, played.size >= 2]).toEqual([move.id, true])
  }
})

test('every pose has Swolomon in it: his laurel or his beard shows', () => {
  for (const move of MOVES) {
    for (const [i, rows] of drawMove(move).entries()) expect([move.id, i, rows.some(r => /[gh]/.test(r))]).toEqual([move.id, i, true])
  }
})

test('a move is a moment, not a show: one to eight seconds, every rep', () => {
  for (const move of MOVES) expect([move.id, moveMs(move) >= 1000 && moveMs(move) <= 8000]).toEqual([move.id, true])
})

test('poseAt: each beat in turn, the reps repeating, then nothing', () => {
  const squat = moveById('squat')
  if (squat === undefined) throw new Error('no squat')
  const once = squat.beats.reduce((ms, [, length]) => ms + length, 0)
  expect([poseAt(squat, 0), poseAt(squat, 449), poseAt(squat, 450), poseAt(squat, once), poseAt(squat, once * squat.reps - 1)]).toEqual([0, 0, 1, 0, 1])
  expect([poseAt(squat, once * squat.reps), poseAt(squat, -1)]).toEqual([null, null])
})

const ANSWERS: Answers = {
  template: 'designed',
  goal: 'general',
  equipment: { dumbbells: false, bar: false, bands: false },
  level: 'beginner',
  daysPerWeek: 3,
  setting: 'home',
  weightUnit: 'kg',
  schedule: { days: ['mon', 'wed', 'fri'] },
  size: 'long',
  weeks: 4,
}

test('every exercise IdleReps can prescribe has a move to demonstrate it', () => {
  const names = new Set<string>([...Object.values(LIBRARY).flatMap(rows => rows.flatMap(row => row.levels.map(e => e.name))), ...DESK_STRETCHES.map(s => s.name)])
  for (const template of ['designed', 'ppl'] as const)
    for (const goal of ['strength', 'general', 'mobility'] as const)
      for (const setting of ['home', 'office'] as const)
        for (const level of ['beginner', 'intermediate', 'advanced'] as const)
          for (const dumbbells of [false, true])
            for (const bar of [false, true])
              for (const bands of [false, true]) {
                const plan = generateProgram({ ...ANSWERS, template, goal, setting, level, equipment: { dumbbells, bar, bands }, daysPerWeek: template === 'ppl' ? 3 : 3 })
                for (const w of plan.workouts) for (const e of w.exercises) names.add(e.name)
              }
  const missing = [...names].filter(name => moveForExercise(name) === null)
  expect(missing).toEqual([])
})

test('names map to the move that shows them: specific before general', () => {
  expect(
    ['Goblet squats', 'Jump squats', 'Wall sit', 'Decline push-ups', 'Desk plank', 'Side plank', 'Dumbbell Romanian deadlifts', 'Chin-up hold (top position)', 'Band curls', 'Dumbbell overhead triceps extension', 'Band rows', 'Single-leg glute bridges', 'Step-back burpees', 'Kettlebell swings'].map(moveForExercise),
  ).toEqual(['squat', 'squat', 'wall-sit', 'push-up', 'plank', 'plank', 'deadlift', 'pull-up', 'curl', 'press', 'row', 'bridge', 'burpee', null])
})

test('the reel alternates a show move with an exercise, and holds every move once', () => {
  expect(REEL.length).toBe(MOVES.length)
  expect(new Set(REEL.map(m => m.id)).size).toBe(MOVES.length)
  expect([REEL[0]?.family !== 'exercise', REEL[1]?.family]).toEqual([true, 'exercise'])
})

test('the flex band names the move under the line', () => {
  const squat = moveById('squat')
  if (squat === undefined) throw new Error('no squat')
  const spec = flexBand(TODAY, squat)
  expect([spec.act, spec.body]).toEqual(['squat', [[{ text: '▸ Squats', tone: 'muted' }]]])
})

// ---------------------------------------------------------------------------------------------------------
// The moves, played.

test('/workout flex: once the line is out he does the reel’s move, then holds the flex; nothing after', ANIMATED, async ($, on) => {
  const { clock } = world(on, TINY)
  const blits = blitLog(on)
  await $.session.start(SESSION)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await $.command.run(workout('flex'))
  const move = REEL[TODAY % REEL.length]
  if (move === undefined) throw new Error('empty reel')
  expect(drawnRows(await ui.drawn())).toContain(`▸ ${move.title}`)
  await clock.advance(4_000 + moveMs(move))
  const cells = cellsOf(move.id)
  const played = blits.map(b => b.cells)
  // Every pose it plays was shown, in the band's portrait, and it ended back on the flex.
  for (const [pose] of move.beats) expect(played).toContain(cells[pose])
  expect(played.at(-1)).toBe(FRAMES.flex)
  const settled = blits.length
  await clock.advance(30_000)
  expect(blits.length).toBe(settled)
  await ui.unmount()
})

test('/workout flex again: the next move in the reel', ANIMATED, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await $.command.run(workout('flex'))
  await $.command.run(workout('nice'))
  await $.command.run(workout('flex'))
  const next = REEL[(TODAY + 1) % REEL.length]
  expect(drawnRows(await ui.drawn())).toContain(`▸ ${next?.title}`)
  await ui.unmount()
})

test('not animated: no move, the flex drawn still', STILL, async ($, on) => {
  const { clock } = world(on, TINY)
  const blits = blitLog(on)
  await $.session.start(SESSION)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await $.command.run(workout('flex'))
  await clock.advance(20_000)
  expect(blits).toEqual([])
  expect(((await ui.find({ key: 'swolomon' })) as { props: { cells: string } } | undefined)?.props.cells).toBe(FRAMES.flex)
  await ui.unmount()
})

test('a rank-up lifts the trophy', ANIMATED, async ($, on) => {
  const { clock } = world(on, TINY, { totalDoneSets: 24 })
  const blits = blitLog(on)
  await $.session.start(SESSION)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await $.command.run(workout('start'))
  await clock.advance(5_000)
  await $.command.run(workout('done'))
  await clock.advance(10_000)
  const trophy = cellsOf('trophy')
  expect(blits.some(b => b.cells === trophy[1])).toBe(true)
  await ui.unmount()
})

const STATUS_MOUNT = { plugin: 'idlereps', surface: 'terminal', ...STATUS } as const

test('the status pane: a moment after it opens, he demonstrates the next set’s exercise, then rests', ANIMATED, async ($, on) => {
  const { clock } = world(on, TINY)
  const blits = blitLog(on)
  await $.session.start(SESSION)
  await $.command.run(workout(''))
  const pane = await $.ui.mount(STATUS_MOUNT)
  expect(((await pane.find({ key: 'swolomon' })) as { props: { cells: string } } | undefined)?.props.cells).toBe(FRAMES.idle)
  const pushUp = moveById('push-up')
  if (pushUp === undefined) throw new Error('no push-up')
  await clock.advance(1_000 + moveMs(pushUp))
  const cells = cellsOf('push-up')
  const toPane = blits.filter(b => b.requestId === STATUS.requestId).map(b => b.cells)
  expect(toPane).toContain(cells[0])
  expect(toPane).toContain(cells[1])
  expect(toPane.at(-1)).toBe(FRAMES.idle)
  const settled = blits.length
  await clock.advance(30_000)
  expect(blits.length).toBe(settled)
  await pane.unmount()
})

const EVERY_OTHER: Plan = { ...TINY, schedule: { days: ['sat'] } }

test('the status pane on a rest day: a nap', ANIMATED, async ($, on) => {
  const { clock } = world(on, EVERY_OTHER)
  const blits = blitLog(on)
  await $.session.start(SESSION)
  await $.command.run(workout(''))
  const pane = await $.ui.mount(STATUS_MOUNT)
  await clock.advance(3_000)
  expect(blits.map(b => b.cells)).toContain(cellsOf('nap')[0])
  await pane.unmount()
})

test('closing the pane stops its move', ANIMATED, async ($, on) => {
  const { clock } = world(on, TINY)
  const blits = blitLog(on)
  await $.session.start(SESSION)
  await $.command.run(workout(''))
  const pane = await $.ui.mount(STATUS_MOUNT)
  await clock.advance(1_000)
  await pane.press({ key: 'close' })
  const after = blits.length
  await clock.advance(10_000)
  expect(blits.length).toBe(after)
  await pane.unmount()
})

test('not animated: the pane’s portrait stays still', STILL, async ($, on) => {
  const { clock } = world(on, TINY)
  const blits = blitLog(on)
  await $.session.start(SESSION)
  await $.command.run(workout(''))
  const pane = await $.ui.mount(STATUS_MOUNT)
  await clock.advance(10_000)
  expect(blits).toEqual([])
  await pane.unmount()
})
