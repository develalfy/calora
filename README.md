# Calora

AI-powered calorie tracker. Snap a photo (or type a description) → get calorie + macro estimate → edit → save.

**One-liner:** Photo → calories in 10 seconds. No signup, no barcode, no database hunting.

## Status
🟡 Planning + validation phase (Week 0)

## Quick links
- [Idea & target user](docs/01-idea.md)
- [Tech stack decision](docs/02-tech-stack.md)
- [MVP scope](docs/03-mvp-scope.md)
- [Architecture](docs/04-architecture.md)
- [Competitive landscape](docs/05-competitive.md)
- [Risks](docs/06-risks.md)
- [8-week roadmap](docs/07-roadmap-8w.md)

## Research
- [AI validation results](docs/research/ai-validation.md) — Claude Sonnet 4 returns valid JSON in schema every time. Text path: ~$0.30/user/mo. Vision: ~$0.80/user/mo, 5s avg latency.
- [Rejected ideas](docs/research/rejected/initial-ideas.md) — RN, barcode-first, auth Day 1, etc.

## Stack
Next.js 15 + Tailwind + Claude Sonnet 4 (via OpenRouter) + Vercel. localStorage for MVP.