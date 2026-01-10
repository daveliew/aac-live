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
GEMINI_API_KEY=your_key_here
```

## Architecture

### Data Flow (REST API)
```
Camera.tsx ──► /api/tiles ──► tiles.ts (logic) ──► TileGrid.tsx ──► tts.ts
(1 FPS)       (Gemini 3)     (affirm/grid)      (render)        (speak)
```

### Key Files
| File | Purpose |
|------|---------|
| `src/app/page.tsx` | State orchestration, main layout |
| `src/app/api/tiles/route.ts` | Gemini 3 vision → ContextClassification |
| `src/lib/tiles.ts` | Affirmation logic + Grid generation engine |
| `src/components/Camera.tsx` | Video capture + frame streaming |
| `src/components/TileGrid.tsx` | Tile display + click handler |
| `src/lib/tts.ts` | Web Speech API text-to-speech |

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

**Model**: `gemini-3-flash-preview`
- Gemini 3 Flash for high-accuracy scene classification
- Uses `responseSchema` for strict JSON
- **Tools**: `googleSearch` enabled for context/entity discovery

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
