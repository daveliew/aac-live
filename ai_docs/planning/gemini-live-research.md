# Gemini Live API Research - AAC Implementation

> **Note**: For authoritative model IDs, see `CLAUDE.md` → Gemini Integration section.

*Research compiled for hackathon team consideration*

## Executive Summary

Gemini Live API enables real-time bidirectional streaming of audio + video via WebSocket. This makes it ideal for a "vision-first" AAC approach where the child's camera view continuously informs available communication options.

---

## Gemini Live API Capabilities

### Core Features
- **Real-time bidirectional streaming** via WebSocket
- **Concurrent audio + video + text streams** in single session
- **Voice Activity Detection (VAD)** - automatic interruption handling
- **Affective dialog** - adapts to input emotion/tone
- **Native audio output** with natural voice synthesis (24kHz)

### Models (Current)
| Model | Use Case |
|-------|----------|
| `gemini-live-2.5-flash-native-audio` | Live API (WebSocket) |
| `gemini-3-flash` | REST Vision API |

### Session Limits (Critical)
| Session Type | Duration Limit |
|--------------|----------------|
| Audio only   | 15 minutes     |
| Audio+Video  | **2 minutes**  |

**Implication**: For extended AAC use, either use snapshot mode or implement session rotation.

---

## Architecture Options

### Option A: Full Gemini Live (Real-time streaming)
```
Camera stream → Gemini Live WebSocket → JSON tiles → UI → TTS
```
- Tiles update as camera moves
- Most responsive experience
- 2-min video session limit

### Option B: Snapshot Mode (Current Implementation)
```
Camera snapshot → Gemini Vision API → JSON tiles → UI → TTS
```
- Child taps "Analyze Scene" for on-demand capture
- No time limit
- Slightly less real-time feel

### Option C: Hybrid (Implemented)
```
Snapshot mode by default + Optional "Go Live" toggle
```
- Best of both worlds
- User controls when to use limited Live sessions

---

## Technical Implementation

### WebSocket Connection
```typescript
const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BiDiGenerateContent?key=${apiKey}`;
```

### Setup Message Structure
```javascript
{
  setup: {
    model: "models/gemini-live-2.5-flash-native-audio",
    generation_config: {
      response_modalities: ["AUDIO", "TEXT"],
      speech_config: {
        voice_config: {
          prebuilt_voice_config: { voice_name: "Puck" }
        }
      }
    },
    system_instruction: {
      parts: [{ text: "AAC prompt here..." }]
    }
  }
}
```

### Media Streaming
```javascript
// Send video frame (1 FPS recommended for vision updates)
{
  realtime_input: {
    media_chunks: [{
      mime_type: "image/jpeg",
      data: base64Data
    }]
  }
}

// Send audio chunk
{
  realtime_input: {
    media_chunks: [{
      mime_type: "audio/pcm;rate=16000",
      data: base64Audio
    }]
  }
}
```

### Response Handling
```javascript
// Responses include:
// - server_content.model_turn.parts[].text (JSON with tiles)
// - server_content.interrupted (when user interrupts)
// - Binary audio data (model's spoken response)
```

---

## AAC-Specific Considerations

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
Child-friendly voices available:
- `Puck` - Playful, youthful
- `Kore` - Clear, neutral
- `Aoede` - Warm, friendly

### Affective Dialog (v1alpha)
```javascript
// Enable emotion-aware responses
enable_affective_dialog: true
```

---

## Files in Current Implementation

| File | Purpose |
|------|---------|
| `src/lib/gemini-live.ts` | WebSocket client wrapper |
| `src/components/LiveAssistant.tsx` | UI toggle + status display |
| `src/components/Camera.tsx` | Supports both snapshot and live modes |
| `src/app/api/tiles/route.ts` | Fallback structured output API |

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

## Next Steps for Team

1. **Test Live mode** - Toggle "Go Live" and verify WebSocket connects
2. **Tune system prompt** - Adjust for better tile suggestions
3. **Audio playback** - Currently logged, needs actual playback implementation
4. **Session management** - Handle 2-min timeout gracefully
5. **Mobile testing** - Camera + mic permissions on iOS/Android

---

## References

- [Gemini Live API Docs](https://ai.google.dev/gemini-api/docs/live)
- [Live API Capabilities Guide](https://ai.google.dev/gemini-api/docs/live-guide)
- [WebSockets API Reference](https://ai.google.dev/api/live)
- [Ephemeral Tokens](https://ai.google.dev/gemini-api/docs/ephemeral-tokens)
