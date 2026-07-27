/**
 * soundtouchjs @0.3.0 の型宣言
 *
 * 本体に型定義が同梱されていないため、本プロジェクトで使用するAPIのみ宣言する。
 * 参照: node_modules/soundtouchjs/dist/soundtouch.js の PitchShifter クラス
 */
declare module 'soundtouchjs' {
  export interface PitchShifterPlayDetail {
    timePlayed: number;
    formattedTimePlayed: string;
    percentagePlayed: number;
  }

  /**
   * AudioBufferを再生しながらテンポ／ピッチを独立に変換するノードラッパー。
   * `node` を出力先に connect すると再生が始まり、disconnect で一時停止する。
   */
  export class PitchShifter {
    constructor(
      context: BaseAudioContext,
      buffer: AudioBuffer,
      bufferSize: number,
      onEnd?: () => void
    );

    /** 内部のScriptProcessorNode。出力先へ connect する。 */
    readonly node: AudioNode;
    readonly duration: number;
    readonly sampleRate: number;
    readonly formattedDuration: string;
    readonly formattedTimePlayed: string;

    /** 再生済み秒数（再生中に更新される） */
    timePlayed: number;
    sourcePosition: number;

    /**
     * 再生位置。getは0-100(%)を返すが、setは0-1(分数)を期待する
     * （soundtouchjs 0.3.0 の非対称仕様）。setするとシークになる。
     */
    percentagePlayed: number;

    /** ピッチ倍率（1.0=変化なし） */
    set pitch(value: number);
    /** ピッチをセミトーン単位で指定（テンポは維持） */
    set pitchSemitones(value: number);
    /** サンプルレート倍率（テンポ・ピッチ両方変化） */
    set rate(value: number);
    /** テンポ倍率（ピッチは維持） */
    set tempo(value: number);

    connect(toNode: AudioNode): void;
    disconnect(): void;
    on(event: 'play', cb: (detail: PitchShifterPlayDetail) => void): void;
    off(event?: string): void;
  }

  /** SimpleFilterが吸い出すサンプル供給源のインターフェース */
  export interface SoundTouchSource {
    /**
     * インターリーブ(L,R,L,R...)でtargetへ書き込み、供給したフレーム数を返す。
     * ライブストリーム源は position を無視してよい。
     */
    extract(target: Float32Array, numFrames: number, position: number): number;
  }

  /** テンポ/ピッチ変換のコアパイプライン */
  export class SoundTouch {
    set pitch(value: number);
    set pitchSemitones(value: number);
    set rate(value: number);
    set tempo(value: number);
  }

  /** ソース→SoundTouch→出力の変換フィルタ */
  export class SimpleFilter {
    constructor(sourceSound: SoundTouchSource, pipe: SoundTouch, callback?: () => void);
    /** 変換済みサンプルをインターリーブで取り出す。返り値は実フレーム数 */
    extract(target: Float32Array, numFrames: number): number;
    sourcePosition: number;
    onEnd(): void;
  }

  /**
   * filter.extract() を出力し続けるScriptProcessorNodeを生成する
   */
  export function getWebAudioNode(
    context: BaseAudioContext,
    filter: SimpleFilter,
    sourcePositionCallback?: (sourcePosition: number) => void,
    bufferSize?: number
  ): ScriptProcessorNode;
}
