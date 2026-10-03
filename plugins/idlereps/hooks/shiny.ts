/**
 * The shiny Swolomon (owner, 2026-10-03: "people screenshot rare things"): about one band in a hundred, he
 * shows up recoloured: a golden glow, a royal tank, a diamond laurel. Nothing else changes. Pure.
 */

/** One band in this many. */
export const SHINY_ODDS = 100

/** Whether a band placed at `ms` is a shiny one: about one in SHINY_ODDS, the same for the same moment. */
export const isShinyAt = (ms: number): boolean => (Math.imul(Math.floor(ms / 1000) + 7, 2654435761) >>> 0) % SHINY_ODDS === 0

/** His colours (swolomon-sprite.ts palette) to the shiny ones. */
export const SHINY_COLOURS: ReadonlyMap<number, number> = new Map([
  [0xfad048, 0x8ef0ff], // laurel: diamond
  [0xbe8e1c, 0x3cb4d8],
  [0x3e2618, 0xfff1b8], // hair and beard: platinum
  [0xf0ba92, 0xf6d36b], // skin: golden
  [0xcd8c68, 0xd4a536],
  [0x28a89e, 0xa84ad8], // tank: royal
  [0x18706a, 0x6e2a94],
  [0x2c3a6e, 0x1c1c24], // shorts: black tie
])
