import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { NextFunction, Request, Response } from 'express';
import { DATA_DIR } from './db';

interface UserRec { username: string; salt: string; hash: string; createdAt: string }

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SECRET_FILE = path.join(DATA_DIR, 'secret.key');
const TTL_MS = 30 * 24 * 3600 * 1000;

/** How many accounts may ever exist. Default 2 = you + one friend. */
export const MAX_USERS = Math.max(1, Number(process.env.MAX_USERS) || 2);
const INVITE = (process.env.INVITE_CODE ?? '').trim();
export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

function readUsers(): UserRec[] {
  try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); } catch { return []; }
}
function writeUsers(list: UserRec[]) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = USERS_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(list, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, USERS_FILE);
}

const secret: string = (() => {
  if (process.env.FOCUSFLOW_SECRET) return process.env.FOCUSFLOW_SECRET;
  try { return fs.readFileSync(SECRET_FILE, 'utf8').trim(); } catch { /* create below */ }
  const s = crypto.randomBytes(32).toString('hex');
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(SECRET_FILE, s, { mode: 0o600 });
  return s;
})();

const hashPw = (pw: string, salt: string) => crypto.scryptSync(pw, salt, 64).toString('hex');
const sign = (payload: string) => crypto.createHmac('sha256', secret).update(payload).digest('base64url');

export function makeToken(username: string): string {
  const payload = Buffer.from(JSON.stringify({ u: username, e: Date.now() + TTL_MS })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token: string): string | null {
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(payload));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const { u, e } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (typeof u !== 'string' || typeof e !== 'number' || e < Date.now()) return null;
    return readUsers().some((x) => x.username === u) ? u : null;
  } catch {
    return null;
  }
}

export function status() {
  const count = readUsers().length;
  return { registrationOpen: count < MAX_USERS, inviteRequired: INVITE.length > 0, users: count };
}

type Fail = { ok: false; status: number; error: string };
type Ok = { ok: true; username: string; first: boolean };

export function register(usernameRaw: unknown, password: unknown, invite: unknown): Ok | Fail {
  const username = typeof usernameRaw === 'string' ? usernameRaw.trim().toLowerCase() : '';
  if (!USERNAME_RE.test(username)) return { ok: false, status: 400, error: 'Username: 3–20 letters, numbers or _' };
  if (typeof password !== 'string' || password.length < 6 || password.length > 100) {
    return { ok: false, status: 400, error: 'Password must be at least 6 characters' };
  }
  const users = readUsers();
  if (users.length >= MAX_USERS) return { ok: false, status: 403, error: 'This world is full — no more accounts allowed' };
  if (INVITE && invite !== INVITE) return { ok: false, status: 403, error: 'Wrong invite code' };
  if (users.some((u) => u.username === username)) return { ok: false, status: 409, error: 'That username is taken' };
  const salt = crypto.randomBytes(16).toString('hex');
  users.push({ username, salt, hash: hashPw(password, salt), createdAt: new Date().toISOString() });
  writeUsers(users);
  return { ok: true, username, first: users.length === 1 };
}

const fails = new Map<string, { n: number; since: number }>();
const WINDOW = 10 * 60 * 1000;

export function login(usernameRaw: unknown, password: unknown): Ok | Fail {
  const username = typeof usernameRaw === 'string' ? usernameRaw.trim().toLowerCase() : '';
  const rec = fails.get(username);
  if (rec && Date.now() - rec.since < WINDOW && rec.n >= 8) {
    return { ok: false, status: 429, error: 'Too many attempts — try again in a few minutes' };
  }
  const user = readUsers().find((u) => u.username === username);
  const pw = typeof password === 'string' ? password : '';
  // Always hash, so response time doesn't reveal whether the username exists.
  const candidate = hashPw(pw, user?.salt ?? '00');
  const good = !!user && crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(user.hash));
  if (!good) {
    const fresh = !rec || Date.now() - rec.since >= WINDOW;
    fails.set(username, { n: fresh ? 1 : rec!.n + 1, since: fresh ? Date.now() : rec!.since });
    return { ok: false, status: 401, error: 'Wrong username or password' };
  }
  fails.delete(username);
  return { ok: true, username, first: false };
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const h = req.headers.authorization ?? '';
  const user = h.startsWith('Bearer ') ? verifyToken(h.slice(7)) : null;
  if (!user) return res.status(401).json({ error: 'Please log in' });
  res.locals.user = user;
  next();
}
