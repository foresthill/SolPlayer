import { AudioPlayer } from '@/components/player/audio-player';

export default function Home() {
  return (
    <div className="flex min-h-full items-start justify-center pt-2 sm:pt-6">
      <AudioPlayer />
    </div>
  );
}
