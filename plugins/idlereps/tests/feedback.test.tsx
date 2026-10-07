import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

import type { Answers, HistoryEntry } from '../types'
import { COMMUNITY_URL, FEEDBACK_URL, line, TELEMETRY_URL } from '../hooks/copy'
import { cutFeedback, FEEDBACK_MAX, feedbackPayload } from '../hooks/feedback'
import { newSetup, screenOf } from '../hooks/setup'
import { PLUGIN_VERSION } from '../hooks/status'
import { ratioOf, setupProperties, TELEMETRY_ENABLED, telemetryPayload } from '../hooks/telemetry'
import type { TelemetryEvent } from '../hooks/telemetry'
import { BAND, drawnRows, NOON, OPTIONS, ownStore, SESSION, TINY, TODAY, workout, world } from './world'

/** Feedback, the one-time check-in and telemetry (§1.6, D9): only ever to the site's own endpoints. */

type Sent = { url: string; body: Record<string, unknown> }

/** The network: every request recorded; answered with `status`, or refused when `status` is 'reject'. */
function network(on: On, status: number | 'reject' = 204) {
  const sent: Sent[] = []
  on('http.fetch', ($, e) => {
    sent.push({ url: e.url, body: JSON.parse(e.init?.body ?? '{}') as Record<string, unknown> })
    if (status === 'reject') throw new Error('offline')
    return { value: { status, ok: status >= 200 && status < 300, headers: {}, text: '' } }
  })
  return sent
}

function clipboard(on: On, isCopied = true) {
  const copied: string[] = []
  on('ui.copy', ($, e) => {
    copied.push(e.text)
    return { value: isCopied ? { isCopied: true } : { isCopied: false, reason: 'no clipboard' } } as never
  })
  return copied
}

const completed = (n: number): HistoryEntry[] => Array.from({ length: n }, (_, i) => ({ kind: 'workout-complete', t: NOON, d: TODAY - 2 * (i + 1), w: 0 }))

/** Workout A of TINY (two sets), start to rating. */
async function finishWorkout($: Engine) {
  for (let i = 0; i < 2; i += 1) {
    await $.command.run(workout('now'))
    await $.command.run(workout('done'))
  }
}

/** The band's rows; `['no band']` when none of ours is up (the engine's own). */
async function bandRows($: Engine): Promise<string[]> {
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  const rows = drawnRows(await ui.drawn())
  await ui.unmount()
  return rows.length === 1 && rows[0] === 'prompt' ? ['no band'] : rows
}

// ---------------------------------------------------------------------------------------------------------
// /workout feedback.

test('feedback: one POST to the site with exactly its fields, telemetry off; the reply links the community', OPTIONS, async ($, on) => {
  const sent = network(on)
  world(on, TINY)
  await $.session.start(SESSION)
  const reply = (await $.command.run(workout('feedback the  timer beep is   too loud'))).text
  expect(sent.length).toBe(1)
  expect(sent[0]?.url).toBe(FEEDBACK_URL)
  expect(Object.keys(sent[0]?.body ?? {}).sort()).toEqual(['installId', 'kind', 'pluginVersion', 'surface', 'text'])
  expect(sent[0]?.body).toMatchObject({ kind: 'feedback', text: 'the  timer beep is   too loud', pluginVersion: PLUGIN_VERSION, surface: 'terminal' })
  expect(reply).toBe(line('reply-feedback-sent', { day: TODAY, url: COMMUNITY_URL }))
})

test('feedback with no text sends nothing and says how', OPTIONS, async ($, on) => {
  const sent = network(on)
  world(on, null)
  await $.session.start(SESSION)
  for (const args of ['feedback', 'feedback   ']) {
    expect((await $.command.run(workout(args))).text).toBe(line('reply-feedback-usage', { day: TODAY, url: COMMUNITY_URL }))
  }
  expect(sent).toEqual([])
})

test('feedback works before there is a plan', OPTIONS, async ($, on) => {
  const sent = network(on)
  world(on, null)
  await $.session.start(SESSION)
  expect((await $.command.run(workout('feedback hi'))).text).toBe(line('reply-feedback-sent', { day: TODAY, url: COMMUNITY_URL }))
  expect(sent.length).toBe(1)
})

