'use client';

import { FrequencyConverter } from '@solplayer/audio-core';
import { useState } from 'react';

interface FrequencySelectorProps {
  frequency: number;
  onChange: (hz: number) => void;
}

const PRESETS = [
  { name: '標準', value: 440 },
  { name: 'ヒーリング', value: 432 },
  { name: 'クリスタル', value: 444 },
  { name: '科学的', value: 437 },
];

const MIN_HZ = 400;
const MAX_HZ = 480;

export function FrequencySelector({ frequency, onChange }: FrequencySelectorProps) {
  const [customHz, setCustomHz] = useState('440');

  const applyCustom = () => {
    const hz = parseInt(customHz, 10);
    if (Number.isNaN(hz) || hz < MIN_HZ || hz > MAX_HZ) return;
    onChange(hz);
  };

  const semitones = FrequencyConverter.toSemitones(440, frequency);

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold tracking-wider text-ink-soft">
          基調周波数 (A4)
        </h3>
        <p className="text-xs tabular-nums text-ink-soft">
          {frequency}Hz
          {frequency !== 440 && (
            <span className="ml-1.5 text-ink-faint">
              ({semitones > 0 ? '+' : ''}
              {semitones.toFixed(2)} st)
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            className="glass-chip flex flex-col items-center gap-0.5 px-3 py-2.5"
            data-active={frequency === preset.value}
            onClick={() => onChange(preset.value)}
            aria-pressed={frequency === preset.value}
          >
            <span className="text-sm font-semibold tabular-nums">
              {preset.value}
              <span className="text-[0.65rem] font-normal">Hz</span>
            </span>
            <span className="text-[0.65rem] opacity-80">{preset.name}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="number"
          min={MIN_HZ}
          max={MAX_HZ}
          value={customHz}
          onChange={(e) => setCustomHz(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applyCustom()}
          placeholder={`カスタム (${MIN_HZ}–${MAX_HZ}Hz)`}
          className="glass-input min-w-0 flex-1 text-sm"
          aria-label="カスタム周波数"
        />
        <button
          type="button"
          className="glass-chip shrink-0 px-4 py-2 text-sm font-medium"
          onClick={applyCustom}
        >
          適用
        </button>
      </div>
    </div>
  );
}
