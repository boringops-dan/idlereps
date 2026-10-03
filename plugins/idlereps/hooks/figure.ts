/**
 * Copyright 2026 zrobok. All rights reserved: not covered by the Apache License (see NOTICE). Swolomon's
 * name, character, likeness and these drawings are proprietary.
 *
 * Swolomon's whole body, for his moves (§1.11 Moves): a 16 × 16 chibi drawn from joints, so one pose is a
 * handful of points and every pose shares the same head, build and colours. Each part is a capsule (every
 * pixel within half its width of a segment), painted back to front. Pure; the output is a sprite frame's
 * rows of palette characters.
 */

export type P = readonly [number, number]
export type Facing = 'front' | 'right' | 'left'
export type Expr = 'grin' | 'strain' | 'blink' | 'wink' | 'o' | 'sleep' | 'talk' | 'smirk'

/** A limb through its joints, e.g. shoulder → elbow → hand. */
export type Limb = readonly P[]

export type Prop =
  | { kind: 'dumbbell'; at: P; upright?: boolean }
  | { kind: 'barbell'; at: P; half: number }
  | { kind: 'kettlebell'; at: P }
  | { kind: 'bar'; y: number }
  | { kind: 'band'; from: P; to: P }
  | { kind: 'shake'; at: P }
  | { kind: 'trophy'; at: P }
  | { kind: 'laurel'; at: P }
  | { kind: 'mat'; y: number }
  | { kind: 'chair'; at: P }
  | { kind: 'wall'; x: number }

export type Fx = { kind: 'sweat' | 'sparkle' | 'zzz' | 'heart' | 'note' | 'star' | 'puff' | 'drop'; at: P }

export type Figure = {
  /** `bare`: the laurel is off his head (he is holding it, or it is in the air). */
  head?: { at: P; facing: Facing; expr?: Expr; bare?: boolean }
  /** Neck to hip; `width` across (6 standing front-on, 4 in profile). */
  torso?: { from: P; to: P; width?: number }
  /** Hip to just above the legs, in shorts. */
  shorts?: { from: P; to: P; width?: number }
  /** Back limbs are painted behind the torso, front ones over it. */
  backArm?: Limb
  frontArm?: Limb
  backLeg?: Limb
  frontLeg?: Limb
  /** A bulge on an arm's upper half: the bicep, flexed. */
  bicep?: readonly P[]
  props?: readonly Prop[]
  fx?: readonly Fx[]
}

export const SIZE = 16

type Grid = string[][]

const blank = (): Grid => Array.from({ length: SIZE }, () => new Array<string>(SIZE).fill('.'))

function put(grid: Grid, x: number, y: number, c: string) {
  const row = grid[Math.round(y)]
  const ix = Math.round(x)
  if (row !== undefined && ix >= 0 && ix < SIZE) row[ix] = c
}

/** Every pixel whose centre is within `width / 2` of the segment a–b: round ends, or flat ones (`isFlat`). */
function capsule(grid: Grid, a: P, b: P, width: number, c: string, isFlat = false) {
  const r = width / 2
  const [ax, ay] = a
  const [bx, by] = b
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  for (let y = Math.floor(Math.min(ay, by) - r - 1); y <= Math.ceil(Math.max(ay, by) + r + 1); y += 1) {
    for (let x = Math.floor(Math.min(ax, bx) - r - 1); x <= Math.ceil(Math.max(ax, bx) + r + 1); x += 1) {
      const px = x + 0.5
      const py = y + 0.5
      const along = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2
      if (isFlat && (along < 0 || along > 1)) continue
      const t = Math.max(0, Math.min(1, along))
      const qx = ax + t * dx - px
      const qy = ay + t * dy - py
      if (qx * qx + qy * qy <= r * r + 0.01) put(grid, x, y, c)
    }
  }
}

function stamp(grid: Grid, rows: readonly string[], x: number, y: number) {
  rows.forEach((row, j) => [...row].forEach((c, i) => c !== '.' && put(grid, x + i, y + j, c)))
}

/** The head, 6 × 6 (the mini portrait's), front-on or in profile, with a face. */
const FRONT = ['.hhhh.', 'gGgGgG', 'skssks', 'ssSSss', 'hwwwwh', '.hhhh.']
const PROFILE = ['.hhhh.', 'gGgGgg', 'hhssks', 'hhsssS', '.hhwwh', '..hhh.']

const FACES: Record<Expr, Record<number, string>> = {
  grin: {},
  talk: { 4: 'hwmmwh' },
  strain: { 2: 'sSssSs', 4: 'hwwwwh', 3: 'rsSSsr' },
  blink: { 2: 'sSssSs' },
  wink: { 2: 'skssSs' },
  o: { 4: 'hhmmhh' },
  sleep: { 2: 'sSssSs', 4: 'hhhhhh' },
  smirk: { 4: 'hhhwwh' },
}
const PROFILE_FACES: Record<Expr, Record<number, string>> = {
  grin: {},
  talk: { 4: '.hhmmh' },
  strain: { 2: 'hhssSs', 3: 'hhsrsS', 4: '.hhwwh' },
  blink: { 2: 'hhssSs' },
  wink: { 2: 'hhssSs' },
  o: { 4: '.hhhmh' },
  sleep: { 2: 'hhssSs', 4: '.hhhhh' },
  smirk: { 4: '.hhhwh' },
}

