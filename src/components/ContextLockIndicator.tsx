'use client';

import { ContextType, formatContext } from '@/lib/tiles';
import { ConnectionMode } from '@/hooks/useAACState';

interface ContextLockIndicatorProps {
  isLocked: boolean;
  lockedContext: ContextType | null;
  connectionMode: ConnectionMode;
  onUnlock: () => void;
}

export default function ContextLockIndicator({
  isLocked,
  lockedContext,
  connectionMode,
  onUnlock
}: ContextLockIndicatorProps) {
  if (!isLocked || !lockedContext) {
    return null;
  }

  const modeColor = connectionMode === 'live' ? 'text-green-400' : 'text-yellow-400';
  const modeLabel = connectionMode === 'live' ? 'Live API' : 'REST';

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 bg-white/5 rounded-2xl border border-white/10 mb-4">
      <div className="flex items-center gap-3">
        {/* Lock icon */}
        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
          <svg
            className="w-4 h-4 text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>

        <div className="flex flex-col">
          <span className="text-sm font-bold text-white">
            {formatContext(lockedContext)}
          </span>
          <span className={`text-xs ${modeColor}`}>
            {modeLabel}
          </span>
        </div>
      </div>

      <button
        onClick={onUnlock}
        className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
      >
        Unlock
      </button>
    </div>
  );
}
