import { atom, read, update } from 'claude-code'
import type { ElementTable, EngineInterface, PluginOptions, Register, RenderSurface, Timer } from 'claude-code'

import type { Answers, BandKind, BandPart, BandSpec, Cue, Draft, HistoryEntry, LongTaskReason, Mode, Moved, Plan, Progress, Rating, Seen, SetupState, Targets, Tone, Weekday } from '../types'
import { STORE_KEYS } from '../types/store-keys'
import type { StoreKey } from '../types/store-keys'
import { ACTIONS, actionOf, loadLabel, stepperLabel } from './actions'
import type { ActionKind } from './actions'
import {
  askBand,
  BAND_PRIORITY,
  askLineId,
  bandRows,
  cueLineContext,
  duringSetLineId,
  firstSetLineId,
  editBand,
  flexBand,
  introBand,
  readyBand,
  nudgeBand,
  programBand,
  byoplanBand,
  remindBand,
  eraseBand,
  programEndBand,
  restoreBand,
  warmupBand,
  bonusBand,
  prepBand,
  questionBand,
  stillBand,
  stretchBand,
  whereBand,
  rescheduleBand,
  holdBand,
  LOGGED_MS,
  highFiveOf,
  pressCelebration,
  loggedBand,
  nextFromPending,
  offerToSlot,
  pulseBand,
  rankupBand,
  showOffBand,
  spotMeBand,
  unlockBand,
  ratingBand,
  replayBand,
  setBand,
} from './bands'
import { celebrationById, celebrationFor, HIGH_FIVE, isTooSlow } from './celebrate'
import { agentDoing, COACH_NAME, emphasisRuns, fill, plainOf, pickAddress, COMMUNITY_URL, FEEDBACK_URL, line, progressDots, REASON_LINE, TELEMETRY_URL, usesAgent, whatsNewLine } from './copy'
import type { LineContext, LineId } from './copy'
import { appendHistory, daysShowedUp, isMovement, movedSeconds, rankFor, RANKS, setsThisWeek } from './history'
import { dailyTarget, ideasFor, isMoved, MOVED, movedOn, movesOn } from './remind'
import { sittingMs, STILL_MS } from './still'
import { expectedWaitMs, keptTurns, waitSize } from './waits'
import { greetingOf } from './greeting'
import { asidesAllowed, engagementOf, extrasCap, recordOutcome, spend, START_ATTENTION } from './attention'
import type { Attention, Chat } from './attention'
import { EMPTY_CARD, stamp } from './punch'
import type { PunchCard } from './punch'
import { isShinyAt, SHINY_COLOURS } from './shiny'
import { afterSet, compete, competitionOf } from './prep'
import type { Prep } from './prep'
import { ANSWER_IDS, nextQuestion, recallFor } from './questions'
import type { About } from './questions'
import { ASIDE_GAP, ASIDE_MS, ASIDES, asideSpot, asideText, hasAsides } from './asides'
import { collected, dueUnlock, setsForUnlock, setsToNext, STARTER_MOVES, UNLOCK_ORDER } from './collection'
import { due, mark, mondayOf } from './ledger'
import type { Scope } from './ledger'
import { CURRENT_SCHEMA, STEP_READS, STEPS } from './migrations'
import type { Snapshot } from './migrations'
import {
  cueFor,
  dayNumberOf,
  describeAmount,
  minutesWords,
  hourOf,
  legacyPathOf,
  parseLegacyPlan,
  parsePlan,
  PLAN_PROMPT,
  planPathOf,
  shortWorkoutName,
  START,
  stepBand,
  stepCount,
  stepsFor,
  startOfDayMs,
  stepsOf,
  effectiveExercise,
  targetFor,
  stepWeight,
  stripFence,
  targetOf,
  weekProgress,
} from './plan'
import { drawMicro, MICRO_HEIGHT, MICRO_WIDTH } from './figure'
import { misreadOf, saysOf } from './misreads'
import type { Misread } from './misreads'
import { drawMove, GESTURES, moveById, moveForExercise, MOVES, poseAt } from './moves'
import type { Move } from './moves'
import {
  encodeCells,
  encodeMicro,
  encodeMove,
  encodeSprite,
  ENTRANCE_MS,
  entranceAt,
  fitPortrait,
  frameAt,
  idleBeat,
  idleWait,
  frameFor,
  PORTRAIT_GAP,
  portraitCells,
  recolour,
  STAGE_COLUMNS,
  SVG_PIXELS,
  svgOf,
  STAGE_ROWS,
  stageCells,
  TICK_MS,
  timelineOf,
  walkGrid,
  BLINK_MS,
} from './portrait'
import { bandFilmSvg } from './film'
import { PEEK_AWAKE_MS, peekChangeIn, peekGrid, PEEK_POSES, peekText, PEEK_WIDTH } from './peek'
import type { PeekPose } from './peek'
import type { Fit, IdleBeat, IdleStep, Pose, PortraitSize, Timeline, Walk } from './portrait'
import { backupOf, BACKUP_KEYS, backupPathOf, csvPathOf, historyCsv, parseBackup } from './data'
import { PUSH_NAMES, STARTER_ANSWERS, generateProgram, stretchFor } from './programs'
import { addInterval, shareLine, workedMs } from './worktime'
import type { WorkIntervals } from './worktime'
import { raisedTargets, record } from './record'
import type { Feat, Inverse, Patch, RecordStore } from './record'
import {
  cueAllowed,
  cueDelayMs,
  gate,
  inQuietHours,
  isTrainingDay,
  longDayName,
  moveWeekday,
  nextTrainingDay,
  rescheduleOffer,
  weekdayLongName,
  weekdayName,
  weekdayShortName,
} from './schedule'
import type { CueContext, Message } from './schedule'
import {
  back,
  continueEquipment,
  EXAMPLE_PLAN,
  newSetup,
  planOf,
  scheduleLabel,
  screenOf,
  setUnit,
  toggleEquipment,
} from './setup'
import { BIG_ASK_WAIT_MS, factsOf, isBigAsk, outcomeOf, SLOW_STEP_MS, STRONG_SIGN_DELAY_MS, toolSign, turnOutcome, waitWords } from './signals'
import type { Outcome, Sign } from './signals'
import { cutFeedback, FEEDBACK_MAX, feedbackPayload } from './feedback'
import type { PulseAnswer } from './feedback'
import { ratioOf, setupProperties, TELEMETRY_ENABLED, telemetryPayload } from './telemetry'
import type { TelemetryEvent } from './telemetry'
import { gainsOf, PLUGIN_VERSION, remindLineOf, remindTextOf, remindViewOf, statusLineOf, statusTextOf, statusViewOf } from './status'
import { SPRITE } from './swolomon-sprite'
import type { RemindFacts, StatusFacts } from './status'

const band = atom({ plugin: 'idlereps', key: 'band' } as const, null)
const pending = atom({ plugin: 'idlereps', key: 'pending' } as const, [])
const setup = atom({ plugin: 'idlereps', key: 'setup' } as const, null)
const statusView = atom({ plugin: 'idlereps', key: 'statusView' } as const, null)
const talk = atom({ plugin: 'idlereps', key: 'talk' } as const, null)
const peek = atom({ plugin: 'idlereps', key: 'peek' } as const, null)

const SETUP_PANE = 'workout-setup'
const STATUS_PANE = 'workout-status'
/** The band, as a pane, where no attached surface draws the band above the prompt. */
const BAND_PANE = 'workout-band'
/** D8: the model `/workout plan` uses. */
const PLAN_MODEL = 'claude-haiku-4-5-20251001'

type Options = {
  cueEvery: string
  cueAfter: string
  idleReminder: string
  quietHours: string
  statusLine: boolean
  coachAnimation: boolean
  timerBeep: boolean
  warmUp: boolean
  coachSound: 'off' | 'blips' | 'voice'
  /** How much Swolomon says beyond the workout (hooks/attention.ts). */
  coachChat: Chat
  telemetry: boolean
}

const readOptions = (options: PluginOptions): Options => ({
  cueEvery: typeof options.cueEvery === 'string' ? options.cueEvery : '15',
  cueAfter: typeof options.cueAfter === 'string' ? options.cueAfter : '60',
  idleReminder: typeof options.idleReminder === 'string' ? options.idleReminder : '60',
  quietHours: typeof options.quietHours === 'string' ? options.quietHours : 'off',
  statusLine: typeof options.statusLine === 'boolean' ? options.statusLine : true,
  coachAnimation: typeof options.coachAnimation === 'boolean' ? options.coachAnimation : true,
  timerBeep: typeof options.timerBeep === 'boolean' ? options.timerBeep : true,
  warmUp: typeof options.warmUp === 'boolean' ? options.warmUp : true,
  coachSound: options.coachSound === 'blips' || options.coachSound === 'voice' ? options.coachSound : 'off',
  coachChat: options.coachChat === 'chatty' || options.coachChat === 'quiet' ? options.coachChat : 'adaptive',
  telemetry: options.telemetry === true,
})

/** The portrait's frames as Raster cells, encoded once per load. */
const FRAMES = encodeSprite(SPRITE)
/** The same frames as SVG documents, for surfaces without terminal cells. */
const SVGS = Object.fromEntries((Object.keys(SPRITE.frames) as (keyof typeof SPRITE.frames)[]).map(name => [name, svgOf(SPRITE, name)])) as Record<
  keyof typeof SPRITE.frames,
  string
>
const PORTRAIT_ROWS = SPRITE.height / 2
/** Every move's poses as full-portrait cells, encoded once per load. */
const MOVE_CELLS: Record<string, string[]> = Object.fromEntries([...MOVES, ...GESTURES].map(move => [move.id, encodeMove(SPRITE, move.id, drawMove(move))]))
/** The exercise moves drawn tiny, for beside a set (3 rows), encoded once per load. */
const MICRO_CELLS: Record<string, string[]> = Object.fromEntries(
  MOVES.filter(move => move.family === 'exercise').map(move => [move.id, encodeMicro(SPRITE, move.id, move.poses.map(drawMicro), MICRO_WIDTH, MICRO_HEIGHT)]),
)
const MICRO_ROWS = MICRO_HEIGHT / 2

/** The tiny Swolomon beside a set nobody speaks on: the exercise's move, if it has one (§1.11 Moves). */
function microMoveOf(spec: BandSpec): Move | undefined {
  if (spec.kind !== 'set' || spec.coach !== undefined || spec.cue === undefined) return undefined
  const id = moveForExercise(spec.cue.exercise.name)
  return id === null || MICRO_CELLS[id] === undefined ? undefined : moveById(id)
}

/** The theme's own colours for each tone, so light and dark themes both read (muted is the dim style). */
const TONE_COLOUR: Record<Exclude<Tone, 'muted'>, string> = { accent: 'warning', good: 'success', aside: 'suggestion' }

type Owner = 'band' | 'turn' | 'session' | 'pane' | 'peek'

/** Per-load state; a hot reload starts it over (timers go with the old environment). */
const coach: {
  options: Options
  home: string
  planCache: { key: string; plan: Plan | null; error: string | null } | null
  /** The broken plan file already toasted about, by size and time (§1.7 ease 8). */
  brokenKey: string | null
  timers: Record<Owner, Timer[]>
  cueTimer: Timer | null
  idleTimer: Timer | null
  midnightTimer: Timer | null
  isTurnRunning: boolean
  turnStartedAt: number
  /** Decided at turn.start (D21): with no chance of a cue this turn, the tool hook does nothing. */
  turnCanCue: boolean
  toolCalls: number
  hasStrongSign: boolean
  reason: LongTaskReason | undefined
  /** How long the agent said it will be away this turn (a scheduled wake-up), when it said. */
  waitMs: number | undefined
  /** TaskCreate calls this turn: three is a planned job. */
  tasksThisTurn: number
  /** Swolomon's line while a hold counts down. */
  holdLine: string
  /** The band's whole line, for reading aloud; and whether a reading is still going. */
  talkText: string
  isSpeaking: boolean
  /** Today's tally in the prompt footer (`💪 3/9`), or nothing. */
  tally: string | undefined
  /** Today's workout is under way: started, not finished (the spinner lifts). */
  isMidWorkout: boolean
  /** Sets done during the running turn, and during each finished turn of the session by its length. */
  turnSets: number
  /** What the agent got done this turn worth a word (tests, a commit, a PR), and each finished turn's by its length. */
  turnOutcome: Outcome | undefined
  setsByTurnLength: Map<number, { sets: number; outcome?: Outcome; misread?: Misread }>
  /** Swolomon reads what the agent does this turn (a plan, not paused, not quiet hours): his reading of the call running, and the turn's latest. */
  turnCanMisread: boolean
  callMisread: Misread | null
  turnMisread: Misread | null
  /** This turn may offer the rest day's desk stretch (instead of a set). */
  turnCanStretch: boolean
  /** No plan yet: this turn may ask once more to get started. */
  turnCanNudge: boolean
  /** Just remind me: this turn may remind, or ask what they trained. */
  turnCanRemind: boolean
  /** This turn may ask them to stand up: sitting a long while (hooks/still.ts). */
  turnCanStill: boolean
  /** A band he raised unasked, still showing: answered or ignored when it goes (hooks/attention.ts). */
  unprompted: BandSpec | null
  /** A press or a /workout command is being handled: a band leaving now was answered. */
  isAnswering: boolean
  /** The band showing is a shiny one (hooks/shiny.ts): every blit to its portrait recoloured. */
  isShiny: boolean
  /** A where-am-I toast on its way, so a burst of redraws sends one. */
  isLookingForRoom: boolean
  /** The set band's own move, for his set beats; undefined on any other band. */
  setMove: string | undefined
  /** When the pending cue fires; null with none pending. */
  cueDueAt: number | null
  /** The peek: where it is drawn, the pose it shows, and whether its loop is running. */
  peekAt: string | null
  /** The eyes last blitted, so a redraw shows them where they are. */
  peekCells: string | null
  /** The running eye loop's number (null: none), and the count they are numbered by. */
  peekLoop: number | null
  peekSeq: number
  isPeekNear: boolean
  /** Until when he stays awake with no turn running; then he dozes, eyes shut, until the next turn. */
  peekAwakeUntil: number
  peekTextTimer: Timer | null
  /** A timer band waiting for the prompt to empty (the gate's clause (c)). */
  deferred: BandSpec | null
  /** The first-run band was put off for this session (Not now). */
  isIntroDismissed: boolean
  isStatusOpen: boolean
  /** The band's own pane is open (no attached surface draws the band above the prompt). */
  isBandPaneOpen: boolean
  /** The typewriter (§1.11): the run now playing, when it started, and its timeline. */
  talkSeq: number
  talkStartedAt: number
  talkTimeline: Timeline | null
  /** The move the band's portrait does once the line is out, and its pose as cells while it plays (§1.11 Moves). */
  talkMove: string | undefined
  moveFrame: string | null
  /** The status pane's portrait, where it is drawn, and its pose as cells while a move plays there. */
  panePortrait: string | null
  paneFrame: string | null
  /** The tiny Swolomon beside a set: where drawn, and his pose as cells while he does the exercise. */
  micro: { requestId: string } | null
  microFrame: string | null
  /** Where `/workout flex` is in Swolomon's reel this session. */
  reel: number | null
  /** The install id, read (or made) once a load (see installIdOf). */
  installId: Promise<string> | null
  /** Where the band's portrait is drawn, recorded as it is drawn, so frames can be blitted to it. */
  portrait: { requestId: string; size: PortraitSize } | null
  pose: Pose
  /** The entrance (§1.11 Entrance): when it started, where its stage is drawn (or that the band had no room). */
  entranceStartedAt: number
  stage: { requestId: string } | 'declined' | null
  /** The stage frame last painted, so a tick that changes nothing paints nothing. */
  stageFrame: string
} = {
  options: readOptions({}),
  home: '',
  planCache: null,
  brokenKey: null,
  timers: { band: [], turn: [], session: [], pane: [], peek: [] },
  cueTimer: null,
  idleTimer: null,
  midnightTimer: null,
  isTurnRunning: false,
  turnStartedAt: 0,
  turnCanCue: false,
  toolCalls: 0,
  hasStrongSign: false,
  reason: undefined,
  waitMs: undefined,
  tasksThisTurn: 0,
  holdLine: '',
  talkText: '',
  isSpeaking: false,
  tally: undefined,
  isMidWorkout: false,
  turnSets: 0,
  turnOutcome: undefined,
  setsByTurnLength: new Map(),
  turnCanMisread: false,
  callMisread: null,
  turnMisread: null,
  turnCanStretch: false,
  turnCanNudge: false,
  turnCanRemind: false,
  turnCanStill: false,
  unprompted: null,
  isAnswering: false,
  isShiny: false,
  isLookingForRoom: false,
  setMove: undefined,
  cueDueAt: null,
  peekAt: null,
  peekCells: null,
  peekLoop: null,
  peekSeq: 0,
  isPeekNear: false,
  peekAwakeUntil: 0,
  peekTextTimer: null,
  deferred: null,
  isIntroDismissed: false,
  isStatusOpen: false,
  isBandPaneOpen: false,
  talkSeq: 0,
  talkStartedAt: 0,
  talkTimeline: null,
  talkMove: undefined,
  moveFrame: null,
  panePortrait: null,
  paneFrame: null,
  micro: null,
  microFrame: null,
  reel: null,
  installId: null,
  portrait: null,
  pose: 'idle',
  entranceStartedAt: 0,
  stage: null,
  stageFrame: '',
}

// ---------------------------------------------------------------------------------------------------------
// Timers (plan §4.3 item 3): every timer has an owner; showing or clearing a band cancels the band's, the
// turn's end cancels the turn's.

function timer($: EngineInterface, owner: Owner, ms: number, fn: () => void): Timer {
  const made: Timer = $.clock.after(Math.max(0, ms), () => {
    coach.timers[owner] = coach.timers[owner].filter(t => t !== made)
    fn()
  })
  coach.timers[owner].push(made)
  return made
}

/** A repeating timer, owned like any other; it runs until cancelled or its owner's timers are. */
function ticker($: EngineInterface, owner: Owner, ms: number, fn: (stop: () => void) => void): Timer {
  const made: Timer = $.clock.every(ms, () => fn(stop))
  const stop = () => {
    made.cancel()
    coach.timers[owner] = coach.timers[owner].filter(t => t !== made)
  }
  coach.timers[owner].push(made)
  return made
}

function cancelTimers(owner: Owner) {
  for (const t of coach.timers[owner]) t.cancel()
  coach.timers[owner] = []
}

function stopCue() {
  coach.cueTimer?.cancel()
  coach.cueTimer = null
  coach.cueDueAt = null
}

/** Cues after `ms` this turn, unless one is already pending. */
function scheduleCue($: EngineInterface, ms: number) {
  if (coach.cueTimer !== null) return
  const made = timer($, 'turn', ms, () => {
    coach.cueTimer = null
    coach.cueDueAt = null
    void showDueCue($)
  })
  coach.cueTimer = made
  // The peek counts down to it.
  void (async () => {
    const at = await now($)
    if (coach.cueTimer !== made) return
    coach.cueDueAt = at + ms
    await refreshPeek($)
  })().catch(() => undefined)
}

// ---------------------------------------------------------------------------------------------------------
// The peek (hooks/peek.ts): his eyes above the prompt when nothing else is there.

/** Each peek pose's cells, encoded once per load. */
const PEEK_CELLS = Object.fromEntries(PEEK_POSES.map(pose => [pose, encodeCells(peekGrid(SPRITE, pose))])) as Record<PeekPose, string>

/** Whether he peeks now: approved art, not Quiet, a plan, not paused, onboarded, and the slot empty. */
async function peekWanted($: EngineInterface): Promise<boolean> {
  if (!SPRITE.approved || coach.options.coachChat === 'quiet') return false
  if ((await read($, band)) !== null) return false
  if (await load($, 'paused', false)) return false
  if (await isOnboardingDue($)) return false
  return (await loadPlan($)) !== null
}

/** Shows, updates or hides the peek; his eyes move while he is awake, and he dozes off a while after a turn. */
async function refreshPeek($: EngineInterface) {
  if (!(await peekWanted($))) {
    hidePeek()
    if ((await read($, peek)) !== null) await update($, peek, () => null)
    return
  }
  const at = await now($)
  const isAwake = coach.isTurnRunning || at < coach.peekAwakeUntil
  const next = peekText({ isWorking: coach.isTurnRunning, cueDueAt: coach.cueDueAt, now: at, isDozing: !isAwake })
  const shown = await read($, peek)
  if (shown?.text !== next.text || shown?.isNear !== next.isNear || shown?.isDozing !== next.isDozing) await update($, peek, () => next)
  // One timer for the next time the word changes (a minute ticks over, the set comes near, he dozes off).
  coach.peekTextTimer?.cancel()
  const wait = peekChangeIn({ isWorking: coach.isTurnRunning, cueDueAt: coach.cueDueAt, now: at, awakeUntil: coach.peekAwakeUntil })
  coach.peekTextTimer = wait === null ? null : timer($, 'peek', wait, () => void refreshPeek($))
  coach.isPeekNear = next.isNear
  // Asleep: his eyes shut (drawn from `isDozing`), and the loop that moved them ends.
  if (!isAwake) {
    stopPeekLoop()
    return
  }
  startPeekLoop($)
}

function hidePeek() {
  cancelTimers('peek')
  coach.peekTextTimer = null
  coach.peekAt = null
  stopPeekLoop()
}

function stopPeekLoop() {
  coach.peekLoop = null
  coach.peekCells = null
}

/**
 * His eyes, beat by beat (the idle loop at the mini size, cropped to the peek): blinks and glances; the next
 * set close, he stares at you between blinks. Once it is drawn, and only while animated.
 */
function startPeekLoop($: EngineInterface) {
  if (coach.peekLoop !== null || coach.peekAt === null || !coach.options.coachAnimation) return
  const seq = ++coach.peekSeq
  coach.peekLoop = seq
  idleLoop($, 'peek', {
    size: () => (coach.peekAt === null ? undefined : 'mini'),
    isWin: false,
    alive: () => coach.peekLoop === seq,
    blit: cells => void blitPeek($, cells),
    beatOf: n => (coach.isPeekNear ? { wait: idleWait(n), steps: [{ pose: 'blink', ms: BLINK_MS }], rest: 'lookYou' } : idleBeat(n, 'mini')),
    cellsOf: (pose: Pose) => PEEK_CELLS[pose as PeekPose] ?? PEEK_CELLS.idle,
  })
}

async function blitPeek($: EngineInterface, cells: string) {
  coach.peekCells = cells
  if (coach.peekAt === null) return
  await $.ui.blit({ requestId: coach.peekAt, key: 'swolomon-eyes', cells, columns: PEEK_WIDTH, rows: 1 }).catch(() => undefined)
}

