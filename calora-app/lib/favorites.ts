// Favorites — quick-repeat log of saved meal templates.
// Stored separately from the log so deletion from history doesn't break favorites.

import type { FoodItem } from "./types";

const KEY = "calora:favorites:v1";

export interface FavoriteMeal {
  id: string;
  /** Free-form label shown in the picker (e.g. "Lunch burrito"). */
  name: string;
  /** Snapshot of items at time of favoriting — user can edit on reuse. */
  items: FoodItem[];
  /** When favorited. */
  favoritedAt: number;
  /** Optional source meal ID for traceability. */
  sourceMealId?: string;
}

function load(): FavoriteMeal[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as FavoriteMeal[]) : [];
  } catch {
    return [];
  }
}

function save(items: FavoriteMeal[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function getFavorites(): FavoriteMeal[] {
  return load().sort((a, b) => b.favoritedAt - a.favoritedAt);
}

export function addFavorite(input: {
  name: string;
  items: FoodItem[];
  sourceMealId?: string;
}): FavoriteMeal {
  const fav: FavoriteMeal = {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2),
    name: input.name.trim() || input.items[0]?.name || "Meal",
    items: input.items.map((i) => ({ ...i })), // deep clone so future edits don't mutate
    favoritedAt: Date.now(),
    sourceMealId: input.sourceMealId,
  };
  const list = load();
  list.push(fav);
  save(list);
  return fav;
}

export function removeFavorite(id: string): FavoriteMeal[] {
  const next = load().filter((f) => f.id !== id);
  save(next);
  return next;
}

export function isFavorited(mealId: string): boolean {
  return load().some((f) => f.sourceMealId === mealId);
}

/** Compose a display name for a meal — first item, or "X + Y" if multiple. */
export function defaultFavoriteName(items: FoodItem[]): string {
  if (items.length === 0) return "Meal";
  if (items.length === 1) return items[0].name;
  return `${items[0].name} + ${items.length - 1}`;
}