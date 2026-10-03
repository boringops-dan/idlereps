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
  { key: 'easyDay', shape: 'local day number the gap is doubled on (a busy day)', inBackup: false },
] as const satisfies readonly StoreKeyInfo[]

export type StoreKey = (typeof STORE_KEYS)[number]['key']

export const isStoreKey = (key: string): key is StoreKey => STORE_KEYS.some(info => info.key === key)
