import type { Metadata } from 'next';

/**
 * ブラウザ拡張「SolPlayer Tune」の紹介ページ（ランディング）。
 * 「YouTube 432Hz」系の検索の受け皿 兼 3ストアへの導線。
 * 競合と違い、無料・データ収集ゼロ・制約の明記（誠実路線）を前面に出す。
 */

export const metadata: Metadata = {
  title: 'SolPlayer Tune - YouTubeを432Hzで聴くブラウザ拡張（無料）',
  description:
    'いま見ているYouTubeの音声をその場で432Hz・437Hz・444Hzにリアルタイム変換する無料のブラウザ拡張。Chrome・Firefox（Android対応）・iPhone/iPad対応。保存もダウンロードもデータ収集も一切なし。',
};

const STORES = [
  {
    name: 'Chrome Web Store',
    sub: 'Chrome / Edge（PC）',
    href: 'https://chromewebstore.google.com/detail/solplayer-tune/kkmjijfhckkmikcbnhmjlibbdghbekhe',
  },
  {
    name: 'Firefox Add-ons',
    sub: 'PC・Android両対応',
    href: 'https://addons.mozilla.org/firefox/addon/solplayer/',
  },
  {
    name: 'App Store',
    sub: 'iPhone / iPad（Safari）',
    href: 'https://apps.apple.com/jp/app/id6800237084',
  },
] as const;

const PRESETS = [
  { label: '440Hz', note: '標準（無変換）', active: false },
  { label: '432Hz', note: '定番', active: true },
  { label: '437Hz', note: '', active: false },
  { label: '444Hz', note: 'C5=528Hz', active: false },
  { label: 'カスタム', note: '200〜999Hz・小数第10位まで', active: false },
  { label: 'マイプリセット', note: 'お気に入りを保存', active: false },
] as const;

const card: React.CSSProperties = {
  background: 'var(--glass-bg-strong)',
  border: '1px solid var(--glass-border)',
  boxShadow: 'var(--glass-shadow)',
  borderRadius: 20,
  padding: '20px 22px',
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

export default function TunePage() {
  return (
    <main
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '48px 20px 72px',
        position: 'relative',
      }}
    >
      {/* ヒーロー */}
      <p
        style={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.12em',
          opacity: 0.65,
          marginBottom: 8,
        }}
      >
        SOLPLAYER TUNE — ブラウザ拡張
      </p>
      <h1 style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.35 }}>
        YouTubeを、432Hzで。
      </h1>
      <p style={{ ...p, marginTop: 10, marginBottom: 22 }}>
        いま見ている動画の音声を、その場でリアルタイム変換するブラウザ拡張です。
        <strong>無料・アカウント不要・データ収集ゼロ。</strong>
        音声の保存もダウンロードも一切しません。
      </p>

      {/* ストアボタン */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          marginBottom: 28,
        }}
      >
        {STORES.map((s) => (
          <a
            key={s.name}
            href={s.href}
            style={{
              ...card,
              padding: '12px 18px',
              borderRadius: 16,
              textDecoration: 'none',
              color: 'inherit',
              flex: '1 1 180px',
              minWidth: 180,
            }}
          >
            <span style={{ display: 'block', fontSize: 14, fontWeight: 800 }}>
              {s.name}
            </span>
            <span style={{ display: 'block', fontSize: 11.5, opacity: 0.65, marginTop: 3 }}>
              {s.sub}
            </span>
          </a>
        ))}
      </div>

      {/* 周波数グリッド */}
      <section style={{ ...card, marginBottom: 16 }}>
        <h2 style={h2}>432Hzも、437Hzも、あなたの周波数も。</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {PRESETS.map((f) => (
            <div
              key={f.label}
              style={{
                padding: '10px 14px',
                borderRadius: 9999,
                font: '600 13px/1.3 system-ui, sans-serif',
                background: f.active
                  ? 'linear-gradient(135deg, #a78bfa 0%, #f472b6 100%)'
                  : 'rgba(255,255,255,0.65)',
                color: f.active ? '#fff' : 'inherit',
                border: '1px solid var(--glass-border)',
                boxShadow: f.active
                  ? '0 4px 14px rgba(167,139,250,0.45)'
                  : 'none',
              }}
            >
              {f.label}
              {f.note && (
                <span style={{ fontSize: 10.5, opacity: 0.75, marginLeft: 6 }}>
                  {f.note}
                </span>
              )}
            </div>
          ))}
        </div>
        <p style={{ ...p, marginTop: 12, fontSize: 12.5 }}>
          動画の下に現れる「♪ 440Hz」ボタンをタップするだけ。選んだ周波数は
          保存され、次の動画からは自動で適用されます。440Hzに戻せば完全に
          元の音（処理バイパス）です。
        </p>
      </section>

      {/* 特徴 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <section style={card}>
          <h2 style={h2}>保存しない。集めない。</h2>
          <p style={p}>
            音声は再生中にその場で変換するだけ。録音・保存・ダウンロードは
            一切ありません。アクセス解析もトラッキングもなし。
            ソースコードも公開しています。
          </p>
        </section>
        <section style={card}>
          <h2 style={h2}>PCでもスマホでも。</h2>
          <p style={p}>
            Chrome / Edge、Firefox（Androidスマホ対応）、そしてiPhone /
            iPadのSafariに対応。すべて無料です。
          </p>
        </section>
        <section style={card}>
          <h2 style={h2}>制約も正直に。</h2>
          <p style={p}>
            iOSは仕組み上「再生速度方式」で、432Hzでは約1.8%ゆっくりに
            なります（映像も同期するためズレません）。PCでは音が映像より
            約0.2〜0.3秒遅れます。音楽用途では実用上問題ありません。
          </p>
        </section>
      </div>

      {/* フッターリンク */}
      <p style={{ ...p, fontSize: 12.5 }}>
        <a href="/support" style={{ textDecoration: 'underline' }}>
          サポート・お問い合わせ
        </a>
        {' ・ '}
        <a
          href="https://github.com/foresthill/SolPlayer/blob/main/docs/privacy-policy.md"
          style={{ textDecoration: 'underline' }}
        >
          プライバシーポリシー
        </a>
        {' ・ '}
        <a
          href="https://github.com/foresthill/SolPlayer"
          style={{ textDecoration: 'underline' }}
        >
          GitHub
        </a>
      </p>
    </main>
  );
}
