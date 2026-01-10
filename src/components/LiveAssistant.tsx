'use client';

import { Mic, MicOff, Video, Info } from 'lucide-react';

interface LiveAssistantProps {
  isLive: boolean;
  status: 'idle' | 'connecting' | 'connected' | 'error';
  onLiveToggle: (isLive: boolean) => void;
}

export default function LiveAssistant({
  isLive,
  status,
  onLiveToggle
}: LiveAssistantProps) {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex flex-col gap-4 shadow-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${
            status === 'connected' ? 'bg-green-500 animate-pulse' :
            status === 'connecting' ? 'bg-yellow-500 animate-spin' :
            status === 'error' ? 'bg-red-500' : 'bg-gray-600'
          }`} />
          <h2 className="font-bold text-lg tracking-tight">Gemini Live</h2>
        </div>

        <button
          onClick={() => onLiveToggle(!isLive)}
          className={`
            flex items-center gap-2 px-6 py-2.5 rounded-full font-bold transition-all
            ${isLive
              ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30'
              : 'bg-blue-600 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:bg-blue-500'
            }
          `}
        >
          {isLive ? <MicOff size={18} /> : <Mic size={18} />}
          {isLive ? 'Stop Live' : 'Go Live'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 text-xs text-gray-400 bg-white/5 px-3 py-2 rounded-xl">
          <Video size={14} className="text-blue-400" />
          Scene Awareness
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 bg-white/5 px-3 py-2 rounded-xl">
          <Info size={14} className="text-purple-400" />
          Real-time Feedback
        </div>
      </div>

      {isLive && status === 'connected' && (
        <div className="text-[10px] text-blue-400/70 text-center animate-pulse uppercase tracking-widest font-black">
          Streaming Active • Analyzing Context
        </div>
      )}

      {status === 'error' && (
        <div className="text-[10px] text-red-400/70 text-center uppercase tracking-widest font-black">
          Connection Error • Try Again
        </div>
      )}
    </div>
  );
}
