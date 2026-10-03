// Writes plugins/idlereps/assets/time.wav: the hold timer's "Time!" beep (plan §1.12 item 1).
// A 0.3 s 880 Hz sine, 16-bit mono at 22 050 Hz, with 10 ms fades so it never clicks.
import { writeFileSync } from 'node:fs'

const RATE = 22_050
const SECONDS = 0.3
const FREQUENCY = 880
const FADE = Math.round(RATE * 0.01)
const samples = Math.round(RATE * SECONDS)

const data = Buffer.alloc(samples * 2)
for (let i = 0; i < samples; i += 1) {
  const envelope = Math.min(1, i / FADE, (samples - 1 - i) / FADE)
  const value = Math.sin((2 * Math.PI * FREQUENCY * i) / RATE) * envelope * 0.6
  data.writeInt16LE(Math.round(value * 32_767), i * 2)
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

writeFileSync(new URL('../plugins/idlereps/assets/time.wav', import.meta.url), Buffer.concat([header, data]))
