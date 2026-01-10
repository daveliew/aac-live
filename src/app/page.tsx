'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import Camera from '@/components/Camera';
import TileGrid from '@/components/TileGrid';
import AffirmationUI from '@/components/AffirmationUI';
import ContextNotification from '@/components/ContextNotification';
import { useAACState } from '@/hooks/useAACState';
import { ContextType, formatContext } from '@/lib/tiles';
import { GeminiLiveClient, GeminiLiveEvent } from '@/lib/gemini-live';
import { getAudioPlayer } from '@/lib/audio-player';

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

export default function Home() {
  const { state, dispatch, displayTiles, applyContextIfReady } = useAACState();

  // Live client state (always-on, connects on mount)
  const [liveClient, setLiveClient] = useState<GeminiLiveClient | null>(null);
  const [liveStatus, setLiveStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('connecting');
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const audioTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle events from GeminiLiveClient
  const handleLiveEvent = useCallback((event: GeminiLiveEvent) => {
    switch (event.type) {
      case 'open':
        setLiveStatus('connected');
        break;
      case 'tiles':
        // Convert to DisplayTile format and mark as suggested
        const liveTiles = event.tiles.map(t => ({
          id: String(t.id),
          text: t.text,
          tts: t.text,
          emoji: t.emoji,
          isCore: false,
          isSuggested: true
        }));
        dispatch({ type: 'LIVE_TILES', payload: liveTiles });

        // Handle context from Live API (debounced)
        if (event.context) {
          dispatch({ type: 'DEBOUNCE_CONTEXT', payload: event.context });
        }
        break;
      case 'audio':
        // Play PCM audio via Web Audio API
        setIsAudioPlaying(true);
        // Reset audio indicator after audio chunk duration (~500ms buffer)
        if (audioTimeoutRef.current) clearTimeout(audioTimeoutRef.current);
        audioTimeoutRef.current = setTimeout(() => setIsAudioPlaying(false), 800);

        getAudioPlayer().play(event.data).catch(err => {
          console.warn('Audio playback error:', err);
        });
        break;
      case 'error':
        setLiveStatus('error');
        console.error('Live error:', event.error);
        // Load fallback tiles so child can still communicate
        dispatch({ type: 'SET_FALLBACK_TILES' });
        break;
      case 'close':
        setLiveStatus('idle');
        break;
    }
  }, [dispatch]);

  // Auto-connect on mount (always-on live mode)
  useEffect(() => {
    const client = new GeminiLiveClient({ apiKey: GEMINI_API_KEY }, handleLiveEvent);
    client.connect();
    setLiveClient(client);

    return () => {
      client.disconnect();
      if (audioTimeoutRef.current) clearTimeout(audioTimeoutRef.current);
      getAudioPlayer().stop();
    };
  }, [handleLiveEvent]);

  // Connection timeout fallback - if stuck connecting, show fallback tiles
  useEffect(() => {
    if (liveStatus === 'connecting' && state.contextTiles.length === 0) {
      const timeout = setTimeout(() => {
        if (liveStatus === 'connecting') {
          dispatch({ type: 'SET_FALLBACK_TILES' });
        }
      }, 10000); // 10 second timeout
      return () => clearTimeout(timeout);
    }
  }, [liveStatus, state.contextTiles.length, dispatch]);

  // Apply debounced context changes (always live mode)
  useEffect(() => {
    if (state.context.transitionPending) {
      const timer = setTimeout(applyContextIfReady, 500);
      return () => clearTimeout(timer);
    }
  }, [state.context.transitionPending, applyContextIfReady]);

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
    : liveStatus === 'connected'
      ? 'Scanning environment...'
      : liveStatus === 'connecting'
        ? 'Connecting...'
        : 'Initializing...';

  // Status indicator color
  const statusColor = liveStatus === 'connected'
    ? 'bg-green-500'
    : liveStatus === 'error'
      ? 'bg-red-500'
      : 'bg-yellow-500 animate-pulse';

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
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${statusColor} opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${statusColor}`}></span>
            </span>
            {liveStatus === 'connected' ? 'Live' : liveStatus === 'connecting' ? 'Connecting' : 'Offline'}
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
            <Camera liveClient={liveClient} />

            {/* Status Bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-white/5 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2 text-sm text-gray-400 font-medium">
                <div className={`w-2 h-2 rounded-full ${statusColor}`} />
                {contextStatus}
              </div>
              {isAudioPlaying && (
                <div className="flex items-center gap-1.5 text-xs text-blue-400">
                  <div className="flex gap-0.5">
                    <div className="w-1 h-3 bg-blue-400 rounded-full animate-pulse" />
                    <div className="w-1 h-4 bg-blue-400 rounded-full animate-pulse delay-75" />
                    <div className="w-1 h-2 bg-blue-400 rounded-full animate-pulse delay-150" />
                  </div>
                  Speaking
                </div>
              )}
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
