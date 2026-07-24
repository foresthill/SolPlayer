/**
 * 端末内ライブラリ永続化
 *
 * 追加した曲の実体(Blob)とメタデータ、およびプレイリスト構成を
 * IndexedDBに保存し、リロード後も復元できるようにする。
 * 依存ライブラリなしの最小限のPromiseラッパー。
 *
 * v2: 複数プレイリスト対応（playlistsストア新設、tracksにplaylistId付与。
 *     既存データはデフォルトプレイリストへ移行）
 *
 * 将来のフェーズ2(メタデータのアカウント同期)/フェーズ3(実体のクラウド保存)は
 * この上に載せる。
 */

const DB_NAME = 'solplayer-library';
const DB_VERSION = 2;
const TRACKS_STORE = 'tracks';
const PLAYLISTS_STORE = 'playlists';

/** 初期プレイリスト（既存データの移行先） */
export const DEFAULT_PLAYLIST_ID = 'default';
export const DEFAULT_PLAYLIST_NAME = 'マイプレイリスト';

export interface StoredTrack {
  id: string;
  title: string;
  artist?: string;
  /** 所属プレイリスト。省略時はデフォルト（旧データ互換） */
  playlistId?: string;
  /** トラック種別。省略時は'local'（旧データ互換） */
  kind?: 'local' | 'youtube';
  /** 音源の実体（localのみ） */
  blob?: Blob;
  /** 埋め込みアートワークの実体（localのみ） */
  artworkBlob?: Blob;
  /** YouTube動画ID（youtubeのみ） */
  videoId?: string;
  /** プレイリスト内の並び順 */
  order: number;
  addedAt: number;
}

export interface StoredPlaylist {
  id: string;
  name: string;
  /** 一覧での並び順 */
  order: number;
  createdAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      const tx = req.transaction!;

      if (!db.objectStoreNames.contains(TRACKS_STORE)) {
        db.createObjectStore(TRACKS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(PLAYLISTS_STORE)) {
        const playlists = db.createObjectStore(PLAYLISTS_STORE, { keyPath: 'id' });
        playlists.put({
          id: DEFAULT_PLAYLIST_ID,
          name: DEFAULT_PLAYLIST_NAME,
          order: 0,
          createdAt: 0,
        } satisfies StoredPlaylist);
      }

      // v1→v2: 既存トラックをデフォルトプレイリストへ移行
      if (event.oldVersion >= 1 && event.oldVersion < 2) {
        const tracks = tx.objectStore(TRACKS_STORE);
        const cursorReq = tracks.openCursor();
        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result;
          if (!cursor) return;
          const track = cursor.value as StoredTrack;
          if (!track.playlistId) {
            cursor.update({ ...track, playlistId: DEFAULT_PLAYLIST_ID });
          }
          cursor.continue();
        };
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function requestToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDb();
  try {
    return await requestToPromise(
      fn(db.transaction(storeName, mode).objectStore(storeName))
    );
  } finally {
    db.close();
  }
}

/* ============================================================
   プレイリスト
   ============================================================ */

/** 全プレイリストを並び順で取得（1つも無ければデフォルトを作成して返す） */
export async function loadPlaylists(): Promise<StoredPlaylist[]> {
  const playlists = await withStore(
    PLAYLISTS_STORE,
    'readonly',
    (s) => s.getAll() as IDBRequest<StoredPlaylist[]>
  );
  if (playlists.length === 0) {
    const fallback: StoredPlaylist = {
      id: DEFAULT_PLAYLIST_ID,
      name: DEFAULT_PLAYLIST_NAME,
      order: 0,
      createdAt: Date.now(),
    };
    await withStore(PLAYLISTS_STORE, 'readwrite', (s) => s.put(fallback));
    return [fallback];
  }
  return playlists.sort((a, b) => a.order - b.order);
}

export async function savePlaylist(playlist: StoredPlaylist): Promise<void> {
  await withStore(PLAYLISTS_STORE, 'readwrite', (s) => s.put(playlist));
}

/** プレイリストと所属トラックをまとめて削除 */
export async function deletePlaylistAndTracks(playlistId: string): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction([PLAYLISTS_STORE, TRACKS_STORE], 'readwrite');
    tx.objectStore(PLAYLISTS_STORE).delete(playlistId);
    const tracks = tx.objectStore(TRACKS_STORE);
    const cursorReq = tracks.openCursor();
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (!cursor) return;
      const track = cursor.value as StoredTrack;
      if ((track.playlistId ?? DEFAULT_PLAYLIST_ID) === playlistId) {
        cursor.delete();
      }
      cursor.continue();
    };
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/* ============================================================
   トラック
   ============================================================ */

/** 指定プレイリストの保存済みトラックを並び順で取得 */
export async function loadLibrary(playlistId: string): Promise<StoredTrack[]> {
  const tracks = await withStore(
    TRACKS_STORE,
    'readonly',
    (s) => s.getAll() as IDBRequest<StoredTrack[]>
  );
  return tracks
    .filter((t) => (t.playlistId ?? DEFAULT_PLAYLIST_ID) === playlistId)
    .sort((a, b) => a.order - b.order);
}

/** トラックを保存（同IDは上書き） */
export async function saveTrack(track: StoredTrack): Promise<void> {
  await withStore(TRACKS_STORE, 'readwrite', (s) => s.put(track));
}

/** トラックを削除 */
export async function deleteTrack(id: string): Promise<void> {
  await withStore(TRACKS_STORE, 'readwrite', (s) => s.delete(id));
}

/** 並び順をまとめて更新 */
export async function updateOrder(ids: string[]): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(TRACKS_STORE, 'readwrite');
    const store = tx.objectStore(TRACKS_STORE);
    await Promise.all(
      ids.map(async (id, order) => {
        const track = await requestToPromise(
          store.get(id) as IDBRequest<StoredTrack | undefined>
        );
        if (track && track.order !== order) {
          store.put({ ...track, order });
        }
      })
    );
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/**
 * 永続ストレージを要求（ブラウザ都合での自動削除を防ぐ）。
 * 拒否されても動作には影響しないベストエフォート。
 */
export function requestPersistentStorage(): void {
  if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
    void navigator.storage.persist().catch(() => {});
  }
}
