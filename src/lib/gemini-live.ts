'use client';

import { TileData } from '@/components/TileGrid';
import { ContextType } from '@/lib/tiles';

export interface GeminiLiveConfig {
    apiKey: string;
    model?: string;
    thinkingLevel?: 'low' | 'medium' | 'high';
    mediaResolution?: 'low' | 'medium' | 'high';
}

export type GeminiLiveEvent =
    | { type: 'open' }
    | { type: 'close' }
    | { type: 'error'; error: unknown }
    | { type: 'tiles'; tiles: TileData[]; context?: ContextType }
    | { type: 'audio'; data: Uint8Array }
    | { type: 'interrupted' }
    | { type: 'reconnecting'; attempt: number };

/** WebSocket response from Gemini Live API */
interface GeminiLiveResponse {
    server_content?: {
        thought?: string;
        interrupted?: boolean;
        model_turn?: {
            parts?: Array<{
                text?: string;
                inline_data?: { mime_type: string; data: string };
            }>;
        };
    };
}

/** Parsed response with context and tiles */
interface ParsedLiveResponse {
    context?: ContextType;
    tiles?: TileData[];
}

// Valid context types for validation
const VALID_CONTEXTS: ContextType[] = [
    'restaurant_counter', 'restaurant_table', 'playground', 'classroom',
    'home_kitchen', 'home_living', 'store_checkout', 'medical_office', 'unknown'
];

export class GeminiLiveClient {
    private ws: WebSocket | null = null;
    private apiKey: string;
    private model: string;
    private thinkingLevel: string;
    private mediaResolution: string;
    private onEvent: (event: GeminiLiveEvent) => void;

    // Reconnection state
    private intentionalClose = false;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private baseReconnectDelay = 1000;

    constructor(config: GeminiLiveConfig, onEvent: (event: GeminiLiveEvent) => void) {
        this.apiKey = config.apiKey;
        this.model = config.model || 'gemini-2.5-flash-native-audio-preview-12-2025';
        this.thinkingLevel = config.thinkingLevel || 'low';
        this.mediaResolution = config.mediaResolution || 'medium';
        this.onEvent = onEvent;
    }

