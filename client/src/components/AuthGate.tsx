import { useEffect, useState, type ReactNode } from 'react';
import { authApi, getToken, setSession, type AuthStatus } from '../api';
import { Cube } from './Cube';
import { Avatar } from './Avatar';
import { Tabs } from './ui';

export function AuthGate({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(() => !!getToken());
  useEffect(() => {
    const out = () => setAuthed(false);
    window.addEventListener('ff-logout', out);
    return () => window.removeEventListener('ff-logout', out);
  }, []);
  // Unmounting the app on logout also wipes its in-memory state, so the next person starts clean.
  return authed ? <>{children}</> : <AuthScreen onDone={() => setAuthed(true)} />;
}

type Mode = 'login' | 'register';

function AuthScreen({ onDone }: { onDone: () => void }) {
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [offline, setOffline] = useState(false);
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [invite, setInvite] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    authApi.status()
      .then((s) => { setStatus(s); if (s.users === 0) setMode('register'); })
      .catch(() => setOffline(true));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const r = mode === 'login'
        ? await authApi.login(username, password)
        : await authApi.register(username, password, invite || undefined);
      setSession(r.token, r.username);
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const tryDemo = async () => {
    setError('');
    setBusy(true);
    try {
      const r = await authApi.guest();
      setSession(r.token, r.username);
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-full place-items-center p-4">
      <div className="mc-panel anim-pop w-full max-w-md px-7 py-7">
        <div className="flex items-center justify-center gap-3">
          <Cube size={54} />
          <div>
            <div className="font-pixel text-3xl font-bold leading-none text-[#5a3a6e]">FocusFlow</div>
            <div className="mt-1 text-sm font-bold text-ink-soft">Build Your Better Day <span className="text-pink">♥</span></div>
          </div>
        </div>
        <div className="mx-auto mt-2 w-fit"><Avatar action="german" size={120} /></div>

        {offline ? (
          <p className="mt-3 text-center font-bold text-ink-soft">Can’t reach the server. Start it with <code>npm run dev</code> and refresh.</p>
        ) : (
          <>
            {status?.registrationOpen && status.users > 0 && (
              <div className="mt-2 flex justify-center">
                <Tabs<Mode> value={mode} onChange={(m) => { setMode(m); setError(''); }} options={[{ value: 'login', label: 'Log in' }, { value: 'register', label: 'Create account' }]} />
              </div>
            )}
            <form className="mt-4 grid gap-3" onSubmit={submit}>
              <label className="grid gap-1 text-xs font-extrabold uppercase tracking-wide text-ink-soft">
                Username
                <input className="mc-input normal-case" autoComplete="username" autoCapitalize="none" value={username} maxLength={20} onChange={(e) => setUsername(e.target.value)} required />
              </label>
              <label className="grid gap-1 text-xs font-extrabold uppercase tracking-wide text-ink-soft">
                Password
                <input className="mc-input normal-case" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} minLength={mode === 'register' ? 6 : undefined} onChange={(e) => setPassword(e.target.value)} required />
              </label>
              {mode === 'register' && status?.inviteRequired && (
                <label className="grid gap-1 text-xs font-extrabold uppercase tracking-wide text-ink-soft">
                  Invite code
                  <input className="mc-input normal-case" value={invite} onChange={(e) => setInvite(e.target.value)} required />
                </label>
              )}
              {error && <div role="alert" className="rounded-md border-2 border-[#d9a08f] bg-[#fde8e0] px-3 py-2 text-sm font-bold text-[#b5543f]">{error}</div>}
              <button className="mc-btn !py-2.5 !text-base" type="submit" disabled={busy || !username || !password}>
                {busy ? '…' : mode === 'login' ? 'Enter my world ▸' : 'Create my world ▸'}
              </button>
            </form>
            {status?.guestsEnabled && (
              <div className="mt-3 border-t-2 border-dashed border-[#d9c9a8] pt-3 text-center">
                <button className="mc-btn !bg-[#8fd1a0] !py-2 !text-sm" type="button" disabled={busy} onClick={tryDemo}>Try the demo (no sign-up) ▸</button>
                <p className="mt-1 text-xs font-bold text-ink-soft">A temporary world that is deleted after 7 days.</p>
              </div>
            )}
            {status && !status.registrationOpen && (
              <p className="mt-3 text-center text-xs font-bold text-ink-soft">This world is private — all account slots are taken.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}