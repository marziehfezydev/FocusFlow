import Anthropic from '@anthropic-ai/sdk';
import type {
  CoachResponse, EveningResponse, Lang, Suggestion, Task, TaskType,
} from '../../shared/types';

const MODEL = process.env.FOCUSFLOW_MODEL || 'claude-haiku-5-5';
const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
export const aiMode: 'claude' | 'offline' = client ? 'claude' : 'offline';

export interface DayContext {
  name: string;
  lang: Lang;
  date: string;
  hour: number; // 0-23 local hour
  tasks: Task[]; // tasks for the date
  habitsDone: number;
  habitsTotal: number;
  focusMinutes: number;
  focusGoal: number;
  streak: number;
  weekRate: number; // 0..1 completion over the last 7 days
}

const TYPES: TaskType[] = [
  'water', 'exercise', 'study', 'german', 'reading', 'planning', 'sleep', 'meditate', 'code', 'custom',
];

async function ask(system: string, user: string, max = 500): Promise<string | null> {
  if (!client) return null;
  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: max,
      system,
      messages: [{ role: 'user', content: user }],
    });
    const block = res.content.find((b) => b.type === 'text');
    return block && block.type === 'text' ? block.text.trim() : null;
  } catch (err) {
    console.warn('[ai] request failed, using offline mode:', (err as Error).message);
    return null;
  }
}

function extractJson(text: string): any | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

const langName = (l: Lang) => (l === 'fa' ? 'Persian (Farsi)' : 'English');

const ctxSummary = (c: DayContext) => {
  const done = c.tasks.filter((t) => t.done).length;
  return JSON.stringify({
    date: c.date,
    localHour: c.hour,
    tasks: c.tasks.map((t) => ({ id: t.id, title: t.title, minutes: t.minutes, done: t.done })),
    doneCount: done,
    plannedMinutes: c.tasks.reduce((s, t) => s + t.minutes, 0),
    habits: `${c.habitsDone}/${c.habitsTotal}`,
    focusMinutes: c.focusMinutes,
    focusGoal: c.focusGoal,
    streakDays: c.streak,
    last7DaysCompletionRate: Math.round(c.weekRate * 100) + '%',
  });
};

/* ───────────────────────── Offline (rule-based) coach ───────────────────────── */

const T = {
  en: {
    empty: (n: string) => `Hey ${n}! Your day is an empty world — let's place the first block. Start with a tiny, doable plan.`,
    overloaded: (h: number) => `That's about ${h}h of planned work — heavy for one day. A lighter plan you actually finish beats a huge one you abandon. Try moving something to tomorrow.`,
    behind: `It's getting late and not much is checked off yet. Pick the ONE most important task and do just 10 minutes of it — momentum will follow.`,
    evening: `The day is almost over. Move what's left to tomorrow and close today with one small win.`,
    half: (p: number) => `Nice! You've finished ${p}% of today's plan. To keep the streak going, I'd add something small and physical.`,
    great: `Amazing — today's plan is complete! Your village is growing. Rest, drink some water and enjoy it.`,
    steady: (d: number, t: number) => `You've done ${d} of ${t} tasks. Steady pace — pick the next smallest task and start a 10 minute timer.`,
    noBreak: `Your plan has no movement or break in it. A short walk will keep your focus sharper.`,
    water: 'Drink a glass of water',
    walk: 'Walk / stretch',
    plan: 'Plan tomorrow',
    startTitle: 'Pick your top task',
    move: 'Move to tomorrow',
  },
  fa: {
    empty: (n: string) => `سلام ${n}! امروز هنوز خالیه — بیا اولین بلوک رو بذاریم. با یه برنامه‌ی کوچیک و شدنی شروع کن.`,
    overloaded: (h: number) => `حدود ${h} ساعت کار برنامه‌ریزی کردی که برای یک روز زیاده. برنامه‌ی سبک‌تری که تموم کنی بهتر از برنامه‌ی بزرگیه که رها می‌شه. یکی‌شون رو بنداز فردا.`,
    behind: `دیر شده و هنوز کار زیادی انجام نشده. فقط مهم‌ترین کار رو انتخاب کن و ۱۰ دقیقه روش کار کن؛ بقیه‌اش خودبه‌خود میاد.`,
    evening: `روز داره تموم می‌شه. کارهای باقی‌مونده رو بنداز فردا و امروز رو با یه پیروزی کوچک ببند.`,
    half: (p: number) => `آفرین! ${p}٪ برنامه‌ی امروز رو انجام دادی. برای حفظ رکورد، یه فعالیت کوچک و تحرکی اضافه کن.`,
    great: `عالی! برنامه‌ی امروز کامل شد و دهکده‌ت داره بزرگ می‌شه. استراحت کن و یه لیوان آب بخور.`,
    steady: (d: number, t: number) => `${d} از ${t} کار رو انجام دادی. آروم و پیوسته پیش برو — کوچک‌ترین کار بعدی رو انتخاب کن و تایمر ۱۰ دقیقه‌ای بذار.`,
    noBreak: `تو برنامه‌ت هیچ حرکت یا استراحتی نیست. یه پیاده‌روی کوتاه تمرکزت رو بهتر می‌کنه.`,
    water: 'یک لیوان آب بنوش',
    walk: 'پیاده‌روی / کشش',
    plan: 'برنامه‌ی فردا',
    startTitle: 'مهم‌ترین کار رو انتخاب کن',
    move: 'انتقال به فردا',
  },
} as const;

