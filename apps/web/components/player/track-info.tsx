'use client';

import { MusicNoteIcon } from './icons';

interface TrackInfoProps {
  title: string;
  artist: string;
  isPlaying?: boolean;
}

export function TrackInfo({ title, artist, isPlaying = false }: TrackInfoProps) {
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      {/* アートワークプレースホルダ */}
      <div
        className={`relative flex h-36 w-36 items-center justify-center rounded-[2rem] border border-[var(--glass-border)] bg-gradient-to-br from-white/50 via-white/20 to-white/5 shadow-[var(--glass-shadow)] backdrop-blur-xl transition-shadow duration-700 sm:h-40 sm:w-40 ${
          isPlaying ? 'shadow-[0_0_60px_-10px_rgba(255,255,255,0.55)]' : ''
        }`}
      >
        <MusicNoteIcon className="h-12 w-12 text-ink-faint" />
        {isPlaying && (
          <span className="eq-bars absolute right-4 bottom-4 text-ink-soft">
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
