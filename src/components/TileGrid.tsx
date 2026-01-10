'use client';

import Tile from './Tile';
import { speak } from '@/lib/tts';
import { DisplayTile } from '@/lib/tiles';
import { getTileColor } from '@/lib/tile-colors';

interface TileGridProps {
  tiles: DisplayTile[];
  isLoading?: boolean;
  onTileSpeak?: (text: string) => void;
}

export default function TileGrid({ tiles, isLoading, onTileSpeak }: TileGridProps) {
  const handleTileClick = (tile: DisplayTile) => {
    const textToSpeak = tile.tts || tile.text;
    if (textToSpeak) {
      speak(textToSpeak);
      onTileSpeak?.(textToSpeak);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-3 w-full max-w-sm mx-auto">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <Tile
            key={i}
            text=""
            emoji=""
            color="bg-white/20"
            onClick={() => {}}
            isLoading={true}
          />
        ))}
      </div>
    );
  }

  if (tiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="text-6xl mb-4">📸</div>
        <h3 className="text-xl font-bold text-white mb-2">Ready to Listen & See</h3>
        <p className="text-white/60 max-w-xs mx-auto">
          Point the camera at your world. I&apos;ll help you find the right words.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3 w-full max-w-sm mx-auto">
      {tiles.slice(0, 9).map((tile) => (
        <Tile
          key={tile.id}
          text={tile.text}
          emoji={tile.emoji}
          color={getTileColor(tile.id, tile.text)}
          onClick={() => handleTileClick(tile)}
        />
      ))}
    </div>
  );
}
