# リリース手順ランブック（SolPlayer Tune 全ストア）

新バージョンを3ストアに展開する際の手順。上から順にやれば抜けがない。

## 0. リポジトリ側（共通の土台）

1. `apps/extension/src/content.ts` を変更
2. **バージョンを両方上げる**: `apps/extension/package.json` と `public/manifest.json`
3. E2E 3スイートを全PASSさせる（デスクトップ / 状態同期 / iOSレートモード。
   ScriptProcessorタップ＋ゼロクロス実測）
4. PR → マージ → Actionsの `extension-release` ワークフローを version入力で実行
   （GitHub Releasesに配布zipができる。`pnpm package` でローカル生成も可）

## 1. Chrome Web Store（5分）

- https://chrome.google.com/webstore/devconsole → SolPlayer Tune →
  パッケージ → 「新しいパッケージをアップロード」→ chrome用zip → 審査に送信
- リリースノート欄は無い。審査は通常1〜3日、公開後は自動更新で配布される

## 2. AMO / Firefox（10分）

- 手順詳細: **docs/mobile-firefox.md の「AMO提出チートシート」**を参照
- 要点: firefox用zip / Firefox+Android両チェック / Androidテスト済み=Yes /
  **ソース提出は常にYes**（GitHubのmain.zip＋定型ビルド手順）/ Version Notes日英

## 3. App Store / iOS（30分＋審査1〜2日）

### Mac側

```bash
cd /Users/foresthill/Development/AI-Driven/SolPlayer
git pull
cd apps/extension && pnpm build
cp -R dist/. "../extension-ios/SolPlayer Tune/SolPlayer Tune Extension/Resources/"
```

1. Xcodeで `apps/extension-ios/SolPlayer Tune/SolPlayer Tune.xcodeproj` を開く
2. **両ターゲット**（本体＋Extension）の General → Version を新しい番号に
   （Buildも両者で揃える。片方だけだとアップロードで弾かれる）
3. 実行先を「Any iOS Device (arm64)」に → Product → **Archive**
4. Organizer → **Distribute App → App Store Connect → Upload**（署名は自動のまま）

### App Store Connect側

1. https://appstoreconnect.apple.com/apps/6800237084 → iOS Appの「＋」→ 新バージョン作成
2. 「このバージョンの新機能」を日英両ロケールに入力
3. ビルドの処理完了（10〜30分、メール通知）後、ビルド欄で選択
   - 暗号化の質問 → 「None of the algorithms mentioned above」
4. 年齢制限の追加質問が出たら回答（Location Sharing / Dating → No）
5. Save → **Add for Review → Submit to App Review**
6. リリース方法は「自動」設定なので、承認後そのまま公開される

## ハマったときは

- **提出ボタンがグレー** → メタデータより先に契約（developer.apple.comの
  License Agreement / ASCのBusiness → Agreements）を確認（CLAUDE.md教訓）
- 掲載テキストの保存エラー → 記号が原因（— • 〜 → ♪ はASCII相当に置換）
- **リポジトリの修正はストア反映まで完了ではない**（CLAUDE.md教訓）

## 期限付きの予告（Appleからの警告）

- **2027年4月以降のアップロードには iOS 27 SDK（Xcode 27）が必須**
  （2026-11時点のビルドはiOS 26.5 SDK。警告のみで当面は影響なし）。
  その時期に更新する際は、先にXcodeを27へアップデートしてからArchiveする。
  Xcodeの大型更新はディスクを10〜20GB消費するため、DerivedData削除・
  ゴミ箱空け・古いシミュレータランタイム削除（`xcrun simctl runtime delete`）
  を先に行うこと
- 年齢制限の追加質問（Location Sharing / Dating）は2027年1月15日までに回答
  （次のバージョン提出時に出てきたら両方No）
