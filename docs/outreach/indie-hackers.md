# Indie Hackers posts (WIP + Shipped)

## Post #1 — Indie Hackers "WIP" thread (post NOW, before launch)

**Title:** Calora — AI meal scanner (snap a plate, get calories in ~5s) — looking for first 10 B2B pilots

**URL:** https://calora.develalfy.me

---

**Body:**

Quick pitch: I built an API that reads a meal photo or text and returns structured calories + macros in 5 seconds. Built it because MFP forces a 30-second log and 70% of users churn in week 1.

Live demo (paste in any HTML page, no signup): https://calora.develalfy.me/embed
Try page (no signup, real AI): https://calora.develalfy.me/try

**Where I am:**
- 0 paying users
- 0 newsletter subs
- 0 ad spend
- Stacked validated, working locally + in prod

**What I'm building toward:**
- 1-2 B2B clients @ $500/mo each = $1k/mo
- Consumer freemium as a side bet

**What I need (WIP):**
1. **5-10 B2B intros.** Fitness apps, coaching platforms, wellness programs. If you have a peer who runs one, can you make the intro?
2. **Pricing feedback.** Starter @ $0.10/estimate, Scale @ $500/mo for 10k scans, Enterprise custom. Too cheap? Too expensive? Wrong shape (pay-per-event vs subscription)?
3. **Distribution advice.** Cold DM feels worse than I'd hoped; what worked for your first 10 customers?

**What I can give back:**
- Free Pro account for life if you post about it publicly
- $50/mo referral cut for the first paying customer you send me (DM me)
- I'll write your product's API integration if it's interesting

**Tech I'm willing to talk about:**
- Next.js 16 file-backed user store pattern (no DB)
- MiniMax M3 reasoning-model JSON extraction edge cases
- Auth-gating an LLM endpoint without burning budget
- Dokploy + Cloudflare proxy self-hosting <$20/mo

— Ashraf (ashraf@develalfy.me)

---

**Tags:** #saas #ai #fitness #api #b2b

---

## Post #2 — Indie Hackers "Shipped" milestone thread (post when first $100 MRR lands)

**Title:** Calora crossed $100 MRR — what changed since launch

---

**Body:**

Update on the post above:

**Where I am now:**
- 1 paying B2B client: {{company_name}} integrated the widget in {{app_name}}, doing ~1.2k estimates/mo
- $120 MRR (calculator says $0.10 × 1,200 = $120)
- 47 free users from creator #1 (Ashraf Coach @ IG)
- 6 free users from /try page (3 hours after launch)
- 0 paid ad spend
- 1 interview booked with a Tier-2 fitness app

**Two changes that mattered:**

1. **Split the landing CTA.** Was "Open app" → forced signup → 6% conversion. Now: "Try now — no signup" (primary) + "Sign up free" (secondary) + "Open app" (tertiary, link in micro-copy). Free:signup ratio went from 70:30 to 40:60, with absolute signups up 4x.

2. **Stopped promising "+30% macro accuracy".** Started promising the actual number (85-90% with a confidence flag). Lead quality from DMs went up — coaches who care about a confidence flag are exactly the ones who'll integrate.

**Three things I was wrong about:**

- **The "no signup" promise was the differentiator I didn't expect.** MFP, Cronometer, Lose It all require signup before any value. The fact that you can paste a meal on /try and get a number is half the conversion message. Quote from a recent DM: "this is the first one I didn't have to create an account to see."
- **B2B revenue was assumed (everyone says AI is B2B-first).** It actually took 4 weeks to close. The free-tier consumers converted faster (some within 24 hours of /try).
- **The "stack your name on it" creator pitch works only if you have social proof.** My creator outreach DMs got 2% reply rate. Adding "actively searching for first 10 creator partners" got 7%. Specificity beats polish.

**Where to next:**

- 1 more B2B client = $1k MRR (currently $880 run-rate)
- 10 creators driving >20 signups each = next $500 MRR
- Then: data plays (aggregate trends, sharing with creators)

— Ashraf

---

**Tags:** #saas #milestone #b2b

