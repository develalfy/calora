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
  removeEntry,
  saveSettings,
  startOfDay,
  sumMacros,
  updateEntry,
  uuid,
} from "@/lib/storage";
import { compressImage } from "@/lib/image";
import { downloadCSV, exportToCSV } from "@/lib/export";

type View = "home" | "capture" | "loading" | "edit" | "history" | "settings";

export default function HomePage() {
  const [view, setView] = useState<View>("home");
  const [log, setLog] = useState<MealEntry[]>([]);
  const [settings, setSettings] = useState({ goalCalories: 2000 });
  const [now, setNow] = useState<number>(() => Date.now());

  // Hydrate from localStorage on mount
  useEffect(() => {
    setLog(loadLog());
    setSettings(loadSettings());
  }, []);

  // Tick once a minute so "today" stays current if user keeps the app open
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const today = useMemo(() => entriesForDay(log, startOfDay(now)), [log, now]);
  const todayTotals = useMemo(() => sumMacros(today), [today]);

  return (
    <main className="mx-auto w-full max-w-md min-h-screen flex flex-col">
      {view === "home" && (
        <HomeView
          today={today}
          todayTotals={todayTotals}
          goal={settings.goalCalories}
          onCapture={() => setView("capture")}
          onHistory={() => setView("history")}
          onSettings={() => setView("settings")}
          onRemove={(id) => setLog(removeEntry(id))}
        />
      )}
      {view === "capture" && (
        <CaptureView
          onCancel={() => setView("home")}
          onEstimate={(req) => {
            // jump straight to loading — the parent sets pending request
            sessionStorage.setItem("calora:pending-estimate", JSON.stringify(req));
            setView("loading");
          }}
        />
      )}
      {view === "loading" && (
        <LoadingView
          onDone={(result) => {
            sessionStorage.setItem(
              "calora:pending-result",
              JSON.stringify(result),
            );
            setView("edit");
          }}
          onError={() => setView("capture")}
        />
      )}
      {view === "edit" && (
        <EditView
          onCancel={() => setView("home")}
          onSave={(entry) => {
            setLog(addEntry(entry));
            setView("home");
          }}
        />
      )}
      {view === "history" && (
        <HistoryView
          log={log}
          onBack={() => setView("home")}
          onRemove={(id) => setLog(removeEntry(id))}
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
          onBack={() => setView("home")}
        />
      )}
    </main>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Home view — today's log + ring + big CTA
// ──────────────────────────────────────────────────────────────────────────
function HomeView({
  today,
  todayTotals,
  goal,
  onCapture,
  onHistory,
  onSettings,
  onRemove,
}: {
  today: MealEntry[];
  todayTotals: Macros;
  goal: number;
  onCapture: () => void;
  onHistory: () => void;
  onSettings: () => void;
  onRemove: (id: string) => void;
}) {
  const pct = Math.min(100, Math.round((todayTotals.calories / goal) * 100));
  const remaining = Math.max(0, goal - todayTotals.calories);

  return (
    <div className="flex-1 flex flex-col p-4 gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Calora</h1>
        <div className="flex gap-2">
          <button
            onClick={onHistory}
            className="px-3 py-1.5 rounded-full text-sm bg-zinc-200 dark:bg-zinc-800"
          >
            History
          </button>
          <button
            onClick={onSettings}
            className="px-3 py-1.5 rounded-full text-sm bg-zinc-200 dark:bg-zinc-800"
          >
            Goal
          </button>
        </div>
      </header>

      <RingProgress percent={pct} value={todayTotals.calories} goal={goal} />

      <div className="grid grid-cols-3 gap-2 text-center">
        <Macro label="Protein" value={`${todayTotals.protein_g}g`} />
        <Macro label="Carbs" value={`${todayTotals.carbs_g}g`} />
        <Macro label="Fat" value={`${todayTotals.fat_g}g`} />
      </div>

      {remaining > 0 ? (
        <p className="text-center text-sm text-zinc-500">
          {remaining} kcal remaining today
        </p>
      ) : (
        <p className="text-center text-sm text-emerald-600">
          Daily goal hit 🎉
        </p>
      )}

      <button
        onClick={onCapture}
        className="mt-4 w-full py-4 rounded-2xl bg-emerald-500 text-white font-semibold text-lg shadow-lg active:scale-95 transition"
      >
        + Log a meal
      </button>

      <div className="flex-1 mt-4">
        <h2 className="text-sm font-medium text-zinc-500 mb-2">
          Today ({today.length})
        </h2>
        {today.length === 0 ? (
          <p className="text-sm text-zinc-400 italic">
            Nothing logged yet. Snap your first meal above.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {today
              .slice()
              .sort((a, b) => b.loggedAt - a.loggedAt)
              .map((e) => (
                <MealRow key={e.id} entry={e} onRemove={() => onRemove(e.id)} />
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Macro({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function MealRow({
  entry,
  onRemove,
}: {
  entry: MealEntry;
  onRemove: () => void;
}) {
  const time = new Date(entry.loggedAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const label = entry.items.map((i) => i.name).join(", ");
  return (
    <li className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 flex justify-between items-start gap-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span>{time}</span>
          <span className="capitalize">{entry.meal}</span>
          <span>·</span>
          <span>{entry.source === "photo" ? "📷" : "✏️"}</span>
        </div>
        <div className="text-sm truncate">{label || "Untitled"}</div>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-semibold tabular-nums">
          {entry.totals.calories}
        </span>
        <button
          onClick={onRemove}
          className="text-xs text-zinc-400 hover:text-red-500"
          aria-label="Delete"
        >
          ✕
        </button>
      </div>
    </li>
  );
}

function RingProgress({
  percent,
  value,
  goal,
}: {
  percent: number;
  value: number;
  goal: number;
}) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  return (
    <div className="flex justify-center my-4">
      <svg width="180" height="180" viewBox="0 0 180 180">
        <circle
          cx="90"
          cy="90"
          r={r}
          fill="none"
          stroke="currentColor"
          className="text-zinc-200 dark:text-zinc-800"
          strokeWidth="14"
        />
        <circle
          cx="90"
          cy="90"
          r={r}
          fill="none"
          stroke="#10b981"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform="rotate(-90 90 90)"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
        <text
          x="90"
          y="86"
          textAnchor="middle"
          className="fill-zinc-900 dark:fill-zinc-50"
          fontSize="28"
          fontWeight="700"
        >
          {value}
        </text>
        <text
          x="90"
          y="108"
          textAnchor="middle"
          className="fill-zinc-500"
          fontSize="13"
        >
          of {goal} kcal
        </text>
      </svg>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Capture view — photo or text entry
// ──────────────────────────────────────────────────────────────────────────
function CaptureView({
  onCancel,
  onEstimate,
}: {
  onCancel: () => void;
  onEstimate: (req: { image?: string; text?: string; meal: MealType }) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [meal, setMeal] = useState<MealType>("lunch");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setErr(null);
    setBusy(true);
    try {
      // Guard: too-large files are almost certainly going to OOM the canvas or fail to base64 in sessionStorage
      const MAX_MB = 30;
      if (file.size > MAX_MB * 1024 * 1024) {
        throw new Error(
          `Image is ${(file.size / 1024 / 1024).toFixed(1)}MB; please pick one under ${MAX_MB}MB.`,
        );
      }
      const dataUrl = await compressImage(file, 1024, 0.82);
      onEstimate({ image: dataUrl, meal });
    } catch (e) {
      setErr(`Could not process image: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleText = () => {
    const t = text.trim();
    if (!t) return;
    onEstimate({ text: t, meal });
  };

  return (
    <div className="flex-1 flex flex-col p-4 gap-4">
      <div className="flex items-center justify-between">
        <button onClick={onCancel} className="text-sm text-zinc-500">
          ← Cancel
        </button>
        <h1 className="font-semibold">Log a meal</h1>
        <div className="w-12" />
      </div>

      <div className="flex gap-1.5 overflow-x-auto">
        {(["breakfast", "lunch", "dinner", "snack"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMeal(m)}
            className={`px-3 py-1.5 rounded-full text-sm capitalize whitespace-nowrap ${
              meal === m
                ? "bg-emerald-500 text-white"
                : "bg-zinc-200 dark:bg-zinc-800"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
        className="hidden"
      />

      <button
        disabled={busy}
        onClick={() => fileRef.current?.click()}
        className="w-full py-12 rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 text-center active:scale-95 transition disabled:opacity-50"
      >
        <div className="text-3xl mb-2">📷</div>
        <div className="font-medium">
          {busy ? "Processing…" : "Snap or upload a photo"}
        </div>
        <div className="text-xs text-zinc-500 mt-1">
          AI will estimate calories in ~5s
        </div>
      </button>

      <div className="flex items-center gap-2 text-zinc-400 text-xs">
        <div className="flex-1 h-px bg-zinc-300 dark:bg-zinc-700" />
        OR
        <div className="flex-1 h-px bg-zinc-300 dark:bg-zinc-700" />
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g. 2 scrambled eggs with butter on toast"
        rows={3}
        className="w-full p-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 resize-none"
      />
      <button
        onClick={handleText}
        disabled={!text.trim()}
        className="w-full py-3 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium disabled:opacity-40"
      >
        Estimate from text
      </button>

      {err && <p className="text-sm text-red-500">{err}</p>}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Loading view — calls API, retries once on transient failure
// ──────────────────────────────────────────────────────────────────────────
function LoadingView({
  onDone,
  onError,
}: {
  onDone: (r: EstimateResult) => void;
  onError: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const tick = setInterval(() => setProgress((p) => Math.min(90, p + 8)), 200);

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

      const tryOnce = async (attempt: number): Promise<void> => {
        const res = await fetch("/api/estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: req.image,
            text: req.text,
            context: { meal: req.meal },
          }),
        });
        if (!res.ok) {
          if (attempt < 1) return tryOnce(attempt + 1);
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        if (!data.items || !data.totals) {
          if (attempt < 1) return tryOnce(attempt + 1);
          throw new Error("Malformed response");
        }
        if (cancelled) return;
        sessionStorage.removeItem("calora:pending-estimate");
        onDone(data as EstimateResult);
      };

      try {
        await tryOnce(0);
      } catch (e) {
        if (!cancelled) {
          setErr((e as Error).message);
          setProgress(100);
        }
      } finally {
        clearInterval(tick);
        if (!cancelled) setProgress(100);
      }
    };

    void run();
    return () => {
      cancelled = true;
      clearInterval(tick);
    };
  }, [onDone]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      {err ? (
        <>
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
            Couldn&apos;t get an estimate: {err}
          </p>
          <button
            onClick={onError}
            className="px-6 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
          >
            Try again
          </button>
        </>
      ) : (
        <>
          <div className="w-12 h-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin mb-6" />
          <p className="text-zinc-600 dark:text-zinc-400">
            Analyzing your meal…
          </p>
          <div className="w-48 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full mt-4 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Edit view — adjust items/portions before saving
// ──────────────────────────────────────────────────────────────────────────
function EditView({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: (e: MealEntry) => void;
}) {
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [meal, setMeal] = useState<MealType>("lunch");
  const [pendingImage, setPendingImage] = useState<string | undefined>();

  useEffect(() => {
    const raw = sessionStorage.getItem("calora:pending-result");
    const reqRaw = sessionStorage.getItem("calora:pending-estimate");
    if (raw) setResult(JSON.parse(raw));
    if (reqRaw) {
      const req = JSON.parse(reqRaw) as {
        image?: string;
        text?: string;
        meal: MealType;
      };
      setMeal(req.meal);
      setPendingImage(req.image);
    }
  }, []);

  if (!result) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-zinc-500">No result to edit</p>
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
      { name: "new item", calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    ];
    const totals = sumMacrosHelper(items);
    setResult({ ...result, items, totals });
  };

  return (
    <div className="flex-1 flex flex-col p-4 gap-3">
      <div className="flex items-center justify-between">
        <button onClick={onCancel} className="text-sm text-zinc-500">
          ← Discard
        </button>
        <span
          className={`text-xs px-2 py-1 rounded-full ${
            result.confidence === "high"
              ? "bg-emerald-100 text-emerald-700"
              : result.confidence === "medium"
                ? "bg-amber-100 text-amber-700"
                : "bg-red-100 text-red-700"
          }`}
        >
          {result.confidence} confidence · AI estimate
        </span>
      </div>

      {pendingImage && (
        <img
          src={pendingImage}
          alt="meal"
          className="w-full max-h-48 object-cover rounded-xl"
        />
      )}

      <div className="flex gap-1.5 overflow-x-auto">
        {(["breakfast", "lunch", "dinner", "snack"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMeal(m)}
            className={`px-3 py-1.5 rounded-full text-sm capitalize whitespace-nowrap ${
              meal === m
                ? "bg-emerald-500 text-white"
                : "bg-zinc-200 dark:bg-zinc-800"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col gap-2">
        {result.items.length === 0 ? (
          <p className="text-sm text-zinc-500 italic">
            AI couldn&apos;t identify items. Add them manually:
          </p>
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
        <button
          onClick={addItem}
          className="self-start text-sm text-emerald-600 px-2 py-1"
        >
          + Add item
        </button>
      </div>

      {result.notes && (
        <p className="text-xs text-zinc-500 italic">📝 {result.notes}</p>
      )}

      <div className="sticky bottom-0 -mx-4 px-4 pt-3 pb-4 bg-gradient-to-t from-zinc-50 dark:from-zinc-950">
        <div className="flex justify-between items-end mb-3">
          <div>
            <div className="text-xs text-zinc-500">Total</div>
            <div className="text-3xl font-bold tabular-nums">
              {result.totals.calories}{" "}
              <span className="text-sm font-normal text-zinc-500">kcal</span>
            </div>
          </div>
          <div className="text-right text-xs text-zinc-500">
            P {result.totals.protein_g}g · C {result.totals.carbs_g}g · F{" "}
            {result.totals.fat_g}g
          </div>
        </div>
        <button
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
          disabled={result.items.length === 0}
          className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-semibold text-lg shadow-lg active:scale-95 transition disabled:opacity-40"
        >
          Save to today
        </button>
      </div>
    </div>
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
    <div className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3">
      <div className="flex justify-between items-start gap-2">
        <input
          value={item.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="flex-1 bg-transparent text-sm font-medium outline-none"
        />
        <input
          type="number"
          value={item.calories}
          onChange={(e) =>
            onChange({ calories: Math.max(0, parseInt(e.target.value) || 0) })
          }
          className="w-16 text-right tabular-nums bg-transparent text-sm font-semibold outline-none"
        />
        <button
          onClick={onRemove}
          className="text-zinc-400 hover:text-red-500 text-sm"
        >
          ✕
        </button>
      </div>
      <div className="flex gap-2 mt-2 text-xs text-zinc-500">
        <span>P {item.protein_g}g</span>
        <span>C {item.carbs_g}g</span>
        <span>F {item.fat_g}g</span>
      </div>
    </div>
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

// ──────────────────────────────────────────────────────────────────────────
// History view — last 7 days
// ──────────────────────────────────────────────────────────────────────────
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
      const ds = today - i * 24 * 60 * 60 * 1000;
      const entries = entriesForDay(log, ds);
      out.push({
        dayStart: ds,
        entries,
        total: sumMacros(entries).calories,
      });
    }
    return out;
  }, [log]);

  return (
    <div className="flex-1 flex flex-col p-4 gap-3">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-zinc-500">
          ← Back
        </button>
        <h1 className="font-semibold">Last 7 days</h1>
        <button
          onClick={() => {
            const csv = exportToCSV(log);
            const stamp = new Date().toISOString().slice(0, 10);
            downloadCSV(`calora-${stamp}.csv`, csv);
          }}
          disabled={log.length === 0}
          className="text-sm text-emerald-600 disabled:text-zinc-300 dark:disabled:text-zinc-700 disabled:cursor-not-allowed"
        >
          Export CSV
        </button>
      </div>
      {days.map((d) => {
        const label =
          d.dayStart === startOfDay(Date.now())
            ? "Today"
            : new Date(d.dayStart).toLocaleDateString([], {
                weekday: "short",
                month: "short",
                day: "numeric",
              });
        return (
          <div
            key={d.dayStart}
            className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3"
          >
            <div className="flex justify-between mb-2">
              <span className="font-medium">{label}</span>
              <span className="tabular-nums text-zinc-500">
                {d.total} kcal · {d.entries.length}{" "}
                {d.entries.length === 1 ? "meal" : "meals"}
              </span>
            </div>
            {d.entries.length > 0 && (
              <ul className="flex flex-col gap-1">
                {d.entries.map((e) => (
                  <li
                    key={e.id}
                    className="flex justify-between text-sm gap-2"
                  >
                    <span className="truncate text-zinc-600 dark:text-zinc-400">
                      {e.items.map((i) => i.name).join(", ") || "(no items)"}
                    </span>
                    <span className="flex gap-2 items-center shrink-0">
                      <span className="tabular-nums">{e.totals.calories}</span>
                      <button
                        onClick={() => onRemove(e.id)}
                        className="text-zinc-300 hover:text-red-500 text-xs"
                      >
                        ✕
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Settings view — calorie goal
// ──────────────────────────────────────────────────────────────────────────
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

  return (
    <div className="flex-1 flex flex-col p-4 gap-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-zinc-500">
          ← Back
        </button>
        <h1 className="font-semibold">Settings</h1>
        <div className="w-10" />
      </div>

      <div className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4">
        <label className="block text-sm text-zinc-500 mb-2">
          Daily calorie goal
        </label>
        <div className="flex items-baseline gap-2">
          <input
            type="number"
            value={goal}
            onChange={(e) =>
              setGoal(Math.max(0, parseInt(e.target.value) || 0))
            }
            className="flex-1 text-3xl font-bold tabular-nums bg-transparent outline-none"
          />
          <span className="text-zinc-500">kcal</span>
        </div>
        <div className="grid grid-cols-4 gap-2 mt-4">
          {[1500, 1800, 2000, 2500].map((g) => (
            <button
              key={g}
              onClick={() => setGoal(g)}
              className={`py-2 rounded-lg text-sm ${
                goal === g
                  ? "bg-emerald-500 text-white"
                  : "bg-zinc-100 dark:bg-zinc-800"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => onSave({ goalCalories: goal })}
        className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-semibold"
      >
        Save
      </button>

      <p className="text-xs text-zinc-500 text-center mt-4">
        Data lives on this device only. v0.1 MVP — no account, no sync.
      </p>

      <div className="mt-8 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
          About / Disclaimer
        </h2>
        <p className="text-xs text-zinc-500 leading-relaxed">
          Calora is not a medical device. AI estimates are approximate —
          always edit anything that looks wrong before saving. Consult a
          qualified professional for medical nutrition advice.
        </p>
      </div>
    </div>
  );
}