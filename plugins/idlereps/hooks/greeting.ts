/**
 * Swolomon notices you (owner, 2026-10-03: "making swolomon adorable and likeable and fun and a real person"):
 * the first session of a day, he says hello like someone who was here the whole time. Back after a couple
 * of days, he missed you; after a week or more, your spot is still warm; the day after, how yesterday went,
 * you and your agent both. Never guilt: a day off is a day off. Pure.
 */

import type { LineId } from './copy'
import { formatDuration } from './worktime'

export type GreetingFacts = {
  /** The local day of the last session before this one; undefined before the first. */
  lastSeenOn: number | undefined
  today: number
  /** Sets, reminders logged, stretches: anything moved, yesterday. */
  movedYesterday: number
  /** The agent's working time yesterday. */
  workedYesterdayMs: number
}

/** A week or more away is a long one. */
export const LONG_AWAY_DAYS = 7
/** Less agent time than this yesterday is not worth a word. */
const WORKED_ENOUGH_MS = 10 * 60_000

export type Greeting = { id: LineId; ctx: Record<string, string | number> }

/** The day's hello, or null: the first session ever (the introduction has that), the same day, or a quiet yesterday. */
export function greetingOf(facts: GreetingFacts): Greeting | null {
  const { lastSeenOn, today } = facts
  if (lastSeenOn === undefined || lastSeenOn >= today) return null
  const away = today - lastSeenOn
  if (away >= LONG_AWAY_DAYS) return { id: 'greet-long-away', ctx: {} }
  if (away >= 2) return { id: 'greet-missed', ctx: { n: away } }
  const worked = facts.workedYesterdayMs >= WORKED_ENOUGH_MS ? formatDuration(facts.workedYesterdayMs) : null
  if (facts.movedYesterday > 0 && worked !== null) return { id: 'greet-yesterday', ctx: { n: facts.movedYesterday, worked } }
  if (facts.movedYesterday > 0) return { id: 'greet-yesterday-moved', ctx: { n: facts.movedYesterday } }
  if (worked !== null) return { id: 'greet-yesterday-agent', ctx: { worked } }
  return null
}
