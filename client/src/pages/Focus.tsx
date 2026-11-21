import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../store';
import { Panel, Bar, Pill, Empty } from '../components/ui';
import { Avatar, type AvatarAction } from '../components/Avatar';
import { Cube } from '../components/Cube';
import { sfx } from '../lib/sound';

interface Timer {
  total: number; // seconds
  endAt: number | null;
  left: number; // seconds (when paused / idle)
  label: string;
  taskId: string;
  markDone: boolean;
  logged: boolean;
}

const KEY = 'ff-timer';
const fresh = (): Timer => ({ total: 25 * 60, endAt: null, left: 25 * 60, label: '', taskId: '', markDone: false, logged: true });
const load = (): Timer => {
  try {
    return { ...fresh(), ...(JSON.parse(localStorage.getItem(KEY) ?? 'null') ?? {}) };
  } catch {
    return fresh();
  }
};
const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function FocusPage() {
  const { boot, today, tasks, logFocus, toggleTask, toast } = useApp();
  const [timer, setTimerState] = useState<Timer>(load);
  const [, setTick] = useState(0);
  const [custom, setCustom] = useState('');
  const completing = useRef(false);

  const setTimer = (t: Timer) => {
    localStorage.setItem(KEY, JSON.stringify(t));
    setTimerState(t);
  };

  const running = timer.endAt !== null;
  const remaining = running ? Math.max(0, Math.round((timer.endAt! - Date.now()) / 1000)) : timer.left;

  const complete = async (t: Timer, minutes: number) => {
    if (completing.current) return;
    completing.current = true;
    const next = { ...t, endAt: null, left: t.total, logged: true };
    setTimer(next);
    sfx('done', boot?.settings.sound);
    await logFocus(minutes, t.label || undefined);
    if (t.markDone && t.taskId) {
      const task = tasks.find((x) => x.id === t.taskId);
      if (task && !task.done) await toggleTask(task.id);
    }
    completing.current = false;
  };

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (running && remaining === 0 && !timer.logged) void complete(timer, Math.max(1, Math.round(timer.total / 60)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, running]);

  const start = () => setTimer({ ...timer, endAt: Date.now() + timer.left * 1000, logged: false });
  const pause = () => setTimer({ ...timer, endAt: null, left: remaining });
  const reset = () => setTimer({ ...timer, endAt: null, left: timer.total, logged: true });
  const choose = (min: number) => {
    if (running) return;
    setTimer({ ...timer, total: min * 60, left: min * 60, logged: true });
  };
  const finishEarly = () => {
    const elapsed = Math.floor((timer.total - remaining) / 60);
    if (elapsed < 1) { toast('Focus for at least a minute first', 'warn'); return; }
    void complete(timer, elapsed);
  };

  const elapsedFrac = timer.total ? 1 - remaining / timer.total : 0;
  const blocks = 20;
  const filled = Math.floor(elapsedFrac * blocks);

  const openTasks = useMemo(() => tasks.filter((t) => t.date === today && !t.done), [tasks, today]);
  const selected = tasks.find((t) => t.id === timer.taskId);
  const action: AvatarAction = running ? (selected && selected.type !== 'custom' ? selected.type : 'code') : 'idle';

  const sessions = (boot?.focus ?? []).filter((f) => f.date === today);
  const minutesToday = sessions.reduce((s, f) => s + f.minutes, 0);
  const goal = boot!.settings.dailyFocusGoal;

  useEffect(() => {
    document.title = running ? `${mmss(remaining)} · FocusFlow` : 'FocusFlow — Build Your Better Day';
    return () => { document.title = 'FocusFlow — Build Your Better Day'; };
  }, [running, remaining]);

  return (
    <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
      <Panel title="Focus Mode" icon="focus" action={running ? <Pill tone="green">● In the zone</Pill> : <Pill>Ready</Pill>}>
        <div className="grid items-center gap-4 md:grid-cols-[1fr_14rem]">
          <div className="text-center">
            <div className="font-pixel text-[clamp(4rem,12vw,7rem)] font-bold leading-none tracking-wider text-ink tabular-nums">{mmss(remaining)}</div>
            <div className="mx-auto mt-4 flex max-w-md flex-wrap justify-center gap-1" aria-label="Session progress">
              {Array.from({ length: blocks }, (_, i) => (
                <Cube key={i} size={20} {...(i < filled ? { top: '#9be79a', left: '#58b865', right: '#3f9150' } : { top: '#fff4ea', left: '#f3d8c6', right: '#e7c3ab' })} />
              ))}
            </div>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {!running
                ? <button className="mc-btn !px-6 !py-2.5 !text-base" onClick={start} disabled={remaining === 0}>▶ Start</button>
                : <button className="mc-btn lav !px-6 !py-2.5 !text-base" onClick={pause}>❚❚ Pause</button>}
              <button className="mc-btn soft !py-2.5" onClick={reset}>↺ Reset</button>
              {(running || remaining < timer.total) && <button className="mc-btn soft !py-2.5" onClick={finishEarly}>✓ Finish early</button>}
            </div>
          </div>
          <div className="relative mx-auto flex flex-col items-center">
            <div className="absolute inset-x-3 bottom-4 top-4 rounded-lg bg-gradient-to-t from-[#cdeccb] to-transparent" />
            <Avatar key={action} action={action} size={190} className="relative" />
            <div className="relative -mt-2 h-3 w-44 rounded-sm bg-gradient-to-b from-[#8fdc8f] to-[#6cbf6c] shadow-[0_4px_0_#8a5a38]" />
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-extrabold uppercase tracking-wide text-ink-soft">Session length</div>
            <div className="flex flex-wrap items-center gap-1.5">
              {[15, 25, 45, 60].map((m) => (
                <button key={m} disabled={running} onClick={() => choose(m)} className={`mc-btn sm ${timer.total === m * 60 ? '' : 'soft'}`}>{m}m</button>
              ))}
              <input
                className="mc-input !w-20 !py-1" type="number" min={1} max={240} placeholder="min" value={custom} disabled={running}
                onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { const n = Math.min(240, Math.max(1, parseInt(custom, 10) || 0)); if (n) { choose(n); setCustom(''); } } }}
              />
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs font-extrabold uppercase tracking-wide text-ink-soft">Focus on</div>
            <select
              className="mc-input" value={timer.taskId} disabled={running}
              onChange={(e) => {
                const t = tasks.find((x) => x.id === e.target.value);
                setTimer({ ...timer, taskId: e.target.value, label: t ? t.title : timer.label });
              }}
            >
              <option value="">— free focus —</option>
              {openTasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
            {timer.taskId && (
              <label className="mt-2 flex items-center gap-2 text-sm font-bold">
                <input type="checkbox" checked={timer.markDone} onChange={(e) => setTimer({ ...timer, markDone: e.target.checked })} />
                Mark task done when the session ends
              </label>
            )}
          </div>
        </div>
      </Panel>

      <div className="grid content-start gap-4">
        <Panel title="Daily goal" icon="star">
          <div className="flex items-baseline justify-between">
            <div className="font-pixel text-3xl font-bold">{minutesToday}<span className="text-lg text-ink-soft"> / {goal} min</span></div>
            <Pill tone={minutesToday >= goal ? 'green' : 'peach'}>{minutesToday >= goal ? 'Goal reached! 🎉' : `${goal - minutesToday} to go`}</Pill>
          </div>
          <div className="mt-2"><Bar value={minutesToday} max={goal} tone="lav" label="Focus goal" /></div>
          <p className="mt-2 text-xs font-bold text-ink-soft">Each focused minute earns 1 XP (up to 90 per session).</p>
        </Panel>
        <Panel title="Today’s sessions" icon="tasks">
          {sessions.length === 0 ? <Empty emoji="⏱️" title="No sessions yet" hint="Start a timer to log one." /> : (
            <div>
              {[...sessions].reverse().map((s) => (
                <div key={s.id} className="flex items-center justify-between border-b border-peach-d/50 py-2 last:border-0">
                  <span className="truncate font-bold" dir="auto">{s.label || 'Free focus'}</span>
                  <Pill tone="lav">{s.minutes} min</Pill>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
