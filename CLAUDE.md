# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Guardrails

> [!IMPORTANT]
> **Mandatory Action**: Check `AGENT_HANDOFF.md` before starting work. Only work on tasks in "Next Task" section.

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint check
```

## Environment

```bash
GEMINI_API_KEY=your_key_here          # Required: Gemini AI (mapped to NEXT_PUBLIC_ in next.config.ts)
GOOGLE_PLACES_API_KEY=your_key_here   # Optional: Place names ("McDonald's" vs "Restaurant")
```

- `GEMINI_API_KEY` exposed to client for Live API WebSocket
- `GOOGLE_PLACES_API_KEY` server-only (used in `/api/places` route)

## Architecture: Hybrid Mode

**Current Mode**: REST for classification (stable) + Live API for TTS (wow factor)

```
CLASSIFICATION (REST - reliable):
Camera.tsx ──► /api/tiles ──► Gemini 3 Flash ──► tiles.ts ──► UI tiles
(1 FPS)        (POST)         (vision)          (grid gen)

TTS (Live API - native audio):
Tile click ──► gemini-live.ts ──► Gemini 2.5 Live ──► Native audio playback
               (WebSocket)        (requestTTS)

LOCATION (GPS → Place Name):
Geolocation ──► usePlaces ──► /api/places ──► Google Places ──► "McDonald's"
```

### Models
| Purpose | Model | API |
|---------|-------|-----|
| Scene Classification | `gemini-3-flash-preview` | REST |
| Native TTS | `gemini-2.5-flash-native-audio-preview-12-2025` | WebSocket |

### Key Architectural Files
| File | Purpose |
|------|---------|
| `src/app/page.tsx` | State orchestration, Live API init, hybrid mode flag |
| `src/hooks/useAACState.ts` | Central reducer: context, tiles, entities, session location |
| `src/hooks/useAudioCapture.ts` | Microphone PCM capture → Live API input |
| `src/lib/gemini-live.ts` | WebSocket client (2-min session limit → auto-reconnect) |
| `src/lib/tiles.ts` | Tile definitions, `TILE_SETS`, `ENTITY_TILE_MAP`, grid generation |
| `src/app/api/tiles/route.ts` | REST: Gemini 3 → ContextClassification |
| `src/app/api/places/route.ts` | Google Places → nearby place names |

### Path Alias
`@/*` maps to `./src/*` (configured in tsconfig.json)

### Domain Logic (`tiles.ts`)

**Affirmation Thresholds**:
- ≥0.85: Auto-proceed (no UI)
- ≥0.60: Quick binary confirm
- ≥0.30: Multi-choice disambiguation
- <0.30: Full manual picker

**Grid Generation**:
- `CORE_TILES` always shown (Yes, No, Help, More)
- `TILE_SETS[context]` for context-specific tiles
- Entity detection boosts relevant tiles via `ENTITY_TILE_MAP`

### State Management (`useAACState.ts`)

Key state slices:
- `sessionLocation`: Stable location for session (placeName, areaName, context)
- `contextLocked`: Whether tiles are locked to affirmed context
- `detectedEntities[]` / `focusedEntity`: Object detection from camera
- `connectionMode`: 'live' | 'rest'
- `shiftCounter`: Tracks consecutive context category changes

### Live API Notes
- 2-minute session limit (audio+video) → auto-reconnect 10s before expiry
- `requestTTS(phrase)` for tile click audio
- Audio returned as `ArrayBuffer` chunks

## Multi-Agent Development

| Agent | Role |
|-------|------|
| **Claude Code** | Primary steering: architecture, implementation, Git |
| **AG/Gemini** | Research: Gemini SDK docs, prompt engineering exploration |

App uses Gemini models for runtime (vision + TTS). Claude handles all code changes.
