# Glimpse - Project Overview

> **Communication at the speed of sight.**

AAC (Augmentative and Alternative Communication) app for non-verbal children. Powered by Gemini vision + native TTS.

---

## The Problem

"By the time a child finds 'I need the bathroom,' it's already too late."

Traditional AAC apps have thousands of buttons. Children must search, scroll, navigate hierarchies. In the real world, communication needs are immediate and contextual.

## The Solution

Point camera → Gemini sees context → Relevant tiles appear → One tap → Child is heard.

---

## Demo Flow (3 minutes)

### Scenario 1: Bathroom (0:30)
```
[Walk into bathroom, point camera]
→ ConfirmBubble: "🚽 Bathroom? 👍👎"
→ Tap 👍
→ Tiles: "I need to go", "Help please", "Wash hands", "All done"
→ Tap tile → Native audio speaks
```

### Scenario 2: Kitchen (1:00)
```
[Walk to pantry/kitchen]
→ Context auto-shifts
→ Tiles: "I'm hungry", "Snack please", "Juice please", "Water please"
→ Point at specific item → Entity chip appears
→ Tap tile → Audio speaks
```

### Scenario 3: Greeting/Selfie (1:45)
```
[Flip to front camera]
→ Detects face → Social/feelings mode
→ Tiles: "Hello", "I'm happy", "I'm sad", "Thank you"
```

**Key Line**: "One tap. I'm heard."

---

## Feature Inventory

### CORE Features (Ship These)

| Feature | What It Does | File |
|---------|--------------|------|
| Camera input | Captures scene at 1 FPS | `Camera.tsx` |
| **Live API (generative)** | Gemini 2.5 Live → context + tiles + audio | `gemini-live.ts` |
| Tile grid | Horizontal scrollable tiles with TTS | `TileGrid.tsx` |
| Native TTS | Gemini's natural voice on tile click | `gemini-live.ts` |
| Browser TTS | Web Speech API fallback | `tts.ts` |
| Camera flip | Front/back toggle for selfie mode | `page.tsx` |

### NICE-TO-HAVE Features

| Feature | What It Does | Status |
|---------|--------------|--------|
| Entity chips | "I see: Cookie, Juice" | Implemented |
| Places API | "McDonald's" vs "Restaurant" | Implemented |
| Audio capture | Mic input to Live API | Implemented |
| Shift alert | "Scene changed" modal | Implemented |
| Context confirmation | "Bathroom? 👍👎" prompt | Implemented |
| REST fallback | Gemini 3 Flash when WebSocket fails | Disabled |

### DEAD CODE (Remove)

| File | Reason |
|------|--------|
| `CoreTileBar.tsx` | Replaced by TileGrid |
| `AffirmationUI.tsx` | Stub, unused |
| `ContextLockIndicator.tsx` | Stub, unused |
| `ErrorToast.tsx` | Stub, unused |

---

## Tile Generation

**Tiles are GENERATIVE** - Gemini Live API creates context-appropriate tiles in real-time.

No hardcoded tile sets needed. Point camera at bathroom → Gemini generates bathroom tiles.

### Demo Contexts (recognized by Live API)
`bathroom | kitchen | greeting | restaurant | playground | classroom | store | medical | unknown`

---

## Architecture

```
LIVE API (WebSocket - generative):
Camera (1 FPS) → gemini-live.ts → Gemini 2.5 Live → Context + Tiles + Audio
                  (WebSocket)      (streaming)       (generative)

FALLBACK (disabled):
REST API → Gemini 3 Flash → hardcoded TILE_SETS
```

### Models
| Purpose | Model |
|---------|-------|
| Live (classification + tiles + TTS) | `gemini-2.5-flash-native-audio-preview-12-2025` |
| REST fallback (disabled) | `gemini-3-flash-preview` |

### Affirmation Thresholds
| Confidence | Action |
|------------|--------|
| ≥0.85 | Auto-proceed (no UI) |
| ≥0.60 | Binary confirm ("Bathroom? 👍👎") |
| ≥0.30 | Multi-choice (3 options) |
| <0.30 | Manual full picker |

---

## Tech Stack

- Next.js 16 + React 19
- Tailwind CSS 4
- Gemini AI SDK (`@google/genai`)
- Vercel deployment

---

## Demo Fallbacks

| Failure | Fallback |
|---------|----------|
| Camera doesn't trigger | Pre-load static image |
| Gemini API slow | Hard-code demo mode with fake 0.75 confidence |
| Audio doesn't play | Browser TTS backup |
| Tiles don't load | Pre-baked tile set |

**Demo mode**: Add `?demo=true` URL param to bypass live API.

---

## Key Phrases

| Moment | Line |
|--------|------|
| Hook | "By the time a child finds 'I need the bathroom,' it's already too late." |
| Demo | "One tap. I'm heard." |
| Tech | "Gemini 2.5 Live streams context and tiles in real-time." |
| Close | "Communication at the speed of sight." |

---

*Last updated: 2026-01-10*
