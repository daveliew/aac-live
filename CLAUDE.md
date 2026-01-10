# Glimpse (CLAUDE.md)

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Guardrails

> [!IMPORTANT]
> **Mandatory Action**: Run `/handoff-check` before starting any new task. This ensures you are working on approved items and following the handoff protocol defined in [AGENT_HANDOFF.md](file:///Users/dave/CODE/LEARNING/gemini/aac-live/AGENT_HANDOFF.md).

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint check
```

## Environment

```
GEMINI_API_KEY=your_key_here          # Gemini AI (vision, TTS, Live API)
GOOGLE_PLACES_API_KEY=your_key_here   # Google Places API (optional, for location names)
```

| Key | Source | Required | Purpose |
|-----|--------|----------|---------|
| `GEMINI_API_KEY` | [AI Studio](https://aistudio.google.com) | Yes | Gemini models (vision + audio) |
| `GOOGLE_PLACES_API_KEY` | [Cloud Console](https://console.cloud.google.com) | Optional | Place names ("McDonald's?" vs "Restaurant?") |

> [!NOTE]
> - `GEMINI_API_KEY` is exposed to client via `next.config.ts` for Live API WebSocket
> - `GOOGLE_PLACES_API_KEY` is server-only (used in `/api/places` route)
> - If Places key missing, app falls back to generic context names

## Architecture: Live-First Hybrid

### Data Flow
```
PRIMARY (Live API - WebSocket):
Camera.tsx ──► gemini-live.ts ──► Gemini 2.5 Live ──► Native Audio + Tiles
(1 FPS)       (WebSocket)        (real-time)         (wow factor)

FALLBACK (REST API - HTTP):
Camera.tsx ──► /api/tiles ──► Gemini 3 Flash ──► tiles.ts ──► Browser TTS
(1 FPS)       (POST)          (vision)           (grid)       (fallback)

PLACES (GPS → Place Name):
Geolocation ──► usePlaces ──► /api/places ──► Google Places API ──► "McDonald's"
(on mount)      (hook)        (POST)           (nearby search)       (placeName)
```

### Demo Flow (McDonald's Example)
```
1. App loads → gets GPS coordinates
2. usePlaces fetches nearby places → "McDonald's"
3. Camera sees restaurant → Gemini detects "restaurant_counter"
4. ContextPrompt shows: "McDonald's?" with ✓/✗ buttons
5. User taps ✓ → tiles lock to restaurant set
6. User taps "I want to order" → native audio speaks
```

### Models
| Layer | Model | API |
|-------|-------|-----|
| Primary | `gemini-2.5-flash-native-audio-preview-12-2025` | WebSocket |
| Fallback | `gemini-3-flash-preview` | REST |

### Key Files
| File | Purpose |
|------|---------|
| `src/lib/gemini-live.ts` | WebSocket client for Gemini 2.5 Live API |
| `src/app/page.tsx` | State orchestration, Live API init, main layout |
| `src/app/api/tiles/route.ts` | REST fallback: Gemini 3 → ContextClassification |
| `src/app/api/places/route.ts` | Google Places API → nearby place names |
| `src/hooks/usePlaces.ts` | Fetches place name from GPS coordinates |
| `next.config.ts` | Exposes GEMINI_API_KEY to client via env block |
| `src/lib/tiles.ts` | Affirmation logic + Grid generation engine |
| `src/components/Camera.tsx` | Dual-mode: WebSocket stream or REST POST |
| `src/components/ContextPrompt.tsx` | Context confirmation UI ("McDonald's? ✓/✗") |
| `src/components/TileGrid.tsx` | Tile display + click → native audio |
| `src/lib/tts.ts` | Browser TTS (REST fallback only) |

### Domain Logic (`tiles.ts`)

**Affirmation Thresholds**: (from `ai_docs/AAC_DOMAIN.md`)
- **≥0.85**: Auto-proceed (no UI)
- **≥0.60**: Quick binary confirm ("Are you at a [context]?")
- **≥0.30**: Multi-choice disambiguation (Top 3 options)
- **<0.30**: Full manual picker (Category search)

**Grid Generation Engine**:
- Always includes `CORE_TILES` (Help, Yes, No, More)
- Dynamically selects tiles from `TILE_SETS` based on `affirmedContext`
- Scores tiles by `priority` + frequency (if profile available)
- Renders in 3xN or 4xN grid based on `gridSize`

### Gemini Integration (Authoritative)

**Primary (Live API)**:
- Model: `gemini-2.5-flash-native-audio-preview-12-2025`
- WebSocket streaming for real-time vision + native TTS
- 2-minute session limit → auto-reconnect

**Fallback (REST API)**:
- Model: `gemini-3-flash-preview`
- HTTP POST for scene classification
- Uses `responseSchema` for strict JSON
- **Tools**: `googleSearch` enabled

**SDK**: `@google/genai`

### Hackathon Context
**Track**: Track 6 - Real-Time Multimodal
**Mission**: Low-latency, vision-aware communication for non-verbal children.

## Multi-Agent Development
| Agent | Primary Domain |
|-------|----------------|
| **Claude Code** | Architecture, Next.js, UI/UX, Git |
| **Gemini/AG** | GenAI SDK, Models, Prompt Engineering |

Coordination via `AGENT_HANDOFF.md`.
