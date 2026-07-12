// Unit tests for lib/favorites.ts — meal templates + reuse.

import { describe, it, expect, beforeEach } from "vitest";
import {
  addFavorite,
  getFavorites,
  removeFavorite,
  isFavorited,
  defaultFavoriteName,
} from "./favorites";
import type { FoodItem } from "./types";

const egg: FoodItem = { name: "2 eggs", calories: 140, protein_g: 12, carbs_g: 1, fat_g: 10 };
const toast: FoodItem = { name: "Toast", calories: 80, protein_g: 3, carbs_g: 14, fat_g: 1 };

beforeEach(() => {
  localStorage.clear();
});

describe("addFavorite", () => {
  it("persists a favorite", () => {
    const fav = addFavorite({ name: "Breakfast", items: [egg, toast] });
    const list = getFavorites();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ name: "Breakfast", items: [egg, toast] });
    expect(list[0].id).toBe(fav.id);
  });

  it("defaults name to first item when blank", () => {
    const fav = addFavorite({ name: "", items: [egg] });
    expect(fav.name).toBe("2 eggs");
  });

  it("defaults name to 'Meal' when items are empty", () => {
    const fav = addFavorite({ name: "", items: [] });
    expect(fav.name).toBe("Meal");
  });

  it("deep-clones items so future edits don't mutate the favorite", () => {
    const items = [egg];
    addFavorite({ name: "X", items });
    items[0].calories = 999; // mutate original
    const list = getFavorites();
    expect(list[0].items[0].calories).toBe(140); // unchanged
  });
});

describe("getFavorites", () => {
  it("returns most-recently-favorited first", async () => {
    const first = addFavorite({ name: "A", items: [egg] });
    // Ensure distinct timestamps
    await new Promise((r) => setTimeout(r, 5));
    const second = addFavorite({ name: "B", items: [toast] });
    const list = getFavorites();
    expect(list[0].id).toBe(second.id);
    expect(list[1].id).toBe(first.id);
  });

  it("returns [] for empty / corrupted store", () => {
    expect(getFavorites()).toEqual([]);
    localStorage.setItem("calora:favorites:v1", "{not valid");
    expect(getFavorites()).toEqual([]);
  });
});

describe("removeFavorite", () => {
  it("removes by id", () => {
    const a = addFavorite({ name: "A", items: [egg] });
    const b = addFavorite({ name: "B", items: [toast] });
    removeFavorite(a.id);
    const list = getFavorites();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(b.id);
  });

  it("is a no-op for unknown ids", () => {
    addFavorite({ name: "A", items: [egg] });
    removeFavorite("does-not-exist");
    expect(getFavorites()).toHaveLength(1);
  });
});

describe("isFavorited", () => {
  it("returns true when sourceMealId matches", () => {
    addFavorite({ name: "X", items: [egg], sourceMealId: "meal-1" });
    expect(isFavorited("meal-1")).toBe(true);
    expect(isFavorited("meal-2")).toBe(false);
  });
});

describe("defaultFavoriteName", () => {
  it("returns single item name for 1 item", () => {
    expect(defaultFavoriteName([egg])).toBe("2 eggs");
  });
  it("returns 'A + N' for multiple items", () => {
    expect(defaultFavoriteName([egg, toast])).toBe("2 eggs + 1");
  });
  it("returns 'Meal' for empty list", () => {
    expect(defaultFavoriteName([])).toBe("Meal");
  });
});