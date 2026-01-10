# Agent Handoff

## Current Owner: Claude Code (steering)
## Last Updated: 2026-01-10

---

## Status: Hybrid Mode Active, Native TTS Wired

### Completed
- Glimpse branding locked ("Communication at the speed of sight")
- Hybrid architecture: REST classification + Live API TTS
- Places API integration for location names
- Context confirmation UI with session location stability
- Native TTS on tile clicks
- Audio capture hook for Live API input

### Next Tasks
- [ ] Test end-to-end demo flow
- [ ] Deploy to Vercel for hackathon
- [ ] Expand context tile sets (classroom, home, store, medical)

---

## Agent Roles

| Agent | Role |
|-------|------|
| **Claude Code** | Primary steering: all code changes, architecture, Git |
| **AG/Gemini** | Research: SDK docs, prompt engineering exploration |

Claude handles all implementation. AG provides research support only.

---

## Architecture Decisions (Locked)

| Decision | Value | Rationale |
|----------|-------|-----------|
| Architecture | **Hybrid (REST classification, Live TTS)** | Stability + wow factor |
| Classification Model | `gemini-3-flash-preview` | Structured JSON, reliable |
| TTS Model | `gemini-2.5-flash-native-audio-preview-12-2025` | Native audio output |
| Session Limit | 2 minutes → auto-reconnect | Live API constraint |
| Affirmation Logic | In `tiles.ts` | Confidence-based UI |
| Frame Rate | 1 FPS | Balance latency vs API calls |

---

## Source of Truth

| Concern | File |
|---------|------|
| Architecture & Models | `CLAUDE.md` |
| Affirmation logic | `ai_docs/AAC_DOMAIN.md` |
| API mechanics | `ai_docs/GEMINI_API.md` |
| Deployment | `ai_docs/DEPLOYMENT.md` |