test('a refused send copies the text and says where to paste it', OPTIONS, async ($, on) => {
  network(on, 'reject')
  const copied = clipboard(on)
  world(on, TINY)
  await $.session.start(SESSION)
  expect((await $.command.run(workout('feedback more kettlebell plans'))).text).toBe(line('reply-feedback-copied', { day: TODAY, url: COMMUNITY_URL }))
  expect(copied).toEqual(['more kettlebell plans'])
})

test('an error answer (4xx or 5xx) is a failed send too; with no clipboard, the reply gives the link alone', OPTIONS, async ($, on) => {
  const sent = network(on, 500)
  clipboard(on, false)
  world(on, TINY)
  await $.session.start(SESSION)
  expect((await $.command.run(workout('feedback hello'))).text).toBe(line('reply-feedback-failed', { day: TODAY, url: COMMUNITY_URL }))
  expect(sent.length).toBe(1)
})

test('feedback over the limit is cut to it, and the reply says so', OPTIONS, async ($, on) => {
  const sent = network(on)
  world(on, TINY)
  await $.session.start(SESSION)
  const reply = (await $.command.run(workout(`feedback ${'é'.repeat(FEEDBACK_MAX + 5)}`))).text
  expect([...String(sent[0]?.body.text)].length).toBe(FEEDBACK_MAX)
  expect(reply).toBe(line('reply-feedback-sent-cut', { day: TODAY, url: COMMUNITY_URL, max: '2,000' }))
})

test('the install id: a UUID made once and kept; erase drops it, and the next send makes a new one', OPTIONS, async ($, on) => {
  const sent = network(on)
  const store = ownStore(on)
  world(on, TINY, 'own-store')
  await $.session.start(SESSION)
  await $.command.run(workout('feedback one'))
  await $.command.run(workout('feedback two'))
  const [first, second] = sent.map(s => s.body.installId)
  expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  expect(second).toBe(first)
  expect(store.get('installId')).toBe(first)
  await $.command.run(workout('erase'))
  await $.command.run(workout('erase'))
  expect(store.has('installId')).toBe(false)
  await $.command.run(workout('feedback three'))
  expect(sent[2]?.body.installId).not.toBe(first)
})

test('feedback: the limit counts characters, not UTF-16 units; exactly the limit is not cut', () => {
  expect(cutFeedback('x'.repeat(FEEDBACK_MAX)).isCut).toBe(false)
  expect(cutFeedback('💪'.repeat(FEEDBACK_MAX))).toEqual({ text: '💪'.repeat(FEEDBACK_MAX), isCut: false })
  expect(cutFeedback('x'.repeat(FEEDBACK_MAX + 1))).toEqual({ text: 'x'.repeat(FEEDBACK_MAX), isCut: true })
  const ctx = { installId: 'abcdefgh', pluginVersion: '1.0.0', surface: 'terminal' }
  expect(feedbackPayload({ kind: 'pulse', answer: 'love' }, ctx)).toEqual({ kind: 'pulse', answer: 'love', installId: 'abcdefgh', pluginVersion: '1.0.0', surface: 'terminal' })
})

// ---------------------------------------------------------------------------------------------------------
// The one-time check-in.

test('the check-in: after the third completed workout, behind the rating, numbered 1 to 4', OPTIONS, async ($, on) => {
  network(on)
  world(on, TINY, { history: completed(2) })
  await $.session.start(SESSION)
  await finishWorkout($)
  expect((await bandRows($)).some(row => row.includes(line('pulse-ask', { day: TODAY })))).toBe(false)
  await $.command.run(workout('good'))
  const rows = await bandRows($)
  expect(rows).toEqual([line('pulse-ask', { day: TODAY }), '', "1: Love it   2: It's fine   3: Not for me   4: Tell us more"])
})

test('no check-in after the second workout, nor once it was asked', OPTIONS, async ($, on) => {
  network(on)
  world(on, TINY, { history: completed(1) })
  await $.session.start(SESSION)
  await finishWorkout($)
  await $.command.run(workout('good'))
  expect(await bandRows($)).toEqual(['no band'])
})

