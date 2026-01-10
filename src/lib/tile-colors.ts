/**
 * Tile Color Palette - Polished gradients for AAC tiles
 * Each category has distinct, vibrant gradient colors
 */

// Core action tiles - high visibility, distinct colors
export const CORE_COLORS: Record<string, string> = {
  yes: 'bg-gradient-to-br from-pink-400 via-pink-300 to-rose-300',
  no: 'bg-gradient-to-br from-stone-500 via-stone-400 to-slate-400',
  help: 'bg-gradient-to-br from-green-500 via-emerald-400 to-teal-400',
  more: 'bg-gradient-to-br from-yellow-400 via-amber-400 to-orange-400',
};

// Semantic category gradients
export const CATEGORY_COLORS: Record<string, string> = {
  // Wants & Needs - warm oranges/reds
  want: 'bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-500',
  need: 'bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500',

  // Food & Drink - appetizing colors
  eat: 'bg-gradient-to-br from-red-400 via-rose-400 to-pink-400',
  drink: 'bg-gradient-to-br from-purple-500 via-violet-500 to-indigo-500',
  hungry: 'bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-400',
  thirsty: 'bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-500',

  // Actions - energetic colors
  go: 'bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500',
  stop: 'bg-gradient-to-br from-red-600 via-red-500 to-rose-500',
  play: 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500',
  look: 'bg-gradient-to-br from-cyan-400 via-sky-400 to-blue-400',

  // Social - warm, friendly colors
  hello: 'bg-gradient-to-br from-amber-400 via-yellow-400 to-lime-400',
  goodbye: 'bg-gradient-to-br from-violet-400 via-purple-400 to-indigo-400',
  thank: 'bg-gradient-to-br from-pink-400 via-rose-400 to-red-400',
  please: 'bg-gradient-to-br from-teal-400 via-cyan-400 to-sky-400',

  // Feelings - expressive colors
  happy: 'bg-gradient-to-br from-yellow-400 via-amber-400 to-orange-400',
  sad: 'bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-500',
  tired: 'bg-gradient-to-br from-slate-500 via-gray-500 to-zinc-500',
  hurt: 'bg-gradient-to-br from-rose-500 via-red-500 to-orange-500',

  // Body/Bathroom - practical colors
  bathroom: 'bg-gradient-to-br from-cyan-500 via-teal-500 to-emerald-500',
  wash: 'bg-gradient-to-br from-sky-400 via-cyan-400 to-teal-400',

  // Questions - curious colors
  what: 'bg-gradient-to-br from-fuchsia-500 via-pink-500 to-rose-500',
  where: 'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500',
  how: 'bg-gradient-to-br from-amber-500 via-orange-500 to-red-500',

  // Misc
  like: 'bg-gradient-to-br from-pink-500 via-rose-500 to-red-500',
  done: 'bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500',
};

// Fallback gradient palette for dynamic tiles
const FALLBACK_GRADIENTS = [
  'bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-500',
  'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500',
  'bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500',
  'bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500',
  'bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-500',
  'bg-gradient-to-br from-teal-500 via-cyan-500 to-sky-500',
  'bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-500',
  'bg-gradient-to-br from-amber-500 via-yellow-500 to-lime-500',
  'bg-gradient-to-br from-pink-500 via-rose-500 to-red-500',
];

// Hash string for consistent color assignment
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Get gradient color for a tile based on its label
 * Uses semantic matching first, then consistent hash-based fallback
 */
export function getTileColor(tileId: string, label: string): string {
  const normalized = label.toLowerCase();

  // Check core tiles first (exact match on ID)
  if (tileId.startsWith('core_')) {
    const coreKey = tileId.replace('core_', '');
    if (CORE_COLORS[coreKey]) return CORE_COLORS[coreKey];
  }

  // Direct label match
  if (CORE_COLORS[normalized]) return CORE_COLORS[normalized];
  if (CATEGORY_COLORS[normalized]) return CATEGORY_COLORS[normalized];

  // Keyword matching - check if label contains any category keywords
  const keywords: [string[], string][] = [
    // Core
    [['yes', 'ok', 'sure', 'yeah'], CORE_COLORS.yes],
    [['no', 'nope', 'don\'t'], CORE_COLORS.no],
    [['help', 'assist'], CORE_COLORS.help],
    [['more', 'again', 'another'], CORE_COLORS.more],

    // Wants & Needs
    [['want', 'i want', 'need', 'i need'], CATEGORY_COLORS.want],

    // Food & Drink
    [['eat', 'food', 'hungry', 'snack', 'meal'], CATEGORY_COLORS.eat],
    [['drink', 'water', 'juice', 'milk', 'thirsty'], CATEGORY_COLORS.drink],

    // Actions
    [['go', 'leave', 'walk', 'move'], CATEGORY_COLORS.go],
    [['stop', 'wait', 'pause'], CATEGORY_COLORS.stop],
    [['play', 'fun', 'game'], CATEGORY_COLORS.play],
    [['look', 'see', 'watch'], CATEGORY_COLORS.look],

    // Social
    [['hello', 'hi', 'hey', 'greet'], CATEGORY_COLORS.hello],
    [['bye', 'goodbye', 'later', 'see you'], CATEGORY_COLORS.goodbye],
    [['thank', 'thanks', 'appreciate'], CATEGORY_COLORS.thank],
    [['please', 'can i', 'may i'], CATEGORY_COLORS.please],

    // Feelings
    [['happy', 'good', 'great', 'excited', 'joy'], CATEGORY_COLORS.happy],
    [['sad', 'upset', 'cry', 'unhappy'], CATEGORY_COLORS.sad],
    [['tired', 'sleep', 'rest', 'sleepy'], CATEGORY_COLORS.tired],
    [['hurt', 'pain', 'ow', 'ouch', 'sick'], CATEGORY_COLORS.hurt],

    // Body/Bathroom
    [['bathroom', 'toilet', 'potty', 'pee', 'restroom'], CATEGORY_COLORS.bathroom],
    [['wash', 'clean', 'hands', 'soap'], CATEGORY_COLORS.wash],

    // Questions
    [['what', 'which'], CATEGORY_COLORS.what],
    [['where', 'location'], CATEGORY_COLORS.where],
    [['how', 'why'], CATEGORY_COLORS.how],

    // Misc
    [['like', 'love', 'enjoy', 'nice', 'cool'], CATEGORY_COLORS.like],
    [['done', 'finish', 'complete', 'all done'], CATEGORY_COLORS.done],
  ];

  for (const [terms, color] of keywords) {
    if (terms.some(term => normalized.includes(term))) {
      return color;
    }
  }

  // Deterministic fallback based on ID hash
  const index = hashString(tileId) % FALLBACK_GRADIENTS.length;
  return FALLBACK_GRADIENTS[index];
}
