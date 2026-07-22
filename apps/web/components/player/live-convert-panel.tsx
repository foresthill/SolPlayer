'use client';

import { useEffect, useRef, useState } from 'react';
import { LiveConverter } from '@solplayer/audio-core';

interface LiveConvertPanelProps {
  /** プレイヤーで選択中の基調周波数（チューニングタブと連動） */
  frequency: number;
}

type LiveState = 'idle' | 'running' | 'unsupported';

/**
 * ライブ変換（タブ音声キャプチャ→リアルタイム周波数変換）
 *
 * 別タブで再生中のYouTube等の音声を画面共有APIでキャプチャし、
 * 保存せずにその場でピッチ変換して出力する。PCのChrome/Edge向け
 * （モバイルブラウザにはタブ音声キャプチャAPIが存在しない）。
 */
export function LiveConvertPanel({ frequency }: LiveConvertPanelProps) {
  const converterRef = useRef<LiveConverter | null>(null);
  const [state, setState] = useState<LiveState>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
      setState('unsupported');
      return;
    }
    const converter = new LiveConverter();
    converterRef.current = converter;
    converter.setOnStopped(() => setState('idle'));
    return () => {
      converter.setOnStopped(null);
      converter.stop();
    };
  }, []);

  // チューニングと連動して周波数を反映
  useEffect(() => {
    converterRef.current?.setFrequency(440, frequency);
  }, [frequency]);

  const start = async () => {
    const converter = converterRef.current;
    if (!converter) return;
    setError(null);
    try {
      // suppressLocalAudioPlayback: キャプチャ元タブの音を消し、変換後の音だけを聴く
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
        // Chrome拡張オプション（型定義に無いためキャスト）
        ...({
          selfBrowserSurface: 'exclude',
          suppressLocalAudioPlayback: true,
        } as object),
      });
      await converter.start(stream);
      converter.setFrequency(440, frequency);
      setState('running');
    } catch (e) {
      if (e instanceof Error && e.message === 'NO_AUDIO_TRACK') {
        setError(
          '音声が取得できませんでした。共有ダイアログで「タブ」を選び、「タブの音声も共有する」にチェックを入れてください。'
        );
      } else if (e instanceof DOMException && e.name === 'NotAllowedError') {
        // ユーザーがキャンセルしただけなのでエラー表示しない
      } else {
        setError('キャプチャを開始できませんでした。Chrome/Edgeでお試しください。');
      }
    }
  };

  const stop = () => {
    converterRef.current?.stop();
    setState('idle');
  };

  if (state === 'unsupported') {
    return (
      <p className="text-[0.7rem] leading-relaxed text-ink-faint">
        埋め込み再生には周波数変換を直接適用できませんが、PCのChrome/Edgeなら「ライブ変換」（タブ音声をキャプチャしてリアルタイム変換）が使えます。このブラウザは非対応です。
      </p>
    );
  }

  return (
    <div className="space-y-2.5 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold tracking-wider text-ink-soft">
          ライブ変換（β）
        </h4>
        {state === 'running' && (
          <span className="flex items-center gap-1.5 text-xs text-ink">
            <span className="eq-bars text-ink-soft">
              <span />
              <span />
              <span />
            </span>
            {frequency}Hzで変換中
          </span>
        )}
      </div>

      {state === 'running' ? (
        <button
          type="button"
          className="glass-chip w-full px-4 py-2 text-sm font-medium"
          onClick={stop}
        >
          ライブ変換を停止
        </button>
      ) : (
        <button
          type="button"
          className="glass-chip w-full px-4 py-2 text-sm font-medium"
          onClick={() => void start()}
        >
          タブの音声をキャプチャして{frequency}Hzで聴く
        </button>
      )}

      {error && <p className="text-xs text-red-500/80">{error}</p>}

      <p className="text-[0.7rem] leading-relaxed text-ink-faint">
        別タブでYouTubeを再生 → 上のボタン → 共有ダイアログでそのタブを選び「タブの音声も共有する」にチェック。音声は保存せず、その場で変換して再生します。周波数はチューニングタブと連動。（PCのChrome/Edge限定）
      </p>
    </div>
  );
}
