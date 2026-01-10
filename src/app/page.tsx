'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Camera from '@/components/Camera';
import TileGrid from '@/components/TileGrid';
import ContextNotification from '@/components/ContextNotification';
import { useAACState, APIResponse } from '@/hooks/useAACState';
import { formatContext } from '@/lib/tiles';

export default function Home() {
  const { state, dispatch, displayTiles, applyContextIfReady } = useAACState();
  const [isConnected, setIsConnected] = useState(false);
  const lastCaptureRef = useRef<number>(0);

  // Handle frame capture - calls server API
  const handleCapture = useCallback(async (base64Image: string) => {
    // Debounce: skip if last capture was < 800ms ago
    const now = Date.now();
    if (now - lastCaptureRef.current < 800) return;
    lastCaptureRef.current = now;

    try {
      const response = await fetch('/api/tiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image })
      });

      if (!response.ok) throw new Error('API error');

      const data: APIResponse = await response.json();
      setIsConnected(true);

      // Debounce context changes
      dispatch({ type: 'DEBOUNCE_CONTEXT', payload: data.classification.primaryContext });

      // Update tiles directly (always-on live mode)
      if (data.tiles) {
        dispatch({
          type: 'LIVE_TILES',
          payload: data.tiles.map(t => ({
            id: t.id,
            text: t.label,
            tts: t.tts,
            emoji: t.emoji,
            isCore: false,
            isSuggested: true,
            relevanceScore: t.relevanceScore
          }))
        });
      }
    } catch (error) {
      console.error('Error getting tiles:', error);
      setIsConnected(false);
      dispatch({ type: 'SET_FALLBACK_TILES' });
    }
  }, [dispatch]);

  // Apply debounced context changes
  useEffect(() => {
    if (state.context.transitionPending) {
      const timer = setTimeout(applyContextIfReady, 500);
      return () => clearTimeout(timer);
    }
  }, [state.context.transitionPending, applyContextIfReady]);

  const handleClearNotification = useCallback(() => {
    dispatch({ type: 'CLEAR_NOTIFICATION' });
  }, [dispatch]);

  // Context status message
  const contextStatus = state.context.current
    ? `Context: ${formatContext(state.context.current)}`
    : isConnected
      ? 'Scanning environment...'
      : 'Initializing...';

  const statusColor = isConnected ? 'bg-green-500' : 'bg-yellow-500 animate-pulse';

  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-blue-500/30 overflow-x-hidden">
      {/* Context Change Notification */}
      {state.notification && (
        <ContextNotification
          notification={state.notification}
          onDismiss={handleClearNotification}
        />
      )}

      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 relative z-10 space-y-10">
        {/* Header Section */}
        <header className="flex flex-col items-center text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-2">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${statusColor} opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${statusColor}`}></span>
            </span>
            {isConnected ? 'Live' : 'Connecting'}
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
            AAC <span className="text-blue-500">Live</span>
          </h1>
          <p className="text-gray-400 md:text-lg max-w-md font-medium leading-relaxed">
            Vision-aware communication for non-verbal children.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Camera Column */}
          <div className="lg:col-span-5 space-y-4">
            <Camera onCapture={handleCapture} />

            {/* Status Bar */}
            <div className="flex items-center gap-2 px-4 py-3 bg-white/5 rounded-2xl border border-white/5 text-sm text-gray-400 font-medium">
              <div className={`w-2 h-2 rounded-full ${statusColor}`} />
              {contextStatus}
            </div>
          </div>

          {/* Tiles Column */}
          <div className="lg:col-span-7">
            <div className="flex items-center justify-between mb-6 px-2">
              <h2 className="text-xl font-bold tracking-tight">Communication Tiles</h2>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                {displayTiles.length} Options
              </span>
            </div>
            <TileGrid tiles={displayTiles} isLoading={state.isLoading} />
          </div>
        </div>

        {/* Footer */}
        <footer className="pt-12 border-t border-white/5 flex flex-col items-center gap-4">
          <p className="text-gray-600 text-sm font-medium">
            Designed for the <span className="text-white">Gemini API Hackathon</span>
          </p>
          <div className="flex gap-4">
            <div className="w-2 h-2 rounded-full bg-blue-500/20" />
            <div className="w-2 h-2 rounded-full bg-blue-500/40" />
            <div className="w-2 h-2 rounded-full bg-blue-500/60" />
          </div>
        </footer>
      </div>
    </main>
  );
}
