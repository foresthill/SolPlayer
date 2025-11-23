'use client';

import { useState } from 'react';
import { FrequencyConverter } from '@solplayer/audio-core';

export default function Home() {
  const [baseFreq] = useState(440);
  const [targetFreq, setTargetFreq] = useState(432);

  const semitones = FrequencyConverter.toSemitones(baseFreq, targetFreq);
  const cents = FrequencyConverter.toCents(baseFreq, targetFreq);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <section className="rounded-lg bg-gray-900 p-6">
        <h2 className="mb-4 text-lg font-semibold">周波数変換</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400">ターゲット周波数</label>
            <select
              value={targetFreq}
              onChange={(e) => setTargetFreq(Number(e.target.value))}
              className="mt-1 w-full rounded bg-gray-800 px-3 py-2"
            >
              <option value={440}>A=440Hz (標準)</option>
              <option value={432}>A=432Hz (ヒーリング)</option>
              <option value={444}>A=444Hz (クリスタル)</option>
              <option value={437}>A=437Hz (科学的)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="rounded bg-gray-800 p-3">
              <div className="text-gray-400">セミトーン</div>
              <div className="text-xl font-mono">{semitones.toFixed(4)}</div>
            </div>
            <div className="rounded bg-gray-800 p-3">
              <div className="text-gray-400">セント</div>
              <div className="text-xl font-mono">{cents.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg bg-gray-900 p-6">
        <h2 className="mb-4 text-lg font-semibold">プレイヤー</h2>
        <p className="text-gray-400">音楽プレイヤーは開発中です...</p>
      </section>
    </div>
  );
}
