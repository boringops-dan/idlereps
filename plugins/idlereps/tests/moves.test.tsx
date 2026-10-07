import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import type { Answers, Plan } from '../types'
import { flexBand } from '../hooks/bands'
import { drawMove, idleReps, moveById, moveForExercise, moveMs, MOVES, poseAt } from '../hooks/moves'
import { collected, STARTER_MOVES, UNLOCK_ORDER } from '../hooks/collection'
import { drawMicro, MICRO_HEIGHT, MICRO_WIDTH } from '../hooks/figure'
import { breathedIn, encodeCells, encodeMove, encodeSprite, idleBeat, walkGrid } from '../hooks/portrait'
import { DESK_STRETCHES, generateProgram, LIBRARY } from '../hooks/programs'
import { SPRITE } from '../hooks/swolomon-sprite'
import { ANIMATED, BAND, blitLog, cellsOf, drawnRows, microOf, OPTIONS, SESSION, STATUS, TINY, TODAY, workout, world } from './world'

/** Swolomon's moves (§1.11 Moves): his whole body, acting out exercises, flexes and gags. */

const FRAMES = encodeSprite(SPRITE)

/** Every blit, with where it went. */
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

test('idling, every exercise is a set of 20; gags and flexes play as drawn', () => {
  expect([idleReps(moveById('squat')!), idleReps(moveById('burpee')!)]).toEqual([20, 20])
  expect(idleReps(moveById('low-five')!)).toBe(moveById('low-five')!.reps)
  expect(idleReps(moveById('double-biceps')!)).toBe(moveById('double-biceps')!.reps)
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
  ).toEqual(['goblet-squat', 'jump-squat', 'wall-sit', 'decline-push-up', 'desk-plank', 'side-plank', 'deadlift', 'chin-up-hold', 'band-curl', 'dumbbell-overhead-triceps-extension', 'band-row', 'single-leg-glute-bridge', 'step-back-burpee', null])
})

/** The flex reel once every move is collected (the test world's default). */
const REEL = collected([...UNLOCK_ORDER])

test('the collection holds every move once: three to start, the rest to unlock', () => {
  expect(STARTER_MOVES.length + UNLOCK_ORDER.length).toBe(MOVES.length)
  expect(new Set([...STARTER_MOVES, ...UNLOCK_ORDER]).size).toBe(MOVES.length)
  expect(REEL.map(m => m.id).sort()).toEqual(MOVES.map(m => m.id).sort())
})

test('the flex band names the move under the line', () => {
  const squat = moveById('squat')
  if (squat === undefined) throw new Error('no squat')
  const spec = flexBand(TODAY, squat)
  expect([spec.act, spec.body]).toEqual(['squat', [[{ text: '▸ Squats', tone: 'muted' }]]])
})

// ---------------------------------------------------------------------------------------------------------
// The moves, played.

