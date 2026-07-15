# AI Tool Directory Submissions

**Why this matters:** Each directory submission gives Calora a backlink + a discoverable page for people searching "AI calorie tracker", "AI food scanner", "AI meal log". SEO compounds over months. Most directories accept submissions in < 1 day.

---

## Submission copy (use the EXACT same description everywhere unless they require a different length)

### Short (200 chars, for directories with tight limits)

> AI meal tracker. Snap a photo or type "2 eggs and toast" — get calories + macros in 5 seconds. Free tier, no signup to try, embeddable API for B2B.

### Medium (500 chars)

> Calora reads your meal photo or text description and returns structured calories + protein/carbs/fat in ~5 seconds. Built for the 70% of MFP users who churn in week 1 because the log takes too long.

> Free to try without signup. Free tier: 5 scans/day, 1 device. Pro: $4.99/mo for unlimited + cloud sync across devices + weekly streak digest.

> The same AI is available as a REST API for fitness apps, coaching platforms, wellness programs — $0.10/estimate or $500/mo flat for 10k scans. Live embed demo at calora.develalfy.me/embed.

### Long (1500+ chars)

> Calora is an AI-powered meal calorie and macro tracker that reads a meal photo or text description and returns structured calories + protein/carbs/fat in about 5 seconds.

> **Why it exists:** existing calorie trackers force a 30+ second flow: open app, search database, weight portion, save. This is the #1 reason 70% of new MyFitnessPal / Lose It / Cronometer users churn in week 1. Calora exists to make logging fast enough that you'll actually keep doing it.

> **What it does:**
> - Photo or text input: snap a plate, type "2 scrambled eggs with toast", describe a restaurant meal
> - AI returns itemized breakdown with confidence flag (high / medium / low)
> - Edit any item or portion before saving
> - Daily totals: calories, protein, carbs, fat
> - Weekly streak counter
> - CSV export of full log
> - History view by day

> **Pricing:**
> - Free: 5 scans/day, local-only log (privacy by default)
> - Pro: $4.99/mo or $29.99/yr, unlimited scans + cloud sync across devices + weekly summary email
> - B2B API: $0.10/estimate or $500/mo for 10k scans, white-label

> **Tech:** Next.js 16, MiniMax M3 multimodal model via OpenRouter, file-backed user store, HMAC-signed cookies, PWA-installable.

---

## Directories to submit to (in order of SEO/direct traffic value)

### Tier 1 (highest ROI — submit within 24 hours)

| Directory | Submission URL | Form time | Notes |
|---|---|---|---|
| **ProductHunt** | https://www.producthunt.com/posts/new | 30 min | Don't "submit" without a launch day. Schedule a "Ship Sunday" — Monday morning PT launch. Hunter needs to be your account. Ask a friend to be the hunter if you have one. |
| **There's An AI For That** | https://theresanaiforthat.com/submit | 15 min | Most-visited AI tool directory. Submit with "Calorie Tracking" + "Health" tags. |
| **AI Tool Hunt** | https://aitoolhunt.com/submit-tool | 15 min | Smaller but high-quality. Submit under "Health" category. |
| **Futurepedia** | https://www.futurepedia.io/submit-a-tool | 15 min | SEO-friendly AI directory. |

### Tier 2 (within week 1)

| Directory | URL |
|---|---|
| **There's An AI For That (duplicate)** — actually no, just once | — |
| **AI Product Finder** | https://chatgptproductlist.com/submit |
| **OpenAI Marketplace listing** | https://openai.com/product (not a marketplace, but good backlink) |
| **Productivity Directory** | https://www.productivity.directory/submit |
| **TopAI.tools** | https://topai.tools/submit |
| **AI Tools Wiki** | https://aitoolswiki.com/submit |

### Tier 3 (SEO directories — submit when you've got time)

| Directory | URL |
|---|---|
| **AlternativeTo** | https://alternativeto.net/add |
| **Slant** | https://www.slant.co/ (write a "Best Calorie Tracker" comparison post) |
| **SourceForge** | https://sourceforge.net/software/create |
| **GetApp** | https://www.getapp.com/ |
| **Capterra** | https://www.capterra.com/vendors/sign-up |
| **G2** | https://www.g2.com/products/new |

---

## Submission checklist (per directory)

- [ ] Pick the right **category** (Health, Fitness, AI, Productivity — varies by directory)
- [ ] Use the **short description** in the tagline field
- [ ] Use the **medium description** in the long description field
- [ ] Use **calora.develalfy.me** as the URL (not calora.develalfy.me/try — that one is for conversion, the root is for backlinks)
- [ ] **Logo:** 512×512 minimum, transparent PNG (currently using a hex-color square in CSS — needs an actual logo if you have one or can generate one with image_generate)
- [ ] **Screenshots:** 3 screenshots minimum
  1. Landing page hero (calora.develalfy.me)
  2. /try with a result showing
  3. /embed with a snippet
- [ ] **Pricing** field: $0 / $4.99/mo / $29.99/yr
- [ ] **Tags / keywords:** "calorie tracker", "AI meal scanner", "macro tracker", "fitness AI", "nutrition AI"

---

## SEO backlinks to chase (within 30 days)

Directories give domain authority. Specific to your niche:

1. Submit to every AI tool directory in Tier 1-3 above
2. Write 5 articles on Medium / dev.to / Hashnode linking back to calora.develalfy.me:
   - "I built a calorie tracker that doesn't make users sign up first"
   - "How I extract JSON from reasoning models"
   - "OpenRouter vs direct MiniMax: a 6-month comparison"
   - "Why I'm underpricing at $4.99/mo (and when I'll raise it)"
   - "The calorie tracker market is wide open"
3. Indie Hackers "WIP" + "Shipped" posts (see indie-hackers.md)
4. Show HN (see show-hn.md)
5. Reply to every calorie-tracker discussion on r/loseit, r/fitness, r/xxfitness, r/bodyweightfitness with **a helpful answer + one mention** of Calora, never spam
6. Submit to Hacker News "Launch HN" thread comments during work hours

---

## Tracking the impact

Set up a UTM for each directory submission:

- ?utm_source=producthunt&utm_medium=directory
- ?utm_source=aitoolhunt&utm_medium=directory
- ?utm_source=theresanaiforthat&utm_medium=directory

You already have analytics for `try_view`, `try_estimate_complete`, `try_to_signup`. Track which source → signup conversion rate is highest. Double down on the channels with the best economics.
