/**
 * Anonymous usage events (plan D9, §6 Task 9): opt-in, off until the owner turns the endpoint on, and only
 * ever to the site's own endpoint. Pure: what an event is and the request it makes; the plugin sends it.
 * Never exercise names, plan text, paths or prompts: every property is a number, a flag or a fixed word.
 */

import type { Answers, Rating } from '../types'

/** The owner flips this once `/api/events` is live (§9); until then no event is ever sent and setup never asks. */
export const TELEMETRY_ENABLED = false

/** Every event and its properties, exactly (the site's `validateEvent` holds the same list). */
export type TelemetryEvent =
  | {
      event: 'setup_completed'
      properties: {
        template: Answers['template'] | 'quick'
        goal: Answers['goal']
        hasDumbbells: boolean
        hasBar: boolean
        hasBands: boolean
        setting: Answers['setting']
        level: Answers['level']
        daysPerWeek: number
        scheduleKind: 'days' | 'everyNDays'
        size: Answers['size']
        weeks: number
        cueEvery: string
        idleReminder: string
      }
    }
  | { event: 'plan_imported'; properties: { workouts: number } }
  | { event: 'cue_shown'; properties: Record<string, never> }
  | { event: 'set_finished'; properties: { result: 'done' | 'skip'; week: number; ratio?: number } }
  | { event: 'workout_rated'; properties: { rating: Rating } }
  | { event: 'ask_answered'; properties: { answer: 'start' | 'half' | 'no' | 'later' } }
  | { event: 'cue_later'; properties: Record<string, never> }
  | { event: 'workout_completed'; properties: { workout: number } }
  | { event: 'plan_completed'; properties: { workouts: number } }
  | { event: 'week_shared'; properties: { sets: number; hours: number } }
  | { event: 'rank_up'; properties: { rank: string } }
  | { event: 'easter_egg'; properties: { command: 'flex' | 'protein' | 'wisdom' | 'swolomon' } }
  | { event: 'feat'; properties: { id: string } }

/** The JSON an event POSTs to `TELEMETRY_URL`: no personal field, the install's random id alone. */
export const telemetryPayload = (e: TelemetryEvent, installId: string, pluginVersion: string) => ({
  event: e.event,
  distinct_id: installId,
  properties: { ...e.properties, plugin_version: pluginVersion },
})

/** A done set's count against its target, to the nearest tenth; absent when either is missing. */
export function ratioOf(count: number | undefined, target: number | undefined): number | undefined {
  if (count === undefined || target === undefined || target <= 0) return undefined
  return Math.round((count / target) * 10) / 10
}

/** The answers setup sends, nothing typed by the person among them. */
export function setupProperties(answers: Answers, opts: { isQuickStart: boolean; cueEvery: string; idleReminder: string }): Extract<TelemetryEvent, { event: 'setup_completed' }>['properties'] {
  return {
    template: opts.isQuickStart ? 'quick' : answers.template,
    goal: answers.goal,
    hasDumbbells: answers.equipment.dumbbells,
    hasBar: answers.equipment.bar,
    hasBands: answers.equipment.bands,
    setting: answers.setting,
    level: answers.level,
    daysPerWeek: answers.daysPerWeek,
    scheduleKind: 'days' in answers.schedule ? 'days' : 'everyNDays',
    size: answers.size,
    weeks: answers.weeks,
    cueEvery: opts.cueEvery,
    idleReminder: opts.idleReminder,
  }
}
