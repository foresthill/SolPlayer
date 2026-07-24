/// <reference path="./soundtouchjs.d.ts" />
/**
 * オーディオプロセッサ
 *
 * Web Audio API + SoundTouchJS による音声処理。
 * SoundTouchのタイムストレッチにより、テンポとピッチを独立して変換できる:
 *   - 周波数変換(432Hz等): pitchSemitones（テンポは維持）
 *   - 倍速再生:            tempo（ピッチは維持）
 * iOSの AVAudioUnitTimePitch と同様の「テンポ非依存ピッチシフト」を実現する。
 */

import { PitchShifter } from 'soundtouchjs';
import { FrequencyConverter } from './frequency-converter';

export interface AudioProcessorConfig {
  frequency: number;
  playbackSpeed: number;
  volume: number;
}

/** SoundTouchのScriptProcessorバッファサイズ（大きいほど滑らかだが遅延増） */
const BUFFER_SIZE = 4096;

export class AudioProcessor {
  private context: AudioContext | null = null;
  private buffer: AudioBuffer | null = null;
  private shifter: PitchShifter | null = null;
  private gain: GainNode | null = null;

  private isPlaying: boolean = false;
  /** トラック末尾に到達済みか（次のplayで先頭から作り直す） */
  private ended: boolean = false;

  private duration: number = 0;
  private currentTime: number = 0;

  // 現在の変換設定（トラック再ロード／作り直し時に再適用する）
  private semitones: number = 0;
  private tempo: number = 1.0;
  private volumeLevel: number = 0.8;

  private onEndedCallback: (() => void) | null = null;

  /**
   * 初期化（ユーザー操作後に呼び出す）
   */
  async initialize(): Promise<void> {
    if (!this.context) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.context = new Ctx();
    }
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  /**
   * 音声ファイルをロード
   *
   * バッファのデコード完了を待ってから解決する。
   *
   * @param url - 音声ファイルのURL（ローカルファイルのObjectURLも可）
   */
  async load(url: string): Promise<void> {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    await this.loadArrayBuffer(arrayBuffer);
  }

  /**
   * Blob/Fileから直接ロード
   *
   * iOS Safariで不安定な fetch(blob:) を経由しない読み込み経路。
   */
  async loadBlob(blob: Blob): Promise<void> {
    const arrayBuffer = await AudioProcessor.blobToArrayBuffer(blob);
    await this.loadArrayBuffer(arrayBuffer);
  }

