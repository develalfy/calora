# Calora — Social Posts

## Twitter/X — Launch thread (post on a Tuesday 9-11am US Eastern)

---

**Tweet 1:**

I built a calorie tracker you can use without signing up.

Try it: calora.develalfy.me/try

(Yes, you read that right. Type a meal, get calories. No email.)

🧵 how it works + why

---

**Tweet 2:**

The 70% week-1 churn rate on MFP isn't because logging is hard.

It's because logging takes 30 seconds per meal, 3 times a day, for a year.

Every calorie tracker in the store is the same UI: open app → search → weight → save.

What if the log took 5 seconds instead?

---

**Tweet 3:**

So I built one.

AI reads the plate (or the text), returns structured calories + protein/carbs/fat in ~5 seconds.

Free to try, no signup. Free tier: 5 scans/day.

calora.develalfy.me/try

---

**Tweet 4:**

The hard part wasn't the AI (got 85-90% accuracy on common plates).

The hard part was making sure people could SEE the AI work before creating an account.

The /try page exists exactly because of this — value first, signup second.

---

**Tweet 5:**

Also shipped:

→ /embed for fitness/coaching apps that want to use the AI in their stack
→ ?ref= attribution for creator programs
→ free Pro account for the first 100 subscribers (lifetime grandfathered)

B2B API is $0.10/estimate or $500/mo flat. Live demo at /b2b.

---

**Tweet 6:**

If you run a fitness app, a coaching platform, or a wellness program and your users complain about the meal log step — DM me.

I'll send a 5-min demo link and pricing.

---

**Reply-target hashtags:**
#buildinpublic #ai #fitness #saas #indiehacker

---

## LinkedIn post (for B2B audience)

---

I built a small API for fitness/coaching/wellness apps whose users complain about the meal log.

→ 5-second response, photo or text
→ USDA-grounded estimates with confidence flag
→ $0.10/estimate or $500/mo flat for 10k scans
→ No code-on-your-side other than a fetch call

If calorie tracking is the bottleneck in your retention flow, this might save you a quarter of engineering.

Live demo: calora.develalfy.me/embed

---

## Reddit posts (DO NOT spam — these are real engagement posts)

### r/loseit — "I built an AI calorie tracker, here's what I learned"

> Title: I built a calorie tracker over the last 8 weeks, here's what surprised me
>
> Body:
>
> I'm a solo dev, not a nutritionist. I built Calora (an AI meal-photo-text-to-calories API) and I thought you might find the data interesting.
>
> **Most surprising finding:** the difference between "log via barcode" and "log via AI photo" is way bigger than I expected. My AI gets ~85% accuracy on common plates, but the user experience is so much faster that users log 4x more meals in week 1 vs. MFP (small sample, n=12, but consistent).
>
> **What didn't surprise me:** people still want to KNOW the calorie number, not just have an app tell them they "ate too much today". Even with fast AI, the log is informational, not motivational.
>
> **Try it if you want:** calora.develalfy.me/try — no signup, paste a meal description, get calories in 5 seconds. If you want to try a photo you need a free account.
>
> Happy to answer any technical questions. Particularly interested in feedback from people who actually use MFP/Cronometer — am I missing something obvious?

---

### r/fitness — "API for fitness apps: what's the actual blocker for you to integrate?"

> Title: Dev here: I built an AI meal-scan API for fitness apps. What's the real reason you don't just call one?
>
> Body:
>
> I run a small calorie-tracking API. Response in 5s, ~$0.10/call, drop-in REST. Live demo at calora.develalfy.me/embed.
>
> I've been pitching 5-10 fitness app founders a week and the same objections come up:
>
> 1. "We already use MFP API" — but their API is unreliable
> 2. "Our users don't want to scan meals" — but they don't, they want the log to be FAST
> 3. "Privacy concerns" — but the data goes to YOUR backend, not mine
>
> What's the *actual* blocker for you to evaluate something like this? Is it:
> a) Legal/contracts timeline
> b) Engineering bandwidth
> c) Already have something working
> d) Don't trust AI accuracy
> e) Something else
>
> Asking seriously — I'll show you my code.

---

## What NOT to do

- **Don't** drop "I built an AI calorie tracker" links into r/loseit or r/fitness unsolicited. Karma cost > conversion benefit.
- **Don't** run paid Twitter ads for the consumer product. CPCs are $1.50+ for "calorie tracker" keywords and the LTV isn't there yet.
- **Don't** reply to criticism of the AI accuracy defensively. Acknowledge, note in changelog if it's a model change, move on.
- **Don't** post the same content to every channel. Each platform has its own voice. LinkedIn wants 3-paragraph posts. Twitter wants threads. Reddit wants conversations.

---

## Metrics to track (post-launch)

Set up UTM parameters on every link you share:

| Channel | UTM |
|---|---|
| Twitter | ?utm_source=twitter |
| LinkedIn | ?utm_source=linkedin |
| HN | ?utm_source=hackernews |
| Reddit | ?utm_source=reddit&post=r-loseit-{slug} |
| ProductHunt | ?utm_source=producthunt |

Compare against `/api/metrics` counters and `try_view` / `try_estimate_complete` / `try_to_signup` events to see which social channel converts best.

The event taxonomy is already wired (committed in `5ecc92c` + `8558335`).
