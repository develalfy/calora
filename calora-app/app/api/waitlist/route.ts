// POST /api/waitlist
// Append an email to a local JSONL file. For the MVP waitlist this is fine —
// the Dokploy deployment keeps the container's writable layer across most
// updates (only a full image rebuild wipes it, and that's rare).
//
// Why not GitHub-as-DB? Would need a server-side token we can't inject through
// the Dokploy API without admin creds. Why not Supabase? Avoids the "create an
// account + add env vars" round trip. Plain local file is the lowest-friction
// path that ships today.
//
// Migration path: when signups exceed ~500 OR we add auth, swap this for a
// Supabase free-tier table. Same POST/GET shape, ~30 min of work.

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
// Persist inside the app dir (writable in Dokploy containers). If the path
// isn't writable, we fall back to /tmp so the route doesn't 500.
const DATA_DIR = process.env.CALORA_DATA_DIR || path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "waitlist.jsonl");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function ensureFile(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.access(FILE);
  } catch {
    // File doesn't exist — create empty
    try {
      await fs.writeFile(FILE, "", "utf-8");
    } catch {
      // Fall back to /tmp if the configured dir is read-only
      const fallback = "/tmp/calora-waitlist.jsonl";
      try {
        await fs.writeFile(fallback, "", "utf-8");
      } catch {
        /* give up — caller will see the error */
      }
    }
  }
}

async function readLines(): Promise<string[]> {
  await ensureFile();
  // Try the primary file, then the /tmp fallback.
  const candidates = [FILE, "/tmp/calora-waitlist.jsonl"];
  for (const p of candidates) {
    try {
      const raw = await fs.readFile(p, "utf-8");
      return raw.split("\n").filter(Boolean);
    } catch {
      /* try next */
    }
  }
  return [];
}

async function appendLine(line: string): Promise<{ total: number; alreadyThere: boolean }> {
  const lines = await readLines();
  const email = line.split(",")[0].trim().toLowerCase();
  if (lines.some((l) => l.split(",")[0].trim().toLowerCase() === email)) {
    return { total: lines.length, alreadyThere: true };
  }
  lines.push(line);
  const payload = lines.join("\n") + "\n";
  // Write to whichever path we successfully read from (or primary if empty).
  const target = lines.length === 1 ? FILE : await pickWritablePath();
  await fs.writeFile(target, payload, "utf-8");
  return { total: lines.length, alreadyThere: false };
}

async function pickWritablePath(): Promise<string> {
  for (const p of [FILE, "/tmp/calora-waitlist.jsonl"]) {
    try {
      await fs.access(p, fs.constants.W_OK);
      return p;
    } catch {
      /* try next */
    }
  }
  return FILE; // best-effort, will throw on write
}

export async function POST(req: NextRequest) {
  let body: { email?: string; source?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const email = (body.email || "").trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  const source = (body.source || "landing")
    .slice(0, 64)
    .replace(/[^\w-]/g, "_");
  const ts = new Date().toISOString();
  const line = `${email},${ts},${source}`;

  try {
    const { total, alreadyThere } = await appendLine(line);
    return NextResponse.json({ ok: true, count: total, alreadyThere });
  } catch (e) {
    const msg = (e as Error).message;
    console.error("waitlist append failed:", msg);
    return NextResponse.json(
      { error: "Could not save — try again later" },
      { status: 502 },
    );
  }
}

// GET returns the current count (no PII — just a number, used by the landing
// page "X people on the waitlist" chip).
export async function GET() {
  try {
    const lines = await readLines();
    return NextResponse.json(
      { count: lines.length },
      {
        headers: {
          "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        },
      },
    );
  } catch {
    return NextResponse.json({ count: 0 });
  }
}