/** The peek drawn above the prompt: his brows and eyes, and the word beside them. Terminal only. */
async function drawPeek($: EngineInterface, surface: RenderSurface, requestId: string, elements: ElementTable) {
  if (surface !== 'terminal' || !('Raster' in elements)) return null
  const shown = await read($, peek)
  if (shown === null) return null
  const { Box, Raster, Text } = elements
  coach.peekAt = requestId
  if (!shown.isDozing) startPeekLoop($)
  const cells = shown.isDozing ? PEEK_CELLS.blink : (coach.peekCells ?? PEEK_CELLS[shown.isNear ? 'lookYou' : 'idle'])
  return (
    <Box flexDirection="row">
      <Raster key="swolomon-eyes" columns={PEEK_WIDTH} rows={1} cells={cells} />
      {shown.text === '' ? null : <Box key="peek-gap" width={2} />}
      {shown.text === '' ? null : (
        <Text key="peek-text" dimColor>
          {shown.text}
        </Text>
      )}
    </Box>
  )
}

// ---------------------------------------------------------------------------------------------------------
// The store: every key registered (types/store-keys.ts).

async function load<T>($: EngineInterface, key: StoreKey, fallback: T): Promise<T> {
  const value = await $.store.get(key)
  return value === undefined ? fallback : (value as T)
}

async function save($: EngineInterface, key: StoreKey, value: unknown) {
  if (value === undefined) await $.store.delete(key)
  else await $.store.set(key, value)
}

async function now($: EngineInterface) {
  return $.clock.now()
}

async function today($: EngineInterface) {
  return dayNumberOf(await $.clock.now())
}

/** The gap between sets (D7): the setting, doubled on a busy day (three Laters in a row). */
async function gapMs($: EngineInterface): Promise<number> {
  const base = Number(coach.options.cueEvery) * 60_000
  return (await load<number | undefined>($, 'easyDay', undefined)) === (await today($)) ? base * 2 : base
}
const turnWaitMs = (isBig: boolean) => (isBig ? BIG_ASK_WAIT_MS : Number(coach.options.cueAfter) * 1000)

/** The once ledger: whether `id` may happen now, and marking it. */
async function isDue($: EngineInterface, id: string, scope: Scope) {
  return due(await load<Seen>($, 'seen', {}), id, scope, await now($), dayNumberOf)
}

async function markSeen($: EngineInterface, id: string) {
  await save($, 'seen', mark(await load<Seen>($, 'seen', {}), id, await now($)))
}

/** D18: every step from the stored version up to the current one; a newer store is left alone. */
async function migrate($: EngineInterface): Promise<'fresh' | 'current' | 'newer'> {
  const stored = await $.store.get('schemaVersion')
  const version = typeof stored === 'number' ? stored : 0
  if (version > CURRENT_SCHEMA) return 'newer'
  // No recorded version: this plugin never ran on this machine (a prototype store is another plugin's).
  const isFresh = stored === undefined
  for (let v = version; v < CURRENT_SCHEMA; v += 1) {
    const step = STEPS[v]
    if (step === undefined) break
    const snapshot: Snapshot = {}
    for (const key of STEP_READS[v] ?? []) {
      const value = await $.store.get(key)
      if (value !== undefined) snapshot[key] = value
    }
    const change = step(snapshot)
    for (const [key, value] of Object.entries(change.set)) await save($, key as StoreKey, value)
    for (const key of change.remove) await $.store.delete(key)
  }
  return isFresh ? 'fresh' : 'current'
}

// ---------------------------------------------------------------------------------------------------------
// The plan file, cached by size and time (§4.3 item 6).

const planPath = () => planPathOf(coach.home)

async function planFile($: EngineInterface): Promise<{ plan: Plan | null; error: string | null; isMissing: boolean }> {
  const path = planPath()
  const stat = await $.fs.stat(path).catch(() => null)
  if (stat === null) {
    coach.planCache = null
    return { plan: null, error: null, isMissing: true }
  }
  const key = `${stat.size}:${stat.mtimeMs}`
  if (coach.planCache?.key !== key) {
    try {
      coach.planCache = { key, plan: parsePlan(await $.fs.read(path)), error: null }
    } catch (error) {
      coach.planCache = { key, plan: null, error: (error as Error).message }
    }
  }
  const { plan, error } = coach.planCache
  if (error !== null && coach.brokenKey !== key) {
    coach.brokenKey = key
    await toast($, line('broken-plan', { day: await today($), path, reason: error }), 'timer')
  }
  return { plan, error, isMissing: false }
}

async function loadPlan($: EngineInterface): Promise<Plan | null> {
  return (await planFile($)).plan
}

/** Writes a new plan: workout 1, fresh targets; history, bests and the log are kept (§1.7 real-world 8). */
async function writePlan($: EngineInterface, plan: Plan) {
  await $.fs.write(planPath(), `${JSON.stringify(plan, null, 2)}\n`)
  coach.planCache = null
  // A plan replaces Just remind me: one way of training at a time. Choosing one is being in.
  await save($, 'mode', undefined)
  await markSeen($, 'onboarded')
  await save($, 'progress', START)
  await save($, 'targets', undefined)
  await save($, 'undo', undefined)
  await save($, 'planStartedOn', await today($))
  const showing = await read($, band)
  if (showing !== null && showing.kind !== 'logged') await clearBand($)
  await refreshStatus($)
  await refreshPeek($)
}

// ---------------------------------------------------------------------------------------------------------
// The delivery gate (D23) and the band slot (§4.3 item 4).

async function deliveryContext($: EngineInterface) {
  const paused = await load($, 'paused', false)
  const isQuietHours = inQuietHours(coach.options.quietHours, hourOf(await now($)))
  const { text } = await $.prompt.read()
  return { paused, isQuietHours, promptHasText: text !== '', soundAllowed: false }
}

async function decide($: EngineInterface, msg: Message) {
  return gate(msg, await deliveryContext($))
}

async function toast($: EngineInterface, text: string, cause: Message['cause']) {
  if ((await decide($, { channel: 'toast', cause })) === 'show') $.ui.toast(text)
}

/** Puts a band in the slot, or behind the one there when that one matters more. */
async function placeBand($: EngineInterface, given: BandSpec) {
  // About one band with a portrait in a hundred, the shiny Swolomon (hooks/shiny.ts).
  const spec: BandSpec = given.portrait !== undefined && given.isShiny === undefined && isShinyAt(await now($)) ? { ...given, isShiny: true } : given
  const slot = offerToSlot(await read($, band), await read($, pending), spec)
  if (!slot.isPlaced) {
    await update($, pending, () => slot.pending)
    return
  }
  await settleUnprompted($)
  cancelTimers('band')
  const placed = await startTalk($, spec)
  await update($, band, () => placed)
  await syncBandPane($)
  await refreshPeek($)
  if (spec.kind === 'logged') timer($, 'band', LOGGED_MS, () => void expireBand($, spec))
}

/** Puts a band in the slot only if it takes it now (nothing there matters more); whether it did. */
async function placeIfFree($: EngineInterface, spec: BandSpec): Promise<boolean> {
  if (!offerToSlot(await read($, band), await read($, pending), spec).isPlaced) return false
  await placeBand($, spec)
  return true
}

/** Puts a band in the slot whatever is there: the person's own answer replaced it (Undo, Edit). */
async function replaceBand($: EngineInterface, spec: BandSpec) {
  await settleUnprompted($)
  cancelTimers('band')
  const placed = await startTalk($, spec)
  await update($, band, () => placed)
  await syncBandPane($)
  await refreshPeek($)
  if (spec.kind === 'logged') timer($, 'band', LOGGED_MS, () => void expireBand($, placed))
}

/**
 * Where every surface attached draws no band above the prompt (VS Code; `AbovePrompt` is the terminal's
 * and the desktop's), the band is a pane of its own: open while a band is in the slot, closed when not.
 */
async function syncBandPane($: EngineInterface) {
  const surfaces = await $.session.surfaces()
  const isBandless = surfaces.length > 0 && !surfaces.some(surface => surface === 'terminal' || surface === 'desktop')
  const isShowing = isBandless && (await read($, band)) !== null
  if (isShowing === coach.isBandPaneOpen) return
  coach.isBandPaneOpen = isShowing
  if (isShowing) await $.ui.open({ id: BAND_PANE, title: 'IdleReps', rows: 9 })
  else await $.ui.close({ id: BAND_PANE })
}

/** Empties the slot; the highest waiting band that passes the gate takes it. */
async function clearBand($: EngineInterface) {
  await settleUnprompted($)
  cancelTimers('band')
  await stopTalk($)
  await update($, band, () => null)
  await syncBandPane($)
  const { next, pending: rest } = nextFromPending(await read($, pending))
  if (next === undefined) {
    await refreshPeek($)
    return
  }
  await update($, pending, () => rest)
  await offerBand($, next, 'timer')
}

// ---------------------------------------------------------------------------------------------------------
// The typewriter and the portrait (§1.11): one 50 ms clock per band, owned by the band, revealing the lines
// through `talk` (a redraw only when the revealed text changes) and moving the mouth with blits.

/** Starts a band's lines typing, when it has lines and animation is on; the band carries the run's key. */
async function startTalk($: EngineInterface, spec: BandSpec): Promise<BandSpec> {
  coach.isShiny = spec.isShiny === true
  coach.setMove = spec.kind === 'set' ? spec.act : undefined
  if (coach.isShiny) await sawShiny($)
  coach.talkTimeline = null
  coach.pose = 'idle'
  coach.talkText = plainOf(spec.coach?.join(' ') ?? '')
  // Read aloud when the line starts: now, or once Swolomon has walked on.
  if (spec.coach !== undefined && spec.entrance !== true) void speakLine($)
  coach.microFrame = null
  if (spec.coach === undefined || !coach.options.coachAnimation) {
    if ((await read($, talk)) !== null) await update($, talk, () => null)
    const micro = microMoveOf(spec)
    if (micro !== undefined && coach.options.coachAnimation) {
      coach.talkSeq += 1
      playMicro($, micro, coach.talkSeq)
    }
    return spec
  }
  coach.talkSeq += 1
  coach.talkMove = spec.act
  coach.moveFrame = null
  const key = coach.talkSeq
  const isWin = spec.isWin === true
  // Typed as read: the emphasis stars are no characters.
  const timeline = timelineOf(spec.coach.map(plainOf))
  const startedAt = await now($)
  const isEntering = spec.entrance === true
  coach.talkTimeline = timeline
  // With an entrance the line starts once Swolomon is in place (or at once, if the band has no room for it).
  coach.talkStartedAt = isEntering ? startedAt + ENTRANCE_MS : startedAt
  coach.entranceStartedAt = startedAt
  coach.stage = null
  coach.stageFrame = ''
  const first = frameAt(timeline, 0, isWin)
  coach.pose = first.pose
  if (!isEntering && first.pose === 'talkA' && coach.options.coachSound === 'blips') void playCue($, BLIP_ASSET, 'timer', true)
  await update($, talk, () => ({ key, shown: first.shown, pose: first.pose, ...(isEntering ? { isEntering: true as const } : {}) }))
  ticker($, 'band', TICK_MS, stop => void tick($, key, isWin, stop))
  return { ...spec, talkKey: key }
}

async function stopTalk($: EngineInterface) {
  coach.isShiny = false
  coach.talkTimeline = null
  coach.talkMove = undefined
  coach.moveFrame = null
  coach.portrait = null
  coach.stage = null
  if ((await read($, talk)) !== null) await update($, talk, () => null)
}

async function tick($: EngineInterface, key: number, isWin: boolean, stop: () => void) {
  const timeline = coach.talkTimeline
  const said = await read($, talk)
  if (timeline === null || said === null || said.key !== key) {
    stop()
    return
  }
  if (said.isEntering === true) {
    const sinceEntrance = (await now($)) - coach.entranceStartedAt
    if (coach.stage === 'declined' || entranceAt(sinceEntrance).isDone) {
      // In place: the band redraws as the portrait beside its lines, and the line starts now.
      coach.talkStartedAt = await now($)
      await update($, talk, () => ({ key, shown: said.shown, pose: 'idle' }))
      void speakLine($)
    } else await showStage($, sinceEntrance)
    return
  }
  const t = (await now($)) - coach.talkStartedAt
  const frame = frameAt(timeline, t, isWin)
  if (frame.isDone) {
    // The line is out: rest (blinking a while), or for a win hold the flex while the band shows.
    stop()
    coach.pose = frame.pose
    await update($, talk, () => ({ key, shown: frame.shown, pose: frame.pose }))
    const shown = await read($, band)
    if (shown?.talkKey !== key) return
    if (hasAsides(shown)) void asidesWhileShowing($, key)
    const move = coach.talkMove === undefined ? undefined : moveById(coach.talkMove)
    if (move !== undefined && coach.portrait?.size === 'full') await playMove($, move, key, isWin)
    else if (shown.portrait !== undefined) idleWhileShowing($, key, isWin)
    return
  }
  // Each time the mouth opens, a blip (none while it rests between sentences).
  if (frame.pose === 'talkA' && coach.pose !== 'talkA' && coach.options.coachSound === 'blips') void playCue($, BLIP_ASSET, 'timer', true)
  if (frame.shown.some((n, i) => n !== said.shown[i])) {
    coach.pose = frame.pose
    await update($, talk, () => ({ key, shown: frame.shown, pose: frame.pose }))
  } else if (frame.pose !== coach.pose) {
    coach.pose = frame.pose
    await showPose($, frame.pose)
  }
}

/**
 * A move in the band's full portrait, once the line is out (§1.11 Moves): each pose blitted as it comes,
 * then back to the bust, resting (blinking a while) or, for a win, holding the flex.
 */
async function playMove($: EngineInterface, move: Move, key: number, isWin: boolean) {
  const cells = MOVE_CELLS[move.id] ?? []
  const startedAt = await now($)
  let showing = -1
  ticker($, 'band', TICK_MS, stop =>
    void (async () => {
      if (coach.talkSeq !== key) {
        stop()
        return
      }
      // Done, or no full portrait to do it in (a redraw with no room for it): he idles from here.
      const portrait = coach.portrait
      const pose = portrait?.size === 'full' ? poseAt(move, (await now($)) - startedAt) : null
      if (portrait === null || pose === null) {
        stop()
        coach.moveFrame = null
        await showPose($, isWin ? 'flex' : 'idle')
        idleWhileShowing($, key, isWin)
        return
      }
      if (pose === showing) return
      showing = pose
      coach.moveFrame = cells[pose] ?? null
      if (coach.moveFrame !== null) await blitPortrait($, coach.moveFrame)
    })(),
  )
}

/**
 * The tiny Swolomon does the set's exercise alongside you: its reps once, a moment after the set shows,
 * then he holds the start position (nothing moves after).
 */
function playMicro($: EngineInterface, move: Move, key: number) {
  const cells = MICRO_CELLS[move.id] ?? []
  let showing = -1
  let startedAt: number | null = null
  ticker($, 'band', TICK_MS, stop =>
    void (async () => {
      const at = await now($)
      startedAt ??= at
      const where = coach.micro
      const pose = coach.talkSeq === key ? poseAt(move, at - startedAt) : null
      if (pose === null || where === null) {
        stop()
        if (coach.talkSeq === key && where !== null && showing > 0) {
          coach.microFrame = cells[0] ?? null
          await blitMicro($, where.requestId, coach.microFrame)
        }
        return
      }
      if (pose === showing) return
      showing = pose
      coach.microFrame = cells[pose] ?? null
      await blitMicro($, where.requestId, coach.microFrame)
    })(),
  )
}

async function blitMicro($: EngineInterface, requestId: string, cells: string | null) {
  if (cells === null) return
  await $.ui.blit({ requestId, key: 'swolomon-tiny', cells, columns: MICRO_WIDTH, rows: MICRO_ROWS }).catch(() => undefined)
}

/** Blits full-portrait cells to a drawn Raster; a refused blit (it moved on) is ignored. */
async function blitFull($: EngineInterface, requestId: string, cells: string | null) {
  if (cells === null) return
  await $.ui.blit({ requestId, key: 'swolomon', cells, columns: SPRITE.width, rows: PORTRAIT_ROWS }).catch(() => undefined)
}

/** Repaints the portrait in a pose, where one is drawn; a refused blit (the band moved on) is ignored. */
async function showPose($: EngineInterface, pose: Pose) {
  const size = coach.portrait?.size
  if (size !== undefined) await blitPortrait($, FRAMES[frameFor(size, pose)])
}

/** Repaints the entrance's stage `t` ms in, where one is drawn and the frame has changed. */
async function showStage($: EngineInterface, t: number) {
  const stage = coach.stage
  if (stage === null || stage === 'declined') return
  const at = entranceAt(t)
  const frame = `${at.x},${at.y},${at.frame},${at.isBang}`
  if (frame === coach.stageFrame) return
  coach.stageFrame = frame
  await $.ui.blit({ requestId: stage.requestId, key: 'stage', cells: stageCells(SPRITE, t), columns: STAGE_COLUMNS, rows: STAGE_ROWS }).catch(() => undefined)
}

/** His asides while the band waits on a choice (hooks/asides.ts); the band's timers end them when it goes. */
async function asidesWhileShowing($: EngineInterface, key: number) {
  // As many as the room allows: none when Quiet or ignored lately (hooks/attention.ts).
  const allowed = asidesAllowed(coach.options.coachChat, await engagement($))
  if (allowed === 0) return
  const day = (await today($)) + key
  const first = await firstAside($)
  for (const [i, aside] of ASIDES.slice(0, allowed).entries()) {
    const isFirst = i === 0 && first !== null
    timer($, 'band', aside.at, () =>
      void (async () => {
        if (isFirst) await markSeen($, first.mark)
        await setAside($, key, isFirst ? line(first.id, { day, ...first.ctx }) : line(aside.id, { day }))
      })(),
    )
    timer($, 'band', aside.at + ASIDE_MS, () => void setAside($, key, undefined))
  }
}

/** Late at night (23:00 to 05:00): he is half asleep; the pane has him napping. */
async function isLateNight($: EngineInterface): Promise<boolean> {
  const hour = hourOf(await now($))
  return hour >= 23 || hour < 5
}

/**
 * The first aside of a band, once a day each, in this order: something he remembers about them (their
 * answers, hooks/questions.ts), his mood at this hour (groggy before eight, puzzled late at night), or their
 * history (days showed up this month). Null: the usual impatience.
 */
async function firstAside($: EngineInterface): Promise<{ id: LineId; ctx: Record<string, number>; mark: string } | null> {
  const date = await today($)
  const recall = (await isDue($, 'recall', 'day')) ? recallFor(await load<About>($, 'about', {}), date) : undefined
  if (recall !== undefined) return { id: recall, ctx: {}, mark: 'recall' }
  if (await isDue($, 'mood', 'day')) {
    const hour = hourOf(await now($))
    if (hour >= 5 && hour < 8) return { id: 'aside-morning', ctx: {}, mark: 'mood' }
    if (await isLateNight($)) return { id: 'aside-late', ctx: {}, mark: 'mood' }
  }
  if (await isDue($, 'remember', 'day')) {
    const n = daysShowedUp(await load<HistoryEntry[]>($, 'history', []), date)
    if (n >= 5) return { id: 'aside-showed-up', ctx: { n }, mark: 'remember' }
  }
  return null
}

async function setAside($: EngineInterface, key: number, aside: string | undefined) {
  const said = await read($, talk)
  if (said === null || said.key !== key || said.isEntering === true || said.aside === aside) return
  const { aside: _was, ...rest } = said
  await update($, talk, () => (aside === undefined ? rest : { ...rest, aside }))
}

/**
 * Once the line is out, Swolomon lives in his square while the band shows (owner, 2026-10-03: "walking
 * around, turning his head side to side, maybe he goes and does some push-ups"): a beat every few seconds.
 * The band's timers end it when the band goes.
 */
function idleWhileShowing($: EngineInterface, key: number, isWin: boolean) {
  idleLoop($, 'band', {
    size: () => coach.portrait?.size,
    isWin,
    alive: () => coach.talkSeq === key,
    // What he is doing is kept for the next redraw, so it draws him there and not back at rest.
    blit: (cells, size) => {
      coach.moveFrame = size === 'full' ? cells : null
      void blitPortrait($, cells)
    },
    ...(coach.setMove === undefined ? {} : { setMove: coach.setMove }),
  })
}

/**
 * How an idle loop reads its portrait: its size as drawn now (none while a redraw has no room for it), whether
 * it is still wanted, and how to blit to it.
 */
type IdleOptions = {
  size: () => PortraitSize | undefined
  isWin: boolean
  alive: () => boolean
  blit: (cells: string, size: PortraitSize) => void
  /** On a set band: the set's own move, which he does with you between watching you (set beats). */
  setMove?: string
  /** The n-th beat, where the loop picks its own (the peek); else `idleBeat`'s. */
  beatOf?: (n: number) => IdleBeat
  /** A pose's cells, where the loop draws a crop of him (the peek's eyes); else the portrait's frame. */
  cellsOf?: (pose: Pose) => string
}

/**
 * Idle beats, each after its wait, for as long as the loop is alive: the frames a beat resolves to, each
 * blitted in turn. A beat with no portrait drawn (a redraw too narrow for him) is skipped, not the end: he
 * carries on once there is room again. A frame is only blitted to the size it was made for.
 */
function idleLoop($: EngineInterface, owner: 'band' | 'pane' | 'peek', opts: IdleOptions) {
  // The moves he may do: those collected, the flexes aside (the wins keep those); read once per loop.
  let moves: string[] | undefined
  const beat = (n: number) =>
    timer($, owner, idleWait(n, opts.isWin), () =>
      void (async () => {
        if (!opts.alive()) return
        const size = opts.size()
        if (size === undefined || (opts.isWin && size !== 'full')) {
          beat(n + 1)
          return
        }
        if (moves === undefined) {
          const have = opts.isWin || size !== 'full' ? [] : collected(await load<string[]>($, 'moves', []))
          // On a set: the set's move twice as often as a flex he has; else his moves, the flexes aside.
          moves = opts.setMove !== undefined ? [opts.setMove, opts.setMove, ...have.filter(m => m.family === 'flex').map(m => m.id)] : have.filter(m => m.family !== 'flex').map(m => m.id)
        }
        const { steps, rest } = opts.beatOf?.(n) ?? idleBeat(n, size, opts.isWin, size === 'full' ? moves : [], opts.setMove === undefined ? 'band' : 'set')
        const cellsOf = opts.cellsOf ?? ((pose: Pose) => FRAMES[frameFor(size, pose)])
        const frames = steps.flatMap(step => (opts.cellsOf === undefined ? idleFrames(step, size) : 'pose' in step ? [{ cells: cellsOf(step.pose), ms: step.ms }] : []))
        let at = 0
        for (const frame of [...frames, { cells: cellsOf(rest), ms: 0 }]) {
          timer($, owner, at, () => {
            if (opts.alive() && opts.size() === size) opts.blit(frame.cells, size)
          })
          at += frame.ms
        }
        timer($, owner, at, () => {
          if (opts.alive()) beat(n + 1)
        })
      })(),
    )
  beat(0)
}

