import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  ChatMessage, FocusSession, Habit, Settings, Task, XpEvent,
} from '../../shared/types';
import { kv, parseJson } from './store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Where file-mode data lives. Point DATA_DIR at a persistent disk when hosting on a normal server. */
export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(__dirname, '../data');
const USERS_DIR = path.join(DATA_DIR, 'users');
const LEGACY_FILE = path.join(DATA_DIR, 'db.json'); // single-user file from the first version

export const GUEST_PREFIX = 'guest_';
export const GUEST_TTL_SEC = 7 * 24 * 3600;

export interface DB {
  settings: Settings;
  totalXp: number;
  tasks: Task[];
  habits: Habit[];
  focus: FocusSession[];
  events: XpEvent[];
  chat: ChatMessage[];
  bonusDates: string[];
  cache: Record<string, unknown>;
}

const now = () => new Date().toISOString();
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

function fresh(): DB {
  return {
    settings: {
      name: 'Explorer',
      language: 'en',
      sound: true,
      dailyFocusGoal: 120,
      aiEnabled: true,
      onboarded: false,
    },
    totalXp: 0,
    tasks: [],
    habits: [
      { id: uid(), title: 'Drink 8 glasses of water', type: 'water', xp: 15, log: {}, createdAt: now() },
      { id: uid(), title: 'Read 20 minutes', type: 'reading', xp: 15, log: {}, createdAt: now() },
      { id: uid(), title: 'Practice German', type: 'german', xp: 15, log: {}, createdAt: now() },
      { id: uid(), title: 'Move your body', type: 'exercise', xp: 15, log: {}, createdAt: now() },
    ],
    focus: [],
    events: [],
    chat: [],
    bonusDates: [],
    cache: {},
  };
}

const fileCache = new Map<string, DB>();
const owner = new WeakMap<DB, string>();
const fileOf = (username: string) => path.join(USERS_DIR, `${username}.json`);
const userKey = (username: string) => `ff:user:${username}`;

/**
 * Loads one user's data. With a hosted store it is read fresh on every call, because a
 * serverless function can be a different instance next time. With files it is cached in memory.
 * Usernames are validated upstream ([a-z0-9_]{3,20}), so file paths cannot escape USERS_DIR.
 */
export async function loadUser(username: string): Promise<DB> {
  if (kv) {
    const data = parseJson<Partial<DB>>(await kv.get(userKey(username)));
    const db = { ...fresh(), ...(data ?? {}) } as DB;
    owner.set(db, username);
    return db;
  }
  let db = fileCache.get(username);
  if (db) return db;
  try {
    db = { ...fresh(), ...JSON.parse(fs.readFileSync(fileOf(username), 'utf8')) } as DB;
  } catch {
    db = fresh();
  }
  fileCache.set(username, db);
  owner.set(db, username);
  return db;
}

const inflight = new Set<Promise<unknown>>();

/** Persists a user's data. Hosted-store writes are tracked so the response can wait for them (see flush). */
export function save(db: DB): void {
  const username = owner.get(db);
  if (!username) return;
  if (kv) {
    const ttl = username.startsWith(GUEST_PREFIX) ? GUEST_TTL_SEC : undefined;
    const p: Promise<unknown> = kv
      .set(userKey(username), JSON.stringify(db), ttl)
      .catch((e: Error) => console.warn('[store] save failed:', e.message))
      .finally(() => inflight.delete(p));
    inflight.add(p);
    return;
  }
  fs.mkdirSync(USERS_DIR, { recursive: true });
  const file = fileOf(username);
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, file);
}

/** Resolves when every pending write has finished. Serverless functions must not answer before this. */
export async function flush(): Promise<void> {
  await Promise.allSettled([...inflight]);
}

/** If the old single-user db.json exists, the first account to register inherits it (file mode only). */
export function adoptLegacy(username: string): boolean {
  if (kv || !fs.existsSync(LEGACY_FILE) || fs.existsSync(fileOf(username))) return false;
  fs.mkdirSync(USERS_DIR, { recursive: true });
  fs.renameSync(LEGACY_FILE, fileOf(username));
  return true;
}