'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getAudioProcessor } from '@/lib/audio/audio-context';
import { AudioProcessor } from '@solplayer/audio-core';
import {
  loadLibrary,
  saveTrack,
  deleteTrack,
  updateOrder,
  requestPersistentStorage,
  type StoredTrack,
} from '@/lib/library-store';
import {
  getYouTubeEngine,
  youtubeThumbnailUrl,
  YOUTUBE_HOST_ID,
} from '@/lib/youtube-engine';

export interface PlaylistTrack {
  id: string;
  title: string;
  /** トラック種別。省略時は'local' */
  kind?: 'local' | 'youtube';
  /** ObjectURL（ローカルファイル）。youtubeでは未使用 */
  url: string;
  /** メタデータ（ID3等）から取得したアーティスト名/チャンネル名 */
  artist?: string;
  /** アートワーク（localはObjectURL、youtubeはサムネイルURL） */
  artworkUrl?: string;
  /** YouTube動画ID（youtubeのみ） */
  videoId?: string;
}

/** YouTubeトラックか（音声データに触れないため周波数変換は適用されない） */
export function isYouTubeTrack(track: PlaylistTrack | null | undefined): boolean {
  return track?.kind === 'youtube';
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
  addYouTubeTrack: (videoId: string) => Promise<void>;
  selectTrack: (index: number) => Promise<void>;
  removeTrack: (id: string) => void;
  reorderPlaylist: (from: number, to: number) => void;
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

/**
 * 音声ファイルのメタデータ（曲名/アーティスト/アートワーク）を読み取る。
 * タグが無い・解析に失敗した場合はファイル名にフォールバックする。
 */
async function readTrackMetadata(
  file: File
): Promise<{ title: string; artist?: string; artworkBlob?: Blob }> {
  const fallback = { title: fileToTitle(file) };
  try {
    // music-metadataはサイズが大きいため必要時に動的ロードする
    const { parseBlob, selectCover } = await import('music-metadata');
    const { common } = await parseBlob(file, { duration: false });

    let artworkBlob: Blob | undefined;
    const cover = selectCover(common.picture);
    if (cover) {
      artworkBlob = new Blob([cover.data as BlobPart], { type: cover.format });
    }

    return {
      title: common.title?.trim() || fallback.title,
      artist: common.artist?.trim() || undefined,
      artworkBlob,
    };
  } catch {
    return fallback;
  }
}

/** しおり（レジューム再生）: 最後に再生していたトラックと位置 */
const RESUME_KEY = 'solplayer:resume';

interface ResumePoint {
  trackId: string;
  time: number;
}

function saveResumePoint(point: ResumePoint | null): void {
  try {
    if (point) {
      localStorage.setItem(RESUME_KEY, JSON.stringify(point));
    } else {
      localStorage.removeItem(RESUME_KEY);
    }
  } catch {
    // 保存できない環境では諦める
  }
}

function loadResumePoint(): ResumePoint | null {
  try {
    const raw = localStorage.getItem(RESUME_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as ResumePoint).trackId === 'string' &&
      typeof (parsed as ResumePoint).time === 'number'
    ) {
      return parsed as ResumePoint;
    }
  } catch {
    // 壊れたデータは無視
  }
  return null;
}

/** 保存済みトラックから再生用のPlaylistTrackを作る */
function storedToPlaylistTrack(stored: StoredTrack): PlaylistTrack {
  if (stored.kind === 'youtube') {
    return {
      id: stored.id,
      title: stored.title,
      artist: stored.artist,
      kind: 'youtube',
      url: '',
      videoId: stored.videoId,
      artworkUrl: stored.videoId
        ? youtubeThumbnailUrl(stored.videoId)
        : undefined,
    };
  }
  return {
    id: stored.id,
    title: stored.title,
    artist: stored.artist,
    kind: 'local',
    url: stored.blob ? URL.createObjectURL(stored.blob) : '',
    artworkUrl: stored.artworkBlob
      ? URL.createObjectURL(stored.artworkBlob)
      : undefined,
  };
}

/** トラックが保持するObjectURLをまとめて破棄する（http URLは対象外） */
function revokeTrackUrls(track: PlaylistTrack): void {
  if (track.url.startsWith('blob:')) {
    URL.revokeObjectURL(track.url);
  }
  if (track.artworkUrl?.startsWith('blob:')) {
    URL.revokeObjectURL(track.artworkUrl);
  }
}

