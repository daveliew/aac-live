'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Camera from '@/components/Camera';
import TileGrid from '@/components/TileGrid';
import ContextPrompt from '@/components/ContextPrompt';
import ContextNotification from '@/components/ContextNotification';
import ShiftAlertModal from '@/components/ShiftAlertModal';
import { useAACState, APIResponse } from '@/hooks/useAACState';
import { usePlaces } from '@/hooks/usePlaces';
import { ContextType } from '@/lib/tiles';
import { GeminiLiveClient, ContextClassification, LiveTile } from '@/lib/gemini-live';

export default function Home() {
  const { state, dispatch, displayTiles, applyContextIfReady } = useAACState();
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [lastSpoken, setLastSpoken] = useState<string | null>(null);
  const [showMultiChoice, setShowMultiChoice] = useState(false);
  const lastCaptureRef = useRef<number>(0);

  // Places API for location names (e.g., "McDonald's")
  const { nearestPlace } = usePlaces(location);

  // Live API client
  const liveClientRef = useRef<GeminiLiveClient | null>(null);
  const [liveClient, setLiveClient] = useState<GeminiLiveClient | null>(null);

  // Initialize Live API on mount - NEXT_PUBLIC_ mapped from GEMINI_API_KEY via next.config.ts
  useEffect(() => {
    const initializeLiveAPI = async () => {
      try {
        // next.config.ts maps GEMINI_API_KEY -> NEXT_PUBLIC_GEMINI_API_KEY for client access
        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

        if (!apiKey) {
          console.log('GEMINI_API_KEY not mapped to NEXT_PUBLIC_, using REST mode');
          dispatch({ type: 'SET_CONNECTION_MODE', payload: 'rest' });
          return;
        }

        console.log('Live API key found, attempting WebSocket connection...');

        const client = new GeminiLiveClient({
          apiKey,
          onConnect: () => {
            console.log('Live API connected');
            dispatch({ type: 'LIVE_SESSION_START' });
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
          onError: (err: Error) => {
            console.error('Live API error:', err);
            // Silent fallback to REST - no error shown to children
            dispatch({ type: 'SET_CONNECTION_MODE', payload: 'rest' });
            sendDebugData({ type: 'error', message: err.message });
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

  // Update place name when nearby place changes
  useEffect(() => {
    if (nearestPlace) {
      dispatch({ type: 'SET_PLACE_NAME', payload: nearestPlace.name });
    }
  }, [nearestPlace, dispatch]);

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
      // Silent fallback - no error shown to children
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

  // Context prompt handlers
  const handleConfirmContext = useCallback((context: ContextType) => {
    dispatch({ type: 'AFFIRM_CONTEXT', payload: context });
    setShowMultiChoice(false);
  }, [dispatch]);

  const handleDismissPrompt = useCallback(() => {
    dispatch({ type: 'DISMISS_AFFIRMATION' });
    setShowMultiChoice(false);
  }, [dispatch]);

  const handleShowAlternatives = useCallback(() => {
    setShowMultiChoice(true);
  }, []);

  // Audio playback for native Gemini TTS (raw PCM 24kHz 16-bit)
  const playAudio = (audioData: ArrayBuffer) => {
    try {
      // Gemini sends raw PCM audio - convert to playable format
      const audioContext = new AudioContext({ sampleRate: 24000 });
      const int16Array = new Int16Array(audioData);
      const float32Array = new Float32Array(int16Array.length);

      // Convert 16-bit PCM to float32 (-1 to 1)
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768;
      }

      // Create audio buffer and play
      const buffer = audioContext.createBuffer(1, float32Array.length, 24000);
      buffer.getChannelData(0).set(float32Array);

      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start();
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

  // Status indicator - simplified, child-friendly
  const statusColor = state.connectionMode === 'live' && state.liveSessionActive
    ? 'bg-green-500'
    : 'bg-yellow-500';

  // Context badge - shows what context is active
  const contextEmojis: Record<string, string> = {
    restaurant_counter: '🍟',
    restaurant_table: '🍽️',
    playground: '🛝',
    classroom: '📚',
    home_kitchen: '🏠',
    home_living: '🛋️',
    store_checkout: '🛒',
    medical_office: '🏥',
    unknown: '🪞',  // Mirror = selfie/feelings mode
  };

  const activeContext = state.contextLocked ? state.lockedContext : state.context.current;

  // Special handling for feelings mode (selfie/unknown)
  const isFeelingsMode = activeContext === 'unknown';
  const contextBadge = isFeelingsMode
    ? '🪞 How are you feeling?'
    : activeContext
      ? `${contextEmojis[activeContext] || '📍'} ${activeContext.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`
      : '📍 Scanning...';

  // Determine prompt mode and options
  const affirmation = state.context.affirmation;
  const shouldShowPrompt = state.showAffirmationUI && affirmation?.uiOptions;
  const promptMode = showMultiChoice || affirmation?.uiOptions?.type === 'multi_choice'
    ? 'multi_choice'
    : 'binary';

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
        {/* Minimal header with context badge */}
        <header className="p-4 pointer-events-auto flex items-center justify-between">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-sm rounded-full">
            <div className={`w-2 h-2 rounded-full ${statusColor}`} />
            <span className="text-white/90 text-sm font-medium">{contextBadge}</span>
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

      {/* Context confirmation prompt */}
      {shouldShowPrompt && affirmation?.uiOptions && (
        <ContextPrompt
          mode={promptMode}
          primaryContext={state.context.current || undefined}
          placeName={state.placeName || undefined}
          prompt={affirmation.uiOptions.prompt}
          options={affirmation.uiOptions.options}
          onConfirm={handleConfirmContext}
          onDismiss={handleDismissPrompt}
          onShowAlternatives={handleShowAlternatives}
        />
      )}
    </main>
  );
}
