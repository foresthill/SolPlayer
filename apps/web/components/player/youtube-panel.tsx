'use client';

import { useEffect, useState } from 'react';
import { LiveConvertPanel } from './live-convert-panel';
import { TrashIcon, VideoIcon } from './icons';

/**
 * YouTube埋め込み再生（Web再生タブ）
 *
 * IFrame埋め込みによる規約準拠のストリーミング再生。
 * 音声データには触れられないため、周波数変換・倍速は適用されない。
 * ダウンロード機能はYouTube利用規約違反のため実装しない。
 */

const RECENTS_KEY = 'solplayer:youtube-recents';
const MAX_RECENTS = 5;

/** YouTubeのURL/IDから動画IDを取り出す（対応: watch?v= / youtu.be / shorts / embed / 生ID） */
export function parseYouTubeId(input: string): string | null {
  const value = input.trim();
  if (/^[\w-]{11}$/.test(value)) return value;
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\.|^m\./, '');
    if (host === 'youtu.be') {
      const id = url.pathname.slice(1).split('/')[0];
      return /^[\w-]{11}$/.test(id) ? id : null;
    }
    if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'music.youtube.com') {
      const v = url.searchParams.get('v');
      if (v && /^[\w-]{11}$/.test(v)) return v;
      const match = url.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})/);
      if (match) return match[1];
    }
  } catch {
    // URLでなければ生IDチェックのみ
  }
  return null;
}

interface YouTubePanelProps {
  /** チューニングタブで選択中の基調周波数（ライブ変換に連動） */
  frequency: number;
  /** 現在の動画をプレイリストに追加する */
  onAddToPlaylist: (videoId: string) => void;
}

export function YouTubePanel({ frequency, onAddToPlaylist }: YouTubePanelProps) {
  const [input, setInput] = useState('');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENTS_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setRecents(parsed.filter((v): v is string => typeof v === 'string'));
        }
      }
    } catch {
      // 壊れたデータは無視
    }
  }, []);

  const play = (id: string) => {
    setVideoId(id);
    setError(false);
    const updated = [id, ...recents.filter((r) => r !== id)].slice(0, MAX_RECENTS);
    setRecents(updated);
    try {
      localStorage.setItem(RECENTS_KEY, JSON.stringify(updated));
    } catch {
      // 保存できない環境でも再生は継続
    }
  };

  const handleSubmit = () => {
    const id = parseYouTubeId(input);
    if (!id) {
      setError(true);
      return;
    }
    play(id);
  };

  const removeRecent = (id: string) => {
    const updated = recents.filter((r) => r !== id);
    setRecents(updated);
    try {
      localStorage.setItem(RECENTS_KEY, JSON.stringify(updated));
    } catch {
      // 保存失敗は無視
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold tracking-wider text-ink-soft">
          Web再生 (YouTube)
        </h3>
        <p className="text-[0.65rem] text-ink-faint">埋め込み再生は変換なし</p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          inputMode="url"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setError(false);
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="YouTubeのURLを貼り付け"
          className={`glass-input min-w-0 flex-1 text-sm ${
            error ? 'border-red-400/70' : ''
          }`}
          aria-label="YouTube URL"
          aria-invalid={error}
        />
        <button
          type="button"
          className="glass-chip shrink-0 px-4 py-2 text-sm font-medium"
          onClick={handleSubmit}
        >
          再生
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-500/80">
          YouTubeのURLまたは動画IDを入力してください
        </p>
      )}

      {videoId ? (
        <div className="space-y-2">
          <div className="overflow-hidden rounded-2xl border border-[var(--glass-border)] shadow-[var(--glass-shadow)]">
            <iframe
              key={videoId}
              src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1`}
              title="YouTube プレイヤー"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              className="aspect-video w-full"
            />
          </div>
          <button
            type="button"
            className="glass-chip flex w-full items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium"
            onClick={() => onAddToPlaylist(videoId)}
          >
            この動画をプレイリストに追加
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-10 text-center">
          <VideoIcon className="h-8 w-8 text-ink-faint" />
          <span className="text-sm text-ink-soft">
            URLを貼り付けてストリーミング再生
          </span>
        </div>
      )}

      {recents.length > 0 && (
        <div className="space-y-2">
          <p className="text-[0.7rem] font-medium tracking-wider text-ink-faint">
            最近再生した動画
          </p>
          <ul className="space-y-1">
            {recents.map((id) => (
              <li key={id} className="group flex items-center gap-2">
                <button
                  type="button"
                  className={`glass-chip flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-xs`}
                  data-active={id === videoId}
                  onClick={() => play(id)}
                >
                  <VideoIcon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate tabular-nums">youtu.be/{id}</span>
                </button>
                <button
                  type="button"
                  className="glass-btn h-7 w-7 shrink-0 transition-opacity focus-visible:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
                  onClick={() => removeRecent(id)}
                  aria-label={`${id} を履歴から削除`}
                  title="履歴から削除"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 埋め込みには直接変換を適用できないため、タブ音声キャプチャによるライブ変換を提供 */}
      <LiveConvertPanel frequency={frequency} videoId={videoId} />
    </div>
  );
}
