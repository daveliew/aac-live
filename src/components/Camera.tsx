'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { GeminiLiveClient } from '@/lib/gemini-live';
import { ConnectionMode } from '@/hooks/useAACState';

interface CameraProps {
  onCapture: (base64: string) => void;
  mode?: ConnectionMode;
  liveClient?: GeminiLiveClient | null;
  fullscreen?: boolean;
  facingMode?: 'environment' | 'user';
}

export default function Camera({ onCapture, mode = 'rest', liveClient, fullscreen = false, facingMode = 'environment' }: CameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let isCancelled = false;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: 640, height: 480 },
          audio: false
        });

        if (isCancelled) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            if (!isCancelled) setIsReady(true);
          };
        }
      } catch (err) {
        if (!isCancelled) {
          setError('Camera access denied. Please allow permissions.');
          console.error('Camera error:', err);
        }
      }
    }

    startCamera();

    return () => {
      isCancelled = true;
      setIsReady(false);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]); // Restart camera when facingMode changes

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isReady) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];

    // Send frame based on mode
    if (mode === 'live' && liveClient?.isConnected()) {
      liveClient.sendFrame(base64);
    } else {
      onCapture(base64);
    }
  }, [isReady, onCapture, mode, liveClient]);

  // Auto-capture at 1 FPS
  useEffect(() => {
    if (!isReady) return;

    captureFrame();
    const interval = setInterval(captureFrame, 1000);
    return () => clearInterval(interval);
  }, [isReady, captureFrame]);

  // Fullscreen mode: fixed position, fills viewport
  // Contained mode: rounded box with aspect ratio
  const containerClass = fullscreen
    ? 'fixed inset-0 z-0'
    : 'relative rounded-2xl overflow-hidden shadow-2xl bg-black aspect-video';

  if (error) {
    return (
      <div className={`${containerClass} flex items-center justify-center bg-gray-900`}>
        <p className="text-red-400 text-center px-4 font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover transition-opacity duration-700 ${isReady ? 'opacity-100' : 'opacity-0'} ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
      />
      <canvas ref={canvasRef} className="hidden" />

      {!isReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 gap-4">
          <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <div className="text-white/60 font-medium">Initializing Camera...</div>
        </div>
      )}
    </div>
  );
}
