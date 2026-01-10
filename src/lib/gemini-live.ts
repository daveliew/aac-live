'use client';

import { TileData } from '@/components/TileGrid';

export interface GeminiLiveConfig {
    apiKey: string;
    model?: string;
    thinkingLevel?: 'low' | 'medium' | 'high';
    mediaResolution?: 'low' | 'medium' | 'high';
}

export type GeminiLiveEvent =
    | { type: 'open' }
    | { type: 'close' }
    | { type: 'error', error: unknown }
    | { type: 'tiles', tiles: TileData[] }
    | { type: 'audio', data: Uint8Array }
    | { type: 'interrupted' };

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

export class GeminiLiveClient {
    private ws: WebSocket | null = null;
    private apiKey: string;
    private model: string;
    private thinkingLevel: string;
    private mediaResolution: string;
    private onEvent: (event: GeminiLiveEvent) => void;

    constructor(config: GeminiLiveConfig, onEvent: (event: GeminiLiveEvent) => void) {
        this.apiKey = config.apiKey;
        this.model = config.model || 'gemini-live-2.5-flash-native-audio';
        this.thinkingLevel = config.thinkingLevel || 'low';
        this.mediaResolution = config.mediaResolution || 'medium';
        this.onEvent = onEvent;
    }

    async connect() {
        // Use v1beta for latest features
        const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BiDiGenerateContent?key=${this.apiKey}`;

        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
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

        this.ws.onclose = () => {
            this.onEvent({ type: 'close' });
        };
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
                        text: `You are an AAC assistant for a non-verbal child. 
            Real-time video is streaming to you. Propose 3-5 communication tiles based on the environment.
            Format your response strictly as JSON: {"tiles": [{"id": "tile1", "text": "I want that", "emoji": "👉"}]}.
            Also speak aloud child-friendly observations or questions that can help communication.`
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

    private handleResponse(response: GeminiLiveResponse) {
        // Handle Gemini 3 thinking signatures if present
        if (response.server_content?.thought) {
            // console.log('Gemini is thinking:', response.server_content.thought);
        }

        const parts = response.server_content?.model_turn?.parts;
        if (parts) {
            for (const part of parts) {
                if (part.text) {
                    try {
                        // Improved JSON extraction
                        const jsonMatch = part.text.match(/\{[\s\S]*?\}/);
                        if (jsonMatch) {
                            const data = JSON.parse(jsonMatch[0]);
                            if (data.tiles) {
                                this.onEvent({ type: 'tiles', tiles: data.tiles });
                            }
                        }
                    } catch {
                        // ignore malformed JSON in stream
                    }
                }
            }
        }

        if (response.server_content?.interrupted) {
            this.onEvent({ type: 'interrupted' });
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}
