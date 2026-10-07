/**
 * He reacts as it happens (owner, 2026-10-06: "more Swolomon"): while your agent works, what its calls do
 * (tests green or red, its work locked in, a pull request, an install starting) gets a word from him, read
 * his way (a pull request is a personal record). On a band, as an aside; with nothing up, in the footer beside the tally. Once
 * per kind a turn, and never two close together. Pure.
 */

import type { LineId } from './copy'
import type { Outcome, ToolFacts } from './signals'

export type Reaction = Outcome | 'install'

export const REACTION_LINE: Readonly<Record<Reaction, LineId>> = {
  'tests-pass': 'live-tests-pass',
  'tests-fail': 'live-tests-fail',
  commit: 'live-commit',
  pr: 'live-pr',
  install: 'live-install',
}

/** Two reactions at least this far apart. */
export const REACTION_GAP_MS = 20_000
/** How long one shows in the footer. */
export const FOOTER_REACTION_MS = 4_000

/** Commands that install packages: his "loading plates". */
const INSTALL = /(?:^|&&|;|\|)\s*(?:sudo\s+)?(?:(?:npm|pnpm|yarn|bun)\s+(?:install|ci|i|add)\b|pip3?\s+install|uv\s+(?:sync|pip\s+install)|brew\s+install|cargo\s+install|bundle\s+install|pod\s+install|poetry\s+install|composer\s+install)/

/** A call about to run that is worth a word as it starts. */
export const startReaction = (facts: ToolFacts): Reaction | null => (facts.tool === 'Bash' && facts.command !== undefined && INSTALL.test(facts.command) ? 'install' : null)

/** Whether to react now: not this kind already this turn, and not within the gap of the last. */
export function mayReact(reaction: Reaction, said: ReadonlySet<Reaction>, lastAt: number | null, now: number): boolean {
  return !said.has(reaction) && (lastAt === null || now - lastAt >= REACTION_GAP_MS)
}
