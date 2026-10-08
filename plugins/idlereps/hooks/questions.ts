/**
 * Swolomon gets to know you (owner, 2026-10-03: "a real person"): now and then, while the agent works and no
 * set is due, a one-tap question; weeks later he brings the answer up, once a day at most, as an aside. Pure:
 * the questions, his reply to each answer, the answers kept, and which recall comes when.
 */

import type { LineId } from './copy'

export type Question = { id: string; ask: LineId; options: readonly string[]; reply: readonly LineId[]; recall: readonly LineId[] }

/** In the order he asks them. Each option has its reply (said right away) and its recall line, at the same index. */
export const QUESTIONS: readonly Question[] = [
  { id: 'owl', ask: 'ask-owl', options: ['Morning', 'Night owl', 'Depends'], reply: ['reply-owl-morning', 'reply-owl-night', 'reply-owl-depends'], recall: ['recall-owl-morning', 'recall-owl-night', 'recall-owl-depends'] },
  { id: 'why', ask: 'ask-why', options: ['Feel better', 'Get strong', 'Sore back', 'Just curious'], reply: ['reply-why-better', 'reply-why-strong', 'reply-why-back', 'reply-why-curious'], recall: ['recall-why-better', 'recall-why-strong', 'recall-why-back', 'recall-why-curious'] },
  { id: 'pet', ask: 'ask-pet', options: ['Dogs', 'Cats', 'Both', 'Neither'], reply: ['reply-pet-dogs', 'reply-pet-cats', 'reply-pet-both', 'reply-pet-neither'], recall: ['recall-pet-dogs', 'recall-pet-cats', 'recall-pet-both', 'recall-pet-neither'] },
  { id: 'music', ask: 'ask-music', options: ['Loud', 'Lo-fi', 'Podcasts', 'Silence'], reply: ['reply-music-loud', 'reply-music-lofi', 'reply-music-podcasts', 'reply-music-silence'], recall: ['recall-music-loud', 'recall-music-lofi', 'recall-music-podcasts', 'recall-music-silence'] },
  { id: 'snack', ask: 'ask-snack', options: ['Sweet', 'Salty', 'Fruit', 'Coffee'], reply: ['reply-snack-sweet', 'reply-snack-salty', 'reply-snack-fruit', 'reply-snack-coffee'], recall: ['recall-snack-sweet', 'recall-snack-salty', 'recall-snack-fruit', 'recall-snack-coffee'] },
]

/** The answers kept (store key `about`): an option's index, or 'pass' (asked, not answered: never asked again). */
export type About = Record<string, number | 'pass'>

/** The answer buttons' ids, by option index; then Pass. */
export const ANSWER_IDS = ['a', 'b', 'c', 'd'] as const

/** The next question not yet asked, if any. */
export const nextQuestion = (about: About): Question | undefined => QUESTIONS.find(q => about[q.id] === undefined)

/** The recall for a day: one of the answered questions, in turn; none until something is answered. */
export function recallFor(about: About, day: number): LineId | undefined {
  const answered = QUESTIONS.flatMap(q => {
    const answer = about[q.id]
    return typeof answer === 'number' && q.recall[answer] !== undefined ? [q.recall[answer]] : []
  })
  return answered.length === 0 ? undefined : answered[((day % answered.length) + answered.length) % answered.length]
}
