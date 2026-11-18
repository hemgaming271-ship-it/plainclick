// Composes an ORIGINAL background track for the launch video (no samples, no third-party music, no licensing issues):
// warm pad chords + a soft plucked pulse + subtle UI click sounds synced to the on-screen clicks.
//   node make-audio.mjs            -> assets/music.wav (48 kHz stereo, length = video duration)
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const SR = 48000;
const DUR = Number(process.argv[2]) || 57.5;
const N = Math.round(SR * DUR);
const L = new Float32Array(N), R = new Float32Array(N);

const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
// C major, calm: Cmaj9 · Am9 · Fmaj9 · Gsus2 (MIDI notes)
const CHORDS = [
  [48, 55, 59, 62, 64],   // C3 G3 B3 D4 E4
  [45, 52, 55, 59, 60],   // A2 E3 G3 B3 C4
  [41, 48, 52, 55, 57],   // F2 C3 E3 G3 A3
  [43, 50, 55, 57, 62],   // G2 D3 G3 A3 D4
];
const BAR = 4.8;

// ---- pad: slow attack/release, few harmonics (warm), slight L/R detune for width ----
function pad(t0, t1, notes, gain) {
  const a = 1.4, r = 1.8;
  const s0 = Math.max(0, Math.floor(t0 * SR)), s1 = Math.min(N, Math.floor((t1 + r) * SR));
  for (const m of notes) {
    const f = hz(m), amp = gain / notes.length * (m < 50 ? 1.15 : 1);
    for (let i = s0; i < s1; i++) {
      const t = i / SR, lt = t - t0;
      const env = Math.min(1, lt / a) * (t > t1 ? Math.max(0, 1 - (t - t1) / r) : 1);
      if (env <= 0) continue;
      const w = (ff) => Math.sin(2 * Math.PI * ff * t) + 0.28 * Math.sin(4 * Math.PI * ff * t) + 0.08 * Math.sin(6 * Math.PI * ff * t);
      L[i] += amp * env * w(f * 0.9985);
      R[i] += amp * env * w(f * 1.0015);
    }
  }
}

// ---- pluck: soft bell-like note with exponential decay ----
function pluck(t, midi, gain, pan = 0) {
  const f = hz(midi), s0 = Math.floor(t * SR), len = Math.floor(1.6 * SR);
  for (let k = 0; k < len && s0 + k < N; k++) {
    const tt = k / SR, env = Math.exp(-tt * 3.2) * Math.min(1, tt / 0.004);
    const v = gain * env * (Math.sin(2 * Math.PI * f * tt) + 0.35 * Math.sin(2 * Math.PI * f * 2 * tt) * Math.exp(-tt * 6));
    L[s0 + k] += v * (1 - pan) * 0.5 * 2; R[s0 + k] += v * (1 + pan) * 0.5 * 2;
  }
}

// ---- UI click: short, quiet, crisp ----
function click(t, freq = 1900, gain = 0.22) {
  const s0 = Math.floor(t * SR), len = Math.floor(0.06 * SR);
  let seed = 1234;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  for (let k = 0; k < len && s0 + k < N; k++) {
    const tt = k / SR;
    const v = gain * (Math.sin(2 * Math.PI * freq * tt) * Math.exp(-tt * 140) + 0.25 * rnd() * Math.exp(-tt * 400));
    L[s0 + k] += v; R[s0 + k] += v;
  }
}

// Pads for the whole video (bars of 4.8 s), ending on C for the end card
const bars = Math.ceil(DUR / BAR);
for (let b = 0; b < bars; b++) {
  const chord = b === bars - 1 ? CHORDS[0] : CHORDS[b % 4];
  pad(b * BAR, Math.min(DUR - 1.6, (b + 1) * BAR), chord, 0.16);
}
// Plucked pulse while the product is on screen (7 s - 46 s): arpeggio of the current chord, every 0.6 s
for (let t = 7.2; t < 46.0; t += 0.6) {
  const b = Math.floor(t / BAR), chord = CHORDS[b % 4];
  const step = Math.round((t - 7.2) / 0.6);
  const note = chord[1 + (step % 4)] + 12;
  pluck(t, note, step % 4 === 0 ? 0.05 : 0.032, step % 2 ? 0.3 : -0.3);
}
// A gentle "arrival" note for the title and the end card
pluck(0.5, 76, 0.06); pluck(52.3, 72, 0.07); pluck(52.3, 79, 0.05);

// ---- simple stereo ping-pong delay as "space" (music only) ----
const d = Math.floor(0.36 * SR), fb = 0.32, mix = 0.22;
const dl = new Float32Array(N), dr = new Float32Array(N);
for (let i = 0; i < N; i++) {
  const il = i - d >= 0 ? dr[i - d] : 0, ir = i - d >= 0 ? dl[i - d] : 0;
  dl[i] = L[i] + il * fb; dr[i] = R[i] + ir * fb;
  L[i] += il * mix; R[i] += ir * mix;
}

// Clicks synced to timeline.html (keycap press + panel button clicks), added dry so they don't echo
click(14.05, 900, 0.18);
for (const t of [19.0, 26.1, 35.4, 37.4]) click(t + 0.02);

// ---- master: fade in/out, soft limit, normalise ----
let peak = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const env = Math.min(1, t / 1.5) * Math.min(1, (DUR - t) / 2.2);
  L[i] = Math.tanh(L[i] * env * 1.1); R[i] = Math.tanh(R[i] * env * 1.1);
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const g = 0.8 / (peak || 1);
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g)) * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * g)) * 32767), 46 + i * 4);
}
const out = path.join(here, 'assets', 'music.wav');
writeFileSync(out, buf);
console.log(`wrote ${out} (${DUR}s, peak normalised)`);
