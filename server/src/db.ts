import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  ChatMessage, FocusSession, Habit, Settings, Task, XpEvent,
} from '../../shared/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Where all data lives. Point DATA_DIR at a persistent disk when hosting. */
export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(__dirname, '../data');
const USERS_DIR = path.join(DATA_DIR, 'users');
const LEGACY_FILE = path.join(DATA_DIR, 'db.json'); // single-user file from the first version

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

const cache = new Map<string, DB>();
const owner = new WeakMap<DB, string>();
const fileOf = (username: string) => path.join(USERS_DIR, `${username}.json`);

/** Usernames are validated upstream ([a-z0-9_]{3,20}), so this can't escape USERS_DIR. */
export function loadUser(username: string): DB {
  let db = cache.get(username);
  if (db) return db;
  try {
    db = { ...fresh(), ...JSON.parse(fs.readFileSync(fileOf(username), 'utf8')) } as DB;
  } catch {
    db = fresh();
  }
  cache.set(username, db);
  owner.set(db, username);
  return db;
}

export function save(db: DB) {
  const username = owner.get(db);
  if (!username) return;
  fs.mkdirSync(USERS_DIR, { recursive: true });
  const file = fileOf(username);
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, file);
}

/** If the old single-user db.json exists, the first account to register inherits it. */
export function adoptLegacy(username: string): boolean {
  if (!fs.existsSync(LEGACY_FILE) || fs.existsSync(fileOf(username))) return false;
  fs.mkdirSync(USERS_DIR, { recursive: true });
  fs.renameSync(LEGACY_FILE, fileOf(username));
  return true;
}
