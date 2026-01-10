'use client';

/**
 * PCM Audio Player for Gemini Live API
 * Plays 16-bit signed PCM audio at 24kHz
 */
export class PCMAudioPlayer {
    private audioContext: AudioContext | null = null;
    private sampleRate: number;
    private scheduledTime: number = 0;
    private isPlaying: boolean = false;

    constructor(sampleRate: number = 24000) {
        this.sampleRate = sampleRate;
    }

    /**
     * Initialize audio context (must be called after user gesture on mobile)
     */
    async init(): Promise<void> {
        if (this.audioContext) return;

        const AudioContextClass = window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

        this.audioContext = new AudioContextClass({ sampleRate: this.sampleRate });

        // Resume context if suspended (required for mobile browsers)
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    /**
     * Play PCM audio data
     * @param pcmData - Uint8Array of 16-bit signed PCM samples
     */
    async play(pcmData: Uint8Array): Promise<void> {
        if (!this.audioContext) {
            await this.init();
        }

        if (!this.audioContext) {
            console.warn('AudioContext not available');
            return;
        }

        // Resume if suspended
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        // Convert 16-bit signed PCM bytes to Float32 samples
        const numSamples = pcmData.length / 2;
        const samples = new Float32Array(numSamples);
        const dataView = new DataView(pcmData.buffer, pcmData.byteOffset, pcmData.byteLength);

        for (let i = 0; i < numSamples; i++) {
            // Read 16-bit signed integer (little-endian) and normalize to -1.0 to 1.0
            const int16 = dataView.getInt16(i * 2, true);
            samples[i] = int16 / 32768;
        }

        // Create audio buffer
        const buffer = this.audioContext.createBuffer(1, numSamples, this.sampleRate);
        buffer.getChannelData(0).set(samples);

        // Create and configure source node
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext.destination);

        // Schedule playback
        // Use scheduled time for seamless audio or current time if we've fallen behind
        const startTime = Math.max(this.audioContext.currentTime, this.scheduledTime);
        source.start(startTime);

        // Update scheduled time for next chunk
        this.scheduledTime = startTime + buffer.duration;
        this.isPlaying = true;

        // Track when this chunk finishes
        source.onended = () => {
            // Only mark as not playing if this was the last scheduled chunk
            if (this.audioContext && this.audioContext.currentTime >= this.scheduledTime - 0.01) {
                this.isPlaying = false;
            }
        };
    }

    /**
     * Stop playback and reset
     */
    stop(): void {
        this.scheduledTime = 0;
        this.isPlaying = false;

        if (this.audioContext) {
            // Close the context to stop all audio
            this.audioContext.close();
            this.audioContext = null;
        }
    }

    /**
     * Pause playback (suspends audio context)
     */
    async pause(): Promise<void> {
        if (this.audioContext && this.audioContext.state === 'running') {
            await this.audioContext.suspend();
        }
    }

    /**
     * Resume playback
     */
    async resume(): Promise<void> {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    /**
     * Check if currently playing
     */
    getIsPlaying(): boolean {
        return this.isPlaying;
    }

    /**
     * Get current audio context state
     */
    getState(): AudioContextState | 'closed' {
        return this.audioContext?.state ?? 'closed';
    }
}

/**
 * Singleton instance for app-wide audio playback
 */
let audioPlayerInstance: PCMAudioPlayer | null = null;

export function getAudioPlayer(): PCMAudioPlayer {
    if (!audioPlayerInstance) {
        audioPlayerInstance = new PCMAudioPlayer(24000);
    }
    return audioPlayerInstance;
}
