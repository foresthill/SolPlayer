'use client';

interface TrackInfoProps {
  title: string;
  artist: string;
}

export function TrackInfo({ title, artist }: TrackInfoProps) {
  return (
    <div className="text-center">
      <h2 className="text-xl font-semibold truncate">{title}</h2>
      <p className="text-gray-500 truncate">{artist}</p>
    </div>
  );
}
