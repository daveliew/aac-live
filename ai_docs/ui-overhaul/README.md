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
- [ ] Add to Tailwind config or constants

### Phase 2: Tile Component
- [ ] Add `color` prop to Tile
- [ ] Restyle: solid bg, shadow, rounded
- [ ] Remove glassmorphism effects

### Phase 3: Layout
- [ ] Camera fills viewport
- [ ] Tiles overlay at bottom
- [ ] Minimal header

### Phase 4: Polish
- [ ] Animations/transitions
- [ ] Mobile-first responsive
- [ ] Error states

## Files

- `design-tokens.md` - Color palette, shadows, spacing
- `components.md` - Tile, Camera, Layout component specs

## Reference

Mockup: `/Users/dave/Desktop/Screenshot 2026-01-10 at 13.35.15.png`
