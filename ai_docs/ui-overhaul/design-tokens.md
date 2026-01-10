# Design Tokens

## Tile Color Palette

Extracted from Glimpse mockup. Each tile gets a distinct color for visual differentiation.

| Tile | Color Name | Hex | Tailwind Class |
|------|------------|-----|----------------|
| I Want | Sky Blue | #5B9BD5 | `bg-sky-500` |
| Help | Soft Green | #6BBF6B | `bg-green-500` |
| More | Bright Yellow | #E6D84C | `bg-yellow-400` |
| Eat | Coral | #F08080 | `bg-red-300` |
| Drink | Purple | #9B6BB5 | `bg-purple-500` |
| Go | Orange | #E69138 | `bg-orange-400` |
| Stop | Teal | #6BBFB5 | `bg-teal-400` |
| Yes | Pink | #F5B5C5 | `bg-pink-300` |
| No | Brown/Stone | #A67C52 | `bg-stone-500` |

## Color Mapping

```typescript
// src/lib/tile-colors.ts
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

  // Fallback for dynamic tiles
  'default': 'bg-blue-500',
};

export function getTileColor(tileId: string, label: string): string {
  // Check by label (lowercase)
  const normalized = label.toLowerCase();
  if (TILE_COLORS[normalized]) return TILE_COLORS[normalized];

  // Check common keywords
  if (normalized.includes('want')) return TILE_COLORS.want;
  if (normalized.includes('help')) return TILE_COLORS.help;
  if (normalized.includes('eat') || normalized.includes('hungry')) return TILE_COLORS.eat;
  if (normalized.includes('drink') || normalized.includes('thirsty')) return TILE_COLORS.drink;
  if (normalized.includes('yes')) return TILE_COLORS.yes;
  if (normalized.includes('no')) return TILE_COLORS.no;
  if (normalized.includes('stop')) return TILE_COLORS.stop;
  if (normalized.includes('go') || normalized.includes('leave')) return TILE_COLORS.go;

  // Fallback: deterministic color based on id hash
  return TILE_COLORS.default;
}
```

## Shadows

Tiles have soft drop shadow for 3D effect:

```css
/* Tailwind classes */
shadow-lg shadow-black/20

/* Equivalent CSS */
box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2);
```

## Border Radius

Tiles use large rounded corners:

```css
/* Tailwind */
rounded-2xl  /* 1rem / 16px */

/* For more pill-like appearance */
rounded-3xl  /* 1.5rem / 24px */
```

## Spacing

- **Grid gap**: `gap-3` (0.75rem)
- **Tile padding**: `p-4` (1rem)
- **Grid margin from edges**: `px-4 pb-8`

## Typography

- **Emoji**: `text-4xl` (36px)
- **Label**: `text-sm font-semibold` (14px, 600 weight)
- **Label color**: White with slight transparency `text-white/90`
