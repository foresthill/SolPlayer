'use client';

import { MusicNoteIcon } from './icons';

interface TrackInfoProps {
  title: string;
  artist: string;
  isPlaying?: boolean;
  /** 埋め込みアートワークのURL（無ければプレースホルダ表示） */
  artworkUrl?: string | null;
}

export function TrackInfo({
  title,
  artist,
  isPlaying = false,
  artworkUrl = null,
}: TrackInfoProps) {
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      {/* アートワーク */}
      <div
        className={`relative flex h-36 w-36 items-center justify-center overflow-hidden rounded-[2rem] border border-[var(--glass-border)] bg-gradient-to-br from-white/50 via-white/20 to-white/5 shadow-[var(--glass-shadow)] backdrop-blur-xl transition-shadow duration-700 sm:h-40 sm:w-40 ${
          isPlaying ? 'shadow-[0_0_60px_-10px_rgba(255,255,255,0.55)]' : ''
        }`}
      >
        {artworkUrl ? (
          // ObjectURLのためnext/imageではなくimgを使用
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={artworkUrl}
            alt={`${title} のアートワーク`}
            className="h-full w-full object-cover"
          />
        ) : (
          <MusicNoteIcon className="h-12 w-12 text-ink-faint" />
        )}
        {isPlaying && (
          <span
            className={`eq-bars absolute right-4 bottom-4 ${
              artworkUrl
                ? 'rounded-md bg-black/35 p-1.5 text-white'
                : 'text-ink-soft'
            }`}
          >
            <span />
            <span />
            <span />
          </span>
        )}
      </div>

      <div className="w-full min-w-0">
        <h2 className="truncate text-lg font-semibold tracking-wide">{title}</h2>
        <p className="mt-1 truncate text-sm text-ink-soft">{artist}</p>
      </div>
    </div>
  );
}
