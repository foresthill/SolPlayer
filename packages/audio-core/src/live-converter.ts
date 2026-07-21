/// <reference path="./soundtouchjs.d.ts" />
/**
 * ライブ音声変換（タブ音声キャプチャ→リアルタイム周波数変換）
 *
 * getDisplayMedia等で得たMediaStreamの音声を、保存せずにその場で
 * SoundTouchに通してピッチのみ変換して出力する。
 * YouTube等の埋め込み/別タブ再生に周波数変換を適用するための機構。
 *
 * データフロー:
 *   MediaStream → ScriptProcessor(入力キャプチャ) → キュー
 *     → SimpleFilter(SoundTouch) → ScriptProcessor(出力) → Gain → 出力
 */

import { SoundTouch, SimpleFilter, getWebAudioNode } from 'soundtouchjs';
import { FrequencyConverter } from './frequency-converter';

const BUFFER_SIZE = 4096;
/** 入力キューがこの秒数を超えたら古いサンプルを捨てて遅延の蓄積を防ぐ */
const MAX_QUEUE_SECONDS = 2;

/**
 * ライブ入力のリングキュー。SimpleFilterのソースとして振る舞う。
 * 足りないフレームは供給しない（無音を挿入せず遅延の蓄積を防ぐ）。
 */
class LiveStreamSource {
  private queue: Float32Array[] = [];
  /** queue[0]内の読み出し済みフレーム数 */
  private readFrames = 0;
  private availableFrames = 0;
  private maxFrames: number;

  constructor(sampleRate: number) {
    this.maxFrames = sampleRate * MAX_QUEUE_SECONDS;
  }

  /** 入力チャンク（インターリーブ済み）を追加 */
  push(interleaved: Float32Array): void {
    this.queue.push(interleaved);
    this.availableFrames += interleaved.length / 2;

    // 上限超過分は古い方から捨てる（リアルタイム追従を優先）
    while (this.availableFrames > this.maxFrames && this.queue.length > 1) {
      const dropped = this.queue.shift()!;
      this.availableFrames -= (dropped.length / 2 - this.readFrames);
      this.readFrames = 0;
    }
  }

  extract(target: Float32Array, numFrames: number): number {
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
    this.availableFrames -= written;
    return written;
  }
}

export class LiveConverter {
  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private captureNode: ScriptProcessorNode | null = null;
  private outputNode: ScriptProcessorNode | null = null;
  private muteGain: GainNode | null = null;
  private gain: GainNode | null = null;
  private soundtouch: SoundTouch | null = null;

  private running = false;
  private semitones = 0;
  private volumeLevel = 1.0;
  private onStoppedCallback: (() => void) | null = null;

  /**
   * キャプチャ済みMediaStreamで変換を開始する。
   * 音声トラックが無い場合はエラーを投げる。
   */
  async start(stream: MediaStream): Promise<void> {
    this.stop();

    if (stream.getAudioTracks().length === 0) {
      stream.getTracks().forEach((t) => t.stop());
      throw new Error('NO_AUDIO_TRACK');
    }
    // 映像は不要なので即停止（CPU節約）。音声トラックは残る
    stream.getVideoTracks().forEach((t) => t.stop());

    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const context = new Ctx();
    if (context.state === 'suspended') {
      await context.resume();
    }

    const liveSource = new LiveStreamSource(context.sampleRate);
    const soundtouch = new SoundTouch();
    soundtouch.tempo = 1.0;
    soundtouch.pitchSemitones = this.semitones;
    const filter = new SimpleFilter(liveSource, soundtouch);

    // 入力キャプチャ: MediaStream → ScriptProcessor → キュー
    const sourceNode = context.createMediaStreamSource(stream);
    const captureNode = context.createScriptProcessor(BUFFER_SIZE, 2, 1);
    captureNode.onaudioprocess = (e) => {
      const input = e.inputBuffer;
      const left = input.getChannelData(0);
      const right =
        input.numberOfChannels > 1 ? input.getChannelData(1) : left;
      const interleaved = new Float32Array(left.length * 2);
      for (let i = 0; i < left.length; i++) {
        interleaved[i * 2] = left[i];
        interleaved[i * 2 + 1] = right[i];
      }
      liveSource.push(interleaved);
    };
    // ScriptProcessorは出力先に繋がないと駆動しないため無音ゲイン経由で接続
    const muteGain = context.createGain();
    muteGain.gain.value = 0;
    sourceNode.connect(captureNode);
    captureNode.connect(muteGain);
    muteGain.connect(context.destination);

    // 出力: SimpleFilter → ScriptProcessor → Gain → スピーカー
    const outputNode = getWebAudioNode(context, filter, undefined, BUFFER_SIZE);
    const gain = context.createGain();
    gain.gain.value = this.volumeLevel;
    outputNode.connect(gain);
    gain.connect(context.destination);

    // 共有停止（ブラウザUIからの停止含む）で自動終了
    stream.getAudioTracks().forEach((track) => {
      track.addEventListener('ended', () => {
        if (this.running) {
          this.stop();
          this.onStoppedCallback?.();
        }
      });
    });

    this.context = context;
    this.stream = stream;
    this.sourceNode = sourceNode;
    this.captureNode = captureNode;
    this.outputNode = outputNode;
    this.muteGain = muteGain;
    this.gain = gain;
    this.soundtouch = soundtouch;
    this.running = true;
  }

  /** 周波数設定（ピッチのみ変換） */
  setFrequency(baseHz: number, targetHz: number): void {
    this.semitones = FrequencyConverter.toSemitones(baseHz, targetHz);
    if (this.soundtouch) {
      this.soundtouch.pitchSemitones = this.semitones;
    }
  }

  setVolume(vol: number): void {
    this.volumeLevel = vol;
    if (this.gain) {
      this.gain.gain.value = vol;
    }
  }

  /** 停止時（共有終了含む）の通知 */
  setOnStopped(callback: (() => void) | null): void {
    this.onStoppedCallback = callback;
  }

  getIsRunning(): boolean {
    return this.running;
  }

  stop(): void {
    this.running = false;
    if (this.captureNode) {
      this.captureNode.onaudioprocess = null;
      this.captureNode.disconnect();
      this.captureNode = null;
    }
    for (const node of [this.sourceNode, this.outputNode, this.muteGain, this.gain]) {
      node?.disconnect();
    }
    this.sourceNode = null;
    this.outputNode = null;
    this.muteGain = null;
    this.gain = null;
    this.soundtouch = null;
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.context) {
      void this.context.close().catch(() => {});
      this.context = null;
    }
  }
}
