'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Camera from '@/components/Camera';
import TileGrid from '@/components/TileGrid';
import ContextNotification from '@/components/ContextNotification';
import ShiftAlertModal from '@/components/ShiftAlertModal';
import ErrorToast from '@/components/ErrorToast';
import { useAACState, APIResponse } from '@/hooks/useAACState';
import { ContextType } from '@/lib/tiles';
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

  // Initialize Live API on mount
  useEffect(() => {
    const initializeLiveAPI = async () => {
      try {
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
          console.log('GEMINI_API_KEY not configured, using REST mode');
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

            if (state.contextLocked) {
              dispatch({
                type: 'BACKGROUND_UPDATE',
                payload: {
                  context: context.primaryContext as ContextType,
                  confidence: context.confidenceScore
                }
              });
            } else {
              dispatch({
                type: 'DEBOUNCE_CONTEXT',
                payload: context.primaryContext as ContextType
              });
            }

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

        client.connect().catch(err => {
          console.error('Failed to connect to Live API:', err);
          dispatch({ type: 'SET_CONNECTION_MODE', payload: 'rest' });
        });
      } catch (err) {
        console.error('Failed to initialize Live API:', err);
        dispatch({ type: 'SET_CONNECTION_MODE', payload: 'rest' });
      }
    };

    initializeLiveAPI();

    return () => {
      if (liveClientRef.current) {
        liveClientRef.current.disconnect();
      }
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
    if (state.connectionMode === 'live' && liveClient?.isConnected()) {
      return;
    }

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

      if (state.contextLocked) {
        dispatch({
          type: 'BACKGROUND_UPDATE',
          payload: {
            context: data.classification.primaryContext as ContextType,
            confidence: data.classification.confidenceScore
          }
        });
      } else {
        dispatch({ type: 'DEBOUNCE_CONTEXT', payload: data.classification.primaryContext as ContextType });

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

  // Status indicator
  const statusColor = state.connectionMode === 'live'
    ? (state.liveSessionActive ? 'bg-green-500' : 'bg-yellow-500')
    : 'bg-yellow-500';

  const statusText = state.contextLocked
    ? 'Locked'
    : state.context.current
      ? 'Scanning'
      : 'Initializing';

  return (
    <main className="relative h-screen overflow-hidden bg-black">
      {/* Fullscreen camera background */}
      <Camera
        onCapture={handleCapture}
        mode={state.connectionMode}
        liveClient={liveClient}
        fullscreen
      />

      {/* Overlay content */}
      <div className="relative z-10 h-full flex flex-col pointer-events-none">
        {/* Minimal header */}
        <header className="p-4 pointer-events-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${statusColor} animate-pulse`} />
            <span className="text-white/80 text-sm font-medium">{statusText}</span>
          </div>
          <span className="text-white text-xl font-bold drop-shadow-lg">
            Glimpse
          </span>
        </header>

        {/* Last spoken feedback */}
        {lastSpoken && (
          <div className="mx-4 px-4 py-2 bg-black/40 backdrop-blur-sm rounded-full pointer-events-auto self-start">
            <span className="text-white/90 text-sm">🗣️ &quot;{lastSpoken}&quot;</span>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Tiles at bottom */}
        <div className="px-4 pb-8 pointer-events-auto">
          <TileGrid
            tiles={displayTiles}
            isLoading={state.isLoading}
            onTileSpeak={setLastSpoken}
          />
        </div>
      </div>

      {/* Modals and notifications */}
      {state.notification && (
        <ContextNotification
          notification={state.notification}
          onDismiss={handleClearNotification}
        />
      )}

      <ShiftAlertModal
        isOpen={state.majorShiftDetected}
        currentContext={state.lockedContext}
        newContext={state.backgroundContext}
        onSwitch={handleSwitchContext}
        onStay={handleStayInContext}
      />

      {error && <ErrorToast message={error} onDismiss={() => setError(null)} />}
    </main>
  );
}
