'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getAudioProcessor } from '@/lib/audio/audio-context';
import { AudioProcessor } from '@solplayer/audio-core';

export interface PlaylistTrack {
  id: string;
  title: string;
  /** ObjectURL（ローカルファイル）または通常のURL */
  url: string;
}

/** リピートモード: オフ → 全曲 → 1曲 の順に循環 */
export type RepeatMode = 'off' | 'all' | 'one';

export interface UseAudioPlayerReturn {
  // 再生状態
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  frequency: number;
  playbackSpeed: number;
  trackTitle: string | null;

  // プレイリスト
  playlist: PlaylistTrack[];
  currentIndex: number;
  repeatMode: RepeatMode;
  isShuffle: boolean;

  // 操作
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  setFrequency: (hz: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  addFiles: (files: File[]) => Promise<void>;
  selectTrack: (index: number) => Promise<void>;
  removeTrack: (id: string) => void;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  cycleRepeatMode: () => void;
  toggleShuffle: () => void;
}

/** 前のトラックに戻らず曲頭に戻す境界秒数 */
const RESTART_THRESHOLD_SECONDS = 3;

function createTrackId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `track-${Math.random().toString(36).slice(2)}`;
}

/** ファイル名から拡張子を除いてトラック名にする */
function fileToTitle(file: File): string {
  return file.name.replace(/\.[^.]+$/, '');
}

