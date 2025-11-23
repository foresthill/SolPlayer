/**
 * 周波数変換
 *
 * iOS Swift実装参照: apps/ios/SolPlayer/Sources/Audio/FrequencyConverter.swift
 */

export class FrequencyConverter {
  /**
   * 周波数をセミトーンに変換
   *
   * 計算式: semitones = 12 * log2(target / base)
   *
   * @example
   * FrequencyConverter.toSemitones(440, 432) // => -0.3176
   */
  static toSemitones(baseHz: number, targetHz: number): number {
    if (baseHz <= 0 || targetHz <= 0) {
      throw new Error('Frequency must be positive');
    }
    return 12 * Math.log2(targetHz / baseHz);
  }

  /**
   * セミトーンを周波数に変換
   *
   * 計算式: frequency = base * 2^(semitones / 12)
   */
  static toFrequency(baseHz: number, semitones: number): number {
    if (baseHz <= 0) {
      throw new Error('Base frequency must be positive');
    }
    return baseHz * Math.pow(2, semitones / 12);
  }

  /**
   * 周波数プリセット
   */
  static readonly PRESETS = {
    STANDARD: 440,    // A=440Hz 標準
    HEALING: 432,     // A=432Hz ヒーリング
    CRYSTAL: 444,     // A=444Hz クリスタル
    SCIENTIFIC: 437,  // A=437Hz 科学的
  } as const;

  /**
   * プリセット名から周波数取得
   */
  static getPreset(name: keyof typeof FrequencyConverter.PRESETS): number {
    return this.PRESETS[name];
  }

  /**
   * セント単位で差を取得（1セミトーン = 100セント）
   */
  static toCents(baseHz: number, targetHz: number): number {
    return this.toSemitones(baseHz, targetHz) * 100;
  }
}
