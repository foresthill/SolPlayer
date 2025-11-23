import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@solplayer/audio-core', '@solplayer/shared-types'],
};

export default nextConfig;
