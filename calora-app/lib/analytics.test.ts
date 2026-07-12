// Unit tests for lib/analytics.ts — event tracking + mock sink behavior.

import { describe, it, expect, beforeEach } from "vitest";
import {
  track,
  identify,
  reset,
  getRecentEvents,
  clearEvents,
  setSink,
  mockSink,
  type EventName,
} from "./analytics";

beforeEach(() => {
  localStorage.clear();
  // Reset to default mock sink (in case a previous test swapped it)
  setSink(mockSink);
});

describe("track()", () => {
  it("logs an event to localStorage", () => {
    track("scan_complete", { items: 3, kcal: 450 });
    const events = getRecentEvents();
    expect(events).toHaveLength(1);
    expect(events[0].name).toBe("scan_complete");
    expect(events[0].payload).toEqual({ items: 3, kcal: 450 });
  });

  it("logs multiple events in order", () => {
    track("app_open");
    track("capture_open");
    track("scan_start");
    const events = getRecentEvents();
    expect(events.map((e) => e.name)).toEqual(["app_open", "capture_open", "scan_start"]);
  });

  it("tolerates payload of various primitive types", () => {
    track("scan_complete", {
      stringVal: "x",
      numVal: 42,
      boolVal: true,
      nullVal: null,
      undefVal: undefined,
    });
    const [event] = getRecentEvents();
    expect(event.payload).toEqual({
      stringVal: "x",
      numVal: 42,
      boolVal: true,
      nullVal: null,
      // undefined is dropped by JSON.stringify
    });
  });

  it("does not throw when sink fails", () => {
    setSink({
      track: () => {
        throw new Error("sink boom");
      },
      identify: () => {},
      reset: () => {},
    });
    expect(() => track("scan_error", { code: 500 })).not.toThrow();
  });
});

describe("identify()", () => {
  it("tags subsequent events with the user id", () => {
    identify("user_abc123");
    track("scan_complete");
    const events = getRecentEvents();
    expect(events[0].userId).toBe("user_abc123");
  });
});

describe("reset()", () => {
  it("clears user and event buffer", () => {
    identify("user_abc");
    track("app_open");
    track("capture_open");
    expect(getRecentEvents()).toHaveLength(2);
    reset();
    expect(getRecentEvents()).toHaveLength(0);
  });
});

describe("buffer ring", () => {
  it("caps at 200 events, drops oldest", () => {
    for (let i = 0; i < 250; i++) {
      track("app_open", { i });
    }
    const events = getRecentEvents(250);
    expect(events).toHaveLength(200);
    // Oldest is i=50 (we dropped i=0..49)
    expect(events[0].payload?.i).toBe(50);
    expect(events[199].payload?.i).toBe(249);
  });
});

describe("clearEvents()", () => {
  it("clears without touching user id", () => {
    identify("user_abc");
    track("app_open");
    clearEvents();
    expect(getRecentEvents()).toHaveLength(0);
    // userId should persist on next track
    track("capture_open");
    const events = getRecentEvents();
    expect(events[0].userId).toBe("user_abc");
  });
});

describe("SSR safety", () => {
  it("track() does not throw when window is undefined", () => {
    const origWindow = (globalThis as { window?: unknown }).window;
    (globalThis as { window?: unknown }).window = undefined;
    expect(() => track("app_open")).not.toThrow();
    expect(() => getRecentEvents()).not.toThrow();
    (globalThis as { window?: unknown }).window = origWindow;
  });
});

describe("all defined events are valid EventName", () => {
  it("includes expected core events", () => {
    const tracked: EventName[] = [
      "scan_complete",
      "scan_error",
      "upgrade_cta_click",
      "history_view",
    ];
    tracked.forEach((e) => track(e));
    const names = getRecentEvents().map((e) => e.name);
    expect(names).toEqual(tracked);
  });
});