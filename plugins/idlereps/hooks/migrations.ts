/**
 * Stored data has a version (D18, plan §1.12 item 6): `schemaVersion` and one step per version, each
 * idempotent. The only way a stored shape changes. Pure: a step maps the keys it reads to the keys it writes.
 */

import type { HistoryEntry, Progress, Targets } from '../types'
import type { StoreKey } from '../types/store-keys'
import { dayNumberOf } from './plan'

export const CURRENT_SCHEMA = 1

/** What a step reads: every key it names, as stored (absent keys missing). */
export type Snapshot = Partial<Record<StoreKey | 'log' | 'weights', unknown>>
/** What a step does: keys to write and keys to delete. */
export type Change = { set: Partial<Record<StoreKey, unknown>>; remove: ('log' | 'weights')[] }

type LegacyEntry =
  | { kind: 'set'; t: number; workout: number; exercise: string; set: number; target: string; result: 'done' | 'skip'; count?: number; weight?: number }
  | { kind: 'rating'; t: number; workout: number; rating: 'easy' | 'good' | 'tough' }

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

/** 0 → 1: the prototype's `log` into `history`, `weights` into `targets[name].weight`, its progress shape. */
function toV1(snapshot: Snapshot): Change {
  const change: Change = { set: {}, remove: [] }
  if (Array.isArray(snapshot.log)) {
    const history = Array.isArray(snapshot.history) ? (snapshot.history as HistoryEntry[]) : []
    const converted = (snapshot.log as LegacyEntry[]).map((entry): HistoryEntry => {
      const d = dayNumberOf(entry.t)
      if (entry.kind === 'rating') return { kind: 'rating', t: entry.t, d, w: entry.workout, rating: entry.rating }
      return {
        kind: 'set',
        t: entry.t,
        d,
        w: entry.workout,
        exercise: entry.exercise,
        set: entry.set,
        target: entry.target,
        result: entry.result,
        ...(entry.count === undefined ? {} : { count: entry.count }),
        ...(entry.weight === undefined ? {} : { weight: entry.weight }),
      }
    })
    change.set.history = [...converted, ...history].slice(-5000)
    change.remove.push('log')
  }
  if (isObject(snapshot.weights)) {
    const targets: Targets = isObject(snapshot.targets) ? { ...(snapshot.targets as Targets) } : {}
    for (const [name, weight] of Object.entries(snapshot.weights)) {
      if (typeof weight !== 'number') continue
      const target = targets[name]
      targets[name] = target === undefined ? { reps: 0, weight, belowStreak: 0, toughStreak: 0 } : { ...target, weight }
    }
    change.set.targets = targets
    change.remove.push('weights')
  }
  if (isObject(snapshot.progress) && 'day' in snapshot.progress) {
    const old = snapshot.progress as { day: number; done: number; finishedOnDay: number | null }
    const progress: Progress = { workout: old.day, done: old.done, lastCompletedOn: old.finishedOnDay, extraDay: null }
    change.set.progress = progress
  }
  change.set.schemaVersion = 1
  return change
}

/** STEPS[v] takes the store from version v to v + 1. */
export const STEPS: readonly ((snapshot: Snapshot) => Change)[] = [toV1]

/** The keys a step reads. */
export const STEP_READS: readonly (readonly (StoreKey | 'log' | 'weights')[])[] = [['log', 'weights', 'history', 'targets', 'progress']]