/** Each place on his walks, encoded once (the walks are the beats' own, so the same objects every time). */
const WALK_CELLS = new Map<Walk, string>()

/** An idle step as the cells to show and for how long: a pose, a place on a walk, or a move's poses. */
function idleFrames(step: IdleStep, size: PortraitSize): { cells: string; ms: number }[] {
  if ('pose' in step) return [{ cells: FRAMES[frameFor(size, step.pose)], ms: step.ms }]
  if ('walk' in step) {
    const cells = WALK_CELLS.get(step.walk) ?? encodeCells(walkGrid(SPRITE, step.walk))
    WALK_CELLS.set(step.walk, cells)
    return [{ cells, ms: step.ms }]
  }
  const move = moveById(step.move)
  const cells = MOVE_CELLS[step.move]
  if (move === undefined || cells === undefined) return []
  return Array.from({ length: move.reps }, () => move.beats.map(([pose, ms]) => ({ cells: cells[pose] ?? FRAMES.idle, ms }))).flat()
}

const SHINY_CELLS = new Map<string, string>()

/** Cells recoloured for the shiny Swolomon, each frame once. */
function shinyOf(cells: string): string {
  const shiny = SHINY_CELLS.get(cells) ?? recolour(cells, SHINY_COLOURS)
  SHINY_CELLS.set(cells, shiny)
  return shiny
}

/** A shiny Swolomon showed: counted; the first one ever, he says so. */
async function sawShiny($: EngineInterface) {
  const n = (await load($, 'shinies', 0)) + 1
  await save($, 'shinies', n)
  if (n === 1) $.ui.toast(line('shiny-first', { day: await today($) }))
}

/** Too narrow for his portrait: "where am I?", once a day. */
async function lookForRoom($: EngineInterface) {
  if (coach.isLookingForRoom) return
  coach.isLookingForRoom = true
  try {
    if (!(await isDue($, 'where-am-i', 'day'))) return
    await markSeen($, 'where-am-i')
    $.ui.toast(line('where-am-i', { day: await today($) }))
  } finally {
    coach.isLookingForRoom = false
  }
}

/** Films already made this load, by what they show (the moves collected among it). */
const FILMS = new Map<string, string>()

/** His film for the desktop (hooks/film.ts): the act once, then idling with the moves he has; made once. */
async function filmFor($: EngineInterface, opts: { size: PortraitSize; isWin: boolean; act?: string; setMove?: string }): Promise<string> {
  const have = opts.isWin || opts.size !== 'full' ? [] : collected(await load<string[]>($, 'moves', []))
  // On a set, the set's move and his flexes; else his moves, the flexes aside (as the terminal's idling).
  const moves = have.filter(move => (opts.setMove !== undefined) === (move.family === 'flex')).map(move => move.id)
  const key = JSON.stringify([opts.size, opts.isWin, opts.act, opts.setMove, moves])
  const made = FILMS.get(key) ?? bandFilmSvg({ sprite: SPRITE, ...opts, moves })
  if (FILMS.size > 32) FILMS.clear()
  FILMS.set(key, made)
  return made
}

/** Blits cells to the band's portrait, at the size it is drawn; a refused blit is ignored. */
async function blitPortrait($: EngineInterface, cells: string) {
  const portrait = coach.portrait
  if (portrait === null) return
  if (coach.isShiny) cells = shinyOf(cells)
  const { columns, rows } = portraitCells(SPRITE, portrait.size)
  await $.ui.blit({ requestId: portrait.requestId, key: 'swolomon', cells, columns, rows }).catch(() => undefined)
}

async function expireBand($: EngineInterface, spec: BandSpec) {
  if ((await read($, band)) === spec) await clearBand($)
  else if ((await read($, band))?.undoId === spec.undoId && (await read($, band))?.kind === spec.kind) await clearBand($)
}

/** Shows a band through the gate: now, once the prompt is empty, or not at all. */
async function offerBand($: EngineInterface, spec: BandSpec, cause: Message['cause']) {
  const decision = await decide($, { channel: 'band', cause })
  if (decision === 'show') {
    await placeBand($, spec)
    // Raised unasked: whether it is answered tells him how much to say (hooks/attention.ts).
    const shown = await read($, band)
    if (cause === 'timer' && UNPROMPTED.has(spec.kind) && shown?.kind === spec.kind) coach.unprompted = shown
  } else if (decision === 'defer') coach.deferred = spec
}

/** The bands he raises unasked that ask for an answer. */
const UNPROMPTED: ReadonlySet<BandKind> = new Set<BandKind>(['ask', 'remind', 'question', 'spotme', 'still', 'stretch'])

/** The band he raised unasked is going: answered if a press or a command is taking it away, else ignored. */
async function settleUnprompted($: EngineInterface) {
  if (coach.unprompted === null) return
  coach.unprompted = null
  await save($, 'attention', recordOutcome(await load<Attention>($, 'attention', START_ATTENTION), coach.isAnswering))
}

/** How engaged they have been with his bands lately (hooks/attention.ts). */
async function engagement($: EngineInterface): Promise<number> {
  return engagementOf((await load<Attention>($, 'attention', START_ATTENTION)).outcomes)
}

/**
 * Whether he may do an extra (his hello, a new gym, prep news, a question, spot me) today: the setting and
 * how engaged they are set the day's cap. `isSpending`: it is happening now, so it counts.
 */
async function mayExtra($: EngineInterface, isSpending: boolean): Promise<boolean> {
  const attention = await load<Attention>($, 'attention', START_ATTENTION)
  const { attention: next, allowed } = spend(attention, await today($), extrasCap(coach.options.coachChat, engagementOf(attention.outcomes)))
  if (allowed && isSpending) await save($, 'attention', next)
  return allowed
}

/** `whenPromptIsEmpty`: a deferred band shows on the edit that empties the prompt. */
async function deliverDeferred($: EngineInterface) {
  const spec = coach.deferred
  if (spec === null) return
  coach.deferred = null
  await offerBand($, spec, 'timer')
}

// ---------------------------------------------------------------------------------------------------------
// Cues.

async function cueContextOf($: EngineInterface, plan: Plan): Promise<CueContext> {
  return {
    plan,
    progress: await load($, 'progress', START),
    today: await today($),
    declinedOn: await load<number | undefined>($, 'declinedOn', undefined),
    nextCueAt: await load<number | undefined>($, 'nextCueAt', undefined),
    now: await now($),
  }
}

/** `{agentDoing}` for a line, moving the day's storyline on when the line names the agent (§1.13.2). */
async function agentFill($: EngineInterface, id: LineId, day: number): Promise<string> {
  // What the agent is doing this turn, misread, beats today's theory about it.
  if (coach.isTurnRunning && coach.turnMisread !== null) return coach.turnMisread.doing
  const stored = await load($, 'agentBeat', { day, n: 0 })
  const beat = (stored.day === day ? stored.n : 0) + 1
  const turnMs = coach.isTurnRunning ? (await now($)) - coach.turnStartedAt : 0
  if (usesAgent(id, day)) await save($, 'agentBeat', { day, n: beat })
  return agentDoing(day, beat, turnMs)
}

/** A Swolomon line whose context may name the agent. */
async function coachLine($: EngineInterface, id: LineId, ctx: LineContext): Promise<string> {
  return line(id, { ...ctx, agentDoing: await agentFill($, id, ctx.day) })
}

/** The set band for a cue; `coach` only on the first set after Start (§1.10c). */
async function setBandFor($: EngineInterface, cue: Cue, coachText: string | undefined): Promise<BandSpec> {
  const memory = (await load<Record<string, RecordStore['lastByExercise'][string]>>($, 'lastByExercise', {}))[cue.exercise.name]
  const day = await today($)
  const showHint = await isDue($, 'hint', { count: 3 })
  if (showHint) await markSeen($, 'hint')
  // He is on every set (owner, 2026-10-06): a form cue, a cheer or banter when no other line leads. Not Quiet.
  const said = coachText ?? (coach.options.coachChat === 'quiet' ? undefined : line(duringSetLineId(cue), { day: day + cue.step }))
  const spec = setBand(cue, {
    ...(said === undefined ? {} : { coach: said }),
    ...(memory === undefined ? {} : { memory }),
    showHint,
    hint: line('hint', { day }),
  })
  // Once his line is out, he shows the set's exercise in the full portrait, then lives in it.
  const demo = moveForExercise(cue.exercise.name)
  return said === undefined || demo === null ? spec : { ...spec, act: demo }
}

/** A cue's timer went off: the next set when today's workout was agreed to, else the question. */
async function showDueCue($: EngineInterface) {
  if (!coach.isTurnRunning) return
  // Sitting a long while comes first: standing up is the smallest ask there is.
  if (coach.turnCanStill) {
    const showing = await read($, band)
    if (showing === null || showing.kind === 'logged') {
      await offerStill($)
      return
    }
  }
  if (coach.turnCanNudge) {
    await offerNudge($)
    return
  }
  if (coach.turnCanRemind) {
    if ((await read($, band)) === null) await offerBand($, await remindBandFor($), 'timer')
    return
  }
  const plan = await loadPlan($)
  if (plan === null) return
  if (coach.turnCanStretch) {
    await offerStretch($)
    return
  }
  const ctx = await cueContextOf($, plan)
  if (!cueAllowed(ctx, { ignoreTrainingDay: false, ignoreGap: true })) return
  // Another session may have answered since: the gap moved, so come back when it ends.
  if ((ctx.nextCueAt ?? 0) > ctx.now) {
    scheduleCue($, (ctx.nextCueAt ?? 0) - ctx.now)
    return
  }
  const showing = await read($, band)
  if (showing !== null && showing.kind !== 'logged') return
  const cue = cueFor(plan, ctx.progress, await load<Targets>($, 'targets', {}))
  if (cue === null) return
  const isAgreed = (await load<number | undefined>($, 'startedOn', undefined)) === ctx.today
  void track($, { event: 'cue_shown', properties: {} })
  if (isAgreed) {
    await offerBand($, await setBandFor($, cue, undefined), 'timer')
    return
  }
  const id = (await softerAskLine($, cue, ctx.today)) ?? askLineId(cue, coach.reason, coach.waitMs)
  const text = await coachLine($, id, { ...cueLineContext(cue, ctx.today, ''), ...(coach.waitMs === undefined ? {} : { wait: waitWords(coach.waitMs) }) })
  await offerBand($, askBand(cue, text, ctx.today, coach.reason, { withSafety: !(await isSafetyAcknowledged($)) }), 'timer')
}

/** A strong sign of a long task: the cue comes 5 s from now, still never inside the gap. Once per turn. */
async function noticeLongTask($: EngineInterface, sign: Sign) {
  if (!coach.isTurnRunning || coach.hasStrongSign) return
  coach.hasStrongSign = true
  coach.reason = sign.reason
  coach.waitMs = sign.waitMs
  const showing = await read($, band)
  if (showing !== null && showing.kind !== 'logged') return
  stopCue()
  scheduleCue($, cueDelayMs(STRONG_SIGN_DELAY_MS, await load<number | undefined>($, 'nextCueAt', undefined), await now($)))
}

/** Whether IdleReps may still ask to get started: no Don't ask again, no Not now this session. */
async function mayAskToStart($: EngineInterface): Promise<boolean> {
  return !coach.isIntroDismissed && (await isDue($, 'setup-prompt', 'ever'))
}

/**
 * Whether the person has yet to be walked in (owner, 2026-10-02: "/workout shouldn't just be into a workout
 * where we never talked to the user"): marked by Got it on how training works, by starting a workout, and
 * at session start for anyone who trained before. A plan alone is not enough: one made by hand, or brought
 * over from the prototype, never met Swolomon.
 */
async function isOnboardingDue($: EngineInterface): Promise<boolean> {
  return isDue($, 'onboarded', 'ever')
}

/** Just remind me is how they train: no plan, a set of their own while the agent works. */
async function isRemindMode($: EngineInterface): Promise<boolean> {
  return (await load<Mode | undefined>($, 'mode', undefined)) === 'remind'
}

/** The plan to train with: none until onboarding is done, or with Just remind me in its place. */
async function trainingPlan($: EngineInterface): Promise<Plan | null> {
  return (await isOnboardingDue($)) || (await isRemindMode($)) ? null : loadPlan($)
}

/**
 * Whether Swolomon should introduce himself: no way of training chosen yet (no plan, not Just remind me), or
 * a plan he never walked them through. Never over a broken plan file: fixing it comes first.
 */
async function introState($: EngineInterface) {
  const file = await planFile($)
  const isOnboarding = await isOnboardingDue($)
  const isRemind = await isRemindMode($)
  return { file, isOnboarding, isIntroDue: !isRemind && (file.isMissing || (file.plan !== null && isOnboarding)) }
}

/** How many times, in all, a later session asks to get started before IdleReps stays quiet. */
const NUDGES = 5

/**
 * No plan yet, after the first session: a long turn may ask once more, once a day and five times in all,
 * never on the day of the introduction, never paused or in quiet hours.
 */
async function couldNudgeThisTurn($: EngineInterface): Promise<boolean> {
  // A plan file that is there but broken is someone already setting up: the broken-plan toast is theirs.
  // A plan that never met Swolomon is asked about too (Keep my plan).
  if (!(await introState($)).isIntroDue || !(await mayAskToStart($))) return false
  if (await isDue($, 'intro', 'ever')) return false
  if (await load($, 'paused', false)) return false
  if (inQuietHours(coach.options.quietHours, hourOf(await now($)))) return false
  return (await isDue($, 'nudge', { count: NUDGES })) && (await isDue($, 'nudge-day', 'day')) && (await isDue($, 'intro-day', 'day'))
}

/** The ask, small and timely: replaces the introduction if it is still up, otherwise only an empty slot. */
async function offerNudge($: EngineInterface) {
  const showing = await read($, band)
  if (showing !== null && showing.kind !== 'intro') return
  const day = await today($)
  const seen = (await load<Seen>($, 'seen', {})).nudge?.n ?? 0
  await markSeen($, 'nudge')
  await markSeen($, 'nudge-day')
  await offerBand($, nudgeBand(await coachLine($, 'nudge', { day }), day, seen + 1 >= NUDGES, (await loadPlan($)) !== null), 'timer')
}

/**
 * A rest day's one desk stretch: offered the way a set is (a long turn, the prompt empty), once a day, on
 * a day with no workout due or done, and never after Not today.
 */
async function couldStretchThisTurn($: EngineInterface): Promise<boolean> {
  const plan = await trainingPlan($)
  if (plan === null || (await load($, 'paused', false))) return false
  if (inQuietHours(coach.options.quietHours, hourOf(await now($)))) return false
  const ctx = await cueContextOf($, plan)
  if (ctx.progress.workout >= plan.workouts.length || ctx.progress.lastCompletedOn === ctx.today || ctx.declinedOn === ctx.today) return false
  if (isTrainingDay(plan, ctx.progress, ctx.today)) return false
  return isDue($, 'stretch', 'day')
}

async function offerStretch($: EngineInterface) {
  if ((await read($, band)) !== null || !(await isDue($, 'stretch', 'day'))) return
  const day = await today($)
  await markSeen($, 'stretch')
  await offerBand($, stretchBand(await coachLine($, 'stretch-ask', { day }), stretchFor(day), day), 'timer')
}

/** Done on the stretch: it goes in the history (and the minutes moved), and Swolomon's thanks is a toast. */
async function recordStretch($: EngineInterface) {
  const shown = await read($, band)
  if (shown?.stretch === undefined) return
  const day = await today($)
  await writePatch($, { set: {}, append: [{ kind: 'stretch', t: await now($), d: day, ...shown.stretch }] })
  await clearBand($)
  $.ui.toast(line('stretched', { day, exercise: shown.stretch.exercise }))
  await punch($)
  await refreshStatus($)
}

/** Whether this turn could cue at all (D21): a plan, not paused, quiet hours over, a training day with sets left. */
async function couldCueThisTurn($: EngineInterface): Promise<boolean> {
  const plan = await trainingPlan($)
  if (plan === null) return false
  if (await load($, 'paused', false)) return false
  if (inQuietHours(coach.options.quietHours, hourOf(await now($)))) return false
  return cueAllowed(await cueContextOf($, plan), { ignoreTrainingDay: false, ignoreGap: true })
}

/** Whether this turn could remind (Just remind me): not paused, not quiet hours, not after Not today. */
async function couldRemindThisTurn($: EngineInterface): Promise<boolean> {
  if (!(await isRemindMode($)) || (await load($, 'paused', false))) return false
  if (inQuietHours(coach.options.quietHours, hourOf(await now($)))) return false
  return (await load<number | undefined>($, 'declinedOn', undefined)) !== (await today($))
}

/**
 * Whether this turn may ask them to stand up: training (a plan or reminders), not paused, quiet hours over,
 * not after Not today, once a day, and two hours of the agent working today with nothing moved since.
 */
async function couldStillThisTurn($: EngineInterface): Promise<boolean> {
  if ((await trainingPlan($)) === null && !(await isRemindMode($))) return false
  if (await load($, 'paused', false)) return false
  const at = await now($)
  if (inQuietHours(coach.options.quietHours, hourOf(at))) return false
  const day = await today($)
  if ((await load<number | undefined>($, 'declinedOn', undefined)) === day || !(await isDue($, 'still', 'day'))) return false
  const lastMoved = Math.max(startOfDayMs(day), ...(await load<HistoryEntry[]>($, 'history', [])).filter(isMovement).map(e => e.t))
  return sittingMs((await load<WorkIntervals>($, 'workIntervals', {}))[String(day)] ?? [], lastMoved) >= STILL_MS
}

/**
 * Whether this turn has room for a quiet moment of his (a question, or spot me): training, met at least a day
 * ago, not paused, quiet hours over, one a day, and nothing else due now (inside the gap, or no set today).
 */
async function couldQuietMomentThisTurn($: EngineInterface): Promise<boolean> {
  if (coach.turnCanStill || coach.turnCanNudge) return false
  if ((await trainingPlan($)) === null && !(await isRemindMode($))) return false
  if (await load($, 'paused', false)) return false
  const at = await now($)
  if (inQuietHours(coach.options.quietHours, hourOf(at))) return false
  const met = (await load<Seen>($, 'seen', {})).onboarded?.at
  if (met === undefined || dayNumberOf(met) >= (await today($))) return false
  if (!(await isDue($, 'question', 'day')) || (await quietMoment($)) === null || !(await mayExtra($, false))) return false
  const isSetDue = (coach.turnCanCue || coach.turnCanRemind || coach.turnCanStretch) && (await load<number | undefined>($, 'nextCueAt', undefined) ?? 0) <= at
  return !isSetDue
}

/** Spot me at most every few days. */
const SPOT_ME_EVERY_MS = 3 * 86_400_000

/** Which quiet moment it would be: spot me when due (every third day, or no question left), else a question. */
async function quietMoment($: EngineInterface): Promise<'spotme' | 'question' | null> {
  const hasQuestion = nextQuestion(await load<About>($, 'about', {})) !== undefined
  const canSpot = await isDue($, 'spotme', { everyMs: SPOT_ME_EVERY_MS })
  if (canSpot && (!hasQuestion || (await today($)) % 3 === 0)) return 'spotme'
  return hasQuestion ? 'question' : null
}

async function offerQuietMoment($: EngineInterface) {
  if (!coach.isTurnRunning || (await read($, band)) !== null) return
  const moment = await quietMoment($)
  const day = await today($)
  if (moment === null || !(await mayExtra($, true))) return
  // One quiet moment a day, whichever it is.
  await markSeen($, 'question')
  if (moment === 'spotme') {
    await markSeen($, 'spotme')
    await offerBand($, spotMeBand(line('spot-me', { day })), 'timer')
    return
  }
  const question = nextQuestion(await load<About>($, 'about', {}))
  if (question !== undefined) await offerBand($, questionBand(line(question.ask, { day }), question), 'timer')
}

/** Spotted: he gets the rep up and celebrates (counted); not now: he racks it, no hard feelings. */
async function answerSpotMe($: EngineInterface, id: string) {
  const day = await today($)
  if (id !== 'spot') {
    await clearBand($)
    $.ui.toast(line('not-spotted', { day }))
    return
  }
  await save($, 'spots', (await load($, 'spots', 0)) + 1)
  const move = moveById('victory-jump')
  if (move === undefined) await clearBand($)
  else await replaceBand($, { ...showOffBand(line('spotted', { day }), move), isWin: true })
}

/** An answer (or Pass): kept, and never asked again; an answer is thanked. */
async function answerQuestion($: EngineInterface, id: string) {
  const shown = await read($, band)
  if (shown?.question === undefined) return
  const index = ANSWER_IDS.indexOf(id as (typeof ANSWER_IDS)[number])
  await save($, 'about', { ...(await load<About>($, 'about', {})), [shown.question.id]: index === -1 ? 'pass' : index })
  await clearBand($)
  if (index !== -1) $.ui.toast(line('answer-noted', { day: await today($) }))
}

async function offerStill($: EngineInterface) {
  const day = await today($)
  await markSeen($, 'still')
  await offerBand($, stillBand(await coachLine($, 'still-ask', { day }), day), 'timer')
}

/** Stood up: it counts as moving (the daily target, the week), never as a set. */
async function logStood($: EngineInterface) {
  const day = await today($)
  await writePatch($, { set: {}, append: [{ kind: 'stood', t: await now($), d: day }] })
  await clearBand($)
  $.ui.toast(await movedToast($, day, await coachLine($, 'stood-logged', { day })))
  await punch($)
  await refreshStatus($)
}

/** The toast for something moved: in Just remind me, the day's target met says so instead. */
async function movedToast($: EngineInterface, day: number, otherwise: string): Promise<string> {
  if (!(await isRemindMode($))) return otherwise
  const history = await load<HistoryEntry[]>($, 'history', [])
  const target = dailyTarget(history, day)
  return movesOn(history, day) === target ? line('target-hit', { day, n: target }) : otherwise
}

/** Just remind me's band: a set, anything; the ideas change each time; the safety note until acknowledged. */
async function remindBandFor($: EngineInterface, opts: { isFirst?: boolean } = {}): Promise<BandSpec> {
  const day = await today($)
  const history = await load<HistoryEntry[]>($, 'history', [])
  const withSafety = !(await isSafetyAcknowledged($))
  // Sized to the wait: the agent's word, a sign of a long task, or how long turns usually run here.
  const waitMs = coach.isTurnRunning
    ? expectedWaitMs({
        ...(coach.waitMs === undefined ? {} : { signWaitMs: coach.waitMs }),
        ...(coach.reason === undefined ? {} : { reason: coach.reason }),
        recent: await load<number[]>($, 'turnLengths', []),
        elapsedMs: (await now($)) - coach.turnStartedAt,
      })
    : null
  const size = waitSize(waitMs)
  const id: LineId = opts.isFirst === true ? 'remind-first' : size === 'quick' ? 'remind-quick' : size === 'long' ? 'remind-long' : 'remind-ask'
  return remindBand(await coachLine($, id, { day }), day, ideasFor(history.length + day, size), { withSafety, ...(waitMs === null ? {} : { wait: waitWords(waitMs) }) })
}

