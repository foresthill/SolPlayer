# 競合分析（2026-11調査）

## Music ReTuner™（最有力競合）

- CWS: https://chromewebstore.google.com/detail/youtube-music-re-tuner/fjapjofdfgojhkiabfdfmhgpfbepjhck
- サイト: https://musicretuner.com/ （開発元: SYQEL INC）
- ★4.1 / 12件（2026-11時点）。Chrome/Firefox/Edge/Safari版を展開、iOS版は$99.99

### 謳い文句と実態

「YouTube / YouTube Music / Apple Music / Spotify / SoundCloud等をリアルタイム変換、
特許エンジン」と宣伝しているが、自社サイト（Amazon Music向けページ）に
**「Standardエンジンはピッチと一緒に速度がわずかに変わる。テンポ維持の
Pro 'Pitch-perfect' モードはChrome/Edgeのみ」**と明記されている。つまり:

- **Spotify/Apple Music等のDRM保護ストリームはWeb Audioで処理できない**
  （SolPlayerがiOSで直面したのと同じ制約。誰にも回避できない）
- 彼らの多サービス「対応」の実体は**再生速度方式（テープ方式）**
  ＝SolPlayer TuneのiOS方式と同じ。playbackRateはDRMと無関係に効くため
  どのサービスでも「動く」
- テンポ維持の本物のピッチ変換はYouTube系×Chrome/Edgeのみ
  ＝SolPlayer Tuneのデスクトップ版と同等

**技術的にSolPlayer Tuneが劣っている点は実質「対応サービスの幅」のみ。**
速度方式を他サービスへ開放すれば同等になる（v0.3.0候補）。

### 価格（2026-11時点の同社サイト、ページ間で不整合あり）

- 月額 $4.99（1台）〜 $19.99（6台）
- 買い切り $299.99
- iOS版 $99.99（launch price、値上げ予告付き）
- ライセンスキーをメールで受領→拡張に貼る認証方式
- 無料枠は432/440Hzのみ。「440Hzが×で選べない」という不満レビューあり

→ **SolPlayer Tuneは全機能無料**。最大の差別化軸。
→ 逆に、この価格で商売が成立している＝**432Hz変換に課金する市場が実在する**
  （将来のプレミアム構想の裏付け）

### 学ぶべきマーケ手法

1. **サービス別SEOランディングページ**を量産している
   （/amazon-music-432-hz, /apple-music-re-tuner, /youtube-music-re-tuner…）。
   「<サービス名> 432Hz」の検索を個別に拾う戦略
2. メディア獲得実績: Magnetic Magazineレビュー、Mental Floss記事
   ＝**このジャンルはメディアに取り上げられる**。プレスアウトリーチ有効
3. Solfeggio全9周波数をプリセット訴求（528Hz推し）

## その他の競合（CWS内、いずれも無料系）

- 432Herz / 432Hz Converter / 432Hz Audio Converter など同名系が複数。
  いずれもYouTube中心・デスクトップのみの模様（詳細未調査）

## SolPlayer Tuneのポジショニング

**「誠実な無料版」**: 全機能無料・データ収集ゼロ・OSS・保存もダウンロードもしない・
制約（iOSの速度方式1.8%等）を隠さず明記。
**モバイルが堀**: iOS（App Store正規・無料 vs 競合$99.99）とAndroid Firefox対応は
競合に対する明確な優位。

## 法的防御メモ（特許・商標）※法律助言ではない

### 彼らの特許主張

- SYQELは自社サイト群で **US Patent 11,836,330**（「リアルタイム周波数変換エンジン」）
  を謳っている。ただし**請求項の原文は未確認**（検索ではSYQEL自身の宣伝ページしか
  出てこない）。番号からみて2023年末ごろの発行で、同社の「432 Player Plus」系
  **音楽プレイヤーアプリ**向けの可能性が高い
- **TODO**: https://patents.google.com/patent/US11836330 を一度人間の目で確認し、
  請求項が「ブラウザ拡張でのWeb音声変換」に及ぶ書き方かを見る

### リスク評価（低め、ただしゼロではない）

- SolPlayer Tuneの実装は (a) W3C標準API（playbackRate / preservesPitch /
  Web Audio）と (b) SoundTouchアルゴリズム（WSOLA、2001年からのOSS）の組み合わせ。
  いずれも同特許の出願よりはるかに古い公知技術
- リポジトリは公開で、SolPlayer本体は2016年から、拡張は2026-07からの
  コミット履歴＝**独立開発の公開タイムスタンプ**が残っている
- 無料・OSS・収益ゼロの相手に特許権を行使する実益は乏しい

### 防御のための行動規範（今からやる）

1. **商標を踏まない**: 「Music ReTuner」「Re-Tuner」等の名称・ロゴ・文言を
   製品・ストア掲載・記事で使わない（現実的リスクは特許より商標）
2. **公開マーケで競合を名指し比較しない**（この内部文書はOK。記事では
   「有料の類似ツール」程度の表現に留める）
3. 彼らのコード・UI・宣伝文をコピーしない（すべて独自実装を維持）
4. 自分たちも「特許」等の根拠なき主張をしない
5. **LGPL-2.1の帰属表示を明記**（SoundTouchJSをバンドルしているため。
   ソース公開＋ビルド手順公開で再ビルド可能性も担保済み → READMEに記載）
6. 万一警告状が来たら: 慌てて返信せず、全文保存 → 先行技術リスト
   （SoundTouch 2001、W3C仕様、既存の無料432Hz拡張群）を添えて専門家に相談

### プロダクト側の示唆（バックログ）

- v0.3.0候補: 速度方式を任意サイトで使える「全サイトモード」
  （Spotify/Apple Music/SoundCloud等。テンポが変わる旨を正直に表示。
  host permissionはオプトイン方式で審査リスクを抑える）
- Solfeggioプリセット集（396/417/528/639/741/852Hz等）をワンタップ化
- ピッチのみ変換の能力プローブ（iOSでWebKitが直り次第自動昇格）
