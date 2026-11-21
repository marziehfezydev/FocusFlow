import { useEffect, useState } from 'react';
import { useApp } from '../store';
import { Panel, Pill } from '../components/ui';
import { Avatar } from '../components/Avatar';
import { getUser, logout } from '../api';

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={`relative h-8 w-16 rounded-md border-[3px] transition ${on ? 'border-[#3f8f4c] bg-grass' : 'border-peach-d bg-peach'}`}
    >
      <span className={`absolute top-0.5 h-5 w-6 rounded-sm bg-white shadow-[0_2px_0_rgba(0,0,0,.2)] transition-all ${on ? 'left-[2.1rem]' : 'left-0.5'}`} />
    </button>
  );
}

function Row({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-peach-d/50 py-3 last:border-0">
      <div className="min-w-0">
        <div className="font-extrabold">{title}</div>
        {hint && <div className="text-sm font-semibold text-ink-soft">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { boot, updateSettings, resetAll } = useApp();
  const s = boot!.settings;
  const [name, setName] = useState(s.name);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => setName(s.name), [s.name]);

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_16rem]">
      <div className="grid content-start gap-4">
        <Panel title="Profile" icon="settings">
          <Row title="Your name" hint="Shown in the greeting and used by Bit.">
            <div className="flex gap-2">
              <input className="mc-input !w-48" value={name} maxLength={30} onChange={(e) => setName(e.target.value)} />
              <button className="mc-btn" disabled={!name.trim() || name === s.name} onClick={() => void updateSettings({ name: name.trim() })}>Save</button>
            </div>
          </Row>
          <Row title="Language for AI & quotes" hint="Bit replies, daily quotes and evening notes follow this.">
            <div className="flex gap-1">
              <button className={`mc-btn sm ${s.language === 'en' ? '' : 'soft'}`} onClick={() => void updateSettings({ language: 'en' })}>English</button>
              <button className={`mc-btn sm ${s.language === 'fa' ? '' : 'soft'}`} onClick={() => void updateSettings({ language: 'fa' })}>فارسی</button>
            </div>
          </Row>
          <Row title="Daily focus goal" hint="Minutes of deep focus you aim for each day.">
            <select className="mc-input !w-32" value={s.dailyFocusGoal} onChange={(e) => void updateSettings({ dailyFocusGoal: Number(e.target.value) })}>
              {[30, 60, 90, 120, 180, 240, 300].map((m) => <option key={m} value={m}>{m} min</option>)}
            </select>
          </Row>
        </Panel>

        <Panel title="Experience" icon="star">
          <Row title="Sound effects" hint="Little 8-bit blips when you complete things.">
            <Toggle on={s.sound} onChange={(v) => void updateSettings({ sound: v })} label="Sound effects" />
          </Row>
          <Row
            title="AI coach"
            hint={boot!.aiMode === 'claude' ? 'Connected to Claude on the server.' : 'No API key found — using the built-in offline coach. Set ANTHROPIC_API_KEY in server/.env.'}
          >
            <div className="flex items-center gap-3">
              <Pill tone={boot!.aiMode === 'claude' ? 'lav' : 'peach'}>{boot!.aiMode === 'claude' ? '✨ Claude' : 'Offline'}</Pill>
              <Toggle on={s.aiEnabled} onChange={(v) => void updateSettings({ aiEnabled: v })} label="AI coach" />
            </div>
          </Row>
        </Panel>

        <Panel title="Account" icon="settings">
          <Row title={`Signed in as ${getUser() ?? 'you'}`} hint="Your village is saved on the server under this account, so it follows you to any device.">
            <button className="mc-btn soft sm" onClick={logout}>Log out</button>
          </Row>
        </Panel>

        <Panel title="Danger zone" icon="chest">
          <Row title="Reset my world" hint="Deletes all tasks, XP, focus sessions and chat history. Habits stay, with their logs cleared.">
            {confirm ? (
              <div className="flex gap-2">
                <button className="mc-btn soft sm" onClick={() => setConfirm(false)}>Cancel</button>
                <button className="mc-btn sm !border-[#a63a2b] !bg-[#e4675a]" onClick={() => { void resetAll(); setConfirm(false); }}>Yes, reset everything</button>
              </div>
            ) : (
              <button className="mc-btn soft sm" onClick={() => setConfirm(true)}>Reset…</button>
            )}
          </Row>
        </Panel>
      </div>

      <Panel className="hidden h-fit xl:block">
        <div className="grid place-items-center text-center">
          <Avatar action="german" size={170} />
          <div className="mt-2 font-pixel text-2xl font-bold">{s.name}</div>
          <div className="text-sm font-bold text-ink-soft">Level {boot!.profile.level} · {boot!.profile.totalXp} XP</div>
        </div>
      </Panel>
    </div>
  );
}
