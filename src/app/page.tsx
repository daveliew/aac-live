'use client';

import { useCallback, useEffect } from 'react';
import Camera from '@/components/Camera';
import TileGrid from '@/components/TileGrid';
import LiveAssistant from '@/components/LiveAssistant';
import AffirmationUI from '@/components/AffirmationUI';
import ContextNotification from '@/components/ContextNotification';
import { useAACState, APIResponse } from '@/hooks/useAACState';
import { ContextType, formatContext } from '@/lib/tiles';

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

export default function Home() {
  const { state, dispatch, displayTiles, applyContextIfReady } = useAACState();

  // Snapshot capture handler
  const handleCapture = useCallback(async (base64Image: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const response = await fetch('/api/tiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image })
      });

      const data: APIResponse = await response.json();
      dispatch({ type: 'API_RESPONSE', payload: data });

    } catch (error) {
      console.error('Error getting tiles:', error);
      dispatch({ type: 'SET_FALLBACK_TILES' });
    }
  }, [dispatch]);

  // Live mode tile updates
  const handleLiveTilesUpdate = useCallback((newTiles: { id: number; text: string; emoji: string; isSuggested?: boolean }[]) => {
    // Convert to DisplayTile format
    const displayTiles = newTiles.map(t => ({
      id: String(t.id),
      text: t.text,
      tts: t.text,
      emoji: t.emoji,
      isCore: false,
      isSuggested: t.isSuggested
    }));
    dispatch({ type: 'LIVE_TILES', payload: displayTiles });
  }, [dispatch]);

  // Apply debounced context changes in live mode
  useEffect(() => {
    if (state.context.transitionPending && state.mode === 'live') {
      const timer = setTimeout(applyContextIfReady, 500);
      return () => clearTimeout(timer);
    }
  }, [state.context.transitionPending, state.mode, applyContextIfReady]);

  // Mode toggle
  const handleLiveToggle = useCallback((isLive: boolean) => {
    dispatch({ type: 'SET_MODE', payload: isLive ? 'live' : 'snapshot' });
  }, [dispatch]);

  // Affirmation handlers
  const handleAffirm = useCallback((context: ContextType) => {
    dispatch({ type: 'AFFIRM_CONTEXT', payload: context });
  }, [dispatch]);

  const handleDismissAffirmation = useCallback(() => {
    dispatch({ type: 'DISMISS_AFFIRMATION' });
  }, [dispatch]);

  const handleClearNotification = useCallback(() => {
    dispatch({ type: 'CLEAR_NOTIFICATION' });
  }, [dispatch]);

  // Context status message
  const contextStatus = state.context.current
    ? `Context: ${formatContext(state.context.current)}`
    : state.isLoading
      ? 'Analyzing...'
      : 'Ready to scan';

  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-blue-500/30 overflow-x-hidden">
      {/* Affirmation Modal */}
      {state.showAffirmationUI && state.context.affirmation && (
        <AffirmationUI
          affirmation={state.context.affirmation}
          onConfirm={handleAffirm}
          onDismiss={handleDismissAffirmation}
        />
      )}

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
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Real-time Multimodal
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
            AAC <span className="text-blue-500">Live</span>
          </h1>
          <p className="text-gray-400 md:text-lg max-w-md font-medium leading-relaxed">
            Breaking barriers with vision-aware communication.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Action Column */}
          <div className="lg:col-span-5 space-y-6">
            <Camera
              onCapture={handleCapture}
              isLive={state.mode === 'live'}
            />

            <LiveAssistant
              apiKey={GEMINI_API_KEY}
              isLive={state.mode === 'live'}
              onTilesUpdate={handleLiveTilesUpdate}
              onLiveToggle={handleLiveToggle}
            />

            {/* Context Status */}
            <div className="flex items-center gap-2 px-4 py-3 bg-white/5 rounded-2xl border border-white/5 text-sm text-gray-500 font-medium">
              <div className={`w-1.5 h-1.5 rounded-full ${state.context.current ? 'bg-green-500' : 'bg-blue-500/50'}`} />
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
