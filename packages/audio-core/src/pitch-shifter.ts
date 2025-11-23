/**
 * ピッチシフター
 *
 * Tone.jsを使用したリアルタイムピッチシフト
 */

import * as Tone from 'tone';
import { FrequencyConverter } from './frequency-converter';

export class PitchShifter {
  private pitchShift: Tone.PitchShift;
  private initialized: boolean = false;

  constructor() {
    this.pitchShift = new Tone.PitchShift();
  }

  /**
   * 初期化（ユーザーインタラクション後に呼び出す）
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await Tone.start();
    this.initialized = true;
  }

  /**
   * 周波数を設定してピッチシフト
   *
   * @param baseHz - 基準周波数（440Hz）
   * @param targetHz - 目標周波数（432Hz等）
   */
  setFrequency(baseHz: number, targetHz: number): void {
    const semitones = FrequencyConverter.toSemitones(baseHz, targetHz);
    this.pitchShift.pitch = semitones;
  }

  /**
   * セミトーン数で直接設定
   */
  setSemitones(semitones: number): void {
    this.pitchShift.pitch = semitones;
  }

  /**
   * Tone.jsノードを取得（エフェクトチェーンに接続）
   */
  getNode(): Tone.PitchShift {
    return this.pitchShift;
  }

  /**
   * クリーンアップ
   */
  dispose(): void {
    this.pitchShift.dispose();
  }
}
