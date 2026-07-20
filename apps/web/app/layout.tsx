import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SolPlayer',
  description: 'リアルタイム周波数変換機能付き音楽プレイヤー',
};

// viewportFit: 'cover' でノッチ端末のセーフエリア（env(safe-area-inset-*)）を有効化
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf9ff' },
    { media: '(prefers-color-scheme: dark)', color: '#141220' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen antialiased">
        {/* 淡いパステルのオーロラ背景 */}
        <div className="aurora" aria-hidden="true" />

        <div className="flex min-h-screen flex-col">
          <header className="px-6 pt-6 pb-2">
            <h1 className="text-lg font-semibold tracking-[0.2em] text-ink-soft">
              SolPlayer
            </h1>
          </header>
          <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
          {/* モバイルではフッターメニューと重なるため非表示 */}
          <footer className="hidden px-6 py-5 text-center text-xs text-ink-faint lg:block">
            SolPlayer — 周波数変換音楽プレイヤー
          </footer>
        </div>
      </body>
    </html>
  );
}
