/**
 * Copyright 2026 Orange Specs Mobile Labs. All rights reserved: not covered by the Apache License (see NOTICE). Swolomon's
 * name, character, likeness and these scenes are proprietary.
 *
 * His scenes (owner, 2026-10-12: "Add even more personality. 50 more scenes"): little stories between lines,
 * made of what he already does (his poses, his walks in and out of his square and around the gym, his moves
 * and idle animations, his word on it), each with a beginning, a middle and a look at you at the end. Pure data.
 */

import type { LineId } from './copy'
import { moveById, movePlay } from './moves'
import type { Pose } from './portrait'
import { approach, BACK, centredAt, feetAt, offAt, turned, walkAcross, walking } from './stage'
import type { IdleStep, Walk } from './stage'

/** A scene: its name (for tests), its steps up close at both ends. */
export type Scene = { id: string; steps: readonly IdleStep[] }

type Side = Walk['facing']

const other = (side: Side): Side => (side === 'left' ? 'right' : 'left')

const pose = (p: Pose, ms: number): IdleStep => ({ pose: p, ms })

/** His word, wherever he is. */
const word = (id: LineId): IdleStep => ({ aside: id, ms: 0 })

/** His word up close, then long enough to read it. */
const say = (id: LineId, then: Pose = 'lookYou', ms = 1800): IdleStep[] => [word(id), pose(then, ms)]

/** One of his moves (or idle animations) where he stands, his whole body showing. */
const does = (id: string, reps?: number): IdleStep => {
  const move = moveById(id)
  return { move: id, reps: reps ?? move?.reps ?? 1, ms: 0 }
}

/** One of his moves further back in the gym, at `scale`, its left edge going `from` to `to` over the play. */
function doesAt(id: string, scale: number, from: number, to = from, reps?: number): IdleStep[] {
  const move = moveById(id)
  if (move === undefined) return []
  const play = movePlay(move, reps ?? move.reps)
  return play.map(([p, ms], i) => ({ far: { src: { move: id, pose: p }, facing: 'right', scale, x: Math.round(from + ((to - from) * i) / Math.max(1, play.length - 1)), feet: feetAt(scale) }, ms }))
}

/** Up close, he walks out of his square on `side`. */
const leaves = (side: Side): IdleStep[] => [turned(side, 300), ...walking(side, 0, side === 'left' ? -16 : 16)]

/** Up close, he walks back into his square from `side`, and turns to you. */
const returns = (side: Side): IdleStep[] => [...walking(other(side), side === 'left' ? -16 : 16, 0), turned(other(side), 250)]

/** Out of his square for a moment. */
const away = (ms: number, side: Side = 'right'): IdleStep => ({ walk: { frame: 'walkA', facing: side, x: side === 'left' ? -16 : 16, y: 0 }, ms })

/** Up close, his head and shoulders in from `side`, `depth` pixels in; held; and out again. */
function peek(side: Side, depth: number, holdMs: number): IdleStep[] {
  const out = side === 'left' ? -16 : 16
  const inAt = side === 'left' ? -16 + depth : 16 - depth
  const facing = other(side)
  return [...walking(facing, out, inAt), { walk: { frame: 'walkA', facing, x: inAt, y: 0 }, ms: holdMs }, ...walking(side, inAt, out)]
}

/** Into the gym at `scale`: in from `side`, across to the middle. */
const inAt = (scale: number, side: Side, stepMs?: number): IdleStep[] => walkAcross(scale, offAt(scale, side), centredAt(scale), stepMs)

/** Out of the gym at `scale`: from the middle off to `side`. */
const outAt = (scale: number, side: Side, stepMs?: number): IdleStep[] => walkAcross(scale, centredAt(scale), offAt(scale, side), stepMs)

/** Off to the back of the gym on `side`, `middle` there, and back in up close from the same side. */
const atTheBack = (side: Side, middle: readonly IdleStep[]): IdleStep[] => [...leaves(side), ...inAt(BACK.scale, side), ...middle, ...outAt(BACK.scale, side), ...returns(side)]

/** Off to the back on `side`, `middle` there, and straight up to you. */
const backThenUp = (side: Side, middle: readonly IdleStep[], ms = 260): IdleStep[] => [...leaves(side), ...inAt(BACK.scale, side), ...middle, ...approach(BACK.scale, 1, ms)]

