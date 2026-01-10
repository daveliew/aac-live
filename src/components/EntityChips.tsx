'use client';

interface EntityChipsProps {
  entities: string[];
  focusedEntity: string | null;
  onFocus: (entity: string | null) => void;
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

export default function EntityChips({ entities, focusedEntity, onFocus }: EntityChipsProps) {
  if (entities.length === 0) {
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
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
      <span className="text-white/50 text-xs font-medium whitespace-nowrap px-2 py-1 bg-black/30 backdrop-blur-sm rounded-full">
        I see:
      </span>
      {entities.slice(0, 4).map((entity) => {
        const isFocused = focusedEntity === entity;
        return (
          <button
            key={entity}
            onClick={() => handleChipClick(entity)}
            className={`
              flex items-center gap-1.5
              px-3 py-1.5
              rounded-full
              text-sm font-medium
              whitespace-nowrap
              backdrop-blur-md
              transition-all duration-200
              active:scale-95
              ${isFocused
                ? 'bg-yellow-400/90 text-black shadow-lg shadow-yellow-400/30'
                : 'bg-white/15 text-white hover:bg-white/25 border border-white/10'
              }
            `}
          >
            <span className="text-base">{getEntityEmoji(entity)}</span>
            <span>{formatEntityLabel(entity)}</span>
          </button>
        );
      })}
    </div>
  );
}
