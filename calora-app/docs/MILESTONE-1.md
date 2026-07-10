# Milestone 1 — Working Calora MVP, validated end-to-end

**Date:** 2026-07-10
**Status:** 🟢 Shippable Week 1 milestone from the roadmap

## What was built

A full Next.js 16 PWA that:
1. Captures a meal (photo upload with `capture="environment"` for mobile camera, OR text input)
2. Compresses the image client-side to ~500KB JPEG
3. POSTs to `/api/estimate` (Next.js Route Handler)
4. Server calls Claude (Haiku by default, Sonnet via `?model=sonnet`) via OpenRouter
5. Returns structured JSON `{items[], totals, confidence, notes}`
6. Shows the user an editable screen (per-item name, calories, macros)
7. Saves to localStorage on confirm
8. Home view re-renders with ring progress, macro totals, and the meal in Today's list

## What was proven with real tool calls

| Test | Result |
|---|---|
| `tsc --noEmit` | exit 0 — no type errors |
| `GET /api/health` | 200, 729ms |
| `POST /api/estimate` (text, sonnet) | **200, 4.2s** — valid JSON, 445 kcal for "2 eggs + butter + toast" |
| `POST /api/estimate?model=haiku` | **200, 2.4s** — valid JSON, 255 kcal for "oatmeal + banana" |
| Browser flow: capture → estimate → edit → save | **Full E2E works** — meal appears in home ring + Today list |
| Retry-with-backoff on transient 402/5xx | 3 attempts, 5s/12s delays, returns 502 only after exhaustion |

## Architecture

```
app/
  page.tsx              # Single client component, view-state machine
  layout.tsx            # PWA-aware metadata + viewport
  globals.css           # Tailwind v4, accent color, tap-highlight reset
  api/
    estimate/route.ts   # POST: text+image → JSON; 3-retry backoff; model picker
    health/route.ts     # GET: deploy probe
lib/
  types.ts              # FoodItem, Macros, MealEntry, EstimateRequest/Response
  storage.ts            # localStorage adapter (loadLog, addEntry, sumMacros, day-filter)
  image.ts              # Canvas-based client-side image compression
public/
  manifest.json         # PWA install manifest
docs/
  01-idea.md            # The original idea
  02-tech-stack.md      # Why Next.js + Claude + Vercel
  ...                   # 7 planning docs total
  research/
    ai-validation.md    # Pre-build validation (5 text + 6 vision tests)
```

## Decisions made during the build

- **Default model = Haiku** (was Sonnet in plan). Sonnet is more capable for food vision but the account is rate-limited at ~254 tokens/req. Haiku works in the current credit window and is 10x cheaper. Users can pass `?model=sonnet` for higher accuracy. Env var `CALORA_DEFAULT_MODEL` overrides.
- **Prompt shrunk to ~280 chars** (was 1.5k) to fit smaller token output windows and reduce cost.
- **Compression in browser, not server** — keeps server stateless, no sharp dependency, no Image Optimization config needed. PNG/HEIC photos are converted to 1024px JPEG @ q=0.82.
- **No user auth in MVP** — single-user localStorage. Auth is post-validation per the rejected-ideas doc.
- **No database in MVP** — all data lives in localStorage. Cross-device sync is post-MVP.
- **PWA manifest declared but icons 404** — need to generate `/icon-192.png` and `/icon-512.png` before the install prompt works.

## Known gaps for Week 2 polish

- **No PWA icons** — manifest references `/icon-192.png` and `/icon-512.png` but they don't exist yet
- **No service worker** — install prompt works, but offline mode doesn't
- **No iOS Safari testing** — file input + camera capture work on desktop, need to verify on real iPhone
- **No analytics** — Plausible or Vercel Analytics not wired yet
- **No data export** — localStorage is the only persistence; clearing browser data = losing log
- **Vision path unverified in this build** — Sonnet 402s in current credit window. Haiku's vision is decent but unproven for tricky plates. Need a few real photo tests once credit is topped up.
- **No tests** — zero unit tests, no Playwright. Will add in Week 4 polish.

## Next concrete step (Week 2 of roadmap)

Add Edit-screen polish: portion slider, "looks like..." confidence UI, "did I get this right?" thumbs up/down that logs to localStorage for the Week 4-5 validation. Plus generate PWA icons. Then Vercel deploy.

## Files of note

- Working dev server: `cd ~/projects/calora/calora-app && npm run dev`
- Screenshot of working flow: `docs/screenshot-home-with-meal.png`
- OpenAPI contract: implicit in `lib/types.ts` + the `app/api/estimate/route.ts` body schema