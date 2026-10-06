import { expect, test } from 'claude-code/testing'

import { duringSetLineId } from '../hooks/bands'
import { isLineId, line, plainOf } from '../hooks/copy'
import { MOVES, moveForExercise } from '../hooks/moves'
import { idleBeat } from '../hooks/portrait'
import type { Cue } from '../types'
import { ANIMATED, BAND, blitLog, cellsOf, OPTIONS, SESSION, speaks, TINY, TODAY, workout, world } from './world'

/** Swolomon on every set (owner, 2026-10-06): coaching, watching your form, doing it with you. */

const cueOf = (name: string, step: number): Cue => ({ exercise: { name, reps: '10 reps', sets: 3 }, step } as unknown as Cue)

test('every exercise move has its form cue in the registry', () => {
  for (const move of MOVES.filter(m => m.family === 'exercise')) expect([move.id, isLineId(`form-${move.id}`)]).toEqual([move.id, true])
})

test('in turn by step: a form cue, a cheer, banter', () => {
  expect(duringSetLineId(cueOf('Squats', 3))).toBe('form-squat')
  expect(duringSetLineId(cueOf('Squats', 4))).toBe('set-cheer')
  expect(duringSetLineId(cueOf('Squats', 5))).toBe('set-banter')
  expect(duringSetLineId(cueOf('Push-ups', 6))).toBe('form-push-up')
})

test('an exercise with no move: a cheer where the form cue would be', () => {
  expect(moveForExercise('Mystery thing')).toBeNull()
  expect(duringSetLineId(cueOf('Mystery thing', 3))).toBe('set-cheer')
})

test('set beats: he watches you and does the set with you; the mini head only blinks and glances', () => {
  const full = Array.from({ length: 300 }, (_, n) => idleBeat(n, 'full', false, ['squat'], 'set'))
  expect(full.some(b => b.steps.some(s => 'pose' in s && s.pose === 'lookYou'))).toBe(true)
  expect(full.some(b => b.steps.some(s => 'move' in s && s.move === 'squat'))).toBe(true)
  const mini = Array.from({ length: 300 }, (_, n) => idleBeat(n, 'mini', false, ['squat'], 'set'))
  expect(mini.every(b => b.steps.every(s => 'pose' in s && ['blink', 'idle', 'glanceL', 'glanceR'].includes(s.pose)))).toBe(true)
  // Livelier than between lines: shorter waits.
  expect(Math.max(...full.map(b => b.wait))).toBeLessThan(Math.max(...Array.from({ length: 300 }, (_, n) => idleBeat(n, 'full').wait)))
})

test('the second set of the day speaks: one of his set lines, not the Start line', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  await $.command.run(workout('now'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'done' })).toBeDefined()
  expect(await speaks(ui)).toBe(true)
  expect(await ui.find({ type: 'Text', text: line('set', { day: TODAY }) })).toBeUndefined()
  await ui.unmount()
})

test('animated: on a later set he shows the exercise once his line is out', ANIMATED, async ($, on) => {
  const { clock } = world(on, TINY)
  const blits = blitLog(on)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  await $.command.run(workout('now'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await clock.advance(8_000)
  await ui.unmount()
  expect(cellsOf('push-up').some(cells => blits.some(b => b.cells === cells))).toBe(true)
})

test('animated: he keeps living through a long set, a minute on', ANIMATED, async ($, on) => {
  const { clock } = world(on, TINY)
  const blits = blitLog(on)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await clock.advance(60_000)
  const before = blits.length
  await clock.advance(30_000)
  expect(blits.length).toBeGreaterThan(before)
  await ui.unmount()
})

test('his set lines fit beside the full portrait in an 80-column window', () => {
  const ids = ['set-cheer', 'set-banter', ...MOVES.filter(m => m.family === 'exercise').map(m => `form-${m.id}`)]
  for (const id of ids) {
    if (!isLineId(id)) continue
    for (let day = 0; day < 40; day += 1) expect([id, plainOf(line(id, { day })).length <= 57]).toEqual([id, true])
  }
})
