/** The plan file, `~/.claude/idlereps/plan.json` (plan §4.1). */
export type Weekday = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'
export type Schedule = { days: Weekday[] } | { everyNDays: number }
/** A weighted exercise's load: where it starts, its step, and the unit shown. */
export type Load = { start: number; step: number; unit: 'kg' | 'lb' }
/** A band exercise's levels, lightest first, and the one it starts at. */
export type BandLevels = { levels: string[]; start: string }
export type Exercise = {
  name: string
  /** The starting target, e.g. "8 reps", "30 s", "10 each leg". */
  reps: string
  /** Double-progression range of reps (or seconds); absent keeps the target fixed. */
  range?: [number, number]
  sets: number
  note?: string
  weight?: Load
  band?: BandLevels
}
export type Workout = { name: string; exercises: Exercise[] }
export type Equipment = { dumbbells: boolean; bar: boolean; bands: boolean }
export type Answers = {
  template: 'designed' | 'ppl'
  /** Always 'strength' when the template is 'ppl'. */
  goal: 'strength' | 'general' | 'mobility'
  /** All false is bodyweight only. */
  equipment: Equipment
  level: 'beginner' | 'intermediate' | 'advanced'
  /** 'ppl': 3 or 6; 'designed': 2 to 5. */
  daysPerWeek: 2 | 3 | 4 | 5 | 6
  setting: 'home' | 'office'
  /** 'kg' when dumbbells are not ticked. */
  weightUnit: 'kg' | 'lb'
  schedule: Schedule
  size: 'short' | 'medium' | 'long'
  weeks: 4 | 8
}
export type Plan = {
  version: 1
  name: string
  schedule: Schedule
  workouts: Workout[]
  /** Written by the generator; absent for imported or hand-written plans. */
  builtFor?: Equipment
  /** Written by the generator and Quick start. */
  answers?: Answers
}

/** Where the person is in the plan (store key `progress`). */
export type Progress = {
  /** Index into `plan.workouts`. */
  workout: number
  /** Sets finished or skipped in that workout. */
  done: number
  /** Local day number a workout was last completed on. */
  lastCompletedOn: number | null
  /** Local day number made a training day by `/workout today`. */
  extraDay: number | null
  /**
   * The half version of this workout was chosen: each exercise's sets halved (rounded up). Showing up
   * beats doing nothing; the workout counts, but targets do not move. Gone once the workout is done.
   */
  half?: true
}

/** One line of the training log (store key `history`). */
export type HistoryEntry =
  | {
      kind: 'set'
      /** Epoch ms. */
      t: number
      /** Local day number. */
      d: number
      /** Workout index. */
      w: number
      exercise: string
      set: number
      /** The target as shown, e.g. "12 reps". */
      target: string
      result: 'done' | 'skip'
      /** Reps or seconds done; absent when skipped or the target has no number. */
      count?: number
      /** Weight used, in the exercise's unit; weighted exercises only. */
      weight?: number
      /** Band level used; band exercises only. */
      band?: string
    }
  | { kind: 'workout-complete'; t: number; d: number; w: number; half?: true }
  | { kind: 'rating'; t: number; d: number; w: number; rating: Rating }
  /** A rest-day stretch: counts toward time moved, never toward sets, ranks or progression. */
  | { kind: 'stretch'; t: number; d: number; exercise: string; seconds: number }

export type Rating = 'easy' | 'good' | 'tough'

/** A harder variant an exercise moved to (plan §5.3). */
export type Variant = { name: string; reps: string; range: [number, number] }

/** The current target of one plan exercise (store key `targets`, keyed by the plan's exercise name). */
export type Target = {
  reps: number
  weight?: number
  band?: string
  variant?: Variant
  /** Consecutive workouts with a set below target. */
  belowStreak: number
  /** Consecutive workouts rated Tough. */
  toughStreak: number
}
export type Targets = { [exerciseName: string]: Target }

/** The `last:` value and personal bests of one exercise (store key `lastByExercise`, keyed by the shown name). */
export type ExerciseMemory = {
  last?: HistoryEntry
  /** Highest count per load: the weight, the band level, or `any`. */
  best: { [load: string]: number }
}
export type LastByExercise = { [exerciseName: string]: ExerciseMemory }

/** The once ledger (store key `seen`). */
export type Seen = { [id: string]: { at: number; n: number } }

/** Why the band thinks there is time for a set (plan §1.1 step 2). */
export type LongTaskReason = 'helpers' | 'long-run' | 'slow-step' | 'busy' | 'big-ask' | 'waiting' | 'planned'

/** The set the band is showing. */
export type Cue = {
  /** Workout index into the plan. */
  workout: number
  workoutNumber: number
  workoutCount: number
  workoutName: string
  /** 1-based position of this set in the workout. */
  step: number
  stepCount: number
  /** 1-based set of this exercise. */
  set: number
  /** The exercise as the plan wrote it. */
  planExercise: Exercise
  /** The exercise as it is done now: the variant's name and range, and today's target. */
  exercise: Exercise
  /** The target count today, or null when the target has no number. */
  count: number | null
  /** The weight to do it at, for weighted exercises. */
  weight: number | null
  /** The band level to do it at, for band exercises. */
  band: string | null
  /** The half version is still open: not chosen, and not yet past its last set. */
  canHalve?: true
  /** This set belongs to the half version of the workout. */
  isHalf?: true
}

/** Edit's steppers, before Save. */
export type Draft = { count: number; weight: number | null; band: string | null }

