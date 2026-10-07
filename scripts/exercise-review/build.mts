// The exercise review for a coach: every exercise IdleReps can prescribe, its amounts by level, the office
// swaps and Swolomon's form tips, read from the plugin's code so it shows exactly what ships.
//
//   npx -y tsx scripts/exercise-review/build.mts <out.html>     (from the mod repo root)
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { LINES } from '../../plugins/idlereps/hooks/copy'
import { moveForExercise } from '../../plugins/idlereps/hooks/moves'
import { ALT_NAMES, ALTS, DESK_STRETCHES, LIBRARY, NOTES, OFFICE, OFFICE_HARDER } from '../../plugins/idlereps/hooks/programs'

type Entry = { name: string; value: number; unit: string }

const amount = (e: Entry) => (e.unit === 'reps' ? `${e.value} reps` : `${e.value} ${e.unit}`)
const levels = (entries: readonly Entry[]) => entries.map(e => ({ name: e.name, amount: amount(e) }))
/** His form tips for an exercise, the nickname as "champ". */
const cues = (name: string) => (LINES.find(l => l.id === `form-${moveForExercise(name)}`)?.variants ?? []).map(v => v.replace('{mate}', 'champ'))

const slots = Object.entries(LIBRARY).map(([slot, rows]) => ({
  slot,
  own: rows.map(row => ({ requires: row.requires, levels: levels(row.levels) })),
  alts: ALTS[slot as keyof typeof ALTS].map(row => ({ requires: row.requires, levels: levels(row.levels) })),
}))
const inPlan = new Set(Object.values(LIBRARY).flatMap(rows => rows.flatMap(row => row.levels.map(e => e.name))))
const names = new Set([
  ...inPlan,
  ...ALT_NAMES,
  ...Object.values(OFFICE).flatMap(swap => swap.map(e => e.name)),
  ...Object.values(OFFICE_HARDER).map(e => e.name),
  ...DESK_STRETCHES.map(d => d.name),
])
const exercises = [...names].sort().map(name => ({
  name,
  isNew: ALT_NAMES.includes(name) && !inPlan.has(name),
  note: NOTES[name] ?? DESK_STRETCHES.find(d => d.name === name)?.note ?? null,
  cues: cues(name),
}))
const data = {
  generated: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
  slots,
  exercises,
  office: Object.entries(OFFICE).map(([from, to]) => ({ from, to: to[0].name, amounts: to.map(amount) })),
  harder: Object.entries(OFFICE_HARDER).map(([from, to]) => ({ from, to: to.name, amount: amount(to) })),
  desk: DESK_STRETCHES,
}

const out = process.argv[2]
if (out === undefined) throw new Error('usage: build.mts <out.html>')
const template = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'template.html'), 'utf8')
writeFileSync(out, template.replace('/*DATA*/', JSON.stringify(data).replaceAll('</', '<\\/')))
console.log(`${out}: ${exercises.length} exercises, ${exercises.filter(e => e.isNew).length} new`)
