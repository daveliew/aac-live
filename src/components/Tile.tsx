'use client';

interface TileProps {
  text: string;
  emoji: string;
  onClick: () => void;
  isLoading?: boolean;
}

export default function Tile({ text, emoji, onClick, isLoading }: TileProps) {
  if (isLoading) {
    return (
      <div className="bg-gray-700 rounded-2xl p-6 animate-pulse">
        <div className="text-4xl mb-3 opacity-30">...</div>
        <div className="h-4 bg-gray-600 rounded w-3/4 mx-auto"></div>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className="bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-2xl p-6 shadow-lg transition-all active:scale-95 hover:shadow-xl"
    >
      <div className="text-4xl mb-3">{emoji}</div>
      <div className="text-lg font-medium">{text}</div>
    </button>
  );
}
