'use client';

import { useRef, useState } from 'react';
import type { PlaylistTrack } from '@/hooks/use-audio-player';
import { MusicNoteIcon, PlusIcon, TrashIcon } from './icons';

interface PlaylistPanelProps {
  playlist: PlaylistTrack[];
  currentIndex: number;
  isPlaying: boolean;
  onSelectTrack: (index: number) => void;
  onRemoveTrack: (id: string) => void;
  onAddFiles: (files: File[]) => void;
}

export function PlaylistPanel({
  playlist,
  currentIndex,
  isPlaying,
  onSelectTrack,
  onRemoveTrack,
  onAddFiles,
}: PlaylistPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) onAddFiles(files);
    // 同じファイルを再選択できるよう値をリセット
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) onAddFiles(files);
  };

  return (
    <div
      className={`space-y-3 rounded-[1.25rem] transition-shadow ${
        isDragOver ? 'shadow-[0_0_0_2px_var(--track-fill)]' : ''
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wider text-ink-soft">
          プレイリスト
          {playlist.length > 0 && (
            <span className="ml-2 text-xs font-normal text-ink-faint">
              {playlist.length}曲
            </span>
          )}
        </h3>
        <button
          type="button"
          className="glass-chip flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium"
          onClick={() => fileInputRef.current?.click()}
        >
          <PlusIcon className="h-3.5 w-3.5" />
          曲を追加
        </button>
      </div>

      {playlist.length === 0 ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-[1.25rem] border border-dashed border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-10 text-center transition-colors hover:bg-[var(--glass-bg-strong)]"
        >
          <MusicNoteIcon className="h-8 w-8 text-ink-faint" />
          <span className="text-sm text-ink-soft">
            音声ファイルを追加（ドラッグ＆ドロップ可）
          </span>
        </button>
      ) : (
        <ul className="max-h-72 space-y-1 overflow-y-auto pr-1">
          {playlist.map((track, index) => {
            const isCurrent = index === currentIndex;
            return (
              <li key={track.id} className="group">
                <div
                  className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 transition-colors ${
                    isCurrent
                      ? 'border-[var(--glass-border)] bg-[var(--glass-bg-strong)]'
                      : 'border-transparent hover:bg-[var(--glass-bg)]'
                  }`}
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
                    onClick={() => onSelectTrack(index)}
                  >
                    <span className="w-5 shrink-0 text-center text-xs tabular-nums text-ink-faint">
                      {isCurrent && isPlaying ? (
                        <span className="eq-bars text-ink-soft">
                          <span />
                          <span />
                          <span />
                        </span>
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span
                      className={`truncate text-sm ${
                        isCurrent ? 'font-semibold' : 'text-ink-soft'
                      }`}
                    >
                      {track.title}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="glass-btn h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    onClick={() => onRemoveTrack(track.id)}
                    aria-label={`${track.title} を削除`}
                    title="削除"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
