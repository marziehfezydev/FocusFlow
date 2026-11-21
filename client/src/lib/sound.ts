let ctx: AudioContext | null = null;

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'square', vol = 0.05) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t0 = ctx.currentTime + start;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

export type Sfx = 'check' | 'uncheck' | 'xp' | 'level' | 'click' | 'done';

export function sfx(kind: Sfx, enabled = true) {
  if (!enabled) return;
  try {
    ctx ??= new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    switch (kind) {
      case 'check': tone(660, 0, 0.08); tone(990, 0.07, 0.12); break;
      case 'uncheck': tone(440, 0, 0.08, 'triangle'); tone(330, 0.06, 0.1, 'triangle'); break;
      case 'xp': tone(880, 0, 0.06); tone(1320, 0.06, 0.1); break;
      case 'click': tone(520, 0, 0.04, 'square', 0.03); break;
      case 'done': [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.16)); break;
      case 'level': [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.1, 0.22, 'square', 0.06)); break;
    }
  } catch {
    /* audio not available */
  }
}
