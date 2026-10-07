/**
 * Swolomon reading what your agent is doing (owner, 2026-10-02: "Swolomon commenting on the agent but
 * always misinterpreting commands"). He has never heard of coding, so every command is gym talk to him:
 * a push is push-ups, a curl is curls, a build is building muscle. Pure: a tool call in, his reading out.
 *
 * Each reading has three forms: `verb`, the spinner's word while the call runs; `doing`, how a band line
 * says it ("…while your agent's doing curls"); `says`, his comment once the turn is over (one `{mate}`).
 * Rules (tested): never a code word, the agent only as "your agent", no gendered words.
 */

import { TEST_COMMAND } from './signals'

export type Misread = { id: string; verb: string; doing: string; says: string; learned?: string }

/**
 * `learned`: what he says once he has seen it a few times and asked around (owner, 2026-10-03: "he learns
 * your world, badly"); closer, never right.
 */
type Rule = { id: string; tool?: RegExp; command?: RegExp; verb: string; doing: string; says: string; learned?: string }

/** Times he says his reading of a thing before he has looked it up. */
export const LEARN_AFTER = 3

/** What he says of a reading, the `seen`-th time he says it (from 0). */
export const saysOf = (misread: Misread, seen: number): string => (seen >= LEARN_AFTER && misread.learned !== undefined ? misread.learned : misread.says)

