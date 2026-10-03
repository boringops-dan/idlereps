/**
 * Copyright 2026 zrobok. All rights reserved: not covered by the Apache License (see NOTICE). Swolomon's
 * name, character, likeness and these frames are proprietary.
 *
 * Swolomon's portrait (plan §1.11): a 16 × 16 pixel bust (laurel, beard, grin, tank top), the same bust in
 * profile walking, and a 6 × 6 mini head, one palette character per pixel. `approved` is the owner's switch: false draws no portrait anywhere
 * and every band falls back to the text-only name tag. Pure data.
 */

export type FrameName = 'idle' | 'talkA' | 'talkB' | 'blink' | 'flex' | EntranceFrameName
/** The entrance's own frames (§1.11 Entrance): walking past in profile, then the double take. */
export type EntranceFrameName = 'walkA' | 'walkB' | 'notice'
export type MiniFrameName = 'miniIdle' | 'miniTalkA' | 'miniTalkB' | 'miniBlink'

export type Sprite = {
  approved: boolean
  width: number
  height: number
  miniSize: number
  /** One character per colour, `0xRRGGBB`; null is transparent (the terminal's own background). */
  palette: Record<string, number | null>
  frames: Record<FrameName | MiniFrameName, readonly string[]>
}

const IDLE = [
  '................',
  '.....hhhhhh.....',
  '..g.hhhhhhhh.g..',
  '.gGgGgGggGgGgGg.',
  '...ssssssssss...',
  '...shhsssshhs...',
  '...ssksssskss...',
  '...ssssSSssss...',
  '...hssssssssh...',
  '...hhwwwwwwhh...',
  '....hhhhhhhh....',
  '.....hhhhhh.....',
  '..sSssssssssSs..',
  '.ssstTssssTtsss.',
  'sSssttttttttssSs',
  'sSssttTttTttssSs',
] as const

/** A frame that differs from `base` only in the rows given. */
const withRows = (base: readonly string[], rows: Record<number, string>): string[] => base.map((row, i) => rows[i] ?? row)

/** In profile, facing right, mid-stride; walkB swings the arm through. */
const WALK_A = [
  '................',
  '....hhhhhhh.....',
  '...hhhhhhhhhg...',
  '..gGgGgGgGgGgg..',
  '..hhhhsssssss...',
  '..hhhhsssshhs...',
  '..hhSSssssskss..',
  '..hhhSssssssss..',
  '...hhsssssSsss..',
  '...hhhhhhhwwwh..',
  '....hhhhhhhhhh..',
  '.....hhhhhhhh...',
  '......sSsss.....',
  '....sstTtttts...',
  '...sSsttTtttss..',
  '...sSsttTtttsss.',
] as const

const MINI_IDLE = ['.hhhh.', 'gGgGgG', 'skssks', 'ssSSss', 'hwwwwh', '.hhhh.'] as const

export const SPRITE: Sprite = {
  approved: true,
  width: 16,
  height: 16,
  miniSize: 6,
  palette: {
    '.': null,
    g: 0xfad048, // laurel gold
    G: 0xbe8e1c, // laurel shade
    h: 0x3e2618, // hair, brows, beard
    s: 0xf0ba92, // skin
    S: 0xcd8c68, // skin shade
    k: 0x18161e, // eyes
    w: 0xffffff, // teeth
    m: 0x80222c, // open mouth
    t: 0x28a89e, // tank top
    T: 0x18706a, // tank shade
    // His moves' (moves.ts): shorts, iron, the band and a sweat drop.
    n: 0x2c3a6e, // shorts
    i: 0x3a3e48, // iron plates
    I: 0x9aa0b0, // bars and handles
    r: 0xd8443c, // resistance band, hearts, the flush of effort
    b: 0x6cc4f0, // sweat
  },
  frames: {
    idle: IDLE,
    talkA: withRows(IDLE, { 9: '...hhwmmmmwhh...' }),
    talkB: withRows(IDLE, { 10: '....hhmmmmhh....' }),
    blink: withRows(IDLE, { 6: '...ssSssssSss...' }),
    // A wink, the widest grin, and a sparkle either side: for wins.
    flex: withRows(IDLE, {
      0: '.g............g.',
      1: 'ggg..hhhhhh..ggg',
      2: '.gg.hhhhhhhh.gg.',
      6: '...ssSsssskss...',
      9: '...hwwwwwwwwh...',
    }),
    walkA: WALK_A,
    walkB: withRows(WALK_A, { 13: '...sSstTtttts...', 14: '..sSsstTtttts...', 15: '..sSssttTtttts..' }),
    // Facing us, brows up, mouth a small o: noticing someone is there.
    notice: withRows(IDLE, { 4: '...shhsssshhs...', 5: '...ssssssssss...', 9: '...hhhhmmhhhh...' }),
    miniIdle: MINI_IDLE,
    miniTalkA: withRows(MINI_IDLE, { 4: 'hwmmwh' }),
    miniTalkB: withRows(MINI_IDLE, { 4: 'hmmmmh', 5: '.hmmh.' }),
    miniBlink: withRows(MINI_IDLE, { 2: 'sSssSs' }),
  },
}
