'use client';

import {
  MusicNoteIcon,
  ListIcon,
  TuneIcon,
  PlayIcon,
  PauseIcon,
  NextIcon,
} from './icons';

export type MobileTab = 'player' | 'playlist' | 'tuning';

interface MobileNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  /** ミニプレイヤー表示用 */
  trackTitle: string | null;
  artworkUrl?: string | null;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
}

const TABS: { key: MobileTab; label: string; Icon: typeof MusicNoteIcon }[] = [
  { key: 'player', label: 'プレイヤー', Icon: MusicNoteIcon },
  { key: 'playlist', label: 'プレイリスト', Icon: ListIcon },
  { key: 'tuning', label: 'チューニング', Icon: TuneIcon },
];

/**
 * モバイル用フッターメニュー（ボトムタブバー）＋ミニプレイヤー。
 * lg以上では非表示（2カラムレイアウトが全カードを表示するため）。
 */
export function MobileNav({
  activeTab,
  onTabChange,
  trackTitle,
  artworkUrl = null,
  isPlaying,
  onPlay,
  onPause,
  onNext,
}: MobileNavProps) {
  const showMiniPlayer = trackTitle !== null && activeTab !== 'player';

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] lg:hidden">
      <div className="mx-auto max-w-md space-y-2">
        {/* ミニプレイヤー（プレイヤータブ以外で再生トラックがあるとき） */}
        {showMiniPlayer && (
          <div className="glass-panel flex items-center gap-2 rounded-2xl py-2 pr-2 pl-4">
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
              onClick={() => onTabChange('player')}
              aria-label="プレイヤーを開く"
            >
              {artworkUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={artworkUrl}
                  alt=""
                  className="h-7 w-7 shrink-0 rounded-md border border-[var(--glass-border)] object-cover"
                />
              ) : (
                <MusicNoteIcon className="h-4 w-4 shrink-0 text-ink-faint" />
              )}
              <span className="truncate text-sm font-medium">{trackTitle}</span>
            </button>
            <button
              type="button"
              className="play-btn h-10 w-10 shrink-0"
              onClick={isPlaying ? onPause : onPlay}
              aria-label={isPlaying ? '一時停止' : '再生'}
            >
              {isPlaying ? (
                <PauseIcon className="h-4 w-4" />
              ) : (
                <PlayIcon className="ml-0.5 h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              className="glass-btn h-10 w-10 shrink-0"
              onClick={onNext}
              aria-label="次のトラック"
            >
              <NextIcon className="h-4.5 w-4.5" />
            </button>
          </div>
        )}

        {/* フッターメニュー */}
        <nav className="glass-panel flex rounded-3xl p-1.5" aria-label="メインメニュー">
          {TABS.map(({ key, label, Icon }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                className={`flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 transition-colors ${
                  isActive
                    ? 'bg-[var(--track-fill)] text-[#414059] shadow-[0_8px_20px_-10px_rgba(120,100,160,0.6)] dark:text-[#1d1b2c]'
                    : 'text-ink-soft'
                }`}
                onClick={() => onTabChange(key)}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[0.6rem] font-medium tracking-wide">{label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
