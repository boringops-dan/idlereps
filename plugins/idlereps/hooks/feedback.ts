/**
 * Feedback (plan §1.6): `/workout feedback <text>` and the one-time check-in. Both are the person's own
 * explicit answers, so neither depends on the telemetry option. Pure: what each sends to `FEEDBACK_URL`.
 */

/** The most characters the endpoint keeps; longer text is cut and the reply says so. */
export const FEEDBACK_MAX = 2000

/** The check-in's answers, as the endpoint stores them: the buttons' own ids. */
export type PulseAnswer = 'love' | 'fine' | 'notforme'

export type FeedbackContext = { installId: string; pluginVersion: string; surface: string }

/** Text cut to the limit in characters (not UTF-16 units, as the endpoint counts them). */
export function cutFeedback(text: string): { text: string; isCut: boolean } {
  const chars = [...text]
  return { text: chars.slice(0, FEEDBACK_MAX).join(''), isCut: chars.length > FEEDBACK_MAX }
}

/** The JSON a piece of feedback POSTs. */
export const feedbackPayload = (body: { kind: 'feedback'; text: string } | { kind: 'pulse'; answer: PulseAnswer }, ctx: FeedbackContext) => ({ ...body, ...ctx })
