# 8-Week Roadmap — Calora

## Week 1: Core AI flow (validate the tech)
- [ ] Next.js scaffold + Tailwind
- [ ] Camera capture component (browser)
- [ ] `/api/estimate` endpoint with Claude vision
- [ ] Test 20 real meal photos, document accuracy
- [ ] **Milestone**: Photo → JSON estimate working in <10s

## Week 2: Edit + save flow
- [ ] Edit screen (item list, portion sliders, kcal display)
- [ ] localStorage save
- [ ] Today's log view
- [ ] **Milestone**: Full photo→edit→save loop works end-to-end

## Week 3: Text fallback + ring UI
- [ ] Text input fallback (same model, text-only prompt)
- [ ] Goal setting (manual kcal target)
- [ ] Ring progress component
- [ ] **Milestone**: Both photo and text paths ship, ring shows progress

## Week 4: Polish + history
- [ ] History view (last 7 days, list + simple chart)
- [ ] Meal type categorization (breakfast/lunch/dinner/snack)
- [ ] Empty states, loading skeletons, error handling
- [ ] **Milestone**: Polished MVP, ready for friends-and-family test

## Week 5: Beta launch
- [ ] Deploy to Vercel (calora.develalfy.me or similar)
- [ ] Recruit 20-50 beta users (Reddit r/loseit, Twitter, friends)
- [ ] Set up Plausible analytics
- [ ] **Milestone**: 50 installs, 100 meals logged

## Week 6: Retention features
- [ ] Streaks (consecutive days with ≥1 log)
- [ ] Weekly summary email (manual digest if needed)
- [ ] Onboarding tweak based on Week 5 feedback
- [ ] **Milestone**: D7 retention >30%

## Week 7: PWA + iOS test
- [ ] PWA manifest + service worker
- [ ] Test on iOS Safari, fix quirks
- [ ] Add to home screen prompt
- [ ] **Milestone**: Installable on iPhone home screen

## Week 8: Decide next
- **Path A**: Monetize — Stripe + $5/mo subscription, gate after 20 free logs
- **Path B**: Add barcode scanner (differentiation vs Cal AI)
- **Path C**: Iterate on retention if D7 still <40%

## Success criteria by end of Week 8
- 200+ beta users
- D7 retention >30%
- 5,000+ meals logged
- <$300 total AI spend
- Decision made on path forward