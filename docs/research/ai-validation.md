# AI Validation — Claude Sonnet 4 on Calorie Estimation

**Date:** 2026-07-10
**Model tested:** `anthropic/claude-sonnet-4` via OpenRouter
**Test goal:** Confirm the AI can return structured JSON calorie estimates from text and from photos, and measure cost/latency.

## TL;DR

✅ **Architecture works.** Both text and vision paths return valid JSON in the right schema every time.

⚠️ **Vision accuracy is unclear from this test.** I burned a few requests on Unsplash photos whose content didn't match my labels, so I can't make confident claims about visual accuracy. The one clear test (Big Mac = 1028 kcal, which is in the right ballpark for a loaded double cheeseburger with sides) was OK.

✅ **Cost is way under projection.** ~$0.30/user/month for text, ~$0.80/user/month for vision. Both well under the $3.70/user/month in the tech-stack doc.

✅ **Latency is acceptable.** ~5 seconds for vision, ~2s for text. Under the 10-second target in MVP scope.

---

## Test 1: Text-only estimation

5/5 returned valid JSON in the exact schema requested. No parser fallbacks needed.

| Input | AI total | Confidence | Notes |
|---|---|---|---|
| 2 scrambled eggs with butter on toast | 440 kcal | high | assumes 1 tbsp butter, 1 slice toast |
| chicken breast 150g with rice and broccoli | 403 kcal | medium | assumes 1 cup rice |
| banana + glass of orange juice | 217 kcal | high | |
| big mac + large fries | 1073 kcal | high | |
| caesar salad + grilled chicken | 470 kcal | medium | dressing estimated |

**Cost:** $0.0164 for 5 requests = ~$0.003 each
**Latency:** ~2s per request

**Projected per user/month (3 meals/day):** ~$0.30

## Test 2: Vision estimation

6 photos tested. All 6 returned valid JSON. Caveat: several of my Unsplash photo IDs pointed at different food than I labeled (e.g. my "pizza slice" test was actually a burger photo), so the expected-vs-actual comparison below is messy.

| My label (correctness?) | AI total | AI's actual items | Notes |
|---|---|---|---|
| "Big Mac burger close-up" (✓) | 1028 kcal | sesame bun, 6oz beef, 2x cheese, lettuce, tomato, onion, pickles, sauce | AI saw a Big Mac-style burger; said "large double cheeseburger". Reasonable. |
| "Buddha bowl" (✓) | 503 kcal | greens, tofu, eggs, chickpeas, tomatoes, cucumber, cabbage, onion | Looks correct. |
| "Pancakes with berries" (?) | 669 kcal | pancakes, maple syrup, banana slices | AI saw pancakes. Says "8 pancakes" — generous portion assumption. |
| "Pizza slice" (✗ actually a burger) | 910 kcal | hamburger with bun, lettuce, fries | AI correctly saw a burger + fries. My test was mislabeled, not AI's fault. |
| "Garden salad" (?) | 435 kcal | greens, carrots, onion, walnuts, feta, dried cranberries, orange juice/slices | More loaded than a basic salad — feta + nuts + dried fruit add up. |
| "Stir fry" (✗ actually a cake) | 347 kcal | layered cake slice, raspberries, strawberries | AI correctly saw cake. My test mislabeled, not AI's fault. |

**Cost:** $0.0527 for 6 requests = ~$0.009 each
**Latency:** 5.4s average

**Projected per user/month (3 meals/day, vision):** ~$0.80

**Second round** (8 more photos) hit OpenRouter rate limits after a few successes — only 1 of 8 got through (a "Caesar salad" that AI correctly identified as ribeye steak + broccoli + shrimp — the photo didn't match my label either). Not enough data for a second conclusion.

## What I learned

1. **JSON schema compliance is excellent.** 11/11 requests returned parseable JSON matching the exact schema I asked for. Zero retries needed for format. This was a risk I was over-worried about.

2. **Visual identification is decent but I need real test photos.** My Unsplash ID guessing was bad. For a real validation, I need photos I can verify (mine, or labeled test sets like Food-101). Skipping that for now — Week 5 beta users will give us real validation.

3. **Portion size is the hardest problem.** Even with clear food identification, "is that a 6oz or 8oz steak?" is a 30% swing in calories. The edit screen is therefore the most important feature — not the AI itself.

4. **Cost is not the constraint.** $0.30-0.80/user/month means we can be generous with retries, image preprocessing, even multiple-angle shots if needed.

5. **Latency is fine.** 5s for vision is "good enough" — not instant but well under the 10s target.

## Decisions from this validation

- **Ship the text fallback first.** It's cheaper, faster, and JSON is more reliable. Vision is the wow factor, but text is the reliability floor.
- **Edit screen is non-negotiable.** AI is a starting point. Users must be able to adjust portions and items before save.
- **Image compression matters less than I thought.** Even 200KB images work fine; we're not bandwidth-constrained at $0.009/req.
- **Defer visual-accuracy validation to beta.** Statistical sample of 6 Unsplash photos I couldn't verify isn't worth more than real users logging real meals in Week 5.

## Next validation step (Week 4-5)

- Build a small in-app test: "is this estimate within 20%?" Yes/No from user after they save
- After 100 logs, compute agreement rate between AI estimate and user-edited final
- If agreement <70%, the AI prompt needs work before launch