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
 *
 * iOS(iPadOS含む)のWebKitでは、MSE/HLSで再生される<video>に対して
 * createMediaElementSourceの音声付け替えが効かず、元音が素通しのまま
 * 変換されない。そのためiOSでは「再生速度方式」（レコードの回転数を
 * 変えるのと同じ原理: playbackRate = 目標Hz/440, preservesPitch = false）
 * で変換する。再生が hz/440 倍（432Hzで約1.8%遅く）になるが、映像も
 * 同じだけ遅くなるためリップシンクのズレは起きない。
 */

import { SoundTouch, SimpleFilter, getWebAudioNode } from 'soundtouchjs';

/** 公式プリセット。候補を増やすときはここに1行足すだけでUIに反映される */
const OFFICIAL_PRESETS: ReadonlyArray<{ hz: number; label: string }> = [
  { hz: 440, label: '440Hz 標準' },
  { hz: 432, label: '432Hz' },
  { hz: 444, label: '444Hz' },
];
const BASE_HZ = 440;
const MIN_HZ = 200;
const MAX_HZ = 999;
const MAX_MY_PRESETS = 12;
const STORAGE_KEY = 'solplayer-tune-hz';
const PRESETS_KEY = 'solplayer-tune-presets';
const CAPTURE_BUFFER = 4096;
const OUTPUT_BUFFER = 4096;
/** ジッタ吸収のプリバッファ（低遅延優先で本体アプリより小さめ ≒0.17s@48kHz） */
const PRIME_FRAMES = 8192;

function toSemitones(baseHz: number, targetHz: number): number {
  return 12 * Math.log2(targetHz / baseHz);
}

/** iOS/iPadOS判定（iPadのデスクトップ表示はMac+タッチ有りとして名乗る） */
const IS_IOS =
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** preservesPitchのベンダー差異吸収用 */
type PitchControlledVideo = HTMLVideoElement & {
  preservesPitch?: boolean;
  webkitPreservesPitch?: boolean;
};

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

  /* ---- 再生速度方式（iOSフォールバック） ---- */
  private rateMode = IS_IOS;
  /** サイト/ユーザーが選んだ素の再生速度（この上に変換倍率を掛ける） */
  private baseRate = 1;
  private rateRatio = 1;
  /** 自分で設定した速度（ratechangeイベントの自他判定に使う） */
  private expectedRate: number | null = null;

  private onRateChange = (): void => {
    const video = this.video;
    if (!video) return;
    if (
      this.expectedRate !== null &&
      Math.abs(video.playbackRate - this.expectedRate) < 1e-6
    ) {
      return; // 自分の変更
    }
    // サイト/ユーザーによる速度変更 → 基準速度を取り込み、倍率を掛け直す
    this.baseRate = video.playbackRate;
    if (this.rateRatio !== 1) this.applyRate(video);
  };

  private applyRate(video: HTMLVideoElement): void {
    const v = video as PitchControlledVideo;
    // 倍率1(=440Hz)なら素の状態へ戻す
    v.preservesPitch = this.rateRatio === 1;
    v.webkitPreservesPitch = this.rateRatio === 1;
    this.expectedRate = this.baseRate * this.rateRatio;
    video.playbackRate = this.expectedRate;
  }

  private detachRateVideo(): void {
    const video = this.video;
    if (!video) return;
    video.removeEventListener('ratechange', this.onRateChange);
    const v = video as PitchControlledVideo;
    v.preservesPitch = true;
    v.webkitPreservesPitch = true;
    this.expectedRate = this.baseRate;
    video.playbackRate = this.baseRate;
  }

  private setFrequencyByRate(video: HTMLVideoElement, hz: number): boolean {
    if (this.video !== video) {
      this.detachRateVideo();
      this.video = video;
      this.baseRate = video.playbackRate > 0 ? video.playbackRate : 1;
      video.addEventListener('ratechange', this.onRateChange);
    }
    this.rateRatio = hz / BASE_HZ;
    this.converting = hz !== BASE_HZ;
    this.applyRate(video);
    return true;
  }

  /** ユーザー操作（ジェスチャ）前でも安全に適用できるモードか */
  isRateMode(): boolean {
    return this.rateMode;
  }

  /** テスト用: 変換方式を強制切替（切替前に現在の変換は解除する） */
  setRateMode(on: boolean): void {
    if (this.rateMode === on) return;
    if (this.video) this.setFrequency(this.video, BASE_HZ);
    this.rateMode = on;
  }

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
      soundtouch.pitchSemitones = toSemitones(BASE_HZ, targetHz);
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
      this.soundtouch.pitchSemitones = toSemitones(BASE_HZ, targetHz);
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

  /** 変換中だが対象videoが差し替わった（SPA遷移等）ときtrue */
  needsReattach(video: HTMLVideoElement): boolean {
    return this.converting && this.video !== null && this.video !== video;
  }

  setFrequency(video: HTMLVideoElement, hz: number): boolean {
    if (this.rateMode) {
      return this.setFrequencyByRate(video, hz);
    }
    if (!this.ensureGraph(video)) return false;
    if (hz === BASE_HZ) {
      this.bypass();
    } else {
      this.engage(hz);
    }
    return true;
  }
}

