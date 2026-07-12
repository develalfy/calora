// localStorage adapter for meal log + settings.
// Single source of truth for MVP. Cross-device sync is post-MVP.

import type { MealEntry, UserSettings, Macros } from "./types";

const LOG_KEY = "calora:log:v1";
const SETTINGS_KEY = "calora:settings:v1";

export function loadLog(): MealEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOG_KEY);
    return raw ? (JSON.parse(raw) as MealEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveLog(entries: MealEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOG_KEY, JSON.stringify(entries));
}

export function addEntry(entry: MealEntry): MealEntry[] {
  const log = loadLog();
  log.push(entry);
  saveLog(log);
  return log;
}

export function removeEntry(id: string): MealEntry[] {
  const log = loadLog().filter((e) => e.id !== id);
  saveLog(log);
  return log;
}

export function updateEntry(id: string, patch: Partial<MealEntry>): MealEntry[] {
  const log = loadLog().map((e) => (e.id === id ? { ...e, ...patch } : e));
  saveLog(log);
  return log;
}

export function loadSettings(): UserSettings {
  if (typeof window === "undefined") return { goalCalories: 2000 };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : { goalCalories: 2000 };
  } catch {
    return { goalCalories: 2000 };
  }
}

export function saveSettings(s: UserSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

// Day helpers
export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function entriesForDay(entries: MealEntry[], dayStart: number): MealEntry[] {
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;
  return entries.filter((e) => e.loggedAt >= dayStart && e.loggedAt < dayEnd);
}

export function sumMacros(entries: MealEntry[]): Macros {
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

export function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─────────────────────────────────────────────────────────────────────────
// Onboarding state — 3-step first-run wizard. Cleared once user completes.
// ─────────────────────────────────────────────────────────────────────────

const ONBOARDING_KEY = "calora:onboarding:v1";

export interface OnboardingState {
  startedAt: number;
  completedAt?: number;
  /** Step the user is on (0-indexed) for resumable onboarding. */
  step: number;
  /** User-saved goal picked during onboarding. */
  pickedGoal?: number;
}

export function loadOnboarding(): OnboardingState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ONBOARDING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveOnboarding(s: OnboardingState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ONBOARDING_KEY, JSON.stringify(s));
}

export function clearOnboarding(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ONBOARDING_KEY);
}

export function hasCompletedOnboarding(): boolean {
  const s = loadOnboarding();
  return !!s?.completedAt;
}