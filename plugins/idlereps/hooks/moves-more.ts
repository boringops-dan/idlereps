/**
 * Copyright 2026 zrobok. All rights reserved: not covered by the Apache License (see NOTICE). Swolomon's
 * name, character, likeness and these moves are proprietary.
 *
 * More of his moves to collect (owner, 2026-10-06: "add 50 more ... Swolomon animations"): flexes and gags,
 * unlocked after the first 30 in this order, and played between his lines once collected. Pure data.
 */

import type { LineEntry } from './copy'
import type { Move } from './moves'

export const MORE_MOVES: readonly Move[] = []

/** The order they unlock in, after collection.ts's own. */
export const MORE_UNLOCK_ORDER: readonly string[] = []

export const MORE_MOVE_LINES = [] as const satisfies readonly LineEntry[]
