# Deployment: Vercel

## Quick Deploy

1. Push to GitHub
2. Import in [Vercel Dashboard](https://vercel.com/new)
3. Add environment variable: `GEMINI_API_KEY`
4. Deploy

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Gemini API key for vision classification |
| `NEXT_PUBLIC_GEMINI_API_KEY` | No | Client-side key (if using Live API) |

## Automatic Deployments

- **Production**: Pushes to `main` auto-deploy
- **Preview**: PRs get preview URLs

## Build Settings

- Framework: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`