const engine = new TuneEngine();

/** 小数第10位まで受け付け、末尾の0は省いて表示する */
function formatHz(hz: number): string {
  return String(Number(hz.toFixed(10)));
}

function isValidHz(hz: number): boolean {
  return Number.isFinite(hz) && hz >= MIN_HZ && hz <= MAX_HZ;
}

function loadHz(): number {
  try {
    const raw = Number.parseFloat(localStorage.getItem(STORAGE_KEY) ?? '');
    if (isValidHz(raw)) return raw;
  } catch {
    // 読めなければデフォルト
  }
  return BASE_HZ;
}

function saveHz(hz: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, formatHz(hz));
  } catch {
    // 保存できなくても動作は継続
  }
}

/** マイプリセット（個人でチューニングした周波数の記録） */
function loadMyPresets(): number[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(PRESETS_KEY) ?? '[]');
    if (Array.isArray(parsed)) {
      return parsed.map(Number).filter(isValidHz).slice(0, MAX_MY_PRESETS);
    }
  } catch {
    // 壊れていれば空扱い
  }
  return [];
}

function saveMyPresets(presets: number[]): void {
  try {
    localStorage.setItem(
      PRESETS_KEY,
      JSON.stringify(presets.slice(0, MAX_MY_PRESETS).map(formatHz))
    );
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

/* ---------- UI（SolPlayer本体と同じオーロラ×ガラスの意匠） ---------- */

const AURORA_BG =
  'radial-gradient(120% 90% at 15% 10%, rgba(255,182,222,0.55), transparent 60%),' +
  'radial-gradient(120% 100% at 85% 15%, rgba(168,196,255,0.5), transparent 60%),' +
  'radial-gradient(130% 110% at 50% 100%, rgba(178,242,213,0.45), transparent 65%),' +
  'rgba(255,255,255,0.86)';
const ACTIVE_GRADIENT = 'linear-gradient(135deg, #a78bfa 0%, #f472b6 100%)';
const INK = '#1f2430';

function styleChip(el: HTMLElement, active: boolean): void {
  Object.assign(el.style, {
    padding: '7px 12px',
    borderRadius: '9999px',
    border: active ? '1px solid transparent' : '1px solid rgba(31,36,48,0.14)',
    background: active ? ACTIVE_GRADIENT : 'rgba(255,255,255,0.75)',
    color: active ? '#fff' : INK,
    font: '600 12px/1 system-ui, sans-serif',
    cursor: 'pointer',
    boxShadow: active
      ? '0 4px 14px rgba(167,139,250,0.45)'
      : '0 1px 4px rgba(31,36,48,0.08)',
  } as Partial<CSSStyleDeclaration>);
}

interface TuneUi {
  wrap: HTMLDivElement;
  render: () => void;
}

let ui: TuneUi | null = null;
let currentHz = loadHz();

function applyHz(hz: number): boolean {
  const video = findVideo();
  if (!video) return false;
  const ok = engine.setFrequency(video, hz);
  if (ok) {
    currentHz = hz;
    saveHz(hz);
  }
  return ok;
}

function buildUi(): TuneUi {
  const wrap = document.createElement('div');
  wrap.id = 'solplayer-tune-wrap';
  Object.assign(wrap.style, {
    position: 'relative',
    zIndex: '2147483647',
    display: 'inline-block',
    font: '13px system-ui, sans-serif',
  } as Partial<CSSStyleDeclaration>);

  // メインボタン（白ガラスのピル。変換中はオーロラグラデ）
  const btn = document.createElement('button');
  btn.id = 'solplayer-tune-btn';
  btn.type = 'button';
  Object.assign(btn.style, {
    padding: '10px 16px',
    borderRadius: '9999px',
    border: '1px solid rgba(255,255,255,0.7)',
    color: INK,
    font: '600 13px/1 system-ui, sans-serif',
    letterSpacing: '0.03em',
    cursor: 'pointer',
    backdropFilter: 'blur(14px)',
    boxShadow: '0 8px 24px rgba(31,36,48,0.25)',
  } as Partial<CSSStyleDeclaration>);

  // 設定パネル（オーロラ×ガラスのカード）
  const panel = document.createElement('div');
  panel.id = 'solplayer-tune-panel';
  Object.assign(panel.style, {
    position: 'absolute',
    right: '0',
    width: '272px',
    padding: '14px',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.65)',
    background: AURORA_BG,
    backdropFilter: 'blur(18px)',
    boxShadow: '0 16px 48px rgba(31,38,60,0.3)',
    color: INK,
    display: 'none',
    textAlign: 'left',
  } as Partial<CSSStyleDeclaration>);

  const title = document.createElement('div');
  title.textContent = 'SolPlayer Tune';
  Object.assign(title.style, {
    font: '700 12px/1 system-ui, sans-serif',
    letterSpacing: '0.08em',
    opacity: '0.75',
    marginBottom: '10px',
  } as Partial<CSSStyleDeclaration>);

  const officialRow = document.createElement('div');
  Object.assign(officialRow.style, {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  } as Partial<CSSStyleDeclaration>);

  const myTitle = document.createElement('div');
  myTitle.textContent = 'マイプリセット';
  Object.assign(myTitle.style, {
    font: '600 11px/1 system-ui, sans-serif',
    opacity: '0.65',
    margin: '12px 0 6px',
  } as Partial<CSSStyleDeclaration>);

  const myRow = document.createElement('div');
  myRow.id = 'solplayer-tune-my-presets';
  Object.assign(myRow.style, {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  } as Partial<CSSStyleDeclaration>);

  const customTitle = document.createElement('div');
  customTitle.textContent = '詳細カスタム（小数第10位まで）';
  Object.assign(customTitle.style, {
    font: '600 11px/1 system-ui, sans-serif',
    opacity: '0.65',
    margin: '12px 0 6px',
  } as Partial<CSSStyleDeclaration>);

  const customRow = document.createElement('div');
  Object.assign(customRow.style, {
    display: 'flex',
    gap: '6px',
  } as Partial<CSSStyleDeclaration>);

  const input = document.createElement('input');
  input.id = 'solplayer-tune-custom';
  input.type = 'text';
  input.inputMode = 'decimal';
  input.placeholder = '例: 432.0981';
  input.setAttribute('aria-label', 'カスタム周波数(Hz)');
  Object.assign(input.style, {
    flex: '1',
    minWidth: '0',
    padding: '8px 10px',
    borderRadius: '12px',
    border: '1px solid rgba(31,36,48,0.16)',
    background: 'rgba(255,255,255,0.8)',
    color: INK,
    font: '600 12px/1 system-ui, sans-serif',
  } as Partial<CSSStyleDeclaration>);

  const applyBtn = document.createElement('button');
  applyBtn.id = 'solplayer-tune-apply';
  applyBtn.type = 'button';
  applyBtn.textContent = '適用';
  styleChip(applyBtn, true);

  const saveBtn = document.createElement('button');
  saveBtn.id = 'solplayer-tune-save';
  saveBtn.type = 'button';
  saveBtn.textContent = '保存';
  styleChip(saveBtn, false);

  const note = document.createElement('div');
  note.textContent = engine.isRateMode()
    ? '440Hzで無変換に戻ります。音声の保存はしません。iOSでは再生速度方式で変換するため、再生がわずかに変わります（432Hzで約1.8%ゆっくり。映像も同期するのでズレは生じません）。'
    : '440Hzで無変換に戻ります。音声の保存はしません。変換中は処理の都合上、映像より音が約0.2〜0.3秒遅れます（音楽用途では実用上問題ありません）。';
  Object.assign(note.style, {
    font: '500 10px/1.5 system-ui, sans-serif',
    opacity: '0.55',
    marginTop: '10px',
  } as Partial<CSSStyleDeclaration>);

  customRow.append(input, applyBtn, saveBtn);
  panel.append(title, officialRow, myTitle, myRow, customTitle, customRow, note);
  wrap.append(btn, panel);

  const showError = (message: string) => {
    input.value = '';
    input.placeholder = message;
  };

  const render = () => {
    btn.textContent = `♪ ${formatHz(currentHz)}Hz`;
    const active = currentHz !== BASE_HZ;
    btn.style.background = active ? ACTIVE_GRADIENT : 'rgba(255,255,255,0.82)';
    btn.style.color = active ? '#fff' : INK;
    btn.style.boxShadow = active
      ? '0 8px 24px rgba(167,139,250,0.5)'
      : '0 8px 24px rgba(31,36,48,0.25)';
    btn.title = active
      ? `${formatHz(currentHz)}Hzで変換中。クリックで設定`
      : 'クリックでチューニング設定（SolPlayer Tune）';

    officialRow.replaceChildren(
      ...OFFICIAL_PRESETS.map(({ hz, label }) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.textContent = label;
        chip.dataset.hz = formatHz(hz);
        styleChip(chip, hz === currentHz);
        chip.addEventListener('click', () => {
          if (!applyHz(hz)) showError('動画がありません');
          render();
        });
        return chip;
      })
    );

    const myPresets = loadMyPresets();
    myTitle.style.display = myPresets.length > 0 ? '' : 'none';
    myRow.style.display = myPresets.length > 0 ? 'flex' : 'none';
    myRow.replaceChildren(
      ...myPresets.map((hz) => {
        const chip = document.createElement('div');
        chip.dataset.hz = formatHz(hz);
        Object.assign(chip.style, {
          display: 'inline-flex',
          alignItems: 'center',
          gap: '2px',
        } as Partial<CSSStyleDeclaration>);
        const apply = document.createElement('button');
        apply.type = 'button';
        apply.textContent = `${formatHz(hz)}Hz`;
        styleChip(apply, hz === currentHz);
        apply.style.borderRadius = '9999px 0 0 9999px';
        apply.addEventListener('click', () => {
          if (!applyHz(hz)) showError('動画がありません');
          render();
        });
        const del = document.createElement('button');
        del.type = 'button';
        del.textContent = '×';
        del.title = 'このプリセットを削除';
        del.setAttribute('aria-label', `${formatHz(hz)}Hzのプリセットを削除`);
        styleChip(del, false);
        del.style.borderRadius = '0 9999px 9999px 0';
        del.style.padding = '7px 9px';
        del.addEventListener('click', () => {
          saveMyPresets(loadMyPresets().filter((p) => p !== hz));
          render();
        });
        chip.append(apply, del);
        return chip;
      })
    );
  };

  const parseInput = (): number | null => {
    const hz = Number.parseFloat(input.value.trim());
    if (!isValidHz(hz)) {
      showError(`${MIN_HZ}〜${MAX_HZ}の数値を入力`);
      return null;
    }
    return Number(hz.toFixed(10));
  };

  applyBtn.addEventListener('click', () => {
    const hz = parseInput();
    if (hz === null) return;
    if (!applyHz(hz)) showError('動画がありません');
    render();
  });

  saveBtn.addEventListener('click', () => {
    const hz = parseInput();
    if (hz === null) return;
    const officials = OFFICIAL_PRESETS.map((p) => p.hz);
    const presets = loadMyPresets().filter((p) => p !== hz);
    if (!officials.includes(hz)) {
      presets.unshift(hz);
      saveMyPresets(presets);
    }
    if (!applyHz(hz)) showError('動画がありません');
    render();
  });

  btn.addEventListener('click', () => {
    const open = panel.style.display === 'none';
    if (open) {
      // アンカー配置なら下へ、右下固定なら上へ開く
      panel.style.top = wrap.style.position === 'fixed' ? '' : 'calc(100% + 8px)';
      panel.style.bottom = wrap.style.position === 'fixed' ? 'calc(100% + 8px)' : '';
    }
    panel.style.display = open ? 'block' : 'none';
  });

  document.addEventListener('click', (e) => {
    const target = e.target as Node;
    // チップ適用時の再描画で要素がDOMから外れると contains が false になるため、
    // 切り離された要素からのクリックは「外側」と誤判定しない
    if (
      panel.style.display !== 'none' &&
      target.isConnected &&
      !wrap.contains(target)
    ) {
      panel.style.display = 'none';
    }
  });

  render();
  return { wrap, render };
}

