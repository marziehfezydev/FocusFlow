export type TaskType =
  | 'water' | 'exercise' | 'study' | 'german' | 'reading'
  | 'planning' | 'sleep' | 'meditate' | 'code' | 'custom';

export type Lang = 'en' | 'fa';

export interface Task {
  id: string;
  title: string;
  type: TaskType;
  minutes: number;
  date: string; // YYYY-MM-DD (user's local date)
  done: boolean;
  xp: number;
  createdAt: string;
  completedAt?: string;
}

export interface Habit {
  id: string;
  title: string;
  type: TaskType;
  xp: number;
  log: Record<string, boolean>;
  createdAt: string;
}

export interface FocusSession {
  id: string;
  date: string;
  minutes: number;
  label?: string;
  completedAt: string;
}

export interface Settings {
  name: string;
  language: Lang;
  sound: boolean;
  dailyFocusGoal: number; // minutes
  aiEnabled: boolean;
  onboarded: boolean;
}

export interface XpEvent {
  id: string;
  ts: string;
  date: string;
  label: string;
  xp: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  ts: string;
}

export interface Profile {
  totalXp: number;
  level: number;
  xpInLevel: number;
  xpForLevel: number;
  streak: number;
  bestStreak: number;
}

export interface Quote {
  text: string;
  author: string;
  lang: Lang;
}

export interface Bootstrap {
  settings: Settings;
  profile: Profile;
  tasks: Task[];
  habits: Habit[];
  focus: FocusSession[];
  events: XpEvent[];
  chat: ChatMessage[];
  quote: Quote;
  aiMode: 'claude' | 'offline';
}

export interface MutationResult {
  profile: Profile;
  xpDelta: number;
  leveledUp: boolean;
}

export type Suggestion =
  | { kind: 'add'; title: string; minutes: number; type: TaskType }
  | { kind: 'move'; taskId: string; title: string };

export interface CoachResponse {
  message: string;
  suggestions: Suggestion[];
  mood: 'proud' | 'nudge' | 'calm' | 'celebrate';
  source: 'claude' | 'offline';
}

export interface EveningResponse {
  title: string;
  text: string;
  source: 'claude' | 'offline';
}

export interface DayStat {
  date: string;
  planned: number;
  done: number;
  xp: number;
  focusMinutes: number;
}

export interface StatsResponse {
  days: DayStat[];
  totals: {
    tasksDone: number;
    focusMinutes: number;
    xp: number;
    completionRate: number;
    habitChecks: number;
  };
  byType: { type: TaskType; done: number }[];
}
