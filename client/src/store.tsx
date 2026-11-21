import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from 'react';
import type {
  Bootstrap, CoachResponse, FocusSession, MutationResult, Settings, Suggestion, Task, TaskType,
} from '../../shared/types';
import { api } from './api';
import { todayKey, addDays } from './lib/date';
import { sfx } from './lib/sound';

export interface Toast { id: number; text: string; kind: 'xp' | 'info' | 'warn' }
export interface Spotlight { type: TaskType; title: string; until: number }

interface Ctx {
  boot: Bootstrap | null;
  error: string | null;
  today: string;
  hour: number;
  tasks: Task[];
  toasts: Toast[];
  levelUp: number | null;
  dismissLevelUp: () => void;
  spotlight: Spotlight | null;
  coach: CoachResponse | null;
  coachLoading: boolean;
  refreshCoach: () => void;

  refresh: () => Promise<void>;
  addTask: (title: string, date: string, minutes?: number, type?: TaskType) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  updateTask: (id: string, patch: Partial<Pick<Task, 'title' | 'minutes' | 'date' | 'type'>>) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  toggleHabit: (id: string, date: string) => Promise<void>;
  addHabit: (title: string) => Promise<void>;
  removeHabit: (id: string) => Promise<void>;
  logFocus: (minutes: number, label?: string) => Promise<FocusSession | null>;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  applySuggestion: (s: Suggestion) => Promise<void>;
  resetAll: () => Promise<void>;
  toast: (text: string, kind?: Toast['kind']) => void;
  setBootChat: (chat: Bootstrap['chat']) => void;
}

