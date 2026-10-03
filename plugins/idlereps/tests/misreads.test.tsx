import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

import { ADDRESS_TERMS, fill, line, LINES, usesAgent } from '../hooks/copy'
import { MISREADS, misreadOf } from '../hooks/misreads'
import { BAND, drawnRows, NOON, OPTIONS, SESSION, TINY, TODAY, workout, world } from './world'

/**
 * Swolomon reads what the agent does (owner, 2026-10-02): always wrong, always gym talk. The spinner says
 * it while a call runs, his lines that turn use it, and the turn's last line says what he made of it.
 */

const DAY_MS = 86_400_000
const bash = (command: string) => ({ tool: 'Bash', command, description: 'run' }) as never
const done = (turnId: string, durationMs = 183_000) => ({ turnId, answer: '', reason: 'answer', durationMs, isAborted: false }) as never
const LONGEST_TERM = [...ADDRESS_TERMS].sort((a, b) => b.length - a.length)[0] ?? ''
const CODE = ['code', 'commit', 'bug', 'deploy', 'prompt', 'token', 'function', 'virtual', 'screen', 'computer', 'terminal', 'app', 'git', 'npm', 'build', 'install', 'command', 'file', 'repo', 'branch', 'merge']
const BANNED = ['lazy', 'weak', 'soft', 'pathetic', 'fat', 'skinny', 'bro', 'king', 'queen', 'dude', 'man', 'girl', 'he', 'his', 'him', 'she', 'her', 'hers', 'claude']
const words = (text: string, list: readonly string[]) => list.filter(w => new RegExp(`\\b${w}\\b`, 'i').test(text))

test('thirty-plus readings, each its own', () => {
  expect(MISREADS.length).toBeGreaterThanOrEqual(30)
  expect(new Set(MISREADS.map(m => m.id)).size).toBe(MISREADS.length)
})

test('he never gets it right: no code words, the agent only as "your agent", no gendered words', () => {
  const wrong: string[] = []
  for (const m of MISREADS) {
    for (const text of [m.verb, m.doing, m.says]) {
      if (words(text, CODE).length > 0) wrong.push(`code: ${text}`)
      if (words(text, BANNED).length > 0) wrong.push(`banned: ${text}`)
      if (/\bagent\b/i.test(text) && !/your agent/i.test(text)) wrong.push(`agent: ${text}`)
    }
    if (!m.doing.startsWith("your agent's ")) wrong.push(`doing: ${m.doing}`)
    if ((m.says.match(/\{mate\}/g) ?? []).length !== 1) wrong.push(`mate: ${m.says}`)
  }
  expect(wrong).toEqual([])
})

test('they fit: the spinner word short, his line within 70 beside his name, every ask line with it within 70', () => {
  const wrong: string[] = []
  // Band lines only: the day toast is said at a session's start, before any call to read.
  const agentLines = LINES.filter(entry => entry.voice === 'swolomon' && entry.id !== 'day-toast' && entry.variants.some(v => /\{agentDoing\}|\{AgentDoing\}/.test(v)))
  for (const m of MISREADS) {
    if (m.verb.length > 28) wrong.push(`verb ${m.verb}`)
    if (m.doing.length > 33) wrong.push(`doing ${m.doing.length} ${m.doing}`)
    for (const term of ADDRESS_TERMS) if (new RegExp(`\\b${term}\\b`, 'i').test(`${m.verb} ${m.doing} ${m.says}`)) wrong.push(`term ${term}: ${m.id}`)
    const said = fill(m.says, { mate: LONGEST_TERM })
    if (said.length > 70) wrong.push(`says ${said.length} ${said}`)
    for (const entry of agentLines) {
      for (const variant of entry.variants.filter(v => /\{agentDoing\}|\{AgentDoing\}/.test(v))) {
        const text = fill(variant, { coach: 'Swolomon', mate: LONGEST_TERM, agentDoing: m.doing, workout: 'Core and cardio', n: 12, wait: 'about 55 min', nextDay: 'Wednesday' })
        if (text.length > 70) wrong.push(`${entry.id} ${text.length} ${text}`)
      }
    }
  }
  expect(wrong).toEqual([])
})

test('what he makes of a call: the specific reading first', () => {
  const id = (tool: string, command?: string) => misreadOf({ tool, ...(command === undefined ? {} : { command }) })?.id ?? null
  expect([
    id('Bash', 'git push origin main'),
    id('Bash', 'git push --force-with-lease'),
    id('Bash', 'git pull --rebase'),
    id('Bash', 'git commit -m "x"'),
    id('Bash', 'git add -A'),
    id('Bash', 'npm test'),
    id('Bash', 'npx vitest run'),
    id('Bash', 'npm run build'),
    id('Bash', 'brew install jq'),
    id('Bash', 'npm install'),
    id('Bash', 'curl -s https://example.com'),
    id('Bash', 'python3 script.py'),
    id('Bash', 'sleep 5'),
    id('Bash', 'ls -la'),
    id('Read'),
    id('Edit'),
    id('Agent'),
    id('Grep'),
    id('WebSearch'),
    id('ScheduleWakeup'),
    id('Mystery'),
  ]).toEqual(['push', 'force-push', 'pull', 'commitment', 'add-plates', 'fitness-test', 'fitness-test', 'build', 'brew', 'install', 'curl', 'python', 'nap', null, 'read', 'edit', 'helpers', 'search', 'web', 'nap', null])
})