const mirror = (rows: readonly string[]) => rows.map(row => [...row].reverse().join(''))

export function headRows(facing: Facing, expr: Expr = 'grin', bare = false): string[] {
  const base = facing === 'front' ? FRONT : PROFILE
  const face = (facing === 'front' ? FACES : PROFILE_FACES)[expr]
  const rows = base.map((row, i) => (i === 1 && bare ? (facing === 'front' ? 'hhhhhh' : 'hhhhhh') : (face[i] ?? row)))
  return facing === 'left' ? mirror(rows) : rows
}

/** A limb, its first segment (upper arm, thigh) thicker; a leg ends in a shoe, two pixels under the foot. */
function limb(grid: Grid, joints: Limb, skin: string, shoe: string | undefined, isSlim: boolean) {
  for (let i = 0; i + 1 < joints.length; i += 1) {
    const a = joints[i]
    const b = joints[i + 1]
    if (a !== undefined && b !== undefined) capsule(grid, a, b, i === 0 ? (isSlim ? 2 : 2.4) : isSlim ? 1.6 : 2, skin)
  }
  const end = joints.at(-1)
  if (shoe !== undefined && end !== undefined) {
    put(grid, end[0] - 0.5, end[1], shoe)
    put(grid, end[0] + 0.5, end[1], shoe)
  }
}

const PROPS: Record<Exclude<Prop['kind'], 'barbell' | 'bar' | 'band' | 'mat' | 'wall'>, readonly string[]> = {
  dumbbell: ['i.i', 'iIi', 'i.i'],
  kettlebell: ['.I.', 'I.I', 'iii', 'iii'],
  shake: ['b', 'w', 'w', 'w'],
  trophy: ['g.g.g', 'ggggg', '.ggg.', '..g..', '.GGG.'],
  laurel: ['gGgGgG'],
  chair: ['h....', 'h....', 'hhhhh', 'h...h', 'h...h'],
}

const FX: Record<Fx['kind'], readonly string[]> = {
  sweat: ['b', 'b'],
  drop: ['b'],
  sparkle: ['.g.', 'gwg', '.g.'],
  star: ['g'],
  zzz: ['www', '.w.', 'www'],
  heart: ['r.r', 'rrr', '.r.'],
  note: ['.w', '.w', 'ww'],
  puff: ['w.w', '.w.'],
}

function prop(grid: Grid, p: Prop) {
  switch (p.kind) {
    case 'barbell': {
      const [x, y] = p.at
      capsule(grid, [x - p.half, y], [x + p.half, y], 1, 'I')
      for (const side of [-1, 1]) for (let k = 0; k < 2; k += 1) capsule(grid, [x + side * (p.half - k), y - 1.2], [x + side * (p.half - k), y + 1.2], 1, 'i')
      return
    }
    case 'bar':
      capsule(grid, [0, p.y], [SIZE, p.y], 1, 'I')
      return
    case 'band':
      capsule(grid, p.from, p.to, 1, 'r')
      return
    case 'mat':
      capsule(grid, [0, p.y], [SIZE, p.y], 1, 'T')
      return
    case 'wall':
      capsule(grid, [p.x, 0], [p.x, SIZE], 1, 'I')
      return
    case 'dumbbell':
      stamp(grid, p.upright === true ? PROPS.dumbbell.map((_, i) => PROPS.dumbbell.map(row => row[i] ?? '.').join('')) : PROPS.dumbbell, p.at[0] - 1, p.at[1] - 1)
      return
    default:
      stamp(grid, PROPS[p.kind], p.at[0], p.at[1])
  }
}

/** A pose as a frame's 16 rows of palette characters. */
export function drawFigure(f: Figure): string[] {
  const grid = blank()
  for (const p of f.props ?? []) if (p.kind === 'bar' || p.kind === 'mat' || p.kind === 'wall' || p.kind === 'chair') prop(grid, p)
  // In profile the far limbs are in shade; front-on both sides are lit.
  // Limbs are slimmer in profile, where two of them overlap the torso.
  const isFront = f.head?.facing !== 'right' && f.head?.facing !== 'left'
  const far = isFront ? 's' : 'S'
  if (f.backLeg !== undefined) limb(grid, f.backLeg, far, 'h', !isFront)
  if (f.backArm !== undefined) limb(grid, f.backArm, far, undefined, !isFront)
  if (f.frontLeg !== undefined) limb(grid, f.frontLeg, 's', 'h', !isFront)
  if (f.shorts !== undefined) capsule(grid, f.shorts.from, f.shorts.to, f.shorts.width ?? 6, 'n', true)
  if (f.torso !== undefined) {
    const width = f.torso.width ?? 6
    capsule(grid, f.torso.from, f.torso.to, width, 't', true)
    // The tank's shade down its far side.
    const [fx, fy] = f.torso.from
    const [tx, ty] = f.torso.to
    const isUpright = Math.abs(ty - fy) >= Math.abs(tx - fx)
    const off = width / 2 - 0.5
    capsule(grid, isUpright ? [fx + off, fy] : [fx, fy + off], isUpright ? [tx + off, ty] : [tx, ty + off], 1, 'T', true)
  }
  if (f.frontArm !== undefined) limb(grid, f.frontArm, 's', undefined, !isFront)
  for (const at of f.bicep ?? []) capsule(grid, at, at, 2.6, 's')
  if (f.head !== undefined) stamp(grid, headRows(f.head.facing, f.head.expr, f.head.bare), f.head.at[0], f.head.at[1])
  for (const p of f.props ?? []) if (!(p.kind === 'bar' || p.kind === 'mat' || p.kind === 'wall' || p.kind === 'chair')) prop(grid, p)
  for (const fx of f.fx ?? []) stamp(grid, FX[fx.kind], fx.at[0], fx.at[1])
  return grid.map(row => row.join(''))
}

