'use client';

import { useState } from 'react';
import { useAudioPlayer, isYouTubeTrack } from '@/hooks/use-audio-player';
import { YOUTUBE_HOST_ID } from '@/lib/youtube-engine';
import { MobileNav, type MobileTab } from './mobile-nav';
import { FrequencySelector } from './frequency-selector';
import { PlaybackControls } from './playback-controls';
import { ProgressBar } from './progress-bar';
import { VolumeControl } from './volume-control';
import { SpeedControl } from './speed-control';
import { TrackInfo } from './track-info';
import { PlaylistPanel } from './playlist-panel';
import { YouTubePanel } from './youtube-panel';
import { StopIcon } from './icons';

export function AudioPlayer() {
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    frequency,
    playbackSpeed,
    trackTitle,
    currentTrack,
    playbackError,
    playlists,
    activePlaylistId,
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
    switchPlaylist,
    createPlaylist,
    removePlaylist,
  } = useAudioPlayer();

  // モバイルのフッターメニューで表示カードを切り替える（lg以上は全カード表示）
  const [activeTab, setActiveTab] = useState<MobileTab>('player');

  const currentIsYouTube = isYouTubeTrack(currentTrack);
  const hasTrack = trackTitle !== null;
  const canPlay = hasTrack || playlist.length > 0;

  return (
    // minmax(0,_)で長い曲名がトラック幅を押し広げないようにする（truncateを効かせる）
    <div className="mx-auto grid w-full max-w-md grid-cols-[minmax(0,1fr)] gap-6 pb-32 lg:max-w-5xl lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start lg:pb-0">
      {/* メインプレイヤー */}
      <section
        className={`glass-panel space-y-7 p-7 sm:p-9 ${
          activeTab === 'player' ? '' : 'hidden'
        } lg:block`}
      >
        {/* YouTubeトラック再生用のプレイヤーホスト（IFrame APIがこのdivをiframeに置換する） */}
        <div
          className={
            currentIsYouTube
              ? 'overflow-hidden rounded-2xl border border-[var(--glass-border)] shadow-[var(--glass-shadow)]'
              : 'hidden'
          }
        >
          <div id={YOUTUBE_HOST_ID} className="aspect-video w-full" />
        </div>

        <TrackInfo
          title={trackTitle ?? 'トラック未選択'}
          artist={
            hasTrack
              ? (currentTrack?.artist ?? 'ローカルファイル')
              : 'プレイリストに曲を追加してください'
          }
          isPlaying={isPlaying}
          artworkUrl={currentTrack?.artworkUrl ?? null}
          hideArtwork={currentIsYouTube}
        />

        {currentIsYouTube && (
          <p className="text-center text-[0.7rem] leading-relaxed text-ink-faint">
            YouTube再生中は周波数変換・倍速は適用されません（PCではライブ変換が使えます）
          </p>
        )}

        {playbackError && (
          <p className="text-center text-xs leading-relaxed text-red-500/90">
            {playbackError}
          </p>
        )}

        <ProgressBar
          currentTime={currentTime}
          duration={duration}
          onSeek={seek}
        />

        <PlaybackControls
          isPlaying={isPlaying}
          disabled={!canPlay}
          repeatMode={repeatMode}
          isShuffle={isShuffle}
          onPlay={play}
          onPause={pause}
          onNext={next}
          onPrevious={previous}
          onCycleRepeat={cycleRepeatMode}
          onToggleShuffle={toggleShuffle}
        />

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="glass-btn h-8 w-8 shrink-0"
              onClick={stop}
              disabled={!hasTrack}
              aria-label="停止"
              title="停止"
            >
              <StopIcon className="h-3.5 w-3.5" />
            </button>
            <div className="min-w-0 flex-1">
              <VolumeControl volume={volume} onChange={setVolume} />
            </div>
          </div>
          <SpeedControl speed={playbackSpeed} onChange={setPlaybackSpeed} />
        </div>
      </section>

      {/* 周波数 & プレイリスト */}
      <div className="space-y-6">
        <section
          className={`glass-panel p-6 sm:p-7 ${
            activeTab === 'tuning' ? '' : 'hidden'
          } lg:block`}
        >
          <FrequencySelector frequency={frequency} onChange={setFrequency} />
        </section>

        <section
          className={`glass-panel p-6 sm:p-7 ${
            activeTab === 'playlist' ? '' : 'hidden'
          } lg:block`}
        >
          <PlaylistPanel
            playlists={playlists}
            activePlaylistId={activePlaylistId}
            playlist={playlist}
            currentIndex={currentIndex}
            isPlaying={isPlaying}
            onSelectTrack={(index) => void selectTrack(index)}
            onRemoveTrack={removeTrack}
            onAddFiles={(files) => void addFiles(files)}
            onReorder={reorderPlaylist}
            onSwitchPlaylist={(id) => void switchPlaylist(id)}
            onCreatePlaylist={(name) => void createPlaylist(name)}
            onRemovePlaylist={(id) => void removePlaylist(id)}
          />
        </section>

        <section
          className={`glass-panel p-6 sm:p-7 ${
            activeTab === 'youtube' ? '' : 'hidden'
          } lg:block`}
        >
          <YouTubePanel
            frequency={frequency}
            onAddToPlaylist={(videoId) => void addYouTubeTrack(videoId)}
          />
        </section>
      </div>

      {/* モバイル用フッターメニュー＋ミニプレイヤー */}
      <MobileNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        trackTitle={trackTitle}
        artworkUrl={currentTrack?.artworkUrl ?? null}
        isPlaying={isPlaying}
        onPlay={() => void play()}
        onPause={pause}
        onNext={() => void next()}
      />
    </div>
  );
}
