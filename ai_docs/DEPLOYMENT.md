# Deployment Strategy: Vercel to Cloud Run

This document outlines the phased deployment strategy for the AAC Live hackathon project.

## Phase 1: Rapid Iteration (Vercel)
**Goal:** Get a live URL for testing and feedback within minutes.

### Requirements
- **Gemini API Key:** Must be added to Vercel Environment Variables (`GEMINI_API_KEY`).
- **Next.js Config:** Standard build commands (`npm run build`).

### Why Vercel first?
- Zero-config deployment.
- Automatic CD on git push.
- Ideal for UI/UX testing.

---

## Phase 2: Performance & Scalability (Google Cloud Run)
**Goal:** Port to Cloud Run later today for production-grade multimodal handling and lower latency for regions near Gemini's backbone.

### Docker Configuration
- We will use the existing `Dockerfile` (standalone mode).
- Port 3000 is exposed to match Cloud Run's default.

### Transition Plan
1. **GitHub Action:** Set up a workflow to build and push the Docker image to Google Artifact Registry.
2. **Cloud Run Service:** Deploy the image with the same `GEMINI_API_KEY`.
3. **Domain Swap:** Point the custom domain (if any) from Vercel to the Cloud Run service.

## Environment Variables (Required for both)
- `GEMINI_API_KEY`: Required for vision and live API functionality.
