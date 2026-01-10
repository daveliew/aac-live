'use client';

import Tile from './Tile';
import { speak } from '@/lib/tts';

export interface TileData {
  id: number;
  text: string;
  emoji: string;
}

interface TileGridProps {
  tiles: TileData[];
  isLoading?: boolean;
}

export default function TileGrid({ tiles, isLoading }: TileGridProps) {
  const handleTileClick = (tile: TileData) => {
    speak(tile.text);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Tile
            key={i}
            text=""
            emoji=""
            onClick={() => {}}
            isLoading={true}
          />
        ))}
      </div>
    );
  }

  if (tiles.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <div className="text-5xl mb-4">📷</div>
        <p className="text-lg">Point your camera at something to get started</p>
        <p className="text-sm mt-2">Tap &quot;Scan Context&quot; to see communication options</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {tiles.map((tile) => (
        <Tile
          key={tile.id}
          text={tile.text}
          emoji={tile.emoji}
          onClick={() => handleTileClick(tile)}
        />
      ))}
    </div>
  );
}
