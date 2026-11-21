import { useApp } from '../store';
import { Panel, Bar, Pill } from '../components/ui';
import { Sprite } from '../components/Sprite';
import { IsoScene } from '../components/IsoScene';
import { LEVEL_TITLES, PIECES, PIECE_XP, buildState, levelTitle } from '../lib/village';

export default function VillagePage() {
  const { boot } = useApp();
  const p = boot!.profile;
  const bs = buildState(p.totalXp);
  const toGo = bs.next ? Math.round(PIECE_XP * (1 - bs.partial)) : 0;

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <Panel title="My Village" icon="village" action={<Pill tone="green">{bs.completed} / {bs.total} built</Pill>} bodyClass="!p-3">
          <div className="relative overflow-hidden rounded-md bg-gradient-to-b from-[#cfeafa] via-[#e3f5ee] to-[#d7f0cf]">
            <IsoScene xp={p.totalXp} className="mx-auto h-[26rem] w-full max-w-[40rem]" />
            {bs.next && (
              <div className="absolute left-3 top-3 rounded-md border-[3px] border-[#d9ccff] bg-[#f4efff]/95 px-3 py-2 text-sm font-extrabold text-[#4a3a8a]">
                Building: {bs.next.emoji} {bs.next.name}
                <div className="mt-1 w-40"><Bar value={Math.round(bs.partial * 100)} max={100} tone="lav" label="Build progress" /></div>
                <div className="mt-0.5 text-xs">{toGo} XP to go</div>
              </div>
            )}
            {!bs.next && <div className="absolute left-3 top-3 rounded-md bg-white/80 px-3 py-2 text-sm font-extrabold">🏆 Your village is complete!</div>}
          </div>
        </Panel>

        <div className="grid content-start gap-4">
          <Panel title={`Level ${p.level}`} icon="star" action={<Pill tone="gold">{levelTitle(p.level)}</Pill>}>
            <Bar value={p.xpInLevel} max={p.xpForLevel} tone="gold" label="Level progress" />
            <div className="mt-1 flex justify-between text-sm font-extrabold text-ink-soft">
              <span>{p.xpInLevel} / {p.xpForLevel} XP</span><span>{p.totalXp} total</span>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              {LEVEL_TITLES.map((t, i) => (
                <div key={t} className={`rounded-md border-2 px-1 py-1.5 text-center text-[11px] font-extrabold leading-tight ${p.level >= i + 1 ? 'border-[#e8c65a] bg-[#fdefc0]' : 'border-peach-d/50 bg-white/40 opacity-60'}`}>
                  <div className="font-pixel text-base">{i + 1}</div>{t}
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="How to earn XP" icon="chest">
            <ul className="grid gap-1.5 text-sm font-bold">
              <li>✅ Finish a task: <b>10–120 XP</b> (longer = more)</li>
              <li>🌱 Check a habit: <b>+15 XP</b></li>
              <li>⏱️ Focus session: <b>1 XP / minute</b></li>
              <li>🌟 Complete a full day (3+ goals): <b>+50 XP</b></li>
              <li>🏗️ Every <b>{PIECE_XP} XP</b> builds something new</li>
              <li>⬆️ Every <b>1000 XP</b> is a level-up</li>
            </ul>
          </Panel>
        </div>
      </div>

      <Panel title="Build log" icon="chest">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {PIECES.map((pc, i) => {
            const built = i < bs.completed;
            const current = i === bs.completed;
            return (
              <div key={pc.id} className={`rounded-md border-[3px] px-3 py-2.5 text-center ${built ? 'border-[#bfe6bf] bg-[#effaee]' : current ? 'border-[#d9ccff] bg-[#f4efff]' : 'border-peach-d/50 bg-white/40'}`}>
                <div className={`text-3xl ${built ? '' : 'opacity-40 grayscale'}`}>{pc.emoji}</div>
                <div className="mt-1 text-sm font-extrabold leading-tight">{pc.name}</div>
                <div className="mt-1 text-xs font-extrabold text-ink-soft">
                  {built ? '✓ Built' : current ? `${Math.round(bs.partial * 100)}% built` : `at ${i * PIECE_XP} XP`}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="XP feed" icon="star">
        {boot!.events.length === 0 && <div className="font-bold text-ink-soft">Nothing yet — complete a task to find your first XP!</div>}
        <div className="grid gap-1 sm:grid-cols-2">
          {boot!.events.slice(0, 14).map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-2 rounded bg-white/55 px-3 py-1.5">
              <span className="flex min-w-0 items-center gap-2 font-bold"><Sprite name="star" size={16} /><span className="truncate" dir="auto">{e.label}</span></span>
              <span className={`font-pixel text-lg font-bold ${e.xp >= 0 ? 'text-grass-d' : 'text-[#d9534f]'}`}>{e.xp >= 0 ? '+' : ''}{e.xp}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
