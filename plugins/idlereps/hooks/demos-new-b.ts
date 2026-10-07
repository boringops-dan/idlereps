/**
 * Copyright 2026 zrobok. All rights reserved: not covered by the Apache License (see NOTICE). Swolomon's
 * name, character, likeness and these moves are proprietary.
 *
 * Exercise demos (owner, 2026-10-06: "add 50 more workouts"): moves of family 'exercise' that he plays on a
 * set band for the exercise named, never collected. Each with its name patterns (matched before the general
 * ones in moves.ts) and its form cue (`form-<move id>`). Pure data, drawn by `figure.ts`.
 */

import type { LineEntry } from './copy'
import type { Move, MoveId } from './moves'

export const NEW_B_DEMOS: readonly Move[] = []

/** Exercise names to these demos, most specific first. */
export const NEW_B_DEMO_BY_NAME: readonly (readonly [RegExp, MoveId])[] = []

/** Each demo's form cue: Swolomon's voice, one {mate}, never the exercise's name. */
export const NEW_B_DEMO_LINES = [] as const satisfies readonly LineEntry[]
