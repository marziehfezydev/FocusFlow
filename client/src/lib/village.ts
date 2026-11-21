export type BlockType =
  | 'grass' | 'dirt' | 'farm' | 'stone' | 'path' | 'plank' | 'wood' | 'birch' | 'leaves' | 'pine'
  | 'roof' | 'barn' | 'water' | 'glass' | 'door' | 'wheat' | 'stem' | 'lantern' | 'gold'
  | 'fr' | 'fy' | 'fp' | 'fb' | 'pumpkin' | 'hay' | 'flame' | 'flag';

export interface Box {
  x0: number; y0: number; z0: number; x1: number; y1: number; z1: number; t: BlockType;
}

export const COLORS: Record<BlockType, [string, string, string]> = {
  grass: ['#8fdc8f', '#b07a4f', '#8a5a38'],
  dirt: ['#c08a5c', '#a9754a', '#8a5a38'],
  farm: ['#8a5a38', '#6f482c', '#5b3a24'],
  stone: ['#d4d7e1', '#b0b4c3', '#8f93a5'],
  path: ['#ead7aa', '#cdb784', '#b09c6b'],
  plank: ['#e0b074', '#c8955a', '#a97c48'],
  wood: ['#b9854f', '#946639', '#785130'],
  birch: ['#f0ece0', '#d6d1c2', '#b5b0a1'],
  leaves: ['#7ae082', '#52b45d', '#3e9549'],
  pine: ['#4fa86a', '#38865a', '#2b6c48'],
  roof: ['#f58c72', '#dc6e56', '#b9553f'],
  barn: ['#ec7a64', '#d2644f', '#b34d3b'],
  water: ['#86d6f5', '#62b9e0', '#4ba2cb'],
  glass: ['#c8edff', '#9fd8f4', '#82c3e6'],
  door: ['#a87646', '#8a5c34', '#6f4727'],
  wheat: ['#f8dc70', '#deba48', '#c4a132'],
  stem: ['#6fc46f', '#4fa35a', '#3e8a49'],
  lantern: ['#fff0a8', '#ffdb62', '#f6c453'],
  gold: ['#ffe888', '#f6c453', '#d9a52e'],
  fr: ['#ff8497', '#ee6178', '#d04a62'],
  fy: ['#ffe071', '#f6c453', '#dba93a'],
  fp: ['#ffaed0', '#f08ab4', '#d5709a'],
  fb: ['#9dbcff', '#7a9ae8', '#6180cc'],
  pumpkin: ['#ffa94d', '#f08a2c', '#d06f1e'],
  hay: ['#f4d77a', '#dcb953', '#c19f3f'],
  flame: ['#ffd36a', '#ff9f43', '#f06a2b'],
  flag: ['#ff8497', '#ee6178', '#d04a62'],
};

export interface Piece {
  id: string;
  name: string;
  emoji: string;
  boxes: Box[];
  ground?: Record<string, BlockType>;
}

export const PIECE_XP = 250;
export const GRID = 10;

const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, t: BlockType): Box => ({ x0, y0, z0, x1, y1, z1, t });
const cube = (x: number, y: number, z: number, t: BlockType): Box => box(x, y, z, x + 1, y + 1, z + 1, t);

function tree(x: number, y: number, h = 2, leaf: BlockType = 'leaves', trunk: BlockType = 'wood'): Box[] {
  const out: Box[] = [];
  for (let z = 1; z <= h; z++) out.push(cube(x, y, z, trunk));
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    if (i === 0 && j === 0) continue;
    out.push(cube(x + i, y + j, h + 1, leaf));
  }
  out.push(cube(x, y, h + 1, leaf));
  out.push(cube(x, y, h + 2, leaf));
  return out;
}

function pine(x: number, y: number): Box[] {
  return [
    cube(x, y, 1, 'wood'),
    box(x - 1, y - 1, 2, x + 2, y + 2, 3, 'pine'),
    box(x - 0.5, y - 0.5, 3, x + 1.5, y + 1.5, 4, 'pine'),
    box(x, y, 4, x + 1, y + 1, 5, 'pine'),
  ];
}

function flower(x: number, y: number, c: BlockType, ox = 0.5, oy = 0.5): Box[] {
  return [
    box(x + ox - 0.07, y + oy - 0.07, 1, x + ox + 0.07, y + oy + 0.07, 1.35, 'stem'),
    box(x + ox - 0.2, y + oy - 0.2, 1.35, x + ox + 0.2, y + oy + 0.2, 1.7, c),
  ];
}

