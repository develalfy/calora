// Unit tests for lib/calc.ts — pure business logic.
// These cover streak, macro targets, percent calc, and totals.

import { describe, it, expect } from "vitest";
import {
  computeStreak,
  computeLongestStreak,
  dayBuckets,
  macroTargets,
  pct,
  sumTotals,
  formatKcal,
  startOfDayMs,
} from "./calc";
import type { MealEntry } from "./types";

const MS_PER_DAY = 86_400_000;

function mkLog(...timestamps: number[]): MealEntry[] {
  return timestamps.map((t, i) => ({
    id: `e${i}`,
    loggedAt: t,
    meal: "lunch",
    items: [
      { name: "X", calories: 100, protein_g: 10, carbs_g: 10, fat_g: 5 },
    ],
    totals: { calories: 100, protein_g: 10, carbs_g: 10, fat_g: 5 },
    source: "text",
  }));
}

describe("startOfDayMs", () => {
  it("zeroes the time portion", () => {
    const ts = new Date(2026, 6, 12, 14, 33, 22).getTime();
    const d = new Date(startOfDayMs(ts));
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
  });
});

describe("dayBuckets", () => {
  it("returns N buckets, oldest first", () => {
    const now = new Date(2026, 6, 12, 14).getTime();
    const buckets = dayBuckets([], now, 7);
    expect(buckets).toHaveLength(7);
    // oldest first
    expect(buckets[0].start).toBeLessThan(buckets[6].start);
    // last bucket is today
    expect(buckets[6].start).toBe(startOfDayMs(now));
  });

  it("flags days with at least one entry", () => {
    const now = new Date(2026, 6, 12, 14).getTime();
    const today = startOfDayMs(now);
    const yesterday = today - MS_PER_DAY;
    const log = mkLog(today + 1000, yesterday + 1000);
    const buckets = dayBuckets(log, now, 3);
    expect(buckets[1].has).toBe(true); // yesterday
    expect(buckets[2].has).toBe(true); // today
    expect(buckets[0].has).toBe(false); // day before yesterday
  });
});

describe("computeStreak", () => {
  it("returns 0 for empty log", () => {
    expect(computeStreak([], Date.now())).toBe(0);
  });

  it("counts today's meal as a 1-day streak", () => {
    const now = new Date(2026, 6, 12, 14).getTime();
    const today = startOfDayMs(now);
    expect(computeStreak(mkLog(today + 1000), now)).toBe(1);
  });

  it("counts consecutive days going back from today", () => {
    const now = new Date(2026, 6, 12, 14).getTime();
    const today = startOfDayMs(now);
    const log = mkLog(
      today + 1000,
      today - MS_PER_DAY + 1000,
      today - 2 * MS_PER_DAY + 1000,
    );
    expect(computeStreak(log, now)).toBe(3);
  });

  it("preserves the streak when today is empty (in-flight streak)", () => {
    const now = new Date(2026, 6, 12, 14).getTime();
    const today = startOfDayMs(now);
    const log = mkLog(today - MS_PER_DAY + 1000);
    // Today is empty but yesterday has a meal — streak = 1
    expect(computeStreak(log, now)).toBe(1);
  });

  it("breaks on the first gap", () => {
    const now = new Date(2026, 6, 12, 14).getTime();
    const today = startOfDayMs(now);
    // today, yesterday, gap on day before yesterday, day 3
    const log = mkLog(
      today + 1000,
      today - MS_PER_DAY + 1000,
      today - 3 * MS_PER_DAY + 1000,
    );
    expect(computeStreak(log, now)).toBe(2);
  });

  it("does not count two meals on the same day as 2", () => {
    const now = new Date(2026, 6, 12, 14).getTime();
    const today = startOfDayMs(now);
    expect(
      computeStreak(mkLog(today + 1000, today + 5000, today + 10000), now),
    ).toBe(1);
  });
});