test('/workout flex: once the line is out he does the reel’s move, then holds the flex, its sparkles twinkling', ANIMATED, async ($, on) => {
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
  expect(played).toContain(FRAMES.flex)
  // After that, only the flex and its twinkle, a few times a minute.
  const settled = blits.length
  await clock.advance(30_000)
  const after = blits.slice(settled).map(b => b.cells)
  expect(after.length).toBeGreaterThan(0)
  // His breath too: the flex a pixel up and back.
  expect(after.every(c => c === FRAMES.flex || c === FRAMES.flexB || c === breathedIn(FRAMES.flex, SPRITE.width))).toBe(true)
  expect(after).toContain(FRAMES.flexB)
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

test('not animated: no move, the flex drawn still', OPTIONS, async ($, on) => {
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

test('the status pane: a moment after it opens, he demonstrates the next set’s exercise, then idles', ANIMATED, async ($, on) => {
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
  // Then he lives in his square while it is open: looks around, walks, does a move; every frame one of his
  // own, a step of a walk, or a move that is not a flex (the wins keep those).
  const settled = blits.length
  await clock.advance(60_000)
  const idling = blits.slice(settled).filter(b => b.requestId === STATUS.requestId).map(b => b.cells)
  expect(idling.length).toBeGreaterThan(0)
  const walks = Array.from({ length: 400 }, (_, n) => idleBeat(n, 'full')).flatMap(beat => beat.steps.flatMap(step => ('walk' in step ? [encodeCells(walkGrid(SPRITE, step.walk))] : [])))
  const moves = MOVES.filter(move => move.family !== 'flex').flatMap(move => cellsOf(move.id))
  const own = new Set([...Object.values(FRAMES), ...walks, ...moves, breathedIn(FRAMES.idle, SPRITE.width)])
  expect(idling.every(c => own.has(c))).toBe(true)
  expect(idling.some(c => !Object.values(FRAMES).includes(c))).toBe(true)
  await pane.press({ key: 'close' })
  const closed = blits.length
  await clock.advance(30_000)
  expect(blits.length).toBe(closed)
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

test('not animated: the pane’s portrait stays still', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  const blits = blitLog(on)
  await $.session.start(SESSION)
  await $.command.run(workout(''))
  const pane = await $.ui.mount(STATUS_MOUNT)
  await clock.advance(10_000)
  expect(blits).toEqual([])
  await pane.unmount()
})

// ---------------------------------------------------------------------------------------------------------
// The tiny Swolomon beside a set.


test('every exercise move draws tiny: 8 × 6, his colours, and the poses differ', () => {
  for (const move of MOVES.filter(m => m.family === 'exercise')) {
    const poses = move.poses.map(drawMicro)
    for (const rows of poses) expect([move.id, rows.length, rows.every(r => r.length === MICRO_WIDTH)]).toEqual([move.id, MICRO_HEIGHT, true])
    expect(() => microOf(move.id)).not.toThrow()
    expect([move.id, new Set(move.beats.map(([p]) => poses[p]?.join('\n'))).size >= 2]).toEqual([move.id, true])
    // His laurel always shows, however small.
    for (const rows of poses) expect([move.id, rows.some(r => r.includes('g'))]).toEqual([move.id, true])
  }
})

/** Today's first set (Swolomon speaks), Done, then the next set (silent: Quiet, owner 2026-10-06). */
async function silentSet($: Engine) {
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  await $.command.run(workout('now'))
}

test('a silent set (Quiet): the tiny Swolomon beside it does the exercise, then holds still', { options: { ...ANIMATED.options, coachChat: 'quiet' } }, async ($, on) => {
  const { clock } = world(on, TINY)
  const blits = blitLog(on)
  await $.session.start(SESSION)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await silentSet($)
  const tiny = (await ui.find({ key: 'swolomon-tiny' })) as { props: { cells: string; rows: number } } | undefined
  const cells = microOf('push-up')
  expect([tiny?.props.rows, tiny?.props.cells]).toEqual([3, cells[0]])
  const pushUp = moveById('push-up')
  if (pushUp === undefined) throw new Error('no push-up')
  await clock.advance(moveMs(pushUp) + 500)
  const tinyBlits = blits.map(b => b.cells).filter(c => cells.includes(c))
  expect(tinyBlits).toContain(cells[1])
  expect(tinyBlits.at(-1)).toBe(cells[0])
  const settled = blits.length
  await clock.advance(30_000)
  expect(blits.length).toBe(settled)
  // Silent still: no name tag, no head.
  expect(await ui.find({ key: 'swolomon' })).toBeUndefined()
  await ui.unmount()
})

test('the set Swolomon speaks on keeps his talking head, not the tiny one', ANIMATED, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await $.command.run(workout('start'))
  expect(await ui.find({ key: 'swolomon-tiny' })).toBeUndefined()
  await ui.unmount()
})

test('not animated (Quiet): the tiny Swolomon stands in the start position, no blits', { options: { ...OPTIONS.options, coachChat: 'quiet' } }, async ($, on) => {
  const { clock } = world(on, TINY)
  const blits = blitLog(on)
  await $.session.start(SESSION)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await silentSet($)
  await clock.advance(10_000)
  expect(((await ui.find({ key: 'swolomon-tiny' })) as { props: { cells: string } } | undefined)?.props.cells).toBe(microOf('push-up')[0])
  expect(blits).toEqual([])
  await ui.unmount()
})

test('no tiny Swolomon where the set would not fit beside him, nor off the terminal', ANIMATED, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  const narrow = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND, props: { ...BAND.props, bodyColumns: 30 } })
  const desktop = await $.ui.mount({ plugin: 'idlereps', surface: 'desktop', ...BAND })
  await silentSet($)
  expect(await narrow.find({ key: 'swolomon-tiny' })).toBeUndefined()
  expect(await desktop.find({ key: 'swolomon-tiny' })).toBeUndefined()
  await narrow.unmount()
  await desktop.unmount()
})

test('an exercise with no move of its own: no tiny Swolomon, the set as before', ANIMATED, async ($, on) => {
  const SWINGS: Plan = { ...TINY, workouts: [{ name: 'K', exercises: [{ name: 'Kettlebell swings', reps: '15 reps', sets: 3 }] }] }
  world(on, SWINGS)
  await $.session.start(SESSION)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await silentSet($)
  expect(await ui.find({ key: 'swolomon-tiny' })).toBeUndefined()
  expect(drawnRows(await ui.drawn()).some(row => row.includes('Kettlebell swings'))).toBe(true)
  await ui.unmount()
})
