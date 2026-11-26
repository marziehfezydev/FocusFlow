import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../store';
import { Sprite, type SpriteName } from './Sprite';
import { Avatar } from './Avatar';
import { Bar } from './ui';
import { Cube } from './Cube';
import { levelTitle } from '../lib/village';
import { fmtShort } from '../lib/date';

const NAV: { to: string; label: string; icon: SpriteName; title: string }[] = [
  { to: '/', label: 'Dashboard', icon: 'house', title: '' },
  { to: '/tasks', label: 'My Tasks', icon: 'tasks', title: 'My Tasks' },
  { to: '/calendar', label: 'Calendar', icon: 'calendar', title: 'Calendar' },
  { to: '/habits', label: 'Habits', icon: 'habits', title: 'Habits' },
  { to: '/focus', label: 'Focus Mode', icon: 'focus', title: 'Focus Mode' },
  { to: '/companion', label: 'AI Companion', icon: 'companion', title: 'AI Companion' },
  { to: '/stats', label: 'Statistics', icon: 'stats', title: 'Statistics' },
  { to: '/village', label: 'My Village', icon: 'village', title: 'My Village' },
  { to: '/settings', label: 'Settings', icon: 'settings', title: 'Settings' },
];

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <Cube size={54} top="#9be79a" left="#b07a4f" right="#8a5a38" />
      <div>
        <div className="font-pixel text-[1.65rem] font-bold leading-none text-[#5a3a6e]">FocusFlow</div>
        <div className="mt-1 text-sm font-bold text-ink-soft">Build Your Better Day <span className="text-pink">♥</span></div>
      </div>
    </div>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { boot } = useApp();
  const p = boot?.profile;
  return (
    <aside className="flex h-full flex-col gap-4 overflow-y-auto p-4 scroll-thin">
      <Logo />
      <nav className="mt-2 flex flex-col gap-1">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            onClick={onNavigate}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Sprite name={n.icon} size={24} />
            <span>{n.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto flex flex-col items-center gap-3 pt-2">
        <Avatar action="idle" size={120} className="drop-shadow-[0_6px_0_rgba(120,170,90,.35)]" />
        {p && (
          <NavLink to="/village" onClick={onNavigate} className="mc-panel block w-full px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Sprite name="star" size={22} />
              <div className="font-pixel text-lg font-bold">Level {p.level}</div>
              <div className="ml-auto"><Sprite name="chest" size={34} className="anim-bob" /></div>
            </div>
            <div className="mt-1 text-[11px] font-extrabold uppercase tracking-wide text-ink-soft">{levelTitle(p.level)}</div>
            <div className="mt-1.5"><Bar value={p.xpInLevel} max={p.xpForLevel} tone="gold" label="XP to next level" /></div>
            <div className="mt-1 text-xs font-bold text-ink-soft">{p.xpInLevel} / {p.xpForLevel} XP</div>
          </NavLink>
        )}
      </div>
    </aside>
  );
}

