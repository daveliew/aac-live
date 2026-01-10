'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { GeminiLiveClient } from '@/lib/gemini-live';

interface CameraProps {
  onCapture: (base64: string) => void;
  isLive?: boolean;
  liveClient?: GeminiLiveClient | null;
}

export default function Camera({
  onCapture,
  isLive = false,
  liveClient = null
}: CameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: 640, height: 480 },
          audio: isLive // Enable audio for live mode
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            setIsReady(true);
          };
        }
      } catch (err) {
        setError('Camera/Mic access denied. Please allow permissions.');
        console.error('Camera error:', err);
      }
    }

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isLive]);

  const captureFrame = useCallback((sendToLive: boolean = false) => {
    if (!videoRef.current || !canvasRef.current || !isReady) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];

    if (sendToLive && liveClient) {
      liveClient.sendMediaChunk(base64);
    } else if (!sendToLive) {
      onCapture(base64);
    }
  }, [isReady, onCapture, liveClient]);

  // Handle streaming in live mode
  useEffect(() => {
    if (!isLive || !isReady) return;

    const interval = setInterval(() => {
      captureFrame(true);
    }, 1000); // 1fps for vision updates in live mode

    return () => clearInterval(interval);
  }, [isLive, isReady, captureFrame]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-800 rounded-2xl border-2 border-dashed border-gray-700">
        <p className="text-red-400 text-center px-4 font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative group overflow-hidden rounded-2xl shadow-2xl bg-black aspect-video flex items-center justify-center">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover transition-opacity duration-700 ${isReady ? 'opacity-100' : 'opacity-0'}`}
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Overlay Glow */}
      <div className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${isLive ? 'opacity-30' : 'opacity-0'}`}>
        <div className="absolute inset-0 bg-blue-500/20 blur-3xl animate-pulse" />
      </div>

      {isReady && !isLive && (
        <button
          onClick={() => captureFrame(false)}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white text-black font-bold py-4 px-8 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2 group/btn"
        >
          <span className="w-3 h-3 bg-red-500 rounded-full group-hover/btn:animate-ping" />
          Analyze Scene
        </button>
      )}

      {isLive && (
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
          <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs font-bold tracking-widest uppercase">Live Vision</span>
        </div>
      )}

      {!isReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 gap-4">
          <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <div className="text-blue-400 font-medium tracking-wide animate-pulse">Initializing Sensors...</div>
        </div>
      )}
    </div>
  );
}
