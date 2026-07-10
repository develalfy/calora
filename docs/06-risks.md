# Risk Register — Calora

## R1: AI calorie estimates are inaccurate (HIGH)
**Risk**: Users log meals, totals are wildly off, they lose trust and churn.
**Mitigation**:
- Show "AI estimate" badge prominently
- Make edit screen the default after analysis (one tap to fix)
- Educate in onboarding: "These are estimates. Edit anything that looks off."
- Add ±% confidence label
**Validation**: Test 20 real meals against known portions before launch. If error >30% on common foods, we have a problem.

## R2: AI cost eats margin (MEDIUM)
**Risk**: Claude vision costs more than $0.03/photo in practice; margin disappears.
**Mitigation**:
- Compress images client-side to <500KB before upload
- Cache similar images (rare but possible)
- Use smaller model for simple queries (text fallback can use Haiku)
- Price at $7/mo not $5 to give buffer
**Validation**: Track actual OpenRouter spend in first 100 users.

## R3: Users don't return after Day 1 (HIGH)
**Risk**: All calorie trackers suffer retention cliff; novelty wears off in 3 days.
**Mitigation**:
- Reduce friction to absolute minimum (no signup, 10s flow)
- Add streaks (visible, not push-notification-spammy)
- Weekly summary email (builds habit)
- Eventually: insights like "you eat 40% more on Fridays"
**Validation**: Track D1/D7/D30 retention from Day 1 of beta.

## R4: Vision model misidentifies food (MEDIUM)
**Risk**: Photo of a banana → labeled as "plantain" → wrong calories.
**Mitigation**:
- Multi-item awareness (Claude handles this well)
- "Looks like..." confidence framing
- Edit screen shows each item separately so user can correct one without nuking all
**Validation**: Test 30 mixed-plate photos in dev.

## R5: No moat — Cal AI copies us in a week (HIGH)
**Risk**: We're a thin wrapper around an API. Anyone can build this.
**Mitigation**:
- Speed to market matters — ship MVP in 2 weeks, not 6 months
- Build proprietary data over time: anonymized meal patterns → better defaults
- Brand/community if we get traction
- The moat is execution speed, not tech
**Reality check**: This is a feature, not a company. Need to ship fast before incumbents add it natively.

## R6: PWA limitations on iOS (MEDIUM)
**Risk**: iOS Safari has quirks — camera permission, install prompt, background sync.
**Mitigation**:
- Test on iOS Safari Day 1
- Fall back gracefully if PWA install fails
- Consider Capacitor wrap if iOS UX is too painful
**Validation**: Test on real iPhone before launch.

## R7: Legal/liability (LOW)
**Risk**: User with eating disorder uses app, blames us for inaccurate tracking.
**Mitigation**:
- Disclaimer: "estimates only, not medical advice"
- Don't market to users with eating disorder history
- Terms of service
**Reality**: All calorie trackers carry this risk; not a differentiator.