/**
 * Media Session API連携
 *
 * ロック画面・通知領域・イヤホンのボタンから再生操作できるようにし、
 * 曲名/アーティスト/アートワークを表示する。
 * 音声出力を<audio>要素経由にしたこと（audio-core側）とセットで、
 * スマホでの「画面を消しても聴ける」体験の中核になる。
 *
 * 未対応環境（mediaSession無し）ではすべて何もしない。
 */

export interface MediaSessionHandlers {
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (time: number) => void;
}

function session(): MediaSession | null {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
    return null;
  }
  return navigator.mediaSession;
}

export function setupMediaSessionHandlers(handlers: MediaSessionHandlers): void {
  const ms = session();
  if (!ms) return;
  const bind = (
    action: MediaSessionAction,
    handler: MediaSessionActionHandler | null
  ) => {
    try {
      ms.setActionHandler(action, handler);
    } catch {
      // ブラウザが未対応のアクションは無視
    }
  };
  bind('play', () => handlers.onPlay());
  bind('pause', () => handlers.onPause());
  bind('nexttrack', () => handlers.onNext());
  bind('previoustrack', () => handlers.onPrevious());
  bind('seekto', (details) => {
    if (typeof details.seekTime === 'number') handlers.onSeek(details.seekTime);
  });
}

export function updateMediaSessionMetadata(
  meta: { title: string; artist?: string; artworkUrl?: string } | null
): void {
  const ms = session();
  if (!ms || typeof MediaMetadata === 'undefined') return;
  if (!meta) {
    ms.metadata = null;
    return;
  }
  try {
    ms.metadata = new MediaMetadata({
      title: meta.title,
      artist: meta.artist ?? 'SolPlayer',
      artwork: meta.artworkUrl ? [{ src: meta.artworkUrl }] : [],
    });
  } catch {
    // メタデータ設定失敗は再生に影響させない
  }
}

export function updateMediaSessionPlaybackState(playing: boolean): void {
  const ms = session();
  if (!ms) return;
  ms.playbackState = playing ? 'playing' : 'paused';
}

/** ロック画面のシークバー用に再生位置を知らせる */
export function updateMediaSessionPosition(
  duration: number,
  position: number,
  playbackRate: number
): void {
  const ms = session();
  if (!ms || typeof ms.setPositionState !== 'function') return;
  if (!Number.isFinite(duration) || duration <= 0) return;
  try {
    ms.setPositionState({
      duration,
      position: Math.min(Math.max(position, 0), duration),
      playbackRate: playbackRate > 0 ? playbackRate : 1,
    });
  } catch {
    // 位置情報の更新失敗は無視
  }
}
