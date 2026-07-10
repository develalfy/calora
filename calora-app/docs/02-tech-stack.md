# Tech Stack — Calora

## Decision: Web app first (Next.js), mobile later if traction

### Frontend
- **Next.js 15 (App Router) + TypeScript** — fastest path to a real deployable MVP, server components for AI calls, native camera via `<input type="file" capture>` works on mobile browsers
- **Tailwind + shadcn/ui** — fast to look polished without designer
- **PWA manifest** — installable on phone home screen, app-like feel without App Store

### Backend / API
- **Next.js API routes + Server Actions** — colocate with frontend, no separate server
- **No external DB for MVP** — localStorage + JSON export. Add Postgres only if we need cross-device sync

### AI (the critical piece)
- **Vision: Claude claude-sonnet-4-5 (via OpenRouter)** — best food recognition, accepts image + returns structured JSON. Prompt asks for: items[], calories, protein_g, carbs_g, fat_g, confidence
- **Text fallback: same model, text-only prompt** with portion-size heuristics
- **Cost**: ~$0.01-0.03 per photo analysis. At 3 meals/day × 30 days = ~$2.70/user/month. Sustainable at $5/mo subscription

### Auth
- **Skip for MVP** — single-user app, no login. Add auth in Phase 2 if we add sync/social

### Deploy
- **Vercel** — zero-config Next.js deploy, free tier covers MVP traffic
- **Custom domain**: calora.develalfy.me (or similar)

### Analytics
- **Plausible self-hosted** or simple Vercel Analytics — track photo→save conversion

## Cost model (per user/month)
- AI: ~$2.70 (3 meals/day)
- Vercel: $0 (free tier until scale)
- Domain: ~$1/mo amortized
- **Total**: ~$3.70/user/mo → $5/mo subscription = 35% margin

## Why not React Native / Flutter / native iOS?
- 3x dev time, App Store review friction, no clear advantage for camera+form+list UI
- Web PWA covers 95% of the use case; can wrap with Capacitor later if needed