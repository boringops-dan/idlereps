import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { line } from '../hooks/copy'
import { footerOf } from '../hooks/footer'
import { FOOTER_REACTION_MS, mayReact, REACTION_GAP_MS, startReaction } from '../hooks/reactions'
import { ANIMATED, BAND, drawnRows, footerLabelOf, OPTIONS, SESSION, TINY, TODAY, workout, world } from './world'

/** Live reactions (owner, 2026-10-06): what your agent's calls do, as it happens, read his way. */

/** What shows: the band's rows, and the footer's label (where a reaction goes with nothing up). */
const rowsOf = async ($: Engine) => {
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  const rows = drawnRows(await ui.drawn()).join('\n')
  await ui.unmount()
  return `${rows}\n${(await footerLabelOf($)) ?? ''}`
}

test('an install starting is a reaction; a test run or a read is not, until it lands', () => {
  expect(startReaction({ tool: 'Bash', command: 'npm install' })).toBe('install')
  expect(startReaction({ tool: 'Bash', command: 'cd web && pnpm add zod' })).toBe('install')
  expect(startReaction({ tool: 'Bash', command: 'pip install -r requirements.txt' })).toBe('install')
  expect(startReaction({ tool: 'Bash', command: 'npm test' })).toBeNull()
  expect(startReaction({ tool: 'Bash', command: 'echo npm install' })).toBeNull()
  expect(startReaction({ tool: 'Read' })).toBeNull()
})

test('once per kind a turn, and never two inside the gap', () => {
  expect(mayReact('tests-pass', new Set(), null, 0)).toBe(true)
  expect(mayReact('tests-pass', new Set(['tests-pass']), null, 0)).toBe(false)
  expect(mayReact('commit', new Set(['tests-pass']), 0, REACTION_GAP_MS - 1)).toBe(false)
  expect(mayReact('commit', new Set(['tests-pass']), 0, REACTION_GAP_MS)).toBe(true)
})

test('in the footer: a reaction takes the time’s place until it ends', () => {
  const now = 1_000_000
  const reaction = { text: 'hey', until: now + FOOTER_REACTION_MS }
  expect(footerOf({ isUnderWay: true, nextCueAt: now + 20 * 60_000, now, reaction })).toMatchObject({ when: 'hey', changeIn: FOOTER_REACTION_MS })
  expect(footerOf({ isUnderWay: false, nextCueAt: undefined, now, reaction })).toMatchObject({ when: 'hey', changeIn: FOOTER_REACTION_MS })
  expect(footerOf({ isUnderWay: true, nextCueAt: now + 20 * 60_000, now, reaction: { text: 'hey', until: now - 1 } }).when).toBe('20m')
})

test('tests green with nothing up: his word in the footer, then the time again', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.tool.call({ tool: 'Read', file_path: '/x' } as never)
  await $.tool.call({ tool: 'Bash', command: 'npm test' })
  const said = line('live-tests-pass', { day: TODAY })
  expect(await rowsOf($)).toContain(said)
  await clock.advance(FOOTER_REACTION_MS + 1)
  expect(await rowsOf($)).not.toContain(said)
})

test('red tests, then a second red run: one word a turn per kind', OPTIONS, async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: 'fail' }, isError: true }))
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.tool.call({ tool: 'Bash', command: 'npm test' })
  expect(await rowsOf($)).toContain(line('live-tests-fail', { day: TODAY }))
  await clock.advance(REACTION_GAP_MS + FOOTER_REACTION_MS)
  await $.tool.call({ tool: 'Bash', command: 'npm test' })
  expect(await rowsOf($)).not.toContain(line('live-tests-fail', { day: TODAY }))
})

test('an install starting: his word while it runs', OPTIONS, async ($, on) => {
  let finish = () => {}
  const done = new Promise<void>(resolve => {
    finish = resolve
  })
  on('tool.call', { tool: 'Bash' }, async () => {
    await done
    return { result: { stdout: '', stderr: '' } }
  })
  world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  const running = $.tool.call({ tool: 'Bash', command: 'npm install' })
  await Promise.resolve()
  expect(await rowsOf($)).toContain(line('live-install', { day: TODAY }))
  finish()
  await running
})

test('a set band up, his line out: the reaction is his aside', ANIMATED, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.command.run(workout('start'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await clock.advance(5_000)
  await $.tool.call({ tool: 'Bash', command: 'npm test' })
  expect(drawnRows(await ui.drawn()).join('\n')).toContain(`/ ${line('live-tests-pass', { day: TODAY })}`)
  await ui.unmount()
})

test('Quiet, or after the turn: no reactions', { options: { ...OPTIONS.options, coachChat: 'quiet' } }, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.tool.call({ tool: 'Bash', command: 'npm test' })
  expect(await rowsOf($)).not.toContain(line('live-tests-pass', { day: TODAY }))
})
