'use client';

import { VolumeIcon } from './icons';

interface VolumeControlProps {
  volume: number;
  onChange: (volume: number) => void;
}

export function VolumeControl({ volume, onChange }: VolumeControlProps) {
  return (
    <div className="flex items-center gap-3">
      <VolumeIcon className="h-4.5 w-4.5 shrink-0 text-ink-soft" />
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={volume}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="glass-range flex-1"
        aria-label="音量"
      />
      <span className="w-10 text-right text-xs tabular-nums text-ink-soft">
        {Math.round(volume * 100)}%
      </span>
    </div>
  );
}
