# Gemini Multimodal Live API: Integration Learnings

> **Note**: For authoritative model IDs and API versions, see `CLAUDE.md` → Gemini Integration section.

Tracking technical details and implementation strategies for the Gemini Multimodal Live API in the AAC Live project.

## Core API Details

### Endpoint
The Multimodal Live API uses WebSockets for bidirectional low-latency communication.
- **URI:** `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BiDiGenerateContent?key=${GEMINI_API_KEY}`

### Model Selection
- **Live API**: `gemini-live-2.5-flash-native-audio` (v1beta endpoint)
- **REST Vision**: `gemini-3-flash`

## Messaging Workflow

### 1. Setup Message
Sent immediately after connection. Configures the model behavior, modalities, and voice.
```json
{
  "setup": {
    "model": "models/gemini-live-2.5-flash-native-audio",
    "generation_config": {
      "response_modalities": ["AUDIO", "TEXT"],
      "speech_config": {
        "voice_config": {
          "prebuilt_voice_config": { "voice_name": "Puck" }
        }
      }
    },
    "system_instruction": {
      "parts": [{ "text": "Your custom system prompt here..." }]
    }
  }
}
```

### 2. Media Chunk Streaming
Video (and audio) are streamed as base64 encoded chunks inside a `realtime_input` wrapper.
- **Vision:** Standard practice is 1fps at medium-low resolution (e.g., JPEG with 0.6 quality) to balance scene awareness and bandwidth.
- **Audio:** 16kHz mono PCM is the standard for input.

### 3. Server Responses
- **Text/JSON:** Model responses (like our AAC tiles) appear in `server_content.model_turn.parts`.
- **Audio:** Raw binary chunks are received for the model's vocal responses (if configured).
- **Interruption:** The model sends an `interrupted` flag if it detects user-side speech while it's generating.

## Optimization Strategies for AAC
- **Glassmorphism UI:** Enhances the premium feel while keep the focus on the camera feed.
- **State Orchestration:** Centralizing connection management in a `LiveAssistant` component prevents redundant WebSocket connections and ensures stable frame streaming.
- **Merging Strategies:** For AAC, it's often better to replace tiles when the scene changes significantly than to keep stale options.

## Future Exploration
- **Advanced Audio Queuing:** Implementing a `JitterBuffer` for smoother model voice playback.
- **Multimodal Context Persistence:** Using conversation history alongside real-time vision for deeper assistant awareness.
