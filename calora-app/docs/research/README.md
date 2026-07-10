# Calora — local artifacts

## Validation trail

### AI validation (2026-07-10)
- Tested `anthropic/claude-sonnet-4` via OpenRouter with 5 text queries and 6 vision queries
- Text path: 5/5 valid JSON, ~$0.003/req, ~2s latency
- Vision path: 6/6 valid JSON, ~$0.009/req, 5.4s avg latency
- Full writeup: `ai-validation.md`
- Raw results: `text-validation-results.json`, `vision-validation-results.json`, `vision-validation-round2.json`

### Validation decisions
- Edit screen is non-negotiable (AI is starting point, not gospel)
- Ship text fallback first (cheaper, faster, more reliable)
- Defer visual-accuracy validation to beta (need real photos from real meals)
- Cost is not the constraint — well under $1/user/mo at projected usage

### Still untested
- Mobile camera capture quality / latency
- Image compression impact on accuracy (does 500KB ≈ 2MB?)
- Multi-item recognition on cluttered plates
- Real user retention (D1/D7) — only beta can tell us
- iOS PWA quirks