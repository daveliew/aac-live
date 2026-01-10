/**
 * Browser TTS - Uses Web Speech API for instant, reliable speech
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
