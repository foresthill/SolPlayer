import { create } from 'zustand';

interface PlayerState {
  isPlaying: boolean;
  currentTrackId: string | null;
  frequency: number;
  playbackSpeed: number;
  volume: number;

  play: () => void;
  pause: () => void;
  setTrack: (trackId: string) => void;
  setFrequency: (freq: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  setVolume: (vol: number) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  isPlaying: false,
  currentTrackId: null,
  frequency: 440,
  playbackSpeed: 1.0,
  volume: 1.0,

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  setTrack: (trackId) => set({ currentTrackId: trackId }),
  setFrequency: (freq) => set({ frequency: freq }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  setVolume: (vol) => set({ volume: vol }),
}));