/**
 * UIの配置先を決める。
 * YouTube視聴ページでは動画直下（#below の先頭・右寄せ）に置き、
 * 見つからないページでは画面右下固定にフォールバックする。
 */
function placeUi(wrap: HTMLDivElement): void {
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
    if (wrap.parentElement !== host) {
      host.appendChild(wrap);
    }
    wrap.style.position = 'relative';
    wrap.style.right = '';
    wrap.style.bottom = '';
    return;
  }
  // フォールバック: 画面右下固定
  if (!wrap.isConnected) {
    document.documentElement.appendChild(wrap);
  }
  wrap.style.position = 'fixed';
  wrap.style.right = '16px';
  wrap.style.bottom = '16px';
}

/** UIを注入する（SPA遷移で外れた場合は置き直す） */
function injectUi(): void {
  if (!ui) {
    ui = buildUi();
  }
  placeUi(ui.wrap);
}

/**
 * 保存されている周波数（440以外）をページ表示時に自動適用する。
 *
 * ブラウザはユーザー操作前のAudioContext起動を禁止しているため、
 * 操作前に音声経路へ触ると逆に無音になる。そこで:
 * - 既にこのページで操作履歴があれば（SPA遷移後など）即適用
 * - 無ければ最初のクリック/キー操作を1回だけ捕まえて適用
 */
