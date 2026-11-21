import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store';
import { api } from '../api';
import { Panel, Pill, rtlAttr } from '../components/ui';
import { Sprite } from '../components/Sprite';
import type { ChatMessage } from '../../../shared/types';

const PROMPTS = {
  en: ['Plan my day', 'I feel tired', 'Break down my biggest task', 'Motivate me'],
  fa: ['برنامه امروزم رو بچین', 'خسته‌ام', 'بزرگ‌ترین کارم رو تکه‌تکه کن', 'بهم انگیزه بده'],
};

export default function CompanionPage() {
  const { boot, today, hour, coach, coachLoading, refreshCoach, applySuggestion, setBootChat } = useApp();
  const lang = boot!.settings.language;
  const [msgs, setMsgs] = useState<ChatMessage[]>(boot!.chat);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, sending]);

  const send = async (raw: string) => {
    const t = raw.trim();
    if (!t || sending) return;
    const mine: ChatMessage = { id: `u${Date.now()}`, role: 'user', text: t, ts: new Date().toISOString() };
    setMsgs((m) => [...m, mine]);
    setText('');
    setSending(true);
    try {
      const r = await api.chat(t, today, hour);
      setMsgs((m) => { const n = [...m, r.message]; setBootChat(n); return n; });
    } catch {
      setMsgs((m) => [...m, { id: `e${Date.now()}`, role: 'assistant', text: 'Oops — I lost connection to the server. Try again in a moment.', ts: new Date().toISOString() }]);
    } finally {
      setSending(false);
    }
  };

  const clear = async () => {
    await api.clearChat();
    setMsgs([]);
    setBootChat([]);
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
      <Panel
        title="Chat with Bit" icon="companion"
        action={
          <div className="flex items-center gap-2">
            <Pill tone="lav">{boot!.aiMode === 'claude' ? '✨ Powered by Claude' : 'Offline mode'}</Pill>
            {msgs.length > 0 && <button className="mc-btn soft sm" onClick={() => void clear()}>Clear</button>}
          </div>
        }
        bodyClass="!pb-4"
      >
        <div className="scroll-thin mc-inset flex h-[28rem] flex-col gap-3 overflow-y-auto p-3">
          {msgs.length === 0 && (
            <Bubble role="assistant" text={lang === 'fa' ? `سلام ${boot!.settings.name}! من بیت هستم. هر چیزی درباره‌ی برنامه‌ات بپرس.` : `Hi ${boot!.settings.name}! I'm Bit. Ask me to plan your day, split a big task, or just cheer you on.`} />
          )}
          {msgs.map((m) => <Bubble key={m.id} role={m.role} text={m.text} />)}
          {sending && <Bubble role="assistant" text="…" pulse />}
          <div ref={bottom} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {PROMPTS[lang].map((p) => <button key={p} className="mc-btn soft sm" disabled={sending} onClick={() => void send(p)}>{p}</button>)}
        </div>
        <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); void send(text); }}>
          <input className="mc-input" dir="auto" placeholder="Message Bit…" value={text} maxLength={500} onChange={(e) => setText(e.target.value)} />
          <button className="mc-btn" type="submit" disabled={sending || !text.trim()}>Send</button>
        </form>
      </Panel>

      <Panel title="Day analysis" icon="stats" action={<button className="mc-btn lav sm" onClick={refreshCoach} disabled={coachLoading}>{coachLoading ? 'Thinking…' : '↻ Analyze'}</button>}>
        <div className={`rounded-md border-[3px] border-[#d9ccff] bg-[#f4efff] px-3 py-3 font-bold leading-relaxed text-[#4a3a8a] ${coachLoading ? 'anim-pulse' : ''}`}>
          <p dir="auto">{coach?.message ?? 'Bit is looking at your plan…'}</p>
        </div>
        {coach && coach.suggestions.length > 0 && (
          <div className="mt-3 grid gap-2">
            <div className="text-xs font-extrabold uppercase tracking-wide text-ink-soft">Suggested changes</div>
            {coach.suggestions.map((s, i) => (
              <button key={i} className="mc-btn lav !justify-start text-left" onClick={() => void applySuggestion(s)}>
                {s.kind === 'add' ? `+ Add “${s.title}” · ${s.minutes} min` : `→ Move “${s.title}” to tomorrow`}
              </button>
            ))}
          </div>
        )}
        <p className="mt-4 text-xs font-bold text-ink-soft">
          {boot!.aiMode === 'claude'
            ? 'Bit reviews your plan with Claude whenever it changes.'
            : 'Running with the built-in offline coach. Add an ANTHROPIC_API_KEY on the server to unlock Claude-powered coaching.'}
        </p>
      </Panel>
    </div>
  );
}

function Bubble({ role, text, pulse }: { role: 'user' | 'assistant'; text: string; pulse?: boolean }) {
  const mine = role === 'user';
  return (
    <div className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
      {!mine && <Sprite name="companion" size={36} className="shrink-0" />}
      <div
        dir={rtlAttr(text)}
        className={`max-w-[82%] whitespace-pre-wrap rounded-md border-[3px] px-3 py-2 text-[0.93rem] font-bold leading-relaxed ${pulse ? 'anim-pulse' : ''} ${
          mine ? 'border-[#f2bf9f] bg-[#fdd9c2]' : 'border-[#d9ccff] bg-[#f4efff] text-[#4a3a8a]'
        }`}
      >
        {text}
      </div>
    </div>
  );
}
