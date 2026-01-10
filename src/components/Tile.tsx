'use client';

interface TileProps {
  text: string;
  emoji: string;
  color: string; // Gradient class or solid bg class
  onClick: () => void;
  isLoading?: boolean;
  compact?: boolean; // Inline style for horizontal bar
  highlighted?: boolean; // Special state for entity-matched tiles
  isCore?: boolean; // Core tiles (Yes, No, Help, More)
}

export default function Tile({
  text,
  emoji,
  color,
  onClick,
  isLoading,
  compact,
  highlighted,
  isCore
}: TileProps) {

  if (isLoading) {
    return (
      <div
        className={`
          ${compact ? 'h-14 min-w-[100px]' : 'h-20 w-20'}
          rounded-2xl
          bg-gradient-to-br from-white/20 to-white/5
          animate-pulse
          shrink-0
        `}
      />
    );
  }

  // Compact pill-style for horizontal scrolling bar
  if (compact) {
    return (
      <button
        onClick={onClick}
        className={`
          group
          relative
          overflow-hidden
          ${color}
          rounded-2xl
          px-4 py-3
          min-h-[56px]
          flex items-center gap-2.5
          shrink-0
          transition-all duration-200 ease-out
          active:scale-[0.97]
          hover:scale-[1.02]
          ${highlighted
            ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-black/50 shadow-lg shadow-amber-400/30'
            : 'shadow-lg shadow-black/30'
          }
          ${isCore ? 'min-w-[80px]' : 'min-w-[100px]'}
        `}
      >
        {/* Inner highlight - top edge glow */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

        {/* Inner shadow - bottom edge depth */}
        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-t from-black/20 to-transparent" />

        {/* Shine effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Emoji */}
        <span className={`
          text-2xl
          drop-shadow-sm
          transition-transform duration-200
          group-hover:scale-110
          group-active:scale-95
          ${highlighted ? 'animate-bounce' : ''}
        `}>
          {emoji}
        </span>

        {/* Label */}
        <span className={`
          font-bold
          text-[15px]
          text-white
          drop-shadow-sm
          tracking-tight
          whitespace-nowrap
        `}>
          {text}
        </span>

        {/* Pulse ring when highlighted */}
        {highlighted && (
          <div className="absolute inset-0 rounded-2xl ring-2 ring-amber-400 animate-ping opacity-30" />
        )}
      </button>
    );
  }

  // Standard square tile (for grid layouts if needed)
  return (
    <button
      onClick={onClick}
      className={`
        group
        relative
        overflow-hidden
        ${color}
        rounded-3xl
        p-4
        h-24 w-24
        flex flex-col items-center justify-center gap-1
        shrink-0
        transition-all duration-200 ease-out
        active:scale-[0.95]
        hover:scale-[1.03]
        ${highlighted
          ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-black/50 shadow-xl shadow-amber-400/30'
          : 'shadow-xl shadow-black/30'
        }
      `}
    >
      {/* Inner highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />

      {/* Inner shadow */}
      <div className="absolute inset-x-0 bottom-0 h-2 bg-gradient-to-t from-black/20 to-transparent rounded-b-3xl" />

      {/* Shine effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Emoji */}
      <span className={`
        text-3xl
        drop-shadow-md
        transition-transform duration-200
        group-hover:scale-110
        ${highlighted ? 'animate-bounce' : ''}
      `}>
        {emoji}
      </span>

      {/* Label */}
      <span className="text-white font-bold text-sm text-center leading-tight drop-shadow-sm">
        {text}
      </span>
    </button>
  );
}
