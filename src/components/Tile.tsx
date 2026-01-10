'use client';

interface TileProps {
  text: string;
  emoji: string;
  onClick: () => void;
  isLoading?: boolean;
  isSuggested?: boolean;
}

export default function Tile({ text, emoji, onClick, isLoading, isSuggested }: TileProps) {
  if (isLoading) {
    return (
      <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 animate-pulse flex flex-col items-center justify-center aspect-square">
        <div className="text-4xl mb-4 grayscale opacity-20">✨</div>
        <div className="h-3 bg-white/10 rounded-full w-20"></div>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`
        relative group flex flex-col items-center justify-center p-6 rounded-3xl aspect-square
        transition-all duration-500 ease-out
        ${isSuggested 
          ? 'bg-gradient-to-br from-blue-500/30 to-purple-600/30 border-2 border-blue-400/50 shadow-[0_0_30px_rgba(59,130,246,0.2)] scale-105' 
          : 'bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20'
        }
        backdrop-blur-2xl shadow-xl
        hover:scale-105 active:scale-95
        animate-in fade-in zoom-in duration-500
      `}
    >
      {/* Decorative Glow */}
      <div className={`
        absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700
        bg-gradient-to-br from-blue-400/10 to-purple-400/10 -z-10 blur-xl
      `} />
      
      {/* Emoji with bounce animation */}
      <div className="text-5xl mb-4 group-hover:scale-125 transition-transform duration-500 group-hover:rotate-6">
        {emoji}
      </div>
      
      {/* Text with refined typography */}
      <div className="text-lg font-semibold text-white/90 tracking-tight text-center leading-tight">
        {text}
      </div>

      {isSuggested && (
        <div className="absolute top-2 left-2 flex gap-1">
          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping" />
        </div>
      )}
    </button>
  );
}
