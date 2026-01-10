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
    <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide py-1">
      {/* "I see" label - minimal glass pill */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shrink-0">
        <span className="text-lg">👁️</span>
        <span className="text-white/70 text-sm font-medium">I see</span>
      </div>

      {/* Loading skeletons */}
      {isLoading && entities.length === 0 && (
        <>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-12 w-32 rounded-2xl bg-white/10 animate-pulse shrink-0"
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
              px-4 py-2.5
              rounded-2xl
              font-semibold
              text-sm
              whitespace-nowrap
              shrink-0
              transition-all duration-300 ease-out
              active:scale-95
              ${isFocused
                ? 'bg-gradient-to-br from-amber-400 via-yellow-400 to-orange-400 text-black shadow-lg shadow-amber-500/40 scale-105'
                : 'bg-white/15 backdrop-blur-xl text-white border border-white/20 hover:bg-white/25 hover:border-white/30'
              }
            `}
          >
            {/* Glow effect when focused */}
            {isFocused && (
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-400/50 to-orange-400/50 blur-xl -z-10 animate-pulse" />
            )}

            {/* Emoji with bounce on focus */}
            <span className={`text-xl transition-transform duration-300 ${isFocused ? 'scale-110' : 'group-hover:scale-110'}`}>
              {emoji}
            </span>

            {/* Label */}
            <span className="tracking-tight">{formatEntityLabel(entity)}</span>

            {/* "Tap to talk" indicator when focused */}
            {isFocused && (
              <span className="ml-1 text-black/60 text-xs font-medium">
                ✨
              </span>
            )}
          </button>
        );
      })}

      {/* More indicator if there are hidden entities */}
      {entities.length > 5 && (
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white/60 text-sm font-medium shrink-0">
          +{entities.length - 5}
        </div>
      )}
    </div>
  );
}
