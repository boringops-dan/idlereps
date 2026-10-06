import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { celebrationById, celebrationFor, CELEBRATIONS, gestureOf, isTooSlow, TOO_SLOW_ODDS } from '../hooks/celebrate'
import { highFiveOf, loggedBand, pressCelebration } from '../hooks/bands'
import { line, plainOf } from '../hooks/copy'
import { CELEBRATION_MOVES, moveById, moveMs } from '../hooks/moves'
import { drawFigure } from '../hooks/figure'
import { ANIMATED, BAND, blitLog, cellsOf, drawnRows, NOON, OPTIONS, ownStore, SESSION, TINY, TODAY, workout, world } from './world'

/** A celebration after every set done (owner, 2026-10-06). */

async function bandOf($: Engine) {
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  const rows = drawnRows(await ui.drawn())
  const buttons = (await ui.findAll({ type: 'Button' })).map(b => ({ key: String(b.key), label: String((b.props as { label?: string }).label) }))
  const hasPortrait = (await ui.find({ key: 'swolomon' })) !== undefined
  await ui.unmount()
  return { rows, buttons, hasPortrait }
}

test('every celebration has its gestures drawn, its lines, and a label; all of them reachable', () => {
  const ids = new Set(Array.from({ length: 5000 }, (_, i) => celebrationFor(i + 1).id))
  expect([...ids].sort()).toEqual(CELEBRATIONS.map(c => c.id).sort())
  for (const c of CELEBRATIONS) {
    expect([c.id, c.label.length > 0]).toEqual([c.id, true])
    for (const stage of c.kind === 'offer' ? (['offered', 'landed'] as const) : (['shown'] as const)) {
      const move = moveById(gestureOf(c, stage))
      expect([c.id, stage, move !== undefined]).toEqual([c.id, stage, true])
    }
    expect(line(c.line, { day: TODAY }).length).toBeGreaterThan(0)
    if (c.kind === 'offer') expect(c.landed).toBeDefined()
  }
  expect(moveById('too-slow')).toBeDefined()
})

test('every celebration gesture draws 16 × 16 and is over within 4 seconds', () => {
  for (const move of CELEBRATION_MOVES) {
    for (const pose of move.poses) {
      const rows = drawFigure(pose)
      expect([move.id, rows.length, rows.every(r => r.length === 16)]).toEqual([move.id, 16, true])
    }
    expect([move.id, moveMs(move) <= 4000]).toEqual([move.id, true])
  }
})

test('too slow: only fives, about one in six', () => {
  const fives = CELEBRATIONS.filter(c => c.isFive === true)
  expect(fives.map(c => c.id)).toContain('low-five')
  expect(CELEBRATIONS.filter(c => c.isFive !== true).some(c => Array.from({ length: 200 }, (_, i) => isTooSlow(c, i)).some(Boolean))).toBe(false)
  const five = celebrationById('high-five')!
  const hits = Array.from({ length: 6000 }, (_, i) => isTooSlow(five, i)).filter(Boolean).length
  expect(hits).toBeGreaterThan(6000 / TOO_SLOW_ODDS / 2)
  expect(hits).toBeLessThan((6000 / TOO_SLOW_ODDS) * 2)
})

test('a set done: Swolomon on the band, his celebration in the line, the button named for it', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  const band = await bandOf($)
  expect(band.hasPortrait).toBe(true)
  const shown = CELEBRATIONS.find(c => band.buttons.some(b => b.key === 'highfive' && b.label === c.label) && band.rows.some(r => [0, 1].some(v => r === plainOf(line(c.line, { day: TODAY + v })))))
  expect(shown).toBeDefined()
  expect(band.buttons.map(b => b.key)).toEqual(['highfive', 'undo'])
})

test('an offered one: 1 lands it, his landed line, the button gone, Undo kept; counted', OPTIONS, async ($, on) => {
  const store = ownStore(on, {})
  world(on, TINY, 'own-store')
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  const offered = (await bandOf($)).buttons.find(b => b.key === 'highfive')?.label
  const c = CELEBRATIONS.find(x => x.kind === 'offer' && x.label === offered)
  await $.command.run(workout('highfive'))
  const after = await bandOf($)
  if (c !== undefined && after.buttons.some(b => b.key === 'highfive')) {
    // Too slow, the once: press again.
    expect(after.rows.join('\n')).toMatch(/Too slow|too slow/i)
    await $.command.run(workout('highfive'))
  }
  const landed = await bandOf($)
  expect(landed.buttons.map(b => b.key)).toEqual(['undo'])
  expect(landed.rows.some(r => r.startsWith('✓ Logged Push-ups'))).toBe(true)
  expect(store.get('highFives')).toBe(1)
})

