/**
 * Asks sized to the wait (owner, 2026-10-03: "keeping our eye on being a light workout prompter for exercise
 * while coding"): how long the agent will likely be away, and so what fits. A quick turn gets a quick one, a
 * long build gets a walk. From the agent's own word when it gave one (a wake-up time), a strong sign of a
 * long task, or how long this person's turns usually run. Pure.
 */

import type { LongTaskReason } from '../types'

export type WaitSize = 'quick' | 'set' | 'long'

/** Turns kept to learn from. */
export const TURN_LENGTHS_KEPT = 30
/** Only turns this long count: shorter ones never ask anything. */
export const TURN_COUNTS_MS = 30_000
/** Fewer turns than this and the history says nothing yet. */
const ENOUGH_TURNS = 5
/** Under this, a quick one; from LONG_MS, a long one; between, a set. */
export const QUICK_MS = 150_000
export const LONG_MS = 360_000
/** What a strong sign of a long task is taken to mean, when it does not say how long. */
const LONG_REASONS: ReadonlySet<LongTaskReason> = new Set(['helpers', 'long-run', 'planned', 'waiting'])

export type WaitFacts = {
  /** The agent said how long (ScheduleWakeup). */
  signWaitMs?: number
  reason?: LongTaskReason
  /** Recent turn lengths, ms, oldest first. */
  recent: readonly number[]
  /** How long this turn has run. */
  elapsedMs: number
  /** What the slowest call still running is expected to take yet (hooks/durations.ts): the turn lasts at least that. */
  callWaitMs?: number
}

/** The recent turns to keep, with one more. */
export const keptTurns = (recent: readonly number[], ms: number): number[] =>
  ms < TURN_COUNTS_MS ? [...recent] : [...recent, Math.round(ms)].slice(-TURN_LENGTHS_KEPT)

const median = (xs: readonly number[]) => {
  const sorted = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? (sorted[mid] ?? 0) : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
}

/** How much longer the agent is likely to be away, ms; null when there is nothing to go on. */
export function expectedWaitMs(facts: WaitFacts): number | null {
  if (facts.signWaitMs !== undefined) return Math.max(facts.signWaitMs, facts.callWaitMs ?? 0)
  const counted = facts.recent.filter(ms => ms >= TURN_COUNTS_MS)
  // A turn that has outrun the usual is likely longer still: at least another minute.
  const usual = counted.length >= ENOUGH_TURNS ? Math.max(60_000, median(counted) - facts.elapsedMs) : null
  const guess = facts.reason !== undefined && LONG_REASONS.has(facts.reason) ? Math.max(LONG_MS, usual ?? 0) : usual
  // A call still running sets the least it can be.
  return facts.callWaitMs === undefined ? guess : Math.max(guess ?? 0, facts.callWaitMs)
}

/** What fits a wait: unknown is a set, as before. */
export function waitSize(ms: number | null): WaitSize {
  if (ms === null) return 'set'
  if (ms < QUICK_MS) return 'quick'
  return ms >= LONG_MS ? 'long' : 'set'
}
