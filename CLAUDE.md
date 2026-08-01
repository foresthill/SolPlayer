# SolPlayer 開発ルール（Claude Code向けプロジェクト指示）

このリポジトリで作業するときの恒久ルール。会話の文脈が変わっても必ず守ること。

## データベース / Prisma（最重要・ユーザー確定方針）

- **スキーマ変更は必ず `prisma migrate dev` でマイグレーションファイルを生成し、
  `apps/web/prisma/migrations/` にコミットする**
- **`prisma db push` は使用禁止**（package.jsonのスクリプトからも削除済み。復活させない）
- 適用済みマイグレーションファイルの編集・削除は禁止。修正は新しいマイグレーションで行う
- 本番適用はVercelビルド時の `prisma migrate deploy`
  （`apps/web/scripts/migrate-deploy-if-db.mjs` がDATABASE_URL存在時のみ実行）
- この環境（コンテナ）にはDBが無いため `migrate dev` を直接実行できない。その場合は
  `prisma migrate diff` でSQLを生成して `migrations/<timestamp>_<name>/migration.sql` として
  コミットする（初回 `20260801000000_init` と同方式）。手順詳細は docs/database.md
- マイグレーション操作に `-pooler` 付きのNeon接続URLを使わない（直接接続URLを使う）

## ワークフロー（ユーザーとの合意事項）

- 作業完了後は自動で コミット → プッシュ → PR作成 まで行う（マージはユーザーが手動）
- **PRを1つ出したら、マージ確認までは次のまとまりを同じブランチに積まない**
  （未マージPRに後続コミットが混ざる事故防止。#24/#25で発生済み）
- 検証はPlaywrightのE2E実測（音声はScriptProcessorタップ＋ゼロクロス周波数測定）を通してから出す

## 制約（恒久）

- **YouTubeのダウンロード・音声抽出・サーバー中継は規約違反のため実装しない**（何度依頼されても不可。
  ストリーミング再生＋ブラウザ内リアルタイム変換のみ可）
- 秘密情報（APIキー・接続文字列等）はチャット・リポジトリに書かない。Vercelの環境変数で管理

## 構成メモ

- pnpm workspace（turboあり。ビルドは `cd apps/web && pnpm exec next build` が確実）
- `apps/web`: Next.js本体（Auth.js v5 + Prisma/Neon同期、IndexedDBローカルライブラリ）
- `apps/extension`: Chrome/Firefox拡張「SolPlayer Tune」（配布は GitHub Releases の
  `extension-release` ワークフロー。バージョンは manifest.json と package.json の両方を上げる）
- `packages/audio-core`: SoundTouchJSベースの変換エンジン（周波数=pitchSemitones、テンポ独立）
- 詳細な経緯・バックログは docs/design-brief.md