  private static blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
    if (typeof blob.arrayBuffer === 'function') {
      return blob.arrayBuffer();
    }
    // 古いSafari向けフォールバック
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(blob);
    });
  }

  private async loadArrayBuffer(arrayBuffer: ArrayBuffer): Promise<void> {
    await this.initialize();
    if (!this.context) return;

    this.buffer = await this.decodeWithFallback(arrayBuffer);
    this.duration = this.buffer.duration;

    // 出力チェーン: PitchShifter → Gain → Destination
    this.teardownShifter();
    if (!this.gain) {
      this.gain = this.context.createGain();
      this.gain.connect(this.context.destination);
    }
    this.gain.gain.value = this.volumeLevel;

    this.buildShifter();
    this.currentTime = 0;
    this.isPlaying = false;
    this.ended = false;
  }

  /**
   * decodeAudioDataの互換ラッパー
   *
   * 古いSafariはPromiseを返さずコールバック形式のみのため両対応する。
   */
  private decodeCompat(data: ArrayBuffer): Promise<AudioBuffer> {
    return new Promise((resolve, reject) => {
      try {
        const maybePromise = this.context!.decodeAudioData(
          data,
          resolve,
          (err) => reject(err ?? new Error('decode error'))
        ) as Promise<AudioBuffer> | undefined;
        if (maybePromise && typeof maybePromise.then === 'function') {
          maybePromise.then(resolve, reject);
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * デコード（フォールバック付き）
   *
   * SafariはID3v2タグ付きMP3等のデコードに失敗することがあるため、
   * 失敗時はID3タグを取り除いて再試行する。
   * 注意: decodeAudioDataは渡したArrayBufferをdetachするブラウザがあるため、
   * 各試行にはコピーを渡す。
   */
  private async decodeWithFallback(data: ArrayBuffer): Promise<AudioBuffer> {
    const stripped = AudioProcessor.stripId3v2(data);
    try {
      return await this.decodeCompat(data.slice(0));
    } catch (firstError) {
      if (stripped) {
        try {
          return await this.decodeCompat(stripped);
        } catch {
          // 下のthrowへ
        }
      }
      throw new Error(
        `DECODE_FAILED: ${
          firstError instanceof Error ? firstError.message : String(firstError)
        }`
      );
    }
  }

  /**
   * 先頭のID3v2タグを取り除いたコピーを返す（タグが無ければnull）
   */
  private static stripId3v2(data: ArrayBuffer): ArrayBuffer | null {
    const bytes = new Uint8Array(data);
    if (
      bytes.length < 10 ||
      bytes[0] !== 0x49 || // 'I'
      bytes[1] !== 0x44 || // 'D'
      bytes[2] !== 0x33 // '3'
    ) {
      return null;
    }
    // サイズはsyncsafe整数（各バイト7bit）
    const size =
      ((bytes[6] & 0x7f) << 21) |
      ((bytes[7] & 0x7f) << 14) |
      ((bytes[8] & 0x7f) << 7) |
      (bytes[9] & 0x7f);
    const hasFooter = (bytes[5] & 0x10) !== 0;
    const total = 10 + size + (hasFooter ? 10 : 0);
    if (total >= bytes.length) return null;
    return data.slice(total);
  }

  /**
   * 現在のバッファからPitchShifterを生成（未接続＝停止状態）
   */
  private buildShifter(): void {
    if (!this.context || !this.buffer) return;

    // 既存のノードが残っていれば切り離してから作り直す
    this.teardownShifter();

    const shifter = new PitchShifter(
      this.context,
      this.buffer,
      BUFFER_SIZE,
      () => this.handleEnded()
    );
    shifter.pitchSemitones = this.semitones;
    shifter.tempo = this.tempo;
    shifter.on('play', (detail) => {
      this.currentTime = detail.timePlayed;
    });

    this.shifter = shifter;
  }

  /**
   * PitchShifterを破棄（出力から切り離す）
   */
  private teardownShifter(): void {
    if (this.shifter) {
      try {
        this.shifter.disconnect();
      } catch {
        // 既に切断済みの場合は無視
      }
      this.shifter = null;
    }
  }

  /**
   * トラック末尾到達時のハンドラ
   */
  private handleEnded(): void {
    this.isPlaying = false;
    this.ended = true;
    this.currentTime = this.duration;
    this.onEndedCallback?.();
  }

  /**
   * 再生（一時停止位置から再開）
   */
  async play(): Promise<void> {
    if (!this.context || !this.buffer || this.isPlaying) return;

    await this.initialize();

    // 末尾まで再生済みなら先頭から作り直す
    if (this.ended || !this.shifter) {
      this.buildShifter();
      this.currentTime = 0;
      this.ended = false;
    }

    if (this.shifter && this.gain) {
      this.shifter.connect(this.gain);
      this.isPlaying = true;
    }
  }

  /**
   * 一時停止（位置を保持）
   */
  pause(): void {
    if (!this.shifter || !this.isPlaying) return;

    this.shifter.disconnect();
    this.isPlaying = false;
  }

  /**
   * 停止（先頭に戻す）
   */
  stop(): void {
    if (this.shifter) {
      this.shifter.disconnect();
      this.shifter.percentagePlayed = 0;
    }
    this.isPlaying = false;
    this.ended = false;
    this.currentTime = 0;
  }

  /**
   * シーク
   *
   * @param time - 再生位置（秒）
   */
  seek(time: number): void {
    if (this.duration <= 0) return;

    const clamped = Math.max(0, Math.min(time, this.duration));

    // 末尾到達後にシークで戻す場合はShifterを作り直す
    if (this.ended) {
      this.buildShifter();
      this.ended = false;
      if (this.isPlaying && this.shifter && this.gain) {
        this.shifter.connect(this.gain);
      }
    }

    if (this.shifter) {
      // 注意: soundtouchjsのpercentagePlayedはgetterが0-100だが
      // setterは0-1(分数)を期待するという非対称仕様。分数を渡す。
      this.shifter.percentagePlayed = clamped / this.duration;
    }
    this.currentTime = clamped;
  }

  /**
   * 周波数設定（ピッチのみ変換、テンポは維持）
   */
  setFrequency(baseHz: number, targetHz: number): void {
    this.semitones = FrequencyConverter.toSemitones(baseHz, targetHz);
    if (this.shifter) {
      this.shifter.pitchSemitones = this.semitones;
    }
  }

  /**
   * 再生速度設定（テンポのみ変更、ピッチは維持）
   */
  setPlaybackSpeed(speed: number): void {
    this.tempo = speed;
    if (this.shifter) {
      this.shifter.tempo = speed;
    }
  }

  /**
   * ボリューム設定
   *
   * @param vol - ボリューム（0-1）
   */
  setVolume(vol: number): void {
    this.volumeLevel = vol;
    if (this.gain) {
      this.gain.gain.value = vol;
    }
  }

  /**
   * トラック終了時のコールバックを登録
   */
  setOnEnded(callback: (() => void) | null): void {
    this.onEndedCallback = callback;
  }

  /**
   * 現在の再生位置を取得（秒）
   */
  getCurrentTime(): number {
    return this.currentTime;
  }

  /**
   * デュレーションを取得
   */
  getDuration(): number {
    return this.duration;
  }

  /**
   * 再生中かどうか
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * クリーンアップ
   */
  dispose(): void {
    this.teardownShifter();
    if (this.gain) {
      this.gain.disconnect();
      this.gain = null;
    }
    if (this.context) {
      this.context.close();
      this.context = null;
    }
    this.buffer = null;
  }
}
