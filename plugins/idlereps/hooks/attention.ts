/**
 * Reading the room (owner, 2026-10-03: "what is the big thing that we're missing"): one budget for all of
 * Swolomon's extras, the things he says or does unasked beyond the workout itself (his hello, a new gym, his
 * prep news, a question, spot me), and how many asides a waiting band gets. Each band he raises unasked is
 * answered or ignored; ignored often, he goes quieter; answered, he is livelier. The person's setting comes
 * first: Quiet is the workout and nothing else, Chatty is all of him. Answers to what they did (a set
 * logged, a high five) are never extras. Pure.
 */

export type Chat = 'adaptive' | 'chatty' | 'quiet'

/** Store key `attention`: the last answered (1) or ignored (0) bands, oldest first; the extras spent today. */
export type Attention = { outcomes: (0 | 1)[]; day: number; spent: number }

export const OUTCOMES_KEPT = 20
/** Fewer outcomes than this and he assumes the middle. */
const ENOUGH_OUTCOMES = 3
export const START_ATTENTION: Attention = { outcomes: [], day: 0, spent: 0 }

/** How engaged they are, 0 to 1: the share of his bands answered lately; a half until there is enough to go on. */
export function engagementOf(outcomes: readonly (0 | 1)[]): number {
  if (outcomes.length < ENOUGH_OUTCOMES) return 0.5
  return outcomes.reduce<number>((sum, n) => sum + n, 0) / outcomes.length
}

/** Extras a day: none when Quiet, eight when Chatty; adaptive, one to six by engagement (four to start). */
export function extrasCap(chat: Chat, engagement: number): number {
  if (chat === 'quiet') return 0
  if (chat === 'chatty') return 8
  return Math.min(6, Math.max(1, Math.round(1 + 5 * engagement)))
}

/** Asides a waiting band gets: none when Quiet or ignored lately, two when lukewarm, all five otherwise. */
export function asidesAllowed(chat: Chat, engagement: number): number {
  if (chat === 'quiet') return 0
  if (chat === 'chatty' || engagement >= 0.5) return 5
  return engagement >= 0.25 ? 2 : 0
}

/** One band he raised unasked, answered or not. */
export const recordOutcome = (attention: Attention, answered: boolean): Attention => ({
  ...attention,
  outcomes: [...attention.outcomes, answered ? (1 as const) : (0 as const)].slice(-OUTCOMES_KEPT),
})

/** An extra wanted today: allowed while the day's cap lasts, and spent if so. */
export function spend(attention: Attention, day: number, cap: number): { attention: Attention; allowed: boolean } {
  const spent = attention.day === day ? attention.spent : 0
  if (spent >= cap) return { attention: { ...attention, day, spent }, allowed: false }
  return { attention: { ...attention, day, spent: spent + 1 }, allowed: true }
}
