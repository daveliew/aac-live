'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Camera from '@/components/Camera';
import TileGrid from '@/components/TileGrid';
import EntityChips from '@/components/EntityChips';
import ContextNotification from '@/components/ContextNotification';
import ContextPrompt from '@/components/ContextPrompt';
import ShiftAlertModal from '@/components/ShiftAlertModal';
import { useAACState, APIResponse } from '@/hooks/useAACState';
import { usePlaces } from '@/hooks/usePlaces';
import { useAudioCapture } from '@/hooks/useAudioCapture';
import { ContextType } from '@/lib/tiles';
import { GeminiLiveClient, ContextClassification, LiveTile } from '@/lib/gemini-live';
import LocationPicker from '@/components/LocationPicker';

export default function Home() {
  const { state, dispatch, displayTiles, applyContextIfReady } = useAACState();
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [lastSpoken, setLastSpoken] = useState<string | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const lastCaptureRef = useRef<number>(0);

  // Places API for location names (e.g., "McDonald's")
  const { nearestPlace, refetch: refetchPlaces, refetchWithCoords } = usePlaces(location);

  // Live API client
  const liveClientRef = useRef<GeminiLiveClient | null>(null);
  const [liveClient, setLiveClient] = useState<GeminiLiveClient | null>(null);

  // Audio chunk handler - sends microphone audio to Live API
  const handleAudioChunk = useCallback((pcmData: ArrayBuffer) => {
    if (liveClientRef.current?.isConnected()) {
      liveClientRef.current.sendAudio(pcmData);
    }
  }, []);

  // Audio capture - auto-starts when Live session is active
  useAudioCapture({
    onAudioChunk: handleAudioChunk,
    enabled: state.liveSessionActive
  });

  // HYBRID MODE: REST for classification (stable), Live API for TTS (wow factor)
  const USE_REST_FOR_CLASSIFICATION = true;

  // Initialize Live API on mount - used for native TTS even when REST handles classification
  useEffect(() => {
    const initializeLiveAPI = async () => {
      try {
        // Set REST mode for classification reliability
        if (USE_REST_FOR_CLASSIFICATION) {
          console.log('Hybrid mode: REST for classification, Live API for TTS');
          dispatch({ type: 'SET_CONNECTION_MODE', payload: 'rest' });
        }

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

  // Handle frame capture - REST API
  const handleCapture = useCallback(async (base64Image: string) => {
    if (state.connectionMode === 'live' && liveClient?.isConnected()) {
      return;
    }

    const now = Date.now();
    if (now - lastCaptureRef.current < 300) return; // 300ms (~3 FPS)
    lastCaptureRef.current = now;

    try {
      const response = await fetch('/api/tiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64Image,
          location,
          placeName: nearestPlace?.name
        })
      });

      if (!response.ok) throw new Error('API error');

      const data: APIResponse = await response.json();

      // Always update tiles + context (simple flow)
      dispatch({ type: 'API_RESPONSE', payload: data });

    } catch (err) {
      console.error('Error getting tiles:', err);
      dispatch({ type: 'SET_FALLBACK_TILES' });
    }
  }, [dispatch, location, state.connectionMode, liveClient, nearestPlace]);

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

  // Entity focus handler
  const handleEntityFocus = useCallback((entity: string | null) => {
    dispatch({ type: 'FOCUS_ENTITY', payload: entity });
  }, [dispatch]);

  // Native TTS handler - uses Gemini Live API for natural voice
  const handleNativeTTS = useCallback((text: string) => {
    if (liveClient?.isConnected()) {
      console.log('[NativeTTS] Requesting speech:', text);
      liveClient.requestTTS(text);
    } else {
      // Fallback to browser TTS if Live API not connected
      console.log('[NativeTTS] Live API not connected, using browser TTS');
      import('@/lib/tts').then(({ speak }) => speak(text));
    }
  }, [liveClient]);

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
    : state.sessionLocation
      ? 'bg-green-500'  // Green when session locked
      : 'bg-yellow-500'; // Yellow when scanning

  // Context badge - shows what context is active (STABLE - uses session location)
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

  // Use session location for stable badge (no flicker!)
  const sessionContext = state.sessionLocation?.context;
  const isFeelingsMode = sessionContext === 'unknown';

  // Format context label
  const formatContextLabel = (ctx: ContextType | null | undefined): string => {
    if (!ctx) return 'Scanning...';
    return ctx.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  // Build stable badge from session location
  const placeBadge = (() => {
    // No session location yet - show scanning
    if (!state.sessionLocation) {
      return { emoji: '📍', primary: 'Scanning...', secondary: null };
    }

    // Feelings mode (selfie detected)
    if (isFeelingsMode) {
      return { emoji: '🪞', primary: 'How are you feeling?', secondary: null };
    }

    const emoji = sessionContext ? (contextEmojis[sessionContext] || '📍') : '📍';
    const contextLabel = formatContextLabel(sessionContext);

    // Show place name if available, otherwise area name, otherwise just context
    if (state.sessionLocation.placeName) {
      return { emoji, primary: state.sessionLocation.placeName, secondary: contextLabel };
    }
    if (state.sessionLocation.areaName) {
      return { emoji: '📍', primary: state.sessionLocation.areaName, secondary: contextLabel };
    }
    return { emoji, primary: contextLabel, secondary: null };
  })();

  // Handler for tapping the badge
  const handleBadgeTap = useCallback(() => {
    dispatch({ type: 'SHOW_LOCATION_PICKER' });
  }, [dispatch]);

  // Handler for selecting a location from picker
  const handleLocationSelect = useCallback((context: ContextType) => {
    dispatch({ type: 'SELECT_LOCATION', payload: context });
  }, [dispatch]);

  // Handler for closing location picker
  const handleLocationPickerClose = useCallback(() => {
    dispatch({ type: 'HIDE_LOCATION_PICKER' });
  }, [dispatch]);

  // Handler for "Find my location" - refetches GPS and places
  const handleFindLocation = useCallback(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newLat = pos.coords.latitude;
          const newLng = pos.coords.longitude;
          setLocation({ lat: newLat, lng: newLng });
          refetchWithCoords(newLat, newLng);
          // Clear session location so it re-detects
          dispatch({ type: 'RESET_SHIFT_COUNTER' });
        },
        (err) => console.warn('GPS error:', err),
        { enableHighAccuracy: true }
      );
    }
  }, [refetchWithCoords, dispatch]);

  return (
    <main className="relative h-screen overflow-hidden bg-black">
      {/* Fullscreen camera background */}
      <Camera
        onCapture={handleCapture}
        mode={state.connectionMode}
        liveClient={liveClient}
        facingMode={cameraFacing}
        fullscreen
      />

      {/* Overlay content */}
      <div className="relative z-10 h-full flex flex-col pointer-events-none">
        {/* Header with place/context badge (tappable to change location) */}
        <header className="p-4 pointer-events-auto flex items-center justify-between">
          <button
            onClick={handleBadgeTap}
            className="flex items-center gap-2 px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-xl active:scale-95 transition-transform"
          >
            <span className="text-2xl">{placeBadge.emoji}</span>
            <div className="flex flex-col items-start">
              <span className="text-white font-semibold text-sm leading-tight">{placeBadge.primary}</span>
              {placeBadge.secondary && (
                <span className="text-white/60 text-xs leading-tight">{placeBadge.secondary}</span>
              )}
            </div>
            <div className={`w-2 h-2 rounded-full ${statusColor} ml-1`} />
            <span className="text-white/40 text-xs ml-0.5">▼</span>
          </button>
          <div className="flex items-center gap-3">
            {/* Camera flip - mobile only */}
            <button
              onClick={() => setCameraFacing(prev => prev === 'environment' ? 'user' : 'environment')}
              className="sm:hidden w-10 h-10 flex items-center justify-center bg-black/50 backdrop-blur-md rounded-full active:scale-95 transition-transform"
              aria-label="Flip camera"
            >
              <span className="text-xl">{cameraFacing === 'environment' ? '🤳' : '📷'}</span>
            </button>
            <span className="text-white text-xl font-bold drop-shadow-lg">
              Glimpse
            </span>
          </div>
        </header>

        {/* Last spoken feedback */}
        {lastSpoken && (
          <div className="mx-4 px-4 py-2 bg-black/40 backdrop-blur-sm rounded-full pointer-events-auto self-start">
            <span className="text-white/90 text-sm">🗣️ &quot;{lastSpoken}&quot;</span>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Entity chips + Tiles at bottom */}
        <div className="px-4 pb-6 pointer-events-auto flex flex-col gap-2">
          {/* Semi-transparent backdrop for readability */}
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none -z-10" />
          {/* Entity chips - what the camera sees */}
          <EntityChips
            entities={state.detectedEntities}
            focusedEntity={state.focusedEntity}
            onFocus={handleEntityFocus}
          />
          <TileGrid
            tiles={displayTiles}
            isLoading={state.isLoading}
            onTileSpeak={setLastSpoken}
            onNativeTTS={handleNativeTTS}
            focusedEntity={state.focusedEntity}
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

      {/* Location picker (manual override) */}
      {state.showLocationPicker && (
        <LocationPicker
          currentContext={state.sessionLocation?.context || null}
          onSelect={handleLocationSelect}
          onFindLocation={handleFindLocation}
          onClose={handleLocationPickerClose}
        />
      )}
    </main>
  );
}
