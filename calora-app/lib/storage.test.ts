// Unit tests for lib/storage.ts — the heart of Calora's data layer.
// These run in pure JS (no DOM needed) because storage already guards
// against SSR via `typeof window === "undefined"`.

import { describe, it, expect, beforeEach } from "vitest";
import {
  loadLog,
  saveLog,
  addEntry,
  removeEntry,
  updateEntry,
  loadSettings,
  saveSettings,
  startOfDay,
  entriesForDay,
  sumMacros,
  uuid,
  loadOnboarding,
  saveOnboarding,
  clearOnboarding,
  hasCompletedOnboarding,
} from "./storage";
import type { MealEntry, FoodItem, Macros, MealType } from "./types";

function mkItem(overrides: Partial<FoodItem> = {}): FoodItem {
  return {
    name: "Test food",
    calories: 100,
    protein_g: 10,
    carbs_g: 10,
    fat_g: 5,
    ...overrides,
  };
}

function mkEntry(overrides: Partial<MealEntry> = {}): MealEntry {
  return {
    id: uuid(),
    loggedAt: Date.now(),
    meal: "lunch" as MealType,
    items: [mkItem()],
    totals: { calories: 100, protein_g: 10, carbs_g: 10, fat_g: 5 },
    source: "text",
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe("localStorage adapters", () => {
  it("returns empty array when no log exists", () => {
    expect(loadLog()).toEqual([]);
  });

  it("round-trips entries through saveLog/loadLog", () => {
    const entries = [mkEntry(), mkEntry({ meal: "dinner" })];
    saveLog(entries);
    expect(loadLog()).toEqual(entries);
  });

  it("handles corrupted JSON gracefully", () => {
    localStorage.setItem("calora:log:v1", "{not valid json");
    expect(loadLog()).toEqual([]);
  });

  it("default settings are 2000 kcal", () => {
    expect(loadSettings()).toEqual({ goalCalories: 2000 });
  });

  it("saves and loads custom settings", () => {
    saveSettings({ goalCalories: 2500 });
    expect(loadSettings()).toEqual({ goalCalories: 2500 });
  });
});

describe("addEntry", () => {
  it("appends to existing log", () => {
    const a = mkEntry({ id: "a" });
    const b = mkEntry({ id: "b" });
    addEntry(a);
    addEntry(b);
    expect(loadLog()).toHaveLength(2);
  });

  it("returns the full new log", () => {
    const result = addEntry(mkEntry({ id: "x" }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("x");
  });
});

describe("removeEntry", () => {
  it("removes by id", () => {
    const a = mkEntry({ id: "a" });
    const b = mkEntry({ id: "b" });
    saveLog([a, b]);
    removeEntry("a");
    expect(loadLog()).toHaveLength(1);
    expect(loadLog()[0].id).toBe("b");
  });

  it("is a no-op for unknown ids", () => {
    const a = mkEntry({ id: "a" });
    saveLog([a]);
    removeEntry("does-not-exist");
    expect(loadLog()).toHaveLength(1);
  });
});

describe("updateEntry", () => {
  it("patches the entry by id", () => {
    const a = mkEntry({ id: "a", meal: "breakfast" });
    saveLog([a]);
    updateEntry("a", { meal: "snack" });
    expect(loadLog()[0].meal).toBe("snack");
  });

  it("leaves other entries untouched", () => {
    const a = mkEntry({ id: "a", meal: "breakfast" });
    const b = mkEntry({ id: "b", meal: "lunch" });
    saveLog([a, b]);
    updateEntry("a", { meal: "dinner" });
    expect(loadLog().find((e) => e.id === "b")!.meal).toBe("lunch");
  });
});

describe("startOfDay", () => {
  it("zeroes out hours/minutes/seconds", () => {
    const ts = new Date(2026, 6, 12, 14, 33, 22).getTime();
    const sod = startOfDay(ts);
    const d = new Date(sod);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
    expect(d.getMilliseconds()).toBe(0);
  });

  it("preserves the date", () => {
    const ts = new Date(2026, 6, 12, 14, 33, 22).getTime();
    const sod = startOfDay(ts);
    const d = new Date(sod);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6); // July (0-indexed)
    expect(d.getDate()).toBe(12);
  });

  it("handles UTC vs local — local on the same machine is consistent", () => {
    // The function uses local time. Just make sure two timestamps within
    // the same day map to the same startOfDay.
    const a = new Date(2026, 6, 12, 1, 0).getTime();
    const b = new Date(2026, 6, 12, 23, 59).getTime();
    expect(startOfDay(a)).toBe(startOfDay(b));
  });
});

describe("entriesForDay", () => {
  it("filters to a single day", () => {
    const day1 = startOfDay(new Date(2026, 6, 12).getTime());
    const day2 = startOfDay(new Date(2026, 6, 13).getTime());

    const e1 = mkEntry({ loggedAt: day1 + 10 * 3600 * 1000 });
    const e2 = mkEntry({ loggedAt: day2 + 10 * 3600 * 1000 });

    saveLog([e1, e2]);
    expect(entriesForDay(loadLog(), day1)).toHaveLength(1);
    expect(entriesForDay(loadLog(), day2)).toHaveLength(1);
  });

  it("excludes entries exactly at next midnight", () => {
    const day = startOfDay(new Date(2026, 6, 12).getTime());
    const nextDay = day + 24 * 60 * 60 * 1000;
    const e = mkEntry({ loggedAt: nextDay });
    saveLog([e]);
    expect(entriesForDay(loadLog(), day)).toHaveLength(0);
  });
});

describe("sumMacros", () => {
  it("sums totals across entries", () => {
    const entries = [
      mkEntry({
        totals: { calories: 200, protein_g: 20, carbs_g: 10, fat_g: 5 },
      }),
      mkEntry({
        totals: { calories: 300, protein_g: 15, carbs_g: 30, fat_g: 10 },
      }),
    ];
    const result: Macros = sumMacros(entries);
    expect(result).toEqual({
      calories: 500,
      protein_g: 35,
      carbs_g: 40,
      fat_g: 15,
    });
  });

  it("returns zeros for empty array", () => {
    expect(sumMacros([])).toEqual({
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
    });
  });

  it("handles negative tests — does not double-count nested items", () => {
    // Items are NOT summed (totals are already authoritative). The function
    // sums `totals` only — this is a regression guard.
    const e = mkEntry({
      items: [
        mkItem({ calories: 100 }),
        mkItem({ calories: 200 }),
      ],
      totals: { calories: 300, protein_g: 0, carbs_g: 0, fat_g: 0 },
    });
    const result = sumMacros([e]);
    expect(result.calories).toBe(300); // NOT 300+100+200 = 600
  });
});

describe("uuid", () => {
  it("produces a string of plausible length", () => {
    const id = uuid();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(5);
  });

  it("produces unique values", () => {
    const ids = new Set(Array.from({ length: 100 }, () => uuid()));
    expect(ids.size).toBe(100);
  });
});

describe("onboarding state", () => {
  it("starts as null", () => {
    expect(loadOnboarding()).toBeNull();
    expect(hasCompletedOnboarding()).toBe(false);
  });

  it("round-trips via saveOnboarding/loadOnboarding", () => {
    saveOnboarding({ startedAt: 1000, step: 1, pickedGoal: 2000 });
    const s = loadOnboarding();
    expect(s).toEqual({ startedAt: 1000, step: 1, pickedGoal: 2000 });
  });

  it("reports completed when completedAt is set", () => {
    saveOnboarding({ startedAt: 1000, step: 3, completedAt: 2000, pickedGoal: 2000 });
    expect(hasCompletedOnboarding()).toBe(true);
  });

  it("reports not completed without completedAt", () => {
    saveOnboarding({ startedAt: 1000, step: 1 });
    expect(hasCompletedOnboarding()).toBe(false);
  });

  it("clearOnboarding wipes state", () => {
    saveOnboarding({ startedAt: 1000, step: 3, completedAt: 2000 });
    clearOnboarding();
    expect(loadOnboarding()).toBeNull();
    expect(hasCompletedOnboarding()).toBe(false);
  });
});