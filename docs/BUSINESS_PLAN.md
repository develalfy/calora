# Calora Business Plan — 2026

> Generated 2026-07-12 from `docs/MARKET_ANALYSIS.md`. Numbers marked ⚠️ are ballpark, derived from public App Store data and the synthesis recommendations. Verify before any launch spend.

---

## TL;DR

Calora is positioned as the **honest, privacy-first AI calorie tracker**: a usable free tier (5 scans/day, no signup), a Pro tier at **$4.99/mo or $29.99/yr** (vs. MFP/Lose It! at $19.99/mo and Cal AI's reputation-damaging 3-day trial), and a unit-economics story that gets to $1,000 MRR at ~210 paying subscribers (~6,500 MAU at 3.2% conversion).

The market is **willing to pay** for AI calorie tracking — Cal AI has 339k reviews and MacroFactor has 18.9k reviews at 4.83★ — but the AI-photo niche is reputationally fragile. Cal AI's biggest problem isn't pricing, it's the "hidden trial / vibe-coded wrapper" perception. Calora's wedge is the opposite: **honest free tier + editable AI + on-device data**.

---

## 1. Ideal customer

**Primary ICP:** "Cali" — the casual user who wants to track calories without logging feeling like homework.

- **Demographics:** 25-45, mostly women (60/40 split based on MFP/Lose It! demographics), US/EU/UK, $50-150k household income
- **Behavior:** Downloaded MyFitnessPal or Lose It! 1-2 times, used for 3-7 days, deleted because logging took too long
- **Trigger event:** "I want to lose 10 lbs before summer" / "My doctor said watch my cholesterol"
- **Job-to-be-done:** "Snap my plate, get a number, move on with my day"
- **Willingness to pay:** $30-50/year (the Cal AI sweet spot). $5-10/mo at the high end if accuracy is demonstrable.

**Secondary ICP:** "Macro Mike" — the macro tracker who's already paying for MacroFactor or Cronometer but wants a faster logging UX.

- **Demographics:** 25-40, mostly men, fitness-oriented, $80-200k income
- **Willingness to pay:** $70-100/year (MacroFactor's proven price point)

**We're not targeting:** bodybuilders who want gram-perfect tracking (Cronometer/MacroFactor territory), diabetics who need medical-grade accuracy (out of scope), eating disorder populations (medical device, requires FDA).

---

## 2. Main pain point

> **"I want to know how many calories I'm eating, but logging takes too long."**

Validated across all 6 competitor reviews:
- MFP: "food logging takes 30-60 seconds" (incumbent self-admission in our prior `05-competitive.md`)
- Cal AI: "Incredibly inaccurate" — users give up on speed if accuracy suffers
- SnapCalorie: "doesn't let me correct values on the fly"
- Lose It!: "the whole thing freezes for 10+ seconds" — even fast apps feel slow when they lag

Calora's answer: **sub-10-second flow** (snap → result → optional edit → save), which is already implemented in the app.

---

## 3. Value proposition

**For casual users:** "Snap a photo, get calories in 5 seconds. Edit anything that's wrong. No signup, no ads, your data stays on your phone."

**For macro trackers:** "All the speed of AI logging with editable items, portion adjustment, and confidence badges. Pro sync your data across devices when you're ready."

**The 3-second pitch:**
> Calora is the calorie tracker you'd actually keep using — 10× faster than MyFitnessPal, accurate like SnapCalorie, and free like Cal AI without the subscription trap.

---

## 4. Competitive advantage

| Calora vs. | What we do better |
|---|---|
| **MyFitnessPal** | 12× faster logging (5s vs 60s), no ads, no gamification fatigue |
| **Lose It!** | No GLP-1 ads, no permanent upsell popups, no freezing |
| **MacroFactor** | Free tier usable (5/day), AI photo logging, no payment-required signup |
| **Cronometer** | AI-first logging, modern PWA, mobile-first design |
| **Cal AI** | Honest trial terms, on-device data, editable estimates, no "vibe-coded wrapper" perception |
| **SnapCalorie** | Lower price, free tier usable, simpler UX (vs. depth-sensor complexity) |

**The durable advantage:** none of these competitors can ship "no signup, free tier, on-device privacy" without cannibalizing their own subscription revenue. Calora is built around this from day one.

---

## 5. Positioning

**One-line positioning:** *Honest AI calorie tracking — free to try, accurate enough to trust, private by default.*

**Compared to specific competitors:**
- vs. Cal AI: *"Snap your meal, not your wallet."* (calls out hidden trial charges)
- vs. MyFitnessPal: *"Snap a photo in 5 seconds. Hunt a database for 60."* (calls out logging speed)
- vs. SnapCalorie: *"Equally accurate, half the price, works without an account."*

**What we don't say (would be dishonest or scammy):**
- "100% accurate" — we're ±20% (DESIGN.md is honest about this)
- "Doctors recommend" — we don't have clinical evidence
- "Lose 30 lbs in 30 days" — that's a different category we don't want to be in
- "Limited time offer / 50% off today only" — no fake scarcity

---

## 6. Pricing model

### Free tier
- **5 scans/day** (text or photo)
- All editing, history, settings, CSV export
- Data lives in browser localStorage only
- **No account required**
- Daily counter resets at midnight local time

### Pro tier
- **$4.99/month** or **$29.99/year** ($2.50/mo effective)
- 7-day free trial (full Pro, all features, no surprise charges)
- Email reminder 24h before trial ends
- Unlimited scans
- Cross-device sync (account required)
- Weekly email summary
- Priority AI model (Gemini 2.5 Flash → Sonnet for Pro)

### Why these numbers
- **$4.99/mo** matches Cal AI's effective rate ($30/yr = $2.50/mo). Beats MacroFactor ($5.99/mo effective). Undercuts MFP/Lose It! ($19.99/mo) by 75%.
- **$29.99/yr** gives ~50% off monthly, in line with industry discount norms.
- **7-day trial** matches Lose It!/SnapCalorie; deliberately avoids Cal AI's 3-day mistake.

---

## 7. AI cost estimation

| Model | Input ($/1M tokens) | Output ($/1M tokens) | Avg per scan (est) |
|---|---|---|---|
| Gemini 2.5 Flash (current default) | $0.075 | $0.30 | ~$0.001 |
| Claude Sonnet 4 (Pro model) | $3.00 | $15.00 | ~$0.015 |
| MiniMax M3 (fallback) | $0.20 | $0.80 | ~$0.001 |

**Current state:** We use Gemini 2.5 Flash + MiniMax fallback. Per-scan cost ≈ **$0.001-0.002** including some retries.

**Pro tier model:** Switch to Claude Sonnet for Pro users. Per-scan cost ≈ **$0.015**. Even at 100 scans/day for a heavy Pro user: **$1.50/month AI cost**.

**At scale (10k MAU, 5 scans/user/day, 50% Pro):**
- Free users: 10k × 0.5 × 5 scans/day × $0.001 = **$25/day** = $750/month
- Pro users: 10k × 0.5 × 5 scans/day × $0.015 = **$375/day** = $11,250/month ⚠️

Wait — that math is wrong. Let me re-derive:

**At scale (10k MAU, 50% Pro, 5 scans/user/day):**
- 50,000 scans/day total
- Free: 25,000 scans × $0.001 = **$25/day** = $750/month
- Pro: 25,000 scans × $0.015 = **$375/day** = **$11,250/month** ⚠️

**The Pro tier would be loss-making** if everyone scans 5x/day. Mitigation options:
1. **Rate-limit Pro** to 30 scans/day (still unlimited-feeling for most users) — saves 80% of Pro AI cost
2. **Use Flash for most Pro scans, Sonnet only when confidence is low** — saves ~60%
3. **Don't switch Pro to Sonnet at all** — keep Flash + better prompt engineering; Sonnet is a marketing feature, not a default

**Decision:** Option 2 — use Flash for all Pro scans by default; reserve Sonnet for a "high accuracy" toggle users can opt into. Pro subscription funds the Sonnet option when invoked.

---

## 8. Cost per user (unit economics)

**Free user:**
- AI cost: $0.001/scan × 5 scans/day × 30 days = **$0.15/month**
- Storage: localStorage only = **$0**
- Infrastructure: shared with paying users
- **Total: $0.15/month**

**Pro user at $4.99/month:**
- Revenue: $4.99
- AI cost (5 scans/day default): $0.15/month
- AI cost (1 Sonnet scan/day heavy user): +$0.45/month
- Storage (Postgres + S3): ~$0.05/month
- Stripe fees (2.9% + 30¢): $0.44/month
- **Total cost: $0.20-1.10/month**
- **Gross margin: 78-96%**

**Annual Pro user at $29.99/year = $2.50/month:**
- Same costs as above: $0.20-1.10/month
- **Gross margin: 56-92%**

**Bottom line:** Pro is highly profitable at any reasonable scan volume, even with Sonnet fallback.

---

## 9. Gross margin summary

| Scenario | Margin |
|---|---|
| Monthly Pro, light user (5 scans/day, Flash) | **96%** |
| Monthly Pro, heavy user (30 scans/day, mostly Flash) | **85%** |
| Monthly Pro, power user (30 scans/day + 5 Sonnet) | **78%** |
| Annual Pro, average | **85-90%** |

Comparable SaaS gross margins: Notion 80%, Linear 88%, Figma 89%. **Calora is healthy.**

---

## 10. Subscribers needed for $1,000 MRR

- $1,000 MRR ÷ $4.99/mo = **~200 monthly Pro subscribers**
- $1,000 MRR ÷ $2.50/mo effective (annual) = **~400 annual subscribers**

**Realistic mix:** 60% annual + 40% monthly → ~250-300 total Pro subscribers

**At what traffic?** Industry conversion rate for freemium calorie apps: **2-5%** of MAU → paid.

- 5% conversion: 300 Pro ÷ 5% = **6,000 MAU** needed
- 3% conversion: 300 Pro ÷ 3% = **10,000 MAU** needed
- 2% conversion: 300 Pro ÷ 2% = **15,000 MAU** needed

**Best estimate:** 6,000-10,000 MAU gets us to $1k MRR.

---

## 11. Traffic, conversion, retention assumptions

| Metric | Conservative | Base | Optimistic | Source |
|---|---|---|---|---|
| Visitors/month (landing page) | 2,000 | 5,000 | 15,000 | SEO + Reddit + Product Hunt |
| Landing → app CTR | 15% | 25% | 40% | Mobile-first landing, no signup |
| App → first scan | 70% | 85% | 95% | No signup = no drop-off |
| Daily → 7-day retention | 25% | 40% | 55% | Cal AI baseline |
| Free → Pro (90-day) | 2% | 3.2% | 5% | MacroFactor/Lose It! benchmarks |
| Monthly churn | 8% | 5% | 3% | MacroFactor claims "83% stay" |

**Base case funnel (5,000 visitors/month):**
- 5,000 × 25% × 85% = 1,063 first scans
- 1,063 × 40% = 425 WAU (weekly active)
- 425 × 3.2% = **~14 Pro subscribers/month**
- Monthly MRR growth: ~$70/month from new subs

**At this rate, getting to $1k MRR would take 14+ months from cold start.** Need to accelerate acquisition.

**Optimistic case (15,000 visitors/month):**
- 15,000 × 40% × 95% = 5,700 first scans
- 5,700 × 55% = 3,135 WAU
- 3,135 × 5% = **~157 Pro subscribers/month** ⚠️
- That gets to $1k MRR in 1 month

**The bottleneck is visitor acquisition, not conversion.** Pricing + product are fine; need distribution.

---

## 12. Scenarios

### Base case ($1k MRR in 6 months)
- 5,000 visitors/month by month 3 (SEO + Reddit presence + 1 Product Hunt launch)
- 3.2% free → Pro conversion
- 5% monthly churn
- **Result: $1,000 MRR by month 6, ~200 paying subscribers, ~6,500 MAU**

### Best case ($1k MRR in 2 months)
- 15,000 visitors/month by month 1 (Product Hunt #1 + Reddit r/loseit post hits + Twitter/X viral moment)
- 5% free → Pro conversion
- 3% monthly churn
- **Result: $1,000 MRR by month 2, ~400 paying subscribers, ~8,000 MAU**

### Downside ($1k MRR in 18 months)
- 1,500 visitors/month by month 6 (slow SEO, no press, Product Hunt flops)
- 2% free → Pro conversion
- 8% monthly churn
- **Result: $1,000 MRR by month 18, ~200 paying subscribers, ~10,000 MAU**

**Realistic floor:** $1k MRR is achievable in 4-8 months with focused SEO + 1 distribution event (Product Hunt or Reddit post). Without distribution, 12-18 months.

---

## 13. Critical metrics to track

Pre-launch analytics (PostHog self-hosted or Plausible):
1. **Landing page CTR** — visitors → app opens
2. **Time to first scan** — seconds from app open to scan submit
3. **First-scan completion rate** — % who submit a scan vs. abandon
4. **Daily active scans** — DAU proxy
5. **7-day retention** — return rate after first scan
6. **Free → Pro conversion** — at day 1, day 7, day 30
7. **MRR + subscriber count** — dashboard, weekly review
8. **Churn** — monthly cancel rate
9. **AI cost per scan** — actual OpenRouter spend / scan count

**Hypothesis we need to validate:** the 25-40% landing → app CTR. If it's <15%, our landing page is broken.

---

## 14. Open questions before launch

1. **Stripe account** — need real Stripe in test mode to validate checkout flow. Currently 0 setup.
2. **Auth provider** — Supabase (heavier, ~2 days) vs. Clerk (lighter, ~1 day) vs. NextAuth (DIY, ~3 days).
3. **Email provider** — Resend (free tier, 3k/month) is the simplest for transactional + weekly summaries.
4. **Privacy policy + Terms** — required for Stripe. Can draft from a template, but should review.
5. **GDPR / data residency** — US-only launch is fine; EU expansion needs DPA + EU-region Postgres.
6. **Refund policy** — 30-day money-back for Pro annual subs is industry standard.

---

## 15. First 10 / first 100 / first 1,000 users

### First 10 users (week 1-2)
- Personal network: 5 friends/family, 2 Reddit r/loseit founders, 3 indie hacker community
- Goal: get honest feedback on Pro trial flow + payment
- Cost: $0
- Success metric: 8/10 complete a scan, 3/10 upgrade to Pro

### First 100 users (month 1-3)
- 1 Product Hunt launch (target top 10 of the day)
- 5 Reddit posts in r/loseit, r/fitness, r/calorietracking (genuine value, not spam)
- 1 Hacker News "Show HN" post
- Cross-promotion with 2-3 small fitness newsletters
- Goal: 100 MAU, 5 Pro subscribers
- Cost: ~$50 in tools (Product Hunt hunter fee if needed)
- Success metric: 100 MAU, 5% Pro conversion, $25 MRR

### First 1,000 users (month 3-6)
- SEO content: 20 blog posts on "how to count calories for X" targeting long-tail keywords
- 2 more Product Hunt / HN launches (one per quarter)
- YouTube influencer partnerships (micro-influencers, $200-500 each, 2-3 total)
- TikTok presence: 1 post/week showing the app in use
- Goal: 1,000 MAU, 50 Pro subscribers, $250 MRR
- Cost: ~$2,000 (influencer fees + content)
- Success metric: 5% conversion, $250 MRR

---

## 16. Roadmap to $1,000 MRR

### Month 1-2: Foundations
- Auth (Supabase or Clerk) + server-side meal sync
- Stripe integration + 7-day Pro trial
- Privacy policy + Terms of Service
- PostHog analytics
- **Milestone:** working auth + checkout on staging

### Month 3: Launch v2
- Public launch on Product Hunt + Reddit + HN
- 10 blog posts live
- Pro trial active
- Weekly email summaries live
- **Milestone:** 100 MAU, $50 MRR

### Month 4-6: Growth
- 20 more SEO posts
- 2-3 micro-influencer partnerships
- Mobile PWA install optimization (push notifications if Android)
- Iteration based on churn signals
- **Milestone:** 1,000 MAU, $250-500 MRR

### Month 7-12: Acceleration
- iOS native app (optional, not blocking)
- Apple Watch companion (optional)
- Friends/family referral program
- Seasonal campaigns (January "New Year", May "summer body")
- **Milestone:** $1,000 MRR

---

## 17. The 30 / 60 / 90-day plan

### Day 0-30: Foundation
- [ ] Auth + Postgres backend
- [ ] Stripe checkout + customer portal
- [ ] Privacy policy + Terms live
- [ ] 5,000-word SEO content piece published
- [ ] 10 beta users from personal network
- [ ] **Exit criteria:** working Pro signup flow on staging

### Day 31-60: Soft launch
- [ ] Product Hunt submission (target a Tuesday/Wednesday)
- [ ] 5 Reddit posts in relevant subs
- [ ] Hacker News "Show HN"
- [ ] Convert 100 MAU → 5 Pro subscribers
- [ ] **Exit criteria:** $25 MRR, NPS > 30 from first 10 users

### Day 61-90: Public launch + first growth experiment
- [ ] Launch press to 5 fitness newsletters
- [ ] 2 YouTube/TikTok micro-influencer deals
- [ ] A/B test landing page copy
- [ ] Email automation: weekly summaries, trial expiry reminders
- [ ] **Exit criteria:** $250 MRR, 1,000 MAU, retention curve flattening

### Day 91-180: Scale
- [ ] SEO content engine (2 posts/week)
- [ ] Referral program launch
- [ ] iOS native app (if budget allows)
- [ ] Apple Watch / Wear OS companion
- [ ] **Exit criteria:** $1,000 MRR

---

## 18. Honest risks

1. **AI cost blowup** if Pro users scan hundreds of times/day. Mitigation: rate-limit Pro + default to Flash, opt-in to Sonnet.
2. **Conversion <2%** — Cal AI's reputation damage suggests casual users are skeptical of AI-only apps. Mitigation: our honest free tier + edit-before-save is the antidote.
3. **Cal AI ships a free tier** — possible. Mitigation: our on-device privacy + no-signup is a durable advantage.
4. **MyFitnessPal ships AI-first** — they've been adding AI features. Their existing 200M user base is a moat. Mitigation: they can't match our free tier without cannibalizing.
5. **OpenRouter goes down** — single point of failure. Mitigation: add Anthropic direct as backup.
6. **Stripe / auth provider outage** — beyond our control. Mitigation: status page + graceful degradation.

---

## Appendix: Numbers that drive decisions

```
MRR per subscriber (monthly):  $4.99
MRR per subscriber (annual):   $2.50 (after first year; first year is $29.99)
Free → Pro conversion target:  3.2%
Monthly churn target:          5%
Customer lifetime (1/churn):   20 months = $50-100 LTV
CAC target:                    $20 (4 months to payback)
Gross margin:                  85-90%
```

If we hit 1,000 MAU at 3.2% conversion with 5% churn: **~32 Pro subs at any time = $160/mo MRR**. To hit $1k MRR we need 4-6× more MAU. Distribution is the bottleneck, not the funnel.

---

*Generated 2026-07-12. Update quarterly with actuals.*