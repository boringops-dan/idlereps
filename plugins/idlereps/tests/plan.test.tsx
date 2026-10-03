import { expect, test } from 'claude-code/testing'

import { parseLegacyPlan, parsePlan, stepBand, stripFence } from '../hooks/plan'
import { LEGACY_PATH, OPTIONS, PLAN_PATH, SESSION, TINY, workout, world } from './world'

/** The plan file (plan §4.1, Task 2) and the prototype's file (D3). */

const ex = (extra: Record<string, unknown>) =>
  JSON.stringify({ workouts: [{ name: 'A', exercises: [{ name: 'Push-ups', reps: '10 reps', ...extra }] }] })

test('every refusal names what is wrong', () => {
  const cases: [string, RegExp][] = [
    ['{nope', /not valid JSON/],
    ['[]', /JSON object/],
    ['{}', /"workouts"/],
    ['{"workouts": []}', /"workouts"/],
    ['{"workouts": [{"exercises": [{"name": "x", "reps": "1"}]}]}', /workout 1 needs a "name"/],
    ['{"workouts": [{"name": "A", "exercises": []}]}', /workout 1 needs a "name" and a non-empty "exercises"/],
    ['{"workouts": [{"name": "A", "exercises": [{"reps": "1"}]}]}', /exercise 1 needs a "name"/],
    ['{"workouts": [{"name": "A", "exercises": [{"name": "x"}]}]}', /"reps"/],
    [ex({ sets: 0 }), /"sets" of Push-ups/],
    [ex({ sets: 11 }), /"sets" of Push-ups/],
    [ex({ sets: 2.5 }), /"sets" of Push-ups/],
    [ex({ range: [12, 8] }), /"range" of Push-ups/],
    [ex({ weight: { start: 1, step: 1, unit: 'kg' }, band: { levels: ['a'], start: 'a' } }), /both "weight" and "band"/],
    [ex({ band: { levels: ['light'], start: 'heavy' } }), /"band" of Push-ups/],
    [ex({ weight: { start: 1, step: 1, unit: 'stone' } }), /"weight" of Push-ups/],
    ['{"schedule": 3, "workouts": [{"name": "A", "exercises": [{"name": "x", "reps": "1"}]}]}', /"schedule"/],
    ['{"schedule": {"days": []}, "workouts": [{"name": "A", "exercises": [{"name": "x", "reps": "1"}]}]}', /"schedule.days"/],
    ['{"schedule": {"days": ["funday"]}, "workouts": [{"name": "A", "exercises": [{"name": "x", "reps": "1"}]}]}', /unknown weekday "funday"/],
    ['{"schedule": {"everyNDays": 0}, "workouts": [{"name": "A", "exercises": [{"name": "x", "reps": "1"}]}]}', /"schedule.everyNDays"/],
    ['{"schedule": {"everyNDays": 8}, "workouts": [{"name": "A", "exercises": [{"name": "x", "reps": "1"}]}]}', /"schedule.everyNDays"/],
    ['{"version": 2, "workouts": [{"name": "A", "exercises": [{"name": "x", "reps": "1"}]}]}', /"version"/],
    ['{"builtFor": {"dumbbells": true}, "workouts": [{"name": "A", "exercises": [{"name": "x", "reps": "1"}]}]}', /"builtFor"/],
    ['{"answers": {"template": "x"}, "workouts": [{"name": "A", "exercises": [{"name": "x", "reps": "1"}]}]}', /"answers.template"/],
  ]
  for (const [text, reason] of cases) expect(() => parsePlan(text)).toThrow(reason)
})

test('defaults fill what a hand-written plan leaves out', () => {
  const plan = parsePlan('{"workouts": [{"name": "A", "exercises": [{"name": "x", "reps": "5 reps"}]}]}')
  expect(plan).toEqual({ version: 1, name: 'My plan', schedule: { everyNDays: 2 }, workouts: [{ name: 'A', exercises: [{ name: 'x', reps: '5 reps', sets: 1 }] }] })
})

test('the legacy list name is not a plan to parsePlan', () => {
  expect(() => parsePlan('{"days": [{"name": "A", "exercises": [{"name": "x", "reps": "1"}]}]}')).toThrow(/"workouts"/)
})

test('a prototype plan becomes the expected v1 plan', () => {
  const legacy = {
    startAfterSeconds: 60,
    cueEveryMinutes: 10,
    restSeconds: 45,
    restDaysBetween: 0,
    days: [{ name: 'Day', exercises: [{ name: 'Goblet squats', reps: '10 reps', sets: 3, weight: { start: 8, step: 2, unit: 'kg' } }] }],
  }
  expect(parseLegacyPlan(JSON.stringify(legacy))).toEqual({
    version: 1,
    name: 'My plan',
    schedule: { everyNDays: 1 },
    workouts: [{ name: 'Day', exercises: [{ name: 'Goblet squats', reps: '10 reps', sets: 3, weight: { start: 8, step: 2, unit: 'kg' } }] }],
  })
  expect(() => parseLegacyPlan('{"workouts": []}')).toThrow()
})

test('the prototype plan is written to plan.json at session start', OPTIONS, async ($, on) => {
  const { w } = world(on, null, {}, { legacy: JSON.stringify({ restDaysBetween: 1, days: TINY.workouts }) })
  await $.session.start(SESSION)
  const written = w.writes.find(write => write.path === PLAN_PATH)
  expect(written).toBeDefined()
  expect(JSON.parse(written?.text ?? '{}')).toEqual({ version: 1, name: 'My plan', schedule: { everyNDays: 2 }, workouts: TINY.workouts })
  expect(w.writes.some(write => write.path === LEGACY_PATH)).toBe(false)
  expect(JSON.stringify(await $.command.run(workout('status')))).toMatch(/Workout 1 of 2 \(A\)/)
})

test('an existing plan.json is never replaced by the prototype file', OPTIONS, async ($, on) => {
  const { w } = world(on, TINY, {}, { legacy: JSON.stringify({ restDaysBetween: 1, days: [{ name: 'Old', exercises: [{ name: 'x', reps: '1' }] }] }) })
  await $.session.start(SESSION)
  expect(w.writes.length).toBe(0)
})

test('steppers on band levels stop at either end', () => {
  const levels = ['light', 'medium', 'heavy']
  expect(stepBand(levels, 'light', -1)).toBe('light')
  expect(stepBand(levels, 'light', 1)).toBe('medium')
  expect(stepBand(levels, 'heavy', 1)).toBe('heavy')
})

test('a fenced model answer is unwrapped', () => {
  expect(stripFence('```json\n{"a": 1}\n```')).toBe('{"a": 1}')
  expect(stripFence('{"a": 1}')).toBe('{"a": 1}')
})
