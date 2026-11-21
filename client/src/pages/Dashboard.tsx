import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { EveningResponse, Task } from '../../../shared/types';
import { useApp } from '../store';
import { api } from '../api';
import { Panel, Bar, Pill, rtlAttr } from '../components/ui';
import { Sprite, TASK_EMOJI, type SpriteName } from '../components/Sprite';
import { Avatar, type AvatarAction } from '../components/Avatar';
import { IsoScene } from '../components/IsoScene';
import { TaskRow, AddTaskForm } from '../components/TaskParts';
import { addDays, dateKey, fmtMonth, greeting, monthMatrix } from '../lib/date';
import { buildState, PIECE_XP } from '../lib/village';

function Clouds() {
  return (
    <svg className="pointer-events-none absolute inset-x-0 top-0 h-full w-full opacity-90" viewBox="0 0 800 160" preserveAspectRatio="none" shapeRendering="crispEdges" aria-hidden>
      {[[40, 24, 1], [330, 12, 0.8], [520, 40, 1.1], [690, 18, 0.7]].map(([x, y, s], i) => (
        <g key={i} fill="#fff" opacity=".85" transform={`translate(${x} ${y}) scale(${s})`}>
          <rect x="10" y="12" width="60" height="12" /><rect x="22" y="0" width="30" height="12" /><rect x="0" y="20" width="84" height="10" />
        </g>
      ))}
    </svg>
  );
}

function Banner() {
  const { boot, hour, tasks, today } = useApp();
  const name = boot!.settings.name;
  const todays = tasks.filter((t) => t.date === today);
  const done = todays.filter((t) => t.done).length;
  const line = todays.length === 0
    ? 'Your world is empty — plan your first block of the day!'
    : done === todays.length
      ? 'Everything is done today. Your village is proud of you!'
      : done === 0
        ? `${todays.length} goals are waiting. Start with the smallest one!`
        : `${done} of ${todays.length} goals complete. Every step builds your world.`;
  return (
    <div className="relative overflow-hidden rounded-md border-[3px] border-[#bfe3f5] bg-gradient-to-b from-[#cfeafa] via-[#e7f3f1] to-[#fde9d9] shadow-[0_5px_0_#a5cfe3]">
      <Clouds />
      <div className="relative z-10 flex min-h-[150px] items-center px-6 py-5 sm:px-8">
        <div className="max-w-[28rem]">
          <h2 className="font-pixel text-[clamp(1.8rem,4vw,2.6rem)] font-bold leading-tight text-[#3d2a4d]">
            {greeting(hour)}, {name}! <span className="inline-block anim-bob">☀️</span>
          </h2>
          <p className="mt-1 font-bold text-[#6b5470]" dir="auto">{line}</p>
        </div>
      </div>
      <div className="pointer-events-none absolute -bottom-8 right-0 hidden h-[230px] w-[430px] md:block">
        <IsoScene xp={boot!.profile.totalXp} preview={false} tight className="h-full w-full" />
      </div>
    </div>
  );
}

