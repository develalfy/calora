# Calora — Autonomous Co-Founder Execution State

> Last update: 2026-07-12. This is the single source of truth for what was done, what is broken, and what to do next. If the session ends, resume from the **Next action** line at the bottom.

---

## Current phase

**Phase 6 — Production hardening. DONE.**

The marketing site (Phases 1+4+5) and the product hardening (Phase 6) are complete and live at https://calora.develalfy.me. What shipped in Phase 6: security headers, image validation, observability, SEO, error boundaries, custom 404/loading. What's left is owner-action-only: Stripe + Postgres + auth (Phase 2/3).

---

## What's LIVE right now (2026-07-14, 10:21 UTC)

- **Landing page** at `/` — hero, 3-step explainer, 6 features, real pricing ($4.99/mo, $29.99/yr), FAQ, footer, medical disclaimer, waitlist capture, JSON-LD SoftwareApplication schema, full Open Graph + Twitter Card meta, canonical URL.
- **App** at `/app` — Calora MVP (camera/text scan, edit, history, settings, onboarding, favorites, upgrade modal, CSV export, dark mode, service worker, PWA install).
- **API surface** at `/api/*`:
  - `/api/estimate` — Gemini/MiniMax chain, 10 req/min + 100/hr per IP rate limit, **8MB body limit**, **MIME-validated image** (rejects SVG/HTML/script before reaching AI), upstream AbortController at 45s.
  - `/api/health` — uptime, AI provider reachability probe, build version, node env. **Polled by uptime monitors.**
  - `/api/metrics` — Prometheus exposition format. Counters: `calora_ai_calls_total`, `calora_ai_calls_succeeded_total`, `calora_ai_calls_failed_total`, `calora_ai_latency_ms_avg`, `calora_waitlist_signups_total`, `calora_uptime_seconds`, `calora_ai_configured`.
  - `/api/waitlist` — in-process counter + Telegram forward to chat_id 5673479032.
- **Marketing/legal pages**: `/privacy`, `/terms`.
- **SEO**: `/sitemap.xml` (4 public routes), `/robots.txt` (disallows /api and /_next), canonical URL, Open Graph image (1200x630).
- **PWA**: manifest, service worker (`/sw.js` with `no-cache` header so updates ship immediately), 192/512/maskable icons.
- **Error UX**: branded `app/error.tsx` (digest ref + Try again), branded `app/not-found.tsx` ("off the menu"), `app/loading.tsx` (route-transition spinner).
- **Security headers**: CSP (self + OpenRouter + Google Fonts), X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy camera=(self), HSTS max-age 2y + preload, `x-powered-by` removed at app layer.
- **150 unit + integration tests passing** (`npm test`), `tsc --noEmit` clean, `next build` clean (10 routes).

### Verified live just now (curl from VM)
```
/                  → 200 (31KB)
/app               → 200 (20KB)
/privacy           → 200 (25KB)
/terms             → 200 (24KB)
/robots.txt        → 200 (1.2KB)
/sitemap.xml       → 200 (741B)
/og-image.png      → 200 (40KB, 1200×630)
/sw.js             → 200 (4KB)
/manifest.json     → 200 (907B)
/api/health        → 200 {ok:true, ai_provider_reachable:true, uptime_sec:58}
/api/metrics       → 200 Prometheus text format
```

### Counter sanity check (4 calls in, then position #5)
```
calora_ai_calls_total 4
calora_ai_calls_succeeded_total 4
calora_waitlist_signups_total 4
```

---

## Current state inventory (post-audit)

### ✅ What works
- Image + text upload, HEIC-tolerant
- AI calorie/macro estimate via OpenRouter (Gemini 2.5 Flash → MiniMax fallback)
- Editable results with per-item kcal/macros
- localStorage persistence (`calora:log:v1`, `calora:settings:v1`)
- Home / Capture / Edit / History / Settings / Meal-detail screens
- Toast + undo for destructive actions
- Dark mode (CSS vars, partial — theme-color meta still hardcoded)
- CSV export of meal log
- Longest streak stat
- PWA manifest + icons (no service worker yet)
- Mobile-first responsive UI

