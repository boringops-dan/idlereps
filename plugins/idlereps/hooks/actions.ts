/**
 * Every button the bands and panes draw (plan §4.3 item 4, D11): its band kind, its hotkey and its label.
 * A Button is drawn only from here, and `/workout <id>` runs the showing band's action with that id, so
 * every button has a command by construction. Pure data.
 */

export type ActionKind = 'spotme' | 'prep' | 'question' | 'still' | 'unlock' | 'remindPane' | 'remind' | 'program' | 'byoplan' | 'pulse' | 'warmup' | 'programEnd' | 'restore' | 'erase' | 'intro' | 'where' | 'stretch' | 'bonus' | 'ready' | 'reschedule' | 'timer' | 'switch' | 'time' | 'replay' | 'ask' | 'set' | 'edit' | 'logged' | 'rating' | 'rankup' | 'flex' | 'status' | 'safety' | 'byo'

export type Action = {
  id: string
  kind: ActionKind
  hotkey: string
  label: string
  /** The main action of its band, drawn as primary. */
  isPrimary?: true
}

export const ACTIONS: readonly Action[] = [
  // The way in: Quick start is one key from the first set; a plan already there is kept.
  { kind: 'intro', id: 'quickstart', hotkey: '1', label: 'Quick start', isPrimary: true },
  { kind: 'intro', id: 'keep', hotkey: '1', label: 'Keep my plan', isPrimary: true },
  { kind: 'intro', id: 'remind', hotkey: '2', label: 'Just remind me' },
  { kind: 'intro', id: 'program', hotkey: '3', label: 'Build my own' },
  { kind: 'intro', id: 'notnow', hotkey: '4', label: 'Not now' },

  // Build my own: the other ways to a plan.
  { kind: 'program', id: 'quickstart', hotkey: '1', label: 'Quick start', isPrimary: true },
  { kind: 'program', id: 'setup', hotkey: '2', label: 'Build it with me' },
  { kind: 'program', id: 'own', hotkey: '3', label: 'I have my own' },
  { kind: 'program', id: 'back', hotkey: '0', label: 'Back' },
  { kind: 'byoplan', id: 'back', hotkey: '1', label: 'Back', isPrimary: true },

  // Just remind me: a set of their own, logged by what it worked; or later, or not today.
  { kind: 'remind', id: 'upper', hotkey: '1', label: 'Upper', isPrimary: true },
  { kind: 'remind', id: 'lower', hotkey: '2', label: 'Lower' },
  { kind: 'remind', id: 'cardio', hotkey: '3', label: 'Cardio' },
  { kind: 'remind', id: 'other', hotkey: '4', label: 'Other' },
  { kind: 'remind', id: 'later', hotkey: '5', label: 'Later' },
  { kind: 'remind', id: 'skipday', hotkey: '0', label: 'Not today' },

  // Spot me: he is stuck on his last rep.
  { kind: 'spotme', id: 'spot', hotkey: '1', label: 'You got this!', isPrimary: true },
  { kind: 'spotme', id: 'nospot', hotkey: '2', label: 'Not now' },

  // Back from a competition.
  { kind: 'prep', id: 'letsgo', hotkey: '1', label: "Let's go", isPrimary: true },

  // A question of his: up to four answers (labelled by the question), or Pass.
  { kind: 'question', id: 'a', hotkey: '1', label: 'Answer' },
  { kind: 'question', id: 'b', hotkey: '2', label: 'Answer' },
  { kind: 'question', id: 'c', hotkey: '3', label: 'Answer' },
  { kind: 'question', id: 'd', hotkey: '4', label: 'Answer' },
  { kind: 'question', id: 'pass', hotkey: '0', label: 'Pass' },

  // Sitting a long while: stand up with him.
  { kind: 'still', id: 'stood', hotkey: '1', label: 'Stood up', isPrimary: true },
  { kind: 'still', id: 'later', hotkey: '2', label: 'Later' },

  { kind: 'where', id: 'desk', hotkey: '1', label: 'At a desk', isPrimary: true },
  { kind: 'where', id: 'home', hotkey: '2', label: 'At home, no gear' },
  { kind: 'where', id: 'gym', hotkey: '3', label: 'With weights' },

  { kind: 'stretch', id: 'stretched', hotkey: '1', label: 'Done', isPrimary: true },
  { kind: 'stretch', id: 'notnow', hotkey: '2', label: 'Not now' },

  { kind: 'ready', id: 'now', hotkey: '1', label: 'Try a set now', isPrimary: true },
  { kind: 'ready', id: 'gotit', hotkey: '2', label: 'Got it' },

  { kind: 'reschedule', id: 'move', hotkey: '1', label: 'Move it', isPrimary: true },
  { kind: 'reschedule', id: 'keep', hotkey: '2', label: 'Keep it' },

  { kind: 'replay', id: 'letsgo', hotkey: '1', label: "Let's go", isPrimary: true },

  { kind: 'warmup', id: 'warmed', hotkey: '1', label: 'Done', isPrimary: true },
  { kind: 'warmup', id: 'skipwarmup', hotkey: '2', label: 'Skip' },

  { kind: 'ask', id: 'start', hotkey: '1', label: 'Start', isPrimary: true },
  { kind: 'ask', id: 'later', hotkey: '2', label: 'Later' },
  { kind: 'ask', id: 'no', hotkey: '3', label: 'Not today' },
  // Showing up beats doing nothing: each exercise's sets halved, while the half version is still open.
  { kind: 'ask', id: 'half', hotkey: '4', label: 'Just half' },

  { kind: 'set', id: 'done', hotkey: '1', label: 'Done', isPrimary: true },
  { kind: 'set', id: 'edit', hotkey: '2', label: 'Edit' },
  { kind: 'set', id: 'skip', hotkey: '3', label: 'Skip' },
  { kind: 'set', id: 'later', hotkey: '4', label: 'Later' },
  // Timed sets only (§1.12 item 1).
  { kind: 'set', id: 'timer', hotkey: '5', label: 'Timer' },

  { kind: 'timer', id: 'done', hotkey: '1', label: 'Done', isPrimary: true },
  { kind: 'timer', id: 'stop', hotkey: '2', label: 'Stop timer' },
  { kind: 'switch', id: 'side2', hotkey: '1', label: 'Start side 2', isPrimary: true },
  { kind: 'switch', id: 'stop', hotkey: '2', label: 'Stop timer' },
  { kind: 'time', id: 'done', hotkey: '1', label: 'Done', isPrimary: true },
  { kind: 'time', id: 'edit', hotkey: '2', label: 'Edit' },

  { kind: 'edit', id: 'save', hotkey: '1', label: 'Save', isPrimary: true },
  { kind: 'edit', id: 'fewer', hotkey: '2', label: '< reps' },
  { kind: 'edit', id: 'more', hotkey: '3', label: 'reps >' },
  { kind: 'edit', id: 'lighter', hotkey: '4', label: '< weight' },
  { kind: 'edit', id: 'heavier', hotkey: '5', label: 'weight >' },

  { kind: 'logged', id: 'highfive', hotkey: '1', label: 'High five' },
  { kind: 'logged', id: 'undo', hotkey: '0', label: 'Undo' },

  { kind: 'rating', id: 'easy', hotkey: '1', label: 'Easy' },
  { kind: 'rating', id: 'good', hotkey: '2', label: 'Good', isPrimary: true },
  { kind: 'rating', id: 'tough', hotkey: '3', label: 'Tough' },
  { kind: 'rating', id: 'undo', hotkey: '0', label: 'Undo' },

  { kind: 'rankup', id: 'letsgo', hotkey: '1', label: "Let's go", isPrimary: true },
  { kind: 'rankup', id: 'undo', hotkey: '0', label: 'Undo' },
  { kind: 'unlock', id: 'nice', hotkey: '1', label: 'Nice', isPrimary: true },
  { kind: 'unlock', id: 'again', hotkey: '2', label: 'Again' },
  { kind: 'unlock', id: 'undo', hotkey: '0', label: 'Undo' },

  // An Easy workout: push a little further while it feels good.
  { kind: 'bonus', id: 'bonus', hotkey: '1', label: 'One more', isPrimary: true },
  { kind: 'bonus', id: 'enough', hotkey: '2', label: 'Done for today' },

  { kind: 'programEnd', id: 'nextblock', hotkey: '1', label: 'Next block', isPrimary: true },
  { kind: 'programEnd', id: 'changeplan', hotkey: '2', label: 'Change plan' },
  { kind: 'programEnd', id: 'endlater', hotkey: '3', label: 'Later' },

  // D20: nothing destroyed until 1.
  { kind: 'restore', id: 'restore', hotkey: '1', label: 'Restore', isPrimary: true },
  { kind: 'restore', id: 'cancel', hotkey: '2', label: 'Cancel' },
  { kind: 'erase', id: 'erase', hotkey: '1', label: 'Erase', isPrimary: true },
  { kind: 'erase', id: 'cancel', hotkey: '2', label: 'Cancel' },

  // The one-time check-in (§1.6): 1 to 3 send the answer; 4 says how to say more.
  { kind: 'pulse', id: 'love', hotkey: '1', label: 'Love it' },
  { kind: 'pulse', id: 'fine', hotkey: '2', label: "It's fine" },
  { kind: 'pulse', id: 'notforme', hotkey: '3', label: 'Not for me' },
  { kind: 'pulse', id: 'tellmore', hotkey: '4', label: 'Tell us more' },

  { kind: 'flex', id: 'nice', hotkey: '1', label: 'Nice', isPrimary: true },

  { kind: 'status', id: 'now', hotkey: '1', label: 'Start a set now', isPrimary: true },
  { kind: 'status', id: 'today', hotkey: '2', label: 'Train today anyway' },
  { kind: 'status', id: 'share', hotkey: '3', label: 'Share week' },
  { kind: 'status', id: 'setup', hotkey: '4', label: 'Change plan' },
  { kind: 'status', id: 'close', hotkey: '0', label: 'Close' },
  { kind: 'remindPane', id: 'now', hotkey: '1', label: 'A set now', isPrimary: true },
  { kind: 'remindPane', id: 'plan', hotkey: '2', label: 'Get a plan' },
  { kind: 'remindPane', id: 'close', hotkey: '0', label: 'Close' },

  { kind: 'safety', id: 'understand', hotkey: '1', label: 'I understand', isPrimary: true },
  { kind: 'safety', id: 'close', hotkey: '0', label: 'Close' },
  // The safety step in the band (Quick start): Back returns to the introduction.
  { kind: 'safety', id: 'back', hotkey: '2', label: 'Back' },

  { kind: 'byo', id: 'copy', hotkey: '1', label: 'Copy example', isPrimary: true },
  { kind: 'byo', id: 'back', hotkey: 'b', label: 'Back' },
  { kind: 'byo', id: 'close', hotkey: '0', label: 'Close' },
]

export function actionOf(kind: ActionKind, id: string): Action {
  const action = ACTIONS.find(a => a.kind === kind && a.id === id)
  if (action === undefined) throw new Error(`no action ${kind}/${id}`)
  return action
}

/** The ids a band kind draws, in hotkey order. */
export const actionIdsOf = (kind: ActionKind): string[] => ACTIONS.filter(a => a.kind === kind).map(a => a.id)

/** The steppers' labels follow what they step: reps or seconds; weight or band. */
export function stepperLabel(id: string, isTimed: boolean): string {
  if (id === 'fewer') return isTimed ? '< secs' : '< reps'
  if (id === 'more') return isTimed ? 'secs >' : 'reps >'
  return actionOf('edit', id).label
}

export function loadLabel(id: 'lighter' | 'heavier', isBand: boolean): string {
  if (!isBand) return actionOf('edit', id).label
  return id === 'lighter' ? '< band' : 'band >'
}
