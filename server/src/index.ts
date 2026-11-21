import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import type {
  Bootstrap, FocusSession, Habit, MutationResult, StatsResponse, Task, TaskType,
} from '../../shared/types';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Response } from 'express';
import { loadUser, save, uid, adoptLegacy, type DB } from './db';
import * as auth from './auth';
import { computeProfile, detectType, giveXp, syncDayBonus, taskXp } from './xp';
import { quoteFor } from './quotes';
import * as ai from './ai';

const app = express();
app.use(cors());
app.use(express.json({ limit: '100kb' }));

/* ───────────── accounts ───────────── */
app.get('/api/auth/status', (_req, res) => res.json(auth.status()));

app.post('/api/auth/register', (req, res) => {
  const { username, password, invite } = req.body ?? {};
  const r = auth.register(username, password, invite);
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  // The first account inherits data from the old single-user version, if there is any.
  if (r.first) adoptLegacy(r.username);
  const db = loadUser(r.username);
  save(db);
  res.json({ token: auth.makeToken(r.username), username: r.username });
});

app.post('/api/auth/login', (req, res) => {
  const r = auth.login(req.body?.username, req.body?.password);
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  res.json({ token: auth.makeToken(r.username), username: r.username });
});

// everything below this line needs a logged-in user
app.use('/api', auth.requireAuth);

const userDb = (res: Response): DB => loadUser(res.locals.user as string);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isDate = (s: unknown): s is string => typeof s === 'string' && DATE_RE.test(s);
const todayParam = (v: unknown) => (isDate(v) ? v : new Date().toISOString().slice(0, 10));
const TYPES: TaskType[] = ['water', 'exercise', 'study', 'german', 'reading', 'planning', 'sleep', 'meditate', 'code', 'custom'];

const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (date: string, n: number) => {
  const d = new Date(date + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return dateKey(d);
};

function result(db: DB, today: string, xpDelta: number, leveledUp: boolean): MutationResult {
  save(db);
  return { profile: computeProfile(db, today), xpDelta, leveledUp };
}

function dayContext(db: DB, date: string, hour: number): ai.DayContext {
  const tasks = db.tasks.filter((t) => t.date === date);
  let weekDone = 0;
  let weekTotal = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(date, -i);
    const day = db.tasks.filter((t) => t.date === d);
    weekTotal += day.length;
    weekDone += day.filter((t) => t.done).length;
  }
  return {
    name: db.settings.name,
    lang: db.settings.language,
    date,
    hour,
    tasks,
    habitsDone: db.habits.filter((h) => h.log[date]).length,
    habitsTotal: db.habits.length,
    focusMinutes: db.focus.filter((f) => f.date === date).reduce((s, f) => s + f.minutes, 0),
    focusGoal: db.settings.dailyFocusGoal,
    streak: computeProfile(db, date).streak,
    weekRate: weekTotal ? weekDone / weekTotal : 0,
  };
}

/* ───────────── bootstrap ───────────── */
app.get('/api/bootstrap', (req, res) => {
  const db = userDb(res);
  const today = todayParam(req.query.today);
  if (db.tasks.length === 0 && !db.settings.onboarded) {
    const seed: [string, number][] = [
      ['Study TypeScript', 60], ['Drink 8 glasses of water', 20], ['Exercise', 30],
      ['Practice German', 15], ['Read a book', 20], ['Plan next week', 15],
    ];
    for (const [title, minutes] of seed) {
      db.tasks.push({
        id: uid(), title, minutes, type: detectType(title), date: today, done: false,
        xp: taskXp(minutes), createdAt: new Date().toISOString(),
      });
    }
    save(db);
  }
  const body: Bootstrap = {
    settings: db.settings,
    profile: computeProfile(db, today),
    tasks: db.tasks,
    habits: db.habits,
    focus: db.focus,
    events: db.events.slice(-60).reverse(),
    chat: db.chat.slice(-40),
    quote: quoteFor(today, db.settings.language),
    aiMode: ai.aiMode,
  };
  res.json(body);
});

/* ───────────── tasks ───────────── */
app.post('/api/tasks', (req, res) => {
  const db = userDb(res);
  const { title, date, minutes, type } = req.body ?? {};
  if (typeof title !== 'string' || !title.trim() || !isDate(date)) return res.status(400).json({ error: 'title and date required' });
  const mins = Math.min(480, Math.max(5, Math.round(Number(minutes) || 20)));
  const task: Task = {
    id: uid(),
    title: title.trim().slice(0, 100),
    type: TYPES.includes(type) ? type : detectType(title),
    minutes: mins,
    date,
    done: false,
    xp: taskXp(mins),
    createdAt: new Date().toISOString(),
  };
  db.tasks.push(task);
  syncDayBonus(db, date);
  save(db);
  res.json({ task, ...result(db, date, 0, false) });
});

