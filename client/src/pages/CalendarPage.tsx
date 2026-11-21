import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../store';
import { Panel, Empty, Pill } from '../components/ui';
import { TaskRow, AddTaskForm } from '../components/TaskParts';
import { fmtLong, fmtMonth, monthMatrix, parseKey } from '../lib/date';

export default function CalendarPage() {
  const { tasks, boot, today } = useApp();
  const [params, setParams] = useSearchParams();
  const selected = params.get('date') ?? today;
  const sel = parseKey(selected);
  const [ym, setYm] = useState({ y: sel.getFullYear(), m: sel.getMonth() });
  const rows = monthMatrix(ym.y, ym.m);

  const shift = (n: number) => {
    const d = new Date(ym.y, ym.m + n, 1);
    setYm({ y: d.getFullYear(), m: d.getMonth() });
  };

  const byDate = useMemo(() => {
    const m = new Map<string, typeof tasks>();
    tasks.forEach((t) => m.set(t.date, [...(m.get(t.date) ?? []), t]));
    return m;
  }, [tasks]);

  const dayTasks = byDate.get(selected) ?? [];
  const habits = boot!.habits.filter((h) => h.log[selected]);
  const focus = boot!.focus.filter((f) => f.date === selected).reduce((s, f) => s + f.minutes, 0);

  return (
    <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
      <Panel
        title="Calendar" icon="calendar"
        action={
          <div className="flex items-center gap-1">
            <button className="mc-btn soft sm" onClick={() => shift(-1)} aria-label="Previous month">‹</button>
            <div className="mc-btn soft sm !cursor-default min-w-[9.5rem]">{fmtMonth(ym.y, ym.m)}</div>
            <button className="mc-btn soft sm" onClick={() => shift(1)} aria-label="Next month">›</button>
            <button className="mc-btn sm ml-1" onClick={() => { const n = new Date(); setYm({ y: n.getFullYear(), m: n.getMonth() }); setParams({ date: today }); }}>Today</button>
          </div>
        }
      >
        <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-extrabold text-ink-soft">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className="py-1">{d}</div>)}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1.5">
          {rows.flat().map((k, i) => {
            if (!k) return <div key={i} className="min-h-[4.5rem]" />;
            const list = byDate.get(k) ?? [];
            const done = list.filter((t) => t.done).length;
            const isSel = k === selected;
            const isToday = k === today;
            return (
              <button
                key={k}
                onClick={() => setParams({ date: k })}
                className={`flex min-h-[4.5rem] flex-col items-start rounded-md border-[3px] p-1.5 text-left transition hover:-translate-y-0.5 ${
                  isSel ? 'border-grass-d bg-[#e8f8e5]' : isToday ? 'border-[#f2bf9f] bg-[#fdd9c2]' : 'border-peach-d/60 bg-white/50 hover:bg-white/80'
                }`}
              >
                <span className="font-pixel text-base font-bold leading-none">{Number(k.slice(8))}</span>
                {list.length > 0 && (
                  <>
                    <div className="mt-1 flex flex-wrap gap-0.5">
                      {list.slice(0, 6).map((t) => (
                        <span key={t.id} className={`h-2 w-2 rounded-[2px] ${t.done ? 'bg-grass-d' : 'bg-gold'}`} />
                      ))}
                    </div>
                    <span className="mt-auto text-[11px] font-extrabold text-ink-soft">{done}/{list.length}</span>
                  </>
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex gap-4 text-xs font-extrabold text-ink-soft">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-[2px] bg-grass-d" /> done</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-[2px] bg-gold" /> planned</span>
        </div>
      </Panel>

      <Panel title={selected === today ? 'Today' : fmtLong(selected)} icon="tasks" action={<Pill tone="green">{dayTasks.filter((t) => t.done).length}/{dayTasks.length} done</Pill>}>
        {dayTasks.length === 0 ? <Empty title="A blank day" hint="Plan something below." /> : dayTasks.map((t) => <TaskRow key={t.id} task={t} editable />)}
        <div className="mt-3"><AddTaskForm date={selected} /></div>
        {(habits.length > 0 || focus > 0) && (
          <div className="mt-4 rounded-md bg-peach/60 p-3 text-sm font-bold">
            {habits.length > 0 && <div>🌱 Habits: {habits.map((h) => h.title).join(', ')}</div>}
            {focus > 0 && <div className="mt-1">⏱️ Focus: {focus} min</div>}
          </div>
        )}
      </Panel>
    </div>
  );
}
