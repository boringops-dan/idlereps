/**
 * The person's data (plan §1.12 item 5, Task 14): the history as CSV, and the backup that moves progress
 * to another machine or brings it back after an erase. Pure: the hooks read and write the files.
 */

import type { HistoryEntry, Plan } from '../types'
import { STORE_KEYS } from '../types/store-keys'
import type { StoreKey } from '../types/store-keys'

export const dataDirOf = (home: string) => `${home}/.claude/idlereps`
export const csvPathOf = (home: string) => `${dataDirOf(home)}/history.csv`
export const backupPathOf = (home: string) => `${dataDirOf(home)}/backup.json`

/** The keys a backup holds, and restore writes or deletes. */
export const BACKUP_KEYS: readonly StoreKey[] = STORE_KEYS.filter(info => info.inBackup).map(info => info.key)

/** One CSV field, quoted when it has to be (RFC 4180). */
const field = (value: string | number | undefined): string => {
  const text = value === undefined ? '' : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

/** A local day number as an ISO date. */
const isoDate = (day: number): string => new Date(day * 86_400_000).toISOString().slice(0, 10)

/** Every set in the history, one row each: done, skipped and bonus sets alike. */
export function historyCsv(history: readonly HistoryEntry[], plan: Plan | null): string {
  const rows = ['date,workout,exercise,set,target,result,count,weight,unit,band']
  for (const e of history) {
    if (e.kind !== 'set') continue
    const workout = plan?.workouts[e.w]
    const planned = workout?.exercises.find(x => x.name === e.exercise)
    const unit = e.weight === undefined ? undefined : planned?.weight?.unit
    rows.push([isoDate(e.d), workout?.name, e.exercise, e.set === 0 ? 'bonus' : e.set, e.target, e.result, e.count, e.weight, unit, e.band].map(field).join(','))
  }
  return `${rows.join('\r\n')}\r\n`
}

export type Backup = { schemaVersion: number; exportedAt: number; store: Partial<Record<StoreKey, unknown>> }

/** The backup of the stored values given. */
export function backupOf(values: Partial<Record<StoreKey, unknown>>, schemaVersion: number, now: number): Backup {
  const store: Partial<Record<StoreKey, unknown>> = {}
  for (const key of BACKUP_KEYS) if (values[key] !== undefined) store[key] = values[key]
  return { schemaVersion, exportedAt: now, store }
}

/** A backup file read back, or why it cannot be used. Unknown keys are refused, not ignored. */
export function parseBackup(text: string): { backup: Backup } | { error: string } {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { error: 'it is not JSON' }
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return { error: 'it is not a backup' }
  const { schemaVersion, exportedAt, store } = raw as Record<string, unknown>
  if (typeof schemaVersion !== 'number' || typeof exportedAt !== 'number') return { error: 'it has no version or date' }
  if (typeof store !== 'object' || store === null || Array.isArray(store)) return { error: 'it has no data' }
  for (const key of Object.keys(store)) {
    if (!BACKUP_KEYS.includes(key as StoreKey)) return { error: `it has an unknown key "${key}"` }
  }
  return { backup: { schemaVersion, exportedAt, store: store as Backup['store'] } }
}