const AppCtx = createContext<Ctx | null>(null);
export const useApp = () => {
  const c = useContext(AppCtx);
  if (!c) throw new Error('useApp outside provider');
  return c;
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [boot, setBoot] = useState<Bootstrap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [spotlight, setSpotlight] = useState<Spotlight | null>(null);
  const [coach, setCoach] = useState<CoachResponse | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const toastId = useRef(0);
  const soundOn = useRef(true);

  const today = todayKey();
  const hour = now.getHours();

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    soundOn.current = boot?.settings.sound ?? true;
  }, [boot?.settings.sound]);

  const refresh = useCallback(async () => {
    try {
      const b = await api.bootstrap(todayKey());
      setBoot(b);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, today]);

  const toast = useCallback((text: string, kind: Toast['kind'] = 'info') => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-3), { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  const applyResult = useCallback((r: MutationResult, label?: string) => {
    setBoot((b) => (b ? { ...b, profile: r.profile } : b));
    if (r.xpDelta > 0) {
      toast(`+${r.xpDelta} XP${label ? ` · ${label}` : ''}`, 'xp');
      sfx('xp', soundOn.current);
    } else if (r.xpDelta < 0) {
      toast(`${r.xpDelta} XP`, 'warn');
    }
    if (r.leveledUp) {
      setLevelUp(r.profile.level);
      sfx('level', soundOn.current);
    }
  }, [toast]);

  const tasks = boot?.tasks ?? [];

  /* ───── tasks ───── */
  const addTask: Ctx['addTask'] = useCallback(async (title, date, minutes, type) => {
    try {
      const r = await api.addTask({ title, date, minutes, type });
      setBoot((b) => (b ? { ...b, tasks: [...b.tasks, r.task], profile: r.profile } : b));
      sfx('click', soundOn.current);
    } catch {
      toast('Could not add task', 'warn');
    }
  }, [toast]);

  const toggleTask: Ctx['toggleTask'] = useCallback(async (id) => {
    const t = boot?.tasks.find((x) => x.id === id);
    if (!t) return;
    const done = !t.done;
    setBoot((b) => (b ? { ...b, tasks: b.tasks.map((x) => (x.id === id ? { ...x, done } : x)) } : b));
    sfx(done ? 'check' : 'uncheck', soundOn.current);
    if (done) setSpotlight({ type: t.type, title: t.title, until: Date.now() + 6500 });
    try {
      const r = await api.patchTask(id, { done }, todayKey());
      setBoot((b) => (b ? { ...b, tasks: b.tasks.map((x) => (x.id === id ? r.task : x)) } : b));
      applyResult(r, done ? t.title : undefined);
      void refresh();
    } catch {
      void refresh();
    }
  }, [boot?.tasks, applyResult, refresh]);

  const updateTask: Ctx['updateTask'] = useCallback(async (id, patch) => {
    try {
      const r = await api.patchTask(id, patch, todayKey());
      setBoot((b) => (b ? { ...b, tasks: b.tasks.map((x) => (x.id === id ? r.task : x)), profile: r.profile } : b));
      if (r.xpDelta !== 0) applyResult(r);
    } catch {
      toast('Could not update task', 'warn');
    }
  }, [applyResult, toast]);

  const removeTask: Ctx['removeTask'] = useCallback(async (id) => {
    setBoot((b) => (b ? { ...b, tasks: b.tasks.filter((x) => x.id !== id) } : b));
    try {
      const r = await api.deleteTask(id, todayKey());
      applyResult(r);
      void refresh();
    } catch {
      void refresh();
    }
  }, [applyResult, refresh]);

  /* ───── habits ───── */
  const toggleHabit: Ctx['toggleHabit'] = useCallback(async (id, date) => {
    setBoot((b) => {
      if (!b) return b;
      return {
        ...b,
        habits: b.habits.map((h) => {
          if (h.id !== id) return h;
          const log = { ...h.log };
          if (log[date]) delete log[date]; else log[date] = true;
          return { ...h, log };
        }),
      };
    });
    sfx('check', soundOn.current);
    try {
      const r = await api.toggleHabit(id, date);
      applyResult(r);
      void refresh();
    } catch {
      void refresh();
    }
  }, [applyResult, refresh]);

  const addHabit: Ctx['addHabit'] = useCallback(async (title) => {
    try {
      const r = await api.addHabit(title);
      setBoot((b) => (b ? { ...b, habits: [...b.habits, r.habit] } : b));
    } catch {
      toast('Could not add habit', 'warn');
    }
  }, [toast]);

  const removeHabit: Ctx['removeHabit'] = useCallback(async (id) => {
    setBoot((b) => (b ? { ...b, habits: b.habits.filter((h) => h.id !== id) } : b));
    try { await api.deleteHabit(id); } catch { void refresh(); }
  }, [refresh]);

  /* ───── focus ───── */
  const logFocus: Ctx['logFocus'] = useCallback(async (minutes, label) => {
    try {
      const r = await api.logFocus(minutes, todayKey(), label);
      setBoot((b) => (b ? { ...b, focus: [...b.focus, r.session] } : b));
      applyResult(r, `${minutes} min focus`);
      void refresh();
      return r.session;
    } catch {
      toast('Could not save session', 'warn');
      return null;
    }
  }, [applyResult, refresh, toast]);

  /* ───── settings ───── */
  const updateSettings: Ctx['updateSettings'] = useCallback(async (patch) => {
    setBoot((b) => (b ? { ...b, settings: { ...b.settings, ...patch } } : b));
    try {
      const r = await api.patchSettings(patch, todayKey());
      setBoot((b) => (b ? { ...b, settings: r.settings, quote: r.quote } : b));
    } catch {
      void refresh();
    }
  }, [refresh]);

  const resetAll = useCallback(async () => {
    await api.reset();
    setCoach(null);
    await refresh();
    toast('Fresh world generated', 'info');
  }, [refresh, toast]);

  const setBootChat = useCallback((chat: Bootstrap['chat']) => {
    setBoot((b) => (b ? { ...b, chat } : b));
  }, []);

  /* ───── AI coach (debounced, re-runs when today's plan changes) ───── */
  const sig = useMemo(
    () => tasks.filter((t) => t.date === today).map((t) => `${t.id}:${t.done ? 1 : 0}:${t.minutes}`).join('|') +
      `|${boot?.settings.language}|${boot?.settings.aiEnabled}`,
    [tasks, today, boot?.settings.language, boot?.settings.aiEnabled],
  );
  const coachReq = useRef(0);
  const runCoach = useCallback(async () => {
    const id = ++coachReq.current;
    setCoachLoading(true);
    try {
      const r = await api.coach(todayKey(), new Date().getHours());
      if (id === coachReq.current) setCoach(r);
    } catch {
      /* keep previous message */
    } finally {
      if (id === coachReq.current) setCoachLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!boot) return;
    const t = setTimeout(() => void runCoach(), 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, !!boot]);

  const applySuggestion: Ctx['applySuggestion'] = useCallback(async (s) => {
    if (s.kind === 'add') await addTask(s.title, todayKey(), s.minutes, s.type);
    else await updateTask(s.taskId, { date: addDays(todayKey(), 1) });
    toast(s.kind === 'add' ? 'Added to your plan' : 'Moved to tomorrow', 'info');
  }, [addTask, updateTask, toast]);

  // expire the spotlight so the character returns to its default pose
  useEffect(() => {
    if (!spotlight) return;
    const ms = Math.max(0, spotlight.until - Date.now());
    const t = setTimeout(() => setSpotlight(null), ms);
    return () => clearTimeout(t);
  }, [spotlight]);

  const value: Ctx = {
    boot, error, today, hour, tasks, toasts, levelUp,
    dismissLevelUp: () => setLevelUp(null),
    spotlight, coach, coachLoading, refreshCoach: () => void runCoach(),
    refresh, addTask, toggleTask, updateTask, removeTask, toggleHabit, addHabit, removeHabit,
    logFocus, updateSettings, applySuggestion, resetAll, toast, setBootChat,
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
