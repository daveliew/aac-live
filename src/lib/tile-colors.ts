// Tile color palette - extracted from Glimpse mockup
// Each tile gets a distinct color for visual differentiation

export const TILE_COLORS: Record<string, string> = {
  // Core tiles
  'want': 'bg-sky-500',
  'help': 'bg-green-500',
  'more': 'bg-yellow-400',
  'yes': 'bg-pink-300',
  'no': 'bg-stone-500',

  // Context tiles
  'eat': 'bg-red-300',
  'drink': 'bg-purple-500',
  'go': 'bg-orange-400',
  'stop': 'bg-teal-400',

  // Extended palette for dynamic tiles
  'play': 'bg-indigo-400',
  'bathroom': 'bg-cyan-400',
  'tired': 'bg-slate-400',
  'hurt': 'bg-rose-400',
  'happy': 'bg-amber-400',
  'sad': 'bg-blue-400',

  // Fallback
  'default': 'bg-blue-500',
};

// Deterministic color assignment for tiles not in the palette
const FALLBACK_COLORS = [
  'bg-sky-500',
  'bg-green-500',
  'bg-yellow-400',
  'bg-red-300',
  'bg-purple-500',
  'bg-orange-400',
  'bg-teal-400',
  'bg-pink-300',
  'bg-indigo-400',
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function getTileColor(tileId: string, label: string): string {
  const normalized = label.toLowerCase();

  // Direct match
  if (TILE_COLORS[normalized]) return TILE_COLORS[normalized];

  // Keyword matching
  if (normalized.includes('want') || normalized.includes('i want')) return TILE_COLORS.want;
  if (normalized.includes('help')) return TILE_COLORS.help;
  if (normalized.includes('more')) return TILE_COLORS.more;
  if (normalized.includes('yes')) return TILE_COLORS.yes;
  if (normalized.includes('no')) return TILE_COLORS.no;
  if (normalized.includes('eat') || normalized.includes('hungry') || normalized.includes('food')) return TILE_COLORS.eat;
  if (normalized.includes('drink') || normalized.includes('thirsty') || normalized.includes('water')) return TILE_COLORS.drink;
  if (normalized.includes('go') || normalized.includes('leave') || normalized.includes('walk')) return TILE_COLORS.go;
  if (normalized.includes('stop') || normalized.includes('wait')) return TILE_COLORS.stop;
  if (normalized.includes('play') || normalized.includes('fun')) return TILE_COLORS.play;
  if (normalized.includes('bathroom') || normalized.includes('toilet') || normalized.includes('potty')) return TILE_COLORS.bathroom;
  if (normalized.includes('tired') || normalized.includes('sleep') || normalized.includes('rest')) return TILE_COLORS.tired;
  if (normalized.includes('hurt') || normalized.includes('pain') || normalized.includes('ow')) return TILE_COLORS.hurt;
  if (normalized.includes('happy') || normalized.includes('good') || normalized.includes('like')) return TILE_COLORS.happy;
  if (normalized.includes('sad') || normalized.includes('bad') || normalized.includes('don\'t')) return TILE_COLORS.sad;

  // Fallback: deterministic color based on id hash
  const index = hashString(tileId) % FALLBACK_COLORS.length;
  return FALLBACK_COLORS[index];
}
