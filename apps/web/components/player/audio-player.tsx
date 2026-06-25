'use client';

import { useRef } from 'react';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import { FrequencySelector } from './frequency-selector';
import { PlaybackControls } from './playback-controls';
import { ProgressBar } from './progress-bar';
import { VolumeControl } from './volume-control';
import { TrackInfo } from './track-info';
import { Button } from '@/components/ui/button';

export function AudioPlayer() {
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    frequency,
    playbackSpeed,
    trackTitle,
    play,
    pause,
    stop,
    seek,
    setVolume,
    setFrequency,
    setPlaybackSpeed,
    loadFile
  } = useAudioPlayer();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await loadFile(file);
    }
    // 同じファイルを再選択できるよう値をリセット
    e.target.value = '';
  };

  const hasTrack = trackTitle !== null;

  return (
    <div className="w-full max-w-2xl mx-auto p-6 space-y-6">
      {/* ファイル選択 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        className="w-full"
      >
        🎵 音声ファイルを選択
      </Button>

      {/* トラック情報 */}
      <TrackInfo
        title={trackTitle ?? 'トラック未選択'}
        artist={hasTrack ? 'ローカルファイル' : '上のボタンから音声ファイルを読み込んでください'}
      />

      {/* 周波数選択 */}
      <FrequencySelector
        frequency={frequency}
        onChange={setFrequency}
      />

      {/* 倍速選択 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          倍速: {playbackSpeed.toFixed(1)}x
        </label>
        <input
          type="range"
          min="0.5"
          max="2.0"
          step="0.1"
          value={playbackSpeed}
          onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {/* プログレスバー */}
      <ProgressBar
        currentTime={currentTime}
        duration={duration}
        onSeek={seek}
      />

      {/* 再生コントロール */}
      <PlaybackControls
        isPlaying={isPlaying}
        disabled={!hasTrack}
        onPlay={play}
        onPause={pause}
        onStop={stop}
      />

      {/* ボリュームコントロール */}
      <VolumeControl
        volume={volume}
        onChange={setVolume}
      />
    </div>
  );
}
