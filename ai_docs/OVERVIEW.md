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
| REST classification | Gemini 3 Flash → context + entities | `/api/tiles` |
| Tile grid | Horizontal scrollable tiles with TTS | `TileGrid.tsx` |
| Context confirmation | "Bathroom? 👍👎" binary prompt | `ContextPrompt.tsx` |
| Affirmation logic | 4 confidence thresholds (auto/confirm/multi/manual) | `tiles.ts` |
| Core tiles | Yes, No, Help, More (always visible) | `tiles.ts` |
| Context tile sets | Bathroom, Kitchen, Greeting (+ Playground, Restaurant) | `tiles.ts` |
| Browser TTS | Web Speech API fallback | `tts.ts` |
| Session location | Stable context for session | `useAACState.ts` |
| Manual picker | Override when auto-detect fails | `LocationPicker.tsx` |

### NICE-TO-HAVE Features (Wow Factor)

| Feature | What It Does | Could Cut? |
|---------|--------------|------------|
| Live API TTS | Native Gemini voice (not robotic) | Keep for demo |
| Entity chips | "I see: Cookie, Juice" | Maybe |
| Places API | "McDonald's" vs "Restaurant" | Yes |
| Audio capture | Mic input to Live API | Yes |
| Shift alert | "Scene changed" modal | Maybe |
| Camera flip | Front/back toggle for selfie mode | Keep |

### DEAD CODE (Remove)

| File | Reason |
|------|--------|
| `CoreTileBar.tsx` | Replaced by TileGrid |
| `AffirmationUI.tsx` | Stub, unused |
| `ContextLockIndicator.tsx` | Stub, unused |
| `ErrorToast.tsx` | Stub, unused |

---

## Tile Sets Needed

### ✅ Implemented
- `playground` (8 tiles)
- `restaurant_counter` (8 tiles)
- `unknown` / feelings (5 tiles)

### 🔴 TODO for Demo
```typescript
// bathroom
{ label: "I need to go", tts: "I need to use the bathroom", emoji: "🚽" }
{ label: "Help please", tts: "I need help please", emoji: "🙋" }
{ label: "Wash hands", tts: "I need to wash my hands", emoji: "🧼" }
{ label: "All done", tts: "I am all done", emoji: "✅" }

// home_kitchen
{ label: "I'm hungry", tts: "I am hungry", emoji: "🍽️" }
{ label: "Snack please", tts: "Can I have a snack please", emoji: "🍪" }
{ label: "Juice please", tts: "Can I have some juice please", emoji: "🧃" }
{ label: "Water please", tts: "Can I have water please", emoji: "💧" }

// greeting (selfie/social mode)
{ label: "Hello", tts: "Hello, nice to meet you", emoji: "👋" }
{ label: "I'm happy", tts: "I am feeling happy", emoji: "😊" }
{ label: "I'm sad", tts: "I am feeling sad", emoji: "😢" }
{ label: "Thank you", tts: "Thank you very much", emoji: "🙏" }
```

---

## Architecture

```
CLASSIFICATION (REST - stable):
Camera (1 FPS) → /api/tiles → Gemini 3 Flash → tiles.ts → UI

TTS (Live API - native audio):
Tile click → gemini-live.ts → Gemini 2.5 Live → Audio playback

FALLBACK:
Browser TTS via Web Speech API
```

### Models
| Purpose | Model |
|---------|-------|
| Scene classification | `gemini-3-flash-preview` |
| Native TTS | `gemini-2.5-flash-native-audio-preview-12-2025` |

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
| Tech | "Gemini 3 Flash classifies the scene in under 500 milliseconds." |
| Close | "Communication at the speed of sight." |

---

*Last updated: 2026-01-10*