describe("computeLongestStreak", () => {
  it("returns 0 for empty log", () => {
    expect(computeLongestStreak([], Date.now())).toBe(0);
  });

  it("finds the longest run in the window", () => {
    const now = new Date(2026, 6, 12, 14).getTime();
    const today = startOfDayMs(now);
    // Run of 5 (days -10..-6), then gap, then 2 (yesterday + today)
    const log = mkLog(
      ...Array.from({ length: 5 }, (_, i) => today - (10 - i) * MS_PER_DAY + 1000),
      today - MS_PER_DAY + 1000,
      today + 1000,
    );
    expect(computeLongestStreak(log, now)).toBe(5);
  });

  it("longest >= current always", () => {
    const now = new Date(2026, 6, 12, 14).getTime();
    const today = startOfDayMs(now);
    const log = mkLog(
      today - 20 * MS_PER_DAY + 1000,
      today - 21 * MS_PER_DAY + 1000,
      today - 22 * MS_PER_DAY + 1000,
      today + 1000,
    );
    expect(computeLongestStreak(log, now)).toBe(3);
    expect(computeStreak(log, now)).toBe(1);
  });
});

describe("macroTargets", () => {
  it("returns 30% protein at 4 kcal/g", () => {
    const t = macroTargets(2000);
    expect(t.protein_g).toBe(150); // 600/4
  });

  it("returns 40% carbs at 4 kcal/g", () => {
    const t = macroTargets(2000);
    expect(t.carbs_g).toBe(200); // 800/4
  });

  it("returns 30% fat at 9 kcal/g", () => {
    const t = macroTargets(2000);
    expect(t.fat_g).toBe(67); // 600/9 = 66.67 → 67
  });

  it("scales linearly with goal", () => {
    const a = macroTargets(2000);
    const b = macroTargets(3000);
    expect(b.protein_g / a.protein_g).toBeCloseTo(1.5);
  });

  it("handles zero goal gracefully", () => {
    const t = macroTargets(0);
    expect(t.protein_g).toBe(0);
    expect(t.carbs_g).toBe(0);
    expect(t.fat_g).toBe(0);
  });
});

describe("pct", () => {
  it("returns 0 for 0 value", () => {
    expect(pct(0, 100)).toBe(0);
  });

  it("returns 100 for value == target", () => {
    expect(pct(100, 100)).toBe(100);
  });

  it("clamps at 100 over-target", () => {
    expect(pct(150, 100)).toBe(100);
  });

  it("rounds to nearest integer", () => {
    expect(pct(33, 100)).toBe(33);
  });

  it("avoids divide-by-zero (target=0)", () => {
    expect(pct(50, 0)).toBe(100); // max(1, 0) → 100/1 = 100 (acceptable)
  });
});

describe("sumTotals", () => {
  it("sums across entries", () => {
    const entries: MealEntry[] = [
      {
        id: "a",
        loggedAt: 0,
        meal: "lunch",
        items: [],
        totals: { calories: 200, protein_g: 20, carbs_g: 10, fat_g: 5 },
        source: "text",
      },
      {
        id: "b",
        loggedAt: 0,
        meal: "dinner",
        items: [],
        totals: { calories: 300, protein_g: 15, carbs_g: 30, fat_g: 10 },
        source: "text",
      },
    ];
    expect(sumTotals(entries)).toEqual({
      calories: 500,
      protein_g: 35,
      carbs_g: 40,
      fat_g: 15,
    });
  });

  it("empty array returns zeros", () => {
    expect(sumTotals([])).toEqual({
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
    });
  });
});

describe("formatKcal", () => {
  it("rounds to nearest integer", () => {
    expect(formatKcal(1234.6)).toBe("1,235");
  });

  it("inserts thousands separators", () => {
    expect(formatKcal(2500)).toBe("2,500");
  });

  it("handles zero", () => {
    expect(formatKcal(0)).toBe("0");
  });
});