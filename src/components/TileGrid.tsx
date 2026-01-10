'use client';

import Tile from './Tile';
import { speak } from '@/lib/tts';

export interface TileData {
  id: number;
  text: string;
  emoji: string;
  isSuggested?: boolean;
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
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
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
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-white/5 backdrop-blur-3xl rounded-[3rem] border border-white/10 shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-1000">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full animate-pulse" />
          <div className="text-7xl relative">📸</div>
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">Ready to Listen & See</h3>
        <p className="text-gray-400 max-w-xs mx-auto leading-relaxed">
          Point the camera at your world. I&apos;ll help you find the right words.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
      {tiles.map((tile) => (
        <Tile
          key={tile.id}
          text={tile.text}
          emoji={tile.emoji}
          isSuggested={tile.isSuggested}
          onClick={() => handleTileClick(tile)}
        />
      ))}
    </div>
  );
}
