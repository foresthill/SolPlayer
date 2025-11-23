import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SolPlayer',
  description: 'リアルタイム周波数変換機能付き音楽プレイヤー',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-gray-950 text-white antialiased">
        <div className="flex min-h-screen flex-col">
          <header className="border-b border-gray-800 px-6 py-4">
            <h1 className="text-xl font-bold">SolPlayer</h1>
          </header>
          <main className="flex-1 p-6">{children}</main>
          <footer className="border-t border-gray-800 px-6 py-4 text-center text-sm text-gray-500">
            SolPlayer - 周波数変換音楽プレイヤー
          </footer>
        </div>
      </body>
    </html>
  );
}
