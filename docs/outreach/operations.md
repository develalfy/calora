# Calora — Operations Setup (one-time, ~2 hours)

This is the one-time setup that **you (Ashraf) need to do manually** before any of the B2B DMs convert into paying customers. None of this requires code.

## A. Stripe (consumer subscription — unlocks MRR)

**Why:** Without Stripe, the consumer pricing is a "coming soon" promise. With Stripe, every visitor who clicks "Sign up free" is one step from a $4.99/mo conversion.

**Steps:**

1. Create Stripe account at https://dashboard.stripe.com/register
   - Use your business email (hello@calora.app or whatever you have)
   - Identity verification requires your passport/SSN — Stripe uses this once
   - If you don't have a US entity: Stripe Atlas (https://stripe.com/atlas) for $500 forms a US LLC in Delaware + opens US bank account. Worth it ONLY if MRR > $500/mo is likely. Otherwise, operate as Stripe Personal with "individual" tax entity.

2. Create two Products:
   - `Pro Monthly` — recurring, $4.99 USD, monthly
   - `Pro Annual` — recurring, $29.99 USD, yearly
   - Stripe will give you `price_XXX` IDs — copy them.

3. Get your API keys:
   - Secret key: `sk_live_...` (live mode) or `sk_test_...` (test mode)
   - Webhook secret: from Dashboard → Developers → Webhooks → Add endpoint → `https://calora.develalfy.me/api/stripe/webhook` → select `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted` → reveal secret (starts with `whsec_`)

4. Set these in Dokploy env (UI only, no API):
   - `STRIPE_SECRET_KEY` = your secret key
   - `STRIPE_PRICE_MONTHLY` = `price_XXX` for Pro Monthly
   - `STRIPE_PRICE_ANNUAL` = `price_XXX` for Pro Annual
   - `STRIPE_WEBHOOK_SECRET` = `whsec_...`

5. Verify the webhook registers: in Stripe Dashboard → Webhooks → your endpoint should show "Enabled" after the first event arrives.

## B. Telegram notifications (so you see new leads instantly)

**Why:** Without this, B2B leads + waitlist signups only land in stdout (operator-visible via `dokploy logs`). With Telegram, they ping your phone.

**Steps:**

1. Create a bot: DM `@BotFather` on Telegram → `/newbot` → name it "Calora Leads" → copy the HTTP API token (looks like `123456789:ABCDEFGhijklmnopqrstuvwxyz`)

2. Get your chat ID: send any message to your new bot → visit `https://api.telegram.org/bot<TOKEN>/getUpdates` → find `"chat":{"id":NUMBER,` — that's your `TELEGRAM_BOT_CHAT_ID`

3. Set in Dokploy env:
   - `TELEGRAM_BOT_TOKEN` = the token
   - `TELEGRAM_BOT_CHAT_ID` = the chat id
   - (Use the SAME pair for both waitlist and B2B request, OR set a separate chat for B2B by also setting `TELEGRAM_WAITLIST_CHAT_ID`)

## C. Domain verification (B2B credibility)

**Why:** "calora.develalfy.me" looks indie. "calora.app" or "getcalora.com" looks fundable. The CF proxy through develalfy.me is fine for day 1.

**Steps:**

- For day 1: keep `calora.develalfy.me`. Done.
- For day 30 if $500/mo is locked in: register `calora.app` (~$20/yr) on Cloudflare, then either move the app there or set up `app.calora.app` as a CNAME to the existing Dokploy service. The "For Teams" CTA on `/b2b` should point to this if you have it.

## D. /api/health + /api/metrics endpoints (verify the funnel is live)

No setup needed — these are already live:

- `curl https://calora.develalfy.me/api/health` → should return `{"ok":true,"ai_provider_reachable":true,...}`
- `curl https://calora.develalfy.me/api/metrics` → Prometheus counters

**What to watch in `/api/metrics` weekly:**

| Counter | Healthy trajectory |
|---|---|
| `calora_demo_calls_total` | growing daily (= top-of-funnel traffic) |
| `calora_demo_calls_succeeded_total / calora_demo_calls_total` | > 0.9 (= AI is healthy) |
| `calora_demo_calls_failed_total` | flat (= provider uptime stable) |
| `calora_b2b_leads_total` | daily or weekly leads |
| `calora_signups_by_ref_total{ref="..."}` | for each active creator — the conversion signal |
| `calora_ai_calls_total` (auth'd route) | post-signup activation |

## E. Quick deployment verification (run after every push to main)

```bash
curl -fsS https://calora.develalfy.me/api/health | jq .
```

Expect `{"ok":true,"ai_provider_reachable":true,"uptime_sec":<some-positive-int>}`. If `ai_provider_reachable:false`, OpenRouter key is missing or exhausted — check Dokploy env.

---

## Checklist

- [ ] Stripe account created + KYC done
- [ ] Two products + two prices created
- [ ] Webhook endpoint registered in Stripe
- [ ] Four env vars set in Dokploy
- [ ] Telegram bot created + chat ID captured
- [ ] Telegram env vars set in Dokploy
- [ ] `/api/health` green
- [ ] `/api/metrics` returns Prometheus-format text

Once all are checked, run `bash scripts/smoke.sh` (or the curl equivalent below) to validate the funnel end-to-end before sending the first B2B DM:

```bash
# 1. Public demo works
curl -fsS -X POST https://calora.develalfy.me/api/demo-estimate \
  -H 'Content-Type: application/json' \
  -d '{"text":"banana","context":{"meal":"snack"}}' | jq .

# 2. B2B form accepts a lead
curl -fsS -X POST https://calora.develalfy.me/api/b2b/request \
  -H 'Content-Type: application/json' \
  -d '{"email":"ashraf-test@develalfy.me","company":"Develalfy","use_case":"other","monthly_estimates":"under_1k"}' | jq .

# 3. Metrics expose new counters
curl -fsS https://calora.develalfy.me/api/metrics | grep -E 'calora_b2b_leads_total|calora_demo_calls_total'
```
