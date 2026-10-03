import { expect, test } from 'claude-code/testing'

import { line } from '../hooks/copy'
import { OPTIONS, ownStore, SESSION, TINY, TODAY, world } from './world'

/** A new gym (owner, 2026-10-03): the first session in a project he has not seen, he notices. */

const isNewGym = (toast: string) => /Nice equipment|Smells new|keep the chalk/.test(toast)

test('a project he has seen them in before: nothing; a new one: a new gym', OPTIONS, async ($, on) => {
  const store = ownStore(on, { gyms: ['work'] })
  const { w } = world(on, TINY, 'own-store')
  await $.session.start(SESSION)
  expect(w.toasts.some(isNewGym)).toBe(false)
  await $.session.start({ ...SESSION, cwd: '/home/me/side-project' })
  expect(w.toasts).toContain(line('new-gym', { day: TODAY, gym: 'side-project' }))
  expect(store.get('gyms')).toEqual(['work', 'side-project'])
})

test('the very first session: remembered, not remarked on', OPTIONS, async ($, on) => {
  const store = ownStore(on, {})
  const { w } = world(on, TINY, 'own-store')
  await $.session.start(SESSION)
  expect(w.toasts.some(isNewGym)).toBe(false)
  expect(store.get('gyms')).toEqual(['work'])
})

test('a long folder name is cut short', OPTIONS, async ($, on) => {
  const { w } = world(on, TINY, { gyms: ['work'] })
  await $.session.start({ ...SESSION, cwd: '/home/me/an-extremely-long-project-folder-name' })
  expect(w.toasts).toContain(line('new-gym', { day: TODAY, gym: 'an-extremely-long-proje…' }))
})

test('not training yet: nothing said, nothing kept', OPTIONS, async ($, on) => {
  const store = ownStore(on, { gyms: ['work'] })
  world(on, null, 'own-store')
  await $.session.start({ ...SESSION, cwd: '/home/me/elsewhere' })
  expect(store.get('gyms')).toEqual(['work'])
})
