import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { EYES_AWAKE_MS, EYES_BLINK_MS, EYES_NEAR_MS, EYES_OPEN_MS, footerLabel, footerOf, isAwake, isUnderWay } from '../hooks/footer'
import { START } from '../hooks/plan'
import { ANIMATED, BAND, footerLabelOf, NOON, OPTIONS, SESSION, TINY, TODAY, world } from './world'

/**
 * The prompt footer (nimble sets, decision 6): today's tally, the time to the next set, and his eyes once
 * it is near. The peek row above the prompt is gone.
 */

const MIN = 60_000

test('the time to the next set: whole minutes rounded up, then ready', () => {
  const at = (left: number | undefined) => footerOf({ isUnderWay: true, nextCueAt: left === undefined ? undefined : NOON + left, now: NOON }).when
  expect(at(20 * MIN)).toBe('20m')
  expect(at(20 * MIN - 1)).toBe('20m')
  expect(at(MIN + 1)).toBe('2m')
  expect(at(30_000)).toBe('1m')
  expect(at(0)).toBe('ready')
  expect(at(-5 * MIN)).toBe('ready')
  expect(at(undefined)).toBe('ready')
})

test('his eyes: not at 20m, there under two minutes and when ready', () => {
  const near = (left: number) => footerOf({ isUnderWay: true, nextCueAt: NOON + left, now: NOON }).isNear
  expect(near(20 * MIN)).toBe(false)
  expect(near(EYES_NEAR_MS)).toBe(false)
  expect(near(EYES_NEAR_MS - 1)).toBe(true)
  expect(near(MIN)).toBe(true)
  expect(near(0)).toBe(true)
})

test('it changes once a minute while a time shows, and at the moment the eyes arrive', () => {
  const changeIn = (left: number) => footerOf({ isUnderWay: true, nextCueAt: NOON + left, now: NOON }).changeIn
  expect(changeIn(20 * MIN)).toBe(MIN)
  expect(changeIn(20 * MIN - 1_000)).toBe(MIN - 1_000)
  // 2m 30s left: the label turns to 2m in 30 s; the eyes come a tick after that, once under two minutes.
  expect(changeIn(2 * MIN + 30_000)).toBe(30_000)
  expect(changeIn(EYES_NEAR_MS)).toBe(1)
  expect(changeIn(30_000)).toBe(30_000)
  expect(changeIn(0)).toBeNull()
})

test('no time, no eyes, and no timer when no workout is under way', () => {
  for (const tally of [undefined, '💪 done', '💪 2/2', '💪 3 today ✓']) {
    expect(footerOf({ isUnderWay: isUnderWay(tally), nextCueAt: NOON + MIN, now: NOON })).toEqual({ when: undefined, isNear: false, changeIn: null })
  }
  expect(isUnderWay('💪 0/9')).toBe(true)
  expect(isUnderWay('💪 3/5 today')).toBe(true)
})

test('the label: eyes, tally, time', () => {
  expect(footerLabel('💪 0/9', { when: '20m', eyes: undefined })).toBe('💪 0/9 · 20m')
  expect(footerLabel('💪 0/9', { when: '1m', eyes: '👀' })).toBe('👀 💪 0/9 · 1m')
  expect(footerLabel('💪 done', { when: undefined, eyes: undefined })).toBe('💪 done')
})

test('his eyes blink while the agent works and a while after; then they rest open', () => {
  expect(isAwake({ isTurnRunning: true, turnEndedAt: undefined, now: NOON })).toBe(true)
  expect(isAwake({ isTurnRunning: false, turnEndedAt: undefined, now: NOON })).toBe(false)
  expect(isAwake({ isTurnRunning: false, turnEndedAt: NOON - EYES_AWAKE_MS + 1, now: NOON })).toBe(true)
  expect(isAwake({ isTurnRunning: false, turnEndedAt: NOON - EYES_AWAKE_MS, now: NOON })).toBe(false)
  expect(EYES_BLINK_MS).toBeGreaterThanOrEqual(1_000)
  expect(EYES_OPEN_MS).toBeGreaterThanOrEqual(1_000)
})

test('live: 20 minutes out it says so, without his eyes; the minute ticks; under two minutes they come', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY, { nextCueAt: NOON + 20 * MIN })
  await $.session.start(SESSION)
  expect(await footerLabelOf($)).toBe('💪 0/2 · 20m')
  await clock.advance(MIN)
  expect(await footerLabelOf($)).toBe('💪 0/2 · 19m')
  await clock.advance(18 * MIN + 30_000)
  expect(await footerLabelOf($)).toBe('👀 💪 0/2 · 1m')
  await clock.advance(30_000)
  expect(await footerLabelOf($)).toBe('👀 💪 0/2 · ready')
})