export function offlineCoach(c: DayContext): CoachResponse {
  const t = T[c.lang];
  const total = c.tasks.length;
  const done = c.tasks.filter((x) => x.done).length;
  const left = c.tasks.filter((x) => !x.done);
  const minutes = c.tasks.reduce((s, x) => s + x.minutes, 0);
  const ratio = total ? done / total : 0;
  const suggestions: Suggestion[] = [];
  let message: string;
  let mood: CoachResponse['mood'] = 'calm';

  const hasMove = c.tasks.some((x) => x.type === 'exercise' || x.type === 'meditate');

  if (total === 0) {
    message = t.empty(c.name);
    suggestions.push(
      { kind: 'add', title: t.water, minutes: 5, type: 'water' },
      { kind: 'add', title: t.walk, minutes: 15, type: 'exercise' },
      { kind: 'add', title: t.plan, minutes: 10, type: 'planning' },
    );
  } else if (done === total && total >= 1) {
    message = t.great;
    mood = 'celebrate';
    suggestions.push({ kind: 'add', title: t.plan, minutes: 10, type: 'planning' });
  } else if (minutes > 600) {
    message = t.overloaded(Math.round(minutes / 60));
    mood = 'nudge';
    const biggest = [...left].sort((a, b) => b.minutes - a.minutes)[0];
    if (biggest) suggestions.push({ kind: 'move', taskId: biggest.id, title: biggest.title });
  } else if (c.hour >= 20) {
    message = t.evening;
    mood = 'nudge';
    left.slice(0, 3).forEach((x) => suggestions.push({ kind: 'move', taskId: x.id, title: x.title }));
  } else if (c.hour >= 15 && ratio < 0.34) {
    message = t.behind;
    mood = 'nudge';
    if (left[0]) suggestions.push({ kind: 'move', taskId: left[left.length - 1].id, title: left[left.length - 1].title });
  } else if (ratio >= 0.5) {
    message = t.half(Math.round(ratio * 100));
    mood = 'proud';
    if (!hasMove) suggestions.push({ kind: 'add', title: t.walk, minutes: 20, type: 'exercise' });
  } else {
    message = t.steady(done, total);
  }

  if (!hasMove && total > 0 && !suggestions.some((s) => s.kind === 'add') && done < total) {
    message += ' ' + t.noBreak;
    suggestions.push({ kind: 'add', title: t.walk, minutes: 15, type: 'exercise' });
  }
  return { message, suggestions: suggestions.slice(0, 3), mood, source: 'offline' };
}

