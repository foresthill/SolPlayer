import type { NextConfig } from 'next';

// フェーズ2でAPIルート（認証・同期）が入ったため静的エクスポートは廃止。
// Capacitor（スマホアプリ）は capacitor.config.ts の server.url で
// 本番サイトを表示する方式に変更した。
const nextConfig: NextConfig = {
  transpilePackages: ['@solplayer/audio-core', '@solplayer/shared-types'],
};

export default nextConfig;
