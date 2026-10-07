/**
 * Copyright 2026 zrobok. All rights reserved: not covered by the Apache License (see NOTICE). Swolomon's
 * name, character, likeness and these moves are proprietary.
 *
 * More celebrations (owner, 2026-10-06: "add 50 more ... celebrations"): each a Celebration (celebrate.ts)
 * with its gestures (an offered one has `<id>-offer` and `<id>`), and its lines. Pure data.
 */

import type { Celebration } from './celebrate'
import type { LineEntry } from './copy'
import type { Move } from './moves'

export const MORE_CELEBRATIONS: readonly Celebration[] = []

/** Their gestures: not collected, played on the logged band. */
export const MORE_CELEBRATION_MOVES: readonly Move[] = []

export const MORE_CELEBRATION_LINES = [] as const satisfies readonly LineEntry[]
