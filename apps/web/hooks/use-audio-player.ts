'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getAudioProcessor } from '@/lib/audio/audio-context';
import { AudioProcessor } from '@solplayer/audio-core';
import {
  loadLibrary,
  loadPlaylists,
  savePlaylist,
  deletePlaylistAndTracks,
  saveTrack,
  deleteTrack,
  updateOrder,
  requestPersistentStorage,
  DEFAULT_PLAYLIST_ID,
  type StoredTrack,
  type StoredPlaylist,
} from '@/lib/library-store';
import {
  getYouTubeEngine,
  youtubeThumbnailUrl,
  YOUTUBE_HOST_ID,
} from '@/lib/youtube-engine';
import { installIosAudioUnlock } from '@/lib/ios-audio-unlock';

export interface PlaylistTrack {
  id: string;
  title: string;
  /** 所属プレイリスト */
  playlistId?: string;
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
  /**
   * 音源の実体（localのみ・メモリ上の参照）。
   * iOS Safariで不安定な fetch(blob:) を避け、直接デコードするために保持する
   */
  blob?: Blob;
}

export type { StoredPlaylist };

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
  /** 現在のトラック（プレイリスト切替後も再生中の曲を保持する） */
  currentTrack: PlaylistTrack | null;
  /** 直近のトラック読み込みエラー（表示用）。正常時はnull */
  playbackError: string | null;

  // プレイリスト
  playlists: StoredPlaylist[];
  activePlaylistId: string;
  playlist: PlaylistTrack[];
  /** 現在のトラックのアクティブプレイリスト内での位置（無ければ-1） */
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
  switchPlaylist: (id: string) => Promise<void>;
  createPlaylist: (name: string) => Promise<void>;
  removePlaylist: (id: string) => Promise<void>;
}

/** 前のトラックに戻らず曲頭に戻す境界秒数 */
const RESTART_THRESHOLD_SECONDS = 3;