/**
 * YouTube動画のタイトル/チャンネル名をoEmbedから取得する。
 * CORS等で取得できない場合はIDベースの表示にフォールバック。
 */
async function fetchYouTubeMetadata(
  videoId: string
): Promise<{ title: string; artist: string }> {
  const fallback = { title: `YouTube動画 (${videoId})`, artist: 'YouTube' };
  try {
    const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(
      `https://www.youtube.com/watch?v=${videoId}`
    )}`;
    const res = await fetch(url);
    if (!res.ok) return fallback;
    const data = (await res.json()) as { title?: string; author_name?: string };
    return {
      title: data.title?.trim() || fallback.title,
      artist: data.author_name?.trim() || fallback.artist,
    };
  } catch {
    return fallback;
  }
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

  /** 現在のトラックに応じたアクティブエンジンの再生位置を返す */
  const getActiveTime = useCallback((): number => {
    const { playlist, currentIndex } = stateRef.current;
    if (isYouTubeTrack(playlist[currentIndex])) {
      return getYouTubeEngine().getCurrentTime();
    }
    return processorRef.current?.getCurrentTime() ?? 0;
  }, []);

  useEffect(() => {
    const processor = getAudioProcessor();
    processorRef.current = processor;
    processor.setOnEnded(() => endedHandlerRef.current());

    // YouTubeエンジン: 曲終了で同じ自動曲送りへ、動画側UI操作の再生状態も同期
    const ytEngine = getYouTubeEngine();
    ytEngine.setOnEnded(() => {
      if (isYouTubeTrack(stateRef.current.playlist[stateRef.current.currentIndex])) {
        endedHandlerRef.current();
      }
    });
    ytEngine.setOnPlayingChange((playing) => {
      if (isYouTubeTrack(stateRef.current.playlist[stateRef.current.currentIndex])) {
        setIsPlaying(playing);
      }
    });

    // 保存済みライブラリを復元（フェーズ1: 端末内永続化）
    requestPersistentStorage();
    let cancelled = false;
    void loadLibrary()
      .then(async (stored) => {
        if (cancelled || stored.length === 0) return;
        // 復元前にユーザーが曲を追加していたら上書きしない
        if (stateRef.current.playlist.length > 0) return;
        const restored = stored.map(storedToPlaylistTrack);
        stateRef.current.playlist = restored;
        setPlaylist(restored);

        // しおり: 前回のトラックと再生位置を復元（自動再生はしない）
        const resume = loadResumePoint();
        if (!resume) return;
        const index = restored.findIndex((t) => t.id === resume.trackId);
        if (index === -1 || !processorRef.current) return;
        await loadTrackAt(restored[index], index, false);
        if (cancelled) return;
        // 位置の復元はローカル曲のみ（YouTubeは頭出しのみ）
        if (resume.time > 0 && !isYouTubeTrack(restored[index])) {
          processorRef.current.seek(resume.time);
          setCurrentTime(processorRef.current.getCurrentTime());
        }
      })
      .catch(() => {
        // IndexedDBが使えない環境ではセッション限りで動作
      });

    return () => {
      cancelled = true;
      processor.setOnEnded(null);
      ytEngine.setOnEnded(null);
      ytEngine.setOnPlayingChange(null);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // ObjectURLをすべて破棄してリーク防止
      for (const track of stateRef.current.playlist) {
        revokeTrackUrls(track);
      }
    };
  }, []);

  // 再生位置を定期的に更新（アクティブエンジンから取得。YouTubeはdurationも遅れて確定する）
  useEffect(() => {
    if (isPlaying) {
      const updateTime = () => {
        setCurrentTime(getActiveTime());
        const { playlist, currentIndex } = stateRef.current;
        if (isYouTubeTrack(playlist[currentIndex])) {
          const d = getYouTubeEngine().getDuration();
          if (d > 0) {
            setDuration((prev) => (Math.abs(prev - d) > 0.5 ? d : prev));
          }
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

  // しおり: 再生中は定期的に位置を保存（一時停止/停止時は各操作で保存）
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      const { playlist, currentIndex } = stateRef.current;
      const track = playlist[currentIndex];
      if (track) {
        saveResumePoint({ trackId: track.id, time: getActiveTime() });
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [isPlaying, getActiveTime]);

  /** 指定トラックをロードし、必要なら再生を開始する */
  const loadTrackAt = useCallback(
    async (track: PlaylistTrack, index: number, autoplay: boolean) => {
      const seq = ++loadSeqRef.current;
      setCurrentIndex(index);
      setIsPlaying(false);
      setCurrentTime(0);

      if (isYouTubeTrack(track)) {
        // ローカル再生を止めてYouTubeエンジンへ切替
        processorRef.current?.stop();
        const engine = getYouTubeEngine();
        try {
          await engine.ensurePlayer(YOUTUBE_HOST_ID);
        } catch {
          // IFrame APIがロードできない環境（オフライン等）では何もしない
          return;
        }
        if (seq !== loadSeqRef.current || !track.videoId) return;
        setDuration(0); // durationは再生開始後のポーリングで確定
        engine.loadVideo(track.videoId, autoplay);
        if (autoplay) {
          setIsPlaying(true);
        }
        return;
      }

      if (!processorRef.current) return;
      // YouTube再生中なら止めてローカルエンジンへ切替
      getYouTubeEngine().pause();

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
    const { playlist, currentIndex, repeatMode } = stateRef.current;
    setIsPlaying(false);

    if (repeatMode === 'one') {
      // 同じトラックを先頭から再生し直す
      if (isYouTubeTrack(playlist[currentIndex])) {
        const engine = getYouTubeEngine();
        engine.seek(0);
        engine.play();
        setCurrentTime(0);
        setIsPlaying(true);
        return;
      }
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

      const baseOrder = stateRef.current.playlist.length;
      const newTracks: PlaylistTrack[] = [];
      const storedTracks: StoredTrack[] = [];
      for (const [i, file] of audioFiles.entries()) {
        const meta = await readTrackMetadata(file);
        const id = createTrackId();
        newTracks.push({
          id,
          title: meta.title,
          artist: meta.artist,
          url: URL.createObjectURL(file),
          artworkUrl: meta.artworkBlob
            ? URL.createObjectURL(meta.artworkBlob)
            : undefined,
        });
        storedTracks.push({
          id,
          title: meta.title,
          artist: meta.artist,
          blob: file,
          artworkBlob: meta.artworkBlob,
          order: baseOrder + i,
          addedAt: Date.now(),
        });
      }

      const hadNoTrack = stateRef.current.playlist.length === 0;
      const updated = [...stateRef.current.playlist, ...newTracks];
      // 直後のloadTrackAtが新しいリストを参照できるよう、refも即時更新する
      stateRef.current.playlist = updated;
      setPlaylist(updated);

      // 端末内ライブラリへ保存（容量不足等で失敗してもセッション再生は継続）
      for (const stored of storedTracks) {
        void saveTrack(stored).catch(() => {});
      }

      // 何も再生していなければ最初に追加した曲をすぐ再生
      if (hadNoTrack) {
        await loadTrackAt(newTracks[0], updated.length - newTracks.length, true);
      }
    },
    [loadTrackAt]
  );

  const addYouTubeTrack = useCallback(
    async (videoId: string) => {
      const meta = await fetchYouTubeMetadata(videoId);
      const id = createTrackId();
      const track: PlaylistTrack = {
        id,
        kind: 'youtube',
        title: meta.title,
        artist: meta.artist,
        url: '',
        videoId,
        artworkUrl: youtubeThumbnailUrl(videoId),
      };

      const hadNoTrack = stateRef.current.playlist.length === 0;
      const updated = [...stateRef.current.playlist, track];
      stateRef.current.playlist = updated;
      setPlaylist(updated);

      void saveTrack({
        id,
        kind: 'youtube',
        title: meta.title,
        artist: meta.artist,
        videoId,
        order: updated.length - 1,
        addedAt: Date.now(),
      }).catch(() => {});

      // 何も再生していなければすぐ再生
      if (hadNoTrack) {
        await loadTrackAt(track, 0, true);
      }
    },
    [loadTrackAt]
  );

  const removeTrack = useCallback((id: string) => {
    const { playlist, currentIndex } = stateRef.current;
    const index = playlist.findIndex((t) => t.id === id);
    if (index === -1) return;

    revokeTrackUrls(playlist[index]);
    const updated = playlist.filter((t) => t.id !== id);
    stateRef.current.playlist = updated;
    setPlaylist(updated);

    // 端末内ライブラリからも削除し、並び順を詰める
    void deleteTrack(id)
      .then(() => updateOrder(updated.map((t) => t.id)))
      .catch(() => {});

    if (index === currentIndex) {
      // 再生中のトラックを削除したら停止して未選択に戻す
      loadSeqRef.current++;
      processorRef.current?.stop();
      getYouTubeEngine().pause();
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setCurrentIndex(-1);
      saveResumePoint(null);
    } else if (index < currentIndex) {
      setCurrentIndex(currentIndex - 1);
    }
  }, []);

  const reorderPlaylist = useCallback((from: number, to: number) => {
    const { playlist, currentIndex } = stateRef.current;
    if (
      from === to ||
      from < 0 ||
      to < 0 ||
      from >= playlist.length ||
      to >= playlist.length
    ) {
      return;
    }

    const updated = [...playlist];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    stateRef.current.playlist = updated;
    setPlaylist(updated);

    // 並び順を端末内ライブラリにも反映
    void updateOrder(updated.map((t) => t.id)).catch(() => {});

    // 再生中トラックの位置を追従させる
    if (currentIndex === from) {
      setCurrentIndex(to);
    } else if (from < currentIndex && to >= currentIndex) {
      setCurrentIndex(currentIndex - 1);
    } else if (from > currentIndex && to <= currentIndex) {
      setCurrentIndex(currentIndex + 1);
    }
  }, []);

  const play = useCallback(async () => {
    const { playlist, currentIndex } = stateRef.current;
    if (currentIndex === -1) {
      // 未選択なら先頭から再生
      if (playlist.length > 0) {
        await loadTrackAt(playlist[0], 0, true);
      }
      return;
    }

    if (isYouTubeTrack(playlist[currentIndex])) {
      getYouTubeEngine().play();
      setIsPlaying(true);
      return;
    }

    if (!processorRef.current) return;
    await processorRef.current.play();
    setIsPlaying(true);
  }, [loadTrackAt]);

  const pause = useCallback(() => {
    const { playlist, currentIndex } = stateRef.current;
    const track = playlist[currentIndex];

    if (isYouTubeTrack(track)) {
      getYouTubeEngine().pause();
    } else {
      processorRef.current?.pause();
    }
    setIsPlaying(false);

    if (track) {
      saveResumePoint({ trackId: track.id, time: getActiveTime() });
    }
  }, [getActiveTime]);

  const stop = useCallback(() => {
    const { playlist, currentIndex } = stateRef.current;
    const track = playlist[currentIndex];

    if (isYouTubeTrack(track)) {
      getYouTubeEngine().stop();
    } else {
      processorRef.current?.stop();
    }
    setIsPlaying(false);
    setCurrentTime(0);

    saveResumePoint(track ? { trackId: track.id, time: 0 } : null);
  }, []);

  const next = useCallback(async () => {
    const nextIdx = pickNextIndex(true);
    if (nextIdx === null) return;
    await selectTrack(nextIdx);
  }, [pickNextIndex, selectTrack]);

  const previous = useCallback(async () => {
    const { playlist, currentIndex } = stateRef.current;
    if (playlist.length === 0 || currentIndex === -1) {
      return;
    }

    // 少しでも再生が進んでいる場合、または先頭トラックなら曲頭に戻す
    if (getActiveTime() > RESTART_THRESHOLD_SECONDS || currentIndex === 0) {
      if (isYouTubeTrack(playlist[currentIndex])) {
        getYouTubeEngine().seek(0);
      } else {
        processorRef.current?.seek(0);
      }
      setCurrentTime(0);
      return;
    }

    await selectTrack(currentIndex - 1);
  }, [selectTrack, getActiveTime]);

  const cycleRepeatMode = useCallback(() => {
    setRepeatMode((mode) =>
      mode === 'off' ? 'all' : mode === 'all' ? 'one' : 'off'
    );
  }, []);

  const toggleShuffle = useCallback(() => {
    setIsShuffle((v) => !v);
  }, []);

  const seek = useCallback((time: number) => {
    const { playlist, currentIndex } = stateRef.current;
    if (isYouTubeTrack(playlist[currentIndex])) {
      getYouTubeEngine().seek(time);
    } else {
      if (!processorRef.current) return;
      processorRef.current.seek(time);
    }
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
    addYouTubeTrack,
    selectTrack,
    removeTrack,
    reorderPlaylist,
    next,
    previous,
    cycleRepeatMode,
    toggleShuffle,
  };
}
