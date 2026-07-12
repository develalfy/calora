// Pure business logic for Calora — no DOM, no React, no localStorage.
// Imported by app code AND tested directly.

import type { MealEntry, Macros } from "./types";

const MS_PER_DAY = 86_400_000;

export function startOfDayMs(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Build a day-keyed bucket for the last `windowDays` days, oldest first.
 * `has` is true if there is at least one meal that day.
 */
export function dayBuckets(
  log: MealEntry[],
  now: number,
  windowDays = 90,
): { start: number; has: boolean }[] {
  const today = startOfDayMs(now);
  const buckets: { start: number; has: boolean }[] = [];
  for (let i = windowDays - 1; i >= 0; i--) {
    const ds = today - i * MS_PER_DAY;
    const has = log.some((e) => {
      const ed = startOfDayMs(e.loggedAt);
      return ed === ds;
    });
    buckets.push({ start: ds, has });
  }
  return buckets;
}

/**
 * Streak = consecutive days with ≥1 meal ending at `now`'s day.
 * If today is empty but yesterday had a meal, streak still shows the
 * yesterday run (so the user sees their "in flight" streak).
 */
export function computeStreak(log: MealEntry[], now: number): number {
  const days = dayBuckets(log, now);
  let current = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].has) current++;
    else if (i === days.length - 1) continue; // today empty OK
    else break;
  }
  return current;
}

/** Longest run of consecutive days with ≥1 meal within the 90-day window. */
export function computeLongestStreak(log: MealEntry[], now: number): number {
  const days = dayBuckets(log, now);
  let longest = 0;
  let run = 0;
  for (const d of days) {
    if (d.has) {
      run++;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }
  return longest;
}

/** Macro targets derived from a calorie goal using 30/40/30 split at 4-4-9 kcal/g. */
export function macroTargets(goalCalories: number): Macros {
  return {
    calories: goalCalories,
    protein_g: Math.round((goalCalories * 0.3) / 4),
    carbs_g: Math.round((goalCalories * 0.4) / 4),
    fat_g: Math.round((goalCalories * 0.3) / 9),
  };
}

/** Sum totals across many entries. */
export function sumTotals(entries: MealEntry[]): Macros {
  return entries.reduce<Macros>(
    (acc, e) => ({
      calories: acc.calories + e.totals.calories,
      protein_g: acc.protein_g + e.totals.protein_g,
      carbs_g: acc.carbs_g + e.totals.carbs_g,
      fat_g: acc.fat_g + e.totals.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
}

/** Percentage 0..100 of `value` vs `target`, clamped. */
export function pct(value: number, target: number): number {
  return Math.min(100, Math.round((value / Math.max(1, target)) * 100));
}

/** Format kcal with locale-aware thousands separator. */
export function formatKcal(n: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}