# TODO

## 🚀 今日中
- [x] モノレポ初期化
- [x] Web版基本構築
- [x] 周波数変換ロジック実装
- [x] 基本プレイヤーUI（ローカルファイル読み込み・再生/停止・シーク・周波数/倍速/音量）

## 🔧 既知の課題
- [ ] DB層の再導入 — 未使用だった `lib/db.ts` はビルドを通すため一旦削除。`prisma/schema.prisma` と依存は残置。プレイリスト機能着手時に prisma generate をビルドへ正しく組み込んで復活させる
- [ ] 再生位置の更新を実バッファ位置に同期（現状は経過時間ベースの推定）
- [ ] サンプル音源の同梱 or ストリーミングソース対応

## 📱 iOS版リファクタリング（今後）
- [ ] SwiftUI移行
- [ ] Swift 6対応
- [ ] SwiftData検討
- [ ] CloudKit統合
- [ ] AVAudioEngine最新API
- [ ] Spatial Audio対応

## 🎵 Web版機能追加
- [ ] YouTube統合
- [ ] Spotify統合
- [ ] Apple Music統合
- [ ] プレイリスト管理
- [ ] ビジュアライゼーション