function house(
  x: number, y: number, w: number, d: number, wall: BlockType, roof: BlockType,
  door: [number, number], windows: [number, number][],
): Box[] {
  const out: Box[] = [];
  for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) {
    if (!(i === 0 || i === w - 1 || j === 0 || j === d - 1)) continue;
    const tx = x + i, ty = y + j;
    out.push(cube(tx, ty, 1, tx === door[0] && ty === door[1] ? 'door' : wall));
    out.push(cube(tx, ty, 2, windows.some(([a, b]) => a === tx && b === ty) ? 'glass' : wall));
  }
  out.push(box(x - 0.3, y - 0.3, 3, x + w + 0.3, y + d + 0.3, 3.6, roof));
  const ix = Math.min(1, (w - 1) / 2), iy = Math.min(1, (d - 1) / 2);
  out.push(box(x + ix, y + iy, 3.6, x + w - ix, y + d - iy, 4.2, roof));
  return out;
}

const lantern = (x: number, y: number): Box[] => [
  box(x + 0.42, y + 0.42, 1, x + 0.58, y + 0.58, 2.5, 'wood'),
  box(x + 0.3, y + 0.3, 2.5, x + 0.7, y + 0.7, 2.95, 'lantern'),
];

export const PIECES: Piece[] = [
  { id: 'oak', name: 'Oak tree', emoji: '🌳', boxes: tree(1, 4) },
  {
    id: 'cottage', name: 'Cozy cottage', emoji: '🏡',
    boxes: [
      ...house(3, 3, 3, 3, 'plank', 'roof', [4, 5], [[5, 4], [3, 5]]),
      box(5.1, 3.1, 3.6, 5.7, 3.7, 5, 'stone'),
    ],
    ground: { '4,6': 'path', '4,7': 'path', '4,8': 'path', '4,9': 'path' },
  },
  {
    id: 'flowers', name: 'Flower garden', emoji: '🌷',
    boxes: [
      ...flower(7, 2, 'fr', 0.3, 0.3), ...flower(7, 2, 'fy', 0.7, 0.7),
      ...flower(8, 2, 'fp', 0.3, 0.7), ...flower(8, 2, 'fb', 0.7, 0.3),
      ...flower(7, 3, 'fy', 0.3, 0.7), ...flower(7, 3, 'fp', 0.7, 0.3),
      ...flower(8, 3, 'fr', 0.5, 0.5),
    ],
  },
  {
    id: 'well', name: 'Stone well', emoji: '⛲',
    boxes: [
      cube(2, 7, 1, 'stone'),
      box(2.15, 7.15, 1.95, 2.85, 7.85, 2.03, 'water'),
      box(2.05, 7.05, 2, 2.25, 7.25, 3.1, 'wood'),
      box(2.75, 7.75, 2, 2.95, 7.95, 3.1, 'wood'),
      box(2, 7, 3.1, 3, 8, 3.4, 'roof'),
    ],
  },
  {
    id: 'farm', name: 'Wheat farm', emoji: '🌾',
    boxes: [[7, 6], [8, 6], [8, 7], [7, 8], [8, 8]].map(([x, y]) => box(x + 0.08, y + 0.08, 1, x + 0.92, y + 0.92, 1.8, 'wheat')),
    ground: { '7,6': 'farm', '8,6': 'farm', '7,7': 'water', '8,7': 'farm', '7,8': 'farm', '8,8': 'farm' },
  },
  { id: 'lanterns', name: 'Lantern posts', emoji: '🏮', boxes: [...lantern(6, 6), ...lantern(2, 3)] },
  { id: 'birch', name: 'Second oak', emoji: '🌲', boxes: tree(4, 1) },
  {
    id: 'fence', name: 'Garden fence', emoji: '🪵',
    boxes: [0, 1, 2, 3].flatMap((x) => [
      box(x + 0.4, 9.4, 1, x + 0.6, 9.6, 2, 'wood'),
      box(x, 9.45, 1.45, x + 1, 9.55, 1.7, 'plank'),
    ]),
  },
  {
    id: 'pond', name: 'Duck pond', emoji: '🦆',
    boxes: [box(0.3, 7.3, 1, 0.7, 7.7, 1.1, 'fy')],
    ground: { '0,7': 'water', '1,7': 'water', '0,8': 'water', '1,8': 'water' },
  },
  {
    id: 'chest', name: 'Treasure chest', emoji: '🧰',
    boxes: [
      box(5.15, 8.15, 1, 5.85, 8.85, 1.6, 'plank'),
      box(5.15, 8.15, 1.6, 5.85, 8.85, 1.85, 'wood'),
      box(5.42, 8.82, 1.35, 5.58, 8.9, 1.7, 'gold'),
    ],
  },
  {
    id: 'tower', name: 'Watch tower', emoji: '🗼',
    boxes: [
      ...[1, 2, 3, 4].map((z) => cube(8, 0, z, 'stone')),
      box(7.7, -0.3, 5, 9.3, 1.3, 5.3, 'plank'),
      box(8.45, 0.45, 5.3, 8.55, 0.55, 6.6, 'wood'),
      box(8.55, 0.47, 6.05, 9.3, 0.53, 6.6, 'flag'),
    ],
  },
  {
    id: 'barn', name: 'Red barn', emoji: '🛖',
    boxes: house(0, 0, 3, 2, 'barn', 'plank', [1, 1], [[2, 1]]),
  },
  {
    id: 'pumpkins', name: 'Pumpkin patch', emoji: '🎃',
    boxes: [[6.1, 4.2], [6.6, 4.7], [6.2, 5.2]].map(([x, y]) => box(x, y, 1, x + 0.5, y + 0.5, 1.45, 'pumpkin')),
  },
  { id: 'birch2', name: 'Birch tree', emoji: '🌳', boxes: tree(9, 2, 2, 'leaves', 'birch') },
  {
    id: 'camp', name: 'Campfire', emoji: '🔥',
    boxes: [
      box(7.1, 4.1, 1, 7.9, 4.9, 1.25, 'stone'),
      box(7.35, 4.35, 1.25, 7.65, 4.65, 1.8, 'flame'),
      box(7.42, 4.42, 1.8, 7.58, 4.58, 2.1, 'lantern'),
    ],
  },
  {
    id: 'hay', name: 'Hay bales', emoji: '🟨',
    boxes: [box(6.1, 7.1, 1, 6.9, 7.9, 1.8, 'hay'), box(6.1, 8.1, 1, 6.9, 8.9, 1.8, 'hay')],
  },
  {
    id: 'sign', name: 'Village sign', emoji: '🪧',
    boxes: [box(3.45, 7.4, 1, 3.55, 7.5, 2.3, 'wood'), box(3.1, 7.35, 1.8, 3.9, 7.55, 2.35, 'plank')],
  },
  {
    id: 'bench', name: 'Garden bench', emoji: '🪑',
    boxes: [
      box(2.1, 5.2, 1, 2.2, 5.8, 1.35, 'wood'), box(2.8, 5.2, 1, 2.9, 5.8, 1.35, 'wood'),
      box(2.05, 5.15, 1.35, 2.95, 5.85, 1.5, 'plank'),
      box(2.05, 5.15, 1.5, 2.15, 5.85, 2.1, 'plank'),
    ],
  },
  { id: 'pine1', name: 'Pine tree', emoji: '🌲', boxes: pine(9, 7) },
  {
    id: 'bed', name: 'Rose bed', emoji: '🌹',
    boxes: [...flower(6, 2, 'fr', 0.25, 0.3), ...flower(6, 3, 'fp', 0.7, 0.4), ...flower(6, 3, 'fr', 0.3, 0.7), ...flower(5, 2, 'fy', 0.5, 0.6)],
  },
  { id: 'pine2', name: 'Pine grove', emoji: '🌲', boxes: pine(9, 4) },
  {
    id: 'statue', name: 'Golden statue', emoji: '🗿',
    boxes: [cube(9, 9, 1, 'stone'), box(9.2, 9.2, 2, 9.8, 9.8, 3, 'stone'), box(9.3, 9.3, 3, 9.7, 9.7, 3.5, 'gold')],
  },
  {
    id: 'bush', name: 'Berry bushes', emoji: '🫐',
    boxes: [box(0.1, 5.1, 1, 0.9, 5.9, 1.7, 'leaves'), box(0.3, 5.3, 1.7, 0.7, 5.7, 1.9, 'fb'), box(0.1, 6.1, 1, 0.8, 6.8, 1.6, 'leaves')],
  },
  { id: 'dec1', name: 'Mushroom ring', emoji: '🍄', boxes: [box(8.2, 4.2, 1, 8.4, 4.4, 1.35, 'barn'), box(8.55, 4.6, 1, 8.75, 4.8, 1.3, 'barn'), box(8.0, 4.7, 1, 8.18, 4.88, 1.25, 'barn')] },
  { id: 'dec2', name: 'Golden lamp', emoji: '💡', boxes: lantern(5, 9) },
];