export function offlineEvening(c: DayContext): EveningResponse {
  const done = c.tasks.filter((x) => x.done).length;
  const fa = c.lang === 'fa';
  let text: string;
  if (done > 0) {
    text = fa
      ? `امروز ${done} کار رو تموم کردی${c.streak > 1 ? ` و رکوردت به ${c.streak} روز رسید` : ''}. همین پیشرفت‌های کوچیک دهکده‌ت رو می‌سازن. به خودت افتخار کن!`
      : `Today you finished ${done} task${done === 1 ? '' : 's'}${c.streak > 1 ? ` and your streak is now ${c.streak} days` : ''}. Small wins like these are what build your village. Be proud of yourself!`;
  } else {
    text = fa
      ? `امروز روز سختی بود شاید، ولی اینجا اومدی و این خودش شروعه. فردا یه قدم کوچیک بردار — دهکده منتظرته.`
      : `Maybe today was a tough one — but you showed up, and that counts. Tomorrow, one tiny step. Your village is waiting.`;
  }
  return { title: fa ? 'یک نکته‌ی خوب از امروز' : 'One good thing about today', text, source: 'offline' };
}

/* ───────────────────────────── Claude-powered ───────────────────────────── */

export async function coach(c: DayContext): Promise<CoachResponse> {
  const fallback = offlineCoach(c);
  const system = `You are "Bit", a warm, upbeat productivity companion living in a Minecraft-style world (blocks, XP, villages).
Review the user's plan for today and reply with ONLY a JSON object:
{"message": string, "mood": "proud"|"nudge"|"calm"|"celebrate", "suggestions": Suggestion[]}
Rules:
- "message": 1-3 short sentences, in ${langName(c.lang)}. Be specific to their data. If the plan is unrealistic, badly balanced, or they are falling behind, say so kindly and propose a better plan. If they're doing well, celebrate and suggest a small next step. One emoji max.
- "suggestions": 0-3 items. Each is either {"kind":"add","title":string,"minutes":number,"type":one of ${TYPES.join('|')}} or {"kind":"move","taskId":string,"title":string} (move an unfinished task to tomorrow; taskId MUST be one of the provided ids).
- Titles of added tasks must be in ${langName(c.lang)}. Never invent tasks that duplicate existing ones. Minutes must be 5-90.
- Address the user as ${c.name} at most once. No markdown.`;
  const text = await ask(system, `User's day data:\n${ctxSummary(c)}`, 600);
  const json = text ? extractJson(text) : null;
  if (!json || typeof json.message !== 'string') return fallback;

  const ids = new Set(c.tasks.map((t) => t.id));
  const suggestions: Suggestion[] = [];
  for (const s of Array.isArray(json.suggestions) ? json.suggestions : []) {
    if (s?.kind === 'add' && typeof s.title === 'string') {
      const type: TaskType = TYPES.includes(s.type) ? s.type : 'custom';
      const minutes = Math.min(90, Math.max(5, Math.round(Number(s.minutes) || 15)));
      suggestions.push({ kind: 'add', title: s.title.slice(0, 80), minutes, type });
    } else if (s?.kind === 'move' && ids.has(s.taskId)) {
      suggestions.push({ kind: 'move', taskId: s.taskId, title: String(s.title ?? '').slice(0, 80) });
    }
  }
  const mood = ['proud', 'nudge', 'calm', 'celebrate'].includes(json.mood) ? json.mood : 'calm';
  return { message: json.message.slice(0, 500), suggestions: suggestions.slice(0, 3), mood, source: 'claude' };
}

