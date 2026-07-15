# アーキテクチャ

## モノレポ構成

```
solplayer/
├── apps/
│   ├── web/          # Next.js 15 + React 19
│   └── ios/          # Swift (既存)
└── packages/
    ├── audio-core/   # 周波数変換ロジック
    └── shared-types/ # 共通型定義
```

## 技術スタック

### Web版
- Next.js 15.5 (App Router)
- React 19
- TypeScript 5.7
- Tailwind CSS v4
- Zustand (状態管理)
- Prisma 6 + PostgreSQL
- SoundTouchJS (Web Audio / タイムストレッチ)

### 音声処理方針

テンポとピッチを独立して制御する（iOSの `AVAudioUnitTimePitch` と同様）:

- 周波数変換(432Hz等) → `pitchSemitones`（テンポ維持）
- 倍速再生            → `tempo`（ピッチ維持）

グラニュラー方式(旧Tone.PitchShift)で発生していた小シフト時のうねり／音痴を解消し、
再生位置は SoundTouch の `play` イベント(`timePlayed`)で正確に追従する。

### iOS版
- Swift
- CoreData
- AVAudioEngine

## 周波数変換

セミトーン計算: `semitones = 12 * log2(target / base)`

プリセット:
- A=440Hz (標準)
- A=432Hz (ヒーリング)
- A=444Hz (クリスタル)
- A=437Hz (科学的)
