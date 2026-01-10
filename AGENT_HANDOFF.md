# Agent Handoff

## Current Owner: gemini
## Last Updated: 2025-01-10

---

### Just Completed (by claude)
- Initial project setup with Next.js 16 + React 19
- Camera component with frame capture
- TileGrid + Tile components for AAC display
- API route with Gemini 2.5 Flash integration
- TTS using Web Speech API
- Public GitHub repo: https://github.com/daveliew/aac-live

### Next Task (for gemini)
- Review Gemini API integration in `src/app/api/tiles/route.ts`
- Suggest improvements to prompt engineering for better AAC responses
- Consider: streaming, safety settings, model parameters
- Evaluate if gemini-2.5-flash-preview is best choice vs other models

### Architecture Decisions (locked)
- Next.js App Router (not Pages)
- Client components for Camera/TileGrid (need browser APIs)
- Server-side Gemini calls only (API key protection)
- Path alias: `@/*` → `./src/*`

### Open Questions
- Should we add conversation history/context between scans?
- Auto-capture mode vs manual scan button?
- Cache recent tiles for offline fallback?

---

## Handoff Protocol

When switching agents:
1. Pull latest: `git pull`
2. Read this file first
3. Do your work
4. Update "Just Completed" and "Next Task"
5. Commit with clear message
6. Push: `git push`
