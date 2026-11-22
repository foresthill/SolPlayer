import type { Metadata } from 'next';

/**
 * SolPlayer Tune（iOSアプリ/ブラウザ拡張）のサポートページ。
 * App Storeの審査要件（ガイドライン1.5: サポートURLは質問・問い合わせが
 * できるページであること）を満たすため、FAQと問い合わせ先をここに集約する。
 */

export const metadata: Metadata = {
  title: 'SolPlayer Tune サポート / Support',
  description:
    'SolPlayer Tuneの使い方・よくある質問・お問い合わせ先 / How to use, FAQ and contact for SolPlayer Tune',
};

const card: React.CSSProperties = {
  background: 'var(--glass-bg-strong)',
  border: '1px solid var(--glass-border)',
  boxShadow: 'var(--glass-shadow)',
  borderRadius: 20,
  padding: '20px 22px',
  marginBottom: 16,
  backdropFilter: 'blur(14px)',
};

const h2: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  marginBottom: 10,
  letterSpacing: '0.04em',
};

const p: React.CSSProperties = {
  fontSize: 13.5,
  lineHeight: 1.9,
  opacity: 0.9,
};

export default function SupportPage() {
  return (
    <main
      style={{
        maxWidth: 680,
        margin: '0 auto',
        padding: '40px 20px 72px',
        position: 'relative',
      }}
    >
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>
        SolPlayer Tune サポート
      </h1>
      <p style={{ ...p, marginBottom: 24 }}>
        YouTubeの音声をその場で432Hz等に変換して聴くアプリ/ブラウザ拡張の
        サポートページです。English follows Japanese.
      </p>

      <section style={card}>
        <h2 style={h2}>お問い合わせ / Contact</h2>
        <p style={p}>
          ご質問・不具合報告・ご要望は、GitHubのIssueで受け付けています
          （無料のGitHubアカウントで投稿できます。日本語・英語どちらでもOK）:
          <br />
          <a
            href="https://github.com/foresthill/SolPlayer/issues"
            style={{ fontWeight: 700, textDecoration: 'underline' }}
          >
            github.com/foresthill/SolPlayer/issues
          </a>
          <br />
          For questions, bug reports and feature requests, please open an issue
          at the link above (any language is welcome). We usually respond
          within a few days.
        </p>
      </section>

      <section style={card}>
        <h2 style={h2}>使い方（iOS）</h2>
        <ol style={{ ...p, paddingLeft: 20 }}>
          <li>アプリをインストールして一度開く</li>
          <li>設定 → アプリ → Safari → 機能拡張 で SolPlayer Tune をオン</li>
          <li>youtube.com へのアクセスを「許可」にする</li>
          <li>
            SafariでYouTubeを開いて動画を再生し、「♪ 440Hz」ボタンをタップして
            432Hzなどを選ぶ
          </li>
        </ol>
      </section>

      <section style={card}>
        <h2 style={h2}>よくある質問</h2>
        <p style={p}>
          <strong>Q. ボタンが破線の表示のままで音が変わりません</strong>
          <br />
          A. ブラウザの制約で、ページを一度タップするか再生を開始するまで変換を
          開始できません。破線表示は「選択済み・適用待ち」の状態で、再生が始まると
          自動で変換が効き、ボタンがグラデーション表示に変わります。
        </p>
        <p style={{ ...p, marginTop: 12 }}>
          <strong>Q. iOSで再生がわずかにゆっくりになります</strong>
          <br />
          A. 仕様です。iOSではレコードの回転数を変えるのと同じ「再生速度方式」で
          変換するため、432Hzでは約1.8%（3分の曲で約3秒）ゆっくりになります。
          映像も同期するため音ズレは起きません。440Hzを選ぶと元に戻ります。
        </p>
        <p style={{ ...p, marginTop: 12 }}>
          <strong>Q. 音声やデータは収集されますか？</strong>
          <br />
          A. 一切収集しません。音声の録音・保存・ダウンロードもしません。設定は
          端末内にのみ保存されます。詳細は
          <a
            href="https://github.com/foresthill/SolPlayer/blob/main/docs/privacy-policy.md"
            style={{ textDecoration: 'underline' }}
          >
            プライバシーポリシー
          </a>
          をご覧ください。
        </p>
      </section>

      <section style={card}>
        <h2 style={h2}>Support (English)</h2>
        <p style={p}>
          <strong>How to use (iOS):</strong> install and open the app once, then
          enable the extension in Settings → Apps → Safari → Extensions, allow
          access to youtube.com, open YouTube in Safari and tap the tuning
          button below the video.
          <br />
          <strong>Audio plays slightly slower on iOS:</strong> this is by
          design. iOS uses tape-style (playback-rate) conversion, about 1.8%
          slower at 432Hz, with video and audio always in sync. Select 440Hz to
          return to the original.
          <br />
          <strong>Privacy:</strong> no data is collected and no audio is ever
          recorded, stored or downloaded. See the privacy policy linked above.
        </p>
      </section>
    </main>
  );
}
