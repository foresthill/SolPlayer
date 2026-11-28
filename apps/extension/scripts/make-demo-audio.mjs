// 実行: リポジトリルートで node apps/extension/scripts/make-demo-audio.mjs（WAVはカレントに出力）
// ショート動画用デモ音源の生成:
// 1) 440Hz基準でピアノ風フレーズを合成（C-G-Am-F→C、約10秒）
// 2) 製品と同じSoundTouch(pitchSemitones)で432Hz版・444Hz版を生成
// 3) QA: 純音A4を同じパイプラインに通してゼロクロス実測で検証
import { SoundTouch, SimpleFilter } from 'soundtouchjs';
import { writeFileSync } from 'fs';

const SR = 48000;

/* ---------- シンセ ---------- */
const midiFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);
// ピアノ風: 倍音の重ね＋わずかなインハーモニシティ＋指数減衰
function renderNote(buf, startSec, midi, durSec, vel, pan) {
  const partials = [1, 0.55, 0.32, 0.2, 0.12, 0.07];
  const f0 = midiFreq(midi);
  const start = Math.floor(startSec * SR);
  const n = Math.floor(durSec * SR);
  const tau = Math.max(0.6, durSec * 0.6);
  const gl = Math.SQRT1_2 * (1 - pan * 0.4);
  const gr = Math.SQRT1_2 * (1 + pan * 0.4);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const atk = Math.min(1, t / 0.008);
    const env = atk * Math.exp(-t / tau);
    let s = 0;
    for (let k = 0; k < partials.length; k++) {
      const fk = f0 * (k + 1) * (1 + 0.0004 * (k + 1) * (k + 1));
      s += partials[k] * Math.sin(2 * Math.PI * fk * t) * Math.exp(-t * k * 1.2);
    }
    const v = s * env * vel * 0.22;
    const idx = (start + i) * 2;
    if (idx + 1 < buf.length) {
      buf[idx] += v * gl;
      buf[idx + 1] += v * gr;
    }
  }
}

const N = { C3: 48, E3: 52, F3: 53, G3: 55, A3: 57, B3: 59, C4: 60, D4: 62, E4: 64, F4: 65, G4: 67, A4: 69, C5: 72, D5: 74, E5: 76 };
const BEAT = 60 / 72; // 72bpm

function composeBase440() {
  const total = BEAT * 8 + 3.2;
  const buf = new Float32Array(Math.ceil(total * SR) * 2);
  // 2拍ごとのコード: C, G, Am, F → 最後にCを響かせる
  const chords = [
    { arp: [N.C3, N.G3, N.C4, N.E4], mel: N.E5 },
    { arp: [N.B3 - 12 + 12, N.G3, N.B3, N.D4], mel: N.D5 }, // G
    { arp: [N.A3 - 12 + 12, N.E3 + 12, N.A3, N.C4], mel: N.C5 }, // Am
    { arp: [N.F3, N.C4, N.F4, N.A4 - 12 + 12], mel: N.A4 }, // F
  ];
  chords.forEach((ch, ci) => {
    const t0 = ci * BEAT * 2;
    // アルペジオ（8分音符×4）
    ch.arp.forEach((m, i) => {
      renderNote(buf, t0 + i * (BEAT / 2) * 1.0, m, BEAT * 1.6, 0.55, -0.35);
    });
    // メロディ（2拍のばす）
    renderNote(buf, t0, ch.mel, BEAT * 2.1, 0.8, 0.3);
  });
  // 終止: Cメジャーをゆったり
  const tEnd = BEAT * 8;
  [N.C3, N.G3, N.E4, N.C5].forEach((m, i) => {
    renderNote(buf, tEnd + i * 0.06, m, 3.0, 0.7, (i % 2 ? 0.25 : -0.25));
  });
  // ノーマライズ＆フェードアウト
  let peak = 0;
  for (const v of buf) peak = Math.max(peak, Math.abs(v));
  const g = 0.85 / (peak || 1);
  const fadeStart = buf.length / 2 - SR * 1.0;
  for (let i = 0; i < buf.length / 2; i++) {
    const fade = i > fadeStart ? Math.max(0, 1 - (i - fadeStart) / (SR * 1.0)) : 1;
    buf[i * 2] *= g * fade;
    buf[i * 2 + 1] *= g * fade;
  }
  return buf;
}

/* ---------- SoundTouch変換（製品と同じ経路） ---------- */
function shiftPitch(interleaved, targetHz) {
  const st = new SoundTouch();
  st.tempo = 1.0;
  st.pitchSemitones = 12 * Math.log2(targetHz / 440);
  let readPos = 0;
  const totalFrames = interleaved.length / 2;
  const source = {
    extract(target, numFrames) {
      const n = Math.min(numFrames, Math.max(0, totalFrames - readPos));
      for (let i = 0; i < n * 2; i++) target[i] = interleaved[readPos * 2 + i];
      readPos += n;
      return n;
    },
  };
  const filter = new SimpleFilter(source, st);
  const chunks = [];
  const buf = new Float32Array(16384 * 2);
  for (;;) {
    const n = filter.extract(buf, 16384);
    if (!n) break;
    chunks.push(buf.slice(0, n * 2));
  }
  const out = new Float32Array(chunks.reduce((a, c) => a + c.length, 0));
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

/* ---------- WAV書き出し ---------- */
function writeWav(path, interleaved) {
  const frames = interleaved.length / 2;
  const data = Buffer.alloc(frames * 4);
  for (let i = 0; i < interleaved.length; i++) {
    data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(interleaved[i] * 32767))), i * 2);
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20);
  h.writeUInt16LE(2, 22); h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 4, 28);
  h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  writeFileSync(path, Buffer.concat([h, data]));
}

/* ---------- QA: 純音をパイプラインに通して実測 ---------- */
function measureHz(interleaved) {
  const s = [];
  for (let i = 0; i < interleaved.length / 2; i++) s.push(interleaved[i * 2]);
  const seg = s.slice(SR, SR * 2); // 定常部1秒
  const idxs = [];
  for (let i = 1; i < seg.length; i++) if (seg[i - 1] < 0 && seg[i] >= 0) idxs.push(i);
  const diffs = [];
  for (let i = 1; i < idxs.length; i++) diffs.push(idxs[i] - idxs[i - 1]);
  diffs.sort((a, b) => a - b);
  return SR / diffs[Math.floor(diffs.length / 2)];
}
const tone = new Float32Array(SR * 3 * 2);
for (let i = 0; i < SR * 3; i++) {
  const v = Math.sin(2 * Math.PI * 440 * (i / SR)) * 0.5;
  tone[i * 2] = v;
  tone[i * 2 + 1] = v;
}
for (const hz of [432, 444]) {
  const got = measureHz(shiftPitch(tone, hz));
  const ok = Math.abs(got - hz) < 1.5;
  console.log(`QA ${hz}Hz: 実測=${got.toFixed(2)}Hz ${ok ? 'PASS' : 'FAIL'}`);
  if (!ok) process.exit(1);
}

/* ---------- 生成 ---------- */
const base = composeBase440();
writeWav('solplayer-demo-440.wav', base);
writeWav('solplayer-demo-432.wav', shiftPitch(base, 432));
writeWav('solplayer-demo-444.wav', shiftPitch(base, 444));
console.log('done:', (base.length / 2 / SR).toFixed(1) + 's');
