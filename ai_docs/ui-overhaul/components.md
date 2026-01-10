# Component Specifications

## 1. Tile Component

### Current Implementation
- Glassmorphism (backdrop-blur, transparent bg)
- Gradient borders
- Hover glow effects
- No color differentiation

### Target Implementation

```tsx
interface TileProps {
  text: string;
  emoji: string;
  color: string;  // NEW: Tailwind bg class
  onClick: () => void;
  isLoading?: boolean;
}

export default function Tile({ text, emoji, color, onClick, isLoading }: TileProps) {
  if (isLoading) {
    return (
      <div className="bg-white/20 rounded-2xl aspect-square animate-pulse" />
    );
  }

  return (
    <button
      onClick={onClick}
      className={`
        ${color}
        rounded-2xl
        p-3
        aspect-square
        flex flex-col items-center justify-center
        shadow-lg shadow-black/20
        active:scale-95
        transition-transform duration-150
      `}
    >
      <span className="text-4xl mb-1">{emoji}</span>
      <span className="text-white font-semibold text-sm text-center leading-tight">
        {text}
      </span>
    </button>
  );
}
```

### Key Changes
- Remove `backdrop-blur-2xl`
- Remove gradient borders
- Remove hover glow effects
- Add solid `color` prop
- Simplify shadow to `shadow-lg shadow-black/20`

---

## 2. TileGrid Component

### Target Implementation

```tsx
interface TileGridProps {
  tiles: DisplayTile[];
  onTileSpeak?: (text: string) => void;
  isLoading?: boolean;
}

export default function TileGrid({ tiles, onTileSpeak, isLoading }: TileGridProps) {
  return (
    <div className="grid grid-cols-3 gap-3 w-full max-w-sm mx-auto">
      {tiles.slice(0, 9).map((tile) => (
        <Tile
          key={tile.id}
          text={tile.text}
          emoji={tile.emoji}
          color={getTileColor(tile.id, tile.text)}
          onClick={() => handleClick(tile)}
        />
      ))}
    </div>
  );
}
```

### Key Changes
- Fixed 3x3 grid (9 tiles max)
- Smaller gap (`gap-3` vs `gap-4`)
- Constrained width (`max-w-sm`)

---

## 3. Camera Component

### Current Implementation
- Contained in rounded box
- Aspect-ratio constraint
- Has "Live" indicator badge

### Target Implementation

```tsx
interface CameraProps {
  onCapture: (base64: string) => void;
  fullscreen?: boolean;  // NEW
}

export default function Camera({ onCapture, fullscreen = false }: CameraProps) {
  // ... existing capture logic ...

  return (
    <div className={fullscreen ? 'fixed inset-0' : 'relative rounded-2xl overflow-hidden'}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
```

### Key Changes
- Add `fullscreen` prop
- When fullscreen: `fixed inset-0`
- Remove decorative overlays/badges
- Keep video `object-cover` for fill

---

## 4. Page Layout

### Target Structure

```tsx
export default function Home() {
  return (
    <main className="relative h-screen overflow-hidden">
      {/* Fullscreen camera background */}
      <Camera onCapture={handleCapture} fullscreen />

      {/* Overlay content */}
      <div className="relative z-10 h-full flex flex-col pointer-events-none">
        {/* Minimal header */}
        <header className="p-4 pointer-events-auto">
          <span className="text-white text-xl font-bold drop-shadow-lg">
            AAC Live
          </span>
        </header>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Tiles at bottom */}
        <div className="px-4 pb-8 pointer-events-auto">
          <TileGrid tiles={displayTiles} onTileSpeak={setLastSpoken} />
        </div>
      </div>

      {/* Toasts/Notifications */}
      {error && <ErrorToast ... />}
    </main>
  );
}
```

### Key Changes
- Remove split layout
- Camera is background layer
- Content overlays with `z-10`
- `pointer-events-none` on container, `pointer-events-auto` on interactive elements
- Tiles anchored to bottom

---

## Migration Checklist

- [x] Create `src/lib/tile-colors.ts`
- [x] Update `Tile.tsx` with color prop
- [x] Update `TileGrid.tsx` to pass colors
- [x] Add `fullscreen` prop to Camera
- [x] Restructure page.tsx layout
- [x] Remove unused header/footer components
- [x] Test on mobile viewport
