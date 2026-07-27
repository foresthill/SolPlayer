/**
 * アカウント同期クライアント（フェーズ2: メタデータのみ）
 *
 * - ログイン時: サーバーの内容をIndexedDBへユニオンマージ → 統合結果をPUT
 * - 以降: ライブラリ変更イベントをデバウンスしてPUT（全置換）
 * - 曲の実体(Blob)は同期しない。他端末で追加されたローカル曲は
 *   実体なしのメタデータとして現れる（フェーズ3で解消予定）
 */

import {
  loadPlaylists,
  loadAllTracks,
  savePlaylist,
  saveTrack,
  DEFAULT_PLAYLIST_ID,
  LIBRARY_REFRESHED_EVENT,
  TRACK_META_VERSION,
  type StoredPlaylist,
  type StoredTrack,
} from './library-store';

const PRESETS_KEY = 'solplayer:custom-presets';
/** マイプリセット更新イベント（frequency-selectorが購読） */
export const PRESETS_UPDATED_EVENT = 'solplayer:presets-updated';

export interface RemoteTrack {
  id: string;
  title: string;
  artist?: string | null;
  kind?: 'local' | 'youtube';
  videoId?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  order: number;
  playlistId: string;
}

export interface RemoteLibrary {
  playlists: { id: string; name: string; order: number }[];
  tracks: RemoteTrack[];
  presetHz: number[];
}

/** サーバーの状態を取得（未ログインならnull） */
export async function fetchRemoteLibrary(): Promise<RemoteLibrary | null> {
  const res = await fetch('/api/sync', { cache: 'no-store' });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`sync fetch failed: ${res.status}`);
  return (await res.json()) as RemoteLibrary;
}

function loadLocalPresets(): number[] {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((p) => (p as { hz?: unknown }).hz)
      .filter((hz): hz is number => typeof hz === 'number');
  } catch {
    return [];
  }
}

function saveLocalPresets(hzList: number[]): void {
  try {
    const existing = new Map<number, { id: string; hz: number }>();
    const raw = localStorage.getItem(PRESETS_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const p of parsed as { id?: string; hz?: number }[]) {
          if (typeof p.hz === 'number' && typeof p.id === 'string') {
            existing.set(p.hz, { id: p.id, hz: p.hz });
          }
        }
      }
    }
    const merged = hzList.map(
      (hz) => existing.get(hz) ?? { id: `preset-${hz}`, hz }
    );
    localStorage.setItem(PRESETS_KEY, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent(PRESETS_UPDATED_EVENT));
  } catch {
    // 保存不可の環境では諦める
  }
}

/** ローカルの全メタデータからPUT用ペイロードを作る */
export async function buildLocalPayload(): Promise<{
  playlists: { id: string; name: string; order: number }[];
  tracks: RemoteTrack[];
  presetHz: number[];
}> {
  const [playlists, tracks] = await Promise.all([
    loadPlaylists(),
    loadAllTracks(),
  ]);
  return {
    playlists: playlists.map((p) => ({ id: p.id, name: p.name, order: p.order })),
    tracks: tracks.map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist ?? null,
      kind: t.kind ?? 'local',
      videoId: t.videoId ?? null,
      fileName: t.fileName ?? null,
      fileSize: t.fileSize ?? null,
      order: t.order,
      playlistId: t.playlistId ?? DEFAULT_PLAYLIST_ID,
    })),
    presetHz: loadLocalPresets(),
  };
}

/** サーバーへ全置換PUT */
export async function pushLocalToRemote(): Promise<boolean> {
  const payload = await buildLocalPayload();
  const res = await fetch('/api/sync', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.ok;
}

/**
 * サーバーの内容をIndexedDBへユニオンマージする。
 * - ローカルに無いプレイリスト/トラックを追加（トラックは実体なしのメタデータのみ）
 * - 既存トラックはメタデータのみ更新し、blob/アートワークは保持
 * - ローカルにしか無いものは消さない（後続のPUTでサーバーへ統合される）
 */
export async function mergeRemoteIntoLocal(remote: RemoteLibrary): Promise<void> {
  const [localPlaylists, localTracks] = await Promise.all([
    loadPlaylists(),
    loadAllTracks(),
  ]);
  const localPlaylistIds = new Set(localPlaylists.map((p) => p.id));
  const localTrackById = new Map(localTracks.map((t) => [t.id, t]));

  for (const p of remote.playlists) {
    if (!localPlaylistIds.has(p.id)) {
      const playlist: StoredPlaylist = {
        id: p.id,
        name: p.name,
        order: p.order,
        createdAt: Date.now(),
      };
      await savePlaylist(playlist);
    }
  }

  for (const t of remote.tracks) {
    const local = localTrackById.get(t.id);
    if (local) {
      // メタデータのみ更新（実体・アートワークは端末のものを保持）
      await saveTrack({
        ...local,
        title: t.title,
        artist: t.artist ?? local.artist,
        order: t.order,
        playlistId: t.playlistId,
      });
    } else {
      await saveTrack({
        id: t.id,
        title: t.title,
        artist: t.artist ?? undefined,
        kind: t.kind === 'youtube' ? 'youtube' : 'local',
        videoId: t.videoId ?? undefined,
        fileName: t.fileName ?? undefined,
        fileSize: t.fileSize ?? undefined,
        playlistId: t.playlistId,
        order: t.order,
        addedAt: Date.now(),
        metaVersion: TRACK_META_VERSION,
        // blobなし = この端末に実体が無い状態
      });
    }
  }

  // マイプリセットはユニオン
  const mergedPresets = [...new Set([...loadLocalPresets(), ...remote.presetHz])];
  saveLocalPresets(mergedPresets);

  window.dispatchEvent(new CustomEvent(LIBRARY_REFRESHED_EVENT));
}
