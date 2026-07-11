// CSV export for the meal log.
// RFC 4180: fields containing commas, quotes, or newlines are wrapped in
// double quotes; embedded double quotes are escaped by doubling them.

import type { MealEntry } from "./types";

const CSV_COLUMNS = [
  "id",
  "loggedAt",
  "meal",
  "source",
  "item_count",
  "total_calories",
  "total_protein_g",
  "total_carbs_g",
  "total_fat_g",
  "items_concat",
] as const;

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportToCSV(entries: MealEntry[]): string {
  const lines: string[] = [];

  // Header
  lines.push(CSV_COLUMNS.map((c) => escapeCsvField(c)).join(","));

  for (const e of entries) {
    const itemsConcat = e.items.map((i) => i.name).join(" | ");
    const row = [
      e.id,
      new Date(e.loggedAt).toISOString(),
      e.meal,
      e.source,
      String(e.items.length),
      String(e.totals.calories),
      String(e.totals.protein_g),
      String(e.totals.carbs_g),
      String(e.totals.fat_g),
      itemsConcat,
    ];
    lines.push(row.map((v) => escapeCsvField(v)).join(","));
  }

  // RFC 4180 uses CRLF line endings
  return lines.join("\r\n");
}

export function downloadCSV(filename: string, content: string): void {
  if (typeof window === "undefined") return;
  // Prepend UTF-8 BOM so Excel opens it as UTF-8 (not CP-1252).
  const blob = new Blob(["\uFEFF", content], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