/** A set of their own, logged in one tap: a set like any other for the week, the rank and the gap. */
async function logMoved($: EngineInterface, what: Moved) {
  const day = await today($)
  const at = await now($)
  await markSeen($, 'safety')
  const before = await load($, 'totalDoneSets', 0)
  await writePatch($, { set: {}, append: [{ kind: 'moved', t: at, d: day, what }] })
  await save($, 'totalDoneSets', before + 1)
  await advancePrep($)
  await save($, 'nextCueAt', at + (await gapMs($)))
  await clearBand($)
  const n = movedOn(await load<HistoryEntry[]>($, 'history', []), day)
  $.ui.toast(await movedToast($, day, await coachLine($, 'moved-logged', { day, what: MOVED[what], n })))
  const rank = rankFor(before + 1).name
  if (!(rank !== rankFor(before).name && (await showRankUp($, rank, undefined)))) await showUnlock($, undefined)
  await punch($)
  await refreshStatus($)
}

/** Just remind me, chosen: no plan, and the first set offered right away. */
async function startRemind($: EngineInterface) {
  await save($, 'mode', 'remind')
  await markSeen($, 'onboarded')
  await clearFirstRun($)
  await offerBand($, await remindBandFor($, { isFirst: true }), 'keypress')
  await refreshStatus($)
}

// ---------------------------------------------------------------------------------------------------------
// Answers.

/** Start: today's workout is agreed to; its next set shows at once (a key press is never delayed). */
async function startWorkout($: EngineInterface, reason: LongTaskReason | undefined, opts: { half?: boolean } = {}): Promise<Cue | null> {
  stopCue()
  const day = await today($)
  await save($, 'laterStreak', undefined)
  if (opts.half === true) await save($, 'progress', { ...(await load($, 'progress', START)), half: true })
  // Swolomon speaks on the first set after Start only (§1.10c): not when today's workout was already started.
  // Choosing the half version always gets its word: it is the moment that most needs one.
  const isStart = opts.half === true || (await load<number | undefined>($, 'startedOn', undefined)) !== day
  await save($, 'startedOn', day)
  await save($, 'declinedOn', undefined)
  // Starting a workout is being in, and accepting the safety note the first offer showed.
  if (await isOnboardingDue($)) await markSeen($, 'onboarded')
  if (!(await isSafetyAcknowledged($))) await markSeen($, 'safety')
  const plan = await loadPlan($)
  if (plan === null) return null
  const cue = cueFor(plan, await load($, 'progress', START), await load<Targets>($, 'targets', {}))
  if (cue === null) {
    await clearBand($)
    return null
  }
  const id = opts.half === true ? 'half-start' : firstSetLineId(cue, plan, day, reason)
  const coachText = isStart ? line(id, { day }) : undefined
  // A minute's warm-up comes first, once a day, before a workout's first set (§1.12 item 2).
  const progress = await load($, 'progress', START)
  if (coach.options.warmUp && progress.done === 0 && (await isDue($, 'warmup', 'day'))) {
    await markSeen($, 'warmup')
    await placeBand($, warmupBand(cue, day, coachText))
  } else await placeBand($, await setBandFor($, cue, coachText))
  await refreshStatus($)
  return cue
}

/** Not today: nothing more today, in any session. */
async function declineToday($: EngineInterface) {
  stopCue()
  const day = await today($)
  await save($, 'declinedOn', day)
  const showing = await read($, band)
  if (showing?.kind === 'ask') void track($, { event: 'ask_answered', properties: { answer: 'no' } })
  if (showing?.kind === 'ask' || showing?.kind === 'set' || showing?.kind === 'edit') await clearBand($)
  const plan = await loadPlan($)
  const next = plan === null ? null : nextTrainingDay(plan, await load($, 'progress', START), day)
  await toast($, line('not-today', { day, nextDay: next === null ? 'soon' : longDayName(next) }), 'keypress')
  const declines = [...(await load<number[]>($, 'declines', [])).filter(d => d !== day), day].slice(-60)
  await save($, 'declines', declines)
  await offerReschedule($, plan, declines, day)
  await refreshStatus($)
}

/** The same training weekday declined three weeks running: offer to move it (asked again at most every 4 weeks). */
async function offerReschedule($: EngineInterface, plan: Plan | null, declines: readonly number[], day: number) {
  const move = plan === null ? null : rescheduleOffer(plan, declines, day)
  if (move === null || !(await isDue($, `reschedule:${move.from}`, { everyMs: 28 * 86_400_000 }))) return
  const coachText = await coachLine($, 'reschedule-ask', { day, from: weekdayLongName(move.from) })
  await offerBand($, rescheduleBand(coachText, line('reschedule-detail', { day, to: weekdayLongName(move.to) }), move), 'keypress')
}

/** Move it: the plan file's schedule changes, nothing else does (progress and targets stay). */
async function moveTrainingDay($: EngineInterface, move: { from: Weekday; to: Weekday }) {
  const plan = await loadPlan($)
  if (plan === null || !('days' in plan.schedule)) return
  await $.fs.write(planPath(), `${JSON.stringify({ ...plan, schedule: { days: moveWeekday(plan.schedule.days, move.from, move.to) } }, null, 2)}\n`)
  coach.planCache = null
  $.ui.toast(line('rescheduled', { day: await today($), from: weekdayLongName(move.from), to: weekdayLongName(move.to) }))
  await refreshStatus($)
}

/**
 * Three Laters in a row in a day mean a busy day: the gap doubles for the rest of it, and Swolomon says
 * so, once. Any Start or Done ends the run.
 */
async function countLater($: EngineInterface) {
  const day = await today($)
  const streak = await load<{ day: number; n: number } | undefined>($, 'laterStreak', undefined)
  const n = streak?.day === day ? streak.n + 1 : 1
  if (n < 3 || (await load<number | undefined>($, 'easyDay', undefined)) === day) {
    await save($, 'laterStreak', { day, n })
    return
  }
  await save($, 'laterStreak', undefined)
  await save($, 'easyDay', day)
  await toast($, await coachLine($, 'busy-day', { day, n: Math.round((await gapMs($)) / 60_000) }), 'keypress')
}

/** Later: hides the set or the question for one gap, recording nothing. */
async function snooze($: EngineInterface) {
  stopCue()
  const showing = await read($, band)
  void track($, showing?.kind === 'ask' ? { event: 'ask_answered', properties: { answer: 'later' } } : { event: 'cue_later', properties: {} })
  if (['ask', 'set', 'edit', 'timer', 'switch', 'time', 'remind', 'still'].includes(showing?.kind ?? '')) await clearBand($)
  await countLater($)
  const at = await now($)
  await save($, 'nextCueAt', at + (await gapMs($)))
  if (coach.isTurnRunning) scheduleCue($, cueDelayMs(turnWaitMs(false), at + (await gapMs($)), at))
}

async function recordStoreOf($: EngineInterface): Promise<RecordStore> {
  return {
    progress: await load($, 'progress', START),
    history: await load<HistoryEntry[]>($, 'history', []),
    targets: await load<Targets>($, 'targets', {}),
    lastByExercise: await load($, 'lastByExercise', {}),
    totalDoneSets: await load($, 'totalDoneSets', 0),
    nextCueAt: await load<number | undefined>($, 'nextCueAt', undefined),
  }
}

async function writePatch($: EngineInterface, patch: Patch) {
  for (const [key, value] of Object.entries(patch.set)) await save($, key as StoreKey, value)
  if (patch.append.length > 0) await save($, 'history', appendHistory(await load<HistoryEntry[]>($, 'history', []), ...patch.append))
}

/** Records the showing set, done with these values or skipped, through the record reducer. */
async function recordSet($: EngineInterface, outcome: { result: 'done' | 'skip'; count?: number; weight?: number; band?: string }): Promise<'recorded' | 'stale' | 'none'> {
  const shown = await read($, band)
  const cue = shown?.cue
  const plan = await loadPlan($)
  if (cue === undefined || plan === null || !['set', 'edit', 'timer', 'time'].includes(shown?.kind ?? '')) return 'none'
  const day = await today($)
  const at = await now($)
  const result = record(
    await recordStoreOf($),
    { type: 'set', showing: { workout: cue.workout, step: cue.step }, ...outcome },
    { plan, today: day, now: at, gapMs: (await gapMs($)), setting: plan.answers?.setting ?? 'home' },
  )
  if (result.effects.isStale === true) {
    await clearBand($)
    $.ui.toast(line('stale', { day }))
    return 'stale'
  }
  stopCue()
  await writePatch($, result.patch)
  await save($, 'undo', result.inverse)
  if (outcome.result === 'done') await save($, 'laterStreak', undefined)
  if (coach.isTurnRunning && outcome.result === 'done') coach.turnSets += 1
  if (isTracking()) {
    const ratio = outcome.result === 'done' ? ratioOf(outcome.count, cue.count ?? undefined) : undefined
    // The calendar week since the plan began: every plan has one, written by hand or not.
    const planWeek = Math.floor((day - (await planStartedOn($))) / 7) + 1
    void track($, { event: 'set_finished', properties: { result: outcome.result, week: planWeek, ...(ratio === undefined ? {} : { ratio }) } })
  }
  // §1.10c after a record: a rank-up band (with a feat toast), else a new best, else the skip reassurance.
  if (outcome.result === 'done') await advancePrep($)
  const rankShown = await showRankUp($, result.effects.rankUp, result.inverse.id)
  for (const feat of result.effects.feats ?? []) await toastFeat($, feat)
  const done = result.effects.workoutDone
  if (done !== undefined) {
    void track($, { event: 'workout_completed', properties: { workout: done.workout + 1 } })
    if (done.isPlanDone) void track($, { event: 'plan_completed', properties: { workouts: plan.workouts.length } })
    const week = weekProgress(plan, (result.patch.set.progress as Progress).workout, done.workout)
    await placeBand($, ratingBand(done.name, day, done.basis, result.inverse.id, done.levelUps, week))
    if (!done.isPlanDone) {
      const progress = result.patch.set.progress as Progress
      const next = nextTrainingDay(plan, progress, day)
      const nextWorkout = shortWorkoutName(plan.workouts[progress.workout]?.name ?? '')
      $.ui.toast(
        next === null
          ? line('workout-complete-soon', { day, n: done.workout + 1, nextWorkout })
          : line('workout-complete', { day, n: done.workout + 1, nextDay: longDayName(next).slice(0, 3), nextWorkout }),
      )
    }
    await offerPulse($)
  } else {
    if (!rankShown && !(outcome.result === 'done' && (await showUnlock($, result.inverse.id)))) {
      const isBest = result.effects.isNewBest === true
      const said = isBest ? line('new-best', { day }) : outcome.result === 'skip' ? line('skip', { day }) : undefined
      const progress = result.patch.set.progress as Progress
      const workout = plan.workouts[progress.workout]
      // Every set done is celebrated (owner, 2026-10-06); a new best always with the high five. Quiet: not.
      const isCelebrated = outcome.result === 'done' && coach.options.coachChat !== 'quiet'
      const celebration = !isCelebrated ? undefined : isBest ? HIGH_FIVE : celebrationFor(result.inverse.id)
      await placeBand(
        $,
        loggedBand(result.effects.logged ?? '', result.inverse.id, {
          ...(said === undefined ? {} : { coach: said }),
          ...(celebration === undefined
            ? {}
            : { celebration: { celebration, isTooSlow: !isBest && isTooSlow(celebration, result.inverse.id), line: line(celebration.line, { day }) } }),
          isBest,
          ...(result.effects.gain === undefined ? {} : { gain: result.effects.gain }),
          isFirstEver: (result.effects.feats ?? []).includes('first-set'),
          ...(workout === undefined ? {} : { today: { done: progress.done, total: stepsFor(workout, progress).length } }),
        }),
      )
    }
    if (coach.isTurnRunning) scheduleCue($, cueDelayMs(turnWaitMs(false), at + (await gapMs($)), at))
  }
  if (outcome.result === 'done') await punch($)
  await refreshStatus($)
  return 'recorded'
}

/** Moved today: a stamp on the card (hooks/punch.ts); a full card, and he drinks the free shake. */
async function punch($: EngineInterface) {
  const day = await today($)
  const { card, isFull } = stamp(await load<PunchCard>($, 'punchCard', EMPTY_CARD), day)
  await save($, 'punchCard', card)
  const move = moveById('protein-shake')
  if (isFull && move !== undefined) await queueBand($, { ...showOffBand(line('card-full', { day }), move), isWin: true })
}

/** A band that waits its turn: shown when the slot is empty, else after whatever is there now (Undo kept). */
async function queueBand($: EngineInterface, spec: BandSpec) {
  if ((await read($, band)) === null) {
    await offerBand($, spec, 'keypress')
    return
  }
  await update($, pending, list => [...list, spec].sort((a, b) => BAND_PRIORITY[b.kind] - BAND_PRIORITY[a.kind]))
}

/** High five on the logged line: he slaps one out of the screen; counted. */
async function highFive($: EngineInterface) {
  const shown = await read($, band)
  if (shown?.kind !== 'logged') return
  const day = await today($)
  const celebration = shown.celebration === undefined ? undefined : celebrationById(shown.celebration.id)
  const isHeldOut = celebration?.kind === 'offer' && (shown.celebration?.stage === 'offered' || shown.celebration?.stage === 'dodged')
  // Held out: take it (or be too slow for it, the once); else the plain high five.
  const next =
    celebration !== undefined && isHeldOut
      ? pressCelebration(shown, celebration, { tooSlow: line('too-slow', { day }), landed: line(celebration.landed ?? 'high-five', { day }) })
      : highFiveOf(shown, line('high-five', { day }))
  if (next.celebration?.stage !== 'dodged') await save($, 'highFives', (await load($, 'highFives', 0)) + 1)
  await replaceBand($, next)
}

/** A set done: his prep moves on with it (hooks/prep.ts), and he says so at its turns. */
async function advancePrep($: EngineInterface) {
  const { prep, news } = afterSet(await load<Prep | undefined>($, 'prep', undefined), await load($, 'totalDoneSets', 0))
  if (prep === undefined) return
  await save($, 'prep', prep)
  if (news !== undefined && (await mayExtra($, true))) $.ui.toast(line(news, { day: await today($), competition: competitionOf(prep.stage) }))
}

/** His prep done: he competed between sessions, and is back with a medal. */
async function backFromCompeting($: EngineInterface) {
  const prep = await load<Prep | undefined>($, 'prep', undefined)
  if (prep?.isReady !== true) return
  const { prep: next, medal, competition } = compete(prep, await load($, 'totalDoneSets', 0))
  await save($, 'prep', next)
  const day = await today($)
  await offerBand($, prepBand(line(medal === 'gold' ? 'prep-gold' : 'prep-silver', { day, competition }), competition, medal, next.medals.length), 'timer')
}

/** A move unlocked by the sets done (collection.ts): its band, Swolomon performing it; whether it showed. */
async function showUnlock($: EngineInterface, undoId: number | undefined): Promise<boolean> {
  const unlocked = await load<string[]>($, 'moves', [])
  const move = dueUnlock(await load($, 'totalDoneSets', 0), unlocked)
  if (move === null) return false
  const have = [...unlocked, move.id]
  await save($, 'moves', have)
  const day = await today($)
  await placeBand($, unlockBand(move, STARTER_MOVES.length + have.length, STARTER_MOVES.length + UNLOCK_ORDER.length, line('unlock', { day }), undoId))
  return true
}

/** A new rank: its band, once per rank ever (§1.13.1); Undo drops the rank but keeps the mark. */
async function showRankUp($: EngineInterface, rank: string | undefined, undoId: number | undefined): Promise<boolean> {
  if (rank === undefined) return false
  const id = `rank:${rank}`
  if (!(await isDue($, id, 'ever'))) return false
  await markSeen($, id)
  void track($, { event: 'rank_up', properties: { rank } })
  const lineId = RANKS.find(r => r.name === rank)?.line
  if (lineId === undefined || lineId === null) return false
  const day = await today($)
  await placeBand($, rankupBand(rank, line(lineId, { day }), await load($, 'totalDoneSets', 0), undoId))
  return true
}

/** A feat's toast, once ever (§1.13.6). */
async function toastFeat($: EngineInterface, feat: Feat) {
  const id = `feat:${feat}`
  if (!(await isDue($, id, 'ever'))) return
  await markSeen($, id)
  void track($, { event: 'feat', properties: { id: feat } })
  await toast($, line(`feat-${feat}`, { day: await today($) }), 'keypress')
}

/** Done: one key records the set as prescribed. */
async function pressDone($: EngineInterface) {
  const shown = await read($, band)
  const cue = shown?.cue
  if (cue === undefined) return 'none' as const
  // Done mid-hold logs the seconds actually held; a hold run to the end, the full time.
  const held = shown?.kind === 'timer' && shown.hold !== undefined ? Math.max(1, shown.hold.seconds - shown.hold.left) : null
  const count = held ?? cue.count
  return recordSet($, {
    result: 'done',
    ...(count === null ? {} : { count }),
    ...(cue.weight === null ? {} : { weight: cue.weight }),
    ...(cue.band === null ? {} : { band: cue.band }),
  })
}

/** Edit: the steppers, at the prescribed values (from a set, or a hold that just ended). */
async function pressEdit($: EngineInterface) {
  const shown = await read($, band)
  if ((shown?.kind !== 'set' && shown?.kind !== 'time') || shown.cue === undefined) return
  const { cue } = shown
  const draft: Draft = { count: cue.count ?? 0, weight: cue.weight, band: cue.band }
  await replaceBand($, editBand(cue, draft, await today($)))
}

// ---------------------------------------------------------------------------------------------------------
// The hold timer (§1.12 item 1): one 1 s clock, owned by the band, so it ends with the band.

/** Starts the countdown for side 1 (from the set band) or side 2 (from Side 1 done). */
async function startHold($: EngineInterface, side: 1 | 2) {
  const shown = await read($, band)
  const cue = shown?.cue
  const target = cue === undefined ? null : targetOf(cue.exercise.reps)
  if (cue === undefined || target === null || !target.isTimed) return
  if (side === 1 ? shown?.kind !== 'set' : shown?.kind !== 'switch') return
  const seconds = cue.count ?? target.value
  const sides = /\beach\b/.test(target.unit) ? 2 : 1
  const hold = { endsAt: (await now($)) + seconds * 1000, seconds, side, sides, left: seconds } as const
  coach.holdLine = await coachLine($, 'hold-go', { day: await today($) })
  await replaceBand($, holdBand(cue, hold, coach.holdLine))
  ticker($, 'band', 1000, stop => void tickHold($, stop))
}

async function tickHold($: EngineInterface, stop: () => void) {
  const shown = await read($, band)
  const hold = shown?.hold
  if (shown?.kind !== 'timer' || hold === undefined || shown.cue === undefined) {
    stop()
    return
  }
  const left = Math.max(0, Math.ceil((hold.endsAt - (await now($))) / 1000))
  if (left === hold.left) return
  if (left > 0) {
    await update($, band, () => holdBand(shown.cue as Cue, { ...hold, left }, coach.holdLine))
    return
  }
  stop()
  const day = await today($)
  const isSwitch = hold.side === 1 && hold.sides === 2
  await replaceBand($, holdBand(shown.cue, { ...hold, left: 0 }, await coachLine($, isSwitch ? 'hold-switch' : 'hold-time', { day })))
  await playBeep($)
}

/** The hold timer's beep, unless turned off. */
async function playBeep($: EngineInterface) {
  await playCue($, 'assets/time.wav', 'keypress', coach.options.timerBeep)
}

/**
 * Every sound IdleReps makes (§1.11 Sound): through the delivery gate (paused and quiet hours silence what
 * the person did not just ask for), and a surface that cannot play it, or refuses, plays nothing.
 */
async function playCue($: EngineInterface, asset: string, cause: Message['cause'], allowed: boolean) {
  if (gate({ channel: 'sound', cause }, { ...(await deliveryContext($)), soundAllowed: allowed }) !== 'show') return
  try {
    await $.audio.play({ asset })
  } catch {
    // No sound here: nothing to do.
  }
}

/** Swolomon's line read aloud (coachSound "voice"): never two at once, so lines never queue up stale. */
async function speakLine($: EngineInterface) {
  const text = coach.talkText
  if (coach.options.coachSound !== 'voice' || coach.isSpeaking || text === '') return
  if (gate({ channel: 'sound', cause: 'timer' }, { ...(await deliveryContext($)), soundAllowed: true }) !== 'show') return
  coach.isSpeaking = true
  try {
    await $.audio.speak(text)
  } catch {
    // No voice here: nothing to do.
  } finally {
    coach.isSpeaking = false
  }
}

/** One press of a stepper. */
async function nudge($: EngineInterface, id: 'fewer' | 'more' | 'lighter' | 'heavier') {
  const shown = await read($, band)
  if (shown?.kind !== 'edit' || shown.cue === undefined || shown.draft === undefined) return
  const { cue, draft } = shown
  const direction = id === 'fewer' || id === 'lighter' ? -1 : 1
  const exercise = cue.exercise
  let next: Draft = draft
  if (id === 'fewer' || id === 'more') {
    next = { ...draft, count: stepCount(draft.count, targetOf(exercise.reps)?.isTimed ?? false, direction) }
  } else if (exercise.weight !== undefined && draft.weight !== null) {
    next = { ...draft, weight: stepWeight(draft.weight, exercise.weight.step, direction) }
  } else if (exercise.band !== undefined && draft.band !== null) {
    next = { ...draft, band: stepBand(exercise.band.levels, draft.band, direction) }
  }
  await update($, band, () => editBand(cue, next, dayNumberOf(Date.now())))
}

/** Save: records what the steppers say. */
async function saveDraft($: EngineInterface) {
  const shown = await read($, band)
  if (shown?.kind !== 'edit' || shown.cue === undefined || shown.draft === undefined) return 'none' as const
  const { cue, draft } = shown
  return recordSet($, {
    result: 'done',
    ...(cue.count === null ? {} : { count: draft.count }),
    ...(draft.weight === null ? {} : { weight: draft.weight }),
    ...(draft.band === null ? {} : { band: draft.band }),
  })
}

