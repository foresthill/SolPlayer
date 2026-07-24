/**
 * YouTube再生エンジン（IFrame Player APIラッパー）
 *
 * プレイリスト内のYouTubeトラックを、ローカル曲と同じ操作系
 * （再生/一時停止/シーク/曲終了イベント）で扱うための薄いラッパー。
 * プレイヤー本体は audio-player.tsx が描画するホスト要素にマウントされる。
 *
 * 注意: 埋め込み再生のため音声データには触れられず、周波数変換・倍速は
 * 適用されない（それらはローカル再生とライブ変換の担当）。
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const API_SRC = 'https://www.youtube.com/iframe_api';
const API_TIMEOUT_MS = 10000;

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

/** IFrame APIスクリプトをロード（多重ロード防止・タイムアウト付き） */
function loadIframeApi(): Promise<any> {
  if (window.YT?.Player) return Promise.resolve(window.YT);

  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('YT_API_TIMEOUT')),
      API_TIMEOUT_MS
    );
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      clearTimeout(timer);
      resolve(window.YT);
    };
    if (!document.querySelector(`script[src="${API_SRC}"]`)) {
      const script = document.createElement('script');
      script.src = API_SRC;
      script.onerror = () => {
        clearTimeout(timer);
        reject(new Error('YT_API_LOAD_FAILED'));
      };
      document.head.appendChild(script);
    }
  });
}

export class YouTubeEngine {
  private player: any = null;
  private creating: Promise<void> | null = null;
  private onEndedCallback: (() => void) | null = null;
  private onPlayingChangeCallback: ((playing: boolean) => void) | null = null;

  /** ホスト要素にプレイヤーを（未作成なら）作成する */
  async ensurePlayer(hostElementId: string): Promise<void> {
    if (this.player) return;
    if (this.creating) return this.creating;

    this.creating = (async () => {
      const YTApi = await loadIframeApi();
      await new Promise<void>((resolve) => {
        this.player = new YTApi.Player(hostElementId, {
          width: '100%',
          height: '100%',
          playerVars: { playsinline: 1, rel: 0 },
          events: {
            onReady: () => resolve(),
            onStateChange: (e: { data: number }) => {
              if (e.data === YTApi.PlayerState.ENDED) {
                this.onEndedCallback?.();
              } else if (e.data === YTApi.PlayerState.PLAYING) {
                this.onPlayingChangeCallback?.(true);
              } else if (e.data === YTApi.PlayerState.PAUSED) {
                this.onPlayingChangeCallback?.(false);
              }
            },
          },
        });
      });
    })();

    try {
      await this.creating;
    } finally {
      this.creating = null;
    }
  }

  /** 動画をロード。autoplay=falseなら頭出しのみ（cue） */
  loadVideo(videoId: string, autoplay: boolean): void {
    if (!this.player) return;
    if (autoplay) {
      this.player.loadVideoById(videoId);
    } else {
      this.player.cueVideoById(videoId);
    }
  }

  play(): void {
    this.player?.playVideo?.();
  }

  pause(): void {
    this.player?.pauseVideo?.();
  }

  stop(): void {
    if (!this.player) return;
    this.player.pauseVideo?.();
    this.player.seekTo?.(0, true);
  }

  seek(time: number): void {
    this.player?.seekTo?.(time, true);
  }

  getCurrentTime(): number {
    return this.player?.getCurrentTime?.() ?? 0;
  }

  getDuration(): number {
    return this.player?.getDuration?.() ?? 0;
  }

  /** 動画終了時のコールバック（プレイリストの自動曲送りに使用） */
  setOnEnded(callback: (() => void) | null): void {
    this.onEndedCallback = callback;
  }

  /** 動画側UI操作も含む再生/一時停止状態の変化通知 */
  setOnPlayingChange(callback: ((playing: boolean) => void) | null): void {
    this.onPlayingChangeCallback = callback;
  }
}

let engine: YouTubeEngine | null = null;

export function getYouTubeEngine(): YouTubeEngine {
  if (!engine) {
    engine = new YouTubeEngine();
  }
  return engine;
}

/** audio-player.tsxが描画するプレイヤーホスト要素のid */
export const YOUTUBE_HOST_ID = 'solplayer-yt-host';

/** 動画IDからサムネイルURLを得る */
export function youtubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}
