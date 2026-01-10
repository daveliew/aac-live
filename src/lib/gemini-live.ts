'use client';

/**
 * Gemini Live API WebSocket Client
 *
 * Model: gemini-2.0-flash-exp (v1alpha API)
 * Session limit: 2 minutes (Audio+Video)
 *
 * Events:
 * - onConnect: WebSocket connected
 * - onContext: Context classification received
 * - onTiles: Tile suggestions received
 * - onAudio: Audio data received (native TTS)
 * - onError: Error occurred
 * - onDisconnect: WebSocket closed
 */

export interface ContextClassification {
  primaryContext: string;
  confidenceScore: number;
  secondaryContexts: string[];
  entitiesDetected: string[];
  situationInference: string;
}

export interface LiveTile {
  id: string;
  label: string;
  tts: string;
  emoji: string;
  relevanceScore: number;
}

export interface GeminiLiveConfig {
  apiKey: string;
  model?: string;
  voiceName?: string;
  systemPrompt?: string;
  onConnect?: () => void;
  onContext?: (context: ContextClassification) => void;
  onTiles?: (tiles: LiveTile[]) => void;
  onAudio?: (audioData: ArrayBuffer) => void;
  onError?: (error: Error) => void;
  onDisconnect?: () => void;
  onSessionExpiring?: () => void;
}

const DEFAULT_MODEL = 'gemini-2.0-flash-exp';
const SESSION_LIMIT_MS = 2 * 60 * 1000; // 2 minutes for audio+video
const RECONNECT_BUFFER_MS = 10 * 1000; // Reconnect 10s before expiry

const BASE_SYSTEM_PROMPT = `You are an AAC assistant for a non-verbal child.
You receive continuous VIDEO and AUDIO from the child's environment.

## SOCIAL CUE DETECTION (Priority)

Watch for people interacting with the child and respond with helpful tiles:

**AUDIO CUES:**
- Direct questions: "What do you want?", "Are you hungry?", "How do you feel?"
- Offers: "Want some?", "Do you like this?"
- Instructions: "Say please", "Tell me what you need"

**VISUAL CUES:**
- Questioning expressions (raised eyebrows, head tilt)
- Offering gestures (holding item toward child)
- Expectant waiting (eye contact, paused movement)
- Pointing at options (menu, objects, choices)

**COMBINED SIGNALS:**
When audio AND visual cues align, prioritize tiles that directly answer/respond.

## RESPONSE FORMAT

For each frame, respond with JSON:
{
  "context": {
    "primaryContext": "bathroom|kitchen|greeting|restaurant|playground|classroom|store|medical|unknown",
    "confidenceScore": 0.0-1.0,
    "secondaryContexts": [],
    "entitiesDetected": ["person", "menu", "cup"],
    "socialCue": "question_detected|offer_detected|waiting|null",
    "situationInference": "Parent asking what child wants to drink"
  },
  "tiles": [
    { "id": "tile_1", "label": "Yes please", "tts": "Yes please!", "emoji": "👍", "relevanceScore": 95 },
    { "id": "tile_2", "label": "No thanks", "tts": "No thank you", "emoji": "🙅", "relevanceScore": 90 }
  ]
}

## TILE GUIDELINES
- When social cue detected: Prioritize RESPONSE tiles (answers, acknowledgments)
- Otherwise: Show CONTEXTUAL tiles (requests, actions for current scene)
- Always use "I" statements: "I want", "I feel", "I need"
- Keep labels short: 1-3 words
- Generate 3-6 tiles per response
- Score relevance 0-100 based on context + social cues`;

/**
 * Build system prompt with optional location context
 * @param placeName - Name of nearby place from GPS (e.g., "McDonald's")
 */
export function buildSystemPrompt(placeName?: string): string {
  if (!placeName) return BASE_SYSTEM_PROMPT;

  const locationContext = `\n\nLocation Context:\nThe child is currently at or near "${placeName}". Use this to inform your context classification and tile suggestions.`;
  return BASE_SYSTEM_PROMPT + locationContext;
}

