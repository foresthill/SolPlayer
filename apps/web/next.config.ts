import type { NextConfig } from 'next';

// BUILD_TARGET=capacitor のときは静的エクスポート（Capacitorが out/ をラップする）。
// 通常ビルド（Vercel等）はサーバー機能を残すため export にしない。
const isCapacitorBuild = process.env.BUILD_TARGET === 'capacitor';

const nextConfig: NextConfig = {
  transpilePackages: ['@solplayer/audio-core', '@solplayer/shared-types'],
  ...(isCapacitorBuild
    ? {
        output: 'export' as const,
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
