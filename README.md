# SolPlayer

リアルタイム周波数変換機能付き音楽プレイヤー

## 🎵 機能

- A=440Hz → 432Hz/444Hz等へのリアルタイム変換
- YouTube/Spotify/Apple Music対応
- プレイリスト管理
- 倍速再生

## 構成

- `apps/web` - Web版（Next.js）
- `apps/ios` - iOS版（Swift）
- `packages/audio-core` - 共通ロジック
- `packages/shared-types` - 共通型定義

## セットアップ

```bash
pnpm install
pnpm dev
```

## アクセス

http://localhost:3000
