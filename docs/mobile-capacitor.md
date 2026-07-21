# スマホアプリ化（Capacitor）

Web版（`apps/web`）を Capacitor でラップして iOS / Android アプリとして配布するための手順。
音声コア（SoundTouchJS / Web Audio API）はWebViewでそのまま動作する。

## 構成

- `apps/web/capacitor.config.ts` — Capacitor設定（appId: `com.foresthill.solplayer`, webDir: `out`）
- `apps/web/next.config.ts` — `BUILD_TARGET=capacitor` のときだけ静的エクスポート（`output: 'export'`）。
  通常ビルド（Vercel）には影響しない。
- npm scripts（`apps/web/package.json`）:
  - `pnpm build:mobile` — Capacitor用の静的ビルド（`out/` を生成）
  - `pnpm cap:sync` — 静的ビルド → ネイティブプロジェクトへ同期
  - `pnpm cap:ios` / `pnpm cap:android` — Xcode / Android Studio で開く

## セットアップ

**iOSプロジェクトは生成済み**（`apps/web/ios/`、コミット済み）。
Capacitor 8 は Swift Package Manager を使うため **CocoaPods は不要**。

macOS + Xcode のあるマシンでは以下だけで動く:

```bash
pnpm install          # リポジトリルートで
cd apps/web
pnpm cap:sync         # Webをビルドして ios/ に同期
pnpm cap:ios          # Xcodeで開く → 実機/シミュレータで Run
```

初回のみ Xcode 側で Signing（Team の選択）が必要。

Android はまだ未生成。必要になったら:

```bash
cd apps/web
pnpm exec cap add android   # 生成される android/ はコミットして良い
```

## 日常の開発フロー

1. Webアプリを普通に開発（`pnpm dev`）
2. スマホで確認したくなったら `pnpm cap:sync` → Xcode/Android Studioから実機/シミュレータで起動

## 注意点

- 静的エクスポートのため、将来サーバー機能（API Routes・DB接続）を追加した場合は
  モバイル側はAPIをリモート（Vercel）に向ける構成にする（`CapacitorHttp` か fetch のベースURL切替）
- ローカル音声ファイルの選択は WebView の `<input type="file">` で動作する。
  ネイティブのメディアライブラリ（iOSのミュージックアプリ等）から読みたい場合は
  Capacitorプラグイン（`@capacitor/filesystem` 等）の追加が必要
- セーフエリアはWeb側で対応済み（`viewportFit: 'cover'` + `env(safe-area-inset-bottom)`）
