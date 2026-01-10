# UI Overhaul: Glimpse-Inspired Design

## Vision

Transform AAC Live from a split-layout app to an immersive, camera-first experience with colorful floating tiles.

## Current vs Target

| Aspect | Current | Target (Glimpse) |
|--------|---------|------------------|
| Layout | Split: Camera \| Tiles | Fullscreen camera + overlay tiles |
| Background | Dark gradient (#050505) | Live camera feed |
| Header | Heavy branding | Minimal text overlay |
| Tiles | Glassmorphism, monochrome | Solid colors, soft 3D |
| Grid | Variable | Fixed 3x3 |

## Implementation Phases

### Phase 1: Design Tokens
- [x] Document color palette
- [x] Add to Tailwind config or constants (`src/lib/tile-colors.ts`)

### Phase 2: Tile Component
- [x] Add `color` prop to Tile
- [x] Restyle: solid bg, shadow, rounded
- [x] Remove glassmorphism effects

### Phase 3: Layout
- [x] Camera fills viewport
- [x] Tiles overlay at bottom
- [x] Minimal header

### Phase 4: Polish
- [x] Animations/transitions (active:scale-95)
- [x] Mobile-first responsive
- [x] Error states

## Files

- `design-tokens.md` - Color palette, shadows, spacing
- `components.md` - Tile, Camera, Layout component specs

## Reference

Mockup: `/Users/dave/Desktop/Screenshot 2026-01-10 at 13.35.15.png`
