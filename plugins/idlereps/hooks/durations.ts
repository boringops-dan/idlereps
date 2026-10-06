/**
 * How long a call will take (owner, 2026-10-06: "we need to have a pretty in-depth idea of which commands
 * take forever and which don't"). The engine says nothing before a call runs, so each call is known by its
 * kind (a command's family, `npm run build`, `cargo test`; a helper by its type; a tool by name), starts
 * from what that kind usually takes, and learns from every call timed here, per project for commands
 * (`npm run build` is seconds in one repo and minutes in the next). Pure.
 */

/** What is known of each kind of call: how many were timed, and their running average, ms. */
export type CallTimes = Record<string, { n: number; ms: number; at: number }>

/** A call expected to take this long is a sign of a long task, with its wait. */
export const LONG_CALL_MS = 45_000

/** Kinds kept: the least recently timed go first. */
export const CALL_TIMES_KEPT = 200
/** How much each new timing moves the average. */
const LEARN_RATE = 0.3
/** A timing longer than this is a call left running (a server, a hang): not learned. */
const LONGEST_MS = 3_600_000
/** What a command no family names usually takes. */
const UNKNOWN_COMMAND_MS = 5_000

/** Words that run a command rather than being it. */
const PREFIXES = new Set(['sudo', 'time', 'env', 'nice', 'command', 'exec', 'nohup'])
/** Runners whose script is the command (`python train.py`), not the runner. */
const SCRIPT_RUNNERS = new Set(['python', 'python3', 'node', 'bash', 'sh', 'zsh', 'ruby', 'deno', 'tsx', 'ts-node', 'perl', 'php'])
/** Runners of a package's own scripts and tools: the runner, then what it runs. */
const PACKAGE_RUNNERS = new Set(['npm', 'pnpm', 'yarn', 'bun', 'npx', 'bunx', 'pnpx', 'uv', 'uvx', 'poetry', 'pipx'])

const WORD = /^[a-z][a-z0-9:_.-]*$/i

/** One command of a line (no `&&`, `|`, `;`) as its kind: the program and the words that name what it does. */
export function segmentKey(segment: string): string | null {
  const words = segment.trim().split(/\s+/).filter(w => w !== '')
  while (words.length > 0 && (PREFIXES.has(words[0] ?? '') || /^[A-Z_][A-Z0-9_]*=/.test(words[0] ?? ''))) words.shift()
  const program = (words.shift() ?? '').split('/').at(-1) ?? ''
  if (program === '' || !WORD.test(program)) return null
  // Flags out of the way (`npx -y vitest`, `git -C dir push`); a flag's value goes with it when it has one.
  const rest = words.filter(w => !w.startsWith('-'))
  if (SCRIPT_RUNNERS.has(program)) {
    // `python -m pytest`: the module is what runs.
    const module = words[words.indexOf('-m') + 1]
    if (words.includes('-m') && module !== undefined && WORD.test(module)) return `${program} -m ${module}`.toLowerCase()
    const script = rest[0]
    return script !== undefined && /\.[a-z]+$/i.test(script) ? `${program} ${script.split('/').at(-1)}` : program
  }
  const named: string[] = [program]
  const most = PACKAGE_RUNNERS.has(program) || program === 'claude' || program === 'gh' || program === 'docker' ? 3 : 2
  for (const word of rest) {
    if (named.length >= most || !WORD.test(word) || word.includes('.')) break
    named.push(word)
  }
  return named.join(' ').toLowerCase()
}

/**
 * Typical durations by kind, seconds: the start before anything is learned. First match wins, so the more
 * particular come first. The widest families, so a project's own scripts start near the truth.
 */
const PRIORS: readonly [RegExp, number][] = [
  // Waiting on purpose.
  [/^sleep$/, 0], // read from the command itself (sleepMs)
  [/^gh run watch|^gh pr checks/, 300],
  // Long builds and deploys.
  [/^xcodebuild|^docker (build|buildx)|^docker compose (build|up)|^terraform apply|^cdk deploy|^serverless deploy|^vercel|^fly deploy|^railway up/, 300],
  [/^(cargo|swift) build|^cmake|^gradlew?|^mvn|^bazel|^nx run-many|^turbo (run )?build|^next build|^nix build/, 180],
  [/^(npm|pnpm|yarn|bun) (run )?(build|e2e|test:e2e)|^npx (playwright|cypress)|^playwright|^cypress/, 120],
  [/^terraform plan|^pulumi (up|preview)|^helm (install|upgrade)/, 90],
  // Test suites.
  [/^(cargo|swift) test|^tox|^rspec|^(mix|dotnet) test|^bundle exec rspec/, 120],
  [/^(npm|pnpm|yarn|bun) (run )?test|^npx (vitest|jest|mocha)|^vitest|^jest|^pytest|^python3? -m (pytest|unittest)|^go test|^phpunit|^claude plugin test/, 60],
  // Installs.
  [/^brew (install|upgrade)|^apt(-get)? (install|upgrade)|^poetry install|^bundle install|^pod install/, 90],
  [/^(npm|pnpm|yarn|bun) (install|ci|i|add)|^pip3? install|^uv (sync|pip)|^cargo (fetch|install)|^go (mod|get)|^composer install/, 45],
  // Type checks, lint, format.
  [/^(npm|pnpm|yarn|bun) (run )?(typecheck|lint|check)|^npx (-y )?(tsc|eslint)|^tsc|^eslint|^mypy|^cargo (check|clippy)|^go vet|^swiftlint/, 30],
  [/^(npm|pnpm|yarn|bun) (run )?(dev|start|serve|watch)|^next dev|^vite$|^rails s/, 600],
  [/^npx|^bunx|^pnpx|^uvx/, 20],
  [/^prettier|^ruff|^black|^gofmt|^rustfmt|^biome/, 5],
  // The network.
  [/^git (clone|submodule)/, 20],
  [/^git (push|pull|fetch)|^gh (pr|issue|release|repo|api)/, 5],
  [/^(curl|wget|http)/, 3],
  [/^(kubectl|aws|gcloud|az) /, 10],
  [/^claude (plugin validate|-p)/, 20],
  // Quick everyday commands.
  [/^(ls|cat|head|tail|grep|rg|find|fd|echo|pwd|wc|sed|awk|jq|which|mkdir|mv|cp|rm|touch|chmod|ln|diff|sort|uniq|cut|tr|date|stat|du|df|ps|kill|open|tree|file)( |$)/, 1],
  [/^git /, 1],
]

