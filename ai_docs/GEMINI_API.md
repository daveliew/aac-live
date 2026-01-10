# Gemini API Reference

> **Authoritative model IDs**: See `CLAUDE.md` → Gemini Integration section

## Quick Reference

### Endpoint
```
wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BiDiGenerateContent?key=${GEMINI_API_KEY}
```

### Models
| Surface | Model | Use Case |
|---------|-------|----------|
| REST API | `gemini-3-flash-preview` | Vision classification (structured output) |
| Live API | `gemini-2.5-flash-native-audio-preview-12-2025` | Real-time streaming (WebSocket) |

### Session Limits
| Session Type | Duration Limit |
|--------------|----------------|
| Audio only   | 15 minutes     |
| Audio+Video  | **2 minutes**  |

---

## WebSocket Protocol

### 1. Setup Message
Sent immediately after connection. Configures model behavior, modalities, and voice.

```json
{
  "setup": {
    "model": "models/gemini-2.5-flash-native-audio-preview-12-2025",
    "generation_config": {
      "response_modalities": ["AUDIO", "TEXT"],
      "thinking_level": "low",
      "media_resolution": "medium",
      "speech_config": {
        "voice_config": {
          "prebuilt_voice_config": { "voice_name": "Puck" }
        }
      }
    },
    "system_instruction": {
      "parts": [{ "text": "Your AAC system prompt here..." }]
    }
  }
}
```

### 2. Media Streaming
Video and audio are streamed as base64-encoded chunks.

```javascript
// Video frame (1 FPS recommended)
{
  "realtime_input": {
    "media_chunks": [{
      "mime_type": "image/jpeg",
      "data": base64Data
    }]
  }
}

// Audio chunk (16kHz mono PCM)
{
  "realtime_input": {
    "media_chunks": [{
      "mime_type": "audio/pcm;rate=16000",
      "data": base64Audio
    }]
  }
}
```

### 3. Server Responses
```javascript
// Text/JSON responses
response.server_content.model_turn.parts[].text

// Interruption flag (user spoke while model generating)
response.server_content.interrupted

// Binary audio data (model's spoken response)
// Received as binary WebSocket frames
```

---

## AAC-Specific Patterns

### System Prompt for Tile Generation
```
You are an AAC assistant for a non-verbal child.
Analyze the video stream and propose 3-5 communication tiles.

Guidelines:
- Use "I" statements (e.g., "I want", "I feel")
- Context from image: food → "hungry", toy → "play", person → "hello"
- Include core vocabulary: Yes, No, Help, More
- Keep text short (1-3 words)
```

### Voice Selection
Child-friendly voices:
- `Puck` - Playful, youthful (recommended)
- `Kore` - Clear, neutral
- `Aoede` - Warm, friendly

### Affective Dialog (experimental)
```javascript
enable_affective_dialog: true  // Emotion-aware responses
```

---

## Architecture

**Always-On Live Mode** (current implementation):
```
Camera (1 FPS) → WebSocket → Gemini Live → JSON tiles → UI → TTS
```

The app connects to Gemini Live on mount and streams frames continuously.

---

## Code Mapping

| File | Purpose |
|------|---------|
| `src/lib/gemini-live.ts` | WebSocket client wrapper |
| `src/app/page.tsx` | Connection lifecycle, event handling |
| `src/components/Camera.tsx` | Frame capture + streaming |
| `src/app/api/tiles/route.ts` | REST fallback (structured output) |

---

## Environment Variables

```bash
# Server-side (API route)
GEMINI_API_KEY=xxx

# Client-side (Live WebSocket - exposed to browser)
NEXT_PUBLIC_GEMINI_API_KEY=xxx
```

**Security Note**: For production, use ephemeral tokens instead of exposing API key to client.

---

## References

- [Gemini Live API Docs](https://ai.google.dev/gemini-api/docs/live)
- [Gemini Models](https://ai.google.dev/gemini-api/docs/models)
- [Ephemeral Tokens](https://ai.google.dev/gemini-api/docs/ephemeral-tokens)
