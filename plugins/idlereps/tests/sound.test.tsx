import { expect, test } from 'claude-code/testing'

import { line } from '../hooks/copy'
import { ENTRANCE_MS, frameAt, TICK_MS, timelineOf } from '../hooks/portrait'
import { BAND, OPTIONS, SESSION, TINY, TODAY, workout, world } from './world'

/** Swolomon's sound (§1.11 Sound, coachSound): blips while he talks, or the line read aloud. */

const SOUND = (coachSound: string, extra: Record<string, unknown> = {}) => ({ options: { ...OPTIONS.options, coachAnimation: true, coachSound, ...extra } })

function sounds(on: Parameters<typeof world>[0], opts: { refuse?: boolean; hold?: Promise<void> } = {}) {
  const played: string[] = []
  const spoken: string[] = []
  on('audio.play', ($, e) => {
    if (opts.refuse === true) throw new Error('no audio here')
    if (e.clip.asset !== undefined) played.push(e.clip.asset)
    return { value: undefined }
  })
  on('audio.speak', async ($, e) => {
    spoken.push(e.text)
    if (opts.refuse === true) throw new Error('no voice here')
    await opts.hold
    return { value: { via: 'system' as const } }
  })
  return { played, spoken }
}

/** How often the mouth opens while a line types, sampled as the band's clock ticks. */
function mouthOpenings(text: string): number {
  const timeline = timelineOf([text])
  let pose = frameAt(timeline, 0, false).pose
  // The first word opens the mouth too.
  let n = pose === 'talkA' ? 1 : 0
  for (let t = TICK_MS; t < 20_000; t += TICK_MS) {
    const frame = frameAt(timeline, t, false)
    if (frame.isDone) break
    if (frame.pose === 'talkA' && pose !== 'talkA') n += 1
    pose = frame.pose
  }
  return n
}

test('blips: one each time the mouth opens while the line types, and none once it is out', SOUND('blips'), async ($, on) => {
  const { clock } = world(on, TINY)
  const { played, spoken } = sounds(on)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await clock.advance(10_000)
  expect(played.length).toBe(mouthOpenings(line('set', { day: TODAY })))
  expect(played.length).toBeGreaterThan(0)
  expect(new Set(played)).toEqual(new Set(['assets/blip.wav']))
  expect(spoken).toEqual([])
  await clock.advance(30_000)
  expect(played.length).toBe(mouthOpenings(line('set', { day: TODAY })))
  await ui.unmount()
})

test('voice: the line read aloud once, as it starts', SOUND('voice'), async ($, on) => {
  const { clock } = world(on, TINY)
  const { played, spoken } = sounds(on)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await clock.advance(10_000)
  expect(spoken).toEqual([line('set', { day: TODAY })])
  expect(played).toEqual([])
})

test('voice: a line that starts while another is still being read is skipped, never queued', SOUND('voice'), async ($, on) => {
  let finish = () => {}
  const hold = new Promise<void>(resolve => {
    finish = resolve
  })
  world(on, TINY)
  const { spoken } = sounds(on, { hold })
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  // Still reading the first set's line: the skip's reassurance starts, and is not read.
  await $.command.run(workout('skip'))
  expect(spoken).toEqual([line('set', { day: TODAY })])
  finish()
  await hold
  // Done reading: the next line, the workout's end, is read.
  await $.command.run(workout('now'))
  await $.command.run(workout('skip'))
  expect(spoken).toEqual([line('set', { day: TODAY }), line('workout-done', { day: TODAY, workout: 'A' })])
})

test('voice works with the animation off too: the line is still read', SOUND('voice', { coachAnimation: false }), async ($, on) => {
  world(on, TINY)
  const { spoken } = sounds(on)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  expect(spoken).toEqual([line('set', { day: TODAY })])
})

test('off (the default): no blip and no voice', SOUND('off'), async ($, on) => {
  const { clock } = world(on, TINY)
  const { played, spoken } = sounds(on)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await clock.advance(10_000)
  expect([played, spoken]).toEqual([[], []])
})

test('quiet hours silence Swolomon’s sound', { options: { ...SOUND('blips').options, quietHours: '22-07' } }, async ($, on) => {
  // 23:00 local.
  const late = new Date(2026, 9, 2, 23).getTime()
  const { clock } = world(on, { ...TINY, schedule: { everyNDays: 1 } }, {}, { now: late })
  const { played } = sounds(on)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await clock.advance(10_000)
  expect(played).toEqual([])
})

test('a refused play or speak is ignored: the band works on', SOUND('blips'), async ($, on) => {
  const { clock } = world(on, TINY)
  sounds(on, { refuse: true })
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await clock.advance(10_000)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await ui.press({ key: 'done' })
  expect(await ui.find({ key: 'undo' })).toBeDefined()
  await ui.unmount()
})

test('a refused speak is ignored too', SOUND('voice'), async ($, on) => {
  world(on, TINY)
  const { spoken } = sounds(on, { refuse: true })
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  expect(spoken.length).toBe(1)
  expect((await $.command.run(workout('done'))).text).toBeDefined()
})

// ---------------------------------------------------------------------------------------------------------
// Blips, around the edges (regression: the first word of a line had no blip).

test('blips: the first word blips at once, with the line', SOUND('blips'), async ($, on) => {
  world(on, TINY)
  const { played } = sounds(on)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  expect(played).toEqual(['assets/blip.wav'])
})

test('blips: none during the walk-on; they start with the line', SOUND('blips'), async ($, on) => {
  const { clock } = world(on, null)
  const { played } = sounds(on)
  await $.session.start(SESSION)
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND, props: { ...BAND.props, bodyColumns: 120 } })
  await clock.advance(ENTRANCE_MS - 200)
  expect(played).toEqual([])
  await clock.advance(2_000)
  expect(played.length).toBeGreaterThan(0)
  await ui.unmount()
})

test('blips: none with the animation off (the mouth never moves)', SOUND('blips', { coachAnimation: false }), async ($, on) => {
  const { clock } = world(on, TINY)
  const { played } = sounds(on)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await clock.advance(10_000)
  expect(played).toEqual([])
})

test('blips: a win holds the flex silently once its line is out', SOUND('blips'), async ($, on) => {
  const { clock } = world(on, TINY)
  const { played } = sounds(on)
  await $.session.start(SESSION)
  await $.command.run(workout('flex'))
  await clock.advance(10_000)
  const typed = played.length
  expect(typed).toBe(mouthOpenings(line('flex', { day: TODAY })))
  await clock.advance(30_000)
  expect(played.length).toBe(typed)
})

test('the hold timer’s beep has its own setting: it plays with Swolomon’s sound off', SOUND('off'), async ($, on) => {
  const { clock } = world(on, { ...TINY, workouts: [{ name: 'H', exercises: [{ name: 'Plank', reps: '20 s', sets: 1 }] }] })
  const { played } = sounds(on)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('timer'))
  await clock.advance(20_000)
  expect(played).toEqual(['assets/time.wav'])
})

test('blips: nothing while paused', SOUND('blips'), async ($, on) => {
  const { clock } = world(on, TINY, { paused: true })
  const { played } = sounds(on)
  await $.session.start(SESSION)
  await $.command.run(workout('flex'))
  await clock.advance(10_000)
  expect(played).toEqual([])
})
