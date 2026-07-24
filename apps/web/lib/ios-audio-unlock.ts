/**
 * iOSのマナー（消音）スイッチ対策
 *
 * iOS SafariではWeb Audioの出力が「着信音」カテゴリ扱いになり、
 * マナースイッチONだと無音になる。無音の<audio>要素を再生して
 * 音声セッションを「メディア再生」カテゴリへ切り替えることで、
 * マナースイッチに関係なくWeb Audioが鳴るようにする（標準的な回避策）。
 *
 * 自動再生制限があるため、最初のユーザー操作時に一度だけ実行する。
 */

/** 0.05秒の無音WAV（8kHz mono） */
const SILENT_WAV =
  'data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YSADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

let installed = false;
let unlockElement: HTMLAudioElement | null = null;

export function installIosAudioUnlock(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;

  const unlock = () => {
    if (unlockElement) return;
    const el = document.createElement('audio');
    el.setAttribute('playsinline', '');
    el.src = SILENT_WAV;
    el.loop = true;
    el.volume = 0.001;
    void el.play().catch(() => {
      // 再生できない環境（デスクトップ等）では不要なので無視
      unlockElement = null;
    });
    unlockElement = el;
    document.removeEventListener('touchend', unlock);
    document.removeEventListener('click', unlock);
  };

  document.addEventListener('touchend', unlock, { passive: true });
  document.addEventListener('click', unlock, { passive: true });
}
