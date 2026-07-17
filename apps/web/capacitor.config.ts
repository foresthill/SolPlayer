import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.foresthill.solplayer',
  appName: 'SolPlayer',
  // `pnpm build:mobile`（BUILD_TARGET=capacitor next build）の出力先
  webDir: 'out',
  ios: {
    contentInset: 'always',
  },
};

export default config;
