import { describe, it, expect } from "vitest";
describe("sanity", () => {
  it("runs", () => expect(1 + 1).toBe(2));
  it("vi is global", () => {
    expect(typeof vi).toBe("object");
  });
  it("crypto.randomUUID works", () => {
    expect(crypto.randomUUID()).toMatch(/^[0-9a-f-]+$/);
  });
});
