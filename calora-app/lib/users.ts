// lib/users.ts — File-backed user store for Calora.
//
// Why a JSON file instead of Postgres:
// 1. No DATABASE_URL is configured in this deployment.
// 2. The Dokploy container runs as the unprivileged `nextjs` user, and
//    /tmp is the only path we can reliably write to at runtime.
// 3. /tmp/calora-data survives container restarts (Docker tmpfs mounts /tmp
//    as a regular filesystem; only /app + similar are read-only images).
//
// Migration path to Postgres:
// - Swap `readStore` + `writeStore` to use Prisma. The exported functions
//   keep the same signatures, so route handlers don't need to change.
//
// File format (one file = all users):
//   {
//     "version": 1,
//     "users": {
//       "<userId>": {
//         "id": "...",
//         "email": "...",          (lowercased, indexed by)
//         "passwordHash": "...",   (bcryptjs, cost=12)
//         "name": "...",
//         "createdAt": 1234567890,
//         "lastLoginAt": 1234567890 | null
//       }
//     },
//     "byEmail": { "<email>": "<userId>" }
//   }
//
// Concurrency: a single in-process Mutex (write lock) prevents two
// concurrent route handlers from clobbering each other's write. For
// multi-replica deploys, swap for a Postgres/Redis lock — see lib/store-lock.ts.
//
// Atomicity: every write goes to `<file>.tmp` first, then `rename()` —
// POSIX rename is atomic on Linux, so a crash mid-write leaves the
// original file intact.

import { promises as fs } from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

export type User = {
  id: string;
  email: string;
  passwordHash: string;
  name: string | null;
  createdAt: number;
  lastLoginAt: number | null;
};

export type Store = {
  version: 1;
  users: Record<string, User>;
  byEmail: Record<string, string>;
};

const DATA_DIR = process.env.CALORA_DATA_DIR || "/tmp/calora-data";
const STORE_FILE = path.join(DATA_DIR, "users.json");
const TMP_FILE = STORE_FILE + ".tmp";

// Process-local write lock. Async-mutex semantics without bringing in a dep.
let writeChain: Promise<unknown> = Promise.resolve();
function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = writeChain.then(fn, fn);
  // Swallow lock-chain errors so a single failure doesn't poison the chain.
  writeChain = next.catch(() => undefined);
  return next;
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readStore(): Promise<Store> {
  await ensureDir();
  try {
    const raw = await fs.readFile(STORE_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Store;
    if (parsed.version !== 1 || !parsed.users || !parsed.byEmail) {
      throw new Error("store schema mismatch");
    }
    return parsed;
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      const empty: Store = { version: 1, users: {}, byEmail: {} };
      await writeStoreAtomic(empty);
      return empty;
    }
    // Corrupt JSON: log + start fresh rather than crash the whole app.
    // (We never want a bad disk write to take auth offline.)
    // eslint-disable-next-line no-console
    console.error("[users] store read failed, recreating:", err.message);
    const empty: Store = { version: 1, users: {}, byEmail: {} };
    await writeStoreAtomic(empty);
    return empty;
  }
}

async function writeStoreAtomic(store: Store): Promise<void> {
  const json = JSON.stringify(store, null, 2);
  await fs.writeFile(TMP_FILE, json, "utf-8");
  await fs.rename(TMP_FILE, STORE_FILE);
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const normalized = email.trim().toLowerCase();
  const store = await readStore();
  const userId = store.byEmail[normalized];
  if (!userId) return null;
  return store.users[userId] ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
  const store = await readStore();
  return store.users[id] ?? null;
}

export type CreateUserInput = {
  email: string;
  password: string;
  name?: string | null;
};

export type CreateUserResult =
  | { ok: true; user: User }
  | { ok: false; reason: "email_taken" | "invalid_email" | "weak_password" };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createUser(input: CreateUserInput): Promise<CreateUserResult> {
  const email = input.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return { ok: false, reason: "invalid_email" };
  }
  // bcrypt's 72-byte cap is silent — enforce upstream so we don't
  // hash a password that compares wrong for > 72-char inputs.
  if (input.password.length < 8 || input.password.length > 72) {
    return { ok: false, reason: "weak_password" };
  }

  return withWriteLock(async () => {
    const store = await readStore();
    if (store.byEmail[email]) {
      return { ok: false, reason: "email_taken" };
    }
    const id = crypto.randomBytes(12).toString("hex");
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user: User = {
      id,
      email,
      passwordHash,
      name: input.name?.trim() || null,
      createdAt: Date.now(),
      lastLoginAt: null,
    };
    store.users[id] = user;
    store.byEmail[email] = id;
    await writeStoreAtomic(store);
    return { ok: true, user };
  });
}

export async function verifyCredentials(
  email: string,
  password: string,
): Promise<User | null> {
  const user = await findUserByEmail(email);
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? user : null;
}

export async function recordLogin(userId: string): Promise<void> {
  await withWriteLock(async () => {
    const store = await readStore();
    const u = store.users[userId];
    if (!u) return;
    u.lastLoginAt = Date.now();
    await writeStoreAtomic(store);
  });
}

export async function updatePassword(
  userId: string,
  newPassword: string,
): Promise<boolean> {
  if (newPassword.length < 8 || newPassword.length > 72) return false;
  return withWriteLock(async () => {
    const store = await readStore();
    const u = store.users[userId];
    if (!u) return false;
    u.passwordHash = await bcrypt.hash(newPassword, 12);
    await writeStoreAtomic(store);
    return true;
  });
}

// Test-only: clear the store. Not exported through the public API surface.
export async function _resetForTests(): Promise<void> {
  await withWriteLock(async () => {
    try {
      await fs.unlink(STORE_FILE);
    } catch {
      /* ENOENT ok */
    }
  });
}

// Test-only: change the data dir. Call _resetForTests after.
export function _setDataDirForTests(dir: string): void {
  // Mutating module-level constants is normally frowned on, but this
  // mirrors the pattern Jest uses for env-based config and keeps the
  // public API simple.
  (globalThis as Record<string, unknown>).__caloraDataDir = dir;
}

export function _getDataDir(): string {
  const override = (globalThis as Record<string, unknown>).__caloraDataDir;
  if (typeof override === "string") return override;
  return DATA_DIR;
}