export async function evening(c: DayContext): Promise<EveningResponse> {
  const fallback = offlineEvening(c);
  const system = `You are "Bit", a kind companion in a Minecraft-style productivity app. It's the end of the user's day.
Write ONE short, genuine, encouraging note (2-3 sentences) in ${langName(c.lang)} that points out something good about their day based on the data (even small things). If they did little, be gentle and hopeful, never guilt-tripping. No markdown, at most one emoji.
Reply with ONLY JSON: {"title": string (max 6 words), "text": string}.`;
  const text = await ask(system, `User's day data:\n${ctxSummary(c)}`, 300);
  const json = text ? extractJson(text) : null;
  if (!json || typeof json.text !== 'string') return fallback;
  return {
    title: typeof json.title === 'string' ? json.title.slice(0, 60) : fallback.title,
    text: json.text.slice(0, 500),
    source: 'claude',
  };
}

export async function chat(
  c: DayContext,
  history: { role: 'user' | 'assistant'; text: string }[],
): Promise<{ text: string; source: 'claude' | 'offline' }> {
  if (client) {
    try {
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 500,
        system: `You are "Bit", a friendly pixel-robot productivity companion in the FocusFlow app (Minecraft-style world with XP, levels and a village the user builds by finishing tasks).
Be concise (max ~80 words), warm and practical. Reply in the language the user writes in (default ${langName(c.lang)}). Plain text, no markdown headers. You can help plan the day, break big tasks into small steps, and motivate. Use the user's current data when relevant:
${ctxSummary(c)}`,
        messages: history.slice(-12).map((m) => ({ role: m.role, content: m.text })),
      });
      const block = res.content.find((b) => b.type === 'text');
      if (block && block.type === 'text' && block.text.trim()) return { text: block.text.trim(), source: 'claude' };
    } catch (err) {
      console.warn('[ai] chat failed, using offline mode:', (err as Error).message);
    }
  }
  return { text: offlineChat(c, history[history.length - 1]?.text ?? ''), source: 'offline' };
}

function offlineChat(c: DayContext, msg: string): string {
  const fa = c.lang === 'fa' || /[؀-ۿ]/.test(msg);
  const m = msg.toLowerCase();
  const left = c.tasks.filter((t) => !t.done);
  if (/plan|برنامه/.test(m)) {
    return fa
      ? `پیشنهاد من: ۳ کار مهم برای امروز انتخاب کن، هر کدوم حداکثر ۴۵ دقیقه، و بین‌شون ۱۰ دقیقه استراحت بذار. ${left[0] ? `شروع از «${left[0].title}» خوبه.` : ''}`
      : `Try this: pick 3 key tasks, max 45 minutes each, with 10-minute breaks between. ${left[0] ? `"${left[0].title}" is a good block to start with.` : ''}`;
  }
  if (/tired|lazy|unmotivated|can't|cant|خسته|حوصله|نمی‌تونم/.test(m)) {
    return fa
      ? 'اشکالی نداره! فقط ۵ دقیقه شروع کن. اگه بعدش خواستی ادامه بده، اگه نه، باز هم یه امتیاز گرفتی.'
      : "That's okay! Just do 5 minutes — if you want to continue after that, great; if not, you still earned XP.";
  }
  if (/xp|level|village|دهکده|سطح/.test(m)) {
    return fa
      ? 'با تموم کردن کارها و عادت‌ها XP می‌گیری و هر ۲۵۰ XP یه ساختمون جدید تو دهکده‌ت ساخته می‌شه!'
      : 'You earn XP by finishing tasks, habits and focus sessions — every 250 XP builds something new in your village!';
  }
  return fa
    ? `من اینجام! ${left.length ? `هنوز ${left.length} کار باقی مونده. کدوم رو شروع کنیم؟` : 'برنامه‌ی امروز تموم شده، آفرین!'}`
    : `I'm here! ${left.length ? `You still have ${left.length} task${left.length === 1 ? '' : 's'} left. Which one shall we start with?` : "Today's plan is complete — well done!"}`;
}
