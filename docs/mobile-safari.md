# iPhone (iOS Safari) で SolPlayer Tune を使う

iOS SafariはChrome拡張を読み込めないため、`safari-web-extension-converter` で
拡張をiOSアプリ（Safari機能拡張入り）に変換し、Xcodeから実機へインストールする。
将来的にはApp Storeで配布する。

## iOSだけ変換方式が違う（重要）

iOS（iPadOS含む）のWebKitでは、YouTubeのようなストリーミング再生（MSE/HLS）の
`<video>`に対して `createMediaElementSource` の音声付け替えが**効かない**
（元の音が素通しのまま鳴り続け、変換されない）。実機で「UIは動くのに音が変わらない」
症状はこれが原因。

そのため v0.2.2 から、iOSでは**再生速度方式**に自動フォールバックする:

- `video.playbackRate = 目標Hz / 440` ＋ `preservesPitch = false`
- レコードの回転数を変えるのと同じ原理でピッチが目標周波数になる
- 副作用: 再生が `hz/440` 倍になる（432Hzで**約1.8%ゆっくり**）
- 利点: 映像も同じだけ遅くなるため**リップシンクのズレはゼロ**。
  AudioContext不要なので保存周波数の自動適用に**ユーザー操作も不要**
- YouTube側の再生速度変更（1.5x等）とは倍率を掛け合わせて共存する
- E2E実測で確認済み（440Hz正弦波 → 432.25Hz / 300.00Hz を測定）

デスクトップ（Chrome/Firefox）は従来どおりSoundTouchによるWeb Audio方式
（テンポ不変・こちらはリップシンクが約0.2〜0.3秒ずれる）。
2方式の比較と使い分けの全体像は [conversion-methods.md](conversion-methods.md) を参照。

## ビルド手順（Mac）

前提: フルXcode（Command Line Toolsだけでは `safari-web-extension-converter` が無い）、
Apple Developer Program登録済み。

```bash
cd apps/extension
pnpm build   # dist/ を生成

# dist/ をiOSアプリプロジェクトに変換（初回のみ）
xcrun safari-web-extension-converter dist \
  --project-location ../extension-ios \
  --app-name "SolPlayer Tune" \
  --bundle-identifier com.foresthill.solplayer.tune \
  --ios-only
```

2回目以降（content.tsを更新したとき）は `pnpm build` 後に、生成済みプロジェクトの
`SolPlayer Tune Extension/Resources/` 配下へ dist/ の中身（manifest.json,
content.js, icons/）を上書きコピーすれば良い（converterの再実行でも可）。

### Xcodeでの設定

1. `apps/extension-ios/SolPlayer Tune/SolPlayer Tune.xcodeproj` を開く
2. TARGETS の **本体アプリと拡張の両方**で Signing & Capabilities →
   「Automatically manage signing」ON → Team に自分の開発者チームを選択
   （**片方だけ設定して同じエラーが続くのが定番のハマり**）
3. Bundle Identifier は親子関係が必須:
   - 本体: `com.foresthill.solplayer.tune`
   - 拡張: `com.foresthill.solplayer.tune.extension`（本体ID + `.` + 何か）
   ずれていると "Embedded binary's bundle identifier is not prefixed with
   the parent app's bundle identifier" エラーになる
4. 実行先を**物理iPhone**にして ▶ Run（シミュレータ向けSDKビルドと混同しない）

### ビルドのトラブルシューティング

| 症状 | 原因と対処 |
| --- | --- |
| 大量のモジュールエラー + `No space left on device` | ディスク満杯。`~/Library/Developer/Xcode/DerivedData` 削除・ゴミ箱を空にする・不要なシミュレータランタイムを `xcrun simctl runtime delete` で削除（実機ビルドに古いランタイムは不要） |
| `dyld_shared_cache_extract_dylibs failed` | iPhoneのデバイスサポート展開（数GB）がディスク不足で失敗。空きを作り、壊れた展開が残るので `~/Library/Developer/Xcode/iOS DeviceSupport` を削除 → Mac/iPhone両方再起動 → つなぎ直して「Preparing device」完了まで待つ |
| 署名エラー | 上記のTeam設定を両ターゲットに |

## iPhoneでの有効化

1. Runでアプリが入ると「You can turn on SolPlayer Tune's Safari extension in
   Settings.」画面になる
2. 設定 → アプリ → Safari → **機能拡張**（旧iOSは 設定 → Safari → 機能拡張）
3. SolPlayer Tune を ON → アクセス許可で **youtube.com を「許可」**
   （「確認」だと毎回ダイアログが出る。m.youtube.com も同様に許可）
4. SafariでYouTubeを開くと「♪ 440Hz」ボタンが出る

### 機能拡張がグレーアウトして押せないとき

- **スクリーンタイムが原因のことが多い**: 設定 → スクリーンタイム →
  コンテンツとプライバシーの制限 → コンテンツ制限 → **Webコンテンツを「無制限」**
  にする（制限付きだとSafari拡張が有効化できない）※実際にこれで解決した実績あり
- Safari側から直接ONにできる場合もある: Safariのアドレスバー「ぁあ」→ 機能拡張を管理
- 直らなければ: アプリ削除 → iPhone再起動 → Xcodeから再Run
  （Bundle ID変更後は古い登録が残って衝突することがある）

## App Store配布（今後）

1. Xcode: Product → Archive → Distribute App → App Store Connect
2. App Store Connectでアプリ登録（掲載文はAMO/Chrome Web Store用の英語版を流用）
3. 審査提出。開発者Runで入れた版は7日で期限切れになるため、常用はApp Store版で
