/**
 * The agent's working time, for sharing the week (plan §1.9): every turn's wall-clock interval, merged per
 * local day so parallel sessions never double-count. Pure.
 */

/** Each local day's merged intervals, `[startMs, endMs]`, sorted. Store key `workIntervals`. */
export type WorkIntervals = { [day: string]: [number, number][] }

/** Days kept, counting back from the newest. */
export const KEEP_DAYS = 14

/** Merges one interval into a day's sorted list: overlapping or touching intervals become one. */
function mergeInto(list: readonly [number, number][], add: [number, number]): [number, number][] {
  const all = [...list, add].sort((a, b) => a[0] - b[0])
  const merged: [number, number][] = []
  for (const [start, end] of all) {
    const last = merged.at(-1)
    if (last !== undefined && start <= last[1]) last[1] = Math.max(last[1], end)
    else merged.push([start, end])
  }
  return merged
}

/**
 * Adds `[startMs, endMs]`, split at local midnight (`dayOf` names a moment's local day, `startOfDay` that
 * day's first moment), and drops days older than `KEEP_DAYS` from the newest.
 */
export function addInterval(
  map: WorkIntervals,
  startMs: number,
  endMs: number,
  dayOf: (ms: number) => number,
  startOfDay: (day: number) => number,
): WorkIntervals {
  if (!(endMs > startMs)) return map
  const next: WorkIntervals = { ...map }
  for (let day = dayOf(startMs); day <= dayOf(endMs - 1); day += 1) {
    const from = Math.max(startMs, startOfDay(day))
    const to = Math.min(endMs, startOfDay(day + 1))
    if (to > from) next[String(day)] = mergeInto(next[String(day)] ?? [], [from, to])
  }
  const newest = Math.max(...Object.keys(next).map(Number))
  for (const key of Object.keys(next)) if (Number(key) <= newest - KEEP_DAYS) delete next[key]
  return next
}

/** The merged working time from `fromDay` to `toDay`, both included. */
export function workedMs(map: WorkIntervals, fromDay: number, toDay: number): number {
  let total = 0
  for (const [key, list] of Object.entries(map)) {
    const day = Number(key)
    if (day < fromDay || day > toDay) continue
    for (const [start, end] of list) total += end - start
  }
  return total
}

/** `6 h 12 m`; under an hour `42 m`. */
export function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 60) return `${minutes} m`
  return `${Math.floor(minutes / 60)} h ${minutes % 60} m`
}

/** The one line `/workout share` copies (§1.9): no exercise, plan, project or prompt in it. */
export function shareLine(worked: number, sets: number, rank: string): string {
  return `This week my agent worked ${formatDuration(worked)} while I did ${sets === 1 ? '1 set' : `${sets} sets`}. Rank: ${rank}. idlereps.app`
}
