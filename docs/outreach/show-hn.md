# Show HN draft

**Title:** Show HN: Calora – AI meal scanner, snap a plate, get calories in 5s

**URL to share:** https://calora.develalfy.me

---

## Post body

Hi HN,

I built Calora because calorie tracking apps have a 30-second minimum log time, which is why 70% of new users churn in week 1.

**What it does:** Snap a photo of your plate or type "2 scrambled eggs with toast" and the AI returns calories + protein/carbs/fat in ~5 seconds. Edit any item before saving. Free tier: 5 scans/day. Pro: $4.99/mo or $29.99/yr (unlimited + cross-device sync).

**Stack:**
- Next.js 16 (App Router, Turbopack)
- HMAC-signed session cookies (file-based user store, no DB)
- MiniMax M3 multimodal model via OpenRouter for the estimate
- React + DaisyUI-style design tokens, PWA installable

**Try it without signup:** https://calora.develalfy.me/try
**Live API demo (paste this in any HTML page):** https://calora.develalfy.me/embed

Three things that took longer than expected:

1. **MiniMax M3 reasoning models leak their chain-of-thought into the response.** I had to write a JSON extractor that strips everything after the last `</think>` tag AND walks balanced braces. The regex-only version ate valid responses 15% of the time.
2. **Auth was the bug I almost shipped.** Pre-auth the AI spend was eating me. Gated /api/estimate behind session check on day 4, before the rate limiter, so anon traffic costs me zero.
3. **File-backed user store** because I don't have a Postgres license and the deployment is a 1GB Dokploy container. Works fine for the size I'm at. Migration path to Postgres is documented in `lib/users.ts`.

**What's next:** B2B API for fitness/coaching/wellness apps (`/api/demo-estimate` is the public rate-limited demo, `/b2b` is the pitch). One fitness app integrated at 5k estimates/mo = $500/mo.

I'm not collecting emails to "validate demand". The thing works, you can try it in 5 seconds without signing up. If it breaks, please file it on the `/embed` page (those are issues I read).

— Ashraf (ashraf@develalfy.me)

---

## Submit timing

- **Best day:** Tuesday or Wednesday, 9-11am US Eastern time
- **Avoid:** Mondays (HN front page is from weekend), Fridays (people leave)
- **Post count target:** 1 launch HN + 1 "Show HN: Update" at month 2 if there's something substantive to show

## What to expect

- Typical Show HN: top 50 (if solid) → top 5 (if amazing)
- Comment volume: 50-500 in first 24 hours
- Useful comments will exist; ignore the "why not use Y" crowd (they'll use Y, you can't change that)
- Be in the comments for the first 6 hours personally, answering specific technical questions

## If asked about pricing

- "I'm underpricing intentionally for the first 100 subs; the lifetime grandfathering in the FAQ is real"
- "B2B at $0.10/estimate or $500/mo flat is the actual revenue goal, not consumer"
- "I'm not running this as a VC-funded thing; it's solo, and the unit economics work at $5/mo"

## Spam signal to avoid

- Don't promise "AI works 99% of the time" — say "~85-90% with a confidence flag" (real number)
- Don't fabricate testimonials
- Don't compare to "Crushing it!" MyFitnessPal — let the demo speak
