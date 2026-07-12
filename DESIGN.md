# DESIGN.md — Calora

> Calora is a calorie tracker where the camera is the input. The brand voice should be:
> warm like a café, clean like a kitchen, calm like the moment after a satisfying meal.

---

## Brand identity

| Aspect | Decision |
|---|---|
| **Name** | Calora |
| **Voice** | Friendly, calm, matter-of-fact. Never fitness-bro. Never clinical. |
| **Hero feeling** | "I just snap and it knows." Effortless, accurate, private. |
| **Single accent** | Warm coral `#ff6f4d` — appetite + warmth (food, dinner table, sunset). NOT fitness green. NOT medical blue. |
| **Support accent** | Soft lavender `#7c6cf0` — calm, balance (used sparingly for focus rings & toggles). |
| **Danger / delete** | `#e5484d` muted red. |
| **Success** | `#16a34a` muted green — only for goal-hit + saved confirmations. |

## Color tokens

```json
{
  "canvas": "#fbfaf7",          /* warm off-white, not pure white */
  "canvas-dark": "#0c0a08",     /* warm dark, not blue-black */
  "surface-soft": "#f3efe9",    /* warm beige card surface */
  "surface-card": "#ffffff",
  "surface-strong": "#e8e3dc",
  "ink": "#1a1714",             /* warm near-black for body text */
  "ink-soft": "#5b554d",        /* secondary text */
  "ink-muted": "#96908a",       /* tertiary, captions */
  "hairline": "#e8e3dc",
  "hairline-soft": "#f3efe9",
  "accent": "#ff6f4d",          /* warm coral — primary CTA */
  "accent-hover": "#e85a3a",
  "accent-soft": "#ffe5dd",
  "lavender": "#7c6cf0",        /* secondary accent for focus/toggles */
  "lavender-soft": "#edeafd",
  "success": "#16a34a",
  "success-soft": "#dcfce7",
  "warning": "#f59e0b",
  "warning-soft": "#fef3c7",
  "danger": "#e5484d",
  "danger-soft": "#fee2e2",
  "macro-protein": "#7c6cf0",   /* lavender for protein */
  "macro-carbs":   "#f59e0b",   /* amber for carbs */
  "macro-fat":     "#ec4899"    /* pink for fat */
}
```

## Typography

- **Display**: `Cal Sans` (free via Fontsource/google-fonts), fallback `Inter`, `system-ui`.
  - Use 28-56px, weight 600, tracking -0.02em.
- **Body**: `Inter`, 14-16px, weight 400/500.
- **Numbers** (calories, grams): `tabular-nums` via CSS, weight 600-700.
- **No more than 2 typefaces.** Never italic on the home screen.

| Token | Size | Weight | Use |
|---|---|---|---|
| `display-xl` | 56px | 600 | Big hero on home |
| `display-lg` | 40px | 600 | Number in progress ring |
| `display-md` | 28px | 600 | Page headings |
| `title-lg` | 20px | 600 | Section headings |
| `title-md` | 17px | 600 | Card titles |
| `body-md` | 15px | 400 | Default body |
| `body-sm` | 13px | 400 | Captions, helper text |
| `label-xs` | 11px | 600 | Caps labels (tracking 0.08em) |

## Spacing & radii

- **Base**: 4px scale (4, 8, 12, 16, 20, 24, 32, 48)
- **Container**: `max-w-md` (480px) for forms, full-bleed for charts
- **Radii**: 8 (chips), 14 (cards), 20 (modal/drop), 28 (CTA pill), full (ring)
- **No 0px borders**. Hairlines always.

## Surface hierarchy

```
canvas (page bg)
  └─ surface-card (white card on canvas)        shadow: 0 1px 2px rgba(0,0,0,0.04)
       └─ surface-soft (inner inset bg)
```

Dark mode: invert colors, but keep **same coral** and **same lavender** (just bump accent-hover brightness).

## Component patterns

### Primary CTA (full-width pill)

```html
<button class="w-full py-4 rounded-[20px] bg-[#ff6f4d] text-white font-semibold text-base
                shadow-[0_6px_16px_-6px_rgba(255,111,77,0.5)] active:scale-[0.98] transition">
  Snap or upload a photo
</button>
```

- **Shadow** is colored to match the accent, not gray — gives the warm "glow" feeling.
- **active:scale** on press — feels responsive.

### Secondary button (text + chevron)

```html
<button class="text-[#ff6f4d] font-semibold flex items-center gap-1">
  Edit <ChevronRight size={14} />
</button>
```

### Cards

```html
<div class="rounded-[20px] bg-white dark:bg-[#1a1714] border border-[#e8e3dc] p-4">
  ...
</div>
```

### Macro chips

Three pills showing macro breakdown:
- Background tinted with macro-color at 12% opacity
- Foreground = macro color
- Used in meal rows + result view

### Confidence badge

Three states, no emoji, just colored pill + word:

| Confidence | Color | Copy |
|---|---|---|
| high | success | "High confidence" |
| medium | warning | "Medium — review items" |
| low | danger | "Low — likely needs editing" |

## Motion

