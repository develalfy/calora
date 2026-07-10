# Calora — AI-Powered Calorie Tracker

## One-liner
Snap a photo of your meal (or type it) → instant calorie + macro estimate, logged to your daily history. No barcode scanning, no manual database hunting.

## Who it's for
- People who track calories but quit because it's tedious (MyFitnessPal fatigue)
- Casual gym-goers who want awareness, not obsessive logging
- Anyone eating out / cooking at home where there's no label

## Why now
- GPT-4o / Claude vision models can estimate calories from a photo within ±15-20% accuracy
- Most existing trackers force barcode → manual entry → food database lookup
- Snap → estimate flow is the natural mobile UX; nobody has nailed it

## Core flow (MVP)
1. User opens app → camera (or photo library) or text input
2. Photo taken → uploaded to AI vision API → returns JSON of items + estimated cals/macros
3. User confirms/edits the estimate → saves to daily log
4. Home screen shows today's running total + ring progress vs goal

## Differentiators
- **Photo-first**, not barcode-first
- **Text fallback** for "2 eggs and toast" without photo
- **Multi-item recognition** (plate with rice + chicken + salad)
- **Edit before save** (AI estimate is a starting point, not gospel)

## Out of scope (MVP)
- Exercise tracking
- Weight tracking / trends over months
- Social / friends
- Recipe builder
- Barcode scanner (Phase 2)

## Success metric
- User logs 3+ meals/day for 7+ days (retention proxy)
- <30 seconds from open → saved log entry