export interface BuildState {
  completed: number;
  partial: number;
  next?: Piece;
  total: number;
}

export function buildState(totalXp: number): BuildState {
  const completed = Math.min(PIECES.length, Math.floor(totalXp / PIECE_XP));
  const done = completed >= PIECES.length;
  return {
    completed,
    partial: done ? 0 : (totalXp % PIECE_XP) / PIECE_XP,
    next: done ? undefined : PIECES[completed],
    total: PIECES.length,
  };
}

export function groundFor(completed: number): Box[] {
  const overrides: Record<string, BlockType> = {};
  for (let i = 0; i < completed; i++) Object.assign(overrides, PIECES[i].ground ?? {});
  const out: Box[] = [];
  for (let x = 0; x < GRID; x++) for (let y = 0; y < GRID; y++) {
    const t = overrides[`${x},${y}`] ?? 'grass';
    out.push(box(x, y, 0, x + 1, y + 1, t === 'water' ? 0.8 : 1, t === 'water' || t === 'farm' || t === 'path' ? (t as BlockType) : 'grass'));
  }
  return out;
}

export const LEVEL_TITLES = ['Wanderer', 'Woodcutter', 'Builder', 'Farmer', 'Architect', 'Mayor', 'Governor', 'Legend'];
export const levelTitle = (level: number) => LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length) - 1];