/** Undo: puts back exactly what the last record changed, and shows that set again. A band's Undo undoes only its own record. */
async function undoLast($: EngineInterface, fromBand: number | undefined): Promise<boolean> {
  const inverse = await load<Inverse | undefined>($, 'undo', undefined)
  if (inverse === undefined) return false
  if (fromBand !== undefined && inverse.id !== fromBand) {
    await clearBand($)
    $.ui.toast(line('undo-stale', { day: await today($) }))
    return true
  }
  stopCue()
  for (const [key, value] of Object.entries(inverse.restore)) await save($, key as StoreKey, value)
  for (const key of inverse.remove) await save($, key, undefined)
  if (inverse.drop > 0) await save($, 'history', (await load<HistoryEntry[]>($, 'history', [])).slice(0, -inverse.drop))
  await save($, 'undo', undefined)
  if (inverse.cue === null) await clearBand($)
  else await replaceBand($, await setBandFor($, inverse.cue, undefined))
  await refreshStatus($)
  return true
}

/** The workout's rating: recorded, and the progression redone with it. */
async function rate($: EngineInterface, rating: Rating): Promise<boolean> {
  const shown = await read($, band)
  const plan = await loadPlan($)
  if (shown?.kind !== 'rating' || shown.basis === undefined || plan === null) return false
  const result = record(
    await recordStoreOf($),
    { type: 'rating', rating, basis: shown.basis },
    { plan, today: await today($), now: await now($), gapMs: (await gapMs($)), setting: plan.answers?.setting ?? 'home' },
  )
  await writePatch($, result.patch)
  await save($, 'undo', result.inverse)
  void track($, { event: 'workout_rated', properties: { rating } })
  await clearBand($)
  // What the workout earned, now that the rating has settled it: the new targets, said once.
  const workout = plan.workouts[shown.basis.workout]
  const after = (result.patch.set.targets as Targets | undefined) ?? (await load<Targets>($, 'targets', {}))
  const raised = workout === undefined ? [] : raisedTargets(workout, shown.basis.targetsBefore, after)
  if (raised.length > 0) await toast($, line('next-time', { day: await today($), list: raised.map(r => `${r.name} ${r.amount}`).join(' · ') }), 'keypress')
  // The plan's last workout: the block is done, and that is the moment, not a bonus set.
  if ((await load($, 'progress', START)).workout >= plan.workouts.length) {
    await offerProgramEnd($, 'keypress')
    return true
  }
  // It felt easy: push a little further while it does. One set of the workout's first exercise, at its new target.
  const planned = workout?.exercises[0]
  if (rating === 'easy' && shown.basis.half !== true && planned !== undefined) {
    const target = targetFor(planned, after)
    const exercise = effectiveExercise(planned, target)
    const count = targetOf(exercise.reps)?.value
    const weight = exercise.weight === undefined ? undefined : (target.weight ?? exercise.weight.start)
    const level = exercise.band === undefined ? undefined : (target.band ?? exercise.band.start)
    const bonus = {
      workout: shown.basis.workout,
      exercise: exercise.name,
      target: exercise.reps,
      ...(count === undefined ? {} : { count }),
      ...(weight === undefined ? {} : { weight }),
      ...(level === undefined ? {} : { band: level }),
    }
    const day = await today($)
    await offerBand($, bonusBand(await coachLine($, 'bonus-ask', { day }), bonus, describeAmount(exercise, count, weight, level)), 'keypress')
  }
  return true
}

/** `/workout now`, `start` and `today`: ignores the training day and the gap, never a second workout in a day. */
async function startFromCommand($: EngineInterface, arg: 'now' | 'start' | 'today'): Promise<string> {
  const plan = await loadPlan($)
  const day = await today($)
  if (plan === null) return noPlanReply($)
  let progress = await load($, 'progress', START)
  if (progress.workout >= plan.workouts.length) return line('reply-plan-finished', { day })
  if (progress.lastCompletedOn === day) {
    const next = nextTrainingDay(plan, progress, day)
    return line('reply-done-today', { day, nextDay: next === null ? 'soon' : longDayName(next) })
  }
  if (arg === 'today') {
    progress = { ...progress, extraDay: day }
    await save($, 'progress', progress)
  }
  const shown = await read($, band)
  const cue = await startWorkout($, shown?.kind === 'ask' ? shown.reason : undefined)
  if (cue === null) return line('reply-plan-finished', { day })
  return line('reply-up-next', { day, exercise: cue.exercise.name, amount: describeAmount(cue.exercise, cue.count, cue.weight, cue.band) })
}

/**
 * The half version of today's workout (`/workout half`, or Just half on the ask band): each exercise's sets
 * halved. Showing up beats doing nothing; it counts as the workout done, and moves no targets.
 */
async function chooseHalf($: EngineInterface): Promise<string> {
  const plan = await loadPlan($)
  const day = await today($)
  if (plan === null) return noPlanReply($)
  const progress = await load($, 'progress', START)
  const workout = plan.workouts[progress.workout]
  if (workout === undefined) return line('reply-plan-finished', { day })
  if (progress.lastCompletedOn === day) {
    const next = nextTrainingDay(plan, progress, day)
    return line('reply-done-today', { day, nextDay: next === null ? 'soon' : longDayName(next) })
  }
  const halfSets = stepsOf(workout, { half: true }).length
  if (progress.half !== true && progress.done >= halfSets) return line('reply-past-half', { day, n: stepsOf(workout).length - progress.done })
  await startWorkout($, undefined, { half: true })
  return line('reply-half', { day, n: halfSets })
}

/** The person's last workout was a while ago, or the last one was Tough: the ask says half is fine. */
async function softerAskLine($: EngineInterface, cue: Cue, day: number): Promise<LineId | null> {
  if (cue.canHalve !== true) return null
  const history = await load<HistoryEntry[]>($, 'history', [])
  const lastSet = history.findLast(e => e.kind === 'set' && e.result === 'done')
  if (lastSet !== undefined && day - lastSet.d >= COMEBACK_DAYS) return 'comeback'
  const lastRating = history.findLast(e => e.kind === 'rating')
  if (lastRating?.kind === 'rating' && lastRating.rating === 'tough' && lastRating.d < day) return 'after-tough'
  return null
}

/** One bonus set, done: in the history and the totals, outside the plan's progress. */
async function recordBonus($: EngineInterface) {
  const shown = await read($, band)
  if (shown?.bonus === undefined) return
  const { workout: w, ...bonus } = shown.bonus
  const day = await today($)
  const entry: HistoryEntry = { kind: 'set', t: await now($), d: day, w, set: 0, result: 'done', ...bonus }
  await writePatch($, { set: { totalDoneSets: (await load($, 'totalDoneSets', 0)) + 1 }, append: [entry] })
  if (coach.isTurnRunning) coach.turnSets += 1
  await clearBand($)
  $.ui.toast(line('bonus-done', { day }))
  await refreshStatus($)
}

// ---------------------------------------------------------------------------------------------------------
// The end of a block, the person's data, and sharing the week (§1.9, §1.12 items 4 and 5).

/** The block is done: what it came to, once a day until answered (once-ledger `program-end-ask`). */
async function offerProgramEnd($: EngineInterface, cause: Message['cause']) {
  const plan = await loadPlan($)
  if (plan === null || (await load($, 'progress', START)).workout < plan.workouts.length) return
  const since = await planStartedOn($)
  const history = await load<HistoryEntry[]>($, 'history', [])
  const sets = history.filter(e => e.kind === 'set' && e.result === 'done' && e.d >= since).length
  const stronger = gainsOf({ plan, targets: await load<Targets>($, 'targets', {}), history }).length
  await markSeen($, 'program-end-ask')
  await offerBand($, programEndBand(await today($), { workouts: plan.workouts.length, sets, stronger }), cause)
}

/**
 * Next block: the plan again from workout 1, regenerated from its answers when it has them, with every
 * target kept, so weights, reps and harder variants carry on where they were.
 */
async function nextBlock($: EngineInterface): Promise<string> {
  const plan = await loadPlan($)
  const day = await today($)
  if (plan === null) return noPlanReply($)
  const progress = await load($, 'progress', START)
  if (progress.workout < plan.workouts.length) return line('reply-not-finished', { day, n: plan.workouts.length - progress.workout })
  const next = plan.answers === undefined ? plan : generateProgram(plan.answers)
  await $.fs.write(planPath(), `${JSON.stringify(next, null, 2)}\n`)
  coach.planCache = null
  await save($, 'progress', { ...START, lastCompletedOn: progress.lastCompletedOn })
  await save($, 'undo', undefined)
  await save($, 'planStartedOn', day)
  if ((await read($, band))?.kind === 'programEnd') await clearBand($)
  const text = line('next-block', { day })
  $.ui.toast(text)
  await refreshStatus($)
  return text
}

/** `/workout export`: the history as CSV, and the backup restore reads. */
async function exportData($: EngineInterface): Promise<string> {
  const values: Partial<Record<StoreKey, unknown>> = {}
  for (const key of BACKUP_KEYS) values[key] = await $.store.get(key)
  const history = (values.history as HistoryEntry[] | undefined) ?? []
  const csvPath = csvPathOf(coach.home)
  const backupPath = backupPathOf(coach.home)
  await $.fs.write(csvPath, historyCsv(history, await loadPlan($)))
  await $.fs.write(backupPath, `${JSON.stringify(backupOf(values, CURRENT_SCHEMA, await now($)))}\n`)
  return line('reply-exported', { day: await today($), n: history.filter(e => e.kind === 'set').length, path: csvPath, backup: backupPath })
}

/** The backup file, read and checked, or why it cannot be used. */
async function readBackup($: EngineInterface): Promise<ReturnType<typeof parseBackup>> {
  const path = backupPathOf(coach.home)
  if (!(await $.fs.exists(path))) return { error: 'does not exist' }
  try {
    return parseBackup(await $.fs.read(path))
  } catch {
    return { error: 'could not be read' }
  }
}

const backupDate = (ms: number) => new Date(ms).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

/** `/workout restore`: asks first (D20), naming the backup's date; a missing or bad file changes nothing. */
async function askRestore($: EngineInterface): Promise<string | null> {
  const day = await today($)
  const read = await readBackup($)
  if ('error' in read) return line('reply-restore-missing', { day, path: backupPathOf(coach.home), reason: read.error })
  await placeBand($, restoreBand(day, backupDate(read.backup.exportedAt)))
  return null
}

/** Restore, confirmed: every backed-up key written, those the backup lacks deleted, then migrations. */
async function restoreBackup($: EngineInterface) {
  const day = await today($)
  const read = await readBackup($)
  await clearBand($)
  if ('error' in read) {
    $.ui.toast(line('reply-restore-missing', { day, path: backupPathOf(coach.home), reason: read.error }))
    return
  }
  for (const key of BACKUP_KEYS) await save($, key, read.backup.store[key])
  await save($, 'undo', undefined)
  await migrate($)
  $.ui.toast(line('reply-restored', { day, date: backupDate(read.backup.exportedAt) }))
  await refreshStatus($)
}

/** Erase, confirmed: every stored key. The plan file stays. */
async function eraseAll($: EngineInterface) {
  const day = await today($)
  stopCue()
  await clearBand($)
  for (const info of STORE_KEYS) await save($, info.key, undefined)
  coach.installId = null
  $.ui.toast(line('reply-erased', { day }))
  await refreshStatus($)
}

/** The turn's wall-clock time, merged into the shared record of when the agent was working. */
async function recordWorkTime($: EngineInterface) {
  const intervals = await load<WorkIntervals>($, 'workIntervals', {})
  await save($, 'workIntervals', addInterval(intervals, coach.turnStartedAt, await now($), dayNumberOf, startOfDayMs))
}

/** `/workout share` and Share week (§1.9): the line copied, and said so; it is the person's to post. */
async function shareWeek($: EngineInterface, surface: string | undefined): Promise<string> {
  const day = await today($)
  const history = await load<HistoryEntry[]>($, 'history', [])
  const sets = setsThisWeek(history, day)
  if (sets === 0) return line('reply-share-empty', { day })
  let intervals = await load<WorkIntervals>($, 'workIntervals', {})
  if (coach.isTurnRunning) intervals = addInterval(intervals, coach.turnStartedAt, await now($), dayNumberOf, startOfDayMs)
  const worked = workedMs(intervals, mondayOf(day), day)
  const text = shareLine(worked, sets, rankFor(await load($, 'totalDoneSets', 0)).name)
  void track($, { event: 'week_shared', properties: { sets, hours: Math.floor(worked / 3_600_000) } })
  try {
    const copied = await $.ui.copy({ text, ...(surface === undefined ? {} : { surface: surface as Parameters<EngineInterface['ui']['copy']>[0]['surface'] }) })
    return copied.isCopied ? line('reply-shared', { day, text }) : text
  } catch {
    return text
  }
}

// ---------------------------------------------------------------------------------------------------------
// Feedback and telemetry (§1.6, D9): only ever to the site's own endpoints.

/** The anonymous id feedback and telemetry carry: a random UUID, made the first time it is needed, read once. */
function installIdOf($: EngineInterface): Promise<string> {
  coach.installId ??= (async () => {
    const stored = await load<string | undefined>($, 'installId', undefined)
    if (stored !== undefined) return stored
    const id = crypto.randomUUID()
    await save($, 'installId', id)
    return id
  })()
  return coach.installId
}

/** POSTs JSON to one of the site's endpoints; whether it took it. Never throws. */
async function post($: EngineInterface, url: string, payload: unknown): Promise<boolean> {
  try {
    return (await $.http.fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })).ok
  } catch {
    return false
  }
}

/** Whether usage events go out: live (D9) and opted in. Callers check it before working out an event. */
const isTracking = () => TELEMETRY_ENABLED && coach.options.telemetry

/** One usage event, when tracking; a failed send is ignored. */
async function track($: EngineInterface, e: TelemetryEvent) {
  if (isTracking()) await post($, TELEMETRY_URL, telemetryPayload(e, await installIdOf($), PLUGIN_VERSION))
}

/** A plan from setup or Quick start: what was chosen, nothing typed. */
function trackSetup($: EngineInterface, plan: Plan, opts: { isQuickStart: boolean; cueEvery: string; idleReminder: string }) {
  if (isTracking() && plan.answers !== undefined) void track($, { event: 'setup_completed', properties: setupProperties(plan.answers, opts) })
}

async function feedbackContext($: EngineInterface, surface: string | undefined) {
  const [installId, surfaces] = await Promise.all([installIdOf($), surface === undefined ? $.session.surfaces() : [surface]])
  return { installId, pluginVersion: PLUGIN_VERSION, surface: surfaces[0] ?? 'terminal' }
}

/** `/workout feedback <text>` (§1.6): sent as written; when it can't be, copied so it can be posted instead. */
async function sendFeedback($: EngineInterface, text: string): Promise<string> {
  const day = await today($)
  const said = text.trim()
  if (said === '') return line('reply-feedback-usage', { day, url: COMMUNITY_URL })
  const cut = cutFeedback(said)
  if (await post($, FEEDBACK_URL, feedbackPayload({ kind: 'feedback', text: cut.text }, await feedbackContext($, undefined)))) {
    return line(cut.isCut ? 'reply-feedback-sent-cut' : 'reply-feedback-sent', { day, url: COMMUNITY_URL, max: FEEDBACK_MAX.toLocaleString('en-US') })
  }
  const copied = await $.ui.copy({ text: said }).catch(() => ({ isCopied: false }))
  return line(copied.isCopied ? 'reply-feedback-copied' : 'reply-feedback-failed', { day, url: COMMUNITY_URL })
}

/** After the third completed workout, the check-in waits behind everything else, once ever (§1.6). */
async function offerPulse($: EngineInterface) {
  if (!(await isDue($, 'pulse', 'ever'))) return
  const completed = (await load<HistoryEntry[]>($, 'history', [])).filter(entry => entry.kind === 'workout-complete').length
  if (completed < 3) return
  await markSeen($, 'pulse')
  await placeBand($, pulseBand(await today($)))
}

/** 1 to 3 send the answer (the button's id) and thank; 4 says how to say more. */
async function answerPulse($: EngineInterface, id: string, surface: string) {
  await clearBand($)
  const day = await today($)
  if (id === 'tellmore') {
    $.ui.toast(line('pulse-more', { day, url: COMMUNITY_URL }))
    return
  }
  $.ui.toast(line('pulse-thanks', { day }))
  void feedbackContext($, surface).then(ctx => post($, FEEDBACK_URL, feedbackPayload({ kind: 'pulse', answer: id as PulseAnswer }, ctx)))
}

async function noPlanReply($: EngineInterface): Promise<string> {
  const day = await today($)
  const file = await planFile($)
  return file.error === null ? line('reply-no-plan', { day }) : line('reply-fix-plan', { day, path: planPath(), reason: file.error })
}

// ---------------------------------------------------------------------------------------------------------
// First run and setup (§1.2, §1.5).

async function isSafetyAcknowledged($: EngineInterface) {
  return !(await isDue($, 'safety', 'ever'))
}

/** Where Quick start's plan is for: a desk, a floor with no gear, or weights (dumbbells, a bar, bands). */
type Where = 'desk' | 'home' | 'gym'

const QUICK_START: Record<Where, { answers: Partial<Answers>; toast: 'quick-start' | 'quick-start-home' | 'quick-start-gym' }> = {
  desk: { answers: { setting: 'office' }, toast: 'quick-start' },
  home: { answers: { setting: 'home' }, toast: 'quick-start-home' },
  gym: { answers: { setting: 'home', equipment: { dumbbells: true, bar: true, bands: true } }, toast: 'quick-start-gym' },
}

/**
 * Quick start (§1.5): one question (where they train), then the starter plan and today's first set, offered
 * at once in the band where the person already is. Two presses from the introduction to a set.
 */
async function quickStart($: EngineInterface, where?: Where) {
  // One question, so the first set fits where the person is: a desk plan never asks for the floor.
  if (where === undefined) {
    await replaceBand($, whereBand(await today($)))
    return
  }
  const plan = generateProgram({ ...STARTER_ANSWERS, ...QUICK_START[where].answers })
  await writePlan($, plan)
  trackSetup($, plan, { isQuickStart: true, cueEvery: coach.options.cueEvery, idleReminder: coach.options.idleReminder })
  await clearFirstRun($)
  $.ui.toast(line(QUICK_START[where].toast, { day: await today($) }))
  await offerToday($, plan)
}

/** Keep my plan: the plan already there, and its first set offered now. */
async function keepPlan($: EngineInterface) {
  const plan = await loadPlan($)
  if (plan === null) return
  await markSeen($, 'onboarded')
  await clearFirstRun($)
  await offerToday($, plan)
}

/** The first run's own bands go once it has led somewhere. */
async function clearFirstRun($: EngineInterface) {
  const kind = (await read($, band))?.kind
  if (kind === 'intro' || kind === 'where' || kind === 'program' || kind === 'byoplan') await clearBand($)
}

/**
 * Right after a new plan, the first set is offered at once (§1.7 ease 7: first value fast). On a training
 * day it is today's workout, on the ask band with Swolomon's plan-ready line and how the rest will come;
 * on a rest day, the first workout's day and a set now for a taste. Whether a band was offered.
 */
async function offerToday($: EngineInterface, plan: Plan): Promise<boolean> {
  const offered = async (spec: BandSpec) => {
    await offerBand($, spec, 'keypress')
    return (await read($, band))?.kind === spec.kind
  }
  const ctx = await cueContextOf($, plan)
  const cue = cueFor(plan, ctx.progress, await load<Targets>($, 'targets', {}))
  if (cue === null) return false
  if (cueAllowed(ctx, { ignoreTrainingDay: false, ignoreGap: true })) {
    const text = await coachLine($, 'plan-ready-ask', cueLineContext(cue, ctx.today, ''))
    return offered(askBand(cue, text, ctx.today, undefined, { isNewPlan: true, withSafety: !(await isSafetyAcknowledged($)) }))
  }
  if (!cueAllowed(ctx, { ignoreTrainingDay: true, ignoreGap: true })) return false
  const first = nextTrainingDay(plan, ctx.progress, ctx.today)
  const text = await coachLine($, 'plan-ready-later-ask', { day: ctx.today, when: first === null ? 'soon' : longDayName(first) })
  return offered(readyBand(text, ctx.today))
}

async function openSetup($: EngineInterface, opts: { isQuickStart: boolean }) {
  const plan = await loadPlan($)
  const state = newSetup({
    isSafetyAcknowledged: await isSafetyAcknowledged($),
    isQuickStart: opts.isQuickStart,
    ...(plan?.answers === undefined ? {} : { answers: plan.answers }),
    cueEvery: coach.options.cueEvery,
    idleReminder: coach.options.idleReminder,
    ...(TELEMETRY_ENABLED ? { telemetry: coach.options.telemetry } : {}),
  })
  await update($, setup, () => state)
  await $.ui.open({ id: SETUP_PANE, title: 'Set up IdleReps', focus: true, closeOnEscape: true })
}

async function closeSetup($: EngineInterface) {
  await update($, setup, () => null)
  await $.ui.close({ id: SETUP_PANE })
}

/** The safety step's I understand: marked once ever; Quick start then writes its plan. */
async function acknowledgeSafety($: EngineInterface) {
  await markSeen($, 'safety')
  const state = await read($, setup)
  if (state?.isQuickStart === true) {
    await closeSetup($)
    await quickStart($)
    return
  }
  await update($, setup, s => (s === null ? s : { ...s, screen: 'start' as const }))
}

async function setupChoose($: EngineInterface, index: number) {
  const state = await read($, setup)
  if (state === null) return
  const choice = screenOf(state, planPath()).choices?.[index]
  if (choice === undefined) return
  await update($, setup, () => choice.apply(state))
}

async function setupChange($: EngineInterface, change: (state: SetupState) => SetupState) {
  await update($, setup, s => (s === null ? s : change(s)))
}

/** Start plan: writes the plan, saves the cadence answers to /config, closes the dialog. */
async function startPlan($: EngineInterface) {
  const state = await read($, setup)
  if (state === null || !(await isSafetyAcknowledged($))) return
  const plan = planOf(state)
  await writePlan($, plan)
  const before = coach.options
  const settings = { cueEvery: state.cueEvery, idleReminder: state.idleReminder, ...(state.telemetry === undefined ? {} : { telemetry: state.telemetry }) }
  // Q10's answer counts from here: the setup's own completion is the first event it covers.
  if (state.telemetry !== undefined) coach.options = { ...before, telemetry: state.telemetry }
  trackSetup($, plan, { isQuickStart: false, cueEvery: state.cueEvery, idleReminder: state.idleReminder })
  for (const [field, value] of Object.entries(settings)) {
    if (before[field as keyof Options] === value) continue
    const written = await $.config.set({ key: `idlereps.${field}`, value }).catch(() => ({ deny: 'failed' }))
    if ('deny' in written) {
      $.ui.toast(line('config-failed', { day: await today($) }))
      break
    }
  }
  await closeSetup($)
  const showing = await read($, band)
  if (showing?.kind === 'intro') await clearBand($)
  const day = await today($)
  if (await offerToday($, plan)) {
    $.ui.toast(line('plan-ready', { day, name: plan.name }))
    return
  }
  const first = isTrainingDay(plan, START, day) ? day : nextTrainingDay(plan, START, day)
  const when = first === null ? 'soon' : first === day ? 'today' : longDayName(first)
  $.ui.toast(line('plan-ready-later', { day, when }))
}

