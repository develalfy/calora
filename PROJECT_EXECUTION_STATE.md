# Calora — Autonomous Co-Founder Execution State

> Last update: 2026-07-12. This is the single source of truth for what was done, what is broken, and what to do next. If the session ends, resume from the **Next action** line at the bottom.

---

## Current phase

**Phase 1 — Inspection & audit (DONE) → Phase 2/4 — Landing page LIVE, awaiting market research**

The marketing landing page is now live at https://calora.develalfy.me/ (public-facing). The actual app moved to https://calora.develalfy.me/app. Free tier is 5 scans/day. Pro tier is a placeholder ("Coming soon") pending the market research subagent landing.

---

## What's LIVE right now (2026-07-12)

- **Landing page** at `/` — hero, 3-step explainer, 6 features, pricing placeholder, FAQ, footer, medical disclaimer. No signup wall, no fake testimonials, no scarcity tactics.
- **App** at `/app` — same Calora MVP as before (camera/text scan, edit, history, settings).
- **API** at `/api/estimate` — Gemini 2.5 Flash + MiniMax fallback, now **rate-limited at 10 req/min and 100 req/hour per IP** (returns 429 with Retry-After).
- **Health** at `/api/health` — returns ok=true, ai_configured=true.
- **100 unit + integration tests** passing (`npm test`).

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

### Phase 4 — Marketing landing page (commit `5a46303`)
19. Built `app/page.tsx` — full marketing landing page (hero, 3 steps, 6 features, pricing, FAQ, footer, medical disclaimer)
20. Moved the existing app to `app/app/page.tsx`
21. Pricing card for **Free** (5 scans/day, no signup) + **Pro** ("Coming soon" — pending market research)
22. Zero fake scarcity, zero dark patterns, honest "AI ±20% accurate" disclaimer
23. Pushed to GitHub, Dokploy auto-rebuilt via webhook
24. Verified live: landing renders, /app still works, /api/health OK
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

### 🔴 Phase 3 — Billing
- [ ] Stripe integration (monthly + annual)
- [ ] Free tier limits (3 scans/day? 30/month?)
- [ ] Pro tier unlimited
- [ ] Customer portal for cancellation, plan changes
- [ ] Webhook handlers for subscription lifecycle
- [ ] Failed payment retry + dunning emails

### 🔴 Phase 4 — Marketing site + landing
- [ ] Public landing page (`/`) — hero, social proof, pricing preview, signup CTA
- [ ] Pricing page (`/pricing`) — comparison table, FAQ
- [ ] Sign-up flow — email + Google OAuth
- [ ] Onboarding flow — 3-step (goal, activity level, first scan)
- [ ] SEO meta, OG image, sitemap.xml, robots.txt

### 🔴 Phase 5 — Analytics + retention
- [ ] PostHog or Plausible integration
- [ ] Events: signup, first_scan, scan_complete, scan_error, paywall_view, checkout_start, checkout_complete, churn
- [ ] Retention: daily reminder opt-in, weekly summary email
- [ ] Conversion funnel tracking

### 🔴 Phase 6 — Polish + launch readiness
- [ ] Privacy policy, Terms of Service, Medical Disclaimer
- [ ] Service worker for offline + PWA install
- [ ] Rate limiting on `/api/estimate`
- [ ] Image validation server-side (MIME sniff, size limit, NSFW)
- [ ] Lighthouse audit → 95+ on perf, a11y, SEO
- [ ] Mobile real-device QA (iOS Safari, Android Chrome)
- [ ] Stripe live mode activation

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
# 1. Check if market analysis subagent has landed (was re-dispatched ~30min ago)
ls -la docs/MARKET_ANALYSIS.md 2>/dev/null && wc -l docs/MARKET_ANALYSIS.md
# 2. If yes, write docs/BUSINESS_PLAN.md from it (pricing tiers, unit econ, $1k MRR path)
# 3. Update landing page with real Pro pricing
# 4. Begin Phase 2 — Supabase auth + Postgres schema (or Clerk if Supabase setup is heavy)
# 5. Add /api/meals endpoint that the client uses once authenticated
```