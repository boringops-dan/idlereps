/**
 * Swolomon is one person (owner, 2026-10-12: "Dp you think we can limit Swolomon to showing up in one agent
 * window at a time? Or maybe he'll spend one minute in one session, dismiss and then go into a different
 * window looking for the user?"): what he raises unasked shows in one session at a time. Unanswered for a
 * minute, he goes looking in another session whose agent is working; with none, he stays. Pure.
 */

/** How long he waits in a session for an answer before looking elsewhere. */
export const VISIT_MS = 60_000

/** A session's agent counts as working this long after it last said so (a session that closed mid-turn). */
export const WORKING_FRESH_MS = 3 * 60_000

/** Sessions kept in the working list. */
export const WORKING_CAP = 20

/**
 * Where he is: the session he is visiting, until when; or, just after he left one (`left`), until when the
 * other sessions get the first look.
 */
export type Visit = { session: string | null; until: number; left?: string }

/** Sessions whose agent is working, by id: when each last said so. */
export type Working = Record<string, number>

export const NO_VISIT: Visit = { session: null, until: 0 }

/** Whether another session's agent is working now. */
export const othersWorking = (working: Working, session: string, now: number): boolean =>
  Object.entries(working).some(([id, at]) => id !== session && now - at < WORKING_FRESH_MS)

/**
 * Whether he may show up in `session` now: he is here already, or nowhere, and not just gone looking elsewhere.
 * He goes where they prompted last first, while its agent works; only once he left it unanswered (or it is
 * idle) does another session get him.
 */
export function mayVisit(visit: Visit, session: string, now: number, working: Working, lastPrompt?: { session: string }): boolean {
  if (visit.session === session) return true
  if (visit.session !== null && visit.until > now) return false
  if (visit.left === session && visit.until > now && othersWorking(working, session, now)) return false
  const where = lastPrompt?.session
  const isWhereTheyAre = where === undefined || where === session || visit.left === where || !isFresh(working, where, now)
  return isWhereTheyAre
}

/** Whether `session`'s agent is working now. */
const isFresh = (working: Working, session: string, now: number): boolean => {
  const at = working[session]
  return at !== undefined && now - at < WORKING_FRESH_MS
}

/**
 * The session he is in: the one he is visiting, else the one they prompted in last (where they are), else any
 * (none prompted yet). Only there does he show in the footer (owner, 2026-10-12: "I still see mutliple
 * swolomons?").
 */
export function isHisSession(visit: Visit, lastPrompt: { session: string } | undefined, session: string, now: number): boolean {
  if (visit.session !== null && visit.until > now) return visit.session === session
  return lastPrompt === undefined || lastPrompt.session === session
}

/** He shows up in `session`, for a minute. */
export const arrive = (session: string, now: number): Visit => ({ session, until: now + VISIT_MS })

/** He left `session` unanswered: the others get the next minute. */
export const leave = (session: string, now: number): Visit => ({ session: null, until: now + VISIT_MS, left: session })

/** The working list with `session` working now (or not any more), stale and surplus sessions dropped. */
export function withWorking(working: Working, session: string, now: number, isWorking: boolean): Working {
  const fresh = Object.entries(working).filter(([id, at]) => id !== session && now - at < WORKING_FRESH_MS)
  const kept = fresh.sort((a, b) => b[1] - a[1]).slice(0, WORKING_CAP - 1)
  return Object.fromEntries(isWorking ? [[session, now], ...kept] : kept)
}
