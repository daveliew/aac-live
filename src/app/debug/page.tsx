'use client';

import { useEffect, useState, useRef } from 'react';
import { formatContext, ContextType } from '@/lib/tiles';

interface DebugEntry {
  timestamp: Date;
  type: 'context' | 'tiles' | 'connection' | 'error';
  data: unknown;
}

interface DebugState {
  connectionMode: 'live' | 'rest' | 'disconnected';
  sessionTimeRemaining: number;
  currentContext: string | null;
  backgroundContext: string | null;
  confidence: number;
  isLocked: boolean;
  tileCount: number;
  lastUpdate: Date | null;
}

export default function DebugPage() {
  const [debugState, setDebugState] = useState<DebugState>({
    connectionMode: 'disconnected',
    sessionTimeRemaining: 0,
    currentContext: null,
    backgroundContext: null,
    confidence: 0,
    isLocked: false,
    tileCount: 0,
    lastUpdate: null,
  });
  const [log, setLog] = useState<DebugEntry[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  // Listen for debug events from the main app via localStorage
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'glimpse_debug') {
        try {
          const data = JSON.parse(e.newValue || '{}');
          setDebugState(prev => ({ ...prev, ...data }));

          // Add to log
          setLog(prev => [
            ...prev.slice(-100), // Keep last 100 entries
            {
              timestamp: new Date(),
              type: data.type || 'context',
              data: data
            }
          ]);
        } catch {
          // Ignore parse errors
        }
      }
    };

    window.addEventListener('storage', handleStorage);

    // Also check for existing debug state
    const existing = localStorage.getItem('glimpse_debug');
    if (existing) {
      try {
        setDebugState(prev => ({ ...prev, ...JSON.parse(existing) }));
      } catch {
        // Ignore
      }
    }

    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const connectionColor = {
    live: 'bg-green-500',
    rest: 'bg-yellow-500',
    disconnected: 'bg-red-500'
  }[debugState.connectionMode];

  return (
    <main className="min-h-screen bg-[#050505] text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Glimpse Debug</h1>
          <a
            href="/"
            className="px-4 py-2 text-sm font-medium bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            Back to App
          </a>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Connection Status */}
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Connection</div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${connectionColor} animate-pulse`} />
              <span className="font-bold capitalize">{debugState.connectionMode}</span>
            </div>
          </div>

          {/* Session Time */}
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Session Time</div>
            <div className="font-bold font-mono text-xl">
              {formatTime(debugState.sessionTimeRemaining)}
            </div>
          </div>

          {/* Context Lock */}
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Context Lock</div>
            <div className="flex items-center gap-2">
              {debugState.isLocked ? (
                <>
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="font-bold text-blue-400">Locked</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                  <span className="font-bold text-gray-400">Unlocked</span>
                </>
              )}
            </div>
          </div>

          {/* Tile Count */}
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Tiles</div>
            <div className="font-bold text-xl">{debugState.tileCount}</div>
          </div>
        </div>

        {/* Context Panel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Current Context */}
          <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Current Context</div>
            <div className="text-2xl font-bold mb-2">
              {debugState.currentContext ? formatContext(debugState.currentContext as ContextType) : 'None'}
            </div>
            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-400">Confidence:</div>
              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${debugState.confidence * 100}%` }}
                />
              </div>
              <div className="text-sm font-mono">{(debugState.confidence * 100).toFixed(0)}%</div>
            </div>
          </div>

          {/* Background Context */}
          <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Background Context</div>
            <div className="text-2xl font-bold mb-2">
              {debugState.backgroundContext ? formatContext(debugState.backgroundContext as ContextType) : 'None'}
            </div>
            {debugState.backgroundContext && debugState.backgroundContext !== debugState.currentContext && (
              <div className="text-yellow-400 text-sm font-medium">
                Different from current context
              </div>
            )}
          </div>
        </div>

        {/* Event Log */}
        <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Event Log</span>
            <button
              onClick={() => setLog([])}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              Clear
            </button>
          </div>
          <div
            ref={logRef}
            className="h-64 overflow-y-auto p-4 font-mono text-xs space-y-1"
          >
            {log.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                Waiting for events...
              </div>
            ) : (
              log.map((entry, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-gray-500 flex-shrink-0">
                    {entry.timestamp.toLocaleTimeString()}
                  </span>
                  <span className={`flex-shrink-0 uppercase ${
                    entry.type === 'error' ? 'text-red-400' :
                    entry.type === 'connection' ? 'text-green-400' :
                    entry.type === 'tiles' ? 'text-blue-400' :
                    'text-yellow-400'
                  }`}>
                    [{entry.type}]
                  </span>
                  <span className="text-gray-300 truncate">
                    {JSON.stringify(entry.data).slice(0, 100)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="text-center text-gray-500 text-sm">
          <p>Open the main app in another tab to see live debug data.</p>
          <p className="mt-1">Debug data is shared via localStorage.</p>
        </div>
      </div>
    </main>
  );
}
