import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { NextFunction, Request, Response } from 'express';
import { DATA_DIR, GUEST_PREFIX, GUEST_TTL_SEC } from './db.js';
import { kv, parseJson } from './store.js';

interface UserRec { username: string; salt: string; hash: string; createdAt: string }

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SECRET_FILE = path.join(DATA_DIR, 'secret.key');
const USERS_KEY = 'ff:users';
const SECRET_KEY = 'ff:secret';
const TTL_MS = 30 * 24 * 3600 * 1000;

/** How many real accounts may ever exist. Default 2 = you + one friend. */
export const MAX_USERS = Math.max(1, Number(process.env.MAX_USERS) || 2);
/** One-click guest accounts per day for a public demo. 0 = off. Needs a hosted store. */
export const MAX_GUESTS = Math.max(0, Number(process.env.MAX_GUESTS) || 0);
const INVITE = (process.env.INVITE_CODE ?? '').trim();
export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

/* ───────── accounts (file or hosted store) ───────── */
function readUsersFile(): UserRec[] {
  try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); } catch { return []; }
}
function writeUsersFile(list: UserRec[]) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = USERS_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(list, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, USERS_FILE);
}

async function findUser(username: string): Promise<UserRec | null> {
  if (kv) return parseJson<UserRec>(await kv.hget(USERS_KEY, username));
  return readUsersFile().find((u) => u.username === username) ?? null;
}
async function countUsers(): Promise<number> {
  return kv ? kv.hlen(USERS_KEY) : readUsersFile().length;
}
async function createUser(rec: UserRec): Promise<boolean> {
  if (kv) return kv.hsetnx(USERS_KEY, rec.username, JSON.stringify(rec));
  const list = readUsersFile();
  if (list.some((u) => u.username === rec.username)) return false;
  list.push(rec);
  writeUsersFile(list);
  return true;
}

/* ───────── signing secret ───────── */
let secretCache: string | null = null;
async function getSecret(): Promise<string> {
  if (secretCache) return secretCache;
  if (process.env.FOCUSFLOW_SECRET) return (secretCache = process.env.FOCUSFLOW_SECRET);
  if (kv) {
    // shared by every serverless instance: first one to arrive creates it
    await kv.setnx(SECRET_KEY, 'ff-' + crypto.randomBytes(32).toString('hex'));
    return (secretCache = String(await kv.get(SECRET_KEY)));
  }
  try {
    return (secretCache = fs.readFileSync(SECRET_FILE, 'utf8').trim());
  } catch {
    const s = crypto.randomBytes(32).toString('hex');
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(SECRET_FILE, s, { mode: 0o600 });
    return (secretCache = s);
  }
}

const hashPw = (pw: string, salt: string) => crypto.scryptSync(pw, salt, 64).toString('hex');
const sign = (payload: string, secret: string) => crypto.createHmac('sha256', secret).update(payload).digest('base64url');

export async function makeToken(username: string): Promise<string> {
  const ttl = username.startsWith(GUEST_PREFIX) ? GUEST_TTL_SEC * 1000 : TTL_MS;
  const payload = Buffer.from(JSON.stringify({ u: username, e: Date.now() + ttl })).toString('base64url');
  return `${payload}.${sign(payload, await getSecret())}`;
}

export async function verifyToken(token: string): Promise<string | null> {
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(payload, await getSecret()));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const { u, e } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (typeof u !== 'string' || typeof e !== 'number' || e < Date.now()) return null;
    if (u.startsWith(GUEST_PREFIX)) return kv && (await kv.exists(`ff:guest:${u}`)) ? u : null;
    return (await findUser(u)) ? u : null;
  } catch {
    return null;
  }
}

export async function status() {
  const users = await countUsers();
  return { registrationOpen: users < MAX_USERS, inviteRequired: INVITE.length > 0, users, guestsEnabled: !!kv && MAX_GUESTS > 0 };
}

type Fail = { ok: false; status: number; error: string };
type Ok = { ok: true; username: string; first: boolean };

export async function register(usernameRaw: unknown, password: unknown, invite: unknown): Promise<Ok | Fail> {
  const username = typeof usernameRaw === 'string' ? usernameRaw.trim().toLowerCase() : '';
  if (!USERNAME_RE.test(username) || username.startsWith(GUEST_PREFIX)) {
    return { ok: false, status: 400, error: 'Username: 3–20 letters, numbers or _ (cannot start with guest_)' };
  }
  if (typeof password !== 'string' || password.length < 6 || password.length > 100) {
    return { ok: false, status: 400, error: 'Password must be at least 6 characters' };
  }
  const count = await countUsers();
  if (count >= MAX_USERS) return { ok: false, status: 403, error: 'This world is full — no more accounts allowed' };
  if (INVITE && invite !== INVITE) return { ok: false, status: 403, error: 'Wrong invite code' };
  const salt = crypto.randomBytes(16).toString('hex');
  const created = await createUser({ username, salt, hash: hashPw(password, salt), createdAt: new Date().toISOString() });
  if (!created) return { ok: false, status: 409, error: 'That username is taken' };
  return { ok: true, username, first: count === 0 };
}

/** One-click demo account that expires after a week. */
export async function guest(): Promise<Ok | Fail> {
  if (!kv || MAX_GUESTS <= 0) return { ok: false, status: 403, error: 'Guest demo is not enabled' };
  const day = new Date().toISOString().slice(0, 10);
  const n = await kv.incr(`ff:guests:${day}`, 2 * 24 * 3600);
  if (n > MAX_GUESTS) return { ok: false, status: 429, error: 'Too many demo visitors today — please try again tomorrow' };
  const username = GUEST_PREFIX + crypto.randomBytes(4).toString('hex');
  await kv.set(`ff:guest:${username}`, '1', GUEST_TTL_SEC);
  return { ok: true, username, first: false };
}

const fails = new Map<string, { n: number; since: number }>();
const WINDOW = 10 * 60 * 1000;

export async function login(usernameRaw: unknown, password: unknown): Promise<Ok | Fail> {
  const username = typeof usernameRaw === 'string' ? usernameRaw.trim().toLowerCase() : '';
  const rec = fails.get(username);
  if (rec && Date.now() - rec.since < WINDOW && rec.n >= 8) {
    return { ok: false, status: 429, error: 'Too many attempts — try again in a few minutes' };
  }
  const user = await findUser(username);
  const pw = typeof password === 'string' ? password : '';
  // Always hash, so response time doesn't reveal whether the username exists.
  const candidate = hashPw(pw, user?.salt ?? '00');
  const good = !!user && crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(user.hash));
  if (!good) {
    const stale = !rec || Date.now() - rec.since >= WINDOW;
    fails.set(username, { n: stale ? 1 : rec!.n + 1, since: stale ? Date.now() : rec!.since });
    return { ok: false, status: 401, error: 'Wrong username or password' };
  }
  fails.delete(username);
  return { ok: true, username, first: false };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const h = req.headers.authorization ?? '';
    const user = h.startsWith('Bearer ') ? await verifyToken(h.slice(7)) : null;
    if (!user) return res.status(401).json({ error: 'Please log in' });
    res.locals.user = user;
    next();
  } catch (e) {
    next(e);
  }
}