const DEFAULT_SYSTEM_PROMPT = BASE_SYSTEM_PROMPT;

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private config: GeminiLiveConfig;
  private sessionStartTime: number = 0;
  private sessionTimer: NodeJS.Timeout | null = null;
  private isConnecting: boolean = false;
  private audioQueue: ArrayBuffer[] = [];

  constructor(config: GeminiLiveConfig) {
    this.config = {
      model: DEFAULT_MODEL,
      voiceName: 'Puck',
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      ...config,
    };
  }

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      const endpoint = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${this.config.apiKey}`;

      console.log('[GeminiLive] Connecting to:', endpoint.replace(/key=.*/, 'key=***'));
      console.log('[GeminiLive] API key length:', this.config.apiKey?.length || 0);

      this.ws = new WebSocket(endpoint);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        console.log('[GeminiLive] WebSocket opened!');
        this.isConnecting = false;
        this.sessionStartTime = Date.now();
        this.sendSetupMessage();
        this.startSessionTimer();
        this.config.onConnect?.();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event);
      };

      this.ws.onerror = () => {
        this.isConnecting = false;
        this.config.onError?.(new Error('WebSocket error'));
      };

      this.ws.onclose = (event) => {
        console.log('[GeminiLive] WebSocket closed:', event.code, event.reason);
        this.isConnecting = false;
        this.clearSessionTimer();
        this.config.onDisconnect?.();
      };
    } catch (error) {
      this.isConnecting = false;
      this.config.onError?.(error as Error);
    }
  }

  private sendSetupMessage(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // Request both AUDIO (native TTS) and TEXT (JSON context/tiles)
    const setupMessage = {
      setup: {
        model: `models/${this.config.model}`,
        generationConfig: {
          responseModalities: ['AUDIO', 'TEXT']
        },
        systemInstruction: {
          parts: [{ text: this.config.systemPrompt }]
        }
      }
    };

    console.log('[GeminiLive] Sending setup:', JSON.stringify(setupMessage, null, 2));
    this.ws.send(JSON.stringify(setupMessage));
  }

  private startSessionTimer(): void {
    this.clearSessionTimer();

    // Warn before session expires
    this.sessionTimer = setTimeout(() => {
      this.config.onSessionExpiring?.();
      // Auto-reconnect
      this.reconnect();
    }, SESSION_LIMIT_MS - RECONNECT_BUFFER_MS);
  }

  private clearSessionTimer(): void {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }
  }

  private handleMessage(event: MessageEvent): void {
    // Handle binary audio data
    if (event.data instanceof ArrayBuffer) {
      console.log('[GeminiLive] Received audio data:', event.data.byteLength, 'bytes');
      this.audioQueue.push(event.data);
      this.config.onAudio?.(event.data);
      return;
    }

    // Handle JSON text responses
    console.log('[GeminiLive] Received message:', event.data.substring(0, 500));
    try {
      const response = JSON.parse(event.data);

      // Check for setup complete
      if (response.setupComplete) {
        console.log('[GeminiLive] Setup complete!');
        return;
      }

      // Extract text content from server response
      const parts = response.serverContent?.modelTurn?.parts || [];
      for (const part of parts) {
        if (part.text) {
          this.parseResponse(part.text);
        }
      }
    } catch {
      // Ignore parse errors for partial messages
    }
  }

  private parseResponse(text: string): void {
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return;

      const data = JSON.parse(jsonMatch[0]);

      if (data.context) {
        this.config.onContext?.(data.context);
      }

      if (data.tiles && Array.isArray(data.tiles)) {
        this.config.onTiles?.(data.tiles);
      }
    } catch {
      // Non-JSON response, ignore
    }
  }

  sendFrame(base64Image: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    console.log('[GeminiLive] Sending frame:', base64Image.length, 'bytes');

    const message = {
      realtime_input: {
        media_chunks: [{
          mime_type: 'image/jpeg',
          data: base64Image
        }]
      }
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Send audio chunk to Gemini Live API
   * @param pcmData - Raw PCM audio: 16kHz, 16-bit signed, mono
   */
  sendAudio(pcmData: ArrayBuffer): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // Convert ArrayBuffer to base64
    const bytes = new Uint8Array(pcmData);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Audio = btoa(binary);

    const message = {
      realtime_input: {
        media_chunks: [{
          mime_type: 'audio/pcm;rate=16000',
          data: base64Audio
        }]
      }
    };

    this.ws.send(JSON.stringify(message));
  }

  sendText(text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const message = {
      client_content: {
        turns: [{
          role: 'user',
          parts: [{ text }]
        }],
        turn_complete: true
      }
    };

    this.ws.send(JSON.stringify(message));
  }

  // Request TTS for a specific phrase (for tile clicks)
  requestTTS(phrase: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const message = {
      client_content: {
        turns: [{
          role: 'user',
          parts: [{ text: `Please speak this phrase aloud: "${phrase}"` }]
        }],
        turn_complete: true
      }
    };

    this.ws.send(JSON.stringify(message));
  }

  async reconnect(): Promise<void> {
    this.disconnect();
    await new Promise(resolve => setTimeout(resolve, 100));
    await this.connect();
  }

  disconnect(): void {
    this.clearSessionTimer();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getSessionTimeRemaining(): number {
    if (!this.sessionStartTime) return 0;
    const elapsed = Date.now() - this.sessionStartTime;
    return Math.max(0, SESSION_LIMIT_MS - elapsed);
  }

  // Get queued audio and clear the queue
  getQueuedAudio(): ArrayBuffer[] {
    const audio = [...this.audioQueue];
    this.audioQueue = [];
    return audio;
  }
}

// Singleton instance for the app
let clientInstance: GeminiLiveClient | null = null;

export function getGeminiLiveClient(config?: GeminiLiveConfig): GeminiLiveClient | null {
  if (!clientInstance && config) {
    clientInstance = new GeminiLiveClient(config);
  }
  return clientInstance;
}

export function resetGeminiLiveClient(): void {
  if (clientInstance) {
    clientInstance.disconnect();
    clientInstance = null;
  }
}