async function copyExample($: EngineInterface, surface: string) {
  await $.ui.copy({ text: EXAMPLE_PLAN, surface: surface as Parameters<EngineInterface['ui']['copy']>[0]['surface'] })
}

// ---------------------------------------------------------------------------------------------------------
// Status (§1.4).

async function statusFacts($: EngineInterface, plan: Plan): Promise<StatusFacts> {
  return {
    plan,
    progress: await load($, 'progress', START),
    history: await load<HistoryEntry[]>($, 'history', []),
    targets: await load<Targets>($, 'targets', {}),
    today: await today($),
    declinedOn: await load<number | undefined>($, 'declinedOn', undefined),
    paused: await load($, 'paused', false),
    totalDoneSets: await load($, 'totalDoneSets', 0),
    since: await planStartedOn($),
    memory: await load($, 'lastByExercise', {}),
    moves: await load<string[]>($, 'moves', []),
    prep: await load<Prep | undefined>($, 'prep', undefined),
    shinies: await load($, 'shinies', 0),
    punchCard: await load<PunchCard>($, 'punchCard', EMPTY_CARD),
  }
}

/** The plan's first day; for a plan from before it was recorded, the first day in the log, else today. */
async function planStartedOn($: EngineInterface): Promise<number> {
  const stored = await load<number | undefined>($, 'planStartedOn', undefined)
  if (stored !== undefined) return stored
  const first = (await load<HistoryEntry[]>($, 'history', []))[0]
  return first?.d ?? (await today($))
}

/**
 * Today's tally in the prompt footer, and the status pane's facts while it is open. The tally is one of the
 * footer's dim mode labels (`SessionMode`), not a pinned status line: those carry the engine's warning mark.
 */
async function refreshStatus($: EngineInterface) {
  if (await isRemindMode($)) {
    const facts = await remindFacts($)
    coach.isMidWorkout = false
    setTally($, coach.options.statusLine ? remindLineOf(facts) : undefined)
    if (coach.isStatusOpen) await update($, statusView, () => remindViewOf(facts))
    return
  }
  const plan = await loadPlan($)
  const facts = plan === null ? null : await statusFacts($, plan)
  const tally = facts === null ? undefined : statusLineOf(facts)
  coach.isMidWorkout = /^💪 [1-9]\d*\//.test(tally ?? '')
  setTally($, coach.options.statusLine ? tally : undefined)
  if (facts !== null && coach.isStatusOpen) await update($, statusView, () => statusViewOf(facts))
}

async function remindFacts($: EngineInterface): Promise<RemindFacts> {
  return {
    history: await load<HistoryEntry[]>($, 'history', []),
    today: await today($),
    paused: await load($, 'paused', false),
    totalDoneSets: await load($, 'totalDoneSets', 0),
    moves: await load<string[]>($, 'moves', []),
    prep: await load<Prep | undefined>($, 'prep', undefined),
    shinies: await load($, 'shinies', 0),
    punchCard: await load<PunchCard>($, 'punchCard', EMPTY_CARD),
  }
}

/** `/workout` in Just remind me: the pane, Swolomon curling in it (flexing once a set is in). */
async function openRemindPane($: EngineInterface): Promise<string | null> {
  const facts = await remindFacts($)
  const view = remindViewOf(facts)
  await update($, statusView, () => view)
  coach.isStatusOpen = true
  const rows = Math.max(PORTRAIT_ROWS, view.head.length + 3) + 1 + view.more.length
  const opened = await $.ui.open({ id: STATUS_PANE, title: 'IdleReps', rows })
  if (opened.isPlaced) playPaneMove($, moveById((await isLateNight($)) ? 'nap' : view.isWin ? 'double-biceps' : 'curl'))
  return opened.isPlaced ? null : remindTextOf(facts)
}

function setTally($: EngineInterface, tally: string | undefined) {
  if (tally === coach.tally) return
  coach.tally = tally
  $.ui.invalidate('ui.render')
}

/** The spinner's words while today's workout is under way, one per engine word so a turn keeps its own. */
const GYM_WORDS = ['Repping', 'Spotting', 'Benching', 'Curling', 'Squatting', 'Pressing', 'Flexing', 'Chalking up', 'Racking', 'Pumping']
const gymWord = (word: string) => GYM_WORDS[[...word].reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 9973, 7) % GYM_WORDS.length] ?? 'Repping'



// ---------------------------------------------------------------------------------------------------------
// Session-wide one-shots: the idle reminder and the midnight rollover (§4.3 item 3).

async function armIdle($: EngineInterface) {
  coach.idleTimer?.cancel()
  coach.idleTimer = null
  const minutes = Number(coach.options.idleReminder)
  if (!(minutes > 0) || coach.isTurnRunning) return
  const plan = await trainingPlan($)
  if (plan === null || (await load($, 'paused', false))) return
  if (!cueAllowed(await cueContextOf($, plan), { ignoreTrainingDay: false, ignoreGap: true })) return
  coach.idleTimer = timer($, 'session', minutes * 60_000, () => void remindIdle($))
}

async function remindIdle($: EngineInterface) {
  coach.idleTimer = null
  const minutes = Number(coach.options.idleReminder)
  const plan = await trainingPlan($)
  if (plan === null || coach.isTurnRunning) return
  const ctx = await cueContextOf($, plan)
  const cue = cueFor(plan, ctx.progress, await load<Targets>($, 'targets', {}))
  if (cue !== null && cueAllowed(ctx, { ignoreTrainingDay: false, ignoreGap: true }) && (await isDue($, 'idle-reminder', { everyMs: minutes * 60_000 }))) {
    if ((await decide($, { channel: 'toast', cause: 'timer' })) === 'show') {
      $.ui.toast(line('idle-reminder', { day: ctx.today, workout: shortWorkoutName(cue.workoutName), n: cue.stepCount - cue.step + 1 }))
      await markSeen($, 'idle-reminder')
    }
  }
  await armIdle($)
}

async function armMidnight($: EngineInterface) {
  coach.midnightTimer?.cancel()
  const at = await now($)
  const midnight = new Date(at)
  midnight.setHours(24, 0, 0, 0)
  coach.midnightTimer = timer($, 'session', midnight.getTime() - at, () => void rollOver($))
}

async function rollOver($: EngineInterface) {
  await refreshStatus($)
  await armIdle($)
  await armMidnight($)
}

/** After an update, the release's For you lines, once (§1.12 item 8); never on a first install. */
async function whatsNew($: EngineInterface, isFresh: boolean) {
  const id = `whats-new:${PLUGIN_VERSION}`
  if (!(await isDue($, id, 'ever'))) return
  const text = whatsNewLine(PLUGIN_VERSION, await today($))
  if (isFresh || text === null) {
    await markSeen($, id)
    return
  }
  if ((await decide($, { channel: 'toast', cause: 'timer' })) !== 'show') return
  $.ui.toast(text)
  await markSeen($, id)
}

/** The first session of a Monday: last week's sets, in place of the day toast (§1.13.4); once a week. */
async function mondayRecap($: EngineInterface): Promise<boolean> {
  const day = await today($)
  if (weekdayName(day) !== 'mon' || !(await isDue($, 'recap', 'week'))) return false
  if ((await decide($, { channel: 'toast', cause: 'timer' })) !== 'show') return false
  const monday = mondayOf(day)
  const history = await load<HistoryEntry[]>($, 'history', [])
  const sets = history.filter(e => ((e.kind === 'set' && e.result === 'done') || e.kind === 'moved') && e.d >= monday - 7 && e.d < monday).length
  const minutes = minutesWords(movedSeconds(history, monday - 7, monday - 1))
  $.ui.toast(sets > 0 ? line('recap', { day, sets, minutes }) : line('recap-zero', { day }))
  await markSeen($, 'recap')
  // The recap takes the day toast's place, so it uses up the day toast too.
  await markSeen($, 'day-toast')
  return true
}

/** Gyms (projects) kept, by folder name. */
const GYMS_KEPT = 50

/** A project he has not seen them in before: a new gym, and he says so (never on the very first session). */
async function noticeGym($: EngineInterface, cwd: string) {
  const gym = cwd.split(/[\\/]/).filter(part => part !== '').at(-1)
  if (gym === undefined) return
  const gyms = await load<string[]>($, 'gyms', [])
  if (gyms.includes(gym)) return
  await save($, 'gyms', [...gyms, gym].slice(-GYMS_KEPT))
  if (gyms.length === 0 || (await decide($, { channel: 'toast', cause: 'timer' })) !== 'show' || !(await mayExtra($, true))) return
  $.ui.toast(line('new-gym', { day: await today($), gym: gym.length > 24 ? `${gym.slice(0, 23)}…` : gym }))
}

/** The first session of a day: Swolomon's hello, if he has one (hooks/greeting.ts); whether he said it. */
async function greet($: EngineInterface): Promise<boolean> {
  const day = await today($)
  const lastSeenOn = await load<number | undefined>($, 'lastSeenOn', undefined)
  if (lastSeenOn === day) return false
  const history = await load<HistoryEntry[]>($, 'history', [])
  const greeting = greetingOf({
    lastSeenOn,
    today: day,
    movedYesterday: history.filter(e => e.d === day - 1 && isMovement(e)).length,
    workedYesterdayMs: workedMs(await load<WorkIntervals>($, 'workIntervals', {}), day - 1, day - 1),
  })
  // Held back (quiet hours): said at a later session today instead, so the day is not marked seen yet.
  if (greeting !== null && (await decide($, { channel: 'toast', cause: 'timer' })) !== 'show') return false
  await save($, 'lastSeenOn', day)
  if (greeting === null || !(await mayExtra($, true))) return false
  $.ui.toast(line(greeting.id, { day, ...greeting.ctx }))
  // The hello takes the day toast's place, so it uses up the day toast too.
  await markSeen($, 'day-toast')
  return true
}

/** Once per calendar day, at the first session start on a training day: Swolomon's day toast (§1.10c). */
async function dayToast($: EngineInterface, plan: Plan) {
  const ctx = await cueContextOf($, plan)
  if (!cueAllowed(ctx, { ignoreTrainingDay: false, ignoreGap: true })) return
  if (!(await isDue($, 'day-toast', 'day'))) return
  const cue = cueFor(plan, ctx.progress, await load<Targets>($, 'targets', {}))
  if (cue === null) return
  if ((await decide($, { channel: 'toast', cause: 'timer' })) !== 'show') return
  $.ui.toast(await coachLine($, 'day-toast', cueLineContext(cue, ctx.today, '')))
  await markSeen($, 'day-toast')
}

async function closeStatus($: EngineInterface) {
  coach.isStatusOpen = false
  cancelTimers('pane')
  coach.paneFrame = null
  await $.ui.close({ id: STATUS_PANE })
}

/** Give me a plan: the three ways to one. */
async function offerProgram($: EngineInterface) {
  const day = await today($)
  await replaceBand($, programBand(await coachLine($, 'program-ask', { day }), day))
}

/** Back from a first-run step to the introduction, without the entrance. */
async function backToIntro($: EngineInterface) {
  await replaceBand($, introBand(await today($), { entrance: false, hasPlan: (await loadPlan($)) !== null }))
}

// ---------------------------------------------------------------------------------------------------------
// Buttons: every press goes through the action's id, so a button and `/workout <id>` do the same thing.

async function runAction($: EngineInterface, kind: ActionKind, id: string, surface: string): Promise<void> {
  const was = coach.isAnswering
  coach.isAnswering = true
  try {
    await answerAction($, kind, id, surface)
  } finally {
    coach.isAnswering = was
  }
}

async function answerAction($: EngineInterface, kind: ActionKind, id: string, surface: string): Promise<void> {
  if (kind === 'intro') {
    if (id === 'quickstart') await quickStart($)
    else if (id === 'keep') await keepPlan($)
    else if (id === 'remind') await startRemind($)
    else if (id === 'program') await offerProgram($)
    else if (id === 'notnow') {
      coach.isIntroDismissed = true
      await clearBand($)
    }
    return
  }
  if (kind === 'program') {
    if (id === 'quickstart') await quickStart($)
    else if (id === 'setup') await openSetup($, { isQuickStart: false })
    else if (id === 'own') await replaceBand($, byoplanBand(await coachLine($, 'byoplan-ask', { day: await today($) }), await today($), planPath()))
    else await backToIntro($)
    return
  }
  if (kind === 'byoplan') {
    await offerProgram($)
    return
  }
  if (kind === 'remind') {
    if (isMoved(id)) await logMoved($, id)
    else if (id === 'later') await snooze($)
    else {
      const day = await today($)
      await save($, 'declinedOn', day)
      await clearBand($)
      $.ui.toast(line('remind-skipped', { day }))
    }
    return
  }
  if (kind === 'remindPane') {
    if (id === 'close') await closeStatus($)
    else if (id === 'now') await placeBand($, await remindBandFor($))
    else await placeBand($, programBand(await coachLine($, 'program-ask', { day: await today($) }), await today($)))
    return
  }
  if (kind === 'pulse') {
    await answerPulse($, id, surface)
    return
  }
  if (kind === 'unlock' && id !== 'undo') {
    const shown = await read($, band)
    // Again: the same band, from the top, so he performs it once more.
    if (id === 'again' && shown?.kind === 'unlock') await replaceBand($, { ...shown })
    else await clearBand($)
    return
  }
  if (kind === 'warmup') {
    // Either answer: the first set at once, with the word it would have had.
    const shown = await read($, band)
    if (shown?.cue !== undefined) await placeBand($, await setBandFor($, shown.cue, shown.thenCoach))
    else await clearBand($)
    return
  }
  if (kind === 'programEnd') {
    if (id === 'nextblock') await nextBlock($)
    else if (id === 'changeplan') {
      await clearBand($)
      await openSetup($, { isQuickStart: false })
    } else await clearBand($)
    return
  }
  if (kind === 'restore' || kind === 'erase') {
    if (id === 'restore') await restoreBackup($)
    else if (id === 'erase') await eraseAll($)
    else {
      await clearBand($)
      $.ui.toast(line('reply-cancelled', { day: await today($) }))
    }
    return
  }
  if (kind === 'bonus') {
    if (id === 'bonus') await recordBonus($)
    else await clearBand($)
    return
  }
  if (kind === 'where') {
    await quickStart($, id === 'home' || id === 'gym' ? id : 'desk')
    return
  }
  if (kind === 'logged' && id === 'highfive') {
    await highFive($)
    return
  }
  if (kind === 'prep') {
    await clearBand($)
    return
  }
  if (kind === 'question') {
    await answerQuestion($, id)
    return
  }
  if (kind === 'spotme') {
    await answerSpotMe($, id)
    return
  }
  if (kind === 'still') {
    if (id === 'stood') await logStood($)
    else await clearBand($)
    return
  }
  if (kind === 'stretch') {
    if (id === 'stretched') await recordStretch($)
    else await clearBand($)
    return
  }
  if (kind === 'reschedule') {
    const shown = await read($, band)
    if (shown?.move !== undefined) {
      await markSeen($, `reschedule:${shown.move.from}`)
      if (id === 'move') await moveTrainingDay($, shown.move)
    }
    await clearBand($)
    return
  }
  if (kind === 'ready') {
    if (id === 'now') await startFromCommand($, 'now')
    else await clearBand($)
    return
  }
  if (kind === 'replay' || kind === 'flex' || (kind === 'rankup' && id === 'letsgo')) {
    await clearBand($)
    return
  }
  if (kind === 'status') {
    if (id === 'now') await startFromCommand($, 'now')
    else if (id === 'today') await startFromCommand($, 'today')
    else if (id === 'share') $.ui.toast(await shareWeek($, surface))
    else if (id === 'setup') await openSetup($, { isQuickStart: false })
    else if (id === 'close') await closeStatus($)
    return
  }
  if (kind === 'safety') {
    if (id === 'understand') await acknowledgeSafety($)
    else await closeSetup($)
    return
  }
  if (kind === 'byo') {
    if (id === 'copy') await copyExample($, surface)
    else if (id === 'back') await setupChange($, back)
    else await closeSetup($)
    return
  }
  const shown = await read($, band)
  if (shown?.kind === 'ask' && (id === 'start' || id === 'half')) void track($, { event: 'ask_answered', properties: { answer: id } })
  switch (id) {
    case 'start':
      await startWorkout($, shown?.reason)
      return
    case 'half':
      await chooseHalf($)
      return
    case 'later':
      await snooze($)
      return
    case 'no':
      await declineToday($)
      return
    case 'done':
      await pressDone($)
      return
    case 'edit':
      await pressEdit($)
      return
    case 'skip':
      await recordSet($, { result: 'skip' })
      return
    case 'save':
      await saveDraft($)
      return
    case 'timer':
      await startHold($, 1)
      return
    case 'side2':
      await startHold($, 2)
      return
    case 'stop':
      if (shown?.cue !== undefined) await replaceBand($, await setBandFor($, shown.cue, undefined))
      return
    case 'fewer':
    case 'more':
    case 'lighter':
    case 'heavier':
      await nudge($, id)
      return
    case 'undo':
      await undoLast($, shown?.undoId)
      return
    case 'easy':
    case 'good':
    case 'tough':
      await rate($, id)
      return
  }
}

// ---------------------------------------------------------------------------------------------------------
// `/workout`.

async function workoutCommand($: EngineInterface, args: string): Promise<string | null> {
  const [arg = '', ...rest] = args.trim().split(/\s+/)
  const day = await today($)
  const shown = await read($, band)

  // Never straight into a workout with someone Swolomon hasn't met: the introduction first, where they are.
  if (arg === '' || arg === 'status') {
    const intro = await introState($)
    if (intro.isIntroDue && (await isDue($, 'setup-prompt', 'ever'))) {
      coach.isIntroDismissed = false
      await placeBand($, introBand(day, { hasPlan: intro.file.plan !== null }))
      return line('reply-meet', { day })
    }
    // Just remind me: today, the week, the rank.
    if (await isRemindMode($)) return arg === '' ? openRemindPane($) : remindTextOf(await remindFacts($))
  }
  if (arg === 'remind') {
    if (!(await isRemindMode($))) {
      await startRemind($)
      return line('reply-remind-on', { day })
    }
    await placeBand($, await remindBandFor($))
    return null
  }
  if (arg === 'log') {
    if (!(await isRemindMode($))) return line('reply-no-remind', { day })
    await placeBand($, await remindBandFor($))
    return null
  }
  if (arg === 'dontask') {
    await markSeen($, 'setup-prompt')
    // With a plan already there, no more asking means training with it as it is.
    if ((await loadPlan($)) !== null) await markSeen($, 'onboarded')
    if (shown?.kind === 'intro') await clearBand($)
    return line('reply-dontask', { day })
  }
  if (arg === '') {
    const plan = await loadPlan($)
    if (plan === null) return noPlanReply($)
    const facts = await statusFacts($, plan)
    await update($, statusView, () => statusViewOf(facts))
    coach.isStatusOpen = true
    const view = statusViewOf(facts)
    // Inline, it opens tall enough for everything: the portrait's rows or the head's with Swolomon's line,
    // a blank and the buttons; a blank; the rest.
    const rows = Math.max(PORTRAIT_ROWS, view.head.length + 3) + 1 + view.more.length
    const opened = await $.ui.open({ id: STATUS_PANE, title: 'IdleReps', rows })
    if (opened.isPlaced) playPaneMove($, (await isLateNight($)) ? moveById('nap') : paneMoveOf(facts, view.isRestDay, view.isWin))
    return opened.isPlaced ? null : statusTextOf(facts)
  }
  if (arg === 'status') {
    const plan = await loadPlan($)
    return plan === null ? noPlanReply($) : statusTextOf(await statusFacts($, plan))
  }
  if (arg === 'setup') {
    await openSetup($, { isQuickStart: false })
    return line('reply-setup-opened', { day })
  }
  if (arg === 'plan') return planFromText($, rest.join(' '))
  if (arg === 'feedback') return sendFeedback($, args.trim().slice('feedback'.length))
  if (arg === 'pause') {
    if (await load($, 'paused', false)) return line('reply-already-paused', { day })
    await save($, 'paused', true)
    stopCue()
    await refreshStatus($)
    await refreshPeek($)
    return line('reply-pause', { day })
  }
  if (arg === 'resume') {
    if (!(await load($, 'paused', false))) return line('reply-not-paused', { day })
    await save($, 'paused', undefined)
    await armIdle($)
    await refreshStatus($)
    await refreshPeek($)
    return line('reply-resume', { day })
  }
  // Your data (§1.12 item 5): these work with or without a plan.
  if (arg === 'export') return exportData($)
  if (arg === 'share') return shareWeek($, undefined)
  if (arg === 'restore' && shown?.kind !== 'restore') return askRestore($)
  if (arg === 'erase' && shown?.kind !== 'erase') {
    await placeBand($, eraseBand(day))
    return null
  }
  // Asked-for bands (the replay, the flex) show now or not at all: never queued behind a set to pop up later.
  if (isEasterEgg(arg)) void track($, { event: 'easter_egg', properties: { command: arg } })
  if (arg === 'swolomon') {
    const intro = await introState($)
    const isShown = await placeIfFree($, intro.isIntroDue ? introBand(day, { hasPlan: intro.file.plan !== null }) : replayBand(day))
    return isShown ? null : line('reply-swolomon-busy', { day })
  }
  // Easter eggs (§1.13.5): the only replies in Swolomon's voice.
  if (arg === 'flex') {
    // Only the moves they have: the collection is the reel.
    const reel = collected(await load<string[]>($, 'moves', []))
    coach.reel = coach.reel === null ? day % reel.length : (coach.reel + 1) % reel.length
    const move = reel[coach.reel] ?? reel[0]
    if (move !== undefined && (await placeIfFree($, flexBand(day, move)))) return null
    return `${COACH_NAME}: ${line('flex', { day })}`
  }
  if (arg === 'moves') {
    const unlocked = await load<string[]>($, 'moves', [])
    const toGo = setsToNext(await load($, 'totalDoneSets', 0), unlocked)
    const next = toGo === null ? 'All of them. Legend.' : `Next one in ${toGo} ${toGo === 1 ? 'set' : 'sets'}.`
    const have = collected(unlocked)
    return `${line('reply-moves', { day, n: have.length, total: STARTER_MOVES.length + UNLOCK_ORDER.length, next })}\n${have.map(m => m.title).join(' · ')}`
  }
  if (arg === 'protein' || arg === 'wisdom') return `${COACH_NAME}: ${line(arg, { day })}`
  // Hidden ones (owner, 2026-10-03: "found by word of mouth"): in no usage line, never tracked.
  // On a logged set, high five is that band's own button.
  if (arg === 'highfive' && shown?.kind === 'logged') {
    await highFive($)
    return null
  }
  if (arg === 'hug' || arg === 'highfive') {
    const move = moveById(arg === 'hug' ? 'hug' : 'high-five')
    if (move !== undefined && (await placeIfFree($, showOffBand(line(arg === 'hug' ? 'hug' : 'high-five', { day }), move)))) {
      if (arg === 'highfive') await save($, 'highFives', (await load($, 'highFives', 0)) + 1)
      return null
    }
    return `${COACH_NAME}: ${line(arg === 'hug' ? 'hug' : 'high-five', { day })}`
  }
  if (arg === 'dance') {
    const unlocked = await load<string[]>($, 'moves', [])
    const move = moveById('dance')
    if (!unlocked.includes('dance')) {
      const toGo = Math.max(1, setsForUnlock(UNLOCK_ORDER.indexOf('dance') + 1) - (await load($, 'totalDoneSets', 0)))
      return `${COACH_NAME}: ${line('dance-locked', { day, n: toGo })}`
    }
    if (move !== undefined && (await placeIfFree($, showOffBand(line('dance', { day }), move)))) return null
    return `${COACH_NAME}: ${line('dance', { day })}`
  }

  // Quick start straight from the introduction or the nudge, past Give me a plan.
  if (arg === 'quickstart' && (shown?.kind === 'intro' || shown?.kind === 'program')) {
    await quickStart($)
    return null
  }
  const plan = await loadPlan($)
  if (plan === null && shown?.actions.includes(arg) !== true && !['restore', 'erase', 'cancel', 'quickstart', 'notnow', 'dontask', 'desk', 'home', 'gym', 'understand', 'copy', 'back', 'close'].includes(arg)) {
    return noPlanReply($)
  }
  switch (arg) {
    case 'reset':
      await save($, 'progress', START)
      if (shown?.kind === 'ask' || shown?.kind === 'set' || shown?.kind === 'edit') await clearBand($)
      await refreshStatus($)
      return line('reply-reset', { day })
    case 'now':
    case 'start':
    case 'today':
      return startFromCommand($, arg)
    case 'no':
      await declineToday($)
      return line('reply-not-today', { day, nextDay: await nextDayName($, plan) })
    case 'half':
      return chooseHalf($)
    case 'next-block':
      return nextBlock($)
    case 'later':
      await snooze($)
      return line('reply-hidden', { day, n: Math.round((await gapMs($)) / 60_000) })
    case 'undo':
      return line((await undoLast($, undefined)) ? 'reply-undone' : 'reply-nothing-to-undo', { day })
    case 'easy':
    case 'good':
    case 'tough':
      return line((await rate($, arg)) ? 'reply-rated' : 'reply-nothing-to-rate', { day })
    case 'skip':
    case 'done':
      return doneCommand($, arg, rest)
  }
  // Every button has its command (§4.3 item 4): the showing band's own ids.
  if (shown !== null && shown.actions.includes(arg)) {
    await runAction($, shown.kind, arg, 'terminal')
    return null
  }
  const pane = await read($, setup)
  if (pane !== null && ['understand', 'copy', 'back', 'close'].includes(arg)) {
    await runAction($, pane.screen === 'safety' ? 'safety' : 'byo', arg, 'terminal')
    return null
  }
  if (ACTIONS.some(action => action.id === arg)) {
    return line('reply-nothing-showing', { day, id: arg })
  }
  return line('reply-usage', { day })
}

