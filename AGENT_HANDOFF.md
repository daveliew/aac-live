# Agent Handoff

## Current Owner: Human (Dave)
## Last Updated: 2026-01-10

---

## Status: Live API Components Built, Wiring Needed

### Just Completed
- **Glimpse Branding**: Identity locked ("Communication at the speed of sight")
- **Visual Assets**: Logo, App Icon, Hero, and Mockup generated
- **Live-First Architecture**: Decision locked (Live primary, REST fallback)
- **Live API Client**: `gemini-live.ts` complete with auto-reconnect
- **State Management**: `useAACState.ts` updated with context locking + connection modes
- **Dual-Mode Camera**: `Camera.tsx` supports WebSocket or REST
- **Context Lock UI**: `ContextLockIndicator.tsx` component ready

### Next Task
- [ ] **Wire page.tsx to Live API** (critical path)
  - Initialize GeminiLiveClient on mount
  - Pass `mode` and `liveClient` to Camera
  - Handle onContext, onTiles, onAudio callbacks
- [ ] **Add Context Confirmation UI** (Phase 1 UX)
- [ ] **Create ShiftAlertModal** component
- [ ] **Connect tile clicks to native TTS** (wow factor)
- [ ] Test end-to-end: Live mode with native audio
- [ ] Deploy to Vercel for hackathon demo

---

## Guardrails (READ BEFORE WORKING)

### Rule 1: Stay In Your Lane
- **Only work on tasks explicitly assigned in "Next Task"**
- If you see related work that would be helpful, **flag it** in "Suggested Tasks" — don't just do it
- The human orchestrator decides when to expand scope

### Rule 2: No Surprise Features
- Don't add features that weren't requested (e.g., "Google Search tool", "deployment strategy")
- If you think something is valuable, add it to "Suggested Tasks" with rationale
- Wait for approval before implementing

### Rule 3: Respect File Ownership
If a file is listed under another agent's domain, **do not modify it** without handoff.

| Domain | Owner | Key Files |
|--------|-------|-----------|
| UI/UX, React, State | Claude | `src/components/*`, `src/hooks/*`, `src/app/page.tsx` |
| Gemini API, Prompts | Gemini | `src/app/api/*`, `src/lib/gemini-live.ts` |
| Shared Logic | Both | `src/lib/tiles.ts` (coordinate changes) |
| Docs | Human | `AGENT_HANDOFF.md`, `CLAUDE.md` |

### Rule 4: Small, Focused Commits
- One logical change per commit
- Don't batch unrelated work (API changes + UI + docs + deployment ≠ one commit)
- Use conventional commit format: `type: description`

### Rule 5: Update Handoff Before Pushing
Before `git push`, you MUST:
1. Update "Just Completed" with what you actually did
2. Update "Next Task" for the receiving agent
3. If you did work outside your assignment, explain why in "Notes"

---

## Handoff Protocol

```
1. git pull
2. Read AGENT_HANDOFF.md
3. Verify you're assigned the "Next Task"
4. Do ONLY assigned work
5. Update this file
6. git commit -m "type: description"
7. git push
```

---

## Suggested Tasks (Not Yet Approved)

_Add ideas here. Human will approve and move to "Next Task"._

- [ ] Expand context tile sets (classroom, home, store, medical)
- [ ] User preference persistence (frequent tiles)
- [ ] Integrate Vercel AI SDK for robust JSON object generation
- [ ] Add TTS voice selection UI

---

## Architecture Decisions (Locked)

| Decision | Value | Rationale |
|----------|-------|-----------|
| Architecture | **Hybrid (Live primary, REST fallback)** | Wow factor + reliability |
| Primary Model | `gemini-2.5-flash-native-audio-preview-12-2025` | Real-time streaming, native TTS |
| Fallback Model | `gemini-3-flash-preview` | Structured JSON, no session limits |
| Session Limit | 2 minutes → auto-reconnect | Live API constraint |
| Affirmation Logic | In `tiles.ts` | Confidence-based UI |
| Frame Rate | 1 FPS | Balance latency vs API calls |

---

## Source of Truth (SOT)

| Concern | Authoritative File |
|---------|-------------------|
| Current tasks | `AGENT_HANDOFF.md` |
| Model IDs & API | `CLAUDE.md` → Gemini Integration |
| Affirmation logic | `ai_docs/AAC_DOMAIN.md` |
| API mechanics | `ai_docs/GEMINI_API.md` |
| Deployment strategy | `ai_docs/DEPLOYMENT.md` |