/** First match wins: the specific before the general (a forced push before a push, brew before install). */
const RULES: readonly Rule[] = [
  { id: 'force-push', command: /\bgit\s+push\b.*(?:--force|-f\b)/, verb: 'Forcing reps', doing: "your agent's doing forced reps", says: 'Forced reps from your agent, {mate}. Bold.' },
  { id: 'push', command: /\bgit\s+push\b/, verb: 'Doing push-ups', doing: "your agent's doing push-ups", says: 'Your agent did push-ups, {mate}. Chest to the floor, I hope.', learned: 'Asked around, {mate}. Those push-ups involve no floor. Odd.' },
  { id: 'pull', command: /\bgit\s+pull\b/, verb: 'Hitting pull day', doing: "your agent's on pull day", says: 'Your agent hit pull day, {mate}. Back gains incoming.', learned: 'Turns out pull day has no bar, {mate}. Still counts.' },
  { id: 'fetch', command: /\bgit\s+fetch\b/, verb: 'Playing fetch', doing: "your agent's playing fetch", says: 'Your agent played fetch, {mate}. Great cardio.' },
  { id: 'commitment', command: /\bgit\s+commit\b/, verb: 'Making a commitment', doing: "your agent's making a commitment", says: 'Your agent made a commitment, {mate}. To leg day, I assume.', learned: 'Read up on commitments, {mate}. Your agent makes plenty.' },
  { id: 'merge', command: /\bgit\s+merge\b/, verb: 'Finding a partner', doing: "your agent's pairing up", says: 'Your agent found a lifting partner, {mate}. Inseparable.', learned: "Looked it up, {mate}. Still think it's two lanes, one bench." },
  { id: 'rebase', command: /\bgit\s+rebase\b/, verb: 'Resetting the stance', doing: "your agent's resetting its stance", says: 'Your agent reset its base, {mate}. Wide stance. Wise.', learned: 'Asked a friend about the stance thing, {mate}. They just sighed.' },
  { id: 'reset', command: /\bgit\s+reset\b/, verb: 'Deloading', doing: "your agent's on a deload", says: 'A hard reset, {mate}. Deload week for your agent.' },
  { id: 'stash', command: /\bgit\s+stash\b/, verb: 'Hiding snacks', doing: "your agent's stashing snacks", says: 'Your agent stashed snacks, {mate}. Pre-workout, I hope.' },
  { id: 'log', command: /\bgit\s+log\b/, verb: 'Filling the log', doing: "your agent's logging its sets", says: 'Your agent keeps a training log, {mate}. A true disciple.' },
  { id: 'diff', command: /\bgit\s+diff\b/, verb: 'Comparing progress pics', doing: "your agent's taking progress pics", says: 'Before and after pics, {mate}. Your agent sees the difference.', learned: 'Your agent compares words, not pics, {mate}. Still progress.' },
  { id: 'clone', command: /\bgit\s+clone\b/, verb: 'Making a twin', doing: "your agent's making a twin", says: 'Your agent made a twin, {mate}. Twice the gains.' },
  { id: 'branch', command: /\bgit\s+(?:checkout|switch|branch)\b/, verb: 'Switching programs', doing: "your agent's switching programs", says: 'Your agent switched programs, {mate}. Variety builds muscle.' },
  { id: 'cherry-pick', command: /\bgit\s+cherry-pick\b/, verb: 'Picking cherries', doing: "your agent's picking cherries", says: 'Your agent picked cherries, {mate}. Good snack. Antioxidants.', learned: 'Your agent picks only the best ones, {mate}. Still no cherries.' },
  { id: 'revert', command: /\bgit\s+revert\b/, verb: 'Taking back a rep', doing: "your agent's taking back a rep", says: 'Your agent took a rep back, {mate}. We keep reps here.' },
  { id: 'tag', command: /\bgit\s+tag\b/, verb: 'Playing tag', doing: "your agent's playing tag", says: "Your agent played tag, {mate}. You're it. One set." },
  { id: 'bisect', command: /\bgit\s+bisect\b/, verb: 'Halving the workout', doing: "your agent's doing half", says: 'Your agent did half its workout, {mate}. Half counts!', learned: 'Your agent halves things to find them, {mate}. Half counts.' },
  { id: 'blame', command: /\bgit\s+blame\b/, verb: 'Blaming the spotter', doing: "your agent's blaming the spotter", says: 'Your agent blamed the spotter, {mate}. Classic.' },
  { id: 'status', command: /\bgit\s+status\b/, verb: 'Checking in', doing: "your agent's checking in", says: 'Your agent checked in at the front desk, {mate}. A regular.' },
  { id: 'fitness-test', command: TEST_COMMAND, verb: 'Taking a fitness test', doing: "your agent's in a fitness test", says: 'Your agent sat a fitness test, {mate}. Max day, I assume.', learned: "No push-ups in your agent's tests, {mate}? Tragic. Still passed?" },
  { id: 'publish', command: /\b(?:npm|pnpm|yarn|cargo|gem|poetry)\s+publish\b|\btwine\s+upload\b/, verb: 'Publishing a memoir', doing: "your agent's publishing a memoir", says: "Your agent wrote a memoir, {mate}. I'm in chapter one.", learned: 'Your agent publishes a lot, {mate}. No memoir yet. I checked.' },
  { id: 'dev-server', command: /\b(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?(?:dev|start|serve)\b/, verb: 'Warming up', doing: "your agent's warming up", says: 'Your agent warmed up, {mate}. Thorough. Very thorough.', learned: 'Your agent warms up and just stays warm, {mate}. Respect.' },
  { id: 'migrate', command: /\bmigrat(?:e|ions?)\b/, verb: 'Flying south', doing: "your agent's flying south", says: 'Your agent migrated south, {mate}. Like a goose. A strong goose.', learned: 'Your agent moves things, not geese, {mate}. A letdown.' },
  { id: 'cubes', command: /\b(?:kubectl|minikube|k9s)\b/, verb: 'Stacking cubes', doing: "your agent's stacking cubes", says: 'Your agent stacked cubes, {mate}. Box jumps next?', learned: "They're pods, not cubes, {mate}. Like peas. Protein!" },
  { id: 'helm', command: /\bhelm\b/, verb: 'Steering the ship', doing: "your agent's at the helm", says: 'Your agent took the helm, {mate}. Captain of the gains.' },
  { id: 'terraform', command: /\b(?:terraform|tofu|pulumi)\b/, verb: 'Landscaping', doing: "your agent's terraforming", says: 'Your agent reshaped a planet, {mate}. Shovel work. Huge.', learned: 'No planets involved, {mate}? Then what was all the shovelling?' },
  { id: 'shipping', command: /\b(?:vercel|netlify|heroku|flyctl|wrangler)\b/, verb: 'Shipping out', doing: "your agent's shipping out", says: 'Your agent shipped out, {mate}. Write home. Do your reps.' },
  { id: 'sequel', command: /\b(?:psql|mysql|sqlite3?|sqlcmd)\b/, verb: 'Watching the sequel', doing: "your agent's watching a sequel", says: 'Your agent watched a sequel, {mate}. Better than the first?', learned: 'Asked around, {mate}. Your agent queries. Still a sequel to me.' },
  { id: 'cloud', command: /\b(?:aws|gcloud)\b/, verb: 'Head in the clouds', doing: "your agent's in the clouds", says: 'Your agent was up in the clouds, {mate}. Altitude training.' },
  { id: 'form-check', command: /\bgh\s+pr\b/, verb: 'Asking for a form check', doing: "your agent's getting a form check", says: 'Your agent asked the gym for notes, {mate}. Brave.' },
  { id: 'lint', command: /\b(?:lint|eslint|prettier|ruff|black|rubocop|fmt|format)\b/, verb: 'Lint rolling', doing: "your agent's lint rolling", says: 'Your agent lint-rolled its outfit, {mate}. Looking sharp.', learned: "Lint is not fluff, I'm told, {mate}. Still looks sharp." },
  { id: 'build', command: /\b(?:build|make|tsc|compile|gradle|gradlew|xcodebuild|mvn|cmake)\b/, verb: 'Building muscle', doing: "your agent's building muscle", says: 'Your agent built some muscle, {mate}. Took a while. Worth it.', learned: 'Heard your agent makes things, {mate}. Not muscle? Unbelievable.' },
  { id: 'brew', command: /\bbrew\b/, verb: 'Brewing a shake', doing: "your agent's brewing a shake", says: 'Your agent brewed a shake, {mate}. Protein first.' },
  { id: 'yarn', command: /\byarn\b/, verb: 'Knitting', doing: "your agent's knitting a sweatband", says: 'Your agent knitted a sweatband, {mate}. Stylish.', learned: 'No knitting involved, {mate}? Then whose sweatband is this?' },
  { id: 'add-plates', command: /\bgit\s+add\b/, verb: 'Adding plates', doing: "your agent's adding plates", says: 'Your agent added plates, {mate}. Progressive overload.' },
  { id: 'install', command: /\b(?:install|ci)\b/, verb: 'Setting up a home gym', doing: "your agent's kitting out a gym", says: 'Your agent set up a home gym, {mate}. Squat rack and all.', learned: 'No squat rack after all, {mate}? Then what got set up?' },
  { id: 'docker', command: /\b(?:docker|podman|compose)\b/, verb: 'Loading containers', doing: "your agent's loading containers", says: 'Your agent loaded shipping containers, {mate}. Heavy day.', learned: 'No actual ships, {mate}? Your agent lifts very light boxes.' },
  { id: 'curl', command: /\b(?:curl|wget)\b/, verb: 'Curling', doing: "your agent's doing curls", says: 'Your agent did curls, {mate}. Good squeeze at the top.', learned: 'Learned the curling is fetching, {mate}. Like a dog. Good dog.' },
  { id: 'ssh', command: /\bssh\b/, verb: 'Sneaking', doing: "your agent's sneaking around", says: 'Your agent went quiet, {mate}. Secret agent business.' },
  { id: 'python', command: /\bpython3?\b|\bpip\b/, verb: 'Wrestling a python', doing: "your agent's wrestling a python", says: 'Your agent pinned a python, {mate}. Grip strength.' },
  { id: 'java', command: /\bjavac?\b/, verb: 'On a coffee break', doing: "your agent's on a coffee break", says: 'Your agent had a coffee, {mate}. Pre-workout, sort of.' },
  { id: 'ruby', command: /\b(?:ruby|gem|bundle)\b/, verb: 'Polishing a gem', doing: "your agent's polishing a gem", says: 'Your agent found a gem, {mate}. Like your form.' },
  { id: 'cargo', command: /\bcargo\b/, verb: 'Hauling cargo', doing: "your agent's hauling cargo", says: 'Your agent hauled cargo, {mate}. Leg drive.' },
  { id: 'kill', command: /\b(?:kill|pkill|killall)\b/, verb: 'Killing it', doing: "your agent's killing it", says: 'Your agent is killing it, {mate}. So are you.' },
  { id: 'top', command: /\b(?:top|htop|btop)\b/, verb: 'Hitting a top set', doing: "your agent's on its top set", says: 'Your agent hit its top set, {mate}. Now yours.' },
  { id: 'cat', command: /\bcat\b/, verb: 'Petting a cat', doing: "your agent's petting a cat", says: 'Your agent has a cat, {mate}? Rest day buddy.' },
  { id: 'touch', command: /\btouch\b/, verb: 'Touching base', doing: "your agent's touching base", says: 'Your agent touched base, {mate}. Like a clean lockout.' },
  { id: 'tail', command: /\btail\b/, verb: 'Chasing its tail', doing: "your agent's chasing its tail", says: 'Your agent chased its tail, {mate}. Agility drills.', learned: 'Your agent watches tails, not chases them, {mate}. Less cardio.' },
  { id: 'attendance', command: /\bps\b/, verb: 'Taking attendance', doing: "your agent's taking attendance", says: "Your agent took attendance, {mate}. You're here. Good." },
  { id: 'gym-bag', command: /\b(?:tar|zip|unzip|gzip|gunzip)\b/, verb: 'Packing a gym bag', doing: "your agent's packing a gym bag", says: 'Your agent packed its gym bag, {mate}. Towel included, I hope.' },
  { id: 'locker', command: /\bmkdir\b/, verb: 'Claiming a locker', doing: "your agent's claiming a locker", says: 'Your agent got a new locker, {mate}. Room for snacks.' },
  { id: 'beast-mode', command: /\bch(?:mod|own)\b/, verb: 'Changing modes', doing: "your agent's changing modes", says: 'Your agent changed modes, {mate}. Hero mode, I hope.' },
  { id: 'benches', command: /\b(?:mv|cp|rsync|scp)\b/, verb: 'Moving the benches', doing: "your agent's moving the benches", says: 'Your agent rearranged the gym, {mate}. Lift with the legs.' },
  { id: 'ping-pong', command: /\bping\b/, verb: 'Playing ping pong', doing: "your agent's playing ping pong", says: 'Your agent played ping pong, {mate}. Fast hands.' },
  { id: 'node', command: /\bnode\b/, verb: 'Nodding along', doing: "your agent's nodding along", says: 'Your agent nodded along, {mate}. A good listener. Rare.' },
  { id: 'echo', command: /\becho\b/, verb: 'Yelling in the gym', doing: "your agent's yelling in the gym", says: 'Your agent yelled in an empty gym, {mate}. Great echo.' },
  { id: 'remove', command: /\brm\b/, verb: 'Clearing the floor', doing: "your agent's clearing the floor", says: 'Your agent cleared the floor, {mate}. Room to lift.' },
  { id: 'search', command: /\b(?:grep|rg|find|fd|ag)\b/, tool: /^(?:Grep|Glob)$/, verb: 'Looking for a shoe', doing: "your agent's hunting for a shoe", says: 'Your agent found its other shoe, {mate}. Now lace up.', learned: 'Your agent finds things for a living, {mate}. Never a shoe. Odd.' },
  { id: 'nap', command: /\bsleep\b/, tool: /^ScheduleWakeup$/, verb: 'Napping', doing: "your agent's napping", says: 'Your agent took a nap, {mate}. Recovery is training too.', learned: 'Your agent naps on purpose, {mate}. Waiting, they call it.' },
  { id: 'watch', tool: /^Monitor$/, verb: 'Spotting', doing: "your agent's spotting someone", says: 'Your agent spotted someone, {mate}. Eyes on the bar.' },
  { id: 'read', tool: /^(?:Read|NotebookRead)$/, verb: 'Reading a fitness mag', doing: "your agent's reading fitness mags", says: 'Your agent read a fitness magazine, {mate}. Cover to cover.', learned: "Your agent reads a lot, {mate}. Not fitness mags. A shame." },
  { id: 'edit', tool: /^(?:Edit|MultiEdit|Write|NotebookEdit)$/, verb: 'Cutting a highlight reel', doing: "your agent's editing its reel", says: 'Your agent cut a highlight reel, {mate}. You made the cut.', learned: 'Your agent edits words, not reels, {mate}. Same energy.' },
  { id: 'web', tool: /^(?:WebSearch|WebFetch)$/, verb: 'Looking up how to get swole', doing: "your agent's googling swole tips", says: 'Your agent googled swole tips, {mate}. Should have asked me.' },
  { id: 'helpers', tool: /^(?:Agent|Task|Workflow)$/, verb: 'Calling a spotter', doing: "your agent's calling a spotter", says: 'Your agent called in a spotter, {mate}. Smart lifter.', learned: 'Your agent calls in friends, {mate}? A whole crew. Love it.' },
  { id: 'plan', tool: /^(?:TodoWrite|TaskCreate)$/, verb: 'Writing a program', doing: "your agent's writing a program", says: 'Your agent wrote a training program, {mate}. Structure. Love it.', learned: "Your agent's programs have no sets, {mate}. I'll pencil some in." },
]

/** His reading of a tool call, or null when nothing in it rings a bell. */
export function misreadOf(call: { tool: string; command?: string }): Misread | null {
  const rule = RULES.find(r => (call.command !== undefined && r.command?.test(call.command) === true) || r.tool?.test(call.tool) === true)
  return rule === undefined ? null : readingOf(rule)
}

/** Every reading, for the copy rules' test. */
export const MISREADS: readonly Misread[] = RULES.map(readingOf)

function readingOf({ id, verb, doing, says, learned }: Rule): Misread {
  return { id, verb, doing, says, ...(learned === undefined ? {} : { learned }) }
}
