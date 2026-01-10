# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

Two modes of operation:

### Snapshot Mode (REST API)
```
Camera.tsx ──► /api/tiles ──► TileGrid.tsx ──► tts.ts
(capture)     (Gemini 3)     (render)        (speak)
```

### Live Mode (WebSocket)
```
Camera.tsx ──► gemini-live.ts ──► TileGrid.tsx ──► tts.ts
(1 FPS)       (WebSocket)        (render)        (speak)
```

### Key Files
| File | Purpose |
|------|---------|
| `src/app/page.tsx` | State orchestration, main layout |
| `src/app/api/tiles/route.ts` | Gemini 3 vision → JSON tiles |
| `src/lib/tiles.ts` | Affirmation logic + grid generation |
| `src/lib/gemini-live.ts` | WebSocket Live API client |
| `src/components/Camera.tsx` | Video capture + frame extraction |
| `src/components/TileGrid.tsx` | Tile display + click handler |
| `src/lib/tts.ts` | Web Speech API text-to-speech |

### Domain Logic (`tiles.ts`)

**Affirmation Thresholds** (confidence-based context confirmation):
- ≥0.85: Auto-proceed (no UI)
- ≥0.60: Quick binary confirm
- ≥0.30: Multi-choice disambiguation
- <0.30: Full manual picker

**Grid Generation**:
- CORE_TILES (Help, Yes, No, More) always included
- Context tiles from TILE_SETS scored by priority
- Top N tiles selected, arranged in 3-4 column grid

**Context Types**: `restaurant_counter`, `playground`, `classroom`, `home_kitchen`, `home_living`, `store_checkout`, `medical_office`, `unknown`

### Gemini 3 Integration
- **Vision Model**: `gemini-3-flash-preview` (structured JSON output)
- **Live API Model**: `gemini-2.5-flash-native-audio-preview-12-2025` (WebSocket - Gemini 3 doesn't support Live API yet)
- **SDK**: `@google/genai`
- **Fallback**: Basic Help/Yes/No tiles on error

> **Note**: Always use `gemini-3-flash-preview` (not `gemini-3-flash`). For Live API, Gemini 3 support is pending - use 2.5 native audio model.

### Key Types
```typescript
// UI layer (components)
interface TileData { id: number; text: string; emoji: string; isSuggested?: boolean; }

// Domain layer (lib/tiles.ts)
interface TileDefinition { id: string; label: string; tts: string|null; emoji: string; priority: number; }
interface GridTile extends TileDefinition { position: number; row: number; col: number; }
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

Coordinate via `AGENT_HANDOFF.md`.
