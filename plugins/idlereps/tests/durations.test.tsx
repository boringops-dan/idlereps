import { expect, test } from 'claude-code/testing'

import { CALL_TIMES_KEPT, callKind, commandKind, expectedMs, learn, LONG_CALL_MS, priorMs, segmentKey } from '../hooks/durations'
import { toolSign } from '../hooks/signals'
import { expectedWaitMs } from '../hooks/waits'
import { line } from '../hooks/copy'
import { UNLOCK_ORDER } from '../hooks/collection'
import { ASKED, BAND, ONBOARDED, OPTIONS, ownStore, SESSION, TINY, TODAY, world } from './world'

/** How long a call will take (owner, 2026-10-06): its kind, what kinds usually take, and what was learned. */

test('a command’s kind: the program and what it does, never its arguments', () => {
  expect(segmentKey('npm run build')).toBe('npm run build')
  expect(segmentKey('npm test -- --watch=false')).toBe('npm test')
  expect(segmentKey('npx -y vitest run src/foo.test.ts')).toBe('npx vitest run')
  expect(segmentKey('NODE_ENV=test sudo cargo test --release')).toBe('cargo test')
  expect(segmentKey('git commit -m "a message"')).toBe('git commit')
  expect(segmentKey('python3 scripts/train.py --epochs 3')).toBe('python3 train.py')
  expect(segmentKey('python -m pytest tests/')).toBe('python -m pytest')
  expect(segmentKey('/usr/local/bin/claude plugin test plugins/idlereps')).toBe('claude plugin test')
  expect(segmentKey('')).toBeNull()
})

test('a line’s kind: its slowest-looking command, in its project; sleep is as long as it says', () => {
  expect(commandKind('cd app && npm install && ls', 'shop')?.key).toBe('shop|npm install')
  expect(commandKind('git status | head -5', 'shop')?.key).toBe('shop|git status')
  expect(commandKind('sleep 90', 'shop')).toEqual({ key: 'shop|sleep', priorMs: 90_000 })
  expect(commandKind('sleep 2m && echo done', 'shop')?.priorMs).toBe(120_000)
})

test('what kinds usually take: quick commands seconds, suites a minute, builds minutes, deploys more', () => {
  expect(priorMs('ls')).toBeLessThanOrEqual(1000)
  expect(priorMs('git status')).toBeLessThanOrEqual(1000)
  expect(priorMs('git push')).toBe(5000)
  expect(priorMs('npm test')).toBe(60_000)
  expect(priorMs('cargo build')).toBe(180_000)
  expect(priorMs('docker build')).toBe(300_000)
  expect(priorMs('some-unknown-tool run')).toBe(5000)
  // Helpers and the engine's tools.
  expect(callKind('Agent', { subagent_type: 'Explore' }, 'p')?.priorMs).toBe(90_000)
  expect(callKind('Read', {}, 'p')?.priorMs).toBeLessThan(1000)
})

test('learning: the first timing meets the prior halfway; then the average follows the timings', () => {
  const kind = { key: 'shop|npm run build', priorMs: 120_000 }
  let times = learn({}, kind.key, 4_000, 1)
  expect(expectedMs(kind, times)).toBe(62_000)
  times = learn(times, kind.key, 4_000, 2)
  expect(expectedMs(kind, times)).toBe(4_000)
  times = learn(times, kind.key, 14_000, 3)
  expect(expectedMs(kind, times)).toBe(7_000)
  // A call left running for hours teaches nothing.
  expect(learn(times, kind.key, 5 * 3_600_000, 4)).toBe(times)
})

test('per project: the same command learned apart', () => {
  const fast = commandKind('npm run build', 'tiny-lib')!
  const slow = commandKind('npm run build', 'big-app')!
  const times = learn(learn(learn({}, fast.key, 3_000, 1), fast.key, 3_000, 2), slow.key, 240_000, 3)
  expect(expectedMs(fast, times)).toBe(3_000)
  expect(expectedMs(slow, times)).toBeGreaterThan(LONG_CALL_MS)
})

test('the cap: past it, the least recently timed kinds go', () => {
  let times = {}
  for (let i = 0; i < CALL_TIMES_KEPT + 5; i += 1) times = learn(times, `k${i}`, 1000, i)
  expect(Object.keys(times).length).toBe(CALL_TIMES_KEPT)
  expect('k0' in times).toBe(false)
  expect(`k${CALL_TIMES_KEPT + 4}` in times).toBe(true)
})