const EASTER_EGGS = ['swolomon', 'flex', 'protein', 'wisdom'] as const
const isEasterEgg = (arg: string): arg is (typeof EASTER_EGGS)[number] => (EASTER_EGGS as readonly string[]).includes(arg)

/**
 * What Swolomon does in the status pane: the next set's exercise, demonstrated; on a rest day, a nap; with
 * today done or the program finished, a win.
 */
function paneMoveOf(facts: StatusFacts, isRestDay: boolean, isWin: boolean): Move | undefined {
  if (isWin) return moveById(facts.progress.workout >= facts.plan.workouts.length ? 'trophy' : 'double-biceps')
  if (isRestDay) return moveById('nap')
  const cue = cueFor(facts.plan, facts.progress, facts.targets)
  return moveById((cue === null ? null : moveForExercise(cue.exercise.name)) ?? 'double-biceps')
}

/** The pane's move, a moment after it opens; nothing moves once it has played (or the pane closed). */
function playPaneMove($: EngineInterface, move: Move | undefined) {
  cancelTimers('pane')
  coach.paneFrame = null
  if (move === undefined || !coach.options.coachAnimation) return
  const cells = MOVE_CELLS[move.id] ?? []
  timer($, 'pane', PANE_MOVE_DELAY_MS, () => {
    let showing = -1
    let startedAt: number | null = null
    ticker($, 'pane', TICK_MS, stop =>
      void (async () => {
        const at = await now($)
        startedAt ??= at
        const requestId = coach.panePortrait
        const pose = coach.isStatusOpen && requestId !== null ? poseAt(move, at - startedAt) : null
        if (pose === null || requestId === null) {
          stop()
          coach.paneFrame = null
          const isWin = (await read($, statusView))?.isWin === true
          if (requestId !== null) await blitFull($, requestId, FRAMES[isWin ? 'flex' : 'idle'])
          if (coach.isStatusOpen && !isWin) idlePane($)
          return
        }
        if (pose === showing) return
        showing = pose
        coach.paneFrame = cells[pose] ?? null
        await blitFull($, requestId, coach.paneFrame)
      })(),
    )
  })
}

/** The pane's Swolomon lives in his square too, once his move is done, while the pane is open. */
function idlePane($: EngineInterface) {
  idleLoop($, 'pane', {
    size: () => (coach.panePortrait === null ? undefined : 'full'),
    isWin: false,
    alive: () => coach.isStatusOpen,
    blit: cells => {
      coach.paneFrame = cells
      if (coach.panePortrait !== null) void blitFull($, coach.panePortrait, cells)
    },
  })
}

/** The pause before the pane's move: the pane is read first. */
const PANE_MOVE_DELAY_MS = 800

async function nextDayName($: EngineInterface, plan: Plan | null): Promise<string> {
  if (plan === null) return 'soon'
  const next = nextTrainingDay(plan, await load($, 'progress', START), await today($))
  return next === null ? 'soon' : longDayName(next)
}

/** `/workout done [reps] [weight]` and `/workout skip`, for the set showing. */
async function doneCommand($: EngineInterface, arg: 'done' | 'skip', rest: string[]): Promise<string> {
  const day = await today($)
  const shown = await read($, band)
  const cue = shown?.cue
  if (cue === undefined || (shown?.kind !== 'set' && shown?.kind !== 'edit')) return line('reply-no-set', { day })
  if (arg === 'skip') {
    await recordSet($, { result: 'skip' })
    return line('reply-set-skipped', { day })
  }
  const [amount, heavy] = rest
  const count = amount === undefined ? (cue.count ?? undefined) : Number(amount)
  const isBand = cue.exercise.band !== undefined
  const weight = heavy === undefined || isBand ? (cue.weight ?? undefined) : Number(heavy)
  if (count !== undefined && !(Number.isInteger(count) && count > 0 && count <= 999)) return line('reply-done-usage', { day })
  if (weight !== undefined && !(weight >= 0 && weight <= 999)) return line('reply-done-usage', { day })
  const outcome = {
    result: 'done' as const,
    ...(count === undefined || cue.count === null ? {} : { count }),
    ...(weight === undefined ? {} : { weight }),
    ...(cue.band === null ? {} : { band: cue.band }),
  }
  await recordSet($, outcome)
  if (outcome.count === undefined && outcome.weight === undefined) return line('reply-set-done', { day })
  return line('reply-set-done-amount', { day, amount: describeAmount(cue.exercise, outcome.count ?? null, outcome.weight ?? null, outcome.band ?? null).replace(' @ ', ' at ') })
}

/** `/workout plan <text>` (§1.2, D8): the model turns a description into a plan; nothing changes on failure. */
async function planFromText($: EngineInterface, text: string): Promise<string> {
  const day = await today($)
  if (text.trim() === '') return line('reply-plan-usage', { day })
  const answer = await $.model.complete({ model: PLAN_MODEL, system: PLAN_PROMPT, prompt: text, maxTokens: 4000 })
  if (!answer.isAnswered) return line('reply-plan-unreachable', { day, reason: answer.reason })
  let plan: Plan
  try {
    plan = parsePlan(stripFence(answer.text))
  } catch (error) {
    return line('reply-plan-failed', { day, reason: (error as Error).message })
  }
  await writePlan($, plan)
  void track($, { event: 'plan_imported', properties: { workouts: plan.workouts.length } })
  // Brought their own: on to how it works (once) and the first set, like any new plan.
  await clearFirstRun($)
  await offerToday($, plan)
  return line('reply-plan-written', {
    day,
    name: plan.name,
    workouts: plan.workouts.length,
    schedule: scheduleLabel(plan.schedule),
    path: planPath(),
  })
}

// ---------------------------------------------------------------------------------------------------------
// Drawing: one row is one Text, its pieces nested inside so the row wraps (or is cut) as a whole.

type TextElement = (props: Record<string, unknown> & { children?: unknown }) => JSX.Element

/** A row as one Text: plain, or styled pieces; a row with a piece that may be cut is cut at the edge, never wrapped. */
function rowText(Text: unknown, row: string | readonly BandPart[], key: string, opts: { truncate?: boolean } = {}) {
  const T = Text as TextElement
  if (typeof row === 'string') return <T key={key} {...(opts.truncate === true ? { wrap: 'truncate-end' } : {})}>{row}</T>
  const isCut = opts.truncate === true || row.some(part => part.truncate === true)
  return (
    <T key={key} {...(isCut ? { wrap: 'truncate-end' } : {})}>
      {row.map((part, j) => (
        <T
          key={`${key}-${j}`}
          {...(part.bold === true ? { bold: true } : {})}
          {...(part.italic === true ? { italic: true } : {})}
          {...(part.tone === 'muted' || part.dim === true ? { dimColor: true } : part.tone === undefined ? {} : { color: TONE_COLOUR[part.tone] })}
        >
          {part.text}
        </T>
      ))}
    </T>
  )
}

// ---------------------------------------------------------------------------------------------------------

/** Where a band is drawn: above the prompt, or (where no surface draws that) in its own pane. */
type BandSite = { surface: RenderSurface; requestId: string; maxRows: number; bodyColumns: number; isWorking: boolean }

/** The band in the slot, drawn for a site; null when the slot is empty. */
async function drawBand($: EngineInterface, site: BandSite, elements: ElementTable) {
  const spec = await read($, band)
  if (spec === null) return null
  const said = await read($, talk)
    const { Box, Button, Text } = elements
  const surface = site.surface
  const numbered = (hotkey: string, label: string) =>
    surface === 'terminal' ? ({ hotkey, label, plain: true } as const) : ({ hotkey, label: `${hotkey} · ${label}` } as const)
  const isTimed = spec.cue === undefined ? false : (targetOf(spec.cue.exercise.reps)?.isTimed ?? false)
  const isBand = spec.cue?.exercise.band !== undefined
  const labelOf = (id: string) => {
    const named = spec.labels?.[id]
    if (named !== undefined) return named
    if (spec.kind === 'edit' && (id === 'fewer' || id === 'more')) return stepperLabel(id, isTimed)
    if (spec.kind === 'edit' && (id === 'lighter' || id === 'heavier')) return loadLabel(id, isBand)
    if (spec.kind === 'question' && spec.question !== undefined && id !== 'pass') return spec.question.labels[ANSWER_IDS.indexOf(id as (typeof ANSWER_IDS)[number])] ?? id
    if (spec.kind === 'reschedule' && spec.move !== undefined) return id === 'move' ? `Move to ${weekdayShortName(spec.move.to)}` : `Keep ${weekdayShortName(spec.move.from)}`
    return actionOf(spec.kind, id).label
  }

  // The header: its lead, then the workout's sets as dots (when they fit on a row) and in words.
  const lead = spec.headerLead === true ? `${line(site.isWorking ? 'lead-working' : 'lead-idle', { day: 0 })} · ` : ''
  const dots = spec.progress === undefined ? null : progressDots(spec.progress.done, spec.progress.total)
  const headerParts: BandPart[] =
    spec.header === undefined
      ? []
      : [
          { text: `${lead}${spec.header}`, tone: 'muted' },
          ...(dots === null
            ? []
            : [
                { text: '   ' },
                ...((spec.progress?.total ?? 0) <= 16
                  ? [{ text: dots.done, tone: 'good' as const }, { text: dots.current, tone: 'accent' as const }, { text: dots.rest, tone: 'muted' as const }, { text: '  ' }]
                  : []),
                { text: dots.words, tone: 'muted' as const },
              ]),
        ]

  // How wide the text is, to decide whether the portrait fits beside it (§1.11 Fit).
  const widthOf = (row: string | BandPart[]) =>
    typeof row === 'string' ? row.length : row.filter(part => part.truncate !== true).reduce((n, part) => n + part.text.length, 0)
  const columnsWith = (gapAt: number) => {
    const buttonColumns = spec.actions.reduce((n, id, i) => n + (i > 0 ? gapAt : 0) + actionOf(spec.kind, id).hotkey.length + 2 + labelOf(id).length, 0)
    return Math.max(
      widthOf(headerParts),
      ...(spec.coach ?? []).map(text => plainOf(text).length),
      ...spec.body.map(widthOf),
      ...(spec.extras ?? []).map(text => text.length),
      ...(spec.footer ?? []).map(text => text.length),
      spec.inline === true ? widthOf(spec.body.at(-1) ?? '') + 3 + buttonColumns : buttonColumns + widthOf(spec.trailing ?? []),
    )
  }
  const rowsOfBand = bandRows(spec)
  const fitWith = (columns: number, bodyColumns = site.bodyColumns): Fit =>
    fitPortrait({ wanted: spec.portrait ?? 'none', surface, approved: SPRITE.approved, maxRows: site.maxRows, bodyColumns, bandRows: rowsOfBand, textColumns: columns, sprite: SPRITE })
  // Three spaces between buttons; two when that is what leaves room for his full portrait.
  const roomy = columnsWith(3)
  const tight = columnsWith(2)
  const gapWidth = fitWith(roomy) !== 'full' && fitWith(tight) === 'full' ? 2 : 3
  const textColumns = gapWidth === 2 ? tight : roomy
  const fit: Fit = fitWith(textColumns)
  const buttons = spec.actions.map((id, i) => {
    const action = actionOf(spec.kind, id)
    return (
      <Box key={`b-${id}`}>
        {i > 0 && <Text>{' '.repeat(gapWidth)}</Text>}
        <Button
          key={id}
          {...numbered(action.hotkey, labelOf(id))}
          {...(action.isPrimary === true ? { variant: 'primary' as const } : {})}
          onPress={() => runAction($, spec.kind, id, surface)}
        />
      </Box>
    )
  })
  // A frame he was in the middle of is for the size it was made for; at another size he starts from rest.
  if (coach.portrait?.size !== (fit === 'none' ? undefined : fit)) coach.moveFrame = null
  coach.portrait = fit === 'none' ? null : { requestId: site.requestId, size: fit }
  // Where there are no terminal cells, the portrait is an SVG of the same pixels (still: no blits there).
  const svgSize: PortraitSize | null =
    site.surface !== 'terminal' && 'Svg' in elements && SPRITE.approved && spec.portrait !== undefined ? spec.portrait : null

  const header = headerParts.length === 0 ? null : rowText(Text, headerParts, 'header')
  const isTalking = said !== null && said.key === spec.talkKey
  // With no portrait beside it, his first line says who is talking.
  const nameTag: BandPart[] = fit === 'none' && svgSize === null ? [{ text: `${COACH_NAME}:`, bold: true, tone: 'accent' }, { text: ' ' }] : []
  // His aside, while the band waits: under the title, or after his line; never moving a thing.
  const drawnAt = fit !== 'none' ? fit : svgSize
  const besideColumns = drawnAt === null ? 0 : portraitCells(SPRITE, drawnAt).columns + PORTRAIT_GAP
  const aside = isTalking ? said.aside : undefined
  const asidePart: BandPart = { text: asideText(aside ?? ''), tone: 'aside' }
  const spot =
    aside === undefined
      ? 'none'
      : asideSpot(spec, aside, { columns: site.bodyColumns - besideColumns, lineColumns: widthOf([...nameTag, { text: plainOf(spec.coach?.[0] ?? '') }]) })
  // While typing, each line shows what is out so far; rows keep their place so the band never jumps.
  const coachRows = (spec.coach ?? []).map((text, i) => {
    const runs = emphasisRuns(text, isTalking ? (said.shown[i] ?? Infinity) : Infinity)
    const spoken: BandPart[] = runs.length === 0 ? [{ text: ' ' }] : runs.map(run => ({ text: run.text, ...(run.isEmphasis ? { italic: true } : {}) }))
    const after: BandPart[] = i === 0 && spot === 'after-line' ? [{ text: ' '.repeat(ASIDE_GAP) }, asidePart] : []
    return rowText(Text, [...(i === 0 ? nameTag : []), ...spoken, ...after], `coach-${i}`)
  })
  const bodyRows = spec.body.map((row, i) => {
    const isLast = i === spec.body.length - 1
    if (!(isLast && spec.inline === true)) return rowText(Text, row, `body-${i}`)
    return (
      <Box key={`body-${i}`}>
        {rowText(Text, row, `body-${i}-text`)}
        <Text>   </Text>
        {buttons}
      </Box>
    )
  })
  const rows = [
    spec.headerFirst === true ? header : null,
    // A title on top gets a blank row under it, before Swolomon speaks (owner, 2026-10-03).
    spec.headerFirst === true && header !== null ? rowText(Text, [spot === 'under-title' ? asidePart : { text: ' ' }], 'after-header') : null,
    ...coachRows,
    spec.headerFirst !== true ? header : null,
    ...bodyRows,
    ...(spec.extras ?? []).map((text, i) => (
      <Text key={`extra-${i}`} dimColor italic>
        {text}
      </Text>
    )),
    // A blank row between what is said and what can be pressed (owner, 2026-10-03).
    spec.inline !== true && buttons.length > 0 ? <Text key="before-buttons"> </Text> : null,
    spec.inline !== true && buttons.length > 0 ? (
      <Box key="buttons">
        {buttons}
        {spec.trailing !== undefined && rowText(Text, spec.trailing, 'trailing')}
      </Box>
    ) : null,
    ...(spec.footer ?? []).map((text, i) => (
      <Text key={`footer-${i}`} dimColor>
        {text}
      </Text>
    )),
  ].filter(row => row !== null)
  // The entrance: the stage over the buttons, the band's full height and no more, until Swolomon is in place.
  if (isTalking && said.isEntering === true) {
    if (fit === 'full' && 'Raster' in elements && site.bodyColumns >= STAGE_COLUMNS) {
      const { Raster } = elements
      coach.portrait = null
      coach.stage = { requestId: site.requestId }
      const at = (await now($)) - coach.entranceStartedAt
      return (
        <Box flexDirection="column">
          <Raster key="stage" columns={STAGE_COLUMNS} rows={STAGE_ROWS} cells={stageCells(SPRITE, at)} />
          <Box key="buttons">{buttons}</Box>
        </Box>
      )
    }
    coach.stage = 'declined'
  }
  if (svgSize !== null && 'Svg' in elements) {
    const { Svg } = elements
    const pose: Pose = isTalking ? said.pose : spec.isWin === true ? 'flex' : 'idle'
    const pixels = svgSize === 'full' ? SVG_PIXELS.full * SPRITE.width : SVG_PIXELS.mini * SPRITE.miniSize
    // Once his line is out, he lives in the picture: his act, then his idling, animated by the SVG itself.
    const isLineOut = !isTalking || (spec.coach ?? []).every((text, i) => (said.shown[i] ?? Infinity) >= plainOf(text).length)
    const film =
      coach.options.coachAnimation && isLineOut
        ? await filmFor($, { size: svgSize, isWin: spec.isWin === true, ...(spec.act === undefined ? {} : { act: spec.act }), ...(spec.kind === 'set' && spec.act !== undefined ? { setMove: spec.act } : {}) })
        : null
    return (
      <Box flexDirection="row" alignItems={svgSize === 'full' ? 'center' : 'flex-start'}>
        <Svg key="swolomon" source={film ?? SVGS[frameFor(svgSize, pose)]} alt={COACH_NAME} width={pixels} height={pixels} {...(film === null ? {} : { isInteractive: true })} />
        <Box key="portrait-gap" width={PORTRAIT_GAP} />
        <Box key="text" flexDirection="column">
          {rows}
        </Box>
      </Box>
    )
  }
  // A set nobody speaks on: the tiny Swolomon beside it, doing the exercise, where there is room.
  const micro = microMoveOf(spec)
  coach.micro = null
  if (
    fit === 'none' &&
    micro !== undefined &&
    surface === 'terminal' &&
    SPRITE.approved &&
    'Raster' in elements &&
    site.maxRows >= MICRO_ROWS &&
    site.bodyColumns >= MICRO_WIDTH + PORTRAIT_GAP + textColumns
  ) {
    const { Raster } = elements
    coach.micro = { requestId: site.requestId }
    return (
      <Box flexDirection="row" alignItems="flex-start">
        <Raster key="swolomon-tiny" columns={MICRO_WIDTH} rows={MICRO_ROWS} cells={coach.microFrame ?? MICRO_CELLS[micro.id]?.[0] ?? ''} />
        <Box key="portrait-gap" width={PORTRAIT_GAP} />
        <Box key="text" flexDirection="column">
          {rows}
        </Box>
      </Box>
    )
  }
  // He was wanted, and only the window's width kept him out: he says so, once a day.
  if (fit === 'none' && 'Raster' in elements && fitWith(textColumns, Infinity) !== 'none') void lookForRoom($)
  if (fit === 'none' || !('Raster' in elements)) return <Box flexDirection="column">{rows}</Box>

  const { Raster } = elements
  const pose: Pose = isTalking ? said.pose : spec.isWin === true ? 'flex' : 'idle'
  const { columns, rows: height } = portraitCells(SPRITE, fit)
  // Beside the full portrait the text sits in the middle; beside the mini head it starts level with his line.
  return (
    <Box flexDirection="row" alignItems={fit === 'full' ? 'center' : 'flex-start'}>
      <Raster key="swolomon" columns={columns} rows={height} cells={(cells => (spec.isShiny === true ? shinyOf(cells) : cells))((fit === 'full' ? coach.moveFrame : null) ?? FRAMES[frameFor(fit, pose)])} />
      <Box key="portrait-gap" width={PORTRAIT_GAP} />
      <Box key="text" flexDirection="column">
        {rows}
      </Box>
    </Box>
  )
}

