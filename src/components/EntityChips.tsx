'use client';

interface EntityChipsProps {
  entities: string[];
  focusedEntity: string | null;
  onFocus: (entity: string | null) => void;
  isLoading?: boolean;
}

// Emoji mapping for common detected entities
const ENTITY_EMOJIS: Record<string, string> = {
  // Playground
  swing: '🎢',
  swings: '🎢',
  slide: '🛝',
  sandbox: '🏖️',
  climbing_frame: '🧗',
  // People
  child: '👧',
  children: '👧',
  kids: '👧',
  kid: '👧',
  adult: '🧑',
  parent: '👨‍👩‍👧',
  teacher: '👩‍🏫',
  person: '🧑',
  man: '👨',
  woman: '👩',
  // Restaurant
  cashier: '🧑‍💼',
  counter: '🛒',
  menu: '📜',
  menu_board: '📋',
  food: '🍔',
  drink: '🥤',
  ice_cream: '🍦',
  // Accessories/Wearables
  glasses: '👓',
  eye_glasses: '👓',
  sunglasses: '🕶️',
  earbuds: '🎧',
  wireless_earbuds: '🎧',
  headphones: '🎧',
  watch: '⌚',
  wrist_watch: '⌚',
  hat: '🧢',
  cap: '🧢',
  // Generic
  water_fountain: '🚰',
  bathroom: '🚻',
  toilet: '🚽',
  restroom: '🚻',
  door: '🚪',
  table: '🪑',
  chair: '🪑',
  phone: '📱',
  laptop: '💻',
  book: '📖',
  // Animals
  dog: '🐕',
  cat: '🐈',
  bird: '🐦',
};

function getEntityEmoji(entity: string): string {
  const normalized = entity.toLowerCase().replace(/\s+/g, '_');
  return ENTITY_EMOJIS[normalized] || '👀';
}

function formatEntityLabel(entity: string): string {
  return entity
    .replace(/_/g, ' ')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function EntityChips({ entities, focusedEntity, onFocus, isLoading }: EntityChipsProps) {
  if (entities.length === 0 && !isLoading) {
    return null;
  }

  const handleChipClick = (entity: string) => {
    if (focusedEntity === entity) {
      onFocus(null); // Deselect
    } else {
      onFocus(entity); // Select
    }
  };

  return (
    <div className="relative">
      {/* Panel container with glass effect */}
      <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-3 shadow-xl">
        {/* Header row */}
        <div className="flex items-center gap-2 mb-2.5 px-1">
          <span className="text-lg">👁️</span>
          <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">I see</span>
          {isLoading && (
            <div className="ml-auto flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-white/40 text-xs">scanning...</span>
            </div>
          )}
        </div>

        {/* Entity chips row */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
          {/* Loading skeletons */}
          {isLoading && entities.length === 0 && (
            <>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-11 w-28 rounded-xl bg-white/10 animate-pulse shrink-0"
                />
              ))}
            </>
          )}

          {/* Entity chips */}
          {entities.slice(0, 5).map((entity) => {
            const isFocused = focusedEntity === entity;
            const emoji = getEntityEmoji(entity);

            return (
              <button
                key={entity}
                onClick={() => handleChipClick(entity)}
                className={`
                  group
                  relative
                  flex items-center gap-2
                  px-3.5 py-2.5
                  rounded-xl
                  font-semibold
                  text-sm
                  whitespace-nowrap
                  shrink-0
                  transition-all duration-200 ease-out
                  active:scale-95
                  ${isFocused
                    ? 'bg-gradient-to-br from-amber-400 via-yellow-400 to-orange-400 text-black shadow-lg shadow-amber-500/30 scale-[1.02]'
                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                  }
                `}
              >
                {/* Glow effect when focused */}
                {isFocused && (
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-amber-400/40 to-orange-400/40 blur-lg -z-10" />
                )}

                {/* Emoji */}
                <span className={`text-lg transition-transform duration-200 ${isFocused ? 'scale-110' : 'group-hover:scale-110'}`}>
                  {emoji}
                </span>

                {/* Label */}
                <span className="tracking-tight">{formatEntityLabel(entity)}</span>

                {/* Active indicator */}
                {isFocused && (
                  <span className="text-black/50 text-xs">✨</span>
                )}
              </button>
            );
          })}

          {/* More indicator */}
          {entities.length > 5 && (
            <div className="flex items-center justify-center px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 text-sm font-medium shrink-0">
              +{entities.length - 5}
            </div>
          )}
        </div>
      </div>

      {/* Subtle hint when entity is focused */}
      {focusedEntity && (
        <div className="mt-2 px-3 text-center">
          <span className="text-white/40 text-xs">
            Tap a phrase below • Tap again to deselect
          </span>
        </div>
      )}
    </div>
  );
}