test('the sign: a command expected long is a long run with its wait; one learned quick is not, whatever its name', () => {
  expect(toolSign({ tool: 'Bash', command: 'npm run build' }, 1, 240_000)).toEqual({ reason: 'long-run', waitMs: 240_000 })
  expect(toolSign({ tool: 'Bash', command: 'npm run build' }, 1, 3_000)).toBeNull()
  // A raised timeout is still the agent's own word that it will be long.
  expect(toolSign({ tool: 'Bash', command: 'npm run build', timeoutMs: 300_000 }, 1, 3_000)).toEqual({ reason: 'long-run' })
})

test('the wait: a call still running sets the least it can be', () => {
  expect(expectedWaitMs({ recent: [], elapsedMs: 0, callWaitMs: 200_000 })).toBe(200_000)
  expect(expectedWaitMs({ recent: [], elapsedMs: 0 })).toBeNull()
  expect(expectedWaitMs({ signWaitMs: 60_000, recent: [], elapsedMs: 0, callWaitMs: 200_000 })).toBe(200_000)
  expect(expectedWaitMs({ reason: 'long-run', recent: [], elapsedMs: 0, callWaitMs: 10_000 })).toBeGreaterThan(10_000)
})

test('a command learned slow in this project: the ask comes early and says how long', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY, { callTimes: { 'work|npm run build': { n: 5, ms: 240_000, at: 1 } } })
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  void $.tool.call({ tool: 'Bash', command: 'npm run build' } as never)
  await clock.advance(6_000)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ key: 'start' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: line('reason-long-run-timed', { day: TODAY, wait: 'about 4 min' }) })).toBeDefined()
  await ui.unmount()
})

test('every call run here is timed and learned, in its project; refused and background calls are not', OPTIONS, async ($, on) => {
  let finishTool = () => {}
  const toolDone = new Promise<void>(resolve => {
    finishTool = resolve
  })
  on('tool.call', { tool: 'Bash' }, async ($, e) => {
    if ((e as { command?: string }).command === 'rm -rf /') return { deny: 'no' }
    if ((e as { run_in_background?: boolean }).run_in_background !== true) await toolDone
    return { result: { stdout: '', stderr: '' } }
  })
  const store = ownStore(on)
  const { clock } = world(on, TINY, 'own-store')
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  const running = $.tool.call({ tool: 'Bash', command: 'cd app && npm run build' })
  await clock.advance(8_000)
  finishTool()
  await running
  await $.tool.call({ tool: 'Bash', command: 'rm -rf /' })
  await $.tool.call({ tool: 'Bash', command: 'npm run dev', run_in_background: true } as never)
  const times = store.get('callTimes') as Record<string, { n: number; ms: number }>
  expect(Object.keys(times)).toEqual(['work|npm run build'])
  expect(times['work|npm run build']).toMatchObject({ n: 1, ms: 8_000 })
})

test('the agent never waits on him: a call runs and returns while his store is still busy', OPTIONS, async ($, on) => {
  let release = () => {}
  const storeBusy = new Promise<void>(resolve => {
    release = resolve
  })
  // The store, by hand: once the turn is going, any read of what he has learned hangs until released.
  let isBusy = false
  const store = new Map<string, unknown>(Object.entries({ moves: [...UNLOCK_ORDER], about: ASKED, seen: ONBOARDED }))
  on('store.get', async ($, e) => {
    if (isBusy && e.key === 'callTimes') await storeBusy
    return { value: store.get(e.key) }
  })
  on('store.set', ($, e) => {
    store.set(e.key, e.value)
    return { value: undefined }
  })
  on('store.delete', ($, e) => {
    store.delete(e.key)
    return { value: undefined }
  })
  on('store.keys', () => ({ value: [...store.keys()] }))
  let ran = 0
  on('tool.call', { tool: 'Bash' }, () => {
    ran += 1
    return { result: { stdout: 'ok', stderr: '' } }
  })
  world(on, TINY, 'own-store')
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  isBusy = true
  const result = await $.tool.call({ tool: 'Bash', command: 'npm run build' })
  expect(ran).toBe(1)
  expect(result).toMatchObject({ result: { stdout: 'ok' } })
  expect(store.get('callTimes')).toBeUndefined()
  release()
})