    async connect() {
        this.intentionalClose = false;

        const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BiDiGenerateContent?key=${this.apiKey}`;

        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            this.reconnectAttempts = 0; // Reset on successful connection
            this.onEvent({ type: 'open' });
            this.sendSetup();
        };

        this.ws.onmessage = async (event) => {
            const data = event.data;
            if (typeof data === 'string') {
                try {
                    const response = JSON.parse(data);
                    this.handleResponse(response);
                } catch (e) {
                    console.error('Error parsing live response:', e);
                }
            } else {
                // Handle binary audio data
                const buffer = await data.arrayBuffer();
                this.onEvent({ type: 'audio', data: new Uint8Array(buffer) });
            }
        };

        this.ws.onerror = (error) => {
            this.onEvent({ type: 'error', error });
        };

        this.ws.onclose = (event) => {
            this.onEvent({ type: 'close' });

            // Auto-reconnect if not intentional
            if (!this.intentionalClose && event.code !== 1000) {
                this.scheduleReconnect();
            }
        };
    }

    private scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.onEvent({ type: 'error', error: 'Max reconnection attempts reached' });
            return;
        }

        const delay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts);
        this.reconnectAttempts++;

        this.onEvent({ type: 'reconnecting', attempt: this.reconnectAttempts });

        setTimeout(() => {
            if (!this.intentionalClose) {
                this.connect();
            }
        }, delay);
    }

    private sendSetup() {
        if (!this.ws) return;

        const setupMessage = {
            setup: {
                model: `models/${this.model}`,
                generation_config: {
                    response_modalities: ['AUDIO', 'TEXT'],
                    thinking_level: this.thinkingLevel,
                    media_resolution: this.mediaResolution,
                    speech_config: {
                        voice_config: {
                            prebuilt_voice_config: {
                                voice_name: 'Puck'
                            }
                        }
                    }
                },
                system_instruction: {
                    parts: [{
                        text: `You are an AAC (Augmentative and Alternative Communication) assistant helping a non-verbal child communicate.

Real-time video is streaming to you. OBSERVE SPECIFIC OBJECTS AND PEOPLE in the scene.

For each scene, provide:
1. CONTEXT: The environment (restaurant_counter, playground, classroom, home_kitchen, store_checkout, medical_office, or unknown)
2. ENTITIES: List specific things you see (swing, slide, children, cashier, menu, dog, etc.)
3. TILES: 3-5 communication tiles DIRECTLY RELEVANT to what you see

CRITICAL: Tiles must be specific to detected entities, not generic context tiles.
- If you see a SWING → suggest "Push me", "Higher!", "My turn"
- If you see other CHILDREN → suggest "Can I play?", "My turn"
- If you see a DOG → suggest "Look, dog!", "Can I pet it?"
- If you see ICE CREAM → suggest "I want that", "How much?"

ALWAYS respond with valid JSON:
{"context": "playground", "entities": ["swing", "children"], "tiles": [{"id": 1, "text": "Push me", "emoji": "🫷"}, {"id": 2, "text": "Can I play?", "emoji": "🤝"}]}

Speak aloud simple, encouraging observations. Help the child communicate about what they SEE.`
                    }]
                }
            }
        };

        this.ws.send(JSON.stringify(setupMessage));
    }

    sendMediaChunk(base64Data: string, mimeType: string = 'image/jpeg') {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const mediaMessage = {
            realtime_input: {
                media_chunks: [{
                    mime_type: mimeType,
                    data: base64Data
                }]
            }
        };

        this.ws.send(JSON.stringify(mediaMessage));
    }

    sendAudioChunk(base64Audio: string) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const audioMessage = {
            realtime_input: {
                media_chunks: [{
                    mime_type: 'audio/pcm;rate=16000',
                    data: base64Audio
                }]
            }
        };

        this.ws.send(JSON.stringify(audioMessage));
    }

    /**
     * Robust JSON extraction using balanced brace matching
     */
    private extractJSON(text: string): object | null {
        // Strategy 1: Direct parse (text is pure JSON)
        try {
            return JSON.parse(text);
        } catch {
            // Continue to other strategies
        }

        // Strategy 2: Find JSON object with balanced braces
        const jsonStart = text.indexOf('{');
        if (jsonStart === -1) return null;

        let depth = 0;
        let jsonEnd = -1;
        let inString = false;
        let escapeNext = false;

        for (let i = jsonStart; i < text.length; i++) {
            const char = text[i];

            if (escapeNext) {
                escapeNext = false;
                continue;
            }

            if (char === '\\') {
                escapeNext = true;
                continue;
            }

            if (char === '"') {
                inString = !inString;
                continue;
            }

            if (inString) continue;

            if (char === '{') depth++;
            if (char === '}') {
                depth--;
                if (depth === 0) {
                    jsonEnd = i;
                    break;
                }
            }
        }

        if (jsonEnd > jsonStart) {
            try {
                return JSON.parse(text.substring(jsonStart, jsonEnd + 1));
            } catch {
                // Fall through to regex fallback
            }
        }

        // Strategy 3: Regex fallback (greedy match)
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
            try {
                return JSON.parse(match[0]);
            } catch {
                // Give up
            }
        }

        return null;
    }

    /**
     * Parse and validate the response data
     */
    private parseResponseData(data: unknown): ParsedLiveResponse {
        const result: ParsedLiveResponse = {};

        if (typeof data !== 'object' || data === null) {
            return result;
        }

        const obj = data as Record<string, unknown>;

        // Extract and validate context
        if (typeof obj.context === 'string' && VALID_CONTEXTS.includes(obj.context as ContextType)) {
            result.context = obj.context as ContextType;
        }

        // Extract and validate tiles
        if (Array.isArray(obj.tiles)) {
            result.tiles = obj.tiles
                .filter((t): t is { id: unknown; text: string; emoji: string } =>
                    typeof t === 'object' && t !== null &&
                    typeof (t as Record<string, unknown>).text === 'string' &&
                    typeof (t as Record<string, unknown>).emoji === 'string'
                )
                .map((t, i) => ({
                    id: typeof t.id === 'number' ? t.id : i + 1,
                    text: t.text,
                    emoji: t.emoji
                }));
        }

        return result;
    }

    private handleResponse(response: GeminiLiveResponse) {
        // Handle thinking (optional logging)
        if (response.server_content?.thought) {
            // console.log('Gemini thinking:', response.server_content.thought);
        }

        const parts = response.server_content?.model_turn?.parts;
        if (parts) {
            for (const part of parts) {
                if (part.text) {
                    const jsonData = this.extractJSON(part.text);
                    if (jsonData) {
                        const parsed = this.parseResponseData(jsonData);

                        if (parsed.tiles && parsed.tiles.length > 0) {
                            this.onEvent({
                                type: 'tiles',
                                tiles: parsed.tiles,
                                context: parsed.context
                            });
                        }
                    }
                }
            }
        }

        if (response.server_content?.interrupted) {
            this.onEvent({ type: 'interrupted' });
        }
    }

    disconnect() {
        this.intentionalClose = true;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    /**
     * Check if client is connected
     */
    isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }
}
