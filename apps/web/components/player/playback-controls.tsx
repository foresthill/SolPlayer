'use client';

import { Button } from '@/components/ui/button';

interface PlaybackControlsProps {
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
}

export function PlaybackControls({ isPlaying, onPlay, onPause, onStop }: PlaybackControlsProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      <Button variant="outline" onClick={onStop}>
        ⏹ 停止
      </Button>
      {isPlaying ? (
        <Button onClick={onPause} size="lg">
          ⏸ 一時停止
        </Button>
      ) : (
        <Button onClick={onPlay} size="lg">
          ▶ 再生
        </Button>
      )}
    </div>
  );
}
