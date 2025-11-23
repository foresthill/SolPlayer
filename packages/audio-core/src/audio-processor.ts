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
  private currentTime: number = 0;
  private duration: number = 0;

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
   * @param url - 音声ファイルのURL
   */
  async load(url: string): Promise<void> {
    if (this.player) {
      this.player.dispose();
    }

    this.player = new Tone.Player({
      url,
      onload: () => {
        this.duration = this.player?.buffer.duration || 0;
      }
    });

    // エフェクトチェーン: Player → PitchShift → Volume → Destination
    this.player
      .chain(this.pitchShifter.getNode(), this.volume, Tone.Destination);
  }

  /**
   * 再生
   */
  async play(): Promise<void> {
    if (!this.player) return;

    await Tone.start();
    this.player.start();
    this.isPlaying = true;
  }

  /**
   * 一時停止
   */
  pause(): void {
    if (!this.player) return;

    this.player.stop();
    this.isPlaying = false;
  }

  /**
   * 停止
   */
  stop(): void {
    if (!this.player) return;

    this.player.stop();
    this.currentTime = 0;
    this.isPlaying = false;
  }

  /**
   * シーク
   *
   * @param time - 再生位置（秒）
   */
  seek(time: number): void {
    if (!this.player) return;

    const wasPlaying = this.isPlaying;
    this.player.stop();
    this.player.start(0, time);

    if (!wasPlaying) {
      this.player.stop();
    }

    this.currentTime = time;
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
    if (!this.player) return;
    this.player.playbackRate = speed;
  }

  /**
   * ボリューム設定
   *
   * @param volume - ボリューム（0-1）
   */
  setVolume(vol: number): void {
    const db = Tone.gainToDb(vol);
    this.volume.volume.value = db;
  }

  /**
   * 現在の再生位置を取得
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
    this.player?.dispose();
    this.pitchShifter.dispose();
    this.volume.dispose();
  }
}
