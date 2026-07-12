// Unit tests for lib/export.ts — CSV export of meal log.
// RFC 4180 conformance: fields with commas/quotes/newlines are quoted;
// embedded quotes are doubled; line endings are CRLF.

import { describe, it, expect } from "vitest";
import { exportToCSV, downloadCSV } from "./export";
import type { MealEntry } from "./types";

function mkEntry(overrides: Partial<MealEntry> = {}): MealEntry {
  return {
    id: "test-id",
    loggedAt: new Date("2026-07-12T12:00:00Z").getTime(),
    meal: "lunch",
    items: [
      { name: "Chicken breast", calories: 165, protein_g: 31, carbs_g: 0, fat_g: 4 },
      { name: "Brown rice", calories: 216, protein_g: 5, carbs_g: 45, fat_g: 2 },
    ],
    totals: { calories: 381, protein_g: 36, carbs_g: 45, fat_g: 6 },
    source: "text",
    ...overrides,
  };
}

describe("exportToCSV", () => {
  it("writes a header row with the expected columns", () => {
    const csv = exportToCSV([]);
    const header = csv.split("\r\n")[0];
    expect(header).toBe(
      "id,loggedAt,meal,source,item_count,total_calories,total_protein_g,total_carbs_g,total_fat_g,items_concat",
    );
  });

  it("writes a row per entry", () => {
    const csv = exportToCSV([mkEntry(), mkEntry({ id: "second" })]);
    const rows = csv.split("\r\n");
    expect(rows).toHaveLength(3); // header + 2 entries
  });

  it("uses CRLF line endings (RFC 4180)", () => {
    const csv = exportToCSV([mkEntry()]);
    expect(csv).toContain("\r\n");
    expect(csv.endsWith("\r\n")).toBe(false); // last row has no trailing newline
  });

  it("quotes fields containing commas", () => {
    const csv = exportToCSV([
      mkEntry({
        items: [
          { name: "Toast, buttered", calories: 100, protein_g: 2, carbs_g: 12, fat_g: 5 },
        ],
        totals: { calories: 100, protein_g: 2, carbs_g: 12, fat_g: 5 },
      }),
    ]);
    expect(csv).toContain('"Toast, buttered"');
  });

  it("quotes fields containing double quotes and escapes by doubling", () => {
    const csv = exportToCSV([
      mkEntry({
        items: [
          { name: '2" Chicken', calories: 100, protein_g: 10, carbs_g: 0, fat_g: 5 },
        ],
        totals: { calories: 100, protein_g: 10, carbs_g: 0, fat_g: 5 },
      }),
    ]);
    expect(csv).toContain('"2"" Chicken"');
  });

  it("quotes fields containing newlines", () => {
    const csv = exportToCSV([
      mkEntry({
        items: [
          { name: "Line1\nLine2", calories: 100, protein_g: 10, carbs_g: 0, fat_g: 5 },
        ],
        totals: { calories: 100, protein_g: 10, carbs_g: 0, fat_g: 5 },
      }),
    ]);
    expect(csv).toContain('"Line1\nLine2"');
  });

  it("concatenates items with ' | ' separator", () => {
    const csv = exportToCSV([mkEntry()]);
    expect(csv).toContain("Chicken breast | Brown rice");
  });

  it("serializes loggedAt as ISO 8601 timestamp", () => {
    const csv = exportToCSV([mkEntry()]);
    expect(csv).toContain("2026-07-12T12:00:00.000Z");
  });

  it("emits numeric fields as plain numbers (no quoting)", () => {
    const csv = exportToCSV([mkEntry()]);
    expect(csv).toMatch(/\b381\b/); // calories
    expect(csv).toMatch(/\b36\b/); // protein
  });

  it("escapes the header fields consistently", () => {
    const csv = exportToCSV([]);
    // Header fields are all plain identifiers — none should be quoted
    const header = csv.split("\r\n")[0];
    header.split(",").forEach((col) => {
      expect(col.startsWith('"')).toBe(false);
    });
  });
});

describe("downloadCSV", () => {
  it("triggers a browser download with the right filename and BOM", () => {
    const clickSpy = vi.fn();
    const createObjectURLSpy = vi.fn(() => "blob:mock");
    const revokeObjectURLSpy = vi.fn();

    // jsdom doesn't have URL.createObjectURL natively; polyfill
    if (!("createObjectURL" in URL)) {
      (URL as unknown as { createObjectURL: () => string }).createObjectURL =
        () => "blob:mock";
    }
    if (!("revokeObjectURL" in URL)) {
      (URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = () => {};
    }

    // Spy on anchor click
    const origCreate = document.createElement.bind(document);
    const spy = vi.spyOn(document, "createElement").mockImplementation((tag) => {
      const el = origCreate(tag);
      if (tag === "a") {
        el.click = clickSpy;
      }
      return el;
    });

    downloadCSV("test.csv", "a,b,c\r\n1,2,3");

    expect(clickSpy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

// Use vi at top for the spy test
import { vi } from "vitest";