app.patch('/api/tasks/:id', (req, res) => {
  const db = userDb(res);
  const task = db.tasks.find((t) => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'not found' });
  const today = todayParam(req.query.today ?? task.date);
  const { title, minutes, date, done, type } = req.body ?? {};
  const oldDate = task.date;
  let xpDelta = 0;
  let leveledUp = false;

  if (typeof title === 'string' && title.trim()) {
    task.title = title.trim().slice(0, 100);
    if (type === undefined) task.type = detectType(task.title);
  }
  if (TYPES.includes(type)) task.type = type;
  if (minutes !== undefined) {
    const old = task.xp;
    task.minutes = Math.min(480, Math.max(5, Math.round(Number(minutes) || task.minutes)));
    task.xp = taskXp(task.minutes);
    if (task.done && task.xp !== old) {
      const r = giveXp(db, task.xp - old, `Updated: ${task.title}`, today);
      xpDelta += task.xp - old;
      leveledUp ||= r.leveledUp;
    }
  }
  if (isDate(date)) task.date = date;
  if (typeof done === 'boolean' && done !== task.done) {
    task.done = done;
    task.completedAt = done ? new Date().toISOString() : undefined;
    const r = giveXp(db, done ? task.xp : -task.xp, done ? task.title : `Undone: ${task.title}`, today);
    xpDelta += done ? task.xp : -task.xp;
    leveledUp ||= r.leveledUp;
  }
  for (const d of new Set([oldDate, task.date])) {
    const b = syncDayBonus(db, d);
    xpDelta += b.xp;
    leveledUp ||= b.leveledUp;
  }
  res.json({ task, ...result(db, today, xpDelta, leveledUp) });
});

app.delete('/api/tasks/:id', (req, res) => {
  const db = userDb(res);
  const idx = db.tasks.findIndex((t) => t.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'not found' });
  const [task] = db.tasks.splice(idx, 1);
  const today = todayParam(req.query.today ?? task.date);
  let xpDelta = 0;
  if (task.done) {
    giveXp(db, -task.xp, `Removed: ${task.title}`, today);
    xpDelta -= task.xp;
  }
  xpDelta += syncDayBonus(db, task.date).xp;
  res.json(result(db, today, xpDelta, false));
});

/* ───────────── habits ───────────── */
app.post('/api/habits', (req, res) => {
  const db = userDb(res);
  const { title, type } = req.body ?? {};
  if (typeof title !== 'string' || !title.trim()) return res.status(400).json({ error: 'title required' });
  const habit: Habit = {
    id: uid(), title: title.trim().slice(0, 80),
    type: TYPES.includes(type) ? type : detectType(title),
    xp: 15, log: {}, createdAt: new Date().toISOString(),
  };
  db.habits.push(habit);
  save(db);
  res.json({ habit });
});

app.post('/api/habits/:id/toggle', (req, res) => {
  const db = userDb(res);
  const habit = db.habits.find((h) => h.id === req.params.id);
  const date = req.body?.date;
  if (!habit || !isDate(date)) return res.status(400).json({ error: 'bad request' });
  const on = !habit.log[date];
  if (on) habit.log[date] = true;
  else delete habit.log[date];
  const r = giveXp(db, on ? habit.xp : -habit.xp, on ? `Habit: ${habit.title}` : `Undone habit: ${habit.title}`, date);
  res.json({ habit, ...result(db, date, on ? habit.xp : -habit.xp, r.leveledUp) });
});

app.delete('/api/habits/:id', (req, res) => {
  const db = userDb(res);
  const idx = db.habits.findIndex((h) => h.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'not found' });
  db.habits.splice(idx, 1);
  save(db);
  res.json({ ok: true });
});

/* ───────────── focus ───────────── */
app.post('/api/focus', (req, res) => {
  const db = userDb(res);
  const { minutes, date, label } = req.body ?? {};
  const mins = Math.round(Number(minutes));
  if (!isDate(date) || !(mins >= 1 && mins <= 240)) return res.status(400).json({ error: 'bad request' });
  const session: FocusSession = {
    id: uid(), date, minutes: mins, label: typeof label === 'string' ? label.slice(0, 80) : undefined,
    completedAt: new Date().toISOString(),
  };
  db.focus.push(session);
  const xp = Math.min(90, mins);
  const r = giveXp(db, xp, `Focus session · ${mins} min`, date);
  res.json({ session, ...result(db, date, xp, r.leveledUp) });
});

/* ───────────── settings ───────────── */
app.patch('/api/settings', (req, res) => {
  const db = userDb(res);
  const b = req.body ?? {};
  const s = db.settings;
  if (typeof b.name === 'string' && b.name.trim()) s.name = b.name.trim().slice(0, 30);
  if (b.language === 'en' || b.language === 'fa') s.language = b.language;
  if (typeof b.sound === 'boolean') s.sound = b.sound;
  if (typeof b.aiEnabled === 'boolean') s.aiEnabled = b.aiEnabled;
  if (typeof b.onboarded === 'boolean') s.onboarded = b.onboarded;
  if (b.dailyFocusGoal !== undefined) s.dailyFocusGoal = Math.min(600, Math.max(15, Math.round(Number(b.dailyFocusGoal) || 120)));
  save(db);
  res.json({ settings: s, quote: quoteFor(todayParam(req.query.today), s.language) });
});

