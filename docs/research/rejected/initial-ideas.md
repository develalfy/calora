# Rejected Ideas — Calora

Ideas considered and consciously dropped during planning.

## ❌ React Native / Flutter / native iOS
- 3x dev time vs web PWA
- App Store review friction
- No clear UX advantage for camera + form + list
- Can wrap with Capacitor later if iOS PWA is painful

## ❌ Barcode scanner as primary entry
- Forces user to eat packaged food (skews behavior)
- Doesn't cover restaurants, cooking, fresh produce
- Lose It! and MFP already dominate this — no wedge

## ❌ Multi-user auth + cloud sync from Day 1
- Most retention killers are product, not cross-device
- localStorage covers the "will they even come back" test
- Add when we have evidence users want it

## ❌ Recipe builder / custom food database
- Massive scope, no validation yet that users want it
- Edit screen + text fallback covers the "I made something weird" case

## ❌ Exercise tracking
- Different mental model, different category
- Doubles surface area, halves focus
- Plenty of standalone apps if users want it

## ❌ Micronutrient tracking (Cronometer-style)
- Power-user feature, slows down casual flow
- 90% of users won't look past calories + protein

## ❌ AI chat coach ("what should I eat?")
- High support cost, low initial value
- Easy to add later as feature

## ❌ Restaurant menu database
- Need partnerships / API access with chains
- Vision model covers 80% of this case anyway

## ❌ Wearable / Apple Health / Google Fit integration
- Niche, integration hell
- Add once we have users asking

## ❌ Subscription from Day 1
- Beta must be free to validate retention
- Pricing post-validation in Week 8

## ❌ OpenRouter → direct Anthropic API
- Same model, different billing
- OpenRouter gives us model flexibility + single billing
- Worth ~$0.001/req savings? Not now.