function StatCards() {
  const { boot, tasks, today } = useApp();
  const nav = useNavigate();
  const yesterday = addDays(today, -1);
  const doneOn = (d: string) => tasks.filter((t) => t.date === d && t.done).length;
  const todays = tasks.filter((t) => t.date === today);
  const habits = boot!.habits;
  const habitsOn = (d: string) => habits.filter((h) => h.log[d]).length;
  const focusOn = (d: string) => boot!.focus.filter((f) => f.date === d).reduce((s, f) => s + f.minutes, 0);
  const delta = (n: number) => (n === 0 ? '±0' : n > 0 ? `+${n}` : `${n}`);
  const cards: { icon: SpriteName; label: string; value: string; unit?: string; d: number; to: string }[] = [
    { icon: 'tasks', label: 'Tasks', value: `${doneOn(today)}`, unit: `/ ${todays.length}`, d: doneOn(today) - doneOn(yesterday), to: '/tasks' },
    { icon: 'habits', label: 'Habits', value: `${habitsOn(today)}`, unit: `/ ${habits.length}`, d: habitsOn(today) - habitsOn(yesterday), to: '/habits' },
    { icon: 'focus', label: 'Focus Time', value: `${focusOn(today)}`, unit: 'min', d: focusOn(today) - focusOn(yesterday), to: '/focus' },
    { icon: 'flame', label: 'Streak', value: `${boot!.profile.streak}`, unit: 'days', d: 0, to: '/stats' },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {cards.map((c) => (
        <button key={c.label} onClick={() => nav(c.to)} className="mc-panel group flex items-center gap-3 px-4 py-3 text-left transition hover:-translate-y-0.5">
          <Sprite name={c.icon} size={48} className="transition group-hover:scale-110" />
          <div className="min-w-0">
            <div className="font-pixel text-lg font-bold leading-none">{c.label}</div>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
              <span className="font-pixel text-3xl font-bold leading-none">{c.value}</span>
              <span className="text-base font-bold text-ink-soft">{c.unit}</span>
              {c.label !== 'Streak' && (
                <span className={`text-xs font-extrabold ${c.d > 0 ? 'text-grass-d' : c.d < 0 ? 'text-[#c8503a]' : 'text-ink-soft'}`}>
                  {c.d > 0 ? '↑' : c.d < 0 ? '↓' : ''}{delta(c.d)}
                </span>
              )}
            </div>
          </div>
          <span className="ml-auto text-ink-soft/70">→</span>
        </button>
      ))}
    </div>
  );
}

function TodayPlan() {
  const { tasks, today, spotlight } = useApp();
  const nav = useNavigate();
  const [hover, setHover] = useState<Task | null>(null);
  const todays = useMemo(() => tasks.filter((t) => t.date === today), [tasks, today]);
  const done = todays.filter((t) => t.done).length;
  const next = todays.find((t) => !t.done);
  const allDone = todays.length > 0 && done === todays.length;

  let action: AvatarAction = 'idle';
  let caption = 'Add a goal to begin';
  if (hover) { action = hover.type; caption = hover.title; }
  else if (spotlight) { action = spotlight.type; caption = `Nice! ${spotlight.title}`; }
  else if (next) { action = next.type; caption = `Up next: ${next.title}`; }
  else if (allDone) { action = 'celebrate'; caption = 'Plan complete! 🎉'; }

  return (
    <Panel
      title="Today’s Plan" icon="calendar"
      action={<button className="text-sm font-extrabold text-ink-soft hover:text-ink" onClick={() => nav('/tasks')}>View all →</button>}
    >
      <div className="flex items-center gap-3">
        <div className="flex-1"><Bar value={done} max={Math.max(1, todays.length)} label="Plan completion" /></div>
        <div className="font-extrabold text-ink-soft">{done} / {todays.length} completed</div>
      </div>
      <div className="mt-3 grid gap-4 md:grid-cols-[1fr_13rem]">
        <div>
          {todays.length === 0 && <div className="py-6 text-center font-bold text-ink-soft">No goals yet — add your first one below ⬇</div>}
          <div className="scroll-thin max-h-[19rem] overflow-y-auto pr-1">
            {todays.map((t) => <TaskRow key={t.id} task={t} onHover={setHover} />)}
          </div>
          <AddTaskForm date={today} compact />
        </div>
        <div className="relative hidden flex-col items-center justify-end md:flex">
          <div className="absolute inset-x-2 bottom-8 top-6 rounded-lg bg-gradient-to-t from-[#cdeccb] to-transparent" />
          <Avatar key={action} action={action} size={170} className="relative drop-shadow-[0_6px_0_rgba(120,170,90,.35)]" />
          <div className="relative -mt-1 flex h-7 w-52 items-end justify-center">
            <div className="absolute bottom-0 h-3 w-44 rounded-sm bg-gradient-to-b from-[#8fdc8f] to-[#6cbf6c] shadow-[0_4px_0_#8a5a38]" />
          </div>
          <div className="mt-3 min-h-[2.5rem] w-full rounded-md bg-white/70 px-2 py-1 text-center text-xs font-extrabold text-ink-soft" dir={rtlAttr(caption)}>
            {TASK_EMOJI[action === 'idle' || action === 'celebrate' ? 'custom' : action]} {caption}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function MiniCalendar() {
  const { tasks, today } = useApp();
  const nav = useNavigate();
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const rows = monthMatrix(ym.y, ym.m);
  const shift = (n: number) => {
    const d = new Date(ym.y, ym.m + n, 1);
    setYm({ y: d.getFullYear(), m: d.getMonth() });
  };
  const info = useMemo(() => {
    const m = new Map<string, { total: number; done: number }>();
    tasks.forEach((t) => {
      const v = m.get(t.date) ?? { total: 0, done: 0 };
      v.total++; if (t.done) v.done++;
      m.set(t.date, v);
    });
    return m;
  }, [tasks]);

  return (
    <Panel
      title="Calendar" icon="calendar"
      action={
        <div className="flex items-center gap-1">
          <button className="mc-btn soft sm" onClick={() => shift(-1)} aria-label="Previous month">‹</button>
          <div className="mc-btn soft sm !cursor-default min-w-[8.5rem]">{fmtMonth(ym.y, ym.m)}</div>
          <button className="mc-btn soft sm" onClick={() => shift(1)} aria-label="Next month">›</button>
        </div>
      }
    >
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-extrabold text-ink-soft">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {rows.flat().map((k, i) => {
          if (!k) return <div key={i} />;
          const v = info.get(k);
          const isToday = k === today;
          const dot = !v ? null : v.done === v.total ? 'bg-grass' : isToday ? 'bg-[#ef5b5b]' : 'bg-gold';
          return (
            <button
              key={k}
              onClick={() => nav(`/calendar?date=${k}`)}
              className={`relative grid h-10 place-items-center rounded font-bold transition hover:bg-peach ${isToday ? 'bg-[#fdd9c2] ring-2 ring-[#f2bf9f]' : ''}`}
            >
              {Number(k.slice(8))}
              {dot && <span className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${dot}`} />}
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

function CoachCard() {
  const { coach, coachLoading, applySuggestion, boot } = useApp();
  const nav = useNavigate();
  const [busy, setBusy] = useState<number | null>(null);
  const message = coach?.message ?? 'Bit is looking at your plan…';
  return (
    <Panel
      title="FocusFlow AI" icon="companion"
      action={<Pill tone="lav">{boot!.aiMode === 'claude' ? '✨ Claude' : 'Offline coach'}</Pill>}
    >
      <div className="flex gap-3">
        <div className="relative w-24 shrink-0 self-start">
          <Sprite name="companion" size={88} className="anim-bob drop-shadow-[0_5px_0_rgba(150,120,220,.3)]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className={`relative rounded-md border-[3px] border-[#d9ccff] bg-[#f4efff] px-3 py-2.5 text-[0.92rem] font-bold leading-relaxed text-[#4a3a8a] ${coachLoading ? 'anim-pulse' : ''}`}>
            <span className="absolute -left-[11px] top-5 h-0 w-0 border-y-[8px] border-r-[10px] border-y-transparent border-r-[#d9ccff]" />
            <p dir="auto">{message}</p>
          </div>
          {coach && coach.suggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {coach.suggestions.map((s, i) => (
                <button
                  key={i} disabled={busy === i}
                  onClick={async () => { setBusy(i); await applySuggestion(s); setBusy(null); }}
                  className="mc-btn lav sm"
                >
                  {s.kind === 'add' ? `+ ${s.title} · ${s.minutes}m` : `→ Tomorrow: ${s.title}`}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <button className="mc-btn lav mt-3 w-full" onClick={() => nav('/companion')}>Show More Tips →</button>
    </Panel>
  );
}

function VillageCard() {
  const { boot } = useApp();
  const nav = useNavigate();
  const p = boot!.profile;
  const bs = buildState(p.totalXp);
  const toGo = bs.next ? Math.round(PIECE_XP * (1 - bs.partial)) : 0;
  return (
    <Panel
      title="Your Village" icon="village"
      action={<Pill tone="green">{bs.completed}/{bs.total} built</Pill>}
    >
      <button className="block w-full text-left" onClick={() => nav('/village')} aria-label="Open village">
        <div className="flex items-stretch gap-3">
          <div className="relative min-w-0 flex-1 overflow-hidden rounded-md bg-gradient-to-b from-[#d7efff] to-[#e6f6e0]">
            <IsoScene xp={p.totalXp} tight className="h-[10.5rem] w-full" />
          </div>
          <div className="flex w-28 shrink-0 flex-col items-center justify-center text-center">
            <div className="text-xs font-extrabold uppercase tracking-wide text-ink-soft">Next build</div>
            <div className="text-4xl anim-bob">{bs.next?.emoji ?? '🏆'}</div>
            <div className="text-sm font-extrabold leading-tight">{bs.next?.name ?? 'All built!'}</div>
            {bs.next && <div className="mt-1 font-pixel text-base font-bold text-grass-d">{toGo} XP</div>}
          </div>
        </div>
      </button>
      <div className="mt-3 flex items-center gap-2">
        <Sprite name="star" size={24} />
        <div className="flex-1"><Bar value={p.xpInLevel} max={p.xpForLevel} tone="gold" label="Level progress" /></div>
        <div className="text-sm font-extrabold text-ink-soft">{p.xpInLevel} / {p.xpForLevel} XP</div>
      </div>
    </Panel>
  );
}

function MotivationCard() {
  const { boot, hour, today, tasks } = useApp();
  const [evening, setEvening] = useState<EveningResponse | null>(null);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const doneCount = tasks.filter((t) => t.date === today && t.done).length;
  const auto = hour >= 18;
  const visible = auto || show;
  const lang = boot!.settings.language;

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    api.evening(today, hour)
      .then((r) => { if (!cancelled) setEvening(r); })
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [visible, today, doneCount, lang, hour]);

  const q = boot!.quote;
  return (
    <Panel title="Motivation" icon="heart">
      <figure className="rounded-md bg-[#fdebd9] px-4 py-3">
        <blockquote className="text-lg font-bold leading-snug" dir={rtlAttr(q.text)}>
          <span className="mr-1 font-pixel text-3xl leading-none text-coral">“</span>{q.text}
        </blockquote>
        <figcaption className="mt-1 text-right text-sm font-extrabold text-ink-soft">— {q.author}</figcaption>
      </figure>
      {visible ? (
        <div className={`mt-3 rounded-md border-[3px] border-[#bfe6bf] bg-[#effaee] px-4 py-3 ${loading ? 'anim-pulse' : ''}`}>
          <div className="flex items-center gap-2 font-pixel text-lg font-bold text-grass-d">
            <Sprite name="star" size={20} /> {evening?.title ?? 'One good thing about today'}
          </div>
          <p className="mt-1 text-[0.92rem] font-bold leading-relaxed" dir={rtlAttr(evening?.text ?? '')}>{evening?.text ?? '…'}</p>
        </div>
      ) : (
        <button className="mc-btn soft mt-3 w-full" onClick={() => setShow(true)}>🌙 Reflect on today</button>
      )}
    </Panel>
  );
}

export default function Dashboard() {
  return (
    <div className="grid gap-4">
      <Banner />
      <StatCards />
      <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
        <TodayPlan />
        <MiniCalendar />
      </div>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <CoachCard />
        <VillageCard />
        <MotivationCard />
      </div>
    </div>
  );
}

export { dateKey };
