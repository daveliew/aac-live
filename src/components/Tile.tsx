'use client';

interface TileProps {
  text: string;
  emoji: string;
  color: string; // Tailwind bg class (e.g., 'bg-sky-500')
  onClick: () => void;
  isLoading?: boolean;
  compact?: boolean; // Smaller inline style for bar layout
}

export default function Tile({ text, emoji, color, onClick, isLoading, compact }: TileProps) {
  if (isLoading) {
    return (
      <div className={`bg-white/20 animate-pulse ${compact ? 'rounded-xl h-14 w-24' : 'rounded-2xl h-20 w-20'}`} />
    );
  }

  if (compact) {
    // Compact pill-style for horizontal bar
    return (
      <button
        onClick={onClick}
        className={`
          ${color}
          rounded-xl
          px-3 py-2
          flex items-center gap-2
          shadow-md shadow-black/20
          active:scale-95
          transition-transform duration-150
          whitespace-nowrap
          min-w-fit
        `}
      >
        <span className="text-xl">{emoji}</span>
        <span className="text-white font-semibold text-sm">{text}</span>
      </button>
    );
  }

  // Standard tile (larger, for grid layouts if needed)
  return (
    <button
      onClick={onClick}
      className={`
        ${color}
        rounded-2xl
        p-3
        h-20 w-20
        flex flex-col items-center justify-center
        shadow-lg shadow-black/20
        active:scale-95
        transition-transform duration-150
      `}
    >
      <span className="text-2xl mb-0.5">{emoji}</span>
      <span className="text-white font-semibold text-xs text-center leading-tight">
        {text}
      </span>
    </button>
  );
}
