import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Polyfill crypto.randomUUID for jsdom if missing
if (typeof crypto === "undefined" || !("randomUUID" in crypto)) {
  const polyfill = {
    randomUUID: (): `${string}-${string}-${string}-${string}-${string}` =>
      "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }) as `${string}-${string}-${string}-${string}-${string}`,
  };
  globalThis.crypto = { ...(globalThis.crypto ?? {}), ...polyfill };
}

// Mock next/navigation for any component tests
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

// Quiet noisy console errors from jsdom during tests
const originalError = console.error;
console.error = (...args: unknown[]) => {
  const msg = String(args[0] ?? "");
  if (msg.includes("not wrapped in act") || msg.includes("Warning:")) return;
  originalError(...args);
};