test('too slow: the first press dodges and keeps the button; the second lands; one high five counted', OPTIONS, async ($, on) => {
  // A record's id is the moment it was made: start the clock on one that is a too-slow five.
  let at = NOON
  while (!(celebrationFor(at).kind === 'offer' && isTooSlow(celebrationFor(at), at))) at += 1000
  const store = ownStore(on, {})
  world(on, TINY, 'own-store', { now: at })
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  expect((await bandOf($)).buttons.find(b => b.key === 'highfive')?.label).toBe(celebrationFor(at).label)
  await $.command.run(workout('highfive'))
  const dodged = await bandOf($)
  expect(dodged.buttons.map(b => b.key)).toEqual(['highfive', 'undo'])
  expect(dodged.rows.some(r => [0, 1, 2].some(v => r === line('too-slow', { day: TODAY + v })))).toBe(true)
  expect(store.get('highFives') ?? 0).toBe(0)
  await $.command.run(workout('highfive'))
  expect((await bandOf($)).buttons.map(b => b.key)).toEqual(['undo'])
  expect(store.get('highFives')).toBe(1)
})

test('too slow, purely: dodged keeps the button and plays too-slow; then it lands', () => {
  const five = celebrationById('low-five')!
  const band = loggedBand('Logged Push-ups 10 reps', 7, { celebration: { celebration: five, isTooSlow: true, line: 'x' } })
  expect([band.act, band.celebration?.stage]).toEqual(['low-five-offer', 'offered'])
  const dodged = pressCelebration(band, five, { tooSlow: 'slow', landed: 'landed' })
  expect([dodged.act, dodged.celebration?.stage, dodged.coach, dodged.actions]).toEqual(['too-slow', 'dodged', ['slow'], ['highfive', 'undo']])
  const landed = pressCelebration(dodged, five, { tooSlow: 'slow', landed: 'landed' })
  expect([landed.act, landed.celebration?.stage, landed.coach, landed.actions]).toEqual(['low-five', 'landed', ['landed'], ['undo']])
})

test('a shown one: he does it at once; 1 is still a high five', () => {
  const confetti = celebrationById('confetti')!
  const band = loggedBand('Logged Push-ups 10 reps', 7, { celebration: { celebration: confetti, isTooSlow: false, line: 'x' } })
  expect([band.act, band.celebration?.stage, band.portrait]).toEqual(['confetti', 'shown', 'full'])
  const five = highFiveOf(band, 'up')
  expect([five.act, five.celebration, five.actions]).toEqual(['high-five', undefined, ['undo']])
})

test('a skip: the reassurance, no celebration', OPTIONS, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('skip'))
  const band = await bandOf($)
  expect(band.rows.some(r => r.includes(line('skip', { day: TODAY })))).toBe(true)
  expect(band.buttons.find(b => b.key === 'highfive')?.label).toBe('High five')
})

test('Quiet: the plain logged line and its High five, as before', { options: { ...OPTIONS.options, coachChat: 'quiet' } }, async ($, on) => {
  world(on, TINY)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  const band = await bandOf($)
  expect(band.hasPortrait).toBe(false)
  expect(band.rows[0]).toBe('✓ Logged Push-ups 10 reps · 1 of 2 today   1: High five   0: Undo')
})

test('animated: his celebration plays once the line is out', ANIMATED, async ($, on) => {
  const { clock } = world(on, TINY)
  const blits = blitLog(on)
  await $.session.start(SESSION)
  await $.command.run(workout('start'))
  await $.command.run(workout('done'))
  const ui = await $.ui.mount({ plugin: 'idlereps', surface: 'terminal', ...BAND })
  await clock.advance(6_000)
  await ui.unmount()
  const played = CELEBRATION_MOVES.concat([moveById('high-five')!]).some(m => cellsOf(m.id).some(cells => blits.some(b => b.cells === cells)))
  expect(played).toBe(true)
})
