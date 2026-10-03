/**
 * The punch card (owner, 2026-10-03: "rewards showing up, no streak to lose"): a stamp for each day anything
 * is moved; ten stamps and the card is full: a free protein shake, which Swolomon drinks for you, slowly,
 * while you watch. A missed day costs nothing. Pure.
 */

export const PUNCHES = 10

/** Store key `punchCard`: the days stamped on the card now, and the shakes earned so far. */
export type PunchCard = { days: number[]; shakes: number }

export const EMPTY_CARD: PunchCard = { days: [], shakes: 0 }

/** Moved on `day`: stamped (once a day); a full card is a shake, and a fresh card. */
export function stamp(card: PunchCard, day: number): { card: PunchCard; isFull: boolean } {
  if (card.days.includes(day)) return { card, isFull: false }
  const days = [...card.days, day]
  if (days.length < PUNCHES) return { card: { ...card, days }, isFull: false }
  return { card: { days: [], shakes: card.shakes + 1 }, isFull: true }
}