// ---------------------------------------------------------------------------------------------------------
// Mounted.

/** A Bash call that runs until `release` is called, so a test can look at the spinner meanwhile. */
function slowBash(on: On) {
  let release = () => {}
  on('tool.call', { tool: 'Bash' }, async () => {
    await new Promise<void>(resolve => {
      release = resolve
    })
    return { result: { stdout: '', stderr: '', interrupted: false } } as never
  })
  return { release: () => release() }
}

async function spinner($: Engine) {
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', component: 'Spinner', props: { word: 'Sauteing', message: null, suffix: '…', mode: 'tool-use' } })
  const text = drawnRows(await ui.drawn()).join('')
  await ui.unmount()
  return text
}

test('the spinner says what he thinks the agent is doing while it runs, then lets go', OPTIONS, async ($, on) => {
  const slow = slowBash(on)
  world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  const running = $.tool.call(bash('git push origin main'))
  await Promise.resolve()
  expect(await spinner($)).toBe('Doing push-ups…')
  slow.release()
  await running
  expect(await spinner($)).toBe('Sauteing…')
})

test('no plan, or paused: the spinner is the engine’s own', OPTIONS, async ($, on) => {
  const slow = slowBash(on)
  world(on, null)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  const running = $.tool.call(bash('git push'))
  await Promise.resolve()
  expect(await spinner($)).toBe('Sauteing…')
  slow.release()
  await running
})

test('paused: no reading', OPTIONS, async ($, on) => {
  const slow = slowBash(on)
  world(on, TINY, { paused: true })
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  const running = $.tool.call(bash('curl x'))
  await Promise.resolve()
  expect(await spinner($)).toBe('Sauteing…')
  slow.release()
  await running
})

/** A day whose ask line names what the agent is doing. */
const AGENT_DAY = [0, 1, 2].map(d => TODAY + d).find(day => usesAgent('ask-first', day)) ?? TODAY

test('the ask that turn says what the agent is doing, misread', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY, {}, { now: NOON + (AGENT_DAY - TODAY) * DAY_MS })
  await $.session.start(SESSION)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.tool.call(bash('curl -s https://example.com'))
  await clock.advance(31_000)
  const rows = drawnRows(await ui.drawn()).join('\n').toLowerCase()
  expect(rows).toContain("your agent's doing curls")
  await ui.unmount()
})

async function turnEnd($: Engine, durationMs = 183_000) {
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', component: 'TurnDuration', props: { word: 'Baked', durationMs } })
  const rows = drawnRows(await ui.drawn())
  await ui.unmount()
  return rows
}

test('the turn ends with what he made of it: the last reading, when nothing came of it he knows a word for', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.tool.call(bash('git push'))
  await $.turn.complete(done('t1'))
  const rows = await turnEnd($)
  expect(rows[0]).toBe('Baked for 183s')
  expect(rows[1]).toMatch(/^Swolomon: Your agent did push-ups, .+\. Chest to the floor, I hope\.$/)
})

test('a short turn, or nothing he recognised: no line', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.tool.call(bash('git push'))
  await $.turn.complete(done('t1', 20_000))
  expect(await turnEnd($, 20_000)).toEqual(['Baked for 20s'])
  await $.turn.start({ text: 'go', turnId: 't2' })
  await $.tool.call(bash('ls'))
  await $.turn.complete(done('t2'))
  expect(await turnEnd($)).toEqual(['Baked for 183s'])
})

test('a denied call did nothing: no reading of it', OPTIONS, async ($, on) => {
  on('tool.call', { tool: 'Bash' }, () => ({ deny: 'not now' }))
  world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.tool.call(bash('git push'))
  await $.turn.complete(done('t1'))
  expect(await turnEnd($)).toEqual(['Baked for 183s'])
})

test('with sets done that turn, the set count and his reading together', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  await $.tool.call({ tool: 'Read', file_path: '/x' } as never)
  await $.turn.complete(done('t1'))
  const rows = await turnEnd($)
  expect(rows[0]).toBe(`Baked for 183s · ${line('turn-sets', { day: TODAY, sets: '1 set' })} 💪`)
  expect(rows[1]).toMatch(/^Swolomon: Your agent read a fitness magazine/)
})