### ❌ Critical missing for SaaS launch
1. **No auth** — every user shares localStorage on their device
2. **No backend DB** — logs are device-local; switching phones = data loss
3. **No payments** — no pricing, no Stripe, no free vs paid tiers
4. **No analytics** — no signup, no scan, no retention tracking
5. **No landing page** — visitors land on the app itself; no marketing copy, no social proof, no signup CTA
6. **No onboarding** — first-time users see an empty home screen with no guidance
7. **No pricing page** — no way to upgrade, no plan selector, no usage limits
8. **No rate limiting** — `app/api/estimate` can be called 1000x/s; will burn the OpenRouter budget
9. **No image content validation** — server blindly accepts anything as base64; no MIME check, no size check (beyond request body limit), no NSFW filtering
10. **No privacy policy / terms / disclaimer** — required for app stores, Stripe, GDPR
11. **No SEO meta** — title is hardcoded "Calora"; no description, no OG image, no structured data
12. **No emails** — no verification, no receipt, no password reset
13. **No account deletion** — once we add accounts, we need GDPR-grade delete
14. **No service worker** — manifest exists, but app breaks offline
15. **No testing** — zero unit tests, zero integration tests, zero e2e tests
16. **No CI** — every deploy is manual `git push`

### 🟡 High-priority gaps
- Settings view shows no account/profile section (no plan, no email, no logout)
- History only shows local data; can't see it on a new device
- No usage counter — free users have no "X of Y scans left" nudge
- No way to share a meal — no link, no PDF, no social share
- No favorites / starred meals — repeat logging is just "recent duplicates" chips
- No reminder / notifications — retention engine missing
- No browser permission handling flow (camera permission denied → dead end)

---

## Completed work (cumulative, focus-topic weighted)

### Phase 0 — Visual polish + upload hardening (already shipped)
1-10. [see prior commits]

### Phase 1 — Inspection, tests, rate limiting (commit `1cebc09` + `0a2b3b7`)
11. Full audit of all files in calora-app/
12. Wrote Vitest test suite: 100 tests across 6 files
13. `lib/calc.ts` — pure business logic (streak, longest-streak, macro targets, pct, sumTotals, formatKcal)
14. `lib/usage.ts` — daily scan quota tracker, AI cost math
15. `lib/ratelimit.ts` — sliding-window in-process limiter with IP extraction
16. **Wired rate limiter into `/api/estimate`** — 10 req/min + 100 req/hour per IP, returns 429 + Retry-After header
17. Added npm scripts: `test`, `test:watch`, `test:coverage`, `typecheck`
18. Removed duplicate `macroTargets` from page.tsx (single source of truth)

### Phase 4 — Marketing landing page (commits `5a46303`, `4ef6fb6`)
19. Built `app/page.tsx` — full marketing landing page (hero, 3 steps, 6 features, pricing, FAQ, footer, medical disclaimer)
20. Moved the existing app to `app/app/page.tsx`
21. Pricing card for **Free** (5 scans/day, no signup) + **Pro** ($4.99/mo or $29.99/yr with 7-day free trial)
22. Zero fake scarcity, zero dark patterns, honest "AI ±20% accurate" disclaimer
23. Pushed to GitHub, Dokploy auto-rebuilt via webhook
24. Wrote `docs/MARKET_ANALYSIS.md` (22K) — verified data on 6 competitors from iTunes Lookup API + App Store reviews RSS + Brave snippets. Specific verified prices: MacroFactor $11.99/$47.99/$71.99, Cal AI $30/yr, MFP $19.99/$79.99 (Premium+) $24.99/$99.99, Lose It! $19.99/$39.99/$59.99 lifetime
25. Wrote `docs/BUSINESS_PLAN.md` (17K) — unit economics ($0.15/mo AI cost per free user, 85-90% gross margin), $1k MRR path (need ~200 Pro subs or ~6,500 MAU at 3.2% conversion), 30/60/90 day plan
26. Verified live: $4.99, $29.99, "7-day free trial" all visible on calora.develalfy.me

