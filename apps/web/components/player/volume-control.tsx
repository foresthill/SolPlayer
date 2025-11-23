'use client';

interface VolumeControlProps {
  volume: number;
  onChange: (volume: number) => void;
}

export function VolumeControl({ volume, onChange }: VolumeControlProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm">🔊</span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={volume}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
      />
      <span className="text-sm w-12 text-right">{Math.round(volume * 100)}%</span>
    </div>
  );
}
