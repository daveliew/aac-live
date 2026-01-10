# Glimpse
> **Communication at the speed of sight.**

Glimpse is a context-aware Augmentative and Alternative Communication (AAC) app for non-verbal children, powered by Gemini 3. It bridges the gap between sight and voice by automatically surfacing relevant communication tiles based on the child's environment.

## What it does

1. Point your camera at any context (food, toys, people, outdoors)
2. Tap "Scan Context" to analyze the scene
3. Get 3-5 relevant communication tiles ("I want that", "Help me", "More please")
4. Tap any tile to speak it aloud

## Quick Start

```bash
npm install
echo "GEMINI_API_KEY=your_key_here" > .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) on a device with a camera.

## Tech Stack

- Next.js 16 (App Router)
- React 19
- Gemini 3 Flash (vision AI)
- Web Speech API (text-to-speech)
- Tailwind CSS 4

## Multi-Agent Development Experiment

This project is also an experiment in **multi-IDE and multi-LLM collaboration**.

We're exploring how different AI coding assistants can work together on the same codebase:
- **Claude Code** handles architecture, React components, and project structure
- **Gemini/Antigravity** specializes in Gemini API integration and prompt engineering

Coordination happens through `AGENT_HANDOFF.md` - a structured handoff protocol where each agent documents what they completed and what the other should pick up next.

Why? As AI-assisted development matures, the future likely isn't one tool to rule them all, but orchestrating multiple specialized agents. This project is a small step in exploring that workflow.

## License

MIT
