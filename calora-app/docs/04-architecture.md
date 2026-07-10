# Architecture — Calora

```
┌─────────────────────────────────────────┐
│           Browser / PWA                 │
│  ┌──────────┐  ┌──────────────────────┐ │
│  │ Camera   │  │  Daily log / Ring    │ │
│  │ capture  │  │  History             │ │
│  └────┬─────┘  └──────────▲───────────┘ │
│       │ photo              │             │
└───────┼────────────────────┼─────────────┘
        │                    │
        ▼                    │
┌──────────────┐    ┌───────┴────────┐
│ Next.js API  │    │ localStorage   │
│  /api/estimate│    │ (today + 7d)  │
└──────┬───────┘    └───────▲────────┘
       │                    │
       ▼                    │
┌──────────────┐             │
│ Claude vision│             │
│ (OpenRouter) │             │
└──────────────┘             │
                             │
       save log ─────────────┘
```

## Data flow
1. User takes photo → compressed to ~500KB JPEG client-side
2. POST `/api/estimate` with base64 image (or text)
3. Server calls Claude vision with structured prompt → JSON `{items: [...], totals: {...}, confidence}`
4. Client shows editable estimate form
5. User confirms → save to localStorage with timestamp + meal type
6. Daily log view aggregates today's entries

## API contract

### POST /api/estimate

**Request:**
```json
{
  "image": "data:image/jpeg;base64,...",  // optional
  "text": "2 scrambled eggs with butter on toast",  // optional
  "context": { "meal": "breakfast" }  // optional, helps model
}
```

**Response:**
```json
{
  "items": [
    { "name": "scrambled eggs (2)", "calories": 180, "protein_g": 12, "carbs_g": 2, "fat_g": 14 },
    { "name": "butter (1 tbsp)", "calories": 102, "protein_g": 0, "carbs_g": 0, "fat_g": 12 },
    { "name": "toast (1 slice, wheat)", "calories": 80, "protein_g": 3, "carbs_g": 14, "fat_g": 1 }
  ],
  "totals": { "calories": 362, "protein_g": 15, "carbs_g": 16, "fat_g": 27 },
  "confidence": "medium",
  "notes": "Assumed standard portion sizes"
}
```

## Storage schema (localStorage)

```ts
type MealEntry = {
  id: string;          // uuid
  loggedAt: number;    // epoch ms
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  items: FoodItem[];
  totals: { calories, protein_g, carbs_g, fat_g };
  source: 'photo' | 'text';
  imageDataUrl?: string;  // optional thumbnail
};

type UserSettings = {
  goalCalories: number;   // default 2000
  goalProtein?: number;
};
```

## Error handling
- API timeout (>30s) → show "couldn't analyze, try again or type it instead"
- 4xx/5xx → fallback text input, log to console
- localStorage quota → warn user, suggest export