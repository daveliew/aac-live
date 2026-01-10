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
  // Restaurant
  cashier: '🧑‍💼',
  counter: '🛒',
  menu: '📜',
  menu_board: '📋',
  food: '🍔',
  drink: '🥤',
  ice_cream: '🍦',
  // Generic
  water_fountain: '🚰',
  bathroom: '🚻',
  toilet: '🚽',
  restroom: '🚻',
  door: '🚪',
  table: '🪑',
  chair: '🪑',
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
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
      <span className="text-white/60 text-xs whitespace-nowrap">I see:</span>
      {entities.slice(0, 5).map((entity) => {
        const isFocused = focusedEntity === entity;
        return (
          <button
            key={entity}
            onClick={() => handleChipClick(entity)}
            className={`
              flex items-center gap-1
              px-2 py-1
              rounded-full
              text-xs
              whitespace-nowrap
              transition-all duration-200
              ${isFocused
                ? 'bg-yellow-400 text-black ring-2 ring-yellow-300 shadow-lg'
                : 'bg-white/20 text-white/90 hover:bg-white/30'
              }
            `}
          >
            <span>{getEntityEmoji(entity)}</span>
            <span>{formatEntityLabel(entity)}</span>
          </button>
        );
      })}
    </div>
  );
}
