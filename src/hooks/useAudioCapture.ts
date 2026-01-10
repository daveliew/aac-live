'use client';

/**
 * Audio Capture Hook for Gemini Live API
 *
 * Captures microphone audio, resamples to 16kHz, and streams PCM chunks.
 * Required format: 16kHz, 16-bit signed PCM, mono
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseAudioCaptureOptions {
  onAudioChunk: (pcmData: ArrayBuffer) => void;
  enabled?: boolean;
  chunkIntervalMs?: number; // How often to send chunks (default: 100ms)
}

interface UseAudioCaptureResult {
  isCapturing: boolean;
  hasPermission: boolean | null;
  error: string | null;
}

const TARGET_SAMPLE_RATE = 16000; // Gemini requires 16kHz
const CHUNK_INTERVAL_MS = 100; // Send audio every 100ms

/**
 * Resample audio from source rate to 16kHz
 */
function resampleTo16k(input: Float32Array, inputSampleRate: number): Int16Array {
  const ratio = inputSampleRate / TARGET_SAMPLE_RATE;
  const outputLength = Math.floor(input.length / ratio);
  const output = new Int16Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const srcIndex = Math.floor(i * ratio);
    // Clamp and convert float32 (-1 to 1) to int16 (-32768 to 32767)
    const sample = Math.max(-1, Math.min(1, input[srcIndex]));
    output[i] = Math.floor(sample * 32767);
  }

  return output;
}

export function useAudioCapture({
  onAudioChunk,
  enabled = true,
  chunkIntervalMs = CHUNK_INTERVAL_MS
}: UseAudioCaptureOptions): UseAudioCaptureResult {
  const [isCapturing, setIsCapturing] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioBufferRef = useRef<Float32Array[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCapturingRef = useRef(false); // Internal ref to avoid effect setState issues

  // Process and send buffered audio
  const flushAudioBuffer = useCallback(() => {
    if (audioBufferRef.current.length === 0) return;

    const audioContext = audioContextRef.current;
    if (!audioContext) return;

    // Concatenate all buffered chunks
    const totalLength = audioBufferRef.current.reduce((sum, chunk) => sum + chunk.length, 0);
    const combined = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of audioBufferRef.current) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    audioBufferRef.current = [];

    // Resample to 16kHz and convert to Int16
    const resampled = resampleTo16k(combined, audioContext.sampleRate);

    // Copy to a proper ArrayBuffer (TypeScript requires this)
    const buffer = new ArrayBuffer(resampled.byteLength);
    new Int16Array(buffer).set(resampled);
    onAudioChunk(buffer);
  }, [onAudioChunk]);

  // Start capturing
  const startCapture = useCallback(async () => {
    if (isCapturingRef.current) return;
    isCapturingRef.current = true;

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      setHasPermission(true);
      streamRef.current = stream;

      // Create audio context
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      // Create source from stream
      const source = audioContext.createMediaStreamSource(stream);

      // Create processor (deprecated but widely supported)
      // Buffer size: 4096 samples for ~93ms at 44.1kHz
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        // Copy the data (it's reused by the audio system)
        audioBufferRef.current.push(new Float32Array(inputData));
      };

      // Connect: source -> processor -> destination (required for processor to work)
      source.connect(processor);
      processor.connect(audioContext.destination);

      // Start interval to flush audio buffer
      intervalRef.current = setInterval(flushAudioBuffer, chunkIntervalMs);

      setIsCapturing(true);
      setError(null);
      console.log('[AudioCapture] Started at', audioContext.sampleRate, 'Hz');

    } catch (err) {
      console.error('[AudioCapture] Error:', err);
      isCapturingRef.current = false;
      setHasPermission(false);
      setError(err instanceof Error ? err.message : 'Microphone access denied');
    }
  }, [flushAudioBuffer, chunkIntervalMs]);

  // Stop capturing
  const stopCapture = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    audioBufferRef.current = [];
    isCapturingRef.current = false;
    setIsCapturing(false);
    console.log('[AudioCapture] Stopped');
  }, []);

  // Auto-start/stop based on enabled prop
  useEffect(() => {
    // Defer to next microtask to avoid synchronous setState warning
    const timeoutId = setTimeout(() => {
      if (enabled && !isCapturingRef.current) {
        startCapture();
      } else if (!enabled && isCapturingRef.current) {
        stopCapture();
      }
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      stopCapture();
    };
  }, [enabled, startCapture, stopCapture]);

  return {
    isCapturing,
    hasPermission,
    error
  };
}
