'use client';

import Tile from './Tile';
import { speak } from '@/lib/tts';
import { DisplayTile, ENTITY_TILE_MAP } from '@/lib/tiles';
import { getTileColor } from '@/lib/tile-colors';

interface TileGridProps {
  tiles: DisplayTile[];
  isLoading?: boolean;
  onTileSpeak?: (text: string) => void;
  focusedEntity?: string | null;
}

// Get tile IDs that match a focused entity
function getMatchingTileIds(entity: string): string[] {
  const normalized = entity.toLowerCase().replace(/\s+/g, '_');
  return ENTITY_TILE_MAP[normalized] || [];
}

export default function TileGrid({ tiles, isLoading, onTileSpeak, focusedEntity }: TileGridProps) {
  const handleTileClick = (tile: DisplayTile) => {
    const textToSpeak = tile.tts || tile.text;
    if (textToSpeak) {
      speak(textToSpeak);
      onTileSpeak?.(textToSpeak);
    }
  };

  // Get IDs of tiles that match the focused entity
  const highlightedTileIds = focusedEntity ? getMatchingTileIds(focusedEntity) : [];

  if (isLoading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Tile
            key={i}
            text=""
            emoji=""
            color="bg-white/20"
            onClick={() => {}}
            isLoading={true}
            compact
          />
        ))}
      </div>
    );
  }

  if (tiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-6 text-center">
        <div className="text-5xl mb-3">📸</div>
        <h3 className="text-lg font-bold text-white mb-1">Ready to Listen & See</h3>
        <p className="text-white/60 text-sm max-w-xs mx-auto">
          Point the camera at your world
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

  // Mixed bar: core tiles + context tiles (limit to reasonable amount)
  const displayTiles = [...coreTiles, ...orderedContextTiles].slice(0, 12);

  return (
    <div className="flex flex-col gap-3">
      {/* Horizontal scrollable bar with all tiles */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {displayTiles.map((tile) => {
          const isHighlighted = focusedEntity && highlightedTileIds.includes(tile.id);
          return (
            <Tile
              key={tile.id}
              text={tile.text}
              emoji={tile.emoji}
              color={getTileColor(tile.id, tile.text)}
              onClick={() => handleTileClick(tile)}
              compact
              highlighted={isHighlighted}
            />
          );
        })}
      </div>
    </div>
  );
}
