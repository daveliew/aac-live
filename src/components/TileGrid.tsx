'use client';

import Tile from './Tile';
import { speak } from '@/lib/tts';
import { DisplayTile, ENTITY_TILE_MAP } from '@/lib/tiles';
import { getTileColor } from '@/lib/tile-colors';

interface TileGridProps {
  tiles: DisplayTile[];
  isLoading?: boolean;
  onTileSpeak?: (text: string) => void;
  onNativeTTS?: (text: string) => void; // Gemini Live API native voice
  focusedEntity?: string | null;
  entityPhrasesLoading?: boolean;
}

// Get tile IDs that match a focused entity
function getMatchingTileIds(entity: string): string[] {
  const normalized = entity.toLowerCase().replace(/\s+/g, '_');
  return ENTITY_TILE_MAP[normalized] || [];
}

export default function TileGrid({
  tiles,
  isLoading,
  onTileSpeak,
  onNativeTTS,
  focusedEntity,
  entityPhrasesLoading
}: TileGridProps) {
  const handleTileClick = (tile: DisplayTile) => {
    const textToSpeak = tile.tts || tile.text;
    if (textToSpeak) {
      // Try native Gemini TTS first, fallback to browser TTS
      if (onNativeTTS) {
        onNativeTTS(textToSpeak);
      } else {
        speak(textToSpeak);
      }
      onTileSpeak?.(textToSpeak);
    }
  };

  // Get IDs of tiles that match the focused entity
  const highlightedTileIds = focusedEntity ? getMatchingTileIds(focusedEntity) : [];

  // Loading state
  if (isLoading || entityPhrasesLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Tile
            key={i}
            text=""
            emoji=""
            color="bg-white/10"
            onClick={() => {}}
            isLoading={true}
            compact
          />
        ))}
      </div>
    );
  }

  // Empty state
  if (tiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
        <div className="text-6xl mb-4 animate-pulse">📸</div>
        <h3 className="text-xl font-bold text-white mb-2">Ready to See & Speak</h3>
        <p className="text-white/50 text-sm max-w-xs">
          Point the camera at your world and I&apos;ll help you communicate
        </p>
      </div>
    );
  }

  // Split tiles: core first, then context tiles
  const coreTiles = tiles.filter(t => t.isCore);
  const contextTiles = tiles.filter(t => !t.isCore);

  // If entity is focused, prioritize matching tiles
  let orderedContextTiles = contextTiles;
  if (focusedEntity && highlightedTileIds.length > 0) {
    const matchingTiles = contextTiles.filter(t => highlightedTileIds.includes(t.id));
    const otherTiles = contextTiles.filter(t => !highlightedTileIds.includes(t.id));
    orderedContextTiles = [...matchingTiles, ...otherTiles];
  }

  // All tiles in order: core first, then context
  const displayTiles = [...coreTiles, ...orderedContextTiles].slice(0, 12);

  return (
    <div className="flex flex-col gap-4">
      {/* Main tile bar - horizontal scroll */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {displayTiles.map((tile) => {
          const isHighlighted = !!focusedEntity && highlightedTileIds.includes(tile.id);
          return (
            <Tile
              key={tile.id}
              text={tile.text}
              emoji={tile.emoji}
              color={getTileColor(tile.id, tile.text)}
              onClick={() => handleTileClick(tile)}
              compact
              highlighted={isHighlighted}
              isCore={tile.isCore}
            />
          );
        })}

        {/* "More" indicator when there are additional tiles */}
        {tiles.length > 12 && (
          <div className="flex items-center justify-center min-w-[60px] h-14 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 text-white/60 text-sm font-medium shrink-0">
            +{tiles.length - 12}
          </div>
        )}
      </div>

      {/* Scroll hint - subtle fade on edges */}
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-black/60 to-transparent" />
    </div>
  );
}