export function useAudioPlayer(): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [frequency, setFrequencyState] = useState(440);
  const [playbackSpeed, setPlaybackSpeedState] = useState(1.0);
  const [playlist, setPlaylist] = useState<PlaylistTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [isShuffle, setIsShuffle] = useState(false);

  const processorRef = useRef<AudioProcessor | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  // onEndedコールバックは初回登録のみのため、最新の状態はrefで参照する
  const stateRef = useRef({ playlist, currentIndex, repeatMode, isShuffle });
  stateRef.current = { playlist, currentIndex, repeatMode, isShuffle };
  const endedHandlerRef = useRef<() => void>(() => {});
  // 連打時に古いloadの完了処理を無視するためのシーケンス番号
  const loadSeqRef = useRef(0);

  useEffect(() => {
    const processor = getAudioProcessor();
    processorRef.current = processor;
    processor.setOnEnded(() => endedHandlerRef.current());

    return () => {
      processor.setOnEnded(null);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // ObjectURLをすべて破棄してリーク防止
      for (const track of stateRef.current.playlist) {
        URL.revokeObjectURL(track.url);
      }
    };
  }, []);

  // 再生位置を定期的に更新
  useEffect(() => {
    if (isPlaying) {
      const updateTime = () => {
        if (processorRef.current) {
          setCurrentTime(processorRef.current.getCurrentTime());
        }
        animationFrameRef.current = requestAnimationFrame(updateTime);
      };
      animationFrameRef.current = requestAnimationFrame(updateTime);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying]);

  /** 指定トラックをロードし、必要なら再生を開始する */
  const loadTrackAt = useCallback(
    async (track: PlaylistTrack, index: number, autoplay: boolean) => {
      if (!processorRef.current) return;

      const seq = ++loadSeqRef.current;
      setCurrentIndex(index);
      setIsPlaying(false);
      setCurrentTime(0);

      await processorRef.current.initialize();
      await processorRef.current.load(track.url);
      // ロード中に別のトラックが選択されたら何もしない
      if (seq !== loadSeqRef.current) return;

      setDuration(processorRef.current.getDuration());
      if (autoplay) {
        await processorRef.current.play();
        setIsPlaying(true);
      }
    },
    []
  );

  const selectTrack = useCallback(
    async (index: number) => {
      const track = stateRef.current.playlist[index];
      if (!track) return;
      await loadTrackAt(track, index, true);
    },
    [loadTrackAt]
  );

  /**
   * 次に再生すべきトラックのインデックスを返す。
   * 自動遷移（曲終了時）でリピートオフの末尾なら null（停止）。
   * 手動の「次へ」は常に先頭へ折り返す。
   */
  const pickNextIndex = useCallback((manual: boolean): number | null => {
    const { playlist, currentIndex, repeatMode, isShuffle } = stateRef.current;
    if (playlist.length === 0) return null;

    if (isShuffle && playlist.length > 1) {
      let idx = currentIndex;
      while (idx === currentIndex) {
        idx = Math.floor(Math.random() * playlist.length);
      }
      return idx;
    }

    const nextIdx = currentIndex + 1;
    if (nextIdx < playlist.length) return nextIdx;
    if (repeatMode === 'all' || manual) return 0;
    return null;
  }, []);

  // 曲終了時: リピート/シャッフル設定に従って次のトラックへ
  endedHandlerRef.current = () => {
    const { repeatMode } = stateRef.current;
    setIsPlaying(false);

    if (repeatMode === 'one') {
      // 同じトラックを先頭から再生し直す（processor側でended後のplayは先頭から始まる）
      void (async () => {
        if (!processorRef.current) return;
        await processorRef.current.play();
        setCurrentTime(0);
        setIsPlaying(true);
      })();
      return;
    }

    const nextIdx = pickNextIndex(false);
    if (nextIdx === null) {
      setCurrentTime(0);
      return;
    }
    void selectTrack(nextIdx);
  };

  const addFiles = useCallback(
    async (files: File[]) => {
      const audioFiles = files.filter(
        (f) => f.type.startsWith('audio/') || f.type === ''
      );
      if (audioFiles.length === 0) return;

      const newTracks: PlaylistTrack[] = audioFiles.map((file) => ({
        id: createTrackId(),
        title: fileToTitle(file),
        url: URL.createObjectURL(file),
      }));

      const hadNoTrack = stateRef.current.playlist.length === 0;
      const updated = [...stateRef.current.playlist, ...newTracks];
      // 直後のloadTrackAtが新しいリストを参照できるよう、refも即時更新する
      stateRef.current.playlist = updated;
      setPlaylist(updated);

      // 何も再生していなければ最初に追加した曲をすぐ再生
      if (hadNoTrack) {
        await loadTrackAt(newTracks[0], updated.length - newTracks.length, true);
      }
    },
    [loadTrackAt]
  );

  const removeTrack = useCallback((id: string) => {
    const { playlist, currentIndex } = stateRef.current;
    const index = playlist.findIndex((t) => t.id === id);
    if (index === -1) return;

    URL.revokeObjectURL(playlist[index].url);
    const updated = playlist.filter((t) => t.id !== id);
    stateRef.current.playlist = updated;
    setPlaylist(updated);

    if (index === currentIndex) {
      // 再生中のトラックを削除したら停止して未選択に戻す
      loadSeqRef.current++;
      processorRef.current?.stop();
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setCurrentIndex(-1);
    } else if (index < currentIndex) {
      setCurrentIndex(currentIndex - 1);
    }
  }, []);

  const play = useCallback(async () => {
    if (!processorRef.current) return;

    const { playlist, currentIndex } = stateRef.current;
    if (currentIndex === -1) {
      // 未選択なら先頭から再生
      if (playlist.length > 0) {
        await loadTrackAt(playlist[0], 0, true);
      }
      return;
    }

    await processorRef.current.play();
    setIsPlaying(true);
  }, [loadTrackAt]);

  const pause = useCallback(() => {
    if (!processorRef.current) return;

    processorRef.current.pause();
    setIsPlaying(false);
  }, []);

  const stop = useCallback(() => {
    if (!processorRef.current) return;

    processorRef.current.stop();
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const next = useCallback(async () => {
    const nextIdx = pickNextIndex(true);
    if (nextIdx === null) return;
    await selectTrack(nextIdx);
  }, [pickNextIndex, selectTrack]);

  const previous = useCallback(async () => {
    const { playlist, currentIndex } = stateRef.current;
    if (!processorRef.current || playlist.length === 0 || currentIndex === -1) {
      return;
    }

    // 少しでも再生が進んでいる場合、または先頭トラックなら曲頭に戻す
    if (
      processorRef.current.getCurrentTime() > RESTART_THRESHOLD_SECONDS ||
      currentIndex === 0
    ) {
      processorRef.current.seek(0);
      setCurrentTime(0);
      return;
    }

    await selectTrack(currentIndex - 1);
  }, [selectTrack]);

  const cycleRepeatMode = useCallback(() => {
    setRepeatMode((mode) =>
      mode === 'off' ? 'all' : mode === 'all' ? 'one' : 'off'
    );
  }, []);

  const toggleShuffle = useCallback(() => {
    setIsShuffle((v) => !v);
  }, []);

  const seek = useCallback((time: number) => {
    if (!processorRef.current) return;

    processorRef.current.seek(time);
    setCurrentTime(time);
  }, []);

  const setVolume = useCallback((vol: number) => {
    if (!processorRef.current) return;

    processorRef.current.setVolume(vol);
    setVolumeState(vol);
  }, []);

  const setFrequency = useCallback((hz: number) => {
    if (!processorRef.current) return;

    processorRef.current.setFrequency(440, hz);
    setFrequencyState(hz);
  }, []);

  const setPlaybackSpeed = useCallback((speed: number) => {
    if (!processorRef.current) return;

    processorRef.current.setPlaybackSpeed(speed);
    setPlaybackSpeedState(speed);
  }, []);

  const currentTrack = playlist[currentIndex] ?? null;

  return {
    isPlaying,
    currentTime,
    duration,
    volume,
    frequency,
    playbackSpeed,
    trackTitle: currentTrack?.title ?? null,
    playlist,
    currentIndex,
    repeatMode,
    isShuffle,
    play,
    pause,
    stop,
    seek,
    setVolume,
    setFrequency,
    setPlaybackSpeed,
    addFiles,
    selectTrack,
    removeTrack,
    next,
    previous,
    cycleRepeatMode,
    toggleShuffle,
  };
}
