"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  EstimateResult,
  FoodItem,
  Macros,
  MealEntry,
  MealType,
} from "@/lib/types";
import {
  addEntry,
  entriesForDay,
  loadLog,
  loadSettings,
  loadOnboarding,
  saveOnboarding,
  clearOnboarding,
  removeEntry,
  saveSettings,
  startOfDay,
  sumMacros,
  uuid,
} from "@/lib/storage";
import { compressImageSafe } from "@/lib/image";
import { downloadCSV, exportToCSV } from "@/lib/export";
import { addFavorite, getFavorites } from "@/lib/favorites";
import {
  computeStreak,
  computeLongestStreak,
  macroTargets,
  pct,
  sumTotals,
  formatKcal,
} from "@/lib/calc";
import { recordScan, scansRemaining, isOverFreeLimit } from "@/lib/usage";
import { track } from "@/lib/analytics";
import {
  Button,
  Card,
  ConfidenceBadge,
  EmptyState,
  IconButton,
  MacroBar,
  PageHeader,
  PillToggle,
  Wordmark,
  toast,
  ToastHost,
} from "@/components/ui";
import {
  IconCamera,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconClose,
  IconDownload,
  IconFlame,
  IconHistory,
  IconLeaf,
  IconPlus,
  IconSettings,
  IconSparkle,
  IconTrash,
  IconUpload,
} from "@/components/Icons";

// Macro targets come from @/lib/calc (single source of truth, tested).

const MACRO_PROTEIN = "var(--macro-protein)";
const MACRO_CARBS = "var(--macro-carbs)";
const MACRO_FAT = "var(--macro-fat)";

type View =
  | "home"
  | "capture"
  | "loading"
  | "edit"
  | "history"
  | "settings"
  | "meal-detail"
  | "onboarding";

const MEAL_OPTIONS = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
] as const;

