'use client';

import { useEffect, useRef, useState } from 'react';
import {
  SessionProvider,
  useSession,
  signIn,
  signOut,
} from 'next-auth/react';
import {
  fetchRemoteLibrary,
  mergeRemoteIntoLocal,
  pushLocalToRemote,
} from '@/lib/sync-client';
import { LIBRARY_CHANGED_EVENT } from '@/lib/library-store';

type SyncState = 'idle' | 'syncing' | 'synced' | 'error';

/**
 * アカウント同期エンジン。
 * ログイン時: サーバー内容をローカルへマージ → 統合結果をPUT。
 * 以降: ライブラリ変更をデバウンスしてPUT。
 */
function useAccountSync(enabled: boolean): SyncState {
  const [state, setState] = useState<SyncState>('idle');
  const startedRef = useRef(false);

  useEffect(() => {
    if (!enabled || startedRef.current) return;
    startedRef.current = true;

    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const push = async () => {
      if (disposed) return;
      setState('syncing');
      try {
        setState((await pushLocalToRemote()) ? 'synced' : 'error');
      } catch {
        setState('error');
      }
    };
    const onChanged = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void push(), 2500);
    };

    void (async () => {
      setState('syncing');
      try {
        const remote = await fetchRemoteLibrary();
        if (disposed) return;
        if (remote) {
          await mergeRemoteIntoLocal(remote);
        }
        await push();
      } catch {
        if (!disposed) setState('error');
      }
      // 初期同期の完了後から変更を監視（マージ中のイベントで多重PUTしない）
      if (!disposed) {
        window.addEventListener(LIBRARY_CHANGED_EVENT, onChanged);
      }
    })();

    return () => {
      disposed = true;
      clearTimeout(timer);
      window.removeEventListener(LIBRARY_CHANGED_EVENT, onChanged);
    };
  }, [enabled]);

  return state;
}

const SYNC_LABEL: Record<SyncState, string | null> = {
  idle: null,
  syncing: '同期中…',
  synced: '同期済み',
  error: '同期エラー',
};

function AuthWidgetInner() {
  const { data: session, status } = useSession();
  const syncState = useAccountSync(status === 'authenticated');

  if (status === 'loading') {
    return null;
  }

  if (status !== 'authenticated') {
    return (
      <button
        type="button"
        className="glass-chip px-3 py-1.5 text-xs font-medium"
        onClick={() => void signIn('google')}
      >
        Googleでログイン
      </button>
    );
  }

  const label = SYNC_LABEL[syncState];
  return (
    <div className="flex items-center gap-2.5">
      {label && (
        <span
          className={`text-[0.65rem] ${
            syncState === 'error' ? 'text-amber-600 dark:text-amber-400' : 'text-ink-faint'
          }`}
        >
          {label}
        </span>
      )}
      {session.user?.image ? (
        // 外部URL（Googleのアバター）のためimgを使用
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={session.user.image}
          alt={session.user?.name ?? 'アカウント'}
          className="h-6 w-6 rounded-full border border-[var(--glass-border)]"
        />
      ) : (
        <span className="max-w-24 truncate text-xs text-ink-soft">
          {session.user?.name ?? session.user?.email}
        </span>
      )}
      <button
        type="button"
        className="glass-chip px-2.5 py-1 text-[0.65rem]"
        onClick={() => void signOut()}
      >
        ログアウト
      </button>
    </div>
  );
}

export function AuthWidget() {
  return (
    <SessionProvider>
      <AuthWidgetInner />
    </SessionProvider>
  );
}