/** A Bash result's git reading (the engine's), as far as the turn-end line needs it. */
type GitOperation = { commit?: unknown; pr?: { action: string } }

/** The sign a tool call gives of a long task, once per turn and only on a turn that could cue. */
async function watchCall<R>($: EngineInterface, tool: string, input: Record<string, unknown>, run: () => Promise<R>): Promise<R> {
  if (!(coach.turnCanCue || coach.turnCanStretch || coach.turnCanNudge || coach.turnCanRemind || coach.turnCanStill) || coach.hasStrongSign) return run()
  coach.toolCalls += 1
  if (tool === 'TaskCreate') coach.tasksThisTurn += 1
  const sign = toolSign(factsOf(tool, input, coach.tasksThisTurn), coach.toolCalls)
  if (sign !== null) {
    await noticeLongTask($, sign)
    return run()
  }
  const slow = timer($, 'turn', SLOW_STEP_MS, () => void noticeLongTask($, { reason: 'slow-step' }))
  try {
    return await run()
  } finally {
    slow.cancel()
  }
}

/** A week or more since the last set: the ask welcomes the person back, and offers half. */
const COMEBACK_DAYS = 7

/** Swolomon's talk blip (§1.11 Sound): original, generated by scripts/make-blip-wav.mjs. */
const BLIP_ASSET = 'assets/blip.wav'

/** A turn this long gets Swolomon's reading of it even without sets, once a day. */
const MISREAD_TURN_MS = 60_000

/** His reading, as said this time: counted, and once said often enough, what he learned asking around. */
async function learnedOf($: EngineInterface, misread: Misread): Promise<Misread> {
  const seen = await load<Record<string, number>>($, 'misreadsSeen', {})
  const n = seen[misread.id] ?? 0
  await save($, 'misreadsSeen', { ...seen, [misread.id]: n + 1 })
  return { ...misread, says: saysOf(misread, n) }
}

/** The spinner shows Swolomon's reading of the call running; a change redraws it. */
function setCallMisread($: EngineInterface, misread: Misread | null) {
  if (coach.callMisread === misread) return
  coach.callMisread = misread
  $.ui.invalidate('ui.render')
}

const REACTION: Record<Outcome, LineId> = { 'tests-pass': 'react-tests-pass', 'tests-fail': 'react-tests-fail', commit: 'react-commit', pr: 'react-pr' }

export const register: Register = (on, options) => {
  coach.options = readOptions(options)

  on('session.start', async ($, e, next) => {
    coach.home = (await $.env.get('HOME')) ?? ''
    await $.command.register({
      name: 'workout',
      description: 'IdleReps: your workout, one set at a time while your agent works',
      argumentHint: '[status | now | done [reps] [weight] | skip | later | undo | setup | plan <text> | pause | feedback <text>]',
    })
    const migrated = await migrate($)
    const day = await today($)
    if (migrated === 'newer') {
      $.ui.toast(line('newer-store', { day }))
      return next(e)
    }
    // D3: the prototype's plan file becomes the first plan.
    if (!(await $.fs.exists(planPath()))) {
      const legacy = legacyPathOf(coach.home)
      if (await $.fs.exists(legacy)) {
        try {
          await $.fs.write(planPath(), `${JSON.stringify(parseLegacyPlan(await $.fs.read(legacy)), null, 2)}\n`)
        } catch {
          // Not a prototype plan: leave both files alone.
        }
      }
    }
    // Anyone who trained before onboarding existed is past it.
    if ((await isOnboardingDue($)) && (await load<HistoryEntry[]>($, 'history', [])).length > 0) await markSeen($, 'onboarded')
    // The first session after install: the introduction, and a toast pointing at it in case it is missed.
    // Later sessions without a plan open quietly; the nudge comes while the agent works (offerNudge).
    // A plan with no onboarding behind it (made by hand, brought from the prototype) gets the introduction too.
    const { file, isOnboarding: onboarding, isIntroDue } = await introState($)
    if (isIntroDue && e.isInteractive && (await mayAskToStart($)) && (await isDue($, 'intro', 'ever'))) {
      await markSeen($, 'intro')
      await markSeen($, 'intro-day')
      await offerBand($, introBand(day, { hasPlan: file.plan !== null }), 'timer')
      await toast($, line('installed', { day }), 'timer')
    } else if (file.plan !== null && !onboarding && (await read($, band))?.kind === 'intro') {
      await clearBand($)
    }
    // §1.10c: what's-new, plus the day toast.
    await whatsNew($, migrated === 'fresh')
    const training = await trainingPlan($)
    // Monday's recap for anyone training, plan or not; the day toast is a plan's.
    const isTraining = training !== null || (await isRemindMode($))
    // His hello first; then Monday's recap; the day toast only when neither said anything.
    const isGreeted = isTraining && (await greet($))
    if (isTraining) await noticeGym($, e.cwd)
    const isRecapped = isTraining && (await mondayRecap($))
    if (training !== null && !isRecapped && !isGreeted) await dayToast($, training)
    // A block finished but not answered (Later, or the rating dismissed): asked again on a training day, once.
    if (training !== null && e.isInteractive && (await isDue($, 'program-end-ask', 'day'))) {
      const progress = await load($, 'progress', START)
      if (progress.workout >= training.workouts.length && isTrainingDay(training, progress, day)) await offerProgramEnd($, 'timer')
    }
    // Back from a competition he went to since the last session.
    if (isTraining && e.isInteractive) await backFromCompeting($)
    await refreshStatus($)
    await armIdle($)
    await armMidnight($)
    coach.peekAwakeUntil = (await now($)) + PEEK_AWAKE_MS
    await refreshPeek($)
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    coach.isTurnRunning = true
    coach.turnStartedAt = await now($)
    coach.toolCalls = 0
    coach.turnSets = 0
    coach.turnOutcome = undefined
    coach.tasksThisTurn = 0
    coach.waitMs = undefined
    coach.hasStrongSign = false
    coach.idleTimer?.cancel()
    coach.idleTimer = null
    // A band he raised, still unanswered when they prompt again: they chose to keep working. Ignored.
    await settleUnprompted($)
    // The next prompt ends the chance to undo from the band, and dismisses an unanswered rating or a replay.
    // The first-run band goes once a plan exists, however it got there (by hand, another session).
    const shown = await read($, band)
    const isIntroDone = shown?.kind === 'intro' && (await trainingPlan($)) !== null
    const isDismissedByPrompt = ['logged', 'rating', 'bonus', 'rankup', 'replay', 'flex', 'ready', 'prep'].includes(shown?.kind ?? '') || shown?.isNudge === true
    if (isDismissedByPrompt || isIntroDone) await clearBand($)
    const isBig = isBigAsk(e.text)
    coach.reason = isBig ? 'big-ask' : undefined
    coach.turnCanCue = await couldCueThisTurn($)
    coach.turnCanStretch = !coach.turnCanCue && (await couldStretchThisTurn($))
    coach.turnCanNudge = await couldNudgeThisTurn($)
    coach.turnCanRemind = await couldRemindThisTurn($)
    coach.turnCanStill = await couldStillThisTurn($)
    // One of his questions, when nothing else is due: its own timer, never the cue's (which waits for the gap).
    if (await couldQuietMomentThisTurn($)) timer($, 'turn', turnWaitMs(isBig), () => void offerQuietMoment($))
    coach.turnMisread = null
    const isTraining = (await trainingPlan($)) !== null || (await isRemindMode($))
    coach.turnCanMisread = isTraining && !(await load($, 'paused', false)) && !inQuietHours(coach.options.quietHours, hourOf(await now($)))
    const showing = await read($, band)
    if ((coach.turnCanCue || coach.turnCanStretch || coach.turnCanNudge || coach.turnCanRemind || coach.turnCanStill) && (showing === null || showing.kind === 'logged')) {
      scheduleCue($, cueDelayMs(turnWaitMs(isBig), await load<number | undefined>($, 'nextCueAt', undefined), coach.turnStartedAt))
    }
    await refreshPeek($)
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    // D21: the tool hook only counts and observes: the turn's sign, then what the call achieved (tests, a
    // commit, a PR) for the line that ends the turn. It never changes a call or its result.
    if (!coach.isTurnRunning) return next(e)
    const tool = String(e.tool)
    const input = e as unknown as Record<string, unknown>
    // Swolomon's reading of the call: the spinner says it while it runs, his lines this turn use it.
    const misread = coach.turnCanMisread && e.agentId === undefined ? misreadOf(factsOf(tool, input, 0)) : null
    const misreadBefore = coach.turnMisread
    if (misread !== null) {
      coach.turnMisread = misread
      setCallMisread($, misread)
    }
    let result: Awaited<ReturnType<typeof next>>
    try {
      result = await watchCall($, tool, input, () => next(e))
    } finally {
      if (misread !== null && coach.callMisread === misread) setCallMisread($, null)
    }
    // A denied call ran nothing, so it did nothing worth a word either.
    if (misread !== null && result.deny !== undefined && coach.turnMisread === misread) coach.turnMisread = misreadBefore
    // A denied call ran nothing, so it achieved nothing.
    if (tool === 'Bash' && result.deny === undefined) {
      const op = result.isError === undefined ? (result.result as { gitOperation?: GitOperation }).gitOperation : undefined
      const outcome = outcomeOf(factsOf(tool, input, 0), { isError: result.isError === true, commit: op?.commit !== undefined, pr: op?.pr?.action === 'created' })
      if (outcome !== null) coach.turnOutcome = turnOutcome(coach.turnOutcome, outcome)
    }
    return result
  })

  on('turn.complete', async ($, e, next) => {
    coach.isTurnRunning = false
    // The line that closes the turn says what the person did meanwhile; it is found by the turn's length.
    // Without sets, Swolomon still says what he thinks the agent was up to: once a day, on a long turn.
    const seenMisread = coach.turnMisread ?? undefined
    const saysAnyway = coach.turnSets === 0 && seenMisread !== undefined && e.durationMs >= MISREAD_TURN_MS && (await isDue($, 'misread-turn', 'day'))
    if (saysAnyway) await markSeen($, 'misread-turn')
    // Said often enough, he has asked around: what he says of it moves on (hooks/misreads.ts).
    const misread = seenMisread !== undefined && coach.turnOutcome === undefined && (coach.turnSets > 0 || saysAnyway) ? await learnedOf($, seenMisread) : seenMisread
    if (e.agentId === undefined && (coach.turnSets > 0 || saysAnyway)) {
      coach.setsByTurnLength.set(e.durationMs, {
        sets: coach.turnSets,
        ...(coach.turnOutcome === undefined ? {} : { outcome: coach.turnOutcome }),
        ...(misread === undefined ? {} : { misread }),
      })
    }
    coach.turnMisread = null
    setCallMisread($, null)
    coach.turnSets = 0
    coach.turnOutcome = undefined
    if (e.agentId === undefined) {
      await recordWorkTime($)
      await save($, 'turnLengths', keptTurns(await load<number[]>($, 'turnLengths', []), e.durationMs))
    }
    // A band already up stays until answered; a cue not yet due, or waiting on the prompt, is dropped.
    stopCue()
    cancelTimers('turn')
    coach.deferred = null
    await armIdle($)
    coach.peekAwakeUntil = (await now($)) + PEEK_AWAKE_MS
    await refreshPeek($)
    return next(e)
  })

  on('prompt.edit', async ($, e, next) => {
    const box = await next(e)
    if (coach.deferred !== null && box.text === '') void deliverDeferred($)
    return box
  })

  on('command.run', { command: 'workout' }, async ($, e) => {
    coach.isAnswering = true
    const text = await workoutCommand($, e.args).finally(() => {
      coach.isAnswering = false
    })
    if (text === null) return {}
    const isPauseReply = /^\s*(pause|resume)\b/.test(e.args)
    return { text: !isPauseReply && (await load($, 'paused', false)) ? `${line('reply-paused-prefix', { day: await today($) })} ${text}` : text }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const site = { surface: e.surface, requestId: e.requestId, maxRows: e.props.maxRows, bodyColumns: e.props.bodyColumns, isWorking: e.props.isWorking }
    const elements = $.ui.resolve(e)
    return (await drawBand($, site, elements)) ?? (await drawPeek($, e.surface, e.requestId, elements)) ?? next(e)
  })

  // Where no attached surface draws the band above the prompt (VS Code), the band is this pane.
  on('ui.render', { component: 'Pane', requestId: BAND_PANE }, async ($, e) => {
    const elements = $.ui.resolve(e)
    const site = { surface: e.surface, requestId: e.requestId, maxRows: 12, bodyColumns: e.props.bodyColumns, isWorking: coach.isTurnRunning }
    const { Text } = elements
    return (await drawBand($, site, elements)) ?? <Text dimColor>Nothing to do right now. /workout shows your week.</Text>
  })

  // Today's tally, as a dim label at the right of the prompt footer.
  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
    const tally = coach.tally
    if (tally === undefined) return next(e)
    return next({ ...e, props: { ...e.props, modes: [...e.props.modes, tally] } })
  })

  // While today's workout is under way, the spinner lifts too: a gym word in place of the engine's.
  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    if (e.props.message !== null) return next(e)
    // What the agent is doing, as Swolomon understands it; else, mid-workout, a gym word.
    if (coach.callMisread !== null) return next({ ...e, props: { ...e.props, word: coach.callMisread.verb } })
    if (!coach.isMidWorkout) return next(e)
    return next({ ...e, props: { ...e.props, word: gymWord(e.props.word) } })
  })

  // The line that closes a turn: how long the agent took, and what the person did meanwhile.
  on('ui.render', { component: 'TurnDuration' }, async ($, e, next) => {
    const turn = coach.setsByTurnLength.get(e.props.durationMs)
    if (turn === undefined) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    const drawn = await next(e)
    const day = await today($)
    const sets =
      turn.sets === 0 ? (
        drawn
      ) : (
        <Box key="line" flexDirection="row">
          {drawn}
          <Text key="sets" dimColor>
            {` · ${line('turn-sets', { day, sets: turn.sets === 1 ? '1 set' : `${turn.sets} sets` })} 💪`}
          </Text>
        </Box>
      )
    // What the agent got done, as Swolomon understands it (never correctly): its outcome, else his reading
    // of what it did.
    const said =
      turn.outcome !== undefined
        ? line(REACTION[turn.outcome], { day })
        : turn.misread !== undefined
          ? fill(turn.misread.says, { mate: pickAddress(day, 'react-commit') })
          : null
    if (said === null) return sets
    return (
      <Box flexDirection="column">
        {sets}
        {rowText(Text, [{ text: `${COACH_NAME}: `, tone: 'accent', bold: true }, { text: said }], 'react', { truncate: true })}
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: STATUS_PANE }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const surface = e.surface
    const numbered = (hotkey: string, label: string) =>
      surface === 'terminal' ? ({ hotkey, label, plain: true } as const) : ({ hotkey, label: `${hotkey} · ${label}` } as const)
    const view = await read($, statusView)
    if (view === null) return <Text dimColor>No plan yet. Run /workout setup.</Text>
    const rowOf = (row: string | BandPart[], key: string) => rowText(Text, row === '' ? ' ' : row, key, { truncate: true })
    const kind = view.isRemind === true ? 'remindPane' : 'status'
    const ids = view.isRemind === true ? ['now', 'plan', 'close'] : ['now', ...(view.isRestDay ? ['today'] : []), ...(view.canShare ? ['share'] : []), 'setup', 'close']
    const buttons = (
      <Box key="buttons">
        {ids.map((id, i) => {
          const action = actionOf(kind, id)
          return (
            <Box key={`b-${id}`}>
              {i > 0 && <Text>   </Text>}
              <Button key={id} {...numbered(action.hotkey, action.label)} onPress={() => runAction($, kind, id, surface)} />
            </Box>
          )
        })}
      </Box>
    )
    // Most important first: Swolomon's line and the head, then the buttons, then the rest. A pane above the
    // prompt sizes itself to its content up to a cap, so what it cuts is only ever the least important rows.
    const elements = $.ui.resolve(e)
    const widest = Math.max(plainOf(view.coach).length, ...view.head.map(row => (typeof row === 'string' ? row.length : row.filter(p => p.truncate !== true).reduce((n, p) => n + p.text.length, 0))))
    const hasPortrait = surface === 'terminal' && SPRITE.approved && 'Raster' in elements && e.props.bodyColumns >= SPRITE.width + PORTRAIT_GAP + widest
    coach.panePortrait = hasPortrait ? e.requestId : null
    const hasSvg = surface !== 'terminal' && SPRITE.approved && 'Svg' in elements
    const said = rowText(Text, hasPortrait || hasSvg ? [{ text: plainOf(view.coach), italic: true }] : [{ text: `${COACH_NAME}:`, bold: true, tone: 'accent' }, { text: ` ${plainOf(view.coach)}` }], 'coach', { truncate: true })
    const top = (
      <Box key="top" flexDirection="column">
        {view.head.slice(0, 1).map((row, i) => rowOf(row, `head-${i}`))}
        {said}
        {view.head.slice(1).map((row, i) => rowOf(row, `head-${i + 1}`))}
        <Text key="before-buttons"> </Text>
        {buttons}
      </Box>
    )
    const rest = view.more.map((row, i) => rowOf(row, `more-${i}`))
    if (hasSvg && 'Svg' in elements) {
      const { Svg } = elements
      const pixels = SVG_PIXELS.full * SPRITE.width
      const film = coach.options.coachAnimation ? await filmFor($, { size: 'full', isWin: view.isWin }) : null
      return (
        <Box flexDirection="column">
          <Box key="portrait-row" flexDirection="row">
            <Svg key="swolomon" source={film ?? SVGS[view.isWin ? 'flex' : 'idle']} alt={COACH_NAME} width={pixels} height={pixels} {...(film === null ? {} : { isInteractive: true })} />
            <Box key="portrait-gap" width={PORTRAIT_GAP} />
            {top}
          </Box>
          <Text key="gap"> </Text>
          {rest}
        </Box>
      )
    }
    if (!hasPortrait || !('Raster' in elements)) {
      return (
        <Box flexDirection="column">
          {top}
          <Text key="gap"> </Text>
          {rest}
        </Box>
      )
    }
    const { Raster } = elements
    return (
      <Box flexDirection="column">
        <Box key="portrait-row" flexDirection="row">
          <Raster key="swolomon" columns={SPRITE.width} rows={PORTRAIT_ROWS} cells={coach.paneFrame ?? FRAMES[view.isWin ? 'flex' : 'idle']} />
          <Box key="portrait-gap" width={PORTRAIT_GAP} />
          {top}
        </Box>
        <Text key="gap"> </Text>
        {rest}
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: SETUP_PANE }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const surface = e.surface
    const numbered = (hotkey: string, label: string) =>
      surface === 'terminal' ? ({ hotkey, label, plain: true } as const) : ({ hotkey, label: `${hotkey} · ${label}` } as const)
    const state = await read($, setup)
    if (state === null) return <Text dimColor>Setup is closed. /workout setup opens it again.</Text>
    const screen = screenOf(state, planPath())
    const row = (items: { key: string; hotkey: string; label: string; isPrimary?: boolean; onPress: () => unknown }[]) => (
      <Box key={`row-${items[0]?.key ?? 'none'}`}>
        {items.map((item, i) => (
          <Box key={`b-${item.key}`}>
            {i > 0 && <Text>   </Text>}
            <Button
              key={item.key}
              {...numbered(item.hotkey, item.label)}
              {...(item.isPrimary === true ? { variant: 'primary' as const } : {})}
              onPress={item.onPress}
            />
          </Box>
        ))}
      </Box>
    )
    const backButton = { key: 'back', hotkey: 'b', label: 'Back', onPress: () => setupChange($, back) }
    const hasBack = state.trail.length > 0
    let controls: ReturnType<typeof row>[] = []
    if (state.screen === 'safety') {
      controls = [
        row(
          (['understand', 'close'] as const).map(id => {
            const action = actionOf('safety', id)
            return { key: id, hotkey: action.hotkey, label: action.label, isPrimary: id === 'understand', onPress: () => runAction($, 'safety', id, surface) }
          }),
        ),
      ]
    } else if (state.screen === 'byo') {
      controls = [
        row(
          (['copy', 'back', 'close'] as const).map(id => {
            const action = actionOf('byo', id)
            return { key: id, hotkey: action.hotkey, label: action.label, isPrimary: id === 'copy', onPress: () => runAction($, 'byo', id, surface) }
          }),
        ),
      ]
    } else if (state.screen === 'equipment') {
      const have = state.answers.equipment ?? { dumbbells: false, bar: false, bands: false }
      const toggles = (
        [
          ['dumbbells', 'Dumbbells'],
          ['bar', 'Pull-up bar'],
          ['bands', 'Resistance bands'],
        ] as const
      ).map(([key, label], i) => ({
        key: `toggle-${key}`,
        hotkey: String(i + 1),
        label: `${have[key] ? '✓' : ' '} ${label}`,
        onPress: () => setupChange($, s => toggleEquipment(s, key)),
      }))
      const unit = state.answers.weightUnit ?? 'kg'
      controls = [
        row(toggles),
        ...(have.dumbbells
          ? [
              row([
                { key: 'unit-kg', hotkey: 'k', label: `${unit === 'kg' ? '✓' : ' '} kg`, onPress: () => setupChange($, s => setUnit(s, 'kg')) },
                { key: 'unit-lb', hotkey: 'l', label: `${unit === 'lb' ? '✓' : ' '} lb`, onPress: () => setupChange($, s => setUnit(s, 'lb')) },
              ]),
            ]
          : []),
        row([{ key: 'continue', hotkey: 'c', label: 'Continue', isPrimary: true, onPress: () => setupChange($, continueEquipment) }, ...(hasBack ? [backButton] : [])]),
      ]
    } else if (state.screen === 'summary') {
      controls = [row([{ key: 'start-plan', hotkey: '1', label: 'Start plan', isPrimary: true, onPress: () => startPlan($) }, backButton])]
    } else {
      const choices = (screen.choices ?? []).map((choice, i) => ({
        key: `choice-${i + 1}`,
        hotkey: String(i + 1),
        label: choice.label,
        isPrimary: i === (screen.primary ?? -1),
        onPress: () => setupChoose($, i),
      }))
      controls = [row(choices), ...(hasBack ? [row([backButton])] : [])]
    }
    return (
      <Box flexDirection="column">
        <Text key="title" bold>
          {screen.title}
        </Text>
        {(screen.copy ?? []).map((text, i) => (
          <Text key={`copy-${i}`}>{text}</Text>
        ))}
        <Text key="space"> </Text>
        {controls}
      </Box>
    )
  })
}