- Page transitions: `slide-in-from-right` 240ms ease-out for forward nav, slide-from-left 200ms for back.
- Progress ring animates stroke-dashoffset on changes.
- Macro bars animate width on change (400ms ease-out).
- **No** bounce animations. **No** loading skeletons longer than 200ms before content shows. **No** spinner > 3s without text.
- All interactive feedback within 80ms (active state).

## Empty states

Don't apologize. Lead with action.

| State | Don't say | Say instead |
|---|---|---|
| No meals today | "Nothing logged yet" | "Log your first meal" + arrow to CTA |
| No history | "Last 7 days" + empty list | Same header + subtitle "Your week rolls up here" |
| Settings first-time | Show 2000 by default | Caption: "Avg adult needs 2000–2500 kcal. Adjust below." |

## Accessibility

- All text ≥ 4.5:1 contrast against its surface.
- Focus rings: 2px solid `#7c6cf0` (lavender), 4px soft offset — visible against BOTH light and dark.
- All interactive elements have `aria-label` when icon-only.
- `prefers-reduced-motion` disables all transitions.
- Tap targets ≥ 44×44 on mobile.

## Anti-patterns (do not do)

- ❌ Generic bootstrap green (`#10b981`) as primary — too fitness-bro
- ❌ emoji as a primary UI element (the camera button label, etc.)
- ❌ gray disabled state with no explanation
- ❌ Floating action button — we already have a primary CTA, no FAB
- ❌ Reductive gradient rings (purple→pink) — feels generic AI
- ❌ Italic copy — looks unfinished
- ❌ "Snap" / "Bam" / casual slang — stay calm
- ❌ More than 2 typefaces

## Page-level design

### Home

- **Top bar**: small wordmark "calora" (lowercase, Cal Sans, 22px) on left. Right: a single ⚙ icon (text-icon button) and a "history" pill button (text + chevron). No more than 3 actions up top.
- **Hero**: progress ring 220×220px, centered. Inside: large `260 kcal` (display-lg) + "of 2000 today" caption. Ring fills clockwise from top, transitions smoothly on change.
- **Remaining line**: "1,740 kcal left today" with a tiny progress bar (1px high) spanning the same width as the ring. Subtle but informative.
- **Macro bars**: 3 horizontal bars stacked vertically. Each shows: macro name (caps), value (g + %), bar (8px height, colored), target tick at end. Total height ~80px.
- **CTA**: "+ Log a meal" pill button, full width, coral.
- **Today's list**: a section with "Today · 12:34 PM" heading (timestamp updates). Each meal is a card with:
  - 56×56 thumbnail (if photo) + emoji fallback (if text)
  - Meal name (e.g., "2 scrambled eggs + toast") — single line, ellipsis
  - Macros: "P 13g · C 2g · F 11g" (smaller secondary)
  - Right: large kcal + ✕ button (visible on hover only on desktop, always on mobile)

### Capture

- **Single-purpose page**: meal chips at top (pill toggles).
- **Camera button** (the primary action): a 240×240 aspect-ratio box with:
  - Dashed border (2px, coral if empty / solid if photo shown)
  - Centered icon (camera SVG, 32px) + label "Snap a photo" + caption "AI reads it in ~5 seconds"
  - On mobile: clicking opens native camera; on desktop: file picker
- **Divider**: thin gray with "or describe it" label
- **Text input**: full-width textarea. Has suggestions below: "Try: 'chicken caesar salad, large', '2 chapatis with dal', etc."
- **Recent duplicates**: chips of last 3 meals — "↻ 2 eggs + toast" type. Tapping repeats that text.
- **Submit**: full-width coral pill.

### Result / Edit

- **Confidence badge** at top: text + icon, colored pill.
- **Photo preview**: if photo, big rounded card with the image. Optional tap to re-pick.
- **Item cards**: each is a horizontally-laid card: name input (left), kcal input (right), macros below in row of 3 micro-pills. Swipe right to delete.
- **+ Add item** below the list (small text button).
- **Total bar at bottom**: pinned to bottom. Shows total kcal (large) + macros (small). Above the save button.
- **Save button**: full-width coral.

### Settings

- **Calorie goal**: big numeric display with a horizontal slider 1200–3500 kcal. Slider shows tick marks at standard sizes (1500, 1800, 2000, 2500). Value updates live.
- **Helper copy below slider**: "~X grams of each macro recommended (30% protein / 40% carbs / 30% fat)" — instant math education.
- **Save** button: enabled when changed, otherwise greyed.
- **About / Disclaimer** section: collapsible, opens by tapping.

### History

- **Top chart**: bar chart of last 7 days, each bar = total kcal that day. Hover/tap shows exact value.
- **Streak counter**: "🔥 5-day streak" only if ≥2 days consecutive.
- **Daily sections**: each day is a card, expandable. Default: collapsed showing only total. Tap to expand showing each meal.

## Sound (none, intentionally)

Calora does NOT play sounds. Notification only via OS-level push (post-MVP). The product's silence is part of the calm.

## Tone rules

- Use complete sentences in descriptions.
- No exclamation points except in success states ("Saved!", "Streak!").
- No emoji in interface text. ✓ in macros, 🔥 only in streak — both as standalone indicators, not in sentences.
