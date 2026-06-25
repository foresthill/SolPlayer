'use client';

import { Button } from '@/components/ui/button';

interface PlaybackControlsProps {
  isPlaying: boolean;
  disabled?: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
}

export function PlaybackControls({ isPlaying, disabled = false, onPlay, onPause, onStop }: PlaybackControlsProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      <Button variant="outline" onClick={onStop} disabled={disabled}>
        ⏹ 停止
      </Button>
      {isPlaying ? (
        <Button onClick={onPause} size="lg" disabled={disabled}>
          ⏸ 一時停止
        </Button>
      ) : (
        <Button onClick={onPlay} size="lg" disabled={disabled}>
          ▶ 再生
        </Button>
      )}
    </div>
  );
}
