import { AudioPlayer } from '@/components/player/audio-player';

export default function Home() {
  return (
    <div className="flex min-h-full flex-col items-center justify-start pt-2 sm:pt-6">
      <AudioPlayer />
      {/* ブラウザ拡張（SolPlayer Tune）への導線 */}
      <p className="pb-6 pt-4 text-center text-xs opacity-70">
        <a href="/tune" className="underline">
          🧩 ブラウザ拡張「SolPlayer Tune」— YouTubeを432Hzで聴く（無料）
        </a>
      </p>
    </div>
  );
}
