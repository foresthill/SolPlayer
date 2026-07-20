/**
 * 端末内ライブラリ永続化（フェーズ1）
 *
 * 追加した曲の実体(Blob)とメタデータをIndexedDBに保存し、
 * リロード後もプレイリストを復元できるようにする。
 * 依存ライブラリなしの最小限のPromiseラッパー。
 *
 * 将来のフェーズ2(メタデータのアカウント同期)/フェーズ3(実体のクラウド保存)は
 * この上に載せる。
 */

const DB_NAME = 'solplayer-library';
const DB_VERSION = 1;
const STORE = 'tracks';

export interface StoredTrack {
  id: string;
  title: string;
  artist?: string;
  /** 音源の実体 */
  blob: Blob;
  /** 埋め込みアートワークの実体 */
  artworkBlob?: Blob;
  /** プレイリスト内の並び順 */
  order: number;
  addedAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: 'id' });
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
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDb();
  try {
    return await requestToPromise(fn(db.transaction(STORE, mode).objectStore(STORE)));
  } finally {
    db.close();
  }
}

/** 保存済みの全トラックを並び順で取得 */
export async function loadLibrary(): Promise<StoredTrack[]> {
  const tracks = await withStore('readonly', (s) => s.getAll() as IDBRequest<StoredTrack[]>);
  return tracks.sort((a, b) => a.order - b.order);
}

/** トラックを保存（同IDは上書き） */
export async function saveTrack(track: StoredTrack): Promise<void> {
  await withStore('readwrite', (s) => s.put(track));
}

/** トラックを削除 */
export async function deleteTrack(id: string): Promise<void> {
  await withStore('readwrite', (s) => s.delete(id));
}

/** 並び順をまとめて更新 */
export async function updateOrder(ids: string[]): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
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
