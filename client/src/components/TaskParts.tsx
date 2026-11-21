import { useState } from 'react';
import type { Task } from '../../../shared/types';
import { useApp } from '../store';
import { BlockCheck } from './Cube';
import { TASK_EMOJI } from './Sprite';
import { Pill, rtlAttr } from './ui';

export function TaskRow({
  task, onHover, editable = false, showDate = false,
}: { task: Task; onHover?: (t: Task | null) => void; editable?: boolean; showDate?: boolean }) {
  const { toggleTask, removeTask, updateTask } = useApp();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [mins, setMins] = useState(String(task.minutes));

  const save = () => {
    const m = Math.max(5, Math.min(480, parseInt(mins, 10) || task.minutes));
    if (title.trim() && (title.trim() !== task.title || m !== task.minutes)) {
      void updateTask(task.id, { title: title.trim(), minutes: m });
    }
    setEditing(false);
  };

  return (
    <div
      className="group flex items-center gap-3 border-b border-peach-d/50 py-2 last:border-0"
      onMouseEnter={() => onHover?.(task)}
      onMouseLeave={() => onHover?.(null)}
    >
      <BlockCheck checked={task.done} onChange={() => void toggleTask(task.id)} label={`Complete ${task.title}`} />
      <span className="text-lg" aria-hidden>{TASK_EMOJI[task.type]}</span>
      {editing ? (
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <input
            autoFocus className="mc-input !py-1" value={title} maxLength={100}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
          />
          <input
            className="mc-input !w-20 !py-1" type="number" min={5} max={480} value={mins}
            onChange={(e) => setMins(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()}
          />
          <button className="mc-btn sm" onClick={save}>Save</button>
        </div>
      ) : (
        <button
          className={`min-w-0 flex-1 truncate text-left font-bold ${task.done ? 'text-ink-soft line-through decoration-2' : ''}`}
          dir={rtlAttr(task.title)}
          onDoubleClick={() => editable && setEditing(true)}
          onClick={() => editable && setEditing(true)}
          title={editable ? 'Click to edit' : undefined}
        >
          {task.title}
          <span className="ml-2 text-sm font-semibold text-ink-soft">{task.minutes} min</span>
        </button>
      )}
      {showDate && <Pill>{task.date.slice(5)}</Pill>}
      <Pill tone={task.done ? 'green' : 'gold'}>{task.done ? '✓' : ''} {task.xp} XP</Pill>
      <button
        onClick={() => void removeTask(task.id)}
        className="grid h-7 w-7 place-items-center rounded font-extrabold text-ink-soft opacity-0 transition hover:bg-[#fde0d8] hover:text-[#c8503a] focus:opacity-100 group-hover:opacity-100"
        aria-label={`Delete ${task.title}`}
      >
        ✕
      </button>
    </div>
  );
}

const MINUTES = [5, 10, 15, 20, 30, 45, 60, 90, 120];

export function AddTaskForm({ date, compact = false }: { date: string; compact?: boolean }) {
  const { addTask } = useApp();
  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState(20);

  const submit = async () => {
    const t = title.trim();
    if (!t) return;
    setTitle('');
    await addTask(t, date, minutes);
  };

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); void submit(); }}
      className={`flex flex-wrap items-center gap-2 ${compact ? 'mt-3' : ''}`}
    >
      <input
        className="mc-input min-w-[10rem] flex-1" placeholder="New goal… e.g. “Drink 8 glasses of water”"
        value={title} maxLength={100} dir="auto" onChange={(e) => setTitle(e.target.value)}
        aria-label="Task title"
      />
      <select className="mc-input !w-28" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} aria-label="Minutes">
        {MINUTES.map((m) => <option key={m} value={m}>{m} min</option>)}
      </select>
      <button className="mc-btn" type="submit" disabled={!title.trim()}>+ Add</button>
    </form>
  );
}
