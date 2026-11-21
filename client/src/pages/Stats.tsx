import { useEffect, useMemo, useState } from 'react';
import type { StatsResponse } from '../../../shared/types';
import { useApp } from '../store';
import { api } from '../api';
import { Panel, Tabs, Stat, Bar } from '../components/ui';
import { TASK_EMOJI } from '../components/Sprite';
import { weekday, fmtShort } from '../lib/date';

type Range = 7 | 30;

function Bars({
  data, color, ghost, height = 150, unit = '',
}: {
  data: { label: string; value: number; ghost?: number }[];
  color: [string, string, string]; ghost?: boolean; height?: number; unit?: string;
}) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.value, d.ghost ?? 0)));
  const W = 600;
  const pad = 22;
  const slot = (W - pad * 2) / data.length;
  const bw = Math.min(34, slot * 0.62);
  const base = height - 20;
  const h = (v: number) => (v / max) * (base - 14);
  const every = data.length > 14 ? Math.ceil(data.length / 8) : 1;
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="w-full" shapeRendering="crispEdges" role="img">
      <line x1={pad} x2={W - pad} y1={base} y2={base} stroke="#e3b99d" strokeWidth="3" />
      {data.map((d, i) => {
        const x = pad + slot * i + (slot - bw) / 2;
        return (
          <g key={i}>
            {d.ghost !== undefined && d.ghost > 0 && (
              <rect x={x} y={base - h(d.ghost)} width={bw} height={h(d.ghost)} fill="#f3d8c6" />
            )}
            {d.value > 0 && (
              <>
                <rect x={x} y={base - h(d.value)} width={bw} height={h(d.value)} fill={color[1]} />
                <rect x={x} y={base - h(d.value)} width={bw} height={Math.min(6, h(d.value))} fill={color[0]} />
                <rect x={x + bw - 5} y={base - h(d.value) + 6} width={5} height={Math.max(0, h(d.value) - 6)} fill={color[2]} />
                {data.length <= 14 && (
                  <text x={x + bw / 2} y={base - h(d.value) - 4} textAnchor="middle" fontSize="12" fontWeight="800" fill="#5b3a29">{d.value}{unit}</text>
                )}
              </>
            )}
            {i % every === 0 && <text x={x + bw / 2} y={height - 5} textAnchor="middle" fontSize="11" fontWeight="700" fill="#9b7560">{d.label}</text>}
          </g>
        );
      })}
    </svg>
  );
}

export default function StatsPage() {
  const { boot, tasks, today } = useApp();
  const [range, setRange] = useState<Range>(7);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const sig = `${tasks.filter((t) => t.done).length}-${tasks.length}-${boot!.profile.totalXp}-${boot!.focus.length}`;

  useEffect(() => {
    let off = false;
    api.stats(today, 30).then((s) => { if (!off) setStats(s); }).catch(() => undefined);
    return () => { off = true; };
  }, [today, sig]);

  const view = useMemo(() => {
    if (!stats) return null;
    const days = stats.days.slice(-range);
    const label = (d: string) => (range === 7 ? weekday(d) : fmtShort(d).replace(' ', ' '));
    const planned = days.reduce((s, d) => s + d.planned, 0);
    const done = days.reduce((s, d) => s + d.done, 0);
    const focus = days.reduce((s, d) => s + d.focusMinutes, 0);
    const xp = days.reduce((s, d) => s + d.xp, 0);
    const types = new Map<string, number>();
    const set = new Set(days.map((d) => d.date));
    tasks.filter((t) => t.done && set.has(t.date)).forEach((t) => types.set(t.type, (types.get(t.type) ?? 0) + 1));
    return {
      days, label, done, focus, xp,
      rate: planned ? Math.round((done / planned) * 100) : 0,
      types: [...types.entries()].sort((a, b) => b[1] - a[1]),
      habits: boot!.habits.reduce((s, h) => s + Object.keys(h.log).filter((d) => set.has(d)).length, 0),
    };
  }, [stats, range, tasks, boot]);

  if (!view) return <div className="font-pixel text-2xl font-bold anim-pulse">Counting blocks…</div>;
  const maxType = Math.max(1, ...view.types.map(([, n]) => n));

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs<string> value={String(range)} onChange={(v) => setRange(Number(v) as Range)} options={[{ value: '7', label: 'Last 7 days' }, { value: '30', label: 'Last 30 days' }]} />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Tasks done" value={view.done} />
        <Stat label="Completion" value={`${view.rate}%`} />
        <Stat label="Focus" value={`${Math.floor(view.focus / 60)}h ${view.focus % 60}m`} />
        <Stat label="XP earned" value={view.xp} />
        <Stat label="Habit checks" value={view.habits} />
        <Stat label="Streak" value={`${boot!.profile.streak}d`} sub={`best ${boot!.profile.bestStreak}d`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Tasks completed" icon="tasks">
          <Bars data={view.days.map((d) => ({ label: view.label(d.date), value: d.done, ghost: d.planned }))} color={['#9be79a', '#6fcb6f', '#4fa35a']} />
          <p className="mt-1 text-xs font-bold text-ink-soft">Green = completed · pale = planned</p>
        </Panel>
        <Panel title="XP per day" icon="star">
          <Bars data={view.days.map((d) => ({ label: view.label(d.date), value: Math.max(0, d.xp) }))} color={['#ffe48a', '#f6c453', '#d9a52e']} />
        </Panel>
        <Panel title="Focus minutes" icon="focus">
          <Bars data={view.days.map((d) => ({ label: view.label(d.date), value: d.focusMinutes }))} color={['#dcd0ff', '#b9a6f3', '#9a86dd']} />
        </Panel>
        <Panel title="What you finish most" icon="chest">
          {view.types.length === 0 && <div className="py-6 text-center font-bold text-ink-soft">Complete some goals to see your top activities.</div>}
          <div className="grid gap-2">
            {view.types.map(([t, n]) => (
              <div key={t} className="flex items-center gap-3">
                <span className="w-7 text-xl">{TASK_EMOJI[t]}</span>
                <span className="w-20 text-sm font-extrabold capitalize">{t}</span>
                <div className="flex-1"><Bar value={n} max={maxType} label={t} /></div>
                <span className="w-6 text-right font-pixel font-bold">{n}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Last 30 days" icon="calendar">
        <div className="flex flex-wrap gap-1.5">
          {stats!.days.map((d) => {
            const r = d.planned ? d.done / d.planned : 0;
            const c = d.planned === 0 && d.focusMinutes === 0 ? '#f3dccb' : r >= 1 ? '#4fa35a' : r >= 0.5 ? '#7bc67e' : r > 0 ? '#b8e6b4' : '#f6d27a';
            return <div key={d.date} title={`${fmtShort(d.date)} — ${d.done}/${d.planned} tasks`} className="h-8 w-8 rounded-[3px] border-2 border-black/10" style={{ background: c }} />;
          })}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-extrabold text-ink-soft">
          {[['#f3dccb', 'no activity'], ['#f6d27a', 'planned'], ['#b8e6b4', '<50%'], ['#7bc67e', '50%+'], ['#4fa35a', 'perfect']].map(([c, l]) => (
            <span key={l} className="flex items-center gap-1"><span className="h-3 w-3 rounded-[2px]" style={{ background: c }} />{l}</span>
          ))}
        </div>
      </Panel>
    </div>
  );
}
