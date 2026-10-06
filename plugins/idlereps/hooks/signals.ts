/**
 * Telling that the agent is on a long task, early, from what it is doing: the cue's timing and which
 * reason line opens it both come from here (D21). Pure: the hooks feed it facts and act on the answer.
 */

import type { LongTaskReason } from '../types'
import { LONG_CALL_MS } from './durations'

export type { LongTaskReason }

/** A strong sign shows the cue this soon after it (the gap and every other rule still apply). */
export const STRONG_SIGN_DELAY_MS = 5_000
/** A big request alone shortens the turn's wait to this. */
export const BIG_ASK_WAIT_MS = 20_000
/** A single tool call running this long is a strong sign. */
export const SLOW_STEP_MS = 20_000
/** This many tool calls in one turn is a strong sign. */
export const BUSY_TOOL_CALLS = 8

/** Tools that hand work to helpers: the turn will run a while. */
const HELPER_TOOLS = new Set(['Agent', 'Task', 'Workflow'])

/** Commands that run test suites, builds and installs: long by nature. */
const LONG_COMMAND =
  /\b(?:(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?(?:test|build|install|ci|e2e|typecheck|lint)|npx\s+(?:-y\s+)?(?:vitest|jest|playwright|tsc|eslint|next\s+build)|pytest|tox|cargo\s+(?:build|test|check)|go\s+(?:build|test)|make|cmake|docker\s+(?:build|compose)|xcodebuild|gradle|gradlew|mvn|swift\s+(?:build|test)|rspec|terraform\s+(?:plan|apply)|pip\s+install|poetry\s+install|bundle\s+install)\b/

/** Words that usually mean a big job. */
const BIG_ASK_WORDS =
  /\b(?:implement|refactor|migrate|rewrite|redesign|build out|port|upgrade|add tests|write tests|fix (?:all|every)|audit|overhaul)\b/i

/** A Bash timeout the model raised this high says it expects a long command. */
export const LONG_TIMEOUT_MS = 120_000
/** A to-do list this long says the agent planned a multi-step job. */
export const PLANNED_TODOS = 4
/** The third task created in one turn says the same. */
export const PLANNED_TASKS = 3

/** What a tool call says about the turn's length: its name and the inputs that carry a hint. */
export type ToolFacts = {
  tool: string
  /** Bash. */
  command?: string
  /** Bash: the timeout the model chose, in ms. */
  timeoutMs?: number
  /** ScheduleWakeup: how long the agent will sleep, in seconds. */
  delaySeconds?: number
  /** TodoWrite: how many to-dos. */
  todos?: number
  /** TaskCreate: how many tasks this turn, this one included. */
  tasksThisTurn?: number
}

/** A strong sign of a long task: why, and how long the agent will be away when the agent said so. */
export type Sign = { reason: LongTaskReason; waitMs?: number }

/** The facts a tool call's input carries, read defensively (inputs are the model's). */
export function factsOf(tool: string, input: Record<string, unknown>, tasksThisTurn: number): ToolFacts {
  const num = (key: string) => (typeof input[key] === 'number' && Number.isFinite(input[key]) ? (input[key] as number) : undefined)
  const facts: ToolFacts = { tool }
  if (typeof input.command === 'string') facts.command = input.command
  const timeoutMs = num('timeout')
  if (timeoutMs !== undefined) facts.timeoutMs = timeoutMs
  const delaySeconds = num('delaySeconds')
  if (delaySeconds !== undefined) facts.delaySeconds = delaySeconds
  if (Array.isArray(input.todos)) facts.todos = input.todos.length
  if (tool === 'TaskCreate') facts.tasksThisTurn = tasksThisTurn
  return facts
}

/**
 * The strong sign a tool call gives, if any. `callsThisTurn` includes this call. `expectedMs`, what the call
 * is expected to take (hooks/durations.ts), settles a command: long when it is, whatever its family.
 */
export function toolSign(facts: ToolFacts, callsThisTurn: number, expectedMs?: number): Sign | null {
  const { tool } = facts
  if (HELPER_TOOLS.has(tool)) return { reason: 'helpers' }
  // The agent said how long it will be away: the only exact wait there is.
  if (tool === 'ScheduleWakeup' && facts.delaySeconds !== undefined && facts.delaySeconds > 0) {
    return { reason: 'waiting', waitMs: Math.min(3600, Math.max(60, facts.delaySeconds)) * 1000 }
  }
  if (tool === 'Monitor') return { reason: 'waiting' }
  if (tool === 'Bash' && expectedMs !== undefined && expectedMs >= LONG_CALL_MS) return { reason: 'long-run', waitMs: expectedMs }
  if (tool === 'Bash' && expectedMs === undefined && facts.command !== undefined && LONG_COMMAND.test(facts.command)) return { reason: 'long-run' }
  if (tool === 'Bash' && (facts.timeoutMs ?? 0) >= LONG_TIMEOUT_MS) return { reason: 'long-run' }
  if (tool === 'TodoWrite' && (facts.todos ?? 0) >= PLANNED_TODOS) return { reason: 'planned' }
  if (tool === 'TaskCreate' && (facts.tasksThisTurn ?? 0) >= PLANNED_TASKS) return { reason: 'planned' }
  if (callsThisTurn >= BUSY_TOOL_CALLS) return { reason: 'busy' }
  return null
}

/** What a finished tool call achieved, worth a word when the turn ends: tests run green or red, work committed, a PR opened. */
export type Outcome = 'tests-pass' | 'tests-fail' | 'commit' | 'pr'

/** Commands that run a test suite. */
export const TEST_COMMAND =
  /\b(?:(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?test|npx\s+(?:-y\s+)?(?:vitest|jest|playwright\s+test|mocha)|vitest|jest|pytest|tox|cargo\s+(?:test|nextest)|go\s+test|swift\s+test|rspec|phpunit|mix\s+test|dotnet\s+test|plugin\s+test)\b/

/** What a Bash call's result says happened. `gitOperation` is the engine's own reading of the command. */
export type CallResult = { isError: boolean; commit?: boolean; pr?: boolean }

/** The outcome of a finished tool call, if it is one worth reacting to. */
export function outcomeOf(facts: ToolFacts, result: CallResult): Outcome | null {
  if (facts.tool !== 'Bash') return null
  if (!result.isError && result.pr === true) return 'pr'
  if (!result.isError && result.commit === true) return 'commit'
  if (facts.command !== undefined && TEST_COMMAND.test(facts.command)) return result.isError ? 'tests-fail' : 'tests-pass'
  return null
}

/** The turn's outcome so far and a new one: a PR outranks a commit, which outranks tests; the latest test run counts. */
export function turnOutcome(so: Outcome | undefined, next: Outcome): Outcome {
  const rank = (o: Outcome | undefined) => (o === 'pr' ? 3 : o === 'commit' ? 2 : o === undefined ? 0 : 1)
  return rank(next) >= rank(so) ? next : (so as Outcome)
}

/** A wait as people say it: "about a minute", "about 5 min", "about an hour". */
export function waitWords(ms: number): string {
  const minutes = Math.round(ms / 60_000)
  if (minutes <= 1) return 'about a minute'
  if (minutes >= 55) return 'about an hour'
  return `about ${minutes} min`
}

/** A long request, or one with big-job words: a weaker sign that only shortens the warm-up. */
export const isBigAsk = (text: string): boolean => text.length >= 400 || BIG_ASK_WORDS.test(text)
