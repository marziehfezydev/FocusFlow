const PALETTE: Record<string, string> = {
  k: '#6b4a3a', r: '#e4795f', w: '#fff1de', y: '#8fd3ff', b: '#a8744a', B: '#7a4f30',
  g: '#7bc67e', G: '#4fa35a', Y: '#ffd35c', o: '#f59e4b', R: '#e0554b', p: '#ff9fc2',
  c: '#5fc4e8', l: '#bfe6ff', s: '#c9c9d6', S: '#8a8a9c', t: '#7fd1c7', v: '#b69cf2',
  e: '#f4c7a1', W: '#ffffff',
};

const SPRITES = {
  house: [
    '....rr....', '...rrrr...', '..rrrrrr..', '.rrrrrrrr.', 'rrrrrrrrrr',
    '.wwwwwwww.', '.wwyywwww.', '.wwyywbbw.', '.wwwwwbbw.', '.kkkkkkkk.',
  ],
  tasks: [
    '..kkkkkk..', '.kbbssbbk.', '.kwwwwwwk.', '.kwgwkkwk.', '.kwwwwwwk.',
    '.kwgwkkwk.', '.kwwwwwwk.', '.kwgwkkwk.', '.kwwwwwwk.', '..kkkkkk..',
  ],
  calendar: [
    '.kkkkkkkk.', '.krrrrrrk.', '.kwwwwwwk.', '.kwkwkwwk.', '.kwwwwwwk.',
    '.kwkwRwwk.', '.kwwwwwwk.', '.kwkwkwwk.', '.kwwwwwwk.', '.kkkkkkkk.',
  ],
  habits: [
    '...gg.....', '..gggg.gg.', '..ggggggg.', '...gggg...', '.....G....',
    '.....G....', '.....G....', '..bbbGbb..', '.bbbbbbbb.', '.BBBBBBBB.',
  ],
  focus: [
    '...kkkk...', '..kwwwwk..', '.kwwwkwwk.', 'kwwwwkwwwk', 'kwwwwkwwwk',
    'kwwwwkkkwk', 'kwwwwwwwwk', '.kwwwwwwk.', '..kwwwwk..', '...kkkk...',
  ],
  companion: [
    '....kk....', '....vv....', '.kkkkkkkk.', 'kssssssssk', 'ksccssccsk',
    'ksccssccsk', 'kssssssssk', 'ksskkkksSk', '.kssssssk.', '..kk..kk..',
  ],
  stats: [
    '..........', '......gg..', '......gg..', '...oo.gg..', '...oo.gg..',
    '.rroo.gg..', '.rroo.gg..', '.rroo.gg..', 'kkkkkkkkkk', '..........',
  ],
  settings: [
    '....ss....', '.s.ssss.s.', '..ssssss..', '.sssSSsss.', 'sssSSSSsss',
    'sssSSSSsss', '.sssSSsss.', '..ssssss..', '.s.ssss.s.', '....ss....',
  ],
  village: [
    '....kk....', '...kggk...', '..kggggk..', '.kggggggk.', 'kggggggggk',
    'kbbbbBBBBk', 'kbbbbBBBBk', '.kbbbBBBk.', '..kbbBBk..', '...kbBk...',
  ],
  flame: [
    '.....o....', '....oo....', '...ooo.o..', '..oooooo..', '..ooYooo..',
    '.oooYYooo.', '.ooYYYYoo.', '.ooYYYYoo.', '..oYYYYo..', '...oooo...',
  ],
  chest: [
    '..........', '.kkkkkkkk.', 'kbbbbbbbbk', 'kbbBBBBbbk', 'kkkkYYkkkk',
    'kbbbYYbbbk', 'kbbbbbbbbk', 'kbbbbbbbbk', 'kBBBBBBBBk', '.kkkkkkkk.',
  ],
  star: [
    '....YY....', '....YY....', '...YYYY...', 'YYYYYYYYYY', '.YYYYYYYY.',
    '..YYYYYY..', '..YYYYYY..', '.YYYYYYYY.', '.YYY..YYY.', '.YY....YY.',
  ],
  heart: [
    '.ppp..ppp.', 'pppppppppp', 'pppppppppp', 'pppppppppp', '.pppppppp.',
    '..pppppp..', '...pppp...', '....pp....', '..........', '..........',
  ],
  bell: [
    '....kk....', '...kYYk...', '..kYYYYk..', '..kYYYYk..', '..kYYYYk..',
    '.kYYYYYYk.', 'kYYYYYYYYk', 'kkkkkkkkkk', '....kk....', '....oo....',
  ],
  search: [
    '..kkkk....', '.kllllk...', 'kllWlllk..', 'klWllllk..', 'kllllllk..',
    'kllllllk..', '.kllllk...', '..kkkkbb..', '.......bb.', '........bb',
  ],
} as const;

export type SpriteName = keyof typeof SPRITES;

export function Sprite({ name, size = 24, className = '' }: { name: SpriteName; size?: number; className?: string }) {
  const rows = SPRITES[name];
  const rects: React.ReactElement[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < 10) {
      const ch = row[x] ?? '.';
      if (ch === '.') { x++; continue; }
      let run = 1;
      while ((row[x + run] ?? '.') === ch) run++;
      rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={run} height={1} fill={PALETTE[ch] ?? '#f0f'} />);
      x += run;
    }
  });
  return (
    <svg viewBox="0 0 10 10" width={size} height={size} shapeRendering="crispEdges" className={className} aria-hidden>
      {rects}
    </svg>
  );
}

export const TASK_EMOJI: Record<string, string> = {
  water: '💧', exercise: '🏋️', study: '📚', german: '🇩🇪', reading: '📖',
  planning: '📝', sleep: '😴', meditate: '🧘', code: '💻', custom: '⭐',
};