export default function HomePage() {
  const [view, setView] = useState<View>("home");
  const [log, setLog] = useState<MealEntry[]>([]);
  const [settings, setSettings] = useState({ goalCalories: 2000 });
  const [now, setNow] = useState<number>(() => Date.now());
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [scanRemaining, setScanRemaining] = useState(5);

  useEffect(() => {
    setLog(loadLog());
    const s = loadSettings();
    setSettings(s);
    setScanRemaining(scansRemaining());
    // First-time users see onboarding before home
    if (!localStorage.getItem("calora:onboarding:v1")) {
      track("onboarding_start");
      setView("onboarding");
    }
    track("app_open");
  }, []);

  // Tick once a minute so "today" stays current
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const today = useMemo(
    () => entriesForDay(log, startOfDay(now)),
    [log, now],
  );
  const todayTotals = useMemo(() => sumMacros(today), [today]);

  // Compute streak (consecutive days with at least 1 meal, including today)
  // Streak + best-streak computation. The current streak is consecutive days
  // with at least 1 meal (counting from today). The longest streak is the
  // longest such run anywhere in the log (up to the last 90 days — enough
  // for MVP without becoming O(n²)).
  const { current: streak, longest: longestStreak } = useMemo(() => {
    const oneDay = 86_400_000;
    const today = startOfDay(now);
    // Build day-buckets for the last 90 days, oldest first.
    const days: { start: number; has: boolean }[] = [];
    for (let i = 89; i >= 0; i--) {
      const ds = today - i * oneDay;
      days.push({
        start: ds,
        has: entriesForDay(log, ds).length > 0,
      });
    }
    // Current streak: walk back from today, stop on first empty day.
    let current = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].has) current++;
      else if (i === days.length - 1) continue; // today can be empty without breaking the streak display
      else break;
    }
    // Longest streak anywhere.
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
    return { current, longest };
  }, [log, now]);

  const onCapture = () => {
    sessionStorage.removeItem("calora:pending-estimate");
    sessionStorage.removeItem("calora:pending-result");
    setView("capture");
  };

  const onHome = () => {
    sessionStorage.removeItem("calora:pending-estimate");
    sessionStorage.removeItem("calora:pending-result");
    setView("home");
  };

  return (
    <main className="mx-auto w-full max-w-md min-h-[100dvh] flex flex-col bg-[var(--canvas)]">
      <div
        key={view}
        className={view === "home" ? "flex-1 flex flex-col" : "page-forward flex-1 flex flex-col"}
      >
        {view === "home" && (
          <HomeView
            today={today}
            todayTotals={todayTotals}
            goal={settings.goalCalories}
            streak={streak}
            longestStreak={longestStreak}
            onCapture={onCapture}
            onHistory={() => setView("history")}
            onSettings={() => setView("settings")}
            onRemove={(id) => {
              // Locate the entry so the undo toast can restore it.
              const removed = log.find((e) => e.id === id);
              setLog(removeEntry(id));
              if (removed) {
                toast(`Removed "${removed.items[0]?.name ?? "meal"}"`, {
                  kind: "danger",
                  undo: () => {
                    setLog((cur) => {
                      const next = [...cur, removed].sort(
                        (a, b) => a.loggedAt - b.loggedAt,
                      );
                      return next;
                    });
                  },
                });
              }
            }}
            onOpenMeal={(id) => {
              sessionStorage.setItem("calora:open-meal-id", id);
              setView("meal-detail");
            }}
          />
        )}
        {view === "capture" && (
          <CaptureView
            onCancel={onHome}
            onEstimate={(req) => {
              // Enforce free-tier limit before kicking off the API call.
              // The scan is consumed INSIDE LoadingView.onDone — only counted on success —
              // so a failed/timeout request doesn't burn a free scan.
              if (isOverFreeLimit()) {
                track("free_limit_hit");
                setUpgradeOpen(true);
                return;
              }
              track("scan_start", { hasImage: !!req.image });
              sessionStorage.setItem(
                "calora:pending-estimate",
                JSON.stringify(req),
              );
              setView("loading");
            }}
            recentEntries={log.slice(0, 5)}
            scansRemaining={scanRemaining}
          />
        )}
        {view === "loading" && (
          <LoadingView
            onDone={(result) => {
              // Scan counted ONLY after the API returns a usable result — a timeout or
              // 5xx from upstream does not consume a free scan, so the user can retry.
              recordScan();
              setScanRemaining(scansRemaining());
              track("scan_complete", {
                items: result.items.length,
                confidence: result.confidence,
              });
              sessionStorage.setItem(
                "calora:pending-result",
                JSON.stringify(result),
              );
              setView("edit");
            }}
            onError={() => {
              track("scan_error");
              onHome();
            }}
          />
        )}
        {view === "edit" && (
          <EditView
            onCancel={() => setView("capture")}
            onSave={(entry) => {
              setLog(addEntry(entry));
              track("scan_save", {
                items: entry.items.length,
                source: entry.source,
              });
              onHome();
            }}
            onFavorite={(entry) => {
              addFavorite({
                name: entry.items[0]?.name ?? "Meal",
                items: entry.items,
                sourceMealId: entry.id,
              });
              track("favorite_add", { mealId: entry.id });
              toast("Saved to favorites", { kind: "success" });
            }}
          />
        )}
        {view === "history" && (
          <HistoryView
            log={log}
            onBack={onHome}
            onRemove={(id) => {
            const removed = log.find((e) => e.id === id);
            setLog(removeEntry(id));
            if (removed) {
              toast(`Removed "${removed.items[0]?.name ?? "meal"}"`, {
                kind: "danger",
                undo: () => {
                  setLog((cur) =>
                    [...cur, removed].sort((a, b) => a.loggedAt - b.loggedAt),
                  );
                },
              });
            }
          }}
        />
        )}
        {view === "settings" && (
          <SettingsView
            settings={settings}
            onSave={(s) => {
              saveSettings(s);
              setSettings(s);
              setView("home");
            }}
            onBack={onHome}
          />
        )}
        {view === "meal-detail" && (
          <MealDetailView
            log={log}
            onBack={onHome}
            onRemove={(id) => {
              const removed = log.find((e) => e.id === id);
              setLog(removeEntry(id));
              if (removed) {
                toast(`Removed "${removed.items[0]?.name ?? "meal"}"`, {
                  kind: "danger",
                  undo: () => {
                    setLog((cur) =>
                      [...cur, removed].sort((a, b) => a.loggedAt - b.loggedAt),
                    );
                  },
                });
              }
              onHome();
            }}
          />
        )}
      </div>
      <ToastHost />

      {view === "onboarding" && (
        <OnboardingView
          initialGoal={settings.goalCalories}
          onComplete={(goal) => {
            track("onboarding_complete", { goal });
            if (goal !== settings.goalCalories) {
              const next = { goalCalories: goal };
              saveSettings(next);
              setSettings(next);
            }
            saveOnboarding({
              startedAt: Date.now(),
              step: 3,
              completedAt: Date.now(),
              pickedGoal: goal,
            });
            setView("home");
          }}
          onSkip={() => {
            track("onboarding_skip");
            saveOnboarding({
              startedAt: Date.now(),
              step: 0,
              completedAt: Date.now(),
            });
            setView("home");
          }}
        />
      )}

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        onUpgrade={() => {
          track("upgrade_cta_click", { source: "free_limit" });
          // Post-MVP: redirect to /api/stripe/checkout
          toast(
            "Pro checkout is coming soon — email hello@calora.app and we'll get you set up.",
            { kind: "info" },
          );
          setUpgradeOpen(false);
        }}
      />
    </main>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// HOME VIEW
// ════════════════════════════════════════════════════════════════════════════════

function HomeView({
  today,
  todayTotals,
  goal,
  streak,
  longestStreak,
  onCapture,
  onHistory,
  onSettings,
  onRemove,
  onOpenMeal,
}: {
  today: MealEntry[];
  todayTotals: Macros;
  goal: number;
  streak: number;
  longestStreak: number;
  onCapture: () => void;
  onHistory: () => void;
  onSettings: () => void;
  onRemove: (id: string) => void;
  onOpenMeal: (id: string) => void;
}) {
  const targets = macroTargets(goal);
  const consumed = todayTotals.calories;
  const remaining = Math.max(0, goal - consumed);
  const pct = Math.min(100, Math.round((consumed / Math.max(1, goal)) * 100));
  const overshoot = consumed > goal;

  const hour = new Date().getHours();
  const greeting =
    hour < 11 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <>
      {/* ───── Top bar ───── */}
      <header className="px-5 pt-6 pb-3 flex items-center justify-between">
        <Wordmark />
        <div className="flex items-center gap-1">
          <Button variant="secondary" size="sm" onClick={onHistory}>
            <IconHistory size={16} />
            History
          </Button>
          <IconButton label="Settings" onClick={onSettings}>
            <IconSettings size={20} />
          </IconButton>
        </div>
      </header>

      {/* ───── Hero / greeting + ring ───── */}
      <section className="px-5 pb-2">
        <p className="text-[13px] text-[var(--ink-muted)] mb-3">
          {greeting}. {today.length === 0
            ? "Let's start with today's first meal."
            : "Here's where you are today."}
        </p>

        <HeroRing
          value={consumed}
          goal={goal}
          remaining={remaining}
          pct={pct}
          overshoot={overshoot}
        />

        {/* Macro bars */}
        <div className="mt-7 space-y-3.5">
          <MacroBar
            name="Protein"
            value={todayTotals.protein_g}
            target={targets.protein_g}
            color={MACRO_PROTEIN}
            icon={
              <span
                aria-hidden
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: MACRO_PROTEIN }}
              />
            }
          />
          <MacroBar
            name="Carbs"
            value={todayTotals.carbs_g}
            target={targets.carbs_g}
            color={MACRO_CARBS}
            icon={
              <span
                aria-hidden
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: MACRO_CARBS }}
              />
            }
          />
          <MacroBar
            name="Fat"
            value={todayTotals.fat_g}
            target={targets.fat_g}
            color={MACRO_FAT}
            icon={
              <span
                aria-hidden
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: MACRO_FAT }}
              />
            }
          />
        </div>

        {/* Primary CTA */}
        <Button
          variant="primary"
          size="lg"
          full
          className="mt-6"
          onClick={onCapture}
        >
          <IconCamera size={20} />
          Log a meal
        </Button>

        {(streak >= 1 || longestStreak >= 1) && (
          <div className="mt-3 flex items-center justify-center gap-3 text-[12px] text-[var(--ink-muted)]">
            {streak >= 1 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="text-[var(--accent)]">●</span>
                <span>
                  <span className="font-semibold tabular text-[var(--ink-soft)]">{streak}</span>
                  {" "}day streak
                </span>
              </span>
            )}
            {longestStreak >= 1 && longestStreak > streak && (
              <>
                <span className="opacity-30">·</span>
                <span>
                  Best <span className="font-semibold tabular text-[var(--ink-soft)]">{longestStreak}</span>
                </span>
              </>
            )}
          </div>
        )}
      </section>

      {/* ───── Today's meals ───── */}
      <section className="flex-1 px-5 pt-6 pb-8">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-[family-name:var(--font-display)] text-[20px] font-semibold tracking-tight">
            Today
          </h2>
          <span className="text-[12px] tabular text-[var(--ink-muted)]">
            {today.length} {today.length === 1 ? "meal" : "meals"}
          </span>
        </div>

        {today.length === 0 ? (
          <EmptyState
            icon={<IconLeaf size={22} />}
            title="No meals yet today"
            description="Snap a photo or describe what you ate — your progress rolls up here."
            action={
              <Button variant="primary" onClick={onCapture}>
                <IconCamera size={18} /> Log your first meal
              </Button>
            }
          />
        ) : (
          <ul className="space-y-2">
            {[...today]
              .sort((a, b) => b.loggedAt - a.loggedAt)
              .map((e) => (
                <MealCard
                  key={e.id}
                  entry={e}
                  onOpen={() => onOpenMeal(e.id)}
                  onRemove={() => onRemove(e.id)}
                />
              ))}
          </ul>
        )}
      </section>

      {/* ───── Bottom disclaimer ───── */}
      <footer className="px-5 pt-4 pb-6 text-center text-[11px] text-[var(--ink-muted)] leading-relaxed border-t border-[var(--hairline-soft)]">
        AI estimates are approximate — edit anything that looks wrong.
        <br />
        Calora is not a medical device.
      </footer>
    </>
  );
}

function HeroRing({
  value,
  goal,
  remaining,
  pct,
  overshoot,
}: {
  value: number;
  goal: number;
  remaining: number;
  pct: number;
  overshoot: boolean;
}) {
  const r = 78;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  // For empty state, render a tiny 2% dot at the top so the ring has SOMETHING
  // visible — looks intentional rather than broken/missing.
  const isEmpty = value === 0;
  const displayOffset = isEmpty ? c - 0.02 * c : offset;
  const dashArray = isEmpty ? `0.02 ${c}` : c;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[200px] h-[200px]">
        <svg width="200" height="200" viewBox="0 0 200 200" aria-hidden>
          <defs>
            <linearGradient id="heroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--accent)" />
              <stop offset="100%" stopColor="var(--accent-bright)" />
            </linearGradient>
          </defs>
          <circle
            cx="100"
            cy="100"
            r={r}
            fill="none"
            stroke="var(--surface-strong)"
            strokeWidth="14"
          />
          <circle
            cx="100"
            cy="100"
            r={r}
            fill="none"
            stroke={overshoot ? "var(--warning)" : "url(#heroGrad)"}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={dashArray}
            strokeDashoffset={displayOffset}
            transform="rotate(-90 100 100)"
            style={{
              transition:
                "stroke-dashoffset 700ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <div
            className={
              "font-[family-name:var(--font-display)] font-semibold tabular tracking-tight text-[var(--ink)] " +
              (isEmpty ? "text-[28px] text-[var(--ink-muted)]" : "text-[44px] leading-none")
            }
          >
            {isEmpty ? (
              <span className="inline-flex items-center gap-1">
                <IconLeaf size={20} className="opacity-50" />
                ready
              </span>
            ) : (
              value.toLocaleString()
            )}
          </div>
          <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--ink-muted)] tabular mt-1.5">
            of {goal.toLocaleString()} kcal
          </div>
        </div>
      </div>
      <div className="mt-4 text-[13px] font-medium text-center">
        {value === 0 ? (
          <span className="text-[var(--ink-muted)]">
            Log a meal to start tracking
          </span>
        ) : overshoot ? (
          <span style={{ color: "var(--warning)" }}>
            +{(value - goal).toLocaleString()} over today
          </span>
        ) : value < goal ? (
          <span className="text-[var(--ink-muted)]">
            {(goal - value).toLocaleString()} kcal left
          </span>
        ) : (
          <span className="inline-flex items-center gap-1" style={{ color: "var(--success)" }}>
            <IconCheck size={14} /> Goal hit · nice
          </span>
        )}
      </div>
    </div>
  );
}