/** アクティブなプレイリストIDの保存先 */
const ACTIVE_PLAYLIST_KEY = 'solplayer:active-playlist';

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2)}`;
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
      playlistId: stored.playlistId ?? DEFAULT_PLAYLIST_ID,
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
    playlistId: stored.playlistId ?? DEFAULT_PLAYLIST_ID,
    kind: 'local',
    url: stored.blob ? URL.createObjectURL(stored.blob) : '',
    blob: stored.blob,
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
  const [playlists, setPlaylists] = useState<StoredPlaylist[]>([]);
  const [activePlaylistId, setActivePlaylistId] = useState(DEFAULT_PLAYLIST_ID);
  const [playlist, setPlaylist] = useState<PlaylistTrack[]>([]);
  const [currentTrack, setCurrentTrack] = useState<PlaylistTrack | null>(null);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [isShuffle, setIsShuffle] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const processorRef = useRef<AudioProcessor | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  // コールバック類は初回登録のみのため、最新の状態はrefで参照する
  const stateRef = useRef({
    playlist,
    currentTrack,
    repeatMode,
    isShuffle,
    activePlaylistId,
    playlists,
  });
  stateRef.current = {
    playlist,
    currentTrack,
    repeatMode,
    isShuffle,
    activePlaylistId,
    playlists,
  };
  const endedHandlerRef = useRef<() => void>(() => {});
  // 連打時に古いloadの完了処理を無視するためのシーケンス番号
  const loadSeqRef = useRef(0);

  /** 現在のトラックのアクティブリスト内での位置（無ければ-1） */
  const findCurrentIndex = useCallback((): number => {
    const { playlist, currentTrack } = stateRef.current;
    if (!currentTrack) return -1;
    return playlist.findIndex((t) => t.id === currentTrack.id);
  }, []);

  /** 現在のトラックに応じたアクティブエンジンの再生位置を返す */
  const getActiveTime = useCallback((): number => {
    if (isYouTubeTrack(stateRef.current.currentTrack)) {
      return getYouTubeEngine().getCurrentTime();
    }
    return processorRef.current?.getCurrentTime() ?? 0;
  }, []);

  /** 指定トラックをロードし、必要なら再生を開始する */
  const loadTrack = useCallback(
    async (track: PlaylistTrack, autoplay: boolean) => {
      const seq = ++loadSeqRef.current;
      setCurrentTrack(track);
      stateRef.current.currentTrack = track;
      setIsPlaying(false);
      setCurrentTime(0);
      setPlaybackError(null);

      if (isYouTubeTrack(track)) {
        // ローカル再生を止めてYouTubeエンジンへ切替
        processorRef.current?.stop();
        const engine = getYouTubeEngine();
        try {
          await engine.ensurePlayer(YOUTUBE_HOST_ID);
        } catch {
          if (seq !== loadSeqRef.current) return;
          setPlaybackError(
            `「${track.title}」を再生できません（YouTubeプレイヤーを読み込めませんでした）`
          );
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

      try {
        await processorRef.current.initialize();
        // blobがあれば直接デコード（iOSで不安定なfetch(blob:)を回避）
        if (track.blob) {
          await processorRef.current.loadBlob(track.blob);
        } else {
          await processorRef.current.load(track.url);
        }
      } catch (e) {
        if (seq !== loadSeqRef.current) return;
        // 読み込み失敗を無言にせずUIへ表示する
        const reason =
          e instanceof Error && e.message.startsWith('DECODE_FAILED')
            ? 'この端末で再生できない形式の可能性があります'
            : '読み込みに失敗しました';
        setPlaybackError(`「${track.title}」を再生できません（${reason}）`);
        setDuration(0);
        return;
      }
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
      await loadTrack(track, true);
    },
    [loadTrack]
  );

  // 初期化: エンジン設定・ライブラリ復元
  useEffect(() => {
    const processor = getAudioProcessor();
    processorRef.current = processor;
    processor.setOnEnded(() => endedHandlerRef.current());

    // iOSのマナースイッチでWeb Audioが無音になる問題への対策
    installIosAudioUnlock();

    // YouTubeエンジン: 曲終了で同じ自動曲送りへ、動画側UI操作の再生状態も同期
    const ytEngine = getYouTubeEngine();
    ytEngine.setOnEnded(() => {
      if (isYouTubeTrack(stateRef.current.currentTrack)) {
        endedHandlerRef.current();
      }
    });
    ytEngine.setOnPlayingChange((playing) => {
      if (isYouTubeTrack(stateRef.current.currentTrack)) {
        setIsPlaying(playing);
      }
    });

    requestPersistentStorage();
    let cancelled = false;
    void (async () => {
      try {
        const storedPlaylists = await loadPlaylists();
        if (cancelled) return;
        setPlaylists(storedPlaylists);

        // 前回アクティブだったプレイリストを復元
        let activeId = DEFAULT_PLAYLIST_ID;
        try {
          const saved = localStorage.getItem(ACTIVE_PLAYLIST_KEY);
          if (saved && storedPlaylists.some((p) => p.id === saved)) {
            activeId = saved;
          } else if (!storedPlaylists.some((p) => p.id === activeId)) {
            activeId = storedPlaylists[0].id;
          }
        } catch {
          // localStorage不可なら先頭
        }
        setActivePlaylistId(activeId);
        stateRef.current.activePlaylistId = activeId;

        const stored = await loadLibrary(activeId);
        if (cancelled || stored.length === 0) return;
        // 復元前にユーザーが曲を追加していたら上書きしない
        if (stateRef.current.playlist.length > 0) return;
        const restored = stored.map(storedToPlaylistTrack);
        stateRef.current.playlist = restored;
        setPlaylist(restored);

        // しおり: 前回のトラックと再生位置を復元（自動再生はしない）
        const resume = loadResumePoint();
        if (!resume) return;
        const track = restored.find((t) => t.id === resume.trackId);
        if (!track || !processorRef.current) return;
        await loadTrack(track, false);
        if (cancelled) return;
        // 位置の復元はローカル曲のみ（YouTubeは頭出しのみ）
        if (resume.time > 0 && !isYouTubeTrack(track)) {
          processorRef.current.seek(resume.time);
          setCurrentTime(processorRef.current.getCurrentTime());
        }
      } catch {
        // IndexedDBが使えない環境ではセッション限りで動作
      }
    })();

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
      const { currentTrack, playlist } = stateRef.current;
      if (currentTrack && !playlist.some((t) => t.id === currentTrack.id)) {
        revokeTrackUrls(currentTrack);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 再生位置を定期的に更新（rAFに加え、rAFが止まる環境向けにintervalでも更新）
  useEffect(() => {
    if (!isPlaying) return;

    const tick = () => {
      setCurrentTime(getActiveTime());
      if (isYouTubeTrack(stateRef.current.currentTrack)) {
        const d = getYouTubeEngine().getDuration();
        if (d > 0) {
          setDuration((prev) => (Math.abs(prev - d) > 0.5 ? d : prev));
        }
      }
    };
    const loop = () => {
      tick();
      animationFrameRef.current = requestAnimationFrame(loop);
    };
    animationFrameRef.current = requestAnimationFrame(loop);
    const interval = setInterval(tick, 500);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      clearInterval(interval);
    };
  }, [isPlaying, getActiveTime]);

  // しおり: 再生中は定期的に位置を保存（一時停止/停止時は各操作で保存）
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      const { currentTrack } = stateRef.current;
      if (currentTrack) {
        saveResumePoint({ trackId: currentTrack.id, time: getActiveTime() });
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [isPlaying, getActiveTime]);

  /**
   * 次に再生すべきトラックのインデックスを返す。
   * 自動遷移（曲終了時）でリピートオフの末尾なら null（停止）。
   * 手動の「次へ」は常に先頭へ折り返す。
   */
  const pickNextIndex = useCallback(
    (manual: boolean): number | null => {
      const { playlist, repeatMode, isShuffle } = stateRef.current;
      if (playlist.length === 0) return null;
      const currentIdx = findCurrentIndex();

      if (isShuffle && playlist.length > 1) {
        let idx = currentIdx;
        while (idx === currentIdx) {
          idx = Math.floor(Math.random() * playlist.length);
        }
        return idx;
      }

      const nextIdx = currentIdx + 1;
      if (nextIdx < playlist.length) return nextIdx;
      if (repeatMode === 'all' || manual) return 0;
      return null;
    },
    [findCurrentIndex]
  );

  // 曲終了時: リピート/シャッフル設定に従って次のトラックへ
  endedHandlerRef.current = () => {
    const { currentTrack, repeatMode } = stateRef.current;
    setIsPlaying(false);

    if (repeatMode === 'one') {
      // 同じトラックを先頭から再生し直す
      if (isYouTubeTrack(currentTrack)) {
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

  /** アクティブプレイリストのトラック一覧を差し替える（再生中の曲のURLは保持） */
  const replacePlaylistTracks = useCallback((tracks: PlaylistTrack[]) => {
    const { playlist, currentTrack } = stateRef.current;
    for (const track of playlist) {
      if (track.id !== currentTrack?.id) {
        revokeTrackUrls(track);
      }
    }
    stateRef.current.playlist = tracks;
    setPlaylist(tracks);
  }, []);

  const switchPlaylist = useCallback(
    async (id: string) => {
      if (id === stateRef.current.activePlaylistId) return;
      setActivePlaylistId(id);
      stateRef.current.activePlaylistId = id;
      try {
        localStorage.setItem(ACTIVE_PLAYLIST_KEY, id);
      } catch {
        // 保存できなくても切替は続行
      }
      try {
        const stored = await loadLibrary(id);
        // 切替中にさらに切り替えられた場合は破棄
        if (stateRef.current.activePlaylistId !== id) return;
        replacePlaylistTracks(stored.map(storedToPlaylistTrack));
      } catch {
        replacePlaylistTracks([]);
      }
    },
    [replacePlaylistTracks]
  );

  const createPlaylist = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const playlist: StoredPlaylist = {
        id: createId(),
        name: trimmed,
        order: stateRef.current.playlists.length,
        createdAt: Date.now(),
      };
      const updated = [...stateRef.current.playlists, playlist];
      setPlaylists(updated);
      stateRef.current.playlists = updated;
      void savePlaylist(playlist).catch(() => {});
      await switchPlaylist(playlist.id);
    },
    [switchPlaylist]
  );

  const removePlaylist = useCallback(
    async (id: string) => {
      const { playlists, currentTrack, activePlaylistId } = stateRef.current;
      // 最後の1つは消させない（空のデフォルトが必ず残る運用）
      if (playlists.length <= 1) return;

      const updated = playlists.filter((p) => p.id !== id);
      setPlaylists(updated);
      stateRef.current.playlists = updated;
      void deletePlaylistAndTracks(id).catch(() => {});

      // 再生中の曲が消したプレイリストの所属なら停止
      if (currentTrack && (currentTrack.playlistId ?? DEFAULT_PLAYLIST_ID) === id) {
        loadSeqRef.current++;
        processorRef.current?.stop();
        getYouTubeEngine().pause();
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
        setCurrentTrack(null);
        stateRef.current.currentTrack = null;
        saveResumePoint(null);
      }

      if (activePlaylistId === id) {
        await switchPlaylist(updated[0].id);
      }
    },
    [switchPlaylist]
  );

  const addFiles = useCallback(
    async (files: File[]) => {
      // MIMEタイプが不明/汎用（application/octet-stream等）でも拡張子で受け入れる
      const AUDIO_EXT =
        /\.(mp3|m4a|m4b|aac|wav|aif|aiff|caf|flac|ogg|oga|opus|webm|mp4)$/i;
      const audioFiles = files.filter(
        (f) =>
          f.type.startsWith('audio/') || f.type === '' || AUDIO_EXT.test(f.name)
      );
      if (audioFiles.length === 0) return;

      const playlistId = stateRef.current.activePlaylistId;
      const baseOrder = stateRef.current.playlist.length;
      const newTracks: PlaylistTrack[] = [];
      const storedTracks: StoredTrack[] = [];
      for (const [i, file] of audioFiles.entries()) {
        const meta = await readTrackMetadata(file);
        const id = createId();
        newTracks.push({
          id,
          title: meta.title,
          artist: meta.artist,
          playlistId,
          url: URL.createObjectURL(file),
          blob: file,
          artworkUrl: meta.artworkBlob
            ? URL.createObjectURL(meta.artworkBlob)
            : undefined,
        });
        storedTracks.push({
          id,
          title: meta.title,
          artist: meta.artist,
          playlistId,
          blob: file,
          artworkBlob: meta.artworkBlob,
          order: baseOrder + i,
          addedAt: Date.now(),
        });
      }

      const wasIdle =
        stateRef.current.playlist.length === 0 && !stateRef.current.currentTrack;
      const updated = [...stateRef.current.playlist, ...newTracks];
      // 直後のloadTrackが新しいリストを参照できるよう、refも即時更新する
      stateRef.current.playlist = updated;
      setPlaylist(updated);

      // 端末内ライブラリへ保存（容量不足等で失敗してもセッション再生は継続）
      for (const stored of storedTracks) {
        void saveTrack(stored).catch(() => {});
      }

      // 何も再生していなければ最初に追加した曲をすぐ再生
      if (wasIdle) {
        await loadTrack(newTracks[0], true);
      }
    },
    [loadTrack]
  );

  const addYouTubeTrack = useCallback(
    async (videoId: string) => {
      const meta = await fetchYouTubeMetadata(videoId);
      const id = createId();
      const playlistId = stateRef.current.activePlaylistId;
      const track: PlaylistTrack = {
        id,
        kind: 'youtube',
        title: meta.title,
        artist: meta.artist,
        playlistId,
        url: '',
        videoId,
        artworkUrl: youtubeThumbnailUrl(videoId),
      };

      const wasIdle =
        stateRef.current.playlist.length === 0 && !stateRef.current.currentTrack;
      const updated = [...stateRef.current.playlist, track];
      stateRef.current.playlist = updated;
      setPlaylist(updated);

      void saveTrack({
        id,
        kind: 'youtube',
        title: meta.title,
        artist: meta.artist,
        playlistId,
        videoId,
        order: updated.length - 1,
        addedAt: Date.now(),
      }).catch(() => {});

      // 何も再生していなければすぐ再生
      if (wasIdle) {
        await loadTrack(track, true);
      }
    },
    [loadTrack]
  );

  const removeTrack = useCallback((id: string) => {
    const { playlist, currentTrack } = stateRef.current;
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

    if (currentTrack?.id === id) {
      // 再生中のトラックを削除したら停止して未選択に戻す
      loadSeqRef.current++;
      processorRef.current?.stop();
      getYouTubeEngine().pause();
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setCurrentTrack(null);
      stateRef.current.currentTrack = null;
      saveResumePoint(null);
    }
  }, []);

  const reorderPlaylist = useCallback((from: number, to: number) => {
    const { playlist } = stateRef.current;
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
  }, []);

  const play = useCallback(async () => {
    const { playlist, currentTrack } = stateRef.current;
    if (!currentTrack) {
      // 未選択なら先頭から再生
      if (playlist.length > 0) {
        await loadTrack(playlist[0], true);
      }
      return;
    }

    if (isYouTubeTrack(currentTrack)) {
      getYouTubeEngine().play();
      setIsPlaying(true);
      return;
    }

    if (!processorRef.current) return;
    await processorRef.current.play();
    setIsPlaying(true);
  }, [loadTrack]);

  const pause = useCallback(() => {
    const { currentTrack } = stateRef.current;

    if (isYouTubeTrack(currentTrack)) {
      getYouTubeEngine().pause();
    } else {
      processorRef.current?.pause();
    }
    setIsPlaying(false);

    if (currentTrack) {
      saveResumePoint({ trackId: currentTrack.id, time: getActiveTime() });
    }
  }, [getActiveTime]);

  const stop = useCallback(() => {
    const { currentTrack } = stateRef.current;

    if (isYouTubeTrack(currentTrack)) {
      getYouTubeEngine().stop();
    } else {
      processorRef.current?.stop();
    }
    setIsPlaying(false);
    setCurrentTime(0);

    saveResumePoint(currentTrack ? { trackId: currentTrack.id, time: 0 } : null);
  }, []);

  const next = useCallback(async () => {
    const nextIdx = pickNextIndex(true);
    if (nextIdx === null) return;
    await selectTrack(nextIdx);
  }, [pickNextIndex, selectTrack]);

  const previous = useCallback(async () => {
    const { playlist, currentTrack } = stateRef.current;
    if (playlist.length === 0 || !currentTrack) {
      return;
    }
    const currentIdx = findCurrentIndex();

    // 少しでも再生が進んでいる場合、または先頭/リスト外なら曲頭に戻す
    if (getActiveTime() > RESTART_THRESHOLD_SECONDS || currentIdx <= 0) {
      if (isYouTubeTrack(currentTrack)) {
        getYouTubeEngine().seek(0);
      } else {
        processorRef.current?.seek(0);
      }
      setCurrentTime(0);
      return;
    }

    await selectTrack(currentIdx - 1);
  }, [selectTrack, getActiveTime, findCurrentIndex]);

  const cycleRepeatMode = useCallback(() => {
    setRepeatMode((mode) =>
      mode === 'off' ? 'all' : mode === 'all' ? 'one' : 'off'
    );
  }, []);

  const toggleShuffle = useCallback(() => {
    setIsShuffle((v) => !v);
  }, []);

  const seek = useCallback((time: number) => {
    if (isYouTubeTrack(stateRef.current.currentTrack)) {
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

  return {
    isPlaying,
    currentTime,
    duration,
    volume,
    frequency,
    playbackSpeed,
    trackTitle: currentTrack?.title ?? null,
    currentTrack,
    playbackError,
    playlists,
    activePlaylistId,
    playlist,
    currentIndex: currentTrack
      ? playlist.findIndex((t) => t.id === currentTrack.id)
      : -1,
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
    switchPlaylist,
    createPlaylist,
    removePlaylist,
  };
}
