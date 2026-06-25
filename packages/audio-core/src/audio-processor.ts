/**
 * オーディオプロセッサ
 *
 * Web Audio APIとTone.jsを統合した音声処理
 */

import * as Tone from 'tone';
import { PitchShifter } from './pitch-shifter';

export interface AudioProcessorConfig {
  frequency: number;
  playbackSpeed: number;
  volume: number;
}

export class AudioProcessor {
  private player: Tone.Player | null = null;
  private pitchShifter: PitchShifter;
  private volume: Tone.Volume;
  private isPlaying: boolean = false;
  private duration: number = 0;
  private playbackSpeed: number = 1.0;

  /** 再生開始時のトラック内オフセット（秒） */
  private startOffset: number = 0;
  /** 再生開始時のAudioContext時刻（秒） */
  private startContextTime: number = 0;
  /** 一時停止・停止中の再生位置（秒） */
  private pausedAt: number = 0;

  /** トラックが最後まで再生されたときのコールバック */
  private onEndedCallback: (() => void) | null = null;

  constructor() {
    this.pitchShifter = new PitchShifter();
    this.volume = new Tone.Volume(0);
  }

  /**
   * 初期化
   */
  async initialize(): Promise<void> {
    await this.pitchShifter.initialize();
  }

  /**
   * 音声ファイルをロード
   *
   * バッファのデコード完了を待ってから解決する。
   *
   * @param url - 音声ファイルのURL（ローカルファイルのObjectURLも可）
   */
  async load(url: string): Promise<void> {
    if (this.player) {
      this.player.dispose();
      this.player = null;
    }

    this.isPlaying = false;
    this.pausedAt = 0;
    this.startOffset = 0;

    const player = new Tone.Player();
    // エフェクトチェーン: Player → PitchShift → Volume → Destination
    player.chain(this.pitchShifter.getNode(), this.volume, Tone.Destination);
    player.playbackRate = this.playbackSpeed;
    player.onstop = () => this.handleStop();

    await player.load(url);

    this.player = player;
    this.duration = player.buffer.duration;
  }

  /**
   * Tone.Player停止時のハンドラ
   *
   * 自然終了（トラック末尾到達）のみコールバックを発火する。
   * pause()/stop()/seek()による意図的な停止は内部フラグで無視する。
   */
  private handleStop(): void {
    if (!this.isPlaying) return;
    // 再生中に勝手に止まった = 末尾まで到達した
    this.isPlaying = false;
    this.pausedAt = 0;
    this.startOffset = 0;
    this.onEndedCallback?.();
  }

  /**
   * 再生（一時停止位置から再開）
   */
  async play(): Promise<void> {
    if (!this.player || this.isPlaying) return;

    await Tone.start();
    this.startFrom(this.pausedAt);
  }

  /**
   * 指定オフセットから内部的に再生を開始する
   */
  private startFrom(offset: number): void {
    if (!this.player) return;

    this.startOffset = offset;
    this.startContextTime = Tone.now();
    this.isPlaying = true;
    this.player.start(undefined, offset);
  }

  /**
   * 一時停止（位置を保持）
   */
  pause(): void {
    if (!this.player || !this.isPlaying) return;

    this.pausedAt = this.getCurrentTime();
    this.isPlaying = false;
    // handleStopが自然終了と誤認しないよう、先にフラグを下ろしてから停止
    this.player.stop();
  }

  /**
   * 停止（先頭に戻す）
   */
  stop(): void {
    if (!this.player) return;

    const wasPlaying = this.isPlaying;
    this.isPlaying = false;
    this.pausedAt = 0;
    this.startOffset = 0;
    if (wasPlaying) {
      this.player.stop();
    }
  }

  /**
   * シーク
   *
   * @param time - 再生位置（秒）
   */
  seek(time: number): void {
    if (!this.player) return;

    const clamped = Math.max(0, Math.min(time, this.duration));

    if (this.isPlaying) {
      // 再生中: いったん意図的に停止してから新しい位置で再開
      this.isPlaying = false;
      this.player.stop();
      this.startFrom(clamped);
    } else {
      this.pausedAt = clamped;
    }
  }

  /**
   * 周波数設定
   */
  setFrequency(baseHz: number, targetHz: number): void {
    this.pitchShifter.setFrequency(baseHz, targetHz);
  }

  /**
   * 再生速度設定
   */
  setPlaybackSpeed(speed: number): void {
    this.playbackSpeed = speed;
    if (!this.player) return;

    // 再生中の場合は、現在位置を基準点に取り直してから速度を変更する
    // （getCurrentTimeの計算が速度変更前後で連続するようにするため）
    if (this.isPlaying) {
      this.startOffset = this.getCurrentTime();
      this.startContextTime = Tone.now();
    }
    this.player.playbackRate = speed;
  }

  /**
   * ボリューム設定
   *
   * @param vol - ボリューム（0-1）
   */
  setVolume(vol: number): void {
    const db = Tone.gainToDb(vol);
    this.volume.volume.value = db;
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
    if (!this.isPlaying) {
      return this.pausedAt;
    }
    const elapsed = (Tone.now() - this.startContextTime) * this.playbackSpeed;
    return Math.min(this.startOffset + elapsed, this.duration);
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
    this.player?.dispose();
    this.pitchShifter.dispose();
    this.volume.dispose();
  }
}
