# Agent Handoff

## Current Owner: Human (Dave)
## Last Updated: 2026-01-10

---

## Status: Integration Complete

### Just Completed
- **AAC Affirmation System**: Full implementation with Gemini 3 Flash
- **State Management**: useAACState reducer with debouncing for live mode
- **UI Components**: AffirmationUI, ContextNotification, DisplayTile support
- **Documentation**: SOT structure, architecture diagrams, model ID consolidation
- **Deployment**: Docker + Cloud Run ready

### Next Task
- [ ] **Presentation Coordination**: Craft elevator pitch and outline for Gamma deck
- [ ] Test end-to-end: Snapshot mode with affirmation flow
- [ ] Test end-to-end: Live mode with debounced context updates
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

- [ ] Session timeout handling for Live API (2-min limit)
- [ ] Audio playback from Gemini Live responses
- [ ] Expand context tile sets (classroom, home, store, medical)
- [ ] User preference persistence (frequent tiles)
- [ ] Integrate Vercel AI SDK for robust JSON object generation in `classifyScene`

---

## Architecture Decisions (Locked)

| Decision | Value | Rationale |
|----------|-------|-----------|
| REST Model | `gemini-3-flash` | Structured JSON output, fast |
| Live Model | `gemini-live-2.5-flash-native-audio` | v1beta endpoint, native audio |
| Affirmation Logic | In `tiles.ts` | Shared between modes |
| Live Mode Behavior | Fully automated | No confirmation prompts |
| Snapshot Mode Behavior | Confidence-based UI | 4-tier affirmation |

---

## Source of Truth (SOT)

| Concern | Authoritative File |
|---------|-------------------|
| Current tasks | `AGENT_HANDOFF.md` |
| Model IDs & API | `CLAUDE.md` → Gemini Integration |
| Affirmation logic | `ai_docs/g3_hack/aac_module_specs.md` |
| Architecture diagrams | `ai_docs/g3_hack/*.mermaid` |
| Deployment strategy | `ai_docs/planning/deployment-strategy.md` |
