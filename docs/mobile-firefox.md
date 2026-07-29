# スマホ対応: Firefox for Android で SolPlayer Tune を使う

スマホのブラウザで唯一まともに拡張機能をサポートしているのが Firefox for Android。
デスクトップ版と同じGeckoエンジンのため、拡張の心臓部
（`createMediaElementSource` + SoundTouch + ScriptProcessor）はそのまま動く見込み。

> iPhone(Safari)は全ブラウザがWebKit強制のため拡張は動かせない
> （Safari Web Extension化 + App Store配布が必要）。iOSは本体アプリの
> Capacitorネイティブ化で対応する方針（docs/mobile-capacitor.md参照）。

## 互換性（確認済みの静的チェック）

- `manifest_version: 3` — Firefox 109+/Android 121+ でサポート
- `browser_specific_settings.gecko.id` — AMO署名に必須。付与済み
  （`solplayer-tune@foresthill.github.io`、`strict_min_version: 121.0`）
- 使用API: `AudioContext` / `createMediaElementSource` / `ScriptProcessorNode` /
  `localStorage` / `MutationObserver` — すべてFirefoxで利用可能
- UIの `backdrop-filter` は Firefox 103+ で有効

### 注意: FirefoxのMV3はホスト権限がオプトイン

Firefox の Manifest V3 では、コンテンツスクリプトのサイトアクセスを
**ユーザーが明示的に許可する必要がある**。インストール直後にボタンが
出ない場合は、アドオンの設定（拡張アイコン→SolPlayer Tune→権限）で
youtube.com へのアクセスを「許可」にする。

## 配布までの流れ（AMO = addons.mozilla.org）

Firefoxは**署名済み拡張しか恒久インストールできない**ため、AMO経由で配布する。

1. [Firefoxアドオン開発者ハブ](https://addons.mozilla.org/developers/) に
   Mozillaアカウントでログイン（無料）
2. 「新しいアドオンを登録」→ リリースの `solplayer-tune-firefox.zip` をアップロード
   - 公開方法は2択:
     - **AMOに掲載（listed）**: ストアに公開され、誰でも検索・インストール可能。自動更新も効く
     - **自己配布（unlisted）**: 審査後に署名済みxpiがダウンロードでき、自サイト/GitHub Releasesで配布
3. 審査は自動チェック＋（場合により）人手レビュー。本拡張は
   リモートコード無し・データ収集無しなので通りやすい構成
4. 公開後、Android版Firefoxの「アドオン」から検索してインストール

## 実機テスト手順（署名前に試す場合）

署名前のzipは通常のFirefox for Androidに入れられないため、
**Firefox Nightly** を使う:

1. Google PlayからFirefox Nightlyをインストール
2. 設定 → 「Firefox Nightly について」→ ロゴを5回タップ（デバッグメニュー解放）
3. 設定 → 高度な設定 → 「カスタムアドオンコレクション」…（またはメニューの
   「ファイルから拡張機能をインストール」でzipを直接指定。Nightly 120+）
4. YouTubeを開き、動画下の「♪ 440Hz」ボタン → パネルから432Hz適用
5. 確認ポイント:
   - 音程が下がって聴こえるか（変換動作）
   - 映像と音のずれが許容範囲か（約0.2〜0.3秒）
   - 画面オフ・タブ切替で音が続くか（Androidはメディア再生継続が既定）

## 本体Webアプリ側のスマホ改善（実装済み）

拡張とは別に、本体プレイヤー（sol-player-web.vercel.app）は
出力を `<audio>` 要素経由に変更し Media Session API を実装済み:

- ロック画面・通知領域に曲名/アートワーク/再生・前後スキップが表示される
- Androidでは画面オフでも再生が継続しやすくなる
- iOSのマナースイッチで消音されなくなる（メディア再生扱いのため）
- iOS Safariの画面オフ時の挙動はOS裁量が残る。確実な常時バックグラウンド再生は
  Capacitorネイティブ版（UIBackgroundModes: audio）で対応予定
