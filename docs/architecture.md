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
- Tone.js 15 (Web Audio)

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
