'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getAudioProcessor } from '@/lib/audio/audio-context';
import { AudioProcessor } from '@solplayer/audio-core';

export interface UseAudioPlayerReturn {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  frequency: number;
  playbackSpeed: number;
  trackTitle: string | null;

  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  setFrequency: (hz: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  loadTrack: (url: string, title?: string) => Promise<void>;
  loadFile: (file: File) => Promise<void>;
}

export function useAudioPlayer(): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [frequency, setFrequencyState] = useState(440);
  const [playbackSpeed, setPlaybackSpeedState] = useState(1.0);
  const [trackTitle, setTrackTitle] = useState<string | null>(null);

  const processorRef = useRef<AudioProcessor | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  // ObjectURLを破棄するために直近のURLを保持
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const processor = getAudioProcessor();
    processorRef.current = processor;
    // トラックが最後まで再生されたらUIを停止状態に戻す
    processor.setOnEnded(() => {
      setIsPlaying(false);
      setCurrentTime(0);
    });

    return () => {
      processor.setOnEnded(null);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
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

  const loadTrack = useCallback(async (url: string, title?: string) => {
    if (!processorRef.current) return;

    await processorRef.current.initialize();
    await processorRef.current.load(url);
    setDuration(processorRef.current.getDuration());
    setCurrentTime(0);
    setIsPlaying(false);
    if (title !== undefined) {
      setTrackTitle(title);
    }
  }, []);

  const loadFile = useCallback(async (file: File) => {
    // 直前のObjectURLを破棄してリーク防止
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    await loadTrack(url, file.name);
  }, [loadTrack]);

  const play = useCallback(async () => {
    if (!processorRef.current) return;

    await processorRef.current.play();
    setIsPlaying(true);
  }, []);

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

  return {
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
    loadTrack,
    loadFile
  };
}