function autoEngageSavedFrequency(): void {
  if (currentHz === BASE_HZ) return;
  const apply = () => {
    const video = findVideo();
    if (video && engine.setFrequency(video, currentHz)) {
      ui?.render();
      return true;
    }
    return false;
  };
  // 再生速度方式はAudioContextを使わないため、操作を待たず即適用できる。
  // ページ表示直後はvideo要素がまだ無いことがあるので、しばらくリトライする
  if (engine.isRateMode()) {
    if (apply()) return;
    let tries = 0;
    const timer = setInterval(() => {
      if (apply() || ++tries >= 20) clearInterval(timer);
    }, 500);
    return;
  }
  const activation = (
    navigator as unknown as { userActivation?: { hasBeenActive?: boolean } }
  ).userActivation;
  if (activation?.hasBeenActive) {
    apply();
    return;
  }
  const onGesture = () => {
    document.removeEventListener('pointerdown', onGesture, true);
    document.removeEventListener('keydown', onGesture, true);
    apply();
  };
  document.addEventListener('pointerdown', onGesture, true);
  document.addEventListener('keydown', onGesture, true);
}

injectUi();
autoEngageSavedFrequency();
// SPA遷移でUIが消えた/配置先が変わった場合に備えて監視（過剰動作を抑えるスロットル付き）
let injectQueued = false;
new MutationObserver(() => {
  if (injectQueued) return;
  injectQueued = true;
  setTimeout(() => {
    injectQueued = false;
    injectUi();
    // SPA遷移でvideo要素ごと差し替わった場合、変換を新しいvideoへ引き継ぐ
    const video = findVideo();
    if (video && currentHz !== BASE_HZ && engine.needsReattach(video)) {
      if (engine.setFrequency(video, currentHz)) {
        ui?.render();
      }
    }
  }, 500);
}).observe(document.documentElement, { childList: true, subtree: true });

// テスト用フック（E2E検証で使用）
(window as unknown as { __solplayerTune?: unknown }).__solplayerTune = {
  setFrequency: (hz: number) => {
    const video = findVideo();
    if (!video) return false;
    const ok = engine.setFrequency(video, hz);
    if (ok) {
      currentHz = hz;
      saveHz(hz);
      ui?.render();
    }
    return ok;
  },
  setRateMode: (on: boolean) => engine.setRateMode(on),
  isRateMode: () => engine.isRateMode(),
};