function SearchBox() {
  const { tasks } = useApp();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const results = useMemo(
    () => (q.trim() ? tasks.filter((t) => t.title.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 6) : []),
    [q, tasks],
  );
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div ref={ref} className="relative min-w-0 flex-1 sm:max-w-[18rem]">
      <div className="mc-inset flex items-center gap-2 px-3 py-1.5">
        <Sprite name="search" size={20} />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && q.trim()) { nav(`/tasks?q=${encodeURIComponent(q.trim())}`); setOpen(false); }
          }}
          placeholder="Search tasks..."
          className="w-full min-w-0 bg-transparent font-bold outline-none placeholder:text-ink-soft/70"
        />
      </div>
      {open && q.trim() && (
        <div className="mc-panel absolute left-0 right-0 top-[110%] z-30 p-2">
          {results.length === 0 && <div className="px-2 py-1.5 text-sm font-bold text-ink-soft">No tasks found</div>}
          {results.map((t) => (
            <button
              key={t.id}
              onClick={() => { nav(`/tasks?q=${encodeURIComponent(q.trim())}`); setOpen(false); }}
              className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm font-bold hover:bg-peach"
            >
              <span className={t.done ? 'line-through opacity-60' : ''}>{t.title}</span>
              <span className="text-xs text-ink-soft">{fmtShort(t.date)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Bell() {
  const { boot } = useApp();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(() => localStorage.getItem('ff-seen') ?? '');
  const ref = useRef<HTMLDivElement>(null);
  const events = boot?.events ?? [];
  const unread = events.filter((e) => e.ts > seen).length;
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const toggle = () => {
    setOpen((o) => !o);
    if (!open && events[0]) {
      localStorage.setItem('ff-seen', events[0].ts);
      setSeen(events[0].ts);
    }
  };
  return (
    <div ref={ref} className="relative">
      <button onClick={toggle} className="relative grid h-11 w-11 place-items-center rounded-md transition hover:bg-white/60" aria-label="Notifications">
        <Sprite name="bell" size={30} />
        {unread > 0 && (
          <span className="absolute right-0 top-0 grid h-5 min-w-5 place-items-center rounded-full bg-[#ef5b5b] px-1 text-[11px] font-extrabold text-white ring-2 ring-cream">
            {Math.min(unread, 9)}
          </span>
        )}
      </button>
      {open && (
        <div className="mc-panel fixed inset-x-3 top-20 z-30 p-3 sm:absolute sm:inset-x-auto sm:right-0 sm:top-[115%] sm:w-72">
          <div className="mb-2 font-pixel text-lg font-bold">Recent XP</div>
          <div className="scroll-thin max-h-72 overflow-y-auto">
            {events.length === 0 && <div className="text-sm font-bold text-ink-soft">Finish a task to earn your first XP!</div>}
            {events.slice(0, 12).map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-2 border-b border-peach-d/40 py-1.5 text-sm">
                <span className="truncate font-bold">{e.label}</span>
                <span className={`font-pixel font-bold ${e.xp >= 0 ? 'text-grass-d' : 'text-[#d9534f]'}`}>{e.xp >= 0 ? '+' : ''}{e.xp}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Toasts() {
  const { toasts } = useApp();
  return (
    <div className="pointer-events-none fixed right-4 top-20 z-50 flex flex-col items-end gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{ animation: 'fly-up 2.6s ease both' }}
          className={`flex items-center gap-2 rounded-md border-[3px] px-3 py-2 font-pixel text-lg font-bold shadow-[0_4px_0_rgba(0,0,0,.15)] ${
            t.kind === 'xp' ? 'border-[#3f8f4c] bg-[#e4f9e0] text-grass-d' : t.kind === 'warn' ? 'border-[#d9a08f] bg-[#fde8e0] text-[#b5543f]' : 'border-peach-d bg-cream text-ink'
          }`}
        >
          {t.kind === 'xp' && <Cube size={20} top="#9be79a" left="#58b865" right="#3f9150" />}
          {t.text}
        </div>
      ))}
    </div>
  );
}

function LevelUpModal() {
  const { levelUp, dismissLevelUp } = useApp();
  if (levelUp == null) return null;
  const confetti = Array.from({ length: 36 }, (_, i) => i);
  const colors = ['#ff9fc2', '#ffd35c', '#8fd3ff', '#b69cf2', '#7bc67e', '#f19a74'];
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-[#5b3a29]/45 p-4" onClick={dismissLevelUp}>
      {confetti.map((i) => (
        <span
          key={i}
          className="pointer-events-none fixed top-0 block h-3 w-3"
          style={{
            left: `${(i * 97) % 100}%`, background: colors[i % colors.length],
            animation: `confetti ${2.2 + (i % 5) * 0.4}s linear ${(i % 7) * 0.15}s infinite`,
          }}
        />
      ))}
      <div className="mc-panel anim-pop relative max-w-sm px-8 py-7 text-center" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto w-fit" style={{ perspective: 400 }}>
          <div style={{ animation: 'spin3d 3s linear infinite' }}>
            <Cube size={96} top="#ffe888" left="#f6c453" right="#d9a52e" />
          </div>
        </div>
        <div className="mt-3 font-pixel text-4xl font-bold text-grass-d">LEVEL UP!</div>
        <div className="mt-1 font-pixel text-2xl font-bold">Level {levelUp} · {levelTitle(levelUp)}</div>
        <p className="mt-3 text-sm font-bold text-ink-soft">Your village grows stronger. Keep stacking those small wins!</p>
        <button className="mc-btn mt-5" onClick={dismissLevelUp}>Awesome!</button>
      </div>
    </div>
  );
}

function FloatingCubes() {
  const items = [
    { l: '6%', t: '18%', s: 26, d: '0s', c: ['#a6e3a1', '#b07a4f', '#8a5a38'] },
    { l: '92%', t: '32%', s: 20, d: '1.2s', c: ['#ffe888', '#f6c453', '#d9a52e'] },
    { l: '48%', t: '88%', s: 22, d: '2.4s', c: ['#d9ccff', '#b9a6f3', '#9a86dd'] },
    { l: '88%', t: '78%', s: 28, d: '.6s', c: ['#a6e3a1', '#b07a4f', '#8a5a38'] },
  ];
  return (
    <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden" aria-hidden>
      {items.map((it, i) => (
        <div key={i} className="anim-floaty absolute opacity-40" style={{ left: it.l, top: it.t, animationDelay: it.d }}>
          <Cube size={it.s} top={it.c[0]} left={it.c[1]} right={it.c[2]} />
        </div>
      ))}
    </div>
  );
}

export function Shell() {
  const { boot, error, refresh } = useApp();
  const loc = useLocation();
  const [drawer, setDrawer] = useState(false);
  const title = NAV.find((n) => n.to === loc.pathname)?.title ?? '';
  useEffect(() => setDrawer(false), [loc.pathname]);

  if (!boot) {
    return (
      <div className="grid h-full place-items-center p-6 text-center">
        <div className="mc-panel max-w-sm px-8 py-8">
          <div className="mx-auto w-fit anim-floaty"><Cube size={64} /></div>
          {error ? (
            <>
              <div className="mt-4 font-pixel text-2xl font-bold">Can’t reach the server</div>
              <p className="mt-2 text-sm font-bold text-ink-soft">Start the API with <code>npm run dev</code> (port 4000) and try again.</p>
              <button className="mc-btn mt-4" onClick={() => void refresh()}>Retry</button>
            </>
          ) : (
            <div className="mt-4 font-pixel text-2xl font-bold anim-pulse">Generating world…</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex h-full max-w-[1760px] gap-0 p-2 sm:p-4">
      <FloatingCubes />
      {/* desktop sidebar */}
      <div className="mc-panel relative z-10 hidden w-[17.5rem] shrink-0 lg:block">
        <Sidebar />
      </div>
      {/* mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-40 bg-[#5b3a29]/40 lg:hidden" onClick={() => setDrawer(false)}>
          <div className="mc-panel h-full w-72 max-w-[85%]" onClick={(e) => e.stopPropagation()}>
            <Sidebar onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}
      <main className="relative z-10 flex min-w-0 flex-1 flex-col lg:pl-5">
        <div className="flex items-center gap-3 pb-3 pt-1">
          <div className="lg:hidden">
            <button className="mc-btn soft sm" onClick={() => setDrawer(true)} aria-label="Open menu">☰</button>
          </div>
          <h1 className="hidden font-pixel text-3xl font-bold sm:block">{title}</h1>
          <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2">
            <SearchBox />
            <Bell />
            <NavLink to="/settings" className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-md border-[3px] border-peach-d bg-peach shadow-[0_3px_0_#d9a98b]" aria-label="Profile">
              <div className="-mt-3"><Avatar action="idle" size={56} /></div>
            </NavLink>
          </div>
        </div>
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-6 pr-1">
          <Outlet />
        </div>
      </main>
      <Toasts />
      <LevelUpModal />
      <NamePrompt />
    </div>
  );
}

function NamePrompt() {
  const { boot, updateSettings } = useApp();
  const [name, setName] = useState('');
  if (!boot || boot.settings.onboarded) return null;
  const submit = () => void updateSettings({ name: name.trim() || boot.settings.name, onboarded: true });
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-[#5b3a29]/50 p-4">
      <div className="mc-panel anim-pop w-full max-w-md px-7 py-7 text-center">
        <div className="mx-auto w-fit"><Avatar action="german" size={150} /></div>
        <div className="font-pixel text-3xl font-bold">Welcome, Adventurer!</div>
        <p className="mt-1 text-sm font-bold text-ink-soft">Your world is ready. What should we call you?</p>
        <input
          autoFocus className="mc-input mt-4 text-center text-lg" placeholder="Your name" value={name} maxLength={30}
          onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <button className="mc-btn mt-4 w-full" onClick={submit}>Start building ▸</button>
      </div>
    </div>
  );
}
