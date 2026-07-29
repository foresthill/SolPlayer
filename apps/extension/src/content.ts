/**
 * SolPlayer Tune - コンテンツスクリプト
 *
 * YouTubeページの<video>要素の音声を createMediaElementSource で
 * Web Audioへ引き込み、SoundTouchでリアルタイムにピッチのみ変換する。
 *
 * この方式のポイント:
 * - createMediaElementSourceは要素の音声出力を「完全に」Web Audioへ
 *   付け替えるため、元音との二重再生が構造的に起きない
 * - タブキャプチャ・共有ダイアログ・消音フラグが一切不要
 * - 音声データは保存しない（リアルタイム処理のみ）
 * - DRM(EME)保護コンテンツ（購入映画等）はブラウザ仕様により無音になる
 *   → その場合は自動でバイパス（440Hz）に戻す
 */

import { SoundTouch, SimpleFilter, getWebAudioNode } from 'soundtouchjs';

const FREQUENCIES = [440, 432, 444] as const;
const STORAGE_KEY = 'solplayer-tune-hz';
const CAPTURE_BUFFER = 4096;
const OUTPUT_BUFFER = 4096;
/** ジッタ吸収のプリバッファ（低遅延優先で本体アプリより小さめ ≒0.17s@48kHz） */
const PRIME_FRAMES = 8192;

function toSemitones(baseHz: number, targetHz: number): number {
  return 12 * Math.log2(targetHz / baseHz);
}

/** ライブ入力のリングキュー（本体アプリのLiveStreamSourceと同方式） */
class StreamQueue {
  private queue: Float32Array[] = [];
  private readFrames = 0;
  private available = 0;
  private primed = false;

  push(interleaved: Float32Array): void {
    this.queue.push(interleaved);
    this.available += interleaved.length / 2;
    // 2秒を超えたら古い方を捨てて遅延の蓄積を防ぐ
    while (this.available > 96000 && this.queue.length > 1) {
      const dropped = this.queue.shift()!;
      this.available -= dropped.length / 2 - this.readFrames;
      this.readFrames = 0;
    }
  }

  extract(target: Float32Array, numFrames: number): number {
    if (!this.primed) {
      if (this.available < PRIME_FRAMES) return 0;
      this.primed = true;
    }
    let written = 0;
    while (written < numFrames && this.queue.length > 0) {
      const head = this.queue[0];
      const headFrames = head.length / 2 - this.readFrames;
      const take = Math.min(headFrames, numFrames - written);
      target.set(
        head.subarray(this.readFrames * 2, (this.readFrames + take) * 2),
        written * 2
      );
      written += take;
      this.readFrames += take;
      if (this.readFrames * 2 >= head.length) {
        this.queue.shift();
        this.readFrames = 0;
      }
    }
    this.available -= written;
    if (this.available === 0) this.primed = false;
    return written;
  }
}

class TuneEngine {
  private ctx: AudioContext | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private captureNode: ScriptProcessorNode | null = null;
  private outputNode: ScriptProcessorNode | null = null;
  private muteGain: GainNode | null = null;
  private soundtouch: InstanceType<typeof SoundTouch> | null = null;
  private video: HTMLVideoElement | null = null;
  private converting = false;

