/**
 * generate-sounds.js — synthesizes 4 short CC0 sound effects as RIFF WAV files
 * into assets/sounds/. Released to the public domain (CC0). Kenney-style SFX.
 *
 * Run: node scripts/generate-sounds.js
 */
const fs = require('fs');
const path = require('path');

const SR = 44100;

function writeWav(filePath, samples) {
  const numSamples = samples.length;
  const buffer = Buffer.alloc(44 + numSamples * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SR, 24);
  buffer.writeUInt32LE(SR * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);
  for (let i = 0; i < numSamples; i++) {
    let v = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  fs.writeFileSync(filePath, buffer);
}

function env(i, n, attack, release) {
  const a = Math.min(1, i / (attack * n));
  const r = Math.min(1, (n - i) / (release * n));
  return Math.max(0, Math.min(a, r));
}

// switch.wav — soft click/blip (short sine, ~0.12s)
function genSwitch() {
  const dur = 0.12;
  const n = Math.floor(SR * dur);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = 880 + 220 * Math.exp(-t * 30);
    out[i] = 0.5 * Math.sin(2 * Math.PI * f * t) * env(i, n, 0.02, 0.5);
  }
  return out;
}

// shard.wav — high chime (two-tone bell, ~0.3s)
function genShard() {
  const dur = 0.3;
  const n = Math.floor(SR * dur);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const s =
      0.4 * Math.sin(2 * Math.PI * 1318 * t) +
      0.25 * Math.sin(2 * Math.PI * 1760 * t);
    out[i] = s * env(i, n, 0.01, 0.35) * Math.exp(-t * 6);
  }
  return out;
}

// nearmiss.wav — woosh/riser (filtered noise sweep, ~0.4s)
function genNearMiss() {
  const dur = 0.4;
  const n = Math.floor(SR * dur);
  const out = new Float32Array(n);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const noise = Math.random() * 2 - 1;
    const cutoff = 200 + 4000 * t;
    const rc = 1 / (2 * Math.PI * cutoff);
    const dt = 1 / SR;
    lp += (noise - lp) * (dt / (rc + dt));
    const tone = 0.3 * Math.sin(2 * Math.PI * (300 + 1200 * t) * t);
    out[i] = (0.6 * lp + tone) * env(i, n, 0.1, 0.4);
  }
  return out;
}

// crash.wav — deep bass thud (low sine + noise burst, ~0.5s)
function genCrash() {
  const dur = 0.5;
  const n = Math.floor(SR * dur);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = 110 * Math.exp(-t * 4) + 45;
    const s = 0.6 * Math.sin(2 * Math.PI * f * t);
    const noise = (Math.random() * 2 - 1) * Math.exp(-t * 12) * 0.5;
    out[i] = (s + noise) * env(i, n, 0.005, 0.5) * Math.exp(-t * 3);
  }
  return out;
}

const dir = path.join(__dirname, '..', 'assets', 'sounds');
fs.mkdirSync(dir, { recursive: true });
writeWav(path.join(dir, 'switch.wav'), genSwitch());
writeWav(path.join(dir, 'shard.wav'), genShard());
writeWav(path.join(dir, 'nearmiss.wav'), genNearMiss());
writeWav(path.join(dir, 'crash.wav'), genCrash());
console.log('Generated CC0 sound effects in', dir);
