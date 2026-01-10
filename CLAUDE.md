# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AAC Live is a context-aware Augmentative and Alternative Communication (AAC) app for non-verbal children. It uses Gemini vision AI to analyze camera input and generate contextual communication tiles that speak when tapped.

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint check
npm run start    # Start production server
```

## Required Environment

```
GEMINI_API_KEY=your_key_here
```

## Architecture

### Data Flow
1. **Camera** (`src/components/Camera.tsx`) captures frames as base64 JPEG
2. **API Route** (`src/app/api/tiles/route.ts`) sends image to Gemini 2.5 Flash with AAC-specific prompt
3. **TileGrid** (`src/components/TileGrid.tsx`) renders communication options
4. **TTS** (`src/lib/tts.ts`) speaks tile text via Web Speech API when tapped

### Key Types
```typescript
interface TileData {
  id: number;
  text: string;   // Short phrase in first person ("I want", "Help me")
  emoji: string;  // Visual recognition aid
}
```

### Gemini Integration
- Model: `gemini-2.5-flash-preview-05-20`
- Uses `@google/genai` SDK
- Returns JSON array of 3-5 tiles based on visual context
- Falls back to basic Help/Yes/No tiles on error

### TTS Configuration
- Rate: 0.9 (slower for clarity)
- Pitch: 1.1 (child-friendly)
- Prefers voices: Samantha (macOS), Google US English, Microsoft Aria

## Stack

- Next.js 16 (App Router)
- React 19
- TypeScript (strict mode)
- Tailwind CSS 4
- Gemini AI via `@google/genai`

## Path Aliases

`@/*` maps to `./src/*`

## Multi-Agent Collaboration

This project uses dual-agent development: **Claude Code** + **Gemini/Antigravity**

### Role Split
| Agent | Responsibilities |
|-------|-----------------|
| **Claude Code** | Architecture, file structure, Next.js patterns, React components, testing, git, deployment |
| **Gemini/AG** | `@google/genai` SDK, prompt engineering, model selection, multimodal handling, Gemini-specific optimizations |

### Coordination
- Read `AGENT_HANDOFF.md` at start of each session
- Update handoff file after completing work
- Respect "Architecture Decisions (locked)" section
- Flag conflicts in "Open Questions" rather than overwriting

### Commit Convention
- Claude commits: `feat:`, `fix:`, `refactor:` with `Co-Authored-By: Claude`
- Gemini commits: prefix with `[gemini]` for clear attribution
