# AAC Live - Gemini 3 Hackathon Project

Context-aware AAC (Augmentative and Alternative Communication) app for non-verbal children using Gemini 3 vision AI.

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint check
```

## Environment

```
GEMINI_API_KEY=your_key_here
```

## Architecture

```
Camera.tsx ──► /api/tiles ──► TileGrid.tsx ──► tts.ts
(capture)     (Gemini 3)     (render)        (speak)
```

### Data Flow
1. **Camera** (`src/components/Camera.tsx`) captures frames as base64 JPEG
2. **API Route** (`src/app/api/tiles/route.ts`) sends image to Gemini 3 Flash with structured output
3. **TileGrid** (`src/components/TileGrid.tsx`) renders communication tiles
4. **TTS** (`src/lib/tts.ts`) speaks tile text via Web Speech API when tapped

### Key Files
| File | Purpose |
|------|---------|
| `src/app/api/tiles/route.ts` | Gemini 3 vision → JSON tiles |
| `src/components/Camera.tsx` | Video capture + live mode |
| `src/components/TileGrid.tsx` | Tile display grid |
| `src/lib/gemini-live.ts` | WebSocket Live API client |
| `src/lib/tts.ts` | Text-to-speech |

### Gemini 3 Integration
- **Vision Model**: `gemini-3-flash-preview`
- **Live API Model**: `gemini-3-flash-preview`
- **SDK**: `@google/genai`
- **Output**: Structured JSON with `responseSchema`
- **Fallback**: Basic Help/Yes/No tiles on error

### TileData Type
```typescript
interface TileData {
  id: number;
  text: string;   // First person ("I want", "Help me")
  emoji: string;  // Visual aid
}
```

## Stack

- Next.js 16 (App Router)
- React 19
- TypeScript (strict)
- Tailwind CSS 4
- Gemini AI via `@google/genai`

## Hackathon Context

**Track**: Track 6 - Real-Time Multimodal
**Innovation**: Vision-first AAC (no symbol training required)
**Target**: Non-verbal children (autism, apraxia)

## Multi-Agent Development

| Agent | Role |
|-------|------|
| **Claude Code** | Architecture, React, Next.js, git |
| **Gemini/AG** | SDK, prompts, model config |

Coordinate via `AGENT_HANDOFF.md` if present.