app.post('/api/reset', (req, res) => {
  const db = userDb(res);
  db.tasks = []; db.focus = []; db.events = []; db.chat = []; db.totalXp = 0; db.bonusDates = []; db.cache = {};
  db.habits.forEach((h) => (h.log = {}));
  db.settings.onboarded = true; // don't re-seed sample tasks
  save(db);
  res.json({ ok: true });
});

/* ───────────── AI ───────────── */
app.post('/api/ai/coach', async (req, res) => {
  const db = userDb(res);
  const date = todayParam(req.body?.date);
  const hour = Math.min(23, Math.max(0, Math.round(Number(req.body?.hour) || 12)));
  const ctx = dayContext(db, date, hour);
  const out = db.settings.aiEnabled ? await ai.coach(ctx) : ai.offlineCoach(ctx);
  res.json(out);
});

app.post('/api/ai/evening', async (req, res) => {
  const db = userDb(res);
  const date = todayParam(req.body?.date);
  const hour = Math.min(23, Math.max(0, Math.round(Number(req.body?.hour) || 21)));
  const ctx = dayContext(db, date, hour);
  const key = `evening:${date}:${db.settings.language}:${ctx.tasks.filter((t) => t.done).length}`;
  if (db.cache[key]) return res.json(db.cache[key]);
  const out = db.settings.aiEnabled ? await ai.evening(ctx) : ai.offlineEvening(ctx);
  db.cache[key] = out;
  save(db);
  res.json(out);
});

app.post('/api/ai/chat', async (req, res) => {
  const db = userDb(res);
  const text = req.body?.message;
  if (typeof text !== 'string' || !text.trim()) return res.status(400).json({ error: 'message required' });
  const date = todayParam(req.body?.date);
  const hour = Math.min(23, Math.max(0, Math.round(Number(req.body?.hour) || 12)));
  const now = new Date().toISOString();
  db.chat.push({ id: uid(), role: 'user', text: text.trim().slice(0, 1000), ts: now });
  const history = db.chat.slice(-12).map((m) => ({ role: m.role, text: m.text }));
  const reply = await ai.chat(dayContext(db, date, hour), history);
  const msg = { id: uid(), role: 'assistant' as const, text: reply.text, ts: new Date().toISOString() };
  db.chat.push(msg);
  if (db.chat.length > 200) db.chat.splice(0, db.chat.length - 200);
  save(db);
  res.json({ message: msg, source: reply.source });
});

app.delete('/api/ai/chat', (req, res) => {
  const db = userDb(res);
  db.chat = [];
  save(db);
  res.json({ ok: true });
});

/* ───────────── stats ───────────── */
app.get('/api/stats', (req, res) => {
  const db = userDb(res);
  const today = todayParam(req.query.today);
  const range = Math.min(90, Math.max(7, Number(req.query.days) || 7));
  const days = [];
  for (let i = range - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    const tasks = db.tasks.filter((t) => t.date === date);
    days.push({
      date,
      planned: tasks.length,
      done: tasks.filter((t) => t.done).length,
      xp: db.events.filter((e) => e.date === date).reduce((s, e) => s + e.xp, 0),
      focusMinutes: db.focus.filter((f) => f.date === date).reduce((s, f) => s + f.minutes, 0),
    });
  }
  const set = new Set(days.map((d) => d.date));
  const planned = days.reduce((s, d) => s + d.planned, 0);
  const done = days.reduce((s, d) => s + d.done, 0);
  const typeCount = new Map<TaskType, number>();
  db.tasks.filter((t) => t.done && set.has(t.date)).forEach((t) => typeCount.set(t.type, (typeCount.get(t.type) ?? 0) + 1));
  const out: StatsResponse = {
    days,
    totals: {
      tasksDone: done,
      focusMinutes: days.reduce((s, d) => s + d.focusMinutes, 0),
      xp: days.reduce((s, d) => s + d.xp, 0),
      completionRate: planned ? done / planned : 0,
      habitChecks: db.habits.reduce((s, h) => s + Object.keys(h.log).filter((d) => set.has(d)).length, 0),
    },
    byType: [...typeCount.entries()].map(([type, n]) => ({ type, done: n })).sort((a, b) => b.done - a.done),
  };
  res.json(out);
});


/* ───────────── serve the built web app (production) ───────────── */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(path.join(CLIENT_DIST, 'index.html'))) {
  app.use(express.static(CLIENT_DIST));
  app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(CLIENT_DIST, 'index.html')));
}

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`FocusFlow API on http://localhost:${PORT}  ·  AI mode: ${ai.aiMode}`);
});
