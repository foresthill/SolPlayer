# iOS版 SolPlayer

既存のSwift実装です。

## Web版で参照するファイル

- **周波数変換**: `SolPlayer/Sources/Audio/FrequencyConverter.swift`
  - Web版: `packages/audio-core/src/frequency-converter.ts`

## 注意

- iOS版: CoreData使用（変更なし）
- Web版: Postgres使用（独立）
- 共有: 計算ロジックのみ
