import type {
  Bootstrap, ChatMessage, CoachResponse, EveningResponse, FocusSession, Habit,
  MutationResult, Quote, Settings, StatsResponse, Task, TaskType,
} from '../../shared/types';

/** Empty = same origin (local dev proxy or single-server mode). Set VITE_API_URL when the API lives on another domain. */
const BASE = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/+$/, '');
const TOKEN_KEY = 'ff-token';
const USER_KEY = 'ff-user';
const safe = <T,>(fn: () => T, fallback: T): T => { try { return fn(); } catch { return fallback; } };

export const getToken = () => safe(() => localStorage.getItem(TOKEN_KEY), null);
export const getUser = () => safe(() => localStorage.getItem(USER_KEY), null);
export const setSession = (token: string | null, username?: string) =>
  safe(() => {
    if (token) { localStorage.setItem(TOKEN_KEY, token); if (username) localStorage.setItem(USER_KEY, username); }
    else { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); }
  }, undefined);
export const logout = () => {
  setSession(null);
  safe(() => { localStorage.removeItem('ff-timer'); localStorage.removeItem('ff-seen'); }, undefined);
  window.dispatchEvent(new Event('ff-logout'));
};

async function req<T>(method: string, url: string, body?: unknown): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (res.status === 401) logout(); // expired or invalid login → back to the login screen
  if (!res.ok) throw new Error(`${method} ${url} → ${res.status}`);
  return res.json() as Promise<T>;
}

export interface AuthStatus { registrationOpen: boolean; inviteRequired: boolean; users: number; guestsEnabled?: boolean }
async function authReq<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(BASE + url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Something went wrong');
  return data as T;
}
export const authApi = {
  status: () => authReq<AuthStatus>('GET', '/api/auth/status'),
  login: (username: string, password: string) =>
    authReq<{ token: string; username: string }>('POST', '/api/auth/login', { username, password }),
  guest: () => authReq<{ token: string; username: string }>('POST', '/api/auth/guest'),
  register: (username: string, password: string, invite?: string) =>
    authReq<{ token: string; username: string }>('POST', '/api/auth/register', { username, password, invite }),
};

type TaskRes = MutationResult & { task: Task };

export const api = {
  bootstrap: (today: string) => req<Bootstrap>('GET', `/api/bootstrap?today=${today}`),
  addTask: (b: { title: string; date: string; minutes?: number; type?: TaskType }) =>
    req<TaskRes>('POST', '/api/tasks', b),
  patchTask: (id: string, b: Partial<Pick<Task, 'title' | 'minutes' | 'date' | 'done' | 'type'>>, today: string) =>
    req<TaskRes>('PATCH', `/api/tasks/${id}?today=${today}`, b),
  deleteTask: (id: string, today: string) => req<MutationResult>('DELETE', `/api/tasks/${id}?today=${today}`),

  addHabit: (title: string) => req<{ habit: Habit }>('POST', '/api/habits', { title }),
  toggleHabit: (id: string, date: string) =>
    req<MutationResult & { habit: Habit }>('POST', `/api/habits/${id}/toggle`, { date }),
  deleteHabit: (id: string) => req<{ ok: true }>('DELETE', `/api/habits/${id}`),

  logFocus: (minutes: number, date: string, label?: string) =>
    req<MutationResult & { session: FocusSession }>('POST', '/api/focus', { minutes, date, label }),

  patchSettings: (b: Partial<Settings>, today: string) =>
    req<{ settings: Settings; quote: Quote }>('PATCH', `/api/settings?today=${today}`, b),
  reset: () => req<{ ok: true }>('POST', '/api/reset'),

  coach: (date: string, hour: number) => req<CoachResponse>('POST', '/api/ai/coach', { date, hour }),
  evening: (date: string, hour: number) => req<EveningResponse>('POST', '/api/ai/evening', { date, hour }),
  chat: (message: string, date: string, hour: number) =>
    req<{ message: ChatMessage; source: 'claude' | 'offline' }>('POST', '/api/ai/chat', { message, date, hour }),
  clearChat: () => req<{ ok: true }>('DELETE', '/api/ai/chat'),

  stats: (today: string, days: number) => req<StatsResponse>('GET', `/api/stats?today=${today}&days=${days}`),
};