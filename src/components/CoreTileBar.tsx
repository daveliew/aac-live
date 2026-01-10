'use client';

import { speak } from '@/lib/tts';

interface CoreTile {
  id: string;
  label: string;
  tts: string | null;
  emoji: string;
  color: string;
}

interface CoreTileBarProps {
  onSpeak?: (phrase: string) => void;
}

const CORE_TILES: CoreTile[] = [
  { id: 'core_help', label: 'Help', tts: 'I need help', emoji: '🙋', color: 'bg-blue-600 hover:bg-blue-500' },
  { id: 'core_yes', label: 'Yes', tts: 'Yes', emoji: '✅', color: 'bg-green-600 hover:bg-green-500' },
  { id: 'core_no', label: 'No', tts: 'No', emoji: '❌', color: 'bg-red-600 hover:bg-red-500' },
  { id: 'core_more', label: 'More', tts: null, emoji: '➕', color: 'bg-gray-600 hover:bg-gray-500' },
];

export default function CoreTileBar({ onSpeak }: CoreTileBarProps) {
  const handleClick = (tile: CoreTile) => {
    if (tile.tts) {
      speak(tile.tts);
      onSpeak?.(tile.tts);
    }
    // TODO: Handle "More" action to expand grid
  };

  return (
    <div className="flex gap-3 mb-6">
      {CORE_TILES.map((tile) => (
        <button
          key={tile.id}
          onClick={() => handleClick(tile)}
          className={`flex-1 flex flex-col items-center justify-center gap-2 py-4 px-3 rounded-2xl ${tile.color} transition-all active:scale-95 shadow-lg`}
        >
          <span className="text-3xl">{tile.emoji}</span>
          <span className="text-sm font-bold tracking-wide">{tile.label}</span>
        </button>
      ))}
    </div>
  );
}
