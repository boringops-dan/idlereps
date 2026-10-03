import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { collected, dueUnlock, setsForUnlock, setsToNext, STARTER_MOVES, UNLOCK_ORDER, unlocksEarned } from '../hooks/collection'
import { line } from '../hooks/copy'
import { BAND, drawnRows, OPTIONS, ownStore, SESSION, TINY, TODAY, workout, world } from './world'

/**
 * Swolomon's moves, collected (owner, 2026-10-03: "surprise me with something that's really gonna help
 * engagement"): sets done unlock his moves one by one; he performs each for you the first time.
 */

/** No moves collected yet (the test world otherwise starts with all of them). */
const NONE = { moves: [] as string[] }

async function bandOf($: Engine) {
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  const rows = drawnRows(await ui.drawn())
  const keys = (await ui.findAll({ type: 'Button' })).map(b => String(b.key))
  await ui.unmount()
  return { rows, keys, text: rows.join('\n') }
}

test('the pacing: the first unlock at 3 sets, then one more set each time; all 30 by 496', () => {
  expect([1, 2, 3, 4].map(setsForUnlock)).toEqual([3, 6, 10, 15])
  expect([0, 2, 3, 5, 6, 10].map(unlocksEarned)).toEqual([0, 0, 1, 1, 2, 3])
  expect(unlocksEarned(setsForUnlock(UNLOCK_ORDER.length))).toBe(UNLOCK_ORDER.length)
  expect(setsForUnlock(UNLOCK_ORDER.length)).toBe(496)
  expect(dueUnlock(2, [])).toBeNull()
  expect(dueUnlock(3, [])?.id).toBe(UNLOCK_ORDER[0])
  expect(dueUnlock(3, [UNLOCK_ORDER[0] ?? ''])).toBeNull()
  expect(setsToNext(4, [UNLOCK_ORDER[0] ?? ''])).toBe(2)
  expect(setsToNext(9999, [...UNLOCK_ORDER])).toBeNull()
  expect(collected([]).map(m => m.id)).toEqual([...STARTER_MOVES])
})

test('the third set unlocks a move: its band, him performing it, Undo still there; it is kept', OPTIONS, async ($, on) => {
  const store = ownStore(on, { ...NONE, totalDoneSets: 2 })
  world(on, TINY, 'own-store')
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  const band = await bandOf($)
  expect(band.keys).toEqual(['nice', 'again', 'undo'])
  expect(band.text).toContain(`New move: Kiss the gun · ${STARTER_MOVES.length + 1} of ${STARTER_MOVES.length + UNLOCK_ORDER.length}`)
  expect(store.get('moves')).toEqual([UNLOCK_ORDER[0]])
  // Again plays it once more: the same band.
  await $.command.run(workout('again'))
  expect((await bandOf($)).keys).toEqual(['nice', 'again', 'undo'])
  await $.command.run(workout('nice'))
  expect((await bandOf($)).keys).toEqual([])
})

test('a set that does not earn one: the usual logged line', OPTIONS, async ($, on) => {
  world(on, TINY, { ...NONE, totalDoneSets: 0 })
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  expect((await bandOf($)).text).toContain('Logged')
})

test('Undo on the unlock band takes back the set; the move stays theirs', OPTIONS, async ($, on) => {
  const store = ownStore(on, { ...NONE, totalDoneSets: 2 })
  world(on, TINY, 'own-store')
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  await $.command.run(workout('undo'))
  expect(store.get('totalDoneSets')).toBe(2)
  expect(store.get('moves')).toEqual([UNLOCK_ORDER[0]])
})

test('/workout flex shows only the moves they have', OPTIONS, async ($, on) => {
  world(on, TINY, NONE)
  await $.session.start(SESSION)
  const titles = new Set<string>()
  for (let i = 0; i < 6; i += 1) {
    await $.command.run(workout('flex'))
    const row = (await bandOf($)).rows.find(r => r.startsWith('▸ '))
    if (row !== undefined) titles.add(row.slice(2))
    await $.command.run(workout('nice'))
  }
  expect([...titles].sort()).toEqual(collected([]).map(m => m.title).sort())
})

test('/workout moves: how many, the next one, and the ones they have', OPTIONS, async ($, on) => {
  world(on, TINY, { moves: [UNLOCK_ORDER[0]], totalDoneSets: 4 })
  await $.session.start(SESSION)
  const text = (await $.command.run(workout('moves'))).text ?? ''
  expect(text).toContain(line('reply-moves', { day: TODAY, n: STARTER_MOVES.length + 1, total: STARTER_MOVES.length + UNLOCK_ORDER.length, next: 'Next one in 2 sets.' }))
  expect(text).toContain('Kiss the gun')
})

test('Just remind me sets unlock moves too', OPTIONS, async ($, on) => {
  const store = ownStore(on, { ...NONE, mode: 'remind', totalDoneSets: 2 })
  world(on, null, 'own-store')
  await $.session.start(SESSION)
  await $.command.run(workout('log'))
  await $.command.run(workout('upper'))
  expect((await bandOf($)).keys).toEqual(['nice', 'again'])
  expect(store.get('moves')).toEqual([UNLOCK_ORDER[0]])
})

test('a rank-up on the same set comes first; the move waits for the next set', OPTIONS, async ($, on) => {
  const store = ownStore(on, { ...NONE, totalDoneSets: 24 })
  world(on, { ...TINY, workouts: [{ name: 'A', exercises: [{ name: 'Push-ups', reps: '10 reps', sets: 4 }] }] }, 'own-store')
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  expect((await bandOf($)).text).toContain('Rank up')
  expect(store.get('moves')).toEqual([])
  await $.command.run(workout('letsgo'))
  await $.command.run(workout('now'))
  await $.command.run(workout('done'))
  expect((await bandOf($)).keys).toContain('again')
})
