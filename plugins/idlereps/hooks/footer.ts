/**
 * The prompt footer's extras beside today's tally (owner, 2026-10-07: "his eyes could be where the muscle
 * icon is and smaller and he should only show up when it's closer to time.. So like the time to next set can
 * be just 20m next to the dot and the muscle emoji?"): the time to the next set, and his eyes once it is near.
 * Pure.
 */

/** Under this long to the next set, or once it is ready, his eyes join the footer. */
export const EYES_NEAR_MS = 2 * 60_000

/** His eyes: open this long, then a blink this long (never quicker than a second). */
export const EYES_OPEN_MS = 5_000
export const EYES_BLINK_MS = 1_000

/**
 * His eyes blink while the agent works and this long after its turn ends; past that the person has stepped
 * away, so they rest open (no re-render every few seconds in a terminal nobody is looking at, times every
 * open window) until the next turn wakes them.
 */
export const EYES_AWAKE_MS = 10 * 60_000

/** Whether his eyes are still blinking: a turn running, or one that ended under `EYES_AWAKE_MS` ago. */
export function isAwake(opts: { isTurnRunning: boolean; turnEndedAt: number | undefined; now: number }): boolean {
  return opts.isTurnRunning || (opts.turnEndedAt !== undefined && opts.now - opts.turnEndedAt < EYES_AWAKE_MS)
}

/** Looking, and blinking. */
export const EYES = { open: '👀', blink: '😌' } as const

/**
 * What the footer says after the tally, whether his eyes show, and in how many ms that next changes (null:
 * only an event changes it). A set still to come: its time, whole minutes rounded up (`20m`, `1m`), or `ready`
 * once the gap is over; a reaction (hooks/reactions.ts) in its place while it lasts.
 */
export function footerOf(opts: { isUnderWay: boolean; nextCueAt: number | undefined; now: number; reaction?: { text: string; until: number } }): {
  when: string | undefined
  isNear: boolean
  changeIn: number | null
} {
  const { now } = opts
  const reaction = opts.reaction !== undefined && opts.reaction.until > now ? opts.reaction : undefined
  const set = opts.isUnderWay ? setTime(opts.nextCueAt, now) : { when: undefined, isNear: false, changeIn: null }
  if (reaction === undefined) return set
  const untilReactionEnds = reaction.until - now
  return { when: reaction.text, isNear: set.isNear, changeIn: set.changeIn === null ? untilReactionEnds : Math.min(set.changeIn, untilReactionEnds) }
}

function setTime(nextCueAt: number | undefined, now: number): { when: string; isNear: boolean; changeIn: number | null } {
  const left = (nextCueAt ?? 0) - now
  if (left <= 0) return { when: 'ready', isNear: true, changeIn: null }
  const toMinute = ((left - 1) % 60_000) + 1
  const isNear = left < EYES_NEAR_MS
  return { when: `${Math.ceil(left / 60_000)}m`, isNear, changeIn: isNear ? toMinute : Math.min(toMinute, left - EYES_NEAR_MS + 1) }
}

/** The footer label: his eyes (when near), the tally, and what follows it. */
export function footerLabel(tally: string, extras: { when: string | undefined; eyes: string | undefined }): string {
  return `${extras.eyes === undefined ? '' : `${extras.eyes} `}${tally}${extras.when === undefined ? '' : ` · ${extras.when}`}`
}