/** Typical durations of the engine's own tools and of helpers, ms, by kind. */
const TOOL_PRIORS: Record<string, number> = {
  'tool:Read': 300,
  'tool:Edit': 300,
  'tool:Write': 300,
  'tool:Grep': 500,
  'tool:Glob': 300,
  'tool:WebSearch': 8_000,
  'tool:WebFetch': 8_000,
  'tool:Workflow': 600_000,
  'agent:Explore': 90_000,
  'agent:Plan': 120_000,
  'agent:general-purpose': 180_000,
}
/** A helper of a type not listed. */
const AGENT_MS = 150_000
/** Any other tool. */
const TOOL_MS = 1_000

/** `sleep 30`, `sleep 2m`: how long, ms. */
function sleepMs(segment: string): number | null {
  const match = /\bsleep\s+(\d+(?:\.\d+)?)([smh]?)\b/.exec(segment)
  if (match === null) return null
  const unit = match[2] === 'm' ? 60_000 : match[2] === 'h' ? 3_600_000 : 1000
  return Math.round(Number(match[1]) * unit)
}

/** What a kind of command usually takes, ms, before anything is learned of it. */
export function priorMs(key: string): number {
  return (PRIORS.find(([pattern]) => pattern.test(key))?.[1] ?? UNKNOWN_COMMAND_MS / 1000) * 1000
}

/** A call, as what it is known by, and what it would take with nothing learned. */
export type CallKind = { key: string; priorMs: number }

/**
 * A Bash line's kind: its longest-looking command (`cd app && npm test` is `npm test`), in its project.
 * A `sleep` is exactly as long as it says.
 */
export function commandKind(command: string, project: string): CallKind | null {
  const segments = command.split(/&&|\|\||;|\||\n/).map(s => s.trim()).filter(s => s !== '')
  let best: CallKind | null = null
  for (const segment of segments) {
    const slept = sleepMs(segment)
    const key = segmentKey(segment)
    if (key === null) continue
    const prior = slept ?? priorMs(key)
    if (best === null || prior > best.priorMs) best = { key: `${project}|${key}`, priorMs: prior }
  }
  return best
}

/** Any tool call's kind: a command by its family, a helper by its type, the rest by name. */
export function callKind(tool: string, input: Record<string, unknown>, project: string): CallKind | null {
  if (tool === 'Bash') return typeof input.command === 'string' ? commandKind(input.command, project) : null
  if (tool === 'Agent' || tool === 'Task') {
    const type = typeof input.subagent_type === 'string' ? input.subagent_type : 'general-purpose'
    return { key: `agent:${type}`, priorMs: TOOL_PRIORS[`agent:${type}`] ?? AGENT_MS }
  }
  return { key: `tool:${tool}`, priorMs: TOOL_PRIORS[`tool:${tool}`] ?? TOOL_MS }
}

/** What a kind of call will likely take, ms: what was learned of it, else its prior (one timing: halfway). */
export function expectedMs(kind: CallKind, times: CallTimes): number {
  const known = times[kind.key]
  if (known === undefined) return kind.priorMs
  return known.n === 1 ? Math.round((known.ms + kind.priorMs) / 2) : known.ms
}

/** One more timing of a kind: the average moves toward it; the least recent kinds go past the cap. */
export function learn(times: CallTimes, key: string, ms: number, at: number): CallTimes {
  if (ms < 0 || ms > LONGEST_MS) return times
  const known = times[key]
  const next: CallTimes = { ...times, [key]: known === undefined ? { n: 1, ms: Math.round(ms), at } : { n: known.n + 1, ms: Math.round(known.ms + (ms - known.ms) * LEARN_RATE), at } }
  const keys = Object.keys(next)
  if (keys.length <= CALL_TIMES_KEPT) return next
  const oldest = keys.sort((a, b) => (next[a]?.at ?? 0) - (next[b]?.at ?? 0)).slice(0, keys.length - CALL_TIMES_KEPT)
  for (const key of oldest) delete next[key]
  return next
}
