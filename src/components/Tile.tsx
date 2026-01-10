'use client';

interface TileProps {
  text: string;
  emoji: string;
  color: string; // Tailwind bg class (e.g., 'bg-sky-500')
  onClick: () => void;
  isLoading?: boolean;
}

export default function Tile({ text, emoji, color, onClick, isLoading }: TileProps) {
  if (isLoading) {
    return (
      <div className="bg-white/20 rounded-2xl aspect-square animate-pulse" />
    );
  }

  return (
    <button
      onClick={onClick}
      className={`
        ${color}
        rounded-2xl
        p-3
        aspect-square
        flex flex-col items-center justify-center
        shadow-lg shadow-black/20
        active:scale-95
        transition-transform duration-150
      `}
    >
      <span className="text-4xl mb-1">{emoji}</span>
      <span className="text-white font-semibold text-sm text-center leading-tight">
        {text}
      </span>
    </button>
  );
}
