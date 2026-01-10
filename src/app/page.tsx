'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Camera from '@/components/Camera';
import CoreTileBar from '@/components/CoreTileBar';
import TileGrid from '@/components/TileGrid';
import ContextNotification from '@/components/ContextNotification';
import ContextLockIndicator from '@/components/ContextLockIndicator';
import ShiftAlertModal from '@/components/ShiftAlertModal';
import ErrorToast from '@/components/ErrorToast';
import { useAACState, APIResponse } from '@/hooks/useAACState';
import { formatContext, ContextType } from '@/lib/tiles';
import { GeminiLiveClient, ContextClassification, LiveTile } from '@/lib/gemini-live';

export default function Home() {
  const { state, dispatch, displayTiles, applyContextIfReady } = useAACState();
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [lastSpoken, setLastSpoken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastCaptureRef = useRef<number>(0);

  // Live API client
  const liveClientRef = useRef<GeminiLiveClient | null>(null);
  const [liveClient, setLiveClient] = useState<GeminiLiveClient | null>(null);

  // Initialize Live API on mount (only if NEXT_PUBLIC key is set)
  useEffect(() => {
    // Live API requires client-side key (NEXT_PUBLIC_GEMINI_API_KEY)
    // If not set, use REST mode which uses server-side GEMINI_API_KEY
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      console.log('Using REST mode (server-side GEMINI_API_KEY)');
      dispatch({ type: 'SET_CONNECTION_MODE', payload: 'rest' });
      return;
    }

    console.log('Live API key found, attempting WebSocket connection...');

    const client = new GeminiLiveClient({
      apiKey,
      onConnect: () => {
        console.log('Live API connected');
        dispatch({ type: 'LIVE_SESSION_START' });
        setError(null);
      },
      onContext: (context: ContextClassification) => {
        console.log('Live context:', context);

        // If locked, update background context silently
        if (state.contextLocked) {
          dispatch({
            type: 'BACKGROUND_UPDATE',
            payload: {
              context: context.primaryContext as ContextType,
              confidence: context.confidenceScore
            }
          });
        } else {
          // Not locked - debounce context changes
          dispatch({
            type: 'DEBOUNCE_CONTEXT',
            payload: context.primaryContext as ContextType
          });
        }

        // Send debug data
        sendDebugData({
          type: 'context',
          currentContext: context.primaryContext,
          confidence: context.confidenceScore,
          entities: context.entitiesDetected
        });
      },
      onTiles: (tiles: LiveTile[]) => {
        console.log('Live tiles:', tiles);
        dispatch({
          type: 'LIVE_TILES',
          payload: tiles.map(t => ({
            id: t.id,
            text: t.label,
            tts: t.tts,
            emoji: t.emoji,
            isCore: false,
            isSuggested: true,
            relevanceScore: t.relevanceScore
          }))
        });

        sendDebugData({ type: 'tiles', tileCount: tiles.length });
      },
      onAudio: (audioData: ArrayBuffer) => {
        // Play native audio from Gemini
        playAudio(audioData);
      },
      onError: (error: Error) => {
        console.error('Live API error:', error);
        setError('Live API error, switching to REST mode');
        dispatch({ type: 'SET_CONNECTION_MODE', payload: 'rest' });
        sendDebugData({ type: 'error', message: error.message });
      },
      onDisconnect: () => {
        console.log('Live API disconnected');
        dispatch({ type: 'LIVE_SESSION_END' });
        sendDebugData({ type: 'connection', connectionMode: 'disconnected' });
      },
      onSessionExpiring: () => {
        console.log('Live session expiring, reconnecting...');
        sendDebugData({ type: 'connection', message: 'Session expiring, reconnecting' });
      }
    });

    liveClientRef.current = client;
    setLiveClient(client);

    // Connect to Live API
    client.connect().catch(err => {
      console.error('Failed to connect to Live API:', err);
      dispatch({ type: 'SET_CONNECTION_MODE', payload: 'rest' });
    });

    return () => {
      client.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update debug data periodically
  useEffect(() => {
    const interval = setInterval(() => {
      sendDebugData({
        connectionMode: state.connectionMode,
        sessionTimeRemaining: liveClient?.getSessionTimeRemaining() || 0,
        currentContext: state.context.current,
        backgroundContext: state.backgroundContext,
        confidence: state.backgroundConfidence,
        isLocked: state.contextLocked,
        tileCount: displayTiles.filter(t => !t.isCore).length,
        lastUpdate: new Date().toISOString()
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [state, liveClient, displayTiles]);

  // Initialize geolocation
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn('Geolocation error:', err),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // Handle frame capture - REST API fallback
  const handleCapture = useCallback(async (base64Image: string) => {
    // Only use REST if not in live mode
    if (state.connectionMode === 'live' && liveClient?.isConnected()) {
      return; // Live mode handles frames directly
    }

    // Debounce: skip if last capture was < 800ms ago
    const now = Date.now();
    if (now - lastCaptureRef.current < 800) return;
    lastCaptureRef.current = now;

    try {
      const response = await fetch('/api/tiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image, location })
      });

      if (!response.ok) throw new Error('API error');

      const data: APIResponse = await response.json();
      setError(null);

      // If locked, update background context
      if (state.contextLocked) {
        dispatch({
          type: 'BACKGROUND_UPDATE',
          payload: {
            context: data.classification.primaryContext as ContextType,
            confidence: data.classification.confidenceScore
          }
        });
      } else {
        // Debounce context changes
        dispatch({ type: 'DEBOUNCE_CONTEXT', payload: data.classification.primaryContext as ContextType });

        // Update tiles
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
      }
    } catch (err) {
      console.error('Error getting tiles:', err);
      setError("Couldn't analyze scene. Retrying...");
      dispatch({ type: 'SET_FALLBACK_TILES' });
    }
  }, [dispatch, location, state.connectionMode, state.contextLocked, liveClient]);

  // Apply debounced context changes
  useEffect(() => {
    if (state.context.transitionPending) {
      const timer = setTimeout(applyContextIfReady, 500);
      return () => clearTimeout(timer);
    }
  }, [state.context.transitionPending, applyContextIfReady]);

  // Handlers
  const handleClearNotification = useCallback(() => {
    dispatch({ type: 'CLEAR_NOTIFICATION' });
  }, [dispatch]);

  const handleLockContext = useCallback(() => {
    if (state.context.current) {
      dispatch({ type: 'LOCK_CONTEXT', payload: state.context.current });
    }
  }, [dispatch, state.context.current]);

  const handleUnlockContext = useCallback(() => {
    dispatch({ type: 'UNLOCK_CONTEXT' });
  }, [dispatch]);

  const handleSwitchContext = useCallback(() => {
    if (state.backgroundContext) {
      dispatch({ type: 'LOCK_CONTEXT', payload: state.backgroundContext });
    }
  }, [dispatch, state.backgroundContext]);

  const handleStayInContext = useCallback(() => {
    dispatch({ type: 'DISMISS_SHIFT_ALERT' });
  }, [dispatch]);

  // Audio playback for native Gemini TTS
  const playAudio = (audioData: ArrayBuffer) => {
    try {
      const audioContext = new AudioContext();
      audioContext.decodeAudioData(audioData, (buffer) => {
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start();
      });
    } catch (err) {
      console.error('Error playing audio:', err);
    }
  };

  // Send debug data to localStorage for /debug page
  const sendDebugData = (data: Record<string, unknown>) => {
    try {
      localStorage.setItem('glimpse_debug', JSON.stringify(data));
    } catch {
      // Ignore storage errors
    }
  };

  // Status
  const isConnected = state.connectionMode === 'live' ? state.liveSessionActive : true;
  const contextStatus = state.contextLocked
    ? `Locked: ${formatContext(state.lockedContext!)}`
    : state.context.current
      ? `Context: ${formatContext(state.context.current)}`
      : isConnected
        ? 'Scanning environment...'
        : 'Initializing...';

  const statusColor = state.connectionMode === 'live'
    ? (state.liveSessionActive ? 'bg-green-500' : 'bg-yellow-500 animate-pulse')
    : 'bg-yellow-500';

  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-blue-500/30 overflow-x-hidden">
      {/* Context Change Notification */}
      {state.notification && (
        <ContextNotification
          notification={state.notification}
          onDismiss={handleClearNotification}
        />
      )}

      {/* Shift Alert Modal */}
      <ShiftAlertModal
        isOpen={state.majorShiftDetected}
        currentContext={state.lockedContext}
        newContext={state.backgroundContext}
        onSwitch={handleSwitchContext}
        onStay={handleStayInContext}
      />

      {/* Error Toast */}
      {error && <ErrorToast message={error} onDismiss={() => setError(null)} />}

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
            {state.connectionMode === 'live' ? (state.liveSessionActive ? 'Live' : 'Connecting') : 'REST'}
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
            Glimpse
          </h1>
          <p className="text-gray-400 md:text-lg max-w-md font-medium leading-relaxed">
            Vision-aware communication for non-verbal children.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Camera Column */}
          <div className="lg:col-span-5 space-y-4">
            <Camera
              onCapture={handleCapture}
              mode={state.connectionMode}
              liveClient={liveClient}
            />

            {/* Status Bar */}
            <div className="flex items-center justify-between gap-2 px-4 py-3 bg-white/5 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2 text-sm text-gray-400 font-medium">
                <div className={`w-2 h-2 rounded-full ${statusColor}`} />
                {contextStatus}
              </div>

              {/* Lock button - only show when context detected and not locked */}
              {state.context.current && !state.contextLocked && (
                <button
                  onClick={handleLockContext}
                  className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors"
                >
                  Lock
                </button>
              )}
            </div>
          </div>

          {/* Tiles Column */}
          <div className="lg:col-span-7">
            {/* Context Lock Indicator */}
            <ContextLockIndicator
              isLocked={state.contextLocked}
              lockedContext={state.lockedContext}
              connectionMode={state.connectionMode}
              onUnlock={handleUnlockContext}
            />

            {/* Fixed Core Buttons - Always visible */}
            <CoreTileBar onSpeak={setLastSpoken} />

            {/* Last Spoken Phrase */}
            {lastSpoken && (
              <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl border border-white/10 mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <span className="text-cyan-400 text-lg">🗣️</span>
                <span className="text-gray-300 italic text-lg">&quot;{lastSpoken}&quot;</span>
              </div>
            )}

            <div className="flex items-center justify-between mb-4 px-2">
              <h2 className="text-lg font-bold tracking-tight text-gray-300">Context Suggestions</h2>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                {displayTiles.filter(t => !t.isCore).length} Options
              </span>
            </div>

            <TileGrid
              tiles={displayTiles.filter(t => !t.isCore)}
              isLoading={state.isLoading}
              onTileSpeak={setLastSpoken}
            />
          </div>
        </div>

        {/* Footer */}
        <footer className="pt-12 border-t border-white/5 flex flex-col items-center gap-4">
          <p className="text-gray-600 text-sm font-medium">
            Designed for the <span className="text-white">Gemini API Hackathon</span>
          </p>
          <div className="flex gap-4">
            <a href="/debug" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
              Debug
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
