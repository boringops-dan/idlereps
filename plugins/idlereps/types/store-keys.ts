/**
 * The store keys registry (plan §4.2): the single list of every `$.store` key. Backup and erase iterate it,
 * the budget test fills every cap, and reading or writing a key not listed here fails a test.
 */

export type StoreKeyInfo = {
  key: string
  /** What it holds, in words. */
  shape: string
  /** The most entries it keeps, for lists and maps that grow. */
  cap?: number
  /** Whether backup and restore carry it. */
  inBackup: boolean
}

export const STORE_KEYS = [
  { key: 'schemaVersion', shape: 'number (D18)', inBackup: true },
  { key: 'progress', shape: 'Progress', inBackup: true },
  { key: 'history', shape: 'HistoryEntry[]', cap: 5000, inBackup: true },
  { key: 'targets', shape: 'Targets', inBackup: true },
  { key: 'lastByExercise', shape: 'LastByExercise', inBackup: true },
  { key: 'totalDoneSets', shape: 'number', inBackup: true },
  { key: 'undo', shape: 'the record reducer inverse, under 4 KiB', inBackup: false },
  { key: 'nextCueAt', shape: 'epoch ms: the gap (D7)', inBackup: false },
  { key: 'startedOn', shape: 'local day number (D15)', inBackup: true },
  { key: 'declinedOn', shape: 'local day number (D15)', inBackup: true },
  { key: 'paused', shape: 'boolean', inBackup: true },
  { key: 'planStartedOn', shape: 'local day number: when the current plan was written', inBackup: true },
  { key: 'agentBeat', shape: '{ day, n } (§1.13.2)', inBackup: false },
  { key: 'seen', shape: 'Seen: the once ledger', inBackup: true },
  { key: 'declines', shape: 'local day numbers Not today was said on', cap: 60, inBackup: true },
  { key: 'laterStreak', shape: '{ day, n }: Laters in a row today', inBackup: false },
  { key: 'workIntervals', shape: 'WorkIntervals: each local day\'s merged turn intervals (§1.9)', cap: 14, inBackup: false },
  { key: 'installId', shape: 'a random UUID: the anonymous id telemetry and feedback carry (D9)', inBackup: false },
  { key: 'moves', shape: "Swolomon's moves unlocked, by id, in the order they came: never more than there are", cap: 120, inBackup: true },
  { key: 'mode', shape: "Mode: 'remind' for Just remind me, absent with a plan", inBackup: true },
  { key: 'easyDay', shape: 'local day number the gap is doubled on (a busy day)', inBackup: false },
  { key: 'turnLengths', shape: 'ms of the last turns 30 s or longer, oldest first: the usual wait (hooks/waits.ts)', cap: 30, inBackup: false },
  { key: 'lastSeenOn', shape: 'local day number of the last session start: the day\'s hello (hooks/greeting.ts)', inBackup: false },
  { key: 'about', shape: "About: Swolomon's questions, answered by option index or 'pass' (hooks/questions.ts)", cap: 20, inBackup: true },
  { key: 'prep', shape: "Prep: Swolomon's competition prep and medals (hooks/prep.ts)", inBackup: true },
  { key: 'misreadsSeen', shape: 'times Swolomon said each reading of the agent, by id (hooks/misreads.ts)', cap: 60, inBackup: true },
  { key: 'shinies', shape: 'shiny Swolomons seen (hooks/shiny.ts)', inBackup: true },
  { key: 'highFives', shape: 'high fives with Swolomon', inBackup: true },
  { key: 'spots', shape: 'times they spotted Swolomon through his last rep', inBackup: true },
  { key: 'punchCard', shape: 'PunchCard: the days stamped and the shakes earned (hooks/punch.ts)', inBackup: true },
  { key: 'gyms', shape: 'project folder names Swolomon has seen them in: a new one is a new gym', cap: 50, inBackup: false },
  { key: 'callTimes', shape: 'CallTimes: how long each kind of call took here, learned (hooks/durations.ts)', cap: 200, inBackup: false },
  { key: 'attention', shape: 'Attention: his bands answered or ignored lately, and the extras spent today (hooks/attention.ts)', cap: 20, inBackup: false },
] as const satisfies readonly StoreKeyInfo[]

export type StoreKey = (typeof STORE_KEYS)[number]['key']

export const isStoreKey = (key: string): key is StoreKey => STORE_KEYS.some(info => info.key === key)