/** What the progression of a finished workout was computed from, so a later rating can redo it exactly. */
export type RatingBasis = {
  workout: number
  /** `targets` before the workout finished. */
  targetsBefore: Targets
  /** Each plan exercise's sets in that workout. */
  results: { [planExerciseName: string]: SetResult[] }
  /** Done as the half version: the rating changes no targets. */
  half?: true
}
export type SetResult = { result: 'done' | 'skip'; count?: number }

export type BandKind = 'warmup' | 'programEnd' | 'restore' | 'erase' | 'intro' | 'where' | 'stretch' | 'bonus' | 'safety' | 'ready' | 'reschedule' | 'timer' | 'switch' | 'time' | 'replay' | 'ask' | 'set' | 'edit' | 'logged' | 'rating' | 'rankup' | 'flex'

/** How a piece of text is coloured: the theme's own colours, so light and dark themes both read. */
export type Tone = 'accent' | 'good' | 'muted'

/** One piece of a band row: its text, and how it is drawn. */
export type BandPart = {
  text: string
  dim?: true
  bold?: true
  italic?: true
  tone?: Tone
  /** Cut at the band's edge rather than wrap. */
  truncate?: true
}
/** One band row: plain text, or pieces drawn side by side. */
export type BandLine = string | BandPart[]

/** One band, everything it shows decided when it was made (plan §4.3 item 4, D19). */
export type BandSpec = {
  kind: BandKind
  /** Swolomon's lines; absent when he is silent. */
  coach?: string[]
  /** Which portrait the band asks for beside Swolomon's lines (§1.11); drawn only where it fits. */
  portrait?: 'full' | 'mini'
  /** A win: the portrait flexes once the line is out (§1.11 step 4). */
  isWin?: true
  /** Swolomon walks on before speaking (§1.11 Entrance): the introduction and its replay. */
  entrance?: true
  /**
   * The hold timer (§1.12 item 1) on a timed set: when it ends, the hold's seconds, which side of how
   * many, and the whole seconds left as last drawn.
   */
  hold?: { endsAt: number; seconds: number; side: 1 | 2; sides: 1 | 2; left: number }
  /** The bonus set after an Easy workout: the exercise, at what, for the history when done. */
  bonus?: { workout: number; exercise: string; target: string; count?: number; weight?: number; band?: string }
  /** A later session's ask to get started: the next prompt puts it away, unanswered or not. */
  isNudge?: true
  /** The warm-up: Swolomon's line for the first set it leads to. */
  thenCoach?: string
  /** The rest-day stretch: what it is and how long, for the history when Done. */
  stretch?: { exercise: string; seconds: number }
  /** The reschedule offer: the training weekday that keeps being declined, and where it would move. */
  move?: { from: Weekday; to: Weekday }
  /** The typewriter run this band's lines belong to (`talk`); set when it is placed. */
  talkKey?: number
  /** The factual header line. */
  header?: string
  /** A set band's header gets "While your agent works · " or "Workout · " in front. */
  headerLead?: true
  /** Draw the header above Swolomon's lines (the intro). */
  headerFirst?: true
  /** The workout's sets as dots after the header: done, this one, still to come. */
  progress?: { done: number; total: number }
  body: BandLine[]
  /** The form note and the control hint, each one row. */
  extras?: string[]
  /** Rows drawn under the buttons. */
  footer?: string[]
  /** Action ids, drawn as Buttons in this order. */
  actions: string[]
  /** Draw the buttons on the last body row instead of a row of their own. */
  inline?: true
  /** Pieces drawn after the buttons, on their row (the finished workout's dots on the rating band). */
  trailing?: BandPart[]
  tall?: true
  /** The set it is about (set, edit, ask). */
  cue?: Cue
  draft?: Draft
  /** The record its Undo puts back (logged, rating, rankup). */
  undoId?: number
  basis?: RatingBasis
  /** Set when a long-task sign brought it, for the reason line. */
  reason?: LongTaskReason
}

/** The typewriter (§1.11): how much of the band's lines is out, and the mouth. */
export type Talk = {
  key: number
  shown: number[]
  pose: 'idle' | 'talkA' | 'talkB' | 'blink' | 'flex'
  /** Still walking on (§1.11 Entrance): the band draws the stage instead of the portrait and lines. */
  isEntering?: true
}

export type SetupScreen =
  | 'safety'
  | 'start'
  | 'byo'
  | 'goal'
  | 'equipment'
  | 'setting'
  | 'level'
  | 'days'
  | 'schedule'
  | 'size'
  | 'weeks'
  | 'cueEvery'
  | 'idleReminder'
  | 'summary'

export type SetupState = {
  screen: SetupScreen
  /** The screens before this one, for Back. */
  trail: SetupScreen[]
  answers: Partial<Answers>
  cueEvery: string
  idleReminder: string
  /** Opened by Quick start: the safety step writes the starter plan. */
  isQuickStart: boolean
}

/**
 * The status pane's facts, computed when it opens and after each record (D19): `head` always shows, with the
 * buttons right under it; `more` fills whatever room the pane has left.
 */
export type StatusView = {
  /** Swolomon's line for where the day stands; a win (done today, program done) flexes. */
  coach: string
  isWin: boolean
  /** Beside the portrait: the workout, today, the workout as a table; the buttons follow. */
  head: BandLine[]
  /** Full width under it: the week, streak, rank, bests, plan. */
  more: BandLine[]
  isRestDay: boolean
  /** A set done this week: the pane offers Share week. */
  canShare: boolean
}

declare module 'claude-code' {
  interface PluginState {
    idlereps: {
      band: BandSpec | null
      pending: BandSpec[]
      setup: SetupState | null
      statusView: StatusView | null
      talk: Talk | null
    }
  }
}