test('asked once ever: a seen check-in never comes back', OPTIONS, async ($, on) => {
  network(on)
  world(on, TINY, { history: completed(5), seen: { pulse: { at: 1, n: 1 } } })
  await $.session.start(SESSION)
  await finishWorkout($)
  await $.command.run(workout('good'))
  expect(await bandRows($)).toEqual(['no band'])
})

for (const [id, answer] of [['love', 'love'], ['fine', 'fine'], ['notforme', 'notforme']] as const) {
  test(`answer ${id} sends ${answer}, thanks, and hides it`, OPTIONS, async ($, on) => {
    const sent = network(on)
    const { w } = world(on, TINY, { history: completed(2) })
    await $.session.start(SESSION)
    await finishWorkout($)
    await $.command.run(workout('good'))
    await $.command.run(workout(id))
    expect(w.toasts).toContain(line('pulse-thanks', { day: TODAY }))
    // The send never holds up the key: it lands in the background.
    expect(await bandRows($)).toEqual(['no band'])
    await $.command.run(workout('status'))
    expect(sent.map(s => s.body)).toEqual([expect.objectContaining({ kind: 'pulse', answer })])
    expect(Object.keys(sent[0]?.body ?? {}).sort()).toEqual(['answer', 'installId', 'kind', 'pluginVersion', 'surface'])
  })
}

test('answer 4 sends nothing and says how to say more', OPTIONS, async ($, on) => {
  const sent = network(on)
  const { w } = world(on, TINY, { history: completed(2) })
  await $.session.start(SESSION)
  await finishWorkout($)
  await $.command.run(workout('good'))
  await $.command.run(workout('tellmore'))
  expect(sent).toEqual([])
  expect(w.toasts).toContain(line('pulse-more', { day: TODAY, url: COMMUNITY_URL }))
  expect(await bandRows($)).toEqual(['no band'])
})

test('a failed check-in send is quiet: still hidden, still thanked', OPTIONS, async ($, on) => {
  network(on, 'reject')
  const { w } = world(on, TINY, { history: completed(2) })
  await $.session.start(SESSION)
  await finishWorkout($)
  await $.command.run(workout('good'))
  await $.command.run(workout('love'))
  expect(w.toasts).toContain(line('pulse-thanks', { day: TODAY }))
  expect(await bandRows($)).toEqual(['no band'])
})

test('a check-in answer with no check-in showing does nothing', OPTIONS, async ($, on) => {
  const sent = network(on)
  world(on, TINY)
  await $.session.start(SESSION)
  expect((await $.command.run(workout('love'))).text).toBe(line('reply-nothing-showing', { day: TODAY, id: 'love' }))
  expect(sent).toEqual([])
})

// ---------------------------------------------------------------------------------------------------------
// Telemetry (D9).

test('telemetry ships off: even opted in, a whole workout and setup send nothing', { options: { ...OPTIONS.options, telemetry: true } }, async ($, on) => {
  expect(TELEMETRY_ENABLED).toBe(false)
  const sent = network(on)
  world(on, TINY)
  await $.session.start(SESSION)
  await finishWorkout($)
  await $.command.run(workout('easy'))
  await $.command.run(workout('flex'))
  await $.command.run(workout('setup'))
  expect(sent).toEqual([])
})

const ANSWERS: Answers = {
  template: 'designed',
  goal: 'general',
  equipment: { dumbbells: true, bar: false, bands: true },
  level: 'beginner',
  daysPerWeek: 3,
  setting: 'home',
  weightUnit: 'kg',
  schedule: { everyNDays: 2 },
  size: 'short',
  weeks: 4,
}

