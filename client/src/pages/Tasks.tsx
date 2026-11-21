import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../store';
import { Panel, Tabs, Empty, Stat } from '../components/ui';
import { TaskRow, AddTaskForm } from '../components/TaskParts';
import { fmtLong } from '../lib/date';

type Filter = 'today' | 'upcoming' | 'all' | 'done';

export default function TasksPage() {
  const { tasks, today, removeTask } = useApp();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const [filter, setFilter] = useState<Filter>('today');
  const [date, setDate] = useState(today);

  const visible = useMemo(() => {
    let list = tasks;
    if (filter === 'today') list = list.filter((t) => t.date === today);
    else if (filter === 'upcoming') list = list.filter((t) => t.date > today);
    else if (filter === 'done') list = list.filter((t) => t.done);
    if (q.trim()) list = list.filter((t) => t.title.toLowerCase().includes(q.trim().toLowerCase()));
    return list;
  }, [tasks, filter, q, today]);

  const groups = useMemo(() => {
    const m = new Map<string, typeof visible>();
    [...visible]
      .sort((a, b) => (filter === 'upcoming' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)) || a.createdAt.localeCompare(b.createdAt))
      .forEach((t) => m.set(t.date, [...(m.get(t.date) ?? []), t]));
    return [...m.entries()];
  }, [visible, filter]);

  const todays = tasks.filter((t) => t.date === today);
  const doneToday = todays.filter((t) => t.done).length;
  const xpToday = todays.filter((t) => t.done).reduce((s, t) => s + t.xp, 0);
  const planned = todays.reduce((s, t) => s + t.minutes, 0);

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Done today" value={`${doneToday}/${todays.length}`} />
        <Stat label="XP earned today" value={xpToday} />
        <Stat label="Planned time" value={`${Math.floor(planned / 60)}h ${planned % 60}m`} />
        <Stat label="Open tasks" value={tasks.filter((t) => !t.done).length} sub="all days" />
      </div>

      <Panel title="Add a goal" icon="tasks">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-sm font-extrabold text-ink-soft">
          For day:
          <input type="date" className="mc-input !w-44" value={date} onChange={(e) => setDate(e.target.value || today)} />
          <button className="mc-btn soft sm" onClick={() => setDate(today)}>Today</button>
        </div>
        <AddTaskForm date={date} />
        <p className="mt-2 text-xs font-bold text-ink-soft">
          Tip: the character acts out your goal — try “Drink water”, “Exercise”, “Read a book”, “Practice German”, “Write code”, “Meditate”, “Sleep”…
        </p>
      </Panel>

      <Panel
        title="Your goals" icon="tasks"
        action={
          <div className="flex flex-wrap items-center gap-2">
            {q && <button className="mc-btn soft sm" onClick={() => setParams({})}>Search: “{q}” ✕</button>}
            <Tabs<Filter>
              value={filter} onChange={setFilter}
              options={[{ value: 'today', label: 'Today' }, { value: 'upcoming', label: 'Upcoming' }, { value: 'all', label: 'All' }, { value: 'done', label: 'Done' }]}
            />
          </div>
        }
      >
        {groups.length === 0 && <Empty title="Nothing here yet" hint="Add a goal above to place your first block." />}
        {groups.map(([d, list]) => (
          <div key={d} className="mb-3 last:mb-0">
            <div className="mb-1 flex items-center justify-between">
              <div className="font-pixel text-lg font-bold">{d === today ? 'Today' : fmtLong(d)}</div>
              {filter === 'done' && (
                <button className="mc-btn soft sm" onClick={() => list.forEach((t) => void removeTask(t.id))}>Clear</button>
              )}
            </div>
            {list.map((t) => <TaskRow key={t.id} task={t} editable showDate={filter === 'all' || filter === 'done'} />)}
          </div>
        ))}
      </Panel>
    </div>
  );
}
