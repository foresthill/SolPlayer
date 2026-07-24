'use client';

import { useRef, useState } from 'react';
import type { PlaylistTrack } from '@/hooks/use-audio-player';
import { GripIcon, MusicNoteIcon, PlusIcon, TrashIcon, VideoIcon } from './icons';

interface PlaylistPanelProps {
  playlist: PlaylistTrack[];
  currentIndex: number;
  isPlaying: boolean;
  onSelectTrack: (index: number) => void;
  onRemoveTrack: (id: string) => void;
  onAddFiles: (files: File[]) => void;
  onReorder: (from: number, to: number) => void;
}

interface DragState {
  from: number;
  over: number;
}

export function PlaylistPanel({
  playlist,
  currentIndex,
  isPlaying,
  onSelectTrack,
  onRemoveTrack,
  onAddFiles,
  onReorder,
}: PlaylistPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  // 並べ替えドラッグ中の状態（fromを掴んでoverの位置へ）。
  // pointerdown直後のmoveがstate反映前に届いても取りこぼさないよう、refでも同期保持する
  const [dragState, setDragState] = useState<DragState | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const setDrag = (state: DragState | null) => {
    dragStateRef.current = state;
    setDragState(state);
  };

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

  /** ポインタY座標から挿入先インデックスを求める（マウス/タッチ共通） */
  const indexFromPointer = (clientY: number): number => {
    const items = listRef.current?.querySelectorAll('li');
    if (!items || items.length === 0) return 0;
    for (let i = 0; i < items.length; i++) {
      const rect = items[i].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) return i;
    }
    return items.length - 1;
  };

  const handleGripPointerDown = (
    e: React.PointerEvent<HTMLButtonElement>,
    index: number
  ) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ from: index, over: index });
  };

  const handleGripPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const current = dragStateRef.current;
    if (!current) return;
    setDrag({ ...current, over: indexFromPointer(e.clientY) });
  };

  const handleGripPointerUp = () => {
    const current = dragStateRef.current;
    if (!current) return;
    if (current.from !== current.over) {
      onReorder(current.from, current.over);
    }
    setDrag(null);
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
        <ul ref={listRef} className="max-h-72 space-y-1 overflow-y-auto pr-1">
          {playlist.map((track, index) => {
            const isCurrent = index === currentIndex;
            const isDragging = dragState?.from === index;
            const isDropTarget =
              dragState !== null &&
              dragState.over === index &&
              dragState.over !== dragState.from;
            return (
              <li key={track.id} className="group">
                <div
                  className={`flex w-full items-center gap-2.5 rounded-2xl border px-2.5 py-2 transition-colors ${
                    isCurrent
                      ? 'border-[var(--glass-border)] bg-[var(--glass-bg-strong)]'
                      : 'border-transparent hover:bg-[var(--glass-bg)]'
                  } ${isDragging ? 'opacity-40' : ''} ${
                    isDropTarget ? 'ring-2 ring-[var(--track-fill)]' : ''
                  }`}
                >
                  {/* 並べ替えハンドル（タッチでも動くよう touch-action: none） */}
                  <button
                    type="button"
                    className="glass-btn h-8 w-6 shrink-0 cursor-grab touch-none active:cursor-grabbing"
                    onPointerDown={(e) => handleGripPointerDown(e, index)}
                    onPointerMove={handleGripPointerMove}
                    onPointerUp={handleGripPointerUp}
                    onPointerCancel={() => setDrag(null)}
                    aria-label={`${track.title} を並べ替え`}
                    title="ドラッグで並べ替え"
                  >
                    <GripIcon className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left"
                    onClick={() => onSelectTrack(index)}
                  >
                    {/* サムネイル（アートワーク or 音符） */}
                    <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)]">
                      {track.artworkUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={track.artworkUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <MusicNoteIcon className="h-4 w-4 text-ink-faint" />
                      )}
                      {isCurrent && isPlaying && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <span className="eq-bars text-white">
                            <span />
                            <span />
                            <span />
                          </span>
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`flex items-center gap-1.5 text-sm ${
                          isCurrent ? 'font-semibold' : 'text-ink-soft'
                        }`}
                      >
                        {track.kind === 'youtube' && (
                          <VideoIcon className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
                        )}
                        <span className="truncate">{track.title}</span>
                      </span>
                      {track.artist && (
                        <span className="block truncate text-xs text-ink-faint">
                          {track.artist}
                        </span>
                      )}
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
