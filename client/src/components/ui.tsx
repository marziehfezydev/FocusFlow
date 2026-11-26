import type { ReactNode } from 'react';
import { Sprite, type SpriteName } from './Sprite';

export function Panel({
  title, icon, action, children, className = '', bodyClass = '',
}: {
  title?: string; icon?: SpriteName; action?: ReactNode; children: ReactNode; className?: string; bodyClass?: string;
}) {
  return (
    <section className={`mc-panel anim-slide ${className}`}>
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
          <h2 className="flex items-center gap-2.5 font-pixel text-[1.15rem] font-bold text-ink">
            {icon && <Sprite name={icon} size={28} />}
            {title}
          </h2>
          {action}
        </header>
      )}
      <div className={`p-5 ${title ? 'pt-3' : ''} ${bodyClass}`}>{children}</div>
    </section>
  );
}

export function Bar({ value, max, tone = 'green', label }: { value: number; max: number; tone?: 'green' | 'gold' | 'lav'; label?: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      className={`mc-bar ${tone === 'gold' ? 'gold' : tone === 'lav' ? 'lav' : ''}`}
      role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}
    >
      <i style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Tabs<T extends string>({
  value, onChange, options,
}: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-md bg-peach/70 p-1 ring-2 ring-peach-d/60">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded px-3 py-1.5 text-sm font-extrabold transition ${
            value === o.value ? 'bg-grass-d text-white shadow-[0_3px_0_#357a40]' : 'text-ink-soft hover:bg-white/60'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Empty({ emoji = '🌱', title, hint }: { emoji?: string; title: string; hint?: string }) {
  return (
    <div className="grid place-items-center gap-1 rounded-md border-2 border-dashed border-peach-d/80 bg-white/40 px-4 py-8 text-center">
      <div className="text-3xl anim-bob">{emoji}</div>
      <div className="font-extrabold">{title}</div>
      {hint && <div className="text-sm text-ink-soft">{hint}</div>}
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="mc-inset px-4 py-3">
      <div className="text-xs font-extrabold uppercase tracking-wide text-ink-soft">{label}</div>
      <div className="font-pixel text-3xl font-bold leading-tight">{value}</div>
      {sub && <div className="text-xs font-bold text-ink-soft">{sub}</div>}
    </div>
  );
}

export function Pill({ children, tone = 'peach' }: { children: ReactNode; tone?: 'peach' | 'green' | 'gold' | 'lav' }) {
  const t = {
    peach: 'bg-peach text-ink-soft',
    green: 'bg-[#d9f3d9] text-grass-d',
    gold: 'bg-[#fdefc0] text-[#a37a14]',
    lav: 'bg-[#e8e0ff] text-[#6a56b5]',
  }[tone];
  return <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-extrabold ${t}`}>{children}</span>;
}

export const rtlAttr = (s: string) => (/[؀-ۿ]/.test(s) ? ('rtl' as const) : ('ltr' as const));