const MID = 0.75

export const SCENES: readonly Scene[] = [
  // Out and back.
  { id: 'towel-run', steps: [...leaves('right'), away(900), ...returns('right'), does('brow-wipe'), ...say('scene-towel')] },
  { id: 'shake-run', steps: [...leaves('left'), away(1100, 'left'), ...returns('left'), does('scoop-protein'), ...say('scene-shake')] },
  { id: 'wrong-door', steps: [...leaves('left'), away(800, 'left'), ...returns('right'), pose('glanceR', 500), pose('glanceL', 500), ...say('scene-wrong-door', 'smirk')] },
  { id: 'not-leg-day', steps: [pose('glanceL', 450), pose('glanceR', 450), does('tiptoe-sneak'), ...leaves('left'), away(1500, 'left'), ...returns('left'), ...say('scene-leg-day', 'smirk')] },
  { id: 'fanfare', steps: [...leaves('right'), away(600), does('drum-roll'), ...returns('right'), does('fanfare'), ...say('scene-presenting')] },
  // Peeking in.
  { id: 'peek-boo', steps: [...leaves('right'), away(700), ...peek('left', 7, 900), away(400, 'left'), ...returns('left'), ...say('scene-boo', 'wink', 500)] },
  { id: 'peek-twice', steps: [...leaves('left'), away(500, 'left'), ...peek('right', 6, 700), away(600), ...peek('right', 9, 1000), ...returns('right'), pose('lookYou', 700), pose('smirk', 700)] },
  { id: 'peek-both', steps: [...leaves('left'), ...peek('left', 7, 600), away(300), ...peek('right', 7, 600), ...returns('left'), pose('wink', 400)] },
  // At the back of the gym.
  { id: 'back-mirror', steps: atTheBack('right', [...doesAt('pose-check', BACK.scale, 4), word('scene-back-mirror'), ...doesAt('flex-check', BACK.scale, 4)]) },
  { id: 'back-nap', steps: backThenUp('left', [...doesAt('nod-off', BACK.scale, 4)], 140).concat([does('startled'), ...say('scene-resting-eyes')]) },
  { id: 'back-rerack', steps: atTheBack('left', [...doesAt('dumbbell-lateral-raise', BACK.scale, 4, 4, 2), word('scene-rerack')]) },
  { id: 'back-pizza', steps: atTheBack('right', doesAt('bubblegum', BACK.scale, 4)).concat(say('scene-saw-nothing', 'smirk')) },
  { id: 'back-wave', steps: backThenUp('right', [...doesAt('big-wave', BACK.scale, 4, 4, 2), word('scene-hi-from-back')]) },
  { id: 'back-lasso', steps: atTheBack('left', [...doesAt('lasso', BACK.scale, 4, 4, 2), word('scene-yeehaw')]) },
  { id: 'back-backflip', steps: backThenUp('left', doesAt('backflip', BACK.scale, 4)).concat([does('bow'), ...say('scene-thank-you')]) },
  { id: 'back-sumo', steps: backThenUp('right', doesAt('sumo-sway', BACK.scale, 4)).concat([pose('smirk', 900)]) },
  { id: 'back-sprinkler', steps: atTheBack('right', doesAt('sprinkler', BACK.scale, 4, 4, 2)) },
  { id: 'back-gaming', steps: atTheBack('left', [...doesAt('phone-check', BACK.scale, 4), word('scene-rest-day')]) },
  { id: 'back-meditate', steps: atTheBack('right', [...doesAt('deep-breath', BACK.scale, 4), ...doesAt('lumbar-stretch', BACK.scale, 4)]).concat(say('scene-inner-gains')) },
  { id: 'you-called', steps: [...leaves('right'), ...inAt(BACK.scale, 'right'), ...doesAt('double-take', BACK.scale, 4), ...approach(BACK.scale, 1, 110), ...say('scene-you-called')] },
  // Across the gym.
  { id: 'laps', steps: [...leaves('left'), ...walkAcross(BACK.scale, -8, 16, 70), away(500), ...walkAcross(0.62, 16, -10, 70), ...returns('left'), does('brow-wipe'), ...say('scene-laps')] },
  { id: 'shuffle-lap', steps: [...leaves('right'), ...doesAt('lateral-shuffle', BACK.scale, 16, -8, 2), ...returns('left'), pose('wink', 450)] },
  { id: 'rope-lap', steps: [...leaves('left'), ...doesAt('double-unders', BACK.scale, -8, 16, 2), ...returns('right'), pose('lookYou', 800)] },
  { id: 'cartwheel-off', steps: [does('cartwheel'), ...doesAt('cartwheel', 1, 0, 16, 2), away(700), ...returns('right'), ...say('scene-still-got-it', 'smirk')] },
  { id: 'scenic-route', steps: [...leaves('right'), ...doesAt('the-worm', MID, 16, 2, 3), ...approach(MID, 1, 200), ...say('scene-scenic-route')] },
  { id: 'shopping-lane', steps: [...leaves('left'), ...doesAt('shopping-cart', MID, -12, 16, 2), away(400), ...returns('right'), pose('smirk', 800)] },
  { id: 'stage-turns', steps: [...approach(1, MID, 200), ...doesAt('chest-puff', MID, centredAt(MID)), ...approach(MID, 1, 200), does('double-biceps'), ...say('scene-judges')] },
  // Right where he is.
  { id: 'nobody-saw', steps: [does('sway-dance'), does('disco-point'), pose('glanceL', 400), pose('glanceR', 400), ...say('scene-nobody-saw')] },
  { id: 'zoned-out', steps: [pose('lookYou', 2200), does('buffering'), pose('blink', 150), ...say('scene-zoned-out', 'idle')] },
  { id: 'typing-along', steps: [does('air-typing'), ...say('scene-typing-along', 'smirk')] },
  { id: 'lost-thought', steps: [does('chin-think'), does('eureka'), does('dunno-shrug'), ...say('scene-lost-thought', 'idle')] },
  { id: 'bless-me', steps: [does('sneezing-fit'), pose('blink', 150), ...say('scene-bless-me', 'idle')] },
  { id: 'the-fly', steps: [does('swat-fly'), pose('glanceL', 400), pose('glanceR', 400), does('swat-fly'), ...say('scene-the-fly', 'smirk')] },
  { id: 'second-coffee', steps: [does('coffee-sip'), does('pogo'), does('pogo'), ...say('scene-second-coffee')] },
  { id: 'sparring', steps: [does('boxer-bounce'), does('karate-chop'), ...say('scene-pow', 'smirk')] },
  { id: 'meant-that', steps: [does('strut'), does('trip-recover'), ...say('scene-meant-that', 'smirk')] },
  { id: 'laurel-shine', steps: [does('hair-fix'), does('laurel-tip'), ...say('scene-shiny')] },
  { id: 'impatient', steps: [does('check-watch'), does('foot-tap'), ...say('scene-takes-its-time')] },
  { id: 'hype-man', steps: [does('hype-clap'), does('raise-roof'), ...say('scene-make-noise')] },
  { id: 'butterfingers', steps: [does('kettlebell-juggle'), does('startled'), ...say('scene-butterfingers', 'idle')] },
  { id: 'new-pr', steps: [does('grip-squeeze'), does('struggle'), does('fist-pump'), ...say('scene-new-pr')] },
  { id: 'too-slow', steps: [pose('lookYou', 600), does('high-five-offer'), does('too-slow'), ...say('scene-too-slow', 'wink', 500)] },
  { id: 'left-hanging', steps: [does('fist-bump-offer'), does('sigh'), ...say('scene-left-hanging', 'idle')] },
  { id: 'headphones', steps: [does('headphones-bop'), does('nod-along'), ...say('scene-slaps')] },
  { id: 'beep-boop', steps: [does('the-robot'), does('buffering'), ...say('scene-beep-boop', 'idle')] },
  { id: 'on-a-roll', steps: [does('phone-check'), does('quiet-yes'), ...say('scene-on-a-roll')] },
  { id: 'lost-count', steps: [does('count-on-fingers'), does('double-take'), ...say('scene-lost-count', 'idle')] },
  { id: 'just-proud', steps: [pose('lookYou', 900), does('heart-hands'), ...say('scene-proud')] },
  { id: 'dizzy', steps: [does('spin-around'), does('spin-around'), does('trip-recover'), ...say('scene-dizzy', 'idle')] },
  { id: 'secret', steps: [pose('glanceL', 400), pose('glanceR', 400), does('whisper-aside'), ...say('scene-secret', 'wink', 500)] },
]
