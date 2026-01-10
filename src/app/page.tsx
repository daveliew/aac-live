'use client';

import { useState, useCallback } from 'react';
import Camera from '@/components/Camera';
import TileGrid, { TileData } from '@/components/TileGrid';

export default function Home() {
  const [tiles, setTiles] = useState<TileData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastContext, setLastContext] = useState<string>('');

  const handleCapture = useCallback(async (base64Image: string) => {
    setIsLoading(true);
    setLastContext('Analyzing...');

    try {
      const response = await fetch('/api/tiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image })
      });

      const data = await response.json();

      if (data.tiles && Array.isArray(data.tiles)) {
        setTiles(data.tiles);
        setLastContext('Ready to communicate!');
      } else {
        throw new Error('Invalid response');
      }
    } catch (error) {
      console.error('Error getting tiles:', error);
      setLastContext('Error - try again');
      // Set fallback tiles
      setTiles([
        { id: 1, text: 'Help me', emoji: '🙋' },
        { id: 2, text: 'Yes', emoji: '✅' },
        { id: 3, text: 'No', emoji: '❌' }
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <header className="text-center py-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            AAC Live
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Point camera at context, tap to speak
          </p>
        </header>

        {/* Camera */}
        <section>
          <Camera onCapture={handleCapture} />
          {lastContext && (
            <p className="text-center text-sm text-gray-400 mt-2">
              {lastContext}
            </p>
          )}
        </section>

        {/* Communication Tiles */}
        <section>
          <TileGrid tiles={tiles} isLoading={isLoading} />
        </section>

        {/* Footer hint */}
        <footer className="text-center text-xs text-gray-500 py-4">
          Tap any tile to speak it aloud
        </footer>
      </div>
    </main>
  );
}
