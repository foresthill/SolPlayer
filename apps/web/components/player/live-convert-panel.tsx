'use client';

import { useEffect, useRef, useState } from 'react';
import { LiveConverter } from '@solplayer/audio-core';
import { parseYouTubeId } from './youtube-panel';

interface LiveConvertPanelProps {
  /** プレイヤーで選択中の基調周波数（チューニングタブと連動） */
  frequency: number;
}

type LiveState = 'idle' | 'running' | 'unsupported';

/**
 * ライブ変換（タブ音声キャプチャ→リアルタイム周波数変換）
 *
 * 同一タブ内の埋め込みをキャプチャすると変換後の音まで再キャプチャして
 * ハウリングするため、「①別タブでYouTubeを開く→②そのタブをキャプチャ」
 * の2ステップ方式を取る。PCのChrome/Edge向け。
 */
export function LiveConvertPanel({ frequency }: LiveConvertPanelProps) {
  const converterRef = useRef<LiveConverter | null>(null);
  const [state, setState] = useState<LiveState>('idle');
  const [error, setError] = useState<string | null>(null);
  // suppressLocalAudioPlaybackが効かなかった場合の手動ミュート案内
  const [needsManualMute, setNeedsManualMute] = useState(false);
  // 開きたい動画のURL（任意。空ならYouTubeトップを開く）
  const [urlInput, setUrlInput] = useState('');
  const videoId = parseYouTubeId(urlInput);

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

  const openVideoTab = () => {
    const url = videoId
      ? `https://www.youtube.com/watch?v=${videoId}`
      : 'https://www.youtube.com';
    window.open(url, '_blank', 'noopener');
  };

  const start = async () => {
    const converter = converterRef.current;
    if (!converter) return;
    setError(null);
    setNeedsManualMute(false);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          // キャプチャ元タブの音を消し、変換後の音だけを聴く
          // （audio制約の中に入れるのが正しい仕様。タブ共有時のみ有効）
          suppressLocalAudioPlayback: true,
          // 音声通話用の処理を必ず無効化する。特にノイズ抑制は
          // 音楽の持続成分（ベース/パッド/残響）をノイズと誤認して
          // 削り取り、スカスカな音になる
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 2,
        } as MediaTrackConstraints,
        // 自タブは候補から除外（自分の出力を再キャプチャするハウリング防止）
        ...({ selfBrowserSurface: 'exclude' } as object),
      });
      // ダイアログ側の設定で音声処理が有効になっていた場合に備えて再適用
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack?.applyConstraints) {
        void audioTrack
          .applyConstraints({
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          })
          .catch(() => {});
      }

      await converter.start(stream);
      converter.setFrequency(440, frequency);

      // 元タブの消音が効いたか確認し、効いていなければ手動ミュートを案内
      const settings = stream.getAudioTracks()[0]?.getSettings() as
        | (MediaTrackSettings & { suppressLocalAudioPlayback?: boolean })
        | undefined;
      setNeedsManualMute(settings?.suppressLocalAudioPlayback !== true);

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
    setNeedsManualMute(false);
  };

  if (state === 'unsupported') {
    return (
      <p className="text-[0.7rem] leading-relaxed text-ink-faint">
        埋め込み再生には周波数変換を直接適用できませんが、PCのChrome/Edgeなら「ライブ変換」（タブ音声をキャプチャしてリアルタイム変換）が使えます。このブラウザは非対応です。
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold tracking-wide">
            YouTubeを{frequency}Hzで聴く（ライブ変換・PCのChrome/Edge）
          </h2>
          <p className="mt-1 text-xs text-ink-soft">
            別タブで再生中の音を、保存せずその場で{frequency}Hzに変換して聴けます。周波数はチューニングと連動。
          </p>
        </div>
        {state === 'running' && (
          <span className="flex shrink-0 items-center gap-1.5 text-xs text-ink">
            <span className="eq-bars text-ink-soft">
              <span />
              <span />
              <span />
            </span>
            変換中
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
        <div className="space-y-2">
          <input
            type="text"
            inputMode="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="YouTubeのURL（空でもOK。①でYouTubeを開いて選べます）"
            className="glass-input w-full text-sm"
            aria-label="ライブ変換のYouTube URL"
          />
          {/* 同一タブのキャプチャはハウリングするため、キャプチャ用のタブを開いて使う2ステップ */}
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              className="glass-chip px-4 py-2 text-left text-sm"
              onClick={openVideoTab}
            >
              <span className="mr-2 font-semibold">①</span>
              {videoId ? 'この動画を別タブで開く' : 'YouTubeを別タブで開く'}
            </button>
            <button
              type="button"
              className="glass-chip px-4 py-2 text-left text-sm"
              onClick={() => void start()}
            >
              <span className="mr-2 font-semibold">②</span>
              そのタブをキャプチャして{frequency}Hzで聴く
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-500/80">{error}</p>}

      {state === 'running' && needsManualMute && (
        <p className="text-xs leading-relaxed text-amber-600 dark:text-amber-400">
          お使いの環境では元タブの自動消音が効かないため、音が二重に聞こえる場合があります。その場合はYouTubeのタブを右クリック →「サイトをミュート」してください（ミュートしても変換音はそのまま聴けます）。
        </p>
      )}

      {frequency === 440 && (
        <p className="text-xs leading-relaxed text-amber-600 dark:text-amber-400">
          現在は440Hz（変換なし）です。チューニングタブで432Hzなどを選ぶと効果が分かります。
        </p>
      )}

      <p className="text-[0.7rem] leading-relaxed text-ink-faint">
        ②の共有ダイアログでは「タブ」から①で開いたタブを選び、<strong>「タブの音声も共有する」にチェック</strong>。元のタブは自動で消音され、変換後の音だけが流れます（上の埋め込みプレイヤーは技術制約によりキャプチャできないため、別タブ方式にしています）。音声は保存せずその場で変換するだけです。
      </p>
    </div>
  );
}
