/**
 * Gemini TTS - Uses dedicated TTS model for high-quality speech
 * Returns raw PCM audio (24kHz, 16-bit, mono)
 */
export async function geminiTTS(text: string): Promise<ArrayBuffer> {
  console.log('[geminiTTS] Requesting:', text);

  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  console.log('[geminiTTS] Response status:', response.status, response.headers.get('content-type'));

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    console.error('[geminiTTS] API error:', error);
    throw new Error(`TTS failed: ${error.error || response.statusText}`);
  }

  const audioData = await response.arrayBuffer();
  console.log('[geminiTTS] Received audio:', audioData.byteLength, 'bytes');
  return audioData;
}

/**
 * Browser TTS fallback - Uses Web Speech API
 */
export function speak(text: string) {
  // Cancel any ongoing speech
  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  // Settings optimized for child-friendly voice
  utterance.rate = 0.9; // Slightly slower for clarity
  utterance.pitch = 1.1; // Slightly higher pitch
  utterance.volume = 1.0;

  // Try to find a friendly voice
  const voices = speechSynthesis.getVoices();
  const preferredVoice = voices.find(
    (v) =>
      v.name.includes('Samantha') || // macOS
      v.name.includes('Google US English') ||
      v.name.includes('Microsoft Aria') ||
      v.lang.startsWith('en')
  );

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  speechSynthesis.speak(utterance);
}

// Preload voices (they load async in some browsers)
if (typeof window !== 'undefined') {
  speechSynthesis.getVoices();
  speechSynthesis.onvoiceschanged = () => {
    speechSynthesis.getVoices();
  };
}
