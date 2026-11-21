import { useState } from 'react';
import type { Habit } from '../../../shared/types';
import { useApp } from '../store';
import { Panel, Bar, Empty, Pill } from '../components/ui';
import { BlockCheck } from '../components/Cube';
import { TASK_EMOJI } from '../components/Sprite';
import { addDays, fmtShort, weekOf, weekday } from '../lib/date';

function streakOf(h: Habit, today: string) {
  let s = 0;
  let d = h.log[today] ? today : addDays(today, -1);
  while (h.log[d]) { s++; d = addDays(d, -1); }
  return s;
}

export default function HabitsPage() {
  const { boot, today, toggleHabit, addHabit, removeHabit } = useApp();
  const [offset, setOffset] = useState(0);
  const [title, setTitle] = useState('');
  const habits = boot!.habits;
  const week = weekOf(addDays(today, offset * 7));
  const doneToday = habits.filter((h) => h.log[today]).length;

  return (
    <div className="grid gap-4">
      <Panel title="Today’s habits" icon="habits" action={<Pill tone="green">+15 XP each</Pill>}>
        <div className="flex items-center gap-3">
          <div className="flex-1"><Bar value={doneToday} max={Math.max(1, habits.length)} label="Habits done today" /></div>
          <div className="font-extrabold text-ink-soft">{doneToday} / {habits.length}</div>
        </div>
      </Panel>

      <Panel
        title="Weekly tracker" icon="calendar"
        action={
          <div className="flex items-center gap-1">
            <button className="mc-btn soft sm" onClick={() => setOffset(offset - 1)} aria-label="Previous week">‹</button>
            <div className="mc-btn soft sm !cursor-default">{fmtShort(week[0])} – {fmtShort(week[6])}</div>
            <button className="mc-btn soft sm" onClick={() => setOffset(Math.min(0, offset + 1))} disabled={offset >= 0} aria-label="Next week">›</button>
          </div>
        }
      >
        {habits.length === 0 && <Empty emoji="🌱" title="No habits yet" hint="Add one below — tiny daily seeds grow big." />}
        <div className="grid gap-2">
          {habits.length > 0 && (
            <div className="grid grid-cols-[1fr_repeat(7,2.4rem)_4.5rem] items-end gap-1 px-2 text-center text-[11px] font-extrabold uppercase text-ink-soft">
              <span />
              {week.map((d) => <span key={d} className={d === today ? 'text-grass-d' : ''}>{weekday(d)}</span>)}
              <span>Streak</span>
            </div>
          )}
          {habits.map((h) => (
            <div key={h.id} className="group grid grid-cols-[1fr_repeat(7,2.4rem)_4.5rem] items-center gap-1 rounded-md bg-white/55 px-2 py-1.5">
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-xl">{TASK_EMOJI[h.type]}</span>
                <span className="truncate font-bold" dir="auto">{h.title}</span>
                <button onClick={() => void removeHabit(h.id)} className="ml-1 text-ink-soft opacity-0 transition hover:text-[#c8503a] group-hover:opacity-100" aria-label={`Delete ${h.title}`}>✕</button>
              </div>
              {week.map((d) => (
                <div key={d} className={`grid place-items-center ${d > today ? 'pointer-events-none opacity-30' : ''}`}>
                  <BlockCheck checked={!!h.log[d]} onChange={() => void toggleHabit(h.id, d)} label={`${h.title} on ${d}`} />
                </div>
              ))}
              <div className="text-center font-pixel text-lg font-bold">🔥 {streakOf(h, today)}</div>
            </div>
          ))}
        </div>
        <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (title.trim()) { void addHabit(title.trim()); setTitle(''); } }}>
          <input className="mc-input" dir="auto" placeholder="New habit… e.g. “Stretch 5 minutes”" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
          <button className="mc-btn" type="submit" disabled={!title.trim()}>+ Add</button>
        </form>
      </Panel>
    </div>
  );
}
