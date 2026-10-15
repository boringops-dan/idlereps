import { expect, test } from 'claude-code/testing'

import { line } from '../hooks/copy'
import { COLLECTION, OPTIONS, SESSION, STATUS, TINY, TODAY, workout, world } from './world'

/** `/workout` asked from the mobile app over Remote Control: the app draws no band and no pane, so it answers in text. */

const fromPhone = (args: string) => ({ ...workout(args), origin: { kind: 'bridge' } }) as const

test('bare /workout from the phone answers with the status line and opens no pane', OPTIONS, async ($, on) => {
  const { w } = world(on, TINY)
  await $.session.start(SESSION)
  const reply = await $.command.run(fromPhone(''))
  expect(reply.text).toContain('Workout 1 of 2 (A), set 1 of 2')
  expect(w.opened).not.toContain(STATUS.requestId)
})

test('bare /workout at the terminal still opens the pane and prints nothing', OPTIONS, async ($, on) => {
  const { w } = world(on, TINY)
  await $.session.start(SESSION)
  const reply = await $.command.run(workout(''))
  expect(reply.text).toBeUndefined()
  expect(w.opened).toContain(STATUS.requestId)
})

test('bare /workout from the phone in Just remind me answers with the remind line', OPTIONS, async ($, on) => {
  const { w } = world(on, null, { mode: 'remind' })
  await $.session.start(SESSION)
  const reply = await $.command.run(fromPhone(''))
  expect(reply.text).toBe(line('remind-status', { day: TODAY, n: 0, week: 0 }))
  expect(w.opened).not.toContain(STATUS.requestId)
})

test('a command that puts up a band answers the phone with that band, its buttons as commands', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  const reply = await $.command.run(fromPhone('erase'))
  expect(reply.text).toContain(line('erase-ask', { day: TODAY }))
  expect(reply.text).toContain('/workout erase (Erase) · /workout cancel (Cancel)')
})

test('a band answered from the phone that leaves nothing showing answers with the status', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(fromPhone('erase'))
  const reply = await $.command.run(fromPhone('cancel'))
  expect(reply.text).toEqual(expect.any(String))
  expect(reply.text).not.toBe('')
})

test('with no plan, the phone gets the same no-plan reply the terminal does', OPTIONS, async ($, on) => {
  world(on, null)
  await $.session.start(SESSION)
  const phone = await $.command.run(fromPhone('status'))
  const terminal = await $.command.run(workout('status'))
  expect(phone.text).toEqual(expect.any(String))
  expect(phone.text).toBe(terminal.text)
})

test('/workout moves from the phone answers with the collection as text and opens no pane', OPTIONS, async ($, on) => {
  const { w } = world(on, TINY)
  await $.session.start(SESSION)
  const reply = await $.command.run(fromPhone('moves'))
  expect(reply.text?.split('\n').length).toBe(2)
  expect(w.opened).not.toContain(COLLECTION.requestId)
})

test('/workout setup from the phone says where setup opens, and opens nothing', OPTIONS, async ($, on) => {
  const { w } = world(on, TINY)
  await $.session.start(SESSION)
  const reply = await $.command.run(fromPhone('setup'))
  expect(reply.text).toBe(line('reply-setup-elsewhere', { day: TODAY }))
  expect(w.opened).not.toContain('workout-setup')
})

test('/workout setup at the terminal still opens setup', OPTIONS, async ($, on) => {
  const { w } = world(on, TINY)
  await $.session.start(SESSION)
  const reply = await $.command.run(workout('setup'))
  expect(reply.text).toBe(line('reply-setup-opened', { day: TODAY }))
  expect(w.opened).toContain('workout-setup')
})

test('with no surface attached (claude -p), a band command answers in text', OPTIONS, async ($, on) => {
  world(on, TINY, {}, { surfaces: [] })
  await $.session.start({ ...SESSION, surface: null })
  const reply = await $.command.run(workout('erase'))
  expect(reply.text).toContain('/workout erase (Erase) · /workout cancel (Cancel)')
})

test('VS Code draws the band as its own pane, so a band command there prints nothing', OPTIONS, async ($, on) => {
  world(on, TINY, {}, { surfaces: ['vscode'] })
  await $.session.start({ ...SESSION, surface: 'vscode' })
  const reply = await $.command.run(workout('erase'))
  expect(reply.text).toBeUndefined()
})

test('the desktop app draws the band, so a band command there prints nothing', OPTIONS, async ($, on) => {
  world(on, TINY, {}, { surfaces: ['desktop'] })
  await $.session.start({ ...SESSION, surface: 'desktop' })
  const reply = await $.command.run(workout('erase'))
  expect(reply.text).toBeUndefined()
})
