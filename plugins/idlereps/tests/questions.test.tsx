import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { line } from '../hooks/copy'
import type { LineId } from '../hooks/copy'
import { nextQuestion, QUESTIONS, recallFor } from '../hooks/questions'
import { ANIMATED, BAND, drawnRows, mountAt, NOON, ONBOARDED, OPTIONS, ownStore, SESSION, TINY, TODAY, workout, world } from './world'

/** Swolomon gets to know you (owner, 2026-10-03: "a real person"): a question now and then; recalled later. */

const H = 3_600_000
/** Just remind me, inside the gap (a set was just logged): nothing else is due. */
const QUIET_TURN = { mode: 'remind', about: {}, nextCueAt: NOON + 10 * 60_000 }

async function bandOf($: Engine) {
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  const rows = drawnRows(await ui.drawn())
  const keys = (await ui.findAll({ type: 'Button' })).map(b => String(b.key))
  await ui.unmount()
  return { keys, text: rows.join('\n') }
}

async function longTurn($: Engine, clock: { advance: (ms: number) => Promise<void> }, turnId = 't1') {
  await $.turn.start({ text: 'go', turnId })
  await clock.advance(31_000)
  return bandOf($)
}

test('the questions: asked in order; a pass is never asked again; recalls only from answers, in turn', () => {
  expect(nextQuestion({})?.id).toBe('owl')
  expect(nextQuestion({ owl: 'pass' })?.id).toBe('why')
  expect(nextQuestion(Object.fromEntries(QUESTIONS.map(q => [q.id, 0])))).toBeUndefined()
  expect(recallFor({}, TODAY)).toBeUndefined()
  expect(recallFor({ owl: 'pass' }, TODAY)).toBeUndefined()
  expect(recallFor({ owl: 1 }, TODAY)).toBe('recall-owl-night')
  const both = { owl: 1, pet: 0 } as const
  expect(new Set([recallFor(both, TODAY), recallFor(both, TODAY + 1)])).toEqual(new Set(['recall-owl-night', 'recall-pet-dogs']))
  for (const q of QUESTIONS) expect(q.recall).toHaveLength(q.options.length)
})

test('a quiet turn: his question, its answers as the buttons; an answer is kept, and he replies to it in the band', OPTIONS, async ($, on) => {
  const store = ownStore(on, QUIET_TURN)
  const { clock, w } = world(on, null, 'own-store')
  await $.session.start(SESSION)
  const band = await longTurn($, clock)
  expect(band.keys).toEqual(['a', 'b', 'c', 'pass'])
  expect(band.text).toContain(line('ask-owl', { day: TODAY }))
  expect(band.text).toContain('1: Morning   2: Night owl   3: Depends   0: Pass')
  const toasts = w.toasts.length
  await $.command.run(workout('b'))
  expect(store.get('about')).toEqual({ owl: 1 })
  const reply = await bandOf($)
  expect(reply.text).toContain('A night owl')
  expect(reply.keys).toEqual(['nice'])
  expect(w.toasts.length).toBe(toasts)
  await $.command.run(workout('nice'))
  expect((await bandOf($)).keys).toEqual([])
})

test('every answer has its own reply, and it names the answer', () => {
  for (const q of QUESTIONS) {
    expect(q.reply).toHaveLength(q.options.length)
    expect(new Set(q.reply).size).toBe(q.reply.length)
    q.options.forEach((option, i) => {
      const said = line(q.reply[i] as LineId, { day: TODAY }).toLowerCase()
      expect(said).toContain(option.toLowerCase().split(' ')[0] as string)
    })
  }
})

test('the morning answer gets the morning reply, not the night one', OPTIONS, async ($, on) => {
  const store = ownStore(on, QUIET_TURN)
  const { clock } = world(on, null, 'own-store')
  await $.session.start(SESSION)
  await longTurn($, clock)
  await $.command.run(workout('a'))
  const text = (await bandOf($)).text
  expect(text).toContain(line('reply-owl-morning', { day: TODAY }))
  expect(text).not.toContain('night owl')
  expect(store.get('about')).toEqual({ owl: 0 })
})

test('a later question replies to its own answer', OPTIONS, async ($, on) => {
  const store = ownStore(on, { ...QUIET_TURN, about: { owl: 1, why: 'pass' } })
  const { clock } = world(on, null, 'own-store')
  await $.session.start(SESSION)
  expect((await longTurn($, clock)).text).toContain(line('ask-pet', { day: TODAY }))
  await $.command.run(workout('b'))
  expect((await bandOf($)).text).toContain(line('reply-pet-cats', { day: TODAY }))
  expect(store.get('about')).toEqual({ owl: 1, why: 'pass', pet: 1 })
})

test('once a day', OPTIONS, async ($, on) => {
  const { clock } = world(on, null, QUIET_TURN)
  await $.session.start(SESSION)
  await longTurn($, clock, 't1')
  await $.command.run(workout('pass'))
  await $.turn.complete({ turnId: 't1', answer: '', reason: 'answer', durationMs: 31_000, isAborted: false } as never)
  expect((await longTurn($, clock, 't2')).keys).toEqual([])
})

test('one asked before: the next one', OPTIONS, async ($, on) => {
  const { clock } = world(on, null, { ...QUIET_TURN, about: { owl: 'pass' } })
  await $.session.start(SESSION)
  expect((await longTurn($, clock)).text).toContain(line('ask-why', { day: TODAY }))
})

test('Pass: kept as passed, no thanks, never asked again', OPTIONS, async ($, on) => {
  const store = ownStore(on, QUIET_TURN)
  const { clock, w } = world(on, null, 'own-store')
  await $.session.start(SESSION)
  await longTurn($, clock)
  const toasts = w.toasts.length
  await $.command.run(workout('pass'))
  expect(store.get('about')).toEqual({ owl: 'pass' })
  expect(w.toasts.length).toBe(toasts)
  expect((await bandOf($)).keys).toEqual([])
})

test('never the day they met him', OPTIONS, async ($, on) => {
  const { clock } = world(on, null, { ...QUIET_TURN, seen: { ...ONBOARDED, onboarded: { at: NOON - H, n: 1 } } })
  await $.session.start(SESSION)
  expect((await longTurn($, clock)).keys).toEqual([])
})

test('a set due comes first: no question', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY, { about: {} })
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(61_000)
  expect((await bandOf($)).keys).toContain('start')
})

test('animated: once a day, the first aside is something he remembers', ANIMATED, async ($, on) => {
  const { clock } = world(on, null, { mode: 'remind', about: { owl: 1, why: 'pass', pet: 'pass', music: 'pass', snack: 'pass' } })
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  const ui = await mountAt($, 160)
  let seen = false
  for (let t = 0; t < 90_000 && !seen; t += 500) {
    await clock.advance(500)
    seen = drawnRows(await ui.drawn()).some(r => r.includes('/ Night owl. I remembered'))
  }
  expect(seen).toBe(true)
  await ui.unmount()
})
