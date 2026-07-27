'use client';

import { SessionProvider, useSession } from 'next-auth/react';

/**
 * 未ログイン時のみ表示する同期の案内。
 * ログインは機能のゲートではなく「端末間同期」の強化として提示する。
 */
function SyncHintInner() {
  const { status } = useSession();
  if (status !== 'unauthenticated') return null;
  return (
    <p className="mt-3 text-[0.7rem] leading-relaxed text-ink-faint">
      右上の「Googleでログイン」をすると、プレイリストとマイプリセットが端末間で同期されます（ログインしなくても全機能使えます）。
    </p>
  );
}

export function SyncHint() {
  return (
    <SessionProvider>
      <SyncHintInner />
    </SessionProvider>
  );
}