  /** 現在の対象videoに接続（初回のみcreateMediaElementSource） */
  private ensureGraph(video: HTMLVideoElement): boolean {
    if (this.source && this.video === video) return true;
    // createMediaElementSourceは要素につき1回しか呼べないため、
    // 別のvideoに切り替わった場合のみ作り直す（YouTubeは基本同一要素）
    if (this.source && this.video !== video) {
      this.teardownProcessing();
      this.source.disconnect();
      this.source = null;
    }
    try {
      if (!this.ctx) {
        this.ctx = new AudioContext();
      }
      void this.ctx.resume();
      this.source = this.ctx.createMediaElementSource(video);
      this.video = video;
      // 初期状態はバイパス（無変換で素通し）
      this.source.connect(this.ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  private teardownProcessing(): void {
    if (this.captureNode) {
      this.captureNode.onaudioprocess = null;
      this.captureNode.disconnect();
      this.captureNode = null;
    }
    this.outputNode?.disconnect();
    this.outputNode = null;
    this.muteGain?.disconnect();
    this.muteGain = null;
    this.soundtouch = null;
  }

  /** 変換ON: source → capture → SoundTouch → destination */
  private engage(targetHz: number): void {
    if (!this.ctx || !this.source) return;
    if (!this.converting) {
      this.source.disconnect();

      const queue = new StreamQueue();
      const soundtouch = new SoundTouch();
      soundtouch.tempo = 1.0;
      soundtouch.pitchSemitones = toSemitones(440, targetHz);
      const filter = new SimpleFilter(
        { extract: (t: Float32Array, n: number) => queue.extract(t, n) },
        soundtouch
      );

      const captureNode = this.ctx.createScriptProcessor(CAPTURE_BUFFER, 2, 1);
      captureNode.onaudioprocess = (e) => {
        const input = e.inputBuffer;
        const left = input.getChannelData(0);
        const right = input.numberOfChannels > 1 ? input.getChannelData(1) : left;
        const interleaved = new Float32Array(left.length * 2);
        for (let i = 0; i < left.length; i++) {
          interleaved[i * 2] = left[i];
          interleaved[i * 2 + 1] = right[i];
        }
        queue.push(interleaved);
      };
      // ScriptProcessorは出力先に繋がないと駆動しない
      const muteGain = this.ctx.createGain();
      muteGain.gain.value = 0;
      this.source.connect(captureNode);
      captureNode.connect(muteGain);
      muteGain.connect(this.ctx.destination);

      const outputNode = getWebAudioNode(this.ctx, filter, undefined, OUTPUT_BUFFER);
      outputNode.connect(this.ctx.destination);

      this.captureNode = captureNode;
      this.outputNode = outputNode;
      this.muteGain = muteGain;
      this.soundtouch = soundtouch;
      this.converting = true;
    } else if (this.soundtouch) {
      this.soundtouch.pitchSemitones = toSemitones(440, targetHz);
    }
  }

  /** 変換OFF: source → destination 直結（無変換・低遅延） */
  private bypass(): void {
    if (!this.ctx || !this.source) return;
    if (!this.converting) return;
    this.source.disconnect();
    this.teardownProcessing();
    this.source.connect(this.ctx.destination);
    this.converting = false;
  }

  setFrequency(video: HTMLVideoElement, hz: number): boolean {
    if (!this.ensureGraph(video)) return false;
    if (hz === 440) {
      this.bypass();
    } else {
      this.engage(hz);
    }
    return true;
  }
}

const engine = new TuneEngine();

function loadHz(): number {
  try {
    const raw = Number(localStorage.getItem(STORAGE_KEY));
    if (FREQUENCIES.includes(raw as (typeof FREQUENCIES)[number])) return raw;
  } catch {
    // 読めなければデフォルト
  }
  return 440;
}

function saveHz(hz: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(hz));
  } catch {
    // 保存できなくても動作は継続
  }
}

function findVideo(): HTMLVideoElement | null {
  return (
    document.querySelector<HTMLVideoElement>('video.html5-main-video') ??
    document.querySelector<HTMLVideoElement>('video')
  );
}

/**
 * ボタンの配置先を決める。
 * YouTube視聴ページでは動画直下（#below の先頭・右寄せ）に置き、
 * 見つからないページでは画面右下固定にフォールバックする。
 */
function placeButton(btn: HTMLButtonElement): void {
  const below = document.querySelector('#below');
  if (below) {
    let host = document.getElementById('solplayer-tune-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'solplayer-tune-host';
      Object.assign(host.style, {
        display: 'flex',
        justifyContent: 'flex-end',
        margin: '8px 0 4px',
      } as Partial<CSSStyleDeclaration>);
    }
    if (host.parentElement !== below) {
      below.prepend(host);
    }
    if (btn.parentElement !== host) {
      host.appendChild(btn);
    }
    btn.style.position = 'static';
    btn.style.right = '';
    btn.style.bottom = '';
    return;
  }
  // フォールバック: 画面右下固定
  if (!btn.isConnected) {
    document.documentElement.appendChild(btn);
  }
  btn.style.position = 'fixed';
  btn.style.right = '16px';
  btn.style.bottom = '16px';
}

/** 周波数トグルボタンを注入する */
function injectButton(): void {
  const existing = document.getElementById(
    'solplayer-tune-btn'
  ) as HTMLButtonElement | null;
  if (existing) {
    // SPA遷移でDOMから外れた/アンカーが出現した場合に置き直す
    placeButton(existing);
    return;
  }

  let hz = loadHz();

  const btn = document.createElement('button');
  btn.id = 'solplayer-tune-btn';
  btn.type = 'button';
  Object.assign(btn.style, {
    zIndex: '2147483647',
    padding: '10px 16px',
    borderRadius: '9999px',
    border: '1px solid rgba(255,255,255,0.5)',
    background: 'rgba(30,30,40,0.75)',
    color: '#fff',
    font: '600 13px/1 system-ui, sans-serif',
    letterSpacing: '0.03em',
    cursor: 'pointer',
    backdropFilter: 'blur(12px)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
  } as Partial<CSSStyleDeclaration>);

  const render = (active: boolean) => {
    btn.textContent = `♪ ${hz}Hz`;
    btn.style.background =
      hz !== 440 && active ? 'rgba(120,90,220,0.9)' : 'rgba(30,30,40,0.75)';
    btn.title =
      hz === 440
        ? 'クリックで432Hz変換（SolPlayer Tune）'
        : `${hz}Hzで変換中。クリックで切替`;
  };

  btn.addEventListener('click', () => {
    const video = findVideo();
    if (!video) {
      btn.textContent = '♪ 動画がありません';
      setTimeout(() => render(false), 1500);
      return;
    }
    const idx = FREQUENCIES.indexOf(hz as (typeof FREQUENCIES)[number]);
    hz = FREQUENCIES[(idx + 1) % FREQUENCIES.length];
    saveHz(hz);
    const ok = engine.setFrequency(video, hz);
    render(ok);
    if (!ok) {
      btn.textContent = '♪ この動画は変換不可';
    }
  });

  render(false);
  placeButton(btn);
}

injectButton();
// SPA遷移でボタンが消えた/配置先が変わった場合に備えて監視（過剰動作を抑えるスロットル付き）
let injectQueued = false;
new MutationObserver(() => {
  if (injectQueued) return;
  injectQueued = true;
  setTimeout(() => {
    injectQueued = false;
    injectButton();
  }, 500);
}).observe(document.documentElement, { childList: true, subtree: true });

// テスト用フック（E2E検証で使用）
(window as unknown as { __solplayerTune?: unknown }).__solplayerTune = {
  setFrequency: (hz: number) => {
    const video = findVideo();
    return video ? engine.setFrequency(video, hz) : false;
  },
};
