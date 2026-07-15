'use client';

import { useCallback, useRef, useState } from 'react';

interface ProgressBarProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function ProgressBar({ currentTime, duration, onSeek }: ProgressBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  // ドラッグ中はローカルの位置を表示して滑らかに追従させる
  const [dragTime, setDragTime] = useState<number | null>(null);

  const displayTime = dragTime ?? currentTime;
  const progress = duration > 0 ? (displayTime / duration) * 100 : 0;

  const timeFromPointer = useCallback(
    (clientX: number): number => {
      const bar = barRef.current;
      if (!bar || duration <= 0) return 0;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return ratio * duration;
    },
    [duration]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragTime(timeFromPointer(e.clientX));
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragTime === null) return;
    setDragTime(timeFromPointer(e.clientX));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragTime === null) return;
    onSeek(timeFromPointer(e.clientX));
    setDragTime(null);
  };

  return (
    <div className="space-y-2">
      <div
        ref={barRef}
        role="slider"
        aria-label="再生位置"
        aria-valuemin={0}
        aria-valuemax={Math.floor(duration)}
        aria-valuenow={Math.floor(displayTime)}
        aria-valuetext={formatTime(displayTime)}
        className="group relative h-5 cursor-pointer touch-none select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => setDragTime(null)}
      >
        {/* トラック */}
        <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-[var(--track-bg)]" />
        {/* 進捗 */}
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-[var(--track-fill)] shadow-[0_2px_8px_-2px_rgba(120,100,160,0.6)]"
          style={{ width: `${progress}%` }}
        />
        {/* つまみ（ホバー/ドラッグ時に表示） */}
        <div
          className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/90 bg-[var(--track-fill)] shadow-md transition-opacity ${
            dragTime !== null ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
          style={{ left: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between text-xs tabular-nums text-ink-soft">
        <span>{formatTime(displayTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}
