export type FrequencyPreset = 'STANDARD' | 'HEALING' | 'CRYSTAL' | 'SCIENTIFIC';

export interface AudioSettings {
  frequency: number;
  playbackSpeed: number;
  volume: number;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  sourceType: SourceType;
  sourceUrl?: string;
  audioFileUrl?: string;
}

export type SourceType = 'LOCAL' | 'YOUTUBE' | 'SPOTIFY' | 'APPLE_MUSIC';

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverImage?: string;
  tracks: Track[];
}