### Phase 5 — Activation + conversion infrastructure (commit `cd29cd4`)
27. `app/privacy/page.tsx` — full Privacy Policy (data on device, AI provider, GDPR, etc.) — required for Stripe
28. `app/terms/page.tsx` — Terms of Service with prominent "Not a medical device" warning — required for Stripe
29. `lib/analytics.ts` — clean event-tracking abstraction. 24 event types. Mock sink by default (localStorage ring buffer); drop-in PostHog replacement. SSR-safe.
30. `lib/favorites.ts` — favorite meal templates for quick repeat (deep-clones items)
31. `lib/storage.ts` — added `loadOnboarding/saveOnboarding/hasCompletedOnboarding`
32. **3-step onboarding wizard** in `OnboardingView`: welcome → goal picker → ready. Skippable.
33. **Upgrade modal** triggered when free scan limit hit. Anti-dark-pattern: dismissible, no fake urgency, "Maybe later" button.
34. **`★ Favorite` button** on Edit view (saves meal template, shows toast).
35. **`public/sw.js`** — service worker (cache-first for static, network-first for HTML, never caches API)
36. **137 tests passing** (was 100). 9 test files including new: analytics (10), favorites (12), sw (10), onboarding (5).
2. DESIGN.md full brand system + design tokens in `app/globals.css`
3. PageHeader, HeroRing, MacroBar, Toast, EmptyState in `components/ui.tsx`
4. Six screens (home, capture, loading, edit, history, settings, meal-detail) in `app/page.tsx`
5. `compressImageSafe()` with structured result + HEIC detection
6. CSV export utility
7. OpenRouter chain with model fallback
8. Theme-color `<meta>` swap for dark/light
9. Undo toast for destructive actions
10. Live at https://calora.develalfy.me via Dokploy + Traefik

---

## Remaining work (prioritized for SaaS launch)

### 🔴 Phase 1 — Business foundation (NOW)
- [ ] **Pricing model decision** — research competitors (MyFitnessPal, Lose It, MacroFactor, Cronometer, Bitesnap)
- [ ] **AI cost estimation** — measure real OpenRouter cost per scan
- [ ] **Market positioning doc** — ideal customer, value prop, differentiation
- [ ] **Unit economics** — cost per user, gross margin, pricing tiers, subscribers needed for $1k MRR

### 🔴 Phase 2 — Auth + backend DB
- [ ] Choose auth provider (Auth.js / Clerk / Supabase) — recommend Supabase for speed
- [ ] Postgres schema: users, meals, scans, sessions, subscriptions
- [ ] API routes: `/api/meals` (CRUD), `/api/auth/*`
- [ ] Move localStorage → server-side persistence with offline cache
- [ ] Email verification, password reset, account deletion

---

## Decisions log

| Date | Decision | Rationale |
|---|---|---|
| 2026-07-12 | Use localStorage-only for MVP | Fastest path to validate UX; replaced in Phase 2 |
| 2026-07-12 | OpenRouter with Gemini 2.5 Flash | Cheapest JSON-clean model; MiniMax as fallback |
| 2026-07-12 | No Framer Motion | Keep bundle small; CSS transitions sufficient |
| 2026-07-12 | Toast + undo over `confirm()` | Industry-standard reversible destructive pattern |
| 2026-07-12 | Cal Sans + Inter | Free, calm, premium — matches brand voice |

---

## Bugs

None known after Phase 0 polish pass. Visual verification of toast pending.

---

## Failed tests

N/A — no tests written yet (Phase 7).

---

## Missing credentials (required before launch)

| Service | Why | Cost | Action |
|---|---|---|---|
| Supabase project | Auth + Postgres | Free tier → $25/mo | Create project, copy `NEXT_PUBLIC_SUPABASE_URL` + anon key |
| Stripe account | Billing | Free until first charge | Create account, get test keys, set up products |
| OpenRouter key | Already have one in `.env.local` | ~$0.001/scan | Confirm budget allowance |
| Resend or Postmark | Transactional email | Free tier → $20/mo | Sign up, get API key |
| PostHog Cloud or self-hosted | Analytics | Free tier → $0/mo at our scale | Sign up, get project key |
| Domain `calora.develalfy.me` | Already have | $0 (existing) | DNS orange cloud already on |
| Apple Developer account | iOS app later | $99/yr | Skip at MVP, document |

---

## Changed files (Phase 1+)

TBD — Phase 1 starts now.

---

## Last successful commands

```
git log --oneline -20 → 5bbfa4e Polish pass: dark mode tokens, undo toast, longest-streak, capture hint
```

---

## Exact next action

```
cd /home/develalfy/projects/calora
git add -A && git commit -m "Update state doc" && git push origin main
# Wait for Dokploy rebuild (~40s)
# Then begin Phase 2:
# 1. Decide auth provider: Supabase vs Clerk vs NextAuth
# 2. Postgres schema: users, meals (FK to users), subscriptions (FK to users)
# 3. /api/meals endpoint (GET/POST/PATCH/DELETE) gated by JWT
# 4. Stripe Checkout + webhook handler
# 5. Move meal log from localStorage → server (with offline cache)
# 6. Privacy policy + Terms of Service live pages (required for Stripe)
```