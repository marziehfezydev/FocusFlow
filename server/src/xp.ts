import type { Profile, TaskType } from '../../shared/types';
import { DB, uid } from './db.js';

export const XP_PER_LEVEL = 1000;

export function taskXp(minutes: number): number {
  return Math.min(120, Math.max(10, Math.round(minutes / 5) * 5));
}

const KEYWORDS: [TaskType, RegExp][] = [
  ['water', /water|drink|hydrat|آب|نوشید/i],
  ['exercise', /exercis|workout|gym|run|yoga|walk|stretch|ورزش|دویدن|یوگا|پیاده/i],
  ['german', /german|deutsch|آلمانی/i],
  ['reading', /read|book|کتاب|مطالعه/i],
  ['planning', /plan|organi[sz]e|schedule|review|برنامه/i],
  ['sleep', /sleep|nap|bed|خواب/i],
  ['meditate', /meditat|breath|mindful|مدیتیشن|تنفس/i],
  ['code', /code|coding|react|typescript|javascript|project|bug|github|backend|api|برنامه‌نویسی|کد/i],
  ['study', /study|learn|course|lesson|homework|exam|درس|یاد/i],
];

export function detectType(title: string): TaskType {
  for (const [type, re] of KEYWORDS) if (re.test(title)) return type;
  return 'custom';
}

export function computeProfile(db: DB, today: string): Profile {
  const dates = new Set<string>();
  db.tasks.forEach((t) => t.done && dates.add(t.date));
  db.habits.forEach((h) => Object.entries(h.log).forEach(([d, v]) => v && dates.add(d)));
  db.focus.forEach((f) => dates.add(f.date));

  const key = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const back = (d: string, n: number) => {
    const dt = new Date(d + 'T12:00:00');
    dt.setDate(dt.getDate() + n);
    return key(dt);
  };

  let streak = 0;
  let cursor = dates.has(today) ? today : back(today, -1);
  while (dates.has(cursor)) {
    streak++;
    cursor = back(cursor, -1);
  }

  const sorted = [...dates].sort();
  let best = 0;
  let run = 0;
  let prev = '';
  for (const d of sorted) {
    run = prev && back(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }

  const total = Math.max(0, db.totalXp);
  return {
    totalXp: total,
    level: Math.floor(total / XP_PER_LEVEL) + 1,
    xpInLevel: total % XP_PER_LEVEL,
    xpForLevel: XP_PER_LEVEL,
    streak,
    bestStreak: Math.max(best, streak),
  };
}

/** Adds (or removes, if negative) XP and logs an event. Returns whether a level-up happened. */
export function giveXp(db: DB, xp: number, label: string, date: string): { leveledUp: boolean } {
  const before = Math.floor(Math.max(0, db.totalXp) / XP_PER_LEVEL);
  db.totalXp = Math.max(0, db.totalXp + xp);
  db.events.push({ id: uid(), ts: new Date().toISOString(), date, label, xp });
  if (db.events.length > 2000) db.events.splice(0, db.events.length - 2000);
  const after = Math.floor(db.totalXp / XP_PER_LEVEL);
  return { leveledUp: xp > 0 && after > before };
}

/** Awards / revokes the "perfect day" bonus for a date. Returns the XP change. */
export function syncDayBonus(db: DB, date: string): { xp: number; leveledUp: boolean } {
  const day = db.tasks.filter((t) => t.date === date);
  const complete = day.length >= 3 && day.every((t) => t.done);
  const has = db.bonusDates.includes(date);
  if (complete && !has) {
    db.bonusDates.push(date);
    const r = giveXp(db, 50, 'Perfect day bonus', date);
    return { xp: 50, leveledUp: r.leveledUp };
  }
  if (!complete && has) {
    db.bonusDates = db.bonusDates.filter((d) => d !== date);
    giveXp(db, -50, 'Perfect day bonus removed', date);
    return { xp: -50, leveledUp: false };
  }
  return { xp: 0, leveledUp: false };
}