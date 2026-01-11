# Glimpse - Hackathon Learnings

**Event**: Gemini 3 Hackathon Singapore (Google DeepMind x 65labs)
**Track**: Track 6 - Real-Time Multimodal
**Date**: January 2026

## The Problem

Traditional AAC apps have 1000+ buttons in deep hierarchies. By the time a non-verbal child navigates to "I need the bathroom," the moment has passed.

## The Solution

Context-aware tiles using Gemini's multimodal Live API. Point camera at environment → relevant communication tiles surface instantly.

"Communication at the speed of sight."

## Technical Wins

### Gemini 2.5 Live API
- WebSocket streaming for real-time scene understanding
- Native TTS ("Puck" voice) - massive quality jump over browser TTS
- 2-minute session limit required auto-reconnect logic (10s before expiry)
- Single API call handles vision + context + tiles + speech

### Smart Entity Detection
- Objects in frame boost relevant tiles without extra API calls
- "swing" detected → "Push me!", "Higher!", "My turn" tiles appear
- User can tap entity chips to focus context

### Affirmation UX
- Confidence thresholds prevent tile thrashing:
  - ≥0.85: Auto-proceed (no confirmation needed)
  - ≥0.60: Quick confirm ("Bathroom? 👍👎")
  - <0.60: Disambiguation choices
- Session location locking prevents context flicker

### REST Fallback Architecture
- Gemini 3 Flash as backup (disabled for demo)
- Structured JSON output more reliable than streaming for classification
- Live API wins on "wow factor" for hackathon demo

## Multi-Agent Development Experiment

| Agent | Role |
|-------|------|
| **Claude Code** | All code changes, architecture, Git |
| **AG/Gemini** | Research-only (SDK docs, prompt engineering) |

Coordination via `AGENT_HANDOFF.md` protocol - structured handoff between agents with clear task ownership.

## What Worked

- 1 FPS frame rate balanced latency vs API cost
- Session location locking prevented UX thrashing
- Entity chips gave users control without overwhelming
- Google Places API for human-readable location names ("McDonald's" vs "Restaurant")
- Horizontal scrolling tile grid for easy thumb access

## What We'd Do Differently

- Start with REST-only, add Live API later (stability first)
- More upfront domain research (AAC best practices)
- Earlier testing with actual AAC users/therapists
- Build demo scenarios earlier to validate UX assumptions

## Stack

- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind CSS
- **AI**: Gemini 2.5 Flash Live (WebSocket) + Gemini 3 Flash (REST fallback)
- **APIs**: Google Places API for location context
- **Deployment**: Vercel

## Key Files

| Purpose | File |
|---------|------|
| State orchestration | `src/app/page.tsx` |
| WebSocket client | `src/lib/gemini-live.ts` |
| Tile logic | `src/lib/tiles.ts` |
| Central reducer | `src/hooks/useAACState.ts` |

## Demo Contexts

bathroom | kitchen | greeting | restaurant | playground | classroom | store | medical

---

*Built in 8 hours at Gemini 3 Hackathon Singapore*