/** One of every event, and the property names each must carry, exactly. */
const EVENTS: [TelemetryEvent, string[]][] = [
  [{ event: 'setup_completed', properties: setupProperties(ANSWERS, { isQuickStart: false, cueEvery: '15', idleReminder: '60' }) }, ['cueEvery', 'daysPerWeek', 'goal', 'hasBands', 'hasBar', 'hasDumbbells', 'idleReminder', 'level', 'scheduleKind', 'setting', 'size', 'template', 'weeks']],
  [{ event: 'plan_imported', properties: { workouts: 3 } }, ['workouts']],
  [{ event: 'cue_shown', properties: {} }, []],
  [{ event: 'set_finished', properties: { result: 'done', week: 2, ratio: 1.2 } }, ['ratio', 'result', 'week']],
  [{ event: 'set_finished', properties: { result: 'skip', week: 2 } }, ['result', 'week']],
  [{ event: 'workout_rated', properties: { rating: 'easy' } }, ['rating']],
  [{ event: 'ask_answered', properties: { answer: 'half' } }, ['answer']],
  [{ event: 'cue_later', properties: {} }, []],
  [{ event: 'workout_completed', properties: { workout: 4 } }, ['workout']],
  [{ event: 'plan_completed', properties: { workouts: 12 } }, ['workouts']],
  [{ event: 'week_shared', properties: { sets: 30, hours: 6 } }, ['hours', 'sets']],
  [{ event: 'rank_up', properties: { rank: 'Rack Regular' } }, ['rank']],
  [{ event: 'easter_egg', properties: { command: 'protein' } }, ['command']],
  [{ event: 'feat', properties: { id: 'first-set' } }, ['id']],
]

test('telemetry payloads: exactly event, distinct_id and properties, each event with exactly its own', () => {
  for (const [e, names] of EVENTS) {
    const body = telemetryPayload(e, 'id-12345678', '1.0.0')
    expect(Object.keys(body).sort()).toEqual(['distinct_id', 'event', 'properties'])
    expect([body.event, body.distinct_id]).toEqual([e.event, 'id-12345678'])
    expect([e.event, Object.keys(body.properties).sort()]).toEqual([e.event, [...names, 'plugin_version'].sort()])
  }
  expect(new URL(TELEMETRY_URL).host).toBe('idlereps.app')
})

test('setup’s properties: fixed words and numbers only; Quick start reads quick', () => {
  const props = setupProperties(ANSWERS, { isQuickStart: true, cueEvery: '30', idleReminder: 'off' })
  expect(props).toEqual({
    template: 'quick',
    goal: 'general',
    hasDumbbells: true,
    hasBar: false,
    hasBands: true,
    setting: 'home',
    level: 'beginner',
    daysPerWeek: 3,
    scheduleKind: 'everyNDays',
    size: 'short',
    weeks: 4,
    cueEvery: '30',
    idleReminder: 'off',
  })
  expect(setupProperties({ ...ANSWERS, schedule: { days: ['mon'] } }, { isQuickStart: false, cueEvery: '15', idleReminder: '60' })).toMatchObject({ template: 'designed', scheduleKind: 'days' })
})

test('the ratio: to the nearest tenth, absent without a count or a target', () => {
  expect([ratioOf(12, 10), ratioOf(7, 9), ratioOf(10, 10), ratioOf(undefined, 10), ratioOf(10, undefined), ratioOf(5, 0)]).toEqual([1.2, 0.8, 1, undefined, undefined, undefined])
})

test('setup asks Q10 only while telemetry is live, after the reminder question, and keeps the answer', () => {
  const base = { isSafetyAcknowledged: true, isQuickStart: false, cueEvery: '15', idleReminder: '60' }
  const atReminder = (state: ReturnType<typeof newSetup>) => ({ ...state, screen: 'idleReminder' as const })
  const off = atReminder(newSetup(base))
  expect(screenOf(off, '').choices?.[0]?.apply(off).screen).toBe('summary')
  const live = atReminder(newSetup({ ...base, telemetry: false }))
  const asked = screenOf(live, '').choices?.[0]?.apply(live)
  expect(asked?.screen).toBe('telemetry')
  if (asked === undefined) return
  const q10 = screenOf(asked, '')
  expect(q10.title).toBe('Share anonymous usage to help improve it?')
  expect(q10.choices?.map(c => c.label)).toEqual(['Yes', 'No'])
  expect(q10.primary).toBe(1)
  const yes = q10.choices?.[0]?.apply(asked)
  expect([yes?.screen, yes?.telemetry]).toEqual(['summary', true])
})
