/**
 * Swolomon's own training (owner, 2026-10-03: "a shared goal"): he is prepping for a competition, and every
 * set you do is a set of his prep. When the bar fills he goes and competes between your sessions, and comes
 * back the next time with gold, or now and then a gracious silver. Then the next one. Pure.
 */

export const COMPETITIONS = ['Regionals', 'Nationals', 'Worlds', 'the Galaxy Classic', 'the Universe Cup'] as const

/** Sets in one prep: about two weeks of showing up. */
export const PREP_SETS = 30

export type Medal = 'gold' | 'silver'

/** Store key `prep`: which competition, the total sets when its prep began, whether he is ready to go, the medals so far. */
export type Prep = { stage: number; from: number; isReady?: true; medals: Medal[] }

export const competitionOf = (stage: number): string => COMPETITIONS[stage % COMPETITIONS.length] ?? COMPETITIONS[0]

/** How it goes: gold, but every fourth from the second, silver; he takes it well. */
export const resultOf = (stage: number): Medal => (stage % 4 === 1 ? 'silver' : 'gold')

/** Sets into this prep, as far as the bar goes. */
export const prepSets = (prep: Prep, totalSets: number): number => Math.min(PREP_SETS, Math.max(0, totalSets - prep.from))

export type PrepNews = 'prep-start' | 'prep-halfway' | 'prep-ready'

/** The set his prep starts on: the second ever (the first has its own moment). */
export const PREP_STARTS_AT = 2

/**
 * A set done, `totalSets` now including it: the prep moved on, and anything worth saying. The second set
 * ever starts his prep for Regionals (that set counts); before it, no prep yet.
 */
export function afterSet(prep: Prep | undefined, totalSets: number): { prep?: Prep; news?: PrepNews } {
  if (prep === undefined) return totalSets < PREP_STARTS_AT ? {} : { prep: { stage: 0, from: totalSets - 1, medals: [] }, news: 'prep-start' }
  if (prep.isReady === true) return { prep }
  const sets = prepSets(prep, totalSets)
  if (sets >= PREP_SETS) return { prep: { ...prep, isReady: true }, news: 'prep-ready' }
  return sets === PREP_SETS / 2 ? { prep, news: 'prep-halfway' } : { prep }
}

/** He went and competed: the medal, and the next prep begun at `totalSets`. */
export function compete(prep: Prep, totalSets: number): { prep: Prep; medal: Medal; competition: string } {
  const medal = resultOf(prep.stage)
  return { prep: { stage: prep.stage + 1, from: totalSets, medals: [...prep.medals, medal] }, medal, competition: competitionOf(prep.stage) }
}
