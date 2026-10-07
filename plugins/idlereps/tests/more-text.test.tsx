import { expect, test } from 'claude-code/testing'

import { LINES } from '../hooks/copy'
import { misreadOf } from '../hooks/misreads'

/** More of Swolomon's text (owner, 2026-10-06): more variants of the lines seen most, more misreads. */

const id = (command: string) => misreadOf({ tool: 'Bash', command })?.id ?? null

test('the new readings: every command he now has a word for', () => {
  expect([
    id('git cherry-pick abc123'),
    id('git revert HEAD'),
    id('git tag v1.2.0'),
    id('git bisect start'),
    id('git blame src/index.ts'),
    id('git status --short'),
    id('npm publish --access public'),
    id('pnpm run dev'),
    id('npx prisma migrate dev'),
    id('kubectl get pods'),
    id('helm upgrade api ./chart'),
    id('terraform plan'),
    id('vercel --prod'),
    id('psql -c "select 1"'),
    id('aws s3 ls'),
    id('gh pr create --fill'),
    id('tail -f server.log'),
    id('ps aux'),
    id('tar -czf out.tgz dist'),
    id('mkdir -p out'),
    id('chmod +x run.sh'),
    id('rsync -a dist/ host:/srv'),
    id('ping -c 1 example.com'),
    id('node scripts/seed.js'),
  ]).toEqual(['cherry-pick', 'revert', 'tag', 'bisect', 'blame', 'status', 'publish', 'dev-server', 'migrate', 'cubes', 'helm', 'terraform', 'shipping', 'sequel', 'cloud', 'form-check', 'tail', 'attendance', 'gym-bag', 'locker', 'beast-mode', 'benches', 'ping-pong', 'node'])
})

test('the specific reading still wins over the general one', () => {
  expect([
    id('helm install api ./chart'),
    id('terraform fmt'),
    id('cargo publish'),
    id('yarn publish'),
    id('npm run build'),
    id('npm start'),
    id('pytest -q | tail -5'),
    id('python manage.py migrate'),
    id('cat out.log | tail'),
    id('git push origin v1.2.0 --tags'),
  ]).toEqual(['helm', 'terraform', 'publish', 'publish', 'build', 'dev-server', 'fitness-test', 'migrate', 'cat', 'push'])
})

test('a word inside another is not the word: no reading from part of a name', () => {
  expect([id('ls targets'), id('echo https://x'), id('ls nodes'), id('cat tarball.md')]).toEqual([null, 'echo', null, 'cat'])
})

test('the lines seen most have plenty to say: several variants each', () => {
  const counts = Object.fromEntries(LINES.map(entry => [entry.id, entry.variants.length]))
  const most = ['set-cheer', 'set-banter', 'aside-nudge', 'aside-hello', 'aside-bored', 'aside-antics', 'aside-done', 'wisdom', 'protein', 'regulars', 'unlock']
  expect(most.filter(id => (counts[id] ?? 0) < 5)).toEqual([])
  expect(['ask-first', 'pick-up', 'day-toast', 'greet-missed', 'greet-long-away', 'new-best', 'skip', 'high-five'].filter(id => (counts[id] ?? 0) < 4)).toEqual([])
})

test('no two variants of a line say the same thing', () => {
  const repeated = LINES.filter(entry => new Set(entry.variants).size !== entry.variants.length).map(entry => entry.id)
  expect(repeated).toEqual([])
})
