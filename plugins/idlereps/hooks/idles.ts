/**
 * His idle animations (owner, 2026-10-12: "He also needs like 100 more idle animations to keep it fun"): what
 * he gets up to between lines while the agent works, from the first day, never collected (the collection is
 * moves.ts MOVES). Played as one of his idle beats (portrait.ts). Pure data.
 */

import { IDLES_A } from './idles-a'
import { IDLES_B } from './idles-b'
import { IDLES_C } from './idles-c'
import { IDLES_D } from './idles-d'
import type { Move } from './moves'

export const IDLES: readonly Move[] = [...IDLES_A, ...IDLES_B, ...IDLES_C, ...IDLES_D]
