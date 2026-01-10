'use client';

import Tile from './Tile';
import { speak } from '@/lib/tts';
import { DisplayTile } from '@/lib/tiles';

// Re-export for backwards compatibility with LiveAssistant
export interface TileData {
  id: number;
  text: string;
  emoji: string;
  isSuggested?: boolean;
}

interface TileGridProps {
  tiles: DisplayTile[];
  isLoading?: boolean;
  onTileSpeak?: (text: string) => void;
}

export default function TileGrid({ tiles, isLoading, onTileSpeak }: TileGridProps) {
  const handleTileClick = (tile: DisplayTile) => {
    // Use tts text if available, otherwise use label
    const textToSpeak = tile.tts || tile.text;
    if (textToSpeak) {
      speak(textToSpeak);
      onTileSpeak?.(textToSpeak);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
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
    <div className="grid grid-cols-3 gap-4">
      {tiles.map((tile) => (
        <Tile
          key={tile.id}
          text={tile.text}
          emoji={tile.emoji}
          isSuggested={tile.isSuggested}
          isCore={tile.isCore}
          onClick={() => handleTileClick(tile)}
        />
      ))}
    </div>
  );
}
