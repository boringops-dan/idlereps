import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { IDEAS } from '../hooks/remind'
import { expectedWaitMs, keptTurns, LONG_MS, QUICK_MS, TURN_LENGTHS_KEPT, waitSize } from '../hooks/waits'
import { BAND, drawnRows, OPTIONS, ownStore, SESSION, world } from './world'

/**
 * Asks sized to the wait (owner, 2026-10-03): a quick turn gets a quick one, a long one a walk; from the
 * agent's word, a sign of a long task, or the person's usual turns.
 */

const MIN = 60_000
const REMIND = { mode: 'remind' }

async function bandText($: Engine) {
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  const text = drawnRows(await ui.drawn()).join('\n')
  await ui.unmount()
  return text
}

test('the wait: the agent’s word first, then a long task’s sign, then the usual turn; nothing to go on, none', () => {
  const usual = Array.from({ length: 6 }, () => 4 * MIN)
  expect(expectedWaitMs({ signWaitMs: 20 * MIN, recent: usual, elapsedMs: 0 })).toBe(20 * MIN)
  expect(expectedWaitMs({ reason: 'helpers', recent: [], elapsedMs: 0 })).toBe(LONG_MS)
  expect(expectedWaitMs({ reason: 'long-run', recent: Array.from({ length: 6 }, () => 20 * MIN), elapsedMs: MIN })).toBe(19 * MIN)
  expect(expectedWaitMs({ recent: usual, elapsedMs: MIN })).toBe(3 * MIN)
  // Past the usual: at least another minute.
  expect(expectedWaitMs({ recent: usual, elapsedMs: 10 * MIN })).toBe(MIN)
  expect(expectedWaitMs({ recent: usual.slice(0, 4), elapsedMs: 0 })).toBeNull()
  // A busy turn or a big ask is no sign of how long.
  expect(expectedWaitMs({ reason: 'busy', recent: [], elapsedMs: 0 })).toBeNull()
})

test('what fits: quick under 2.5 min, long from 6, a set between; unknown is a set', () => {
  expect([null, QUICK_MS - 1, QUICK_MS, LONG_MS - 1, LONG_MS].map(waitSize)).toEqual(['set', 'quick', 'set', 'set', 'long'])
})

test('the turns kept: only those 30 s or longer, the last 30', () => {
  expect(keptTurns([], 10_000)).toEqual([])
  expect(keptTurns([MIN], 2 * MIN)).toEqual([MIN, 2 * MIN])
  const full = Array.from({ length: TURN_LENGTHS_KEPT }, (_, i) => MIN + i)
  expect(keptTurns(full, 9 * MIN)).toEqual([...full.slice(1), 9 * MIN])
})

test('a finished turn is remembered, a short one is not', OPTIONS, async ($, on) => {
  const store = ownStore(on, REMIND)
  world(on, null, 'own-store')
  await $.session.start(SESSION)
  for (const [turnId, durationMs] of [['t1', 90_000], ['t2', 5_000]] as const) {
    await $.turn.start({ text: 'go', turnId })
    await $.turn.complete({ turnId, answer: '', reason: 'answer', durationMs, isAborted: false } as never)
  }
  expect(store.get('turnLengths')).toEqual([90_000])
})

test('a helper agent called: a long one, a walk among the ideas, and how long', OPTIONS, async ($, on) => {
  const { clock } = world(on, null, REMIND)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.tool.call({ tool: 'Agent', prompt: 'x', description: 'x' } as never)
  await clock.advance(10_000)
  const text = await bandText($)
  expect(text).toContain('Ideas for about 6 min:')
  expect(IDEAS.long.some(idea => text.includes(idea))).toBe(true)
  expect(/Long one|Stretch your legs|gone a bit/.test(text)).toBe(true)
})

test('usually short turns here: a quick one', OPTIONS, async ($, on) => {
  const { clock } = world(on, null, { ...REMIND, turnLengths: Array.from({ length: 8 }, () => 2 * MIN) })
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(31_000)
  const text = await bandText($)
  expect(IDEAS.quick.some(idea => text.includes(idea))).toBe(true)
  expect(text).toContain('Ideas for about 2 min:')
})

test('no history yet: a set, as before, and no wait named', OPTIONS, async ($, on) => {
  const { clock } = world(on, null, REMIND)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(31_000)
  const text = await bandText($)
  expect(text).toContain('Ideas: ')
  expect(IDEAS.set.some(idea => text.includes(idea))).toBe(true)
})
