import { expect, test } from 'claude-code/testing'

import { line } from '../hooks/copy'
import { BUSY_TOOL_CALLS, isBigAsk, toolSign } from '../hooks/signals'

const toolSignal = (tool: string, command: string | undefined, calls: number) =>
  toolSign({ tool, ...(command === undefined ? {} : { command }) }, calls)?.reason ?? null
import { BAND, countingClock, OPTIONS, SESSION, speaks, TINY, TODAY, workout, world } from './world'

/** Long-task detection beyond the prototype's tests (plan §6 Task 1, D21). */

test('every long command family is a sign', () => {
  const families = [
    'npm test',
    'npm run build',
    'pnpm test',
    'pnpm run build',
    'yarn test',
    'yarn build',
    'bun test',
    'bun run build',
    'npx vitest run',
    'npx playwright test',
    'npx tsc -p .',
    'pytest -q',
    'cargo build',
    'cargo test',
    'go test ./...',
    'go build ./cmd/x',
    'make all',
    'docker build .',
    'xcodebuild -scheme App',
    'gradle assemble',
  ]
  for (const command of families) expect([command, toolSignal('Bash', command, 1)]).toEqual([command, 'long-run'])
})

test('near misses are not signs', () => {
  for (const command of ['git status', 'ls build/', 'echo test', 'cat Makefile', 'grep -r test src']) {
    expect([command, toolSignal('Bash', command, 1)]).toEqual([command, null])
  }
  // A long command named by another tool is not a run.
  expect(toolSignal('Read', 'npm test', 1)).toBe(null)
})

test('each helper tool is a sign, and only the 8th call makes a turn busy', () => {
  for (const tool of ['Agent', 'Task', 'Workflow']) expect(toolSignal(tool, undefined, 1)).toBe('helpers')
  expect(toolSignal('Edit', undefined, 7)).toBe(null)
  expect(toolSignal('Edit', undefined, 8)).toBe('busy')
  expect(BUSY_TOOL_CALLS).toBe(8)
})

test('a big request is 400 characters, or a big-job word in any case', () => {
  expect(isBigAsk('x'.repeat(399))).toBe(false)
  expect(isBigAsk('x'.repeat(400))).toBe(true)
  for (const word of ['implement', 'REFACTOR', 'Migrate', 'rewrite', 'write tests']) expect([word, isBigAsk(`please ${word} it`)]).toEqual([word, true])
  expect(isBigAsk('fix the typo in the header')).toBe(false)
})

test('only the first sign of a turn moves the cue', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await $.tool.call({ tool: 'Bash', command: 'npm test' })
  await clock.advance(3_000)
  // A second sign 3 s later does not push the cue back to 5 s from now.
  await $.tool.call({ tool: 'Agent', description: 'x', prompt: 'y', subagent_type: 'Explore' } as never)
  await clock.advance(2_000)
  expect(await ui.find({ key: 'start' })).toBeDefined()
  // The reason is the first sign's.
  expect(await ui.find({ type: 'Text', text: line('reason-long-run', { day: TODAY }) })).toBeDefined()
  await ui.unmount()
})

test('a slow call that ends at 19 s is no sign', OPTIONS, async ($, on) => {
  let finishTool = () => {}
  const toolDone = new Promise<void>(resolve => {
    finishTool = resolve
  })
  on('tool.call', { tool: 'Bash' }, async () => {
    await toolDone
    return { result: { stdout: '', stderr: '' } }
  })
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  const running = $.tool.call({ tool: 'Bash', command: 'sleep 19' })
  await clock.advance(19_000)
  finishTool()
  await running
  await clock.advance(6_000)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  // 25 s in: no sign, so the 30 s wait still holds.
  expect(await ui.find({ key: 'start' })).toBeUndefined()
  await clock.advance(5_000)
  expect(await ui.find({ key: 'start' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: line('reason-slow-step', { day: TODAY }) })).toBeUndefined()
  await ui.unmount()
})

test('the tool hook hands back what ran beneath it, a denial included', OPTIONS, async ($, on) => {
  on('tool.call', { tool: 'Write' }, () => ({ deny: 'not here' }))
  on('tool.call', { tool: 'Read' }, () => ({ result: { stdout: 'exact', stderr: '' } }))
  world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  const read = await $.tool.call({ tool: 'Read', file_path: '/x' } as never)
  expect(JSON.stringify(read)).toMatch(/exact/)
  const denied = await $.tool.call({ tool: 'Write', file_path: '/x', content: '' } as never)
  expect(JSON.stringify(denied)).toMatch(/not here/)
})

test('after the first sign, later tool calls start no timer', OPTIONS, async ($, on) => {
  const counter = countingClock(on)
  world(on, TINY, {}, { ownClock: true })
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  for (let i = 0; i < BUSY_TOOL_CALLS; i += 1) await $.tool.call({ tool: 'Read', file_path: '/x' } as never)
  const before = counter.timers
  await $.tool.call({ tool: 'Read', file_path: '/x' } as never)
  expect(counter.timers).toBe(before)
  counter.release()
})

test('a turn that cannot cue does nothing in the tool hook', OPTIONS, async ($, on) => {
  const counter = countingClock(on)
  world(on, TINY, { paused: true }, { ownClock: true })
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  const before = counter.timers
  await $.tool.call({ tool: 'Bash', command: 'npm test' })
  await $.tool.call({ tool: 'Read', file_path: '/x' } as never)
  expect(counter.timers).toBe(before)
  counter.release()
})

test('with no sign the ask band opens with the usual line, and a sign band with its reason', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await clock.advance(30_000)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'start' })).toBeDefined()
  for (const id of ['reason-helpers', 'reason-long-run', 'reason-slow-step', 'reason-busy', 'reason-big-ask'] as const) {
    expect(await ui.find({ type: 'Text', text: line(id, { day: TODAY }) })).toBeUndefined()
  }
  expect(await speaks(ui)).toBe(true)
  await ui.unmount()
})

test('a sign after the turn ended shows no reason on the next turn', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.turn.complete({ turnId: 't1', answer: '', reason: 'end_turn' } as never)
  await $.tool.call({ tool: 'Bash', command: 'npm test' })
  await $.turn.start({ text: 'go again', turnId: 't2' })
  await clock.advance(30_000)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'start' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: line('reason-long-run', { day: TODAY }) })).toBeUndefined()
  await ui.unmount()
})

test('Start after a sign: the first set opens with the reason; the next set is silent', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.tool.call({ tool: 'Agent', description: 'x', prompt: 'y', subagent_type: 'Explore' } as never)
  await clock.advance(5_000)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await ui.press({ key: 'start' })
  expect(await ui.find({ type: 'Text', text: line('reason-helpers', { day: TODAY }) })).toBeDefined()
  await ui.press({ key: 'done' })
  await clock.advance(15 * 60_000)
  expect(await ui.find({ type: 'Text', text: /set 2 of 2/ })).toBeDefined()
  expect(await speaks(ui)).toBe(false)
  await ui.unmount()
  expect(JSON.stringify(await $.command.run(workout('status')))).toMatch(/set 2 of 2/)
})
