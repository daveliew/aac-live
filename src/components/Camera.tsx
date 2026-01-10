'use client';

import { useRef, useEffect, useCallback, useState } from 'react';

interface CameraProps {
  onCapture: (base64: string) => void;
  autoCapture?: boolean;
  captureInterval?: number;
}

export default function Camera({
  onCapture,
  autoCapture = false,
  captureInterval = 3000
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
          video: { facingMode: 'environment', width: 640, height: 480 }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            setIsReady(true);
          };
        }
      } catch (err) {
        setError('Camera access denied. Please allow camera permissions.');
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

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isReady) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
    onCapture(base64);
  }, [isReady, onCapture]);

  // Auto-capture at interval if enabled
  useEffect(() => {
    if (!autoCapture || !isReady) return;

    const interval = setInterval(captureFrame, captureInterval);
    return () => clearInterval(interval);
  }, [autoCapture, isReady, captureFrame, captureInterval]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-800 rounded-xl">
        <p className="text-red-400 text-center px-4">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full rounded-xl shadow-lg"
      />
      <canvas ref={canvasRef} className="hidden" />

      {isReady && (
        <button
          onClick={captureFrame}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-full shadow-lg transition-all active:scale-95"
        >
          Scan Context
        </button>
      )}

      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 rounded-xl">
          <div className="animate-pulse text-white">Starting camera...</div>
        </div>
      )}
    </div>
  );
}
