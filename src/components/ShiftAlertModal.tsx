'use client';

import { ContextType, formatContext } from '@/lib/tiles';

interface ShiftAlertModalProps {
  isOpen: boolean;
  currentContext: ContextType | null;
  newContext: ContextType | null;
  onSwitch: () => void;
  onStay: () => void;
}

export default function ShiftAlertModal({
  isOpen,
  currentContext,
  newContext,
  onSwitch,
  onStay
}: ShiftAlertModalProps) {
  if (!isOpen || !newContext) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-gray-900 rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <svg
              className="w-7 h-7 text-yellow-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            Scene Changed
          </h2>
          <p className="text-gray-400 text-sm">
            Detected a new environment
          </p>
        </div>

        {/* Context comparison */}
        <div className="px-6 pb-4">
          <div className="flex items-center justify-center gap-4 py-4 bg-white/5 rounded-2xl">
            {currentContext && (
              <>
                <div className="text-center">
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Current</span>
                  <p className="text-white font-medium mt-1">{formatContext(currentContext)}</p>
                </div>
                <div className="text-gray-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </>
            )}
            <div className="text-center">
              <span className="text-xs text-green-400 uppercase tracking-wider">Detected</span>
              <p className="text-white font-medium mt-1">{formatContext(newContext)}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onStay}
            className="flex-1 px-4 py-3 text-sm font-bold text-gray-300 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
          >
            Stay Here
          </button>
          <button
            onClick={onSwitch}
            className="flex-1 px-4 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors"
          >
            Switch Context
          </button>
        </div>
      </div>
    </div>
  );
}