// ---------------------------------------------------------------------------------------------------------
// Moving a whole pose: shifted (a jump, a bob, a shake) or turned to face the other way.

const at = (p: P, dx: number, dy: number): P => [p[0] + dx, p[1] + dy]
const limbAt = (l: Limb | undefined, dx: number, dy: number) => l?.map(p => at(p, dx, dy))

/** The pose moved by (dx, dy); the room (bar, mat, wall) stays where it is. */
export function shift(f: Figure, dx: number, dy: number): Figure {
  const segment = <T extends { from: P; to: P }>(s: T | undefined) => (s === undefined ? undefined : { ...s, from: at(s.from, dx, dy), to: at(s.to, dx, dy) })
  const moved: Figure = {
    ...f,
    ...(f.head === undefined ? {} : { head: { ...f.head, at: at(f.head.at, dx, dy) } }),
    ...(f.torso === undefined ? {} : { torso: segment(f.torso) }),
    ...(f.shorts === undefined ? {} : { shorts: segment(f.shorts) }),
    ...(f.backArm === undefined ? {} : { backArm: limbAt(f.backArm, dx, dy) }),
    ...(f.frontArm === undefined ? {} : { frontArm: limbAt(f.frontArm, dx, dy) }),
    ...(f.backLeg === undefined ? {} : { backLeg: limbAt(f.backLeg, dx, dy) }),
    ...(f.frontLeg === undefined ? {} : { frontLeg: limbAt(f.frontLeg, dx, dy) }),
    ...(f.bicep === undefined ? {} : { bicep: f.bicep.map(p => at(p, dx, dy)) }),
    ...(f.fx === undefined ? {} : { fx: f.fx.map(x => ({ ...x, at: at(x.at, dx, dy) })) }),
    ...(f.props === undefined
      ? {}
      : {
          props: f.props.map(p => {
            if (p.kind === 'bar' || p.kind === 'mat' || p.kind === 'wall') return p
            if (p.kind === 'band') return { ...p, from: at(p.from, dx, dy), to: at(p.to, dx, dy) }
            return { ...p, at: at(p.at, dx, dy) }
          }),
        }),
  }
  return moved
}

/** The pose facing the other way: every x mirrored across the frame. */
export function turned(f: Figure): Figure {
  const m = (p: P): P => [SIZE - 1 - p[0], p[1]]
  const ml = (l: Limb | undefined) => l?.map(m)
  const segment = <T extends { from: P; to: P }>(s: T | undefined) => (s === undefined ? undefined : { ...s, from: m(s.from), to: m(s.to) })
  const face: Record<Facing, Facing> = { front: 'front', right: 'left', left: 'right' }
  return {
    ...f,
    ...(f.head === undefined ? {} : { head: { ...f.head, facing: face[f.head.facing], at: [SIZE - 6 - f.head.at[0], f.head.at[1]] as P } }),
    ...(f.torso === undefined ? {} : { torso: segment(f.torso) }),
    ...(f.shorts === undefined ? {} : { shorts: segment(f.shorts) }),
    ...(f.backArm === undefined ? {} : { backArm: ml(f.backArm) }),
    ...(f.frontArm === undefined ? {} : { frontArm: ml(f.frontArm) }),
    ...(f.backLeg === undefined ? {} : { backLeg: ml(f.backLeg) }),
    ...(f.frontLeg === undefined ? {} : { frontLeg: ml(f.frontLeg) }),
    ...(f.bicep === undefined ? {} : { bicep: f.bicep.map(m) }),
    ...(f.props === undefined
      ? {}
      : {
          props: f.props.map(p => {
            if (p.kind === 'bar' || p.kind === 'mat') return p
            if (p.kind === 'wall') return { ...p, x: SIZE - 1 - p.x }
            if (p.kind === 'band') return { ...p, from: m(p.from), to: m(p.to) }
            return { ...p, at: m(p.at) }
          }),
        }),
    ...(f.fx === undefined ? {} : { fx: f.fx.map(x => ({ ...x, at: m(x.at) })) }),
  }
}
