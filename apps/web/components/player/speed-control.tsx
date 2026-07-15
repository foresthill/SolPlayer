'use client';

interface SpeedControlProps {
  speed: number;
  onChange: (speed: number) => void;
}

export function SpeedControl({ speed, onChange }: SpeedControlProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="shrink-0 text-xs font-medium tracking-wider text-ink-soft">
        倍速
      </span>
      <input
        type="range"
        min="0.5"
        max="2.0"
        step="0.1"
        value={speed}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="glass-range flex-1"
        aria-label="再生速度"
      />
      <button
        type="button"
        className="glass-chip w-14 px-2 py-1 text-xs tabular-nums"
        onClick={() => onChange(1.0)}
        title="クリックで1.0xに戻す"
      >
        {speed.toFixed(1)}x
      </button>
    </div>
  );
}
