/**
 * A celebration after every set done (owner, 2026-10-06: "celebrations after every set, high fives, good
 * jobs, head pats, confetti, every single stereotypical thing you can think of and then 10 more" · "hi five,
 * low five, side five, TOO SLOW" · "gimme ten, gimme 7"). Pure.
 *
 * Offered ones: he holds out a hand (the `-offer` gesture) and `1` takes it (the contact gesture). Shown
 * ones: he just does it, at you, and `1` is still a high five. About one offered five in six, the first
 * press gets his hand whipped away (too slow) and the second lands it.
 */

import type { LineId } from './copy'
import { hashUnit } from './portrait'
import type { BandSpec } from '../types'

export type Celebration = {
  id: string
  /** `offer`: he holds it out and waits for 1; `show`: he does it at once. */
  kind: 'offer' | 'show'
  /** The button that takes it (offered); the shown ones keep the plain High five. */
  label?: string
  /** His line as it starts: holding it out, or doing it. */
  line: LineId
  /** His line once it lands (offered only). */
  landed?: LineId
  /** A five: can be too slow. */
  isFive?: true
}

export const CELEBRATIONS: readonly Celebration[] = [
  { id: 'high-five', kind: 'offer', label: 'High five', line: 'cel-high-five', landed: 'high-five', isFive: true },
  { id: 'low-five', kind: 'offer', label: 'Low five', line: 'cel-low-five', landed: 'cel-low-five-landed', isFive: true },
  { id: 'side-five', kind: 'offer', label: 'Side five', line: 'cel-side-five', landed: 'cel-side-five-landed', isFive: true },
  { id: 'gimme-ten', kind: 'offer', label: 'Gimme ten', line: 'cel-gimme-ten', landed: 'cel-gimme-ten-landed', isFive: true },
  { id: 'gimme-seven', kind: 'offer', label: 'Gimme seven', line: 'cel-gimme-seven', landed: 'cel-gimme-seven-landed', isFive: true },
  { id: 'air-five', kind: 'offer', label: 'Air five', line: 'cel-air-five', landed: 'cel-air-five-landed', isFive: true },
  { id: 'fist-bump', kind: 'offer', label: 'Fist bump', line: 'cel-fist-bump', landed: 'cel-fist-bump-landed' },
  { id: 'elbow-bump', kind: 'offer', label: 'Elbow bump', line: 'cel-elbow-bump', landed: 'cel-elbow-bump-landed' },
  { id: 'chest-bump', kind: 'offer', label: 'Chest bump', line: 'cel-chest-bump', landed: 'cel-chest-bump-landed' },
  { id: 'head-pat', kind: 'offer', label: 'Lean in', line: 'cel-head-pat', landed: 'cel-head-pat-landed' },
  { id: 'secret-handshake', kind: 'offer', label: 'Handshake', line: 'cel-secret-handshake', landed: 'cel-secret-handshake-landed' },
  { id: 'pinky-swear', kind: 'offer', label: 'Pinky swear', line: 'cel-pinky-swear', landed: 'cel-pinky-swear-landed' },
  { id: 'confetti', kind: 'show', line: 'cel-confetti' },
  { id: 'slow-clap', kind: 'show', line: 'cel-slow-clap' },
  { id: 'golf-clap', kind: 'show', line: 'cel-golf-clap' },
  { id: 'thumbs-up', kind: 'show', line: 'cel-thumbs-up' },
  { id: 'salute', kind: 'show', line: 'cel-salute' },
  { id: 'bow', kind: 'show', line: 'cel-bow' },
  { id: 'point', kind: 'show', line: 'cel-point' },
  { id: 'happy-feet', kind: 'show', line: 'cel-happy-feet' },
  { id: 'mic-drop', kind: 'show', line: 'cel-mic-drop' },
  { id: 'raise-roof', kind: 'show', line: 'cel-raise-roof' },
  { id: 'chefs-kiss', kind: 'show', line: 'cel-chefs-kiss' },
  { id: 'fireworks', kind: 'show', line: 'cel-fireworks' },
]

/** One in this many offered fives is too slow, the first time. */
export const TOO_SLOW_ODDS = 6

/** The set's celebration: the same for the same record (redraws and tests agree), varied set to set. */
export function celebrationFor(undoId: number): Celebration {
  return CELEBRATIONS[Math.floor(hashUnit(undoId) * CELEBRATIONS.length)] ?? HIGH_FIVE
}

/** Whether this record's five gets pulled away the first time. */
export function isTooSlow(celebration: Celebration, undoId: number): boolean {
  return celebration.isFive === true && hashUnit(undoId * 7 + 3) < 1 / TOO_SLOW_ODDS
}

/** The high five: a new best's, always. */
export const HIGH_FIVE: Celebration = CELEBRATIONS[0]!

export const celebrationById = (id: string): Celebration | undefined => CELEBRATIONS.find(c => c.id === id)

/** The gesture he plays: the hand held out while offered, the contact once landed, the thing itself when shown. */
export function gestureOf(celebration: Celebration, stage: CelebrationStage): string {
  if (stage === 'dodged') return 'too-slow'
  if (celebration.kind === 'offer' && stage === 'offered') return `${celebration.id}-offer`
  return celebration.id
}

/** Where a logged band's celebration is: held out, pulled away (too slow), landed, or just done (shown). */
type CelebrationStage = NonNullable<BandSpec['celebration']>['stage']