function MealCard({
  entry,
  onOpen,
  onRemove,
}: {
  entry: MealEntry;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const time = new Date(entry.loggedAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const summary =
    entry.items.length === 1
      ? entry.items[0].name
      : entry.items.length === 0
        ? "No items"
        : `${entry.items.length} items`;
  // First-letter avatar from the meal type + color hint.
  const initial = entry.meal.charAt(0).toUpperCase();
  const mealColor =
    entry.meal === "breakfast" ? "var(--meal-breakfast)"
    : entry.meal === "lunch" ? "var(--meal-lunch)"
    : entry.meal === "dinner" ? "var(--meal-dinner)"
    : "var(--meal-snack)";

  return (
    <li>
      <Card
        className="p-2.5 flex gap-3 items-center cursor-pointer active:scale-[0.99] transition"
        onClick={onOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen();
          }
        }}
      >
        {/* Thumbnail or fallback avatar */}
        <div
          className="w-11 h-11 rounded-[11px] shrink-0 overflow-hidden flex items-center justify-center"
          aria-hidden
          style={!entry.imageDataUrl ? { background: `color-mix(in srgb, ${mealColor} 22%, var(--surface-soft))` } : {}}
        >
          {entry.imageDataUrl ? (
            <img
              src={entry.imageDataUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <span
              className="font-[family-name:var(--font-display)] text-[16px] font-semibold"
              style={{ color: mealColor }}
            >
              {initial}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--ink-muted)]">
            <span className="tabular">{time}</span>
            <span>·</span>
            <span className="capitalize">{entry.meal}</span>
          </div>
          <div className="text-[14px] font-medium text-[var(--ink)] truncate mt-0.5">
            {summary}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] tabular text-[var(--ink-muted)] mt-1">
            <span style={{ color: MACRO_PROTEIN }}>P{entry.totals.protein_g}g</span>
            <span className="text-[var(--hairline)]">·</span>
            <span style={{ color: MACRO_CARBS }}>C{entry.totals.carbs_g}g</span>
            <span className="text-[var(--hairline)]">·</span>
            <span style={{ color: MACRO_FAT }}>F{entry.totals.fat_g}g</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="font-semibold text-[15px] tabular text-[var(--ink)] leading-none">
            {entry.totals.calories}
            <span className="text-[11px] font-normal text-[var(--ink-muted)] ml-0.5">
              kcal
            </span>
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="text-[var(--ink-muted)] hover:text-[var(--danger)] transition"
            aria-label="Remove meal"
          >
            <IconClose size={14} />
          </button>
        </div>
      </Card>
    </li>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// CAPTURE VIEW
// ════════════════════════════════════════════════════════════════════════════════

function CaptureView({
  onCancel,
  onEstimate,
  recentEntries,
  scansRemaining,
}: {
  onCancel: () => void;
  onEstimate: (req: {
    image?: string;
    text?: string;
    meal: MealType;
  }) => void;
  recentEntries: MealEntry[];
  scansRemaining: number;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [meal, setMeal] = useState<MealType>("lunch");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [heicHint, setHeicHint] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setErr(null);
    setHeicHint(false);
    setBusy(true);
    try {
      const MAX_MB = 30;
      if (file.size > MAX_MB * 1024 * 1024) {
        throw new Error(
          `Image is ${(file.size / 1024 / 1024).toFixed(1)}MB; please pick one under ${MAX_MB}MB.`,
        );
      }
      const result = await compressImageSafe(file, 1024, 0.82);
      if (!result.ok) {
        if (result.heicHint) setHeicHint(true);
        throw new Error(result.userMessage);
      }
      setPhotoPreview(result.dataUrl);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submitPhoto = () => {
    if (!photoPreview) return;
    onEstimate({ image: photoPreview, meal });
  };

  const handleText = () => {
    const t = text.trim();
    if (!t) return;
    onEstimate({ text: t, meal });
  };

  // Text suggestions derived from last 5 meals' item names
  const suggestions = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const e of recentEntries) {
      const label = e.items.map((i) => i.name).join(", ");
      if (label && !seen.has(label)) {
        seen.add(label);
        out.push(label);
      }
      if (out.length >= 3) break;
    }
    return out;
  }, [recentEntries]);

  const EXAMPLES = [
    "chicken caesar salad, large",
    "2 chapatis with dal tadka",
    "oat latte + croissant",
  ];

  return (
    <>
      <PageHeader
        back={
          <IconButton label="Back" onClick={onCancel}>
            <IconChevronLeft size={20} />
          </IconButton>
        }
        title="Log a meal"
        subtitle={
          scansRemaining > 0
            ? `Photo or text works. AI reads it in about 5 seconds. ${scansRemaining} ${scansRemaining === 1 ? "scan" : "scans"} left today.`
            : "Photo or text works. AI reads it in about 5 seconds. Daily free limit reached — upgrade for unlimited."
        }
        right={
          <PillToggle
            options={MEAL_OPTIONS}
            value={meal}
            onChange={setMeal}
            ariaLabel="Meal type"
          />
        }
      />

      {/* ───── Primary: photo ───── */}
      <section className="px-5 pb-4">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
          className="hidden"
        />
        {/* Camera-only input (iOS Safari respects capture to launch the camera directly) */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
          className="hidden"
        />

        {photoPreview ? (
          <Card className="overflow-hidden">
            <img
              src={photoPreview}
              alt="preview"
              className="w-full max-h-[280px] object-cover"
            />
            <div className="p-3 flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPhotoPreview(null)}
              >
                <IconClose size={16} /> Discard
              </Button>
              <Button
                variant="primary"
                size="md"
                full
                onClick={submitPhoto}
              >
                <IconSparkle size={16} /> Estimate from this photo
              </Button>
            </div>
          </Card>
        ) : (
          <button
            disabled={busy}
            onClick={() => {
              // Smart default: mobile gets camera, desktop gets file picker.
              // Both inputs exist; this picks the right one.
              const mobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
              if (mobile) cameraRef.current?.click();
              else fileRef.current?.click();
            }}
            className={[
              "w-full aspect-[4/3] rounded-[20px] border-2 border-dashed",
              "border-[var(--accent)] bg-[var(--accent-soft)]",
              "flex flex-col items-center justify-center gap-2",
              "active:scale-[0.99] transition",
              "disabled:opacity-50",
            ].join(" ")}
          >
            {busy ? (
              <>
                <div className="w-8 h-8 border-[3px] border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                <span className="text-[14px] font-medium text-[var(--accent-hover)]">
                  Reading your photo…
                </span>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-[var(--surface-card)] flex items-center justify-center text-[var(--accent)] shadow-sm">
                  <IconCamera size={24} />
                </div>
                <span className="text-[15px] font-semibold text-[var(--ink)]">
                  Tap to add a photo
                </span>
                <span className="text-[12px] text-[var(--ink-muted)]">
                  Camera on mobile · files on desktop
                </span>
              </>
            )}
          </button>
        )}

        {/* Explicit secondary actions — users who want to be specific */}
        {!photoPreview && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              disabled={busy}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-[12px] bg-[var(--surface-soft)] hover:bg-[var(--surface-strong)] text-[12px] font-medium text-[var(--ink-soft)] active:scale-[0.98] transition disabled:opacity-50"
            >
              <IconCamera size={13} /> Take photo
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-[12px] bg-[var(--surface-soft)] hover:bg-[var(--surface-strong)] text-[12px] font-medium text-[var(--ink-soft)] active:scale-[0.98] transition disabled:opacity-50"
            >
              <IconUpload size={13} /> Choose file
            </button>
          </div>
        )}

        {err && (
          <div
            className="mt-3 rounded-[14px] border border-[var(--danger)]/30 bg-[var(--danger)]/[0.06] px-3 py-2.5"
            role="alert"
          >
            <p className="text-[12px] text-[var(--danger)] leading-relaxed">
              {err}
            </p>
            {heicHint && (
              <p className="mt-2 text-[11px] text-[var(--ink-soft)] leading-relaxed">
                Tip: in iOS Settings → Camera → Formats, switch to{" "}
                <strong>Most Compatible</strong> so photos save as JPEG. Or just
                type what you ate below.
              </p>
            )}
          </div>
        )}
      </section>

      {/* ───── Divider ───── */}
      <div className="px-5 my-4 flex items-center gap-3 text-[11px] uppercase tracking-[0.1em] text-[var(--ink-muted)]">
        <div className="flex-1 h-px bg-[var(--hairline)]" />
        or describe it
        <div className="flex-1 h-px bg-[var(--hairline)]" />
      </div>

      {/* ───── Secondary: text ───── */}
      <section className="px-5 pb-5">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. 2 scrambled eggs with butter and toast"
          rows={3}
          className={[
            "w-full p-3.5 rounded-[16px] resize-none",
            "bg-[var(--surface-card)] border border-[var(--hairline)]",
            "text-[14px] leading-relaxed text-[var(--ink)]",
            "placeholder:text-[var(--ink-muted)]",
            "focus:outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]",
            "transition",
          ].join(" ")}
        />

        {/* Hint when empty + no recent meals — primes first-time users */}
        {!text.trim() && suggestions.length === 0 && (
          <p className="mt-2 text-[11px] text-[var(--ink-muted)]">
            Try one of the examples below or describe your meal in your own words.
          </p>
        )}

        {/* Suggestion chips: recent dupes */}
        {suggestions.length > 0 && (
          <div className="mt-3">
            <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--ink-muted)] mb-1.5">
              Repeat a recent meal
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setText(s)}
                  className={[
                    "shrink-0 max-w-[200px] truncate",
                    "px-3 py-1.5 rounded-full text-[12px]",
                    "bg-[var(--surface-soft)] text-[var(--ink-soft)]",
                    "hover:bg-[var(--surface-strong)] active:scale-95 transition",
                  ].join(" ")}
                  title={s}
                >
                  ↻ {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Examples for first-timers */}
        {suggestions.length === 0 && (
          <div className="mt-3">
            <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--ink-muted)] mb-1.5">
              Try one of these
            </p>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setText(ex)}
                  className={[
                    "px-3 py-1.5 rounded-full text-[12px]",
                    "bg-[var(--surface-soft)] text-[var(--ink-soft)]",
                    "hover:bg-[var(--surface-strong)] active:scale-95 transition",
                  ].join(" ")}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        <Button
          variant="primary"
          size="lg"
          full
          className="mt-5"
          disabled={!text.trim()}
          onClick={handleText}
        >
          <IconSparkle size={16} />
          {text.trim() ? "Estimate from text" : "Type something above to estimate"}
        </Button>
      </section>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// LOADING VIEW
// ════════════════════════════════════════════════════════════════════════════════

function LoadingView({
  onDone,
  onError,
}: {
  onDone: (r: EstimateResult) => void;
  onError: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const STAGES = [
    "Reading your photo…",
    "Identifying foods…",
    "Estimating portions…",
    "Almost done…",
  ];

  useEffect(() => {
    const stageInterval = setInterval(() => {
      setStage((s) => Math.min(STAGES.length - 1, s + 1));
    }, 1500);
    const tick = setInterval(
      () => setProgress((p) => Math.min(95, p + 4)),
      120,
    );

    const run = async () => {
      const raw = sessionStorage.getItem("calora:pending-estimate");
      if (!raw) {
        setErr("No request found");
        return;
      }
      const req = JSON.parse(raw) as {
        image?: string;
        text?: string;
        meal: MealType;
      };

      // Client-side fetch timeout — fails fast so the user can retry. Server cap is 90s but
      // Cloudflare free proxy times out at 100s; stay well under both.
      const CLIENT_FETCH_TIMEOUT_MS = 50_000;

      const tryOnce = async (attempt: number): Promise<void> => {
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), CLIENT_FETCH_TIMEOUT_MS);
        let res: Response;
        try {
          res = await fetch("/api/estimate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              image: req.image,
              text: req.text,
              context: { meal: req.meal },
            }),
            signal: ac.signal,
          });
        } finally {
          clearTimeout(timer);
        }
        if (!res.ok) {
          // 429 (rate limit) and 5xx → worth a single retry. 4xx (except 429) → fail.
          const retriable = res.status === 429 || res.status >= 500;
          if (retriable && attempt < 1) return tryOnce(attempt + 1);
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        if (!data.items || !data.totals) {
          if (attempt < 1) return tryOnce(attempt + 1);
          throw new Error("Malformed response");
        }
        sessionStorage.removeItem("calora:pending-estimate");
        onDone(data as EstimateResult);
      };

      try {
        await tryOnce(0);
        setProgress(100);
      } catch (e) {
        setErr((e as Error).message);
        setProgress(100);
      } finally {
        clearInterval(tick);
        clearInterval(stageInterval);
      }
    };

    void run();
    return () => {
      clearInterval(tick);
      clearInterval(stageInterval);
    };
  }, [onDone]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      {err ? (
        <>
          <div className="w-14 h-14 rounded-full bg-[var(--danger-soft)] text-[var(--danger)] flex items-center justify-center mb-4">
            <IconClose size={26} />
          </div>
          <h2 className="font-[family-name:var(--font-display)] text-[20px] font-semibold mb-1">
            Something went wrong
          </h2>
          <p className="text-[13px] text-[var(--ink-muted)] max-w-[280px] mb-6">
            {err}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onError}>
              Try again
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="relative w-20 h-20 mb-6">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                stroke="var(--surface-strong)"
                strokeWidth="6"
              />
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 34}
                strokeDashoffset={
                  2 * Math.PI * 34 - (progress / 100) * 2 * Math.PI * 34
                }
                style={{
                  transition:
                    "stroke-dashoffset 120ms cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[var(--accent)]">
              <IconSparkle size={28} />
            </div>
          </div>

          <p className="text-[15px] font-medium text-[var(--ink)] mb-1">
            {STAGES[stage]}
          </p>
          <p className="text-[12px] text-[var(--ink-muted)]">
            Usually takes 3–10 seconds
          </p>
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// EDIT / RESULT VIEW
// ════════════════════════════════════════════════════════════════════════════════

function EditView({
  onCancel,
  onSave,
  onFavorite,
}: {
  onCancel: () => void;
  onSave: (e: MealEntry) => void;
  onFavorite?: (e: MealEntry) => void;
}) {
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [meal, setMeal] = useState<MealType>("lunch");
  const [pendingImage, setPendingImage] = useState<string | undefined>();

  useEffect(() => {
    const raw = sessionStorage.getItem("calora:pending-result");
    const reqRaw = sessionStorage.getItem("calora:pending-estimate");
    if (raw) setResult(JSON.parse(raw));
    if (reqRaw) {
      try {
        const req = JSON.parse(reqRaw) as {
          image?: string;
          text?: string;
          meal: MealType;
        };
        setMeal(req.meal);
        setPendingImage(req.image);
      } catch {}
    }
  }, []);

  if (!result) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <p className="text-[15px] text-[var(--ink)] mb-3">No result to edit.</p>
        <Button variant="secondary" onClick={onCancel}>
          Back
        </Button>
      </div>
    );
  }

  const updateItem = (idx: number, patch: Partial<FoodItem>) => {
    const items = result.items.map((it, i) =>
      i === idx ? { ...it, ...patch } : it,
    );
    const totals = sumMacrosHelper(items);
    setResult({ ...result, items, totals });
  };

  const removeItem = (idx: number) => {
    const items = result.items.filter((_, i) => i !== idx);
    const totals = sumMacrosHelper(items);
    setResult({ ...result, items, totals });
  };

  const addItem = () => {
    const items = [
      ...result.items,
      { name: "New item", calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    ];
    const totals = sumMacrosHelper(items);
    setResult({ ...result, items, totals });
  };

  return (
    <>
      <PageHeader
        back={
          <IconButton label="Discard" onClick={onCancel}>
            <IconClose size={20} />
          </IconButton>
        }
        title="Review estimate"
        right={
          <ConfidenceBadge level={result.confidence} />
        }
      />

      <div className="px-5 flex-1 pb-32">
        {pendingImage && (
          <Card className="overflow-hidden mb-4">
            <img
              src={pendingImage}
              alt="meal"
              className="w-full max-h-[200px] object-cover"
            />
          </Card>
        )}

        {/* Meal type pills */}
        <div className="mb-4">
          <PillToggle
            options={MEAL_OPTIONS}
            value={meal}
            onChange={setMeal}
            ariaLabel="Meal type"
          />
        </div>

        {/* Items */}
        <div className="space-y-2">
          {result.items.length === 0 ? (
            <Card className="p-5 text-center">
              <p className="text-[14px] text-[var(--ink-muted)] mb-3">
                The AI couldn&apos;t identify items. Add them manually.
              </p>
              <Button variant="primary" size="sm" onClick={addItem}>
                <IconPlus size={14} /> Add first item
              </Button>
            </Card>
          ) : (
            result.items.map((it, i) => (
              <ItemRow
                key={i}
                item={it}
                onChange={(p) => updateItem(i, p)}
                onRemove={() => removeItem(i)}
              />
            ))
          )}

          {result.items.length > 0 && (
            <button
              onClick={addItem}
              className="text-[13px] text-[var(--ink-muted)] hover:text-[var(--accent)] px-2 py-2 transition flex items-center gap-1"
            >
              <IconPlus size={14} /> Add item
            </button>
          )}
        </div>

        {result.notes && (
          <div className="mt-4 px-3 py-2 rounded-[12px] bg-[var(--surface-soft)] text-[12px] text-[var(--ink-soft)] italic">
            {result.notes}
          </div>
        )}
      </div>

      {/* Sticky footer with total + save */}
      <div className="sticky bottom-0 left-0 right-0 px-5 pt-4 pb-[max(20px,env(safe-area-inset-bottom))] bg-gradient-to-t from-[var(--canvas)] via-[var(--canvas)] to-transparent">
        <Card className="p-4 backdrop-blur-md bg-[var(--surface-card)]/95">
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                Total
              </div>
              <div className="font-[family-name:var(--font-display)] text-[34px] font-semibold tabular leading-none tracking-tight">
                {result.totals.calories.toLocaleString()}
                <span className="text-[14px] font-normal text-[var(--ink-muted)] ml-1.5">
                  kcal
                </span>
              </div>
            </div>
            <div className="text-right text-[11px] tabular text-[var(--ink-muted)] leading-tight">
              <div>P {result.totals.protein_g}g</div>
              <div>C {result.totals.carbs_g}g</div>
              <div>F {result.totals.fat_g}g</div>
            </div>
          </div>
          <div className="flex gap-2">
            {onFavorite && (
              <Button
                variant="secondary"
                size="lg"
                onClick={() =>
                  onFavorite({
                    id: uuid(),
                    loggedAt: Date.now(),
                    meal,
                    items: result.items,
                    totals: result.totals,
                    source: pendingImage ? "photo" : "text",
                    imageDataUrl: pendingImage,
                    notes: result.notes,
                  })
                }
                aria-label="Save to favorites"
              >
                ★ Favorite
              </Button>
            )}
            <Button
              variant="primary"
              size="lg"
              full
              disabled={result.items.length === 0 || result.totals.calories === 0}
              onClick={() =>
                onSave({
                  id: uuid(),
                  loggedAt: Date.now(),
                  meal,
                  items: result.items,
                  totals: result.totals,
                  source: pendingImage ? "photo" : "text",
                  imageDataUrl: pendingImage,
                  notes: result.notes,
                })
              }
            >
              <IconCheck size={18} />
              Save to today
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}

function ItemRow({
  item,
  onChange,
  onRemove,
}: {
  item: FoodItem;
  onChange: (p: Partial<FoodItem>) => void;
  onRemove: () => void;
}) {
  return (
    <Card className="p-3">
      <div className="flex items-start gap-2">
        <input
          value={item.name}
          onChange={(e) => onChange({ name: e.target.value })}
          aria-label="Item name"
          className="flex-1 bg-transparent text-[14px] font-medium outline-none placeholder:text-[var(--ink-muted)] min-w-0"
        />
        <div className="flex items-center gap-1 shrink-0">
          <input
            type="number"
            value={item.calories}
            onChange={(e) =>
              onChange({
                calories: Math.max(0, parseInt(e.target.value) || 0),
              })
            }
            aria-label="Calories"
            className="w-[64px] text-right tabular text-[14px] font-semibold bg-transparent outline-none"
          />
          <button
            onClick={onRemove}
            className="text-[var(--ink-muted)] hover:text-[var(--danger)] transition"
            aria-label="Remove item"
          >
            <IconClose size={16} />
          </button>
        </div>
      </div>
      <div className="flex gap-1.5 mt-2">
        <MicroMacroPill color={MACRO_PROTEIN} label="P" value={item.protein_g} />
        <MicroMacroPill color={MACRO_CARBS} label="C" value={item.carbs_g} />
        <MicroMacroPill color={MACRO_FAT} label="F" value={item.fat_g} />
      </div>
    </Card>
  );
}

function MicroMacroPill({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium tabular"
      style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}
    >
      <span className="font-bold">{label}</span>
      <span>{value}g</span>
    </span>
  );
}

function sumMacrosHelper(items: FoodItem[]): Macros {
  return items.reduce<Macros>(
    (acc, it) => ({
      calories: acc.calories + it.calories,
      protein_g: acc.protein_g + it.protein_g,
      carbs_g: acc.carbs_g + it.carbs_g,
      fat_g: acc.fat_g + it.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// HISTORY VIEW
// ════════════════════════════════════════════════════════════════════════════════

function HistoryView({
  log,
  onBack,
  onRemove,
}: {
  log: MealEntry[];
  onBack: () => void;
  onRemove: (id: string) => void;
}) {
  const days = useMemo(() => {
    const out: { dayStart: number; entries: MealEntry[]; total: number }[] = [];
    const today = startOfDay(Date.now());
    for (let i = 0; i < 7; i++) {
      const ds = today - i * 86_400_000;
      const entries = entriesForDay(log, ds);
      out.push({
        dayStart: ds,
        entries,
        total: sumMacros(entries).calories,
      });
    }
    return out;
  }, [log]);

  const maxDayTotal = Math.max(...days.map((d) => d.total), 1);
  const weekTotal = days.reduce((s, d) => s + d.total, 0);
  const weekAvg = Math.round(weekTotal / 7);

  return (
    <>
      <PageHeader
        back={
          <IconButton label="Back" onClick={onBack}>
            <IconChevronLeft size={20} />
          </IconButton>
        }
        title="Last 7 days"
        subtitle={`Avg ${weekAvg.toLocaleString()} kcal/day · ${weekTotal.toLocaleString()} total`}
        right={
          <Button
            variant="ghost"
            size="sm"
            disabled={log.length === 0}
            onClick={() => {
              const csv = exportToCSV(log);
              const stamp = new Date().toISOString().slice(0, 10);
              downloadCSV(`calora-${stamp}.csv`, csv);
            }}
          >
            <IconDownload size={14} /> CSV
          </Button>
        }
      />

      <div className="px-5 pb-5 flex-1">
        {/* Bar chart — proportional bars sized relative to the week max, with
            kcal values on the y-axis, day names below. */}
        <Card className="p-4 mb-4">
          <div className="flex items-baseline justify-between mb-4">
            <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--ink-muted)]">
              Daily totals
            </div>
            <div className="text-[10px] text-[var(--ink-muted)] tabular">
              max {maxDayTotal.toLocaleString()} kcal
            </div>
          </div>
          <div className="flex items-stretch justify-between gap-2 h-[140px] pt-6 pb-1">
            {days.map((d) => {
              const ratio = maxDayTotal > 0 ? d.total / maxDayTotal : 0;
              const h = Math.max(6, ratio * 100); // min 6% so empty days still render a stub
              const label =
                d.dayStart === startOfDay(Date.now())
                  ? "Today"
                  : new Date(d.dayStart).toLocaleDateString([], {
                      weekday: "short",
                    });
              const dateLabel = new Date(d.dayStart).getDate();
              const isToday = d.dayStart === startOfDay(Date.now());
              const hasData = d.total > 0;
              return (
                <div
                  key={d.dayStart}
                  className="flex-1 flex flex-col items-center justify-end min-w-0 relative"
                  title={`${label} ${dateLabel}: ${d.total.toLocaleString()} kcal`}
                >
                  {/* number above the bar (inside the chart area) */}
                  <span
                    className={
                      "absolute top-[-22px] left-1/2 -translate-x-1/2 text-[10px] tabular font-semibold whitespace-nowrap " +
                      (hasData ? "text-[var(--ink)]" : "text-[var(--ink-muted)]")
                    }
                  >
                    {hasData ? d.total.toLocaleString() : "—"}
                  </span>
                  <div
                    className="w-full transition-all duration-700 rounded-t-[6px] relative"
                    style={{
                      height: `${h}%`,
                      background: hasData
                        ? isToday
                          ? "var(--accent)"
                          : "var(--accent-soft)"
                        : "var(--surface-strong)",
                      border: hasData
                        ? isToday
                          ? "none"
                          : "1px solid var(--accent)"
                        : "none",
                      minHeight: "4px",
                    }}
                  />
                </div>
              );
            })}
          </div>
          {/* Day labels row — separate so it doesn't get crushed by flex stretching */}
          <div className="flex items-stretch justify-between gap-2 mt-2 pt-2 border-t border-[var(--hairline-soft)]">
            {days.map((d) => {
              const isToday = d.dayStart === startOfDay(Date.now());
              const label =
                d.dayStart === startOfDay(Date.now())
                  ? "Today"
                  : new Date(d.dayStart).toLocaleDateString([], {
                      weekday: "short",
                    });
              const dateLabel = new Date(d.dayStart).getDate();
              return (
                <div
                  key={d.dayStart}
                  className="flex-1 flex flex-col items-center min-w-0 text-center"
                >
                  <span
                    className={
                      "text-[10px] font-medium truncate w-full " +
                      (isToday ? "text-[var(--accent)]" : "text-[var(--ink-muted)]")
                    }
                  >
                    {label}
                  </span>
                  <span className="text-[9px] text-[var(--ink-muted)] tabular">
                    {dateLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Day sections */}
        {days.every((d) => d.entries.length === 0) ? (
          <EmptyState
            icon={<IconHistory size={22} />}
            title="Your week rolls up here"
            description="Once you start logging meals, you'll see daily breakdowns and totals."
          />
        ) : (
          <div className="space-y-2.5">
            {days.map((d) => {
              if (d.entries.length === 0) return null;
              const label =
                d.dayStart === startOfDay(Date.now())
                  ? "Today"
                  : new Date(d.dayStart).toLocaleDateString([], {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    });
              return (
                <Card key={d.dayStart} className="overflow-hidden">
                  <div className="flex items-center justify-between px-4 pt-3 pb-2">
                    <span className="text-[14px] font-semibold">{label}</span>
                    <span className="text-[12px] tabular text-[var(--ink-muted)]">
                      {d.total.toLocaleString()} kcal · {d.entries.length}{" "}
                      {d.entries.length === 1 ? "meal" : "meals"}
                    </span>
                  </div>
                  <ul className="px-2 pb-2">
                    {d.entries.map((e) => (
                      <li
                        key={e.id}
                        className="flex items-center gap-2 px-2 py-2 hover:bg-[var(--surface-soft)] rounded-[10px] transition"
                      >
                        <div className="w-8 h-8 rounded-[8px] shrink-0 overflow-hidden bg-[var(--surface-soft)] flex items-center justify-center text-[10px] text-[var(--ink-muted)]">
                          {e.imageDataUrl ? (
                            <img
                              src={e.imageDataUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            e.source === "photo" ? (
                              <IconCamera size={14} />
                            ) : (
                              <IconLeaf size={14} />
                            )
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] truncate text-[var(--ink)]">
                            {e.items.map((i) => i.name).join(", ") || "(no items)"}
                          </div>
                          <div className="text-[10px] text-[var(--ink-muted)]">
                            <span className="capitalize">{e.meal}</span>
                            <span> · </span>
                            <span className="tabular">
                              {new Date(e.loggedAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                        <span className="text-[13px] font-semibold tabular shrink-0">
                          {e.totals.calories}
                        </span>
                        <button
                          onClick={() => onRemove(e.id)}
                          className="text-[var(--ink-muted)] hover:text-[var(--danger)] ml-1"
                          aria-label="Remove meal"
                        >
                          <IconClose size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// SETTINGS VIEW
// ════════════════════════════════════════════════════════════════════════════════

function SettingsView({
  settings,
  onSave,
  onBack,
}: {
  settings: { goalCalories: number };
  onSave: (s: { goalCalories: number }) => void;
  onBack: () => void;
}) {
  const [goal, setGoal] = useState(settings.goalCalories);
  const saved = goal === settings.goalCalories;
  const targets = macroTargets(goal);

  return (
    <>
      <PageHeader
        back={
          <IconButton label="Back" onClick={onBack}>
            <IconChevronLeft size={20} />
          </IconButton>
        }
        title="Daily goal"
        subtitle="Calora fills the macros for you from this number."
      />

      <div className="px-5 flex-1 pb-8 space-y-5">
        {/* Hero number */}
        <Card className="p-5">
          <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--ink-muted)] mb-2">
            Daily calorie target
          </div>
          <div className="flex items-baseline gap-2">
            <input
              type="number"
              value={goal}
              onChange={(e) =>
                setGoal(Math.max(800, Math.min(5000, parseInt(e.target.value) || 0)))
              }
              step={50}
              className="flex-1 bg-transparent font-[family-name:var(--font-display)] text-[48px] font-semibold tabular tracking-tight outline-none"
              inputMode="numeric"
            />
            <span className="text-[14px] text-[var(--ink-muted)] pb-2">kcal</span>
          </div>

          {/* Slider */}
          <input
            type="range"
            min={1200}
            max={3500}
            step={50}
            value={Math.min(3500, Math.max(1200, goal))}
            onChange={(e) => setGoal(parseInt(e.target.value))}
            className="w-full mt-4 accent-[var(--accent)]"
          />

          {/* Tick presets */}
          <div className="flex justify-between gap-2 mt-3">
            {[1500, 1800, 2000, 2500].map((g) => (
              <button
                key={g}
                onClick={() => setGoal(g)}
                className={[
                  "flex-1 py-2 rounded-[12px] text-[13px] tabular font-medium transition",
                  goal === g
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--surface-soft)] text-[var(--ink-soft)] hover:bg-[var(--surface-strong)]",
                ].join(" ")}
              >
                {g}
              </button>
            ))}
          </div>
        </Card>

        {/* Macro preview */}
        <Card className="p-4">
          <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--ink-muted)] mb-3">
            Daily macro target at this goal
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-[14px] bg-[var(--surface-soft)] p-3">
              <div
                className="text-[22px] font-semibold tabular"
                style={{ color: MACRO_PROTEIN }}
              >
                {targets.protein_g}g
              </div>
              <div className="text-[11px] text-[var(--ink-muted)] mt-0.5">protein</div>
              <div className="text-[10px] text-[var(--ink-muted)]">30%</div>
            </div>
            <div className="rounded-[14px] bg-[var(--surface-soft)] p-3">
              <div
                className="text-[22px] font-semibold tabular"
                style={{ color: MACRO_CARBS }}
              >
                {targets.carbs_g}g
              </div>
              <div className="text-[11px] text-[var(--ink-muted)] mt-0.5">carbs</div>
              <div className="text-[10px] text-[var(--ink-muted)]">40%</div>
            </div>
            <div className="rounded-[14px] bg-[var(--surface-soft)] p-3">
              <div
                className="text-[22px] font-semibold tabular"
                style={{ color: MACRO_FAT }}
              >
                {targets.fat_g}g
              </div>
              <div className="text-[11px] text-[var(--ink-muted)] mt-0.5">fat</div>
              <div className="text-[10px] text-[var(--ink-muted)]">30%</div>
            </div>
          </div>
        </Card>

        {/* Save button — shows different state based on changes */}
        <Button
          variant="primary"
          size="lg"
          full
          disabled={saved || goal < 800 || goal > 5000}
          onClick={() => onSave({ goalCalories: goal })}
        >
          {saved ? (
            <>
              <IconCheck size={18} />
              All set — current goal
            </>
          ) : (
            <>
              <IconCheck size={18} />
              Save goal
            </>
          )}
        </Button>
        {saved && (
          <p className="text-center text-[11px] text-[var(--ink-muted)] -mt-3">
            Move the slider to change your goal.
          </p>
        )}

        {/* About / disclaimer */}
        <details className="rounded-[16px] bg-[var(--surface-soft)] px-4 py-3">
          <summary className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)] cursor-pointer">
            About & disclaimer
          </summary>
          <div className="mt-3 space-y-2 text-[12px] text-[var(--ink-soft)] leading-relaxed">
            <p>
              Calora is not a medical device. AI estimates are approximate —
              always edit anything that looks wrong before saving.
            </p>
            <p>
              Data lives on this device only. v0.1 — no account, no sync. Clearing
              browser data will erase your log.
            </p>
            <p className="text-[var(--ink-muted)]">
              Built by hand · MIT license · source on GitHub
            </p>
          </div>
        </details>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// MEAL DETAIL VIEW (when user taps a meal card on home)
// ════════════════════════════════════════════════════════════════════════════════

function MealDetailView({
  log,
  onBack,
  onRemove,
}: {
  log: MealEntry[];
  onBack: () => void;
  onRemove: (id: string) => void;
}) {
  const id = sessionStorage.getItem("calora:open-meal-id");
  const entry = log.find((e) => e.id === id);

  if (!entry) {
    return (
      <>
        <PageHeader
          back={
            <IconButton label="Back" onClick={onBack}>
              <IconChevronLeft size={20} />
            </IconButton>
          }
          title="Meal"
        />
        <EmptyState
          title="Couldn't find this meal"
          description="It may have been removed or you're in a different session."
          action={
            <Button variant="primary" onClick={onBack}>
              Back to home
            </Button>
          }
        />
      </>
    );
  }

  const time = new Date(entry.loggedAt).toLocaleString([], {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });

  return (
    <>
      <PageHeader
        back={
          <IconButton label="Back" onClick={onBack}>
            <IconChevronLeft size={20} />
          </IconButton>
        }
        title={
          <span className="capitalize">
            {entry.meal} ·{" "}
            <span className="text-[var(--ink-muted)] font-normal tabular text-[15px]">
              {new Date(entry.loggedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </span>
        }
        subtitle={time}
      />

      <div className="px-5 flex-1 pb-8">
        {entry.imageDataUrl && (
          <Card className="overflow-hidden mb-4">
            <img
              src={entry.imageDataUrl}
              alt={entry.items.map((i) => i.name).join(", ")}
              className="w-full max-h-[280px] object-cover"
            />
          </Card>
        )}

        <Card className="p-5 mb-4">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                Total
              </div>
              <div className="font-[family-name:var(--font-display)] text-[36px] font-semibold tabular leading-none tracking-tight">
                {entry.totals.calories.toLocaleString()}
                <span className="text-[14px] font-normal text-[var(--ink-muted)] ml-1.5">
                  kcal
                </span>
              </div>
            </div>
            <div className="text-right text-[11px] tabular">
              <div>
                <span style={{ color: MACRO_PROTEIN }} className="font-semibold">
                  {entry.totals.protein_g}g
                </span>{" "}
                <span className="text-[var(--ink-muted)]">P</span>
              </div>
              <div>
                <span style={{ color: MACRO_CARBS }} className="font-semibold">
                  {entry.totals.carbs_g}g
                </span>{" "}
                <span className="text-[var(--ink-muted)]">C</span>
              </div>
              <div>
                <span style={{ color: MACRO_FAT }} className="font-semibold">
                  {entry.totals.fat_g}g
                </span>{" "}
                <span className="text-[var(--ink-muted)]">F</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            {entry.items.map((item, i) => (
              <div
                key={i}
                className="flex items-baseline justify-between py-2 border-t border-[var(--hairline-soft)]"
              >
                <span className="text-[14px]">{item.name}</span>
                <span className="text-[13px] tabular font-semibold">
                  {item.calories} kcal
                </span>
              </div>
            ))}
          </div>
        </Card>

        {entry.notes && (
          <Card className="p-4 mb-4 bg-[var(--surface-soft)]">
            <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--ink-muted)] mb-1">
              AI note
            </div>
            <p className="text-[13px] text-[var(--ink-soft)] italic">{entry.notes}</p>
          </Card>
        )}

        <Button
          variant="danger"
          size="lg"
          full
          onClick={() => onRemove(entry.id)}
        >
          <IconTrash size={16} />
          Remove meal
        </Button>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// ONBOARDING VIEW — 3-step first-run wizard.
// Step 1: welcome + value prop
// Step 2: pick a calorie goal
// Step 3: try it — links directly to capture flow
// ════════════════════════════════════════════════════════════════════════════════

function OnboardingView({
  initialGoal,
  onComplete,
  onSkip,
}: {
  initialGoal: number;
  onComplete: (goal: number) => void;
  onSkip: () => void;
}) {
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState(initialGoal);

  const next = () => {
    track("onboarding_step_complete", { step });
    setStep((s) => Math.min(2, s + 1));
  };

  return (
    <div className="fixed inset-0 z-40 bg-[var(--canvas)] overflow-y-auto">
      <div className="mx-auto max-w-md min-h-[100dvh] flex flex-col px-5 pt-12 pb-8">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mb-10" aria-label={`Step ${step + 1} of 3`}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              aria-hidden
              className={[
                "h-1.5 rounded-full transition-all",
                i === step
                  ? "w-8 bg-[var(--accent)]"
                  : i < step
                  ? "w-1.5 bg-[var(--accent)]/50"
                  : "w-1.5 bg-[var(--surface-strong)]",
              ].join(" ")}
            />
          ))}
        </div>

        {step === 0 && (
          <div className="flex-1 flex flex-col">
            <div className="w-20 h-20 rounded-[24px] bg-[var(--accent-soft)] flex items-center justify-center mb-6 mx-auto">
              <IconCamera size={36} />
            </div>
            <h1 className="font-[family-name:var(--font-display)] text-[32px] font-semibold tracking-[-0.02em] text-[var(--ink)] text-center leading-[1.1] mb-3">
              Snap a meal.
              <br />
              Know your calories.
            </h1>
            <p className="text-[15px] text-[var(--ink-soft)] leading-relaxed text-center max-w-sm mx-auto mb-8">
              No signup. No database hunting. Open the app, snap the plate,
              done in about 5 seconds.
            </p>

            <ul className="space-y-3 mb-10">
              {[
                "Photo or text — your choice",
                "Edit anything before you save",
                "Your data stays on your device",
              ].map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-[14px] text-[var(--ink-soft)]">
                  <span className="w-5 h-5 rounded-full bg-[var(--success-soft)] text-[var(--success)] flex items-center justify-center shrink-0 mt-0.5">
                    <IconCheck size={12} />
                  </span>
                  {b}
                </li>
              ))}
            </ul>

            <div className="mt-auto space-y-3">
              <Button size="lg" full onClick={next}>
                Get started
              </Button>
              <button
                onClick={onSkip}
                className="block w-full text-center text-[13px] text-[var(--ink-muted)] hover:text-[var(--ink-soft)] py-2"
              >
                Skip — use default
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="flex-1 flex flex-col">
            <h1 className="font-[family-name:var(--font-display)] text-[28px] font-semibold tracking-[-0.02em] text-[var(--ink)] mb-2 leading-[1.15]">
              What&apos;s your daily calorie goal?
            </h1>
            <p className="text-[14px] text-[var(--ink-muted)] mb-8">
              The average adult needs 2,000–2,500 kcal. Adjust anytime in
              Settings.
            </p>

            <div className="rounded-[20px] bg-[var(--surface-card)] border border-[var(--hairline)] p-6 mb-6">
              <div className="flex items-baseline justify-between mb-3">
                <span className="font-[family-name:var(--font-display)] text-[44px] font-semibold tabular tracking-tight text-[var(--ink)]">
                  {goal.toLocaleString()}
                </span>
                <span className="text-[13px] text-[var(--ink-muted)]">kcal/day</span>
              </div>
              <input
                type="range"
                min={1200}
                max={3500}
                step={50}
                value={goal}
                onChange={(e) => setGoal(parseInt(e.target.value, 10))}
                aria-label="Daily calorie goal"
                className="w-full accent-[var(--accent)]"
              />
              <div className="flex justify-between text-[11px] text-[var(--ink-muted)] mt-2 tabular">
                <span>1,200</span>
                <span>2,000</span>
                <span>3,500</span>
              </div>
            </div>

            <div className="text-[13px] text-[var(--ink-soft)] mb-6 leading-relaxed">
              Target macros: <strong>{Math.round((goal * 0.3) / 4)}g protein</strong>,{" "}
              <strong>{Math.round((goal * 0.4) / 4)}g carbs</strong>,{" "}
              <strong>{Math.round((goal * 0.3) / 9)}g fat</strong>
              <span className="text-[var(--ink-muted)]"> (30 / 40 / 30 split)</span>
            </div>

            <div className="mt-auto">
              <Button size="lg" full onClick={next}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex-1 flex flex-col">
            <div className="w-20 h-20 rounded-[24px] bg-[var(--success-soft)] flex items-center justify-center mb-6 mx-auto">
              <IconSparkle size={36} />
            </div>
            <h1 className="font-[family-name:var(--font-display)] text-[28px] font-semibold tracking-[-0.02em] text-[var(--ink)] text-center leading-[1.15] mb-3">
              You&apos;re all set.
            </h1>
            <p className="text-[15px] text-[var(--ink-soft)] leading-relaxed text-center max-w-sm mx-auto mb-8">
              Try logging your next meal. Photo or text — both work.
            </p>

            <div className="space-y-2.5 mb-8">
              {[
                { label: "Take a photo", icon: <IconCamera size={16} /> },
                { label: "Type what you ate", icon: <IconSparkle size={16} /> },
                { label: "Edit before saving", icon: <IconCheck size={16} /> },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-[14px] bg-[var(--surface-card)] border border-[var(--hairline)] p-3.5"
                >
                  <span className="w-8 h-8 rounded-full bg-[var(--surface-soft)] text-[var(--ink-soft)] flex items-center justify-center shrink-0">
                    {item.icon}
                  </span>
                  <span className="text-[14px] font-medium text-[var(--ink)]">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-auto">
              <Button size="lg" full onClick={() => onComplete(goal)}>
                Open calora
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// UPGRADE MODAL — triggered when free tier limit is hit.
// Anti-dark-pattern: dismissible in one tap, no fake urgency, honest copy.
// ════════════════════════════════════════════════════════════════════════════════

function UpgradeModal({
  open,
  onClose,
  onUpgrade,
}: {
  open: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}) {
  useEffect(() => {
    if (open) track("upgrade_modal_view");
  }, [open]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 animate-[fadeIn_180ms_ease-out]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          track("upgrade_modal_dismiss");
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md rounded-[24px] bg-[var(--surface-card)] border border-[var(--hairline)] shadow-2xl p-6 animate-[slideUp_240ms_cubic-bezier(0.22,1,0.36,1)]">
        <div className="flex items-start justify-between mb-3">
          <div className="w-12 h-12 rounded-[16px] bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center">
            <IconSparkle size={22} />
          </div>
          <IconButton label="Close" onClick={onClose}>
            <IconClose size={18} />
          </IconButton>
        </div>

        <h2 id="upgrade-title" className="font-[family-name:var(--font-display)] text-[24px] font-semibold tracking-[-0.015em] text-[var(--ink)] leading-tight mb-2">
          You&apos;ve used your 5 free scans today.
        </h2>
        <p className="text-[14px] text-[var(--ink-soft)] leading-relaxed mb-5">
          Pro gives you unlimited scans, sync across devices, and weekly
          progress emails. Cancel anytime.
        </p>

        <ul className="space-y-2 mb-6">
          {[
            "Unlimited scans (5/day on free)",
            "Sync across phone + laptop",
            "Weekly progress emails",
            "7-day free trial, no surprise charges",
          ].map((f) => (
            <li key={f} className="flex items-start gap-2 text-[13.5px] text-[var(--ink-soft)]">
              <span className="w-4 h-4 rounded-full bg-[var(--success-soft)] text-[var(--success)] flex items-center justify-center shrink-0 mt-0.5">
                <IconCheck size={11} />
              </span>
              {f}
            </li>
          ))}
        </ul>

        <div className="flex items-baseline gap-1.5 mb-5">
          <span className="font-[family-name:var(--font-display)] text-[28px] font-semibold tabular tracking-tight text-[var(--ink)]">
            $4.99
          </span>
          <span className="text-[13px] text-[var(--ink-muted)]">/month</span>
          <span className="text-[12px] text-[var(--ink-muted)] ml-2">
            or $29.99/yr ($2.50/mo)
          </span>
        </div>

        <Button size="lg" full onClick={onUpgrade}>
          Start 7-day free trial
        </Button>
        <button
          onClick={() => {
            track("upgrade_modal_dismiss");
            onClose();
          }}
          className="block w-full text-center text-[13px] text-[var(--ink-muted)] hover:text-[var(--ink-soft)] mt-3 py-1"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
