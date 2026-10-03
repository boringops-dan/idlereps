// Writes plugins/idlereps/assets/blip.wav: Swolomon's talk blip (plan §1.11, coachSound "blips").
// Original: a 45 ms tone sliding 330 → 260 Hz with a fast decay, quiet, 16-bit mono at 22 050 Hz. Low and
// soft so five a second reads as a voice murmuring, not a beeping machine.
import { writeFileSync } from 'node:fs'

const RATE = 22_050
const SECONDS = 0.045
const samples = Math.round(RATE * SECONDS)
const ATTACK = Math.round(RATE * 0.003)

const data = Buffer.alloc(samples * 2)
let phase = 0
for (let i = 0; i < samples; i += 1) {
  const t = i / samples
  const frequency = 330 - 70 * t
  phase += (2 * Math.PI * frequency) / RATE
  // A rounder sound than a pure sine: the fundamental and a little of its octave.
  const tone = Math.sin(phase) + 0.25 * Math.sin(2 * phase)
  const envelope = Math.min(1, i / ATTACK) * Math.exp(-4 * t)
  data.writeInt16LE(Math.round(tone * envelope * 0.28 * 32_767), i * 2)
}

const header = Buffer.alloc(44)
header.write('RIFF', 0)
header.writeUInt32LE(36 + data.length, 4)
header.write('WAVE', 8)
header.write('fmt ', 12)
header.writeUInt32LE(16, 16)
header.writeUInt16LE(1, 20) // PCM
header.writeUInt16LE(1, 22) // mono
header.writeUInt32LE(RATE, 24)
header.writeUInt32LE(RATE * 2, 28)
header.writeUInt16LE(2, 32)
header.writeUInt16LE(16, 34)
header.write('data', 36)
header.writeUInt32LE(data.length, 40)

writeFileSync(new URL('../plugins/idlereps/assets/blip.wav', import.meta.url), Buffer.concat([header, data]))