test('live: no peek band is drawn for his eyes; the band slot stays empty', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY, { nextCueAt: NOON + MIN })
  await $.session.start(SESSION)
  await clock.advance(2 * MIN)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Raster' })).toBeUndefined()
  await ui.unmount()
  expect(await footerLabelOf($)).toBe('👀 💪 0/2 · ready')
})

test('live: animated, the eyes alternate during a turn, never quicker than a second, and rest open once it is long over', ANIMATED, async ($, on) => {
  const { clock } = world(on, TINY, { nextCueAt: NOON })
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  const seen: string[] = []
  for (let ms = 0; ms < 3 * (EYES_OPEN_MS + EYES_BLINK_MS); ms += 500) {
    seen.push((await footerLabelOf($)) ?? '')
    await clock.advance(500)
  }
  const eyes = seen.map(label => label.split(' ')[0])
  expect(eyes).toContain('👀')
  expect(eyes).toContain('😌')
  // Each look or blink lasts at least a second (two samples).
  const runs = eyes.join(',').split(/(?<=👀),(?=😌)|(?<=😌),(?=👀)/)
  for (const run of runs.slice(1, -1)) expect(run.split(',').length).toBeGreaterThanOrEqual(2)
  await $.turn.complete({ turnId: 't1', durationMs: 10_000 } as never)
  await clock.advance(EYES_AWAKE_MS + EYES_OPEN_MS + EYES_BLINK_MS)
  const resting = new Set<string>()
  for (let i = 0; i < 20; i += 1) {
    resting.add((await footerLabelOf($)) ?? '')
    await clock.advance(1_000)
  }
  expect([...resting]).toEqual(['👀 💪 0/2 · ready'])
})

test('live: no time once the workout is done, nor on a rest day; the next training day has it again', OPTIONS, async ($, on) => {
  const { clock } = world(on, TINY, { progress: { ...START, workout: 1, lastCompletedOn: TODAY }, nextCueAt: NOON + 20 * MIN })
  await $.session.start(SESSION)
  expect(await footerLabelOf($)).toBe('💪 done')
  await clock.advance(86_400_000)
  expect(await footerLabelOf($)).toBeUndefined()
  await clock.advance(86_400_000)
  expect(await footerLabelOf($)).toBe('👀 💪 0/1 · ready')
})

/** The eyes' labels seen sampling every half second for `ms`. */
async function eyesOver($: Engine, clock: { advance: (ms: number) => Promise<void> }, ms: number): Promise<Set<string>> {
  const seen = new Set<string>()
  for (let at = 0; at < ms; at += 500) {
    seen.add(((await footerLabelOf($)) ?? '').split(' ')[0] ?? '')
    await clock.advance(500)
  }
  return seen
}

const CYCLE = 2 * (EYES_OPEN_MS + EYES_BLINK_MS)

test('live: animated, after the turn ends they keep blinking within the awake window', ANIMATED, async ($, on) => {
  const { clock } = world(on, TINY, { nextCueAt: NOON })
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.turn.complete({ turnId: 't1', durationMs: 10_000 } as never)
  expect(await eyesOver($, clock, CYCLE)).toEqual(new Set(['👀', '😌']))
})

test('live: animated, a new turn wakes resting eyes', ANIMATED, async ($, on) => {
  const { clock } = world(on, TINY, { nextCueAt: NOON })
  await $.session.start(SESSION)
  await clock.advance(EYES_AWAKE_MS)
  expect(await eyesOver($, clock, CYCLE)).toEqual(new Set(['👀']))
  await $.turn.start({ text: 'go', turnId: 't1' })
  expect(await eyesOver($, clock, CYCLE)).toEqual(new Set(['👀', '😌']))
})

test('live: animated, two days of an idle terminal pass without a timer storm', ANIMATED, async ($, on) => {
  const { clock } = world(on, TINY, { nextCueAt: NOON })
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.turn.complete({ turnId: 't1', durationMs: 10_000 } as never)
  // A blink every few seconds for 48 h would be tens of thousands of waits in one advance.
  await clock.advance(48 * 3_600_000)
  expect(await footerLabelOf($)).toMatch(/^👀 💪 /)
})

test('live: animated, still far off there is nothing to blink', ANIMATED, async ($, on) => {
  const { clock } = world(on, TINY, { nextCueAt: NOON + 20 * MIN })
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  expect(await eyesOver($, clock, CYCLE)).toEqual(new Set(['💪']))
})

test('live: Quiet keeps the time but never his eyes', { options: { ...ANIMATED.options, coachChat: 'quiet' } }, async ($, on) => {
  const { clock } = world(on, TINY, { nextCueAt: NOON + MIN })
  await $.session.start(SESSION)
  await $.turn.start({ text: 'go', turnId: 't1' })
  expect(await footerLabelOf($)).toBe('💪 0/2 · 1m')
  expect(await eyesOver($, clock, MIN)).toEqual(new Set(['💪']))
  expect(await footerLabelOf($)).toBe('💪 0/2 · ready')
})
