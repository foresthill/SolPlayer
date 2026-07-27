import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.foresthill.solplayer',
  appName: 'SolPlayer',
  // ローカルフォールバック（通常は下のserver.urlが使われる）
  webDir: 'out',
  server: {
    // フェーズ2以降はAPI（認証・同期）が必要なため、本番サイトを表示する。
    // ローカル開発時は `pnpm cap:dev` で開発サーバーに向け替え可能
    url: 'https://sol-player-web.vercel.app',
  },
  ios: {
    contentInset: 'always',
  },
};

export default config;
