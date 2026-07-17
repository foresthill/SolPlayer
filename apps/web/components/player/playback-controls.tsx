'use client';

import type { RepeatMode } from '@/hooks/use-audio-player';
import {
  PlayIcon,
  PauseIcon,
  PreviousIcon,
  NextIcon,
  ShuffleIcon,
  RepeatIcon,
  RepeatOneIcon,
} from './icons';

interface PlaybackControlsProps {
  isPlaying: boolean;
  disabled?: boolean;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onCycleRepeat: () => void;
  onToggleShuffle: () => void;
}

const repeatLabel: Record<RepeatMode, string> = {
  off: 'リピート: オフ',
  all: 'リピート: 全曲',
  one: 'リピート: 1曲',
};

export function PlaybackControls({
  isPlaying,
  disabled = false,
  repeatMode,
  isShuffle,
  onPlay,
  onPause,
  onNext,
  onPrevious,
  onCycleRepeat,
  onToggleShuffle,
}: PlaybackControlsProps) {
  return (
    <div className="flex items-center justify-center gap-3 sm:gap-5">
      <button
        type="button"
        className="glass-btn h-10 w-10"
        data-active={isShuffle}
        onClick={onToggleShuffle}
        aria-label="シャッフル"
        aria-pressed={isShuffle}
        title="シャッフル"
      >
        <ShuffleIcon className="h-4.5 w-4.5" />
      </button>

      <button
        type="button"
        className="glass-btn h-12 w-12"
        onClick={onPrevious}
        disabled={disabled}
        aria-label="前のトラック"
        title="前のトラック"
      >
        <PreviousIcon className="h-5.5 w-5.5" />
      </button>

      {/* 白い半透明の再生ボタン（中心） */}
      <button
        type="button"
        className="play-btn h-18 w-18"
        onClick={isPlaying ? onPause : onPlay}
        disabled={disabled}
        aria-label={isPlaying ? '一時停止' : '再生'}
        title={isPlaying ? '一時停止' : '再生'}
      >
        {isPlaying ? (
          <PauseIcon className="h-7 w-7" />
        ) : (
          <PlayIcon className="ml-0.5 h-7 w-7" />
        )}
      </button>

      <button
        type="button"
        className="glass-btn h-12 w-12"
        onClick={onNext}
        disabled={disabled}
        aria-label="次のトラック"
        title="次のトラック"
      >
        <NextIcon className="h-5.5 w-5.5" />
      </button>

      <button
        type="button"
        className="glass-btn h-10 w-10"
        data-active={repeatMode !== 'off'}
        onClick={onCycleRepeat}
        aria-label={repeatLabel[repeatMode]}
        title={repeatLabel[repeatMode]}
      >
        {repeatMode === 'one' ? (
          <RepeatOneIcon className="h-4.5 w-4.5" />
        ) : (
          <RepeatIcon className="h-4.5 w-4.5" />
        )}
      </button>
    </div>
  );
}
