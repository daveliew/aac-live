'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { GeminiLiveClient } from '@/lib/gemini-live';

interface CameraProps {
  isLive?: boolean;
  liveClient?: GeminiLiveClient | null;
}

export default function Camera({
  isLive = true,
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
          audio: false
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            setIsReady(true);
          };
        }
      } catch (err) {
        setError('Camera access denied. Please allow permissions.');
        console.error('Camera error:', err);
      }
    }

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Stream frames to Gemini Live
  const streamFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isReady || !liveClient) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
    liveClient.sendMediaChunk(base64);
  }, [isReady, liveClient]);

  // Stream at 1 FPS when live and connected
  useEffect(() => {
    if (!isLive || !isReady || !liveClient) return;

    const interval = setInterval(streamFrame, 1000);
    return () => clearInterval(interval);
  }, [isLive, isReady, liveClient, streamFrame]);

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

      {/* Overlay Glow (always on in live mode) */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <div className="absolute inset-0 bg-blue-500/20 blur-3xl animate-pulse" />
      </div>

      {/* Live indicator */}
      {isReady && (
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
          <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs font-bold tracking-widest uppercase">Live</span>
        </div>
      )}

      {!isReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 gap-4">
          <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <div className="text-blue-400 font-medium tracking-wide animate-pulse">Initializing Camera...</div>
        </div>
      )}
    </div>
  );
}
