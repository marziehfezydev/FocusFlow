import { memo, useMemo } from 'react';
import { Box, BlockType, COLORS, PIECES, buildState, groundFor } from '../lib/village';

const px = (x: number, y: number) => (x - y) * 16;
const py = (x: number, y: number, z: number) => (x + y) * 8 - z * 16;
const pts = (a: [number, number, number][]) => a.map(([x, y, z]) => `${px(x, y)},${py(x, y, z)}`).join(' ');

function BoxSvg({ b, ghost, pulse }: { b: Box; ghost?: boolean; pulse?: boolean }) {
  const [top, left, right] = COLORS[b.t];
  const { x0, y0, z0, x1, y1, z1 } = b;
  const stroke = ghost ? '#8f7bd8' : 'rgba(0,0,0,.14)';
  const common = { stroke, strokeWidth: ghost ? 0.8 : 0.6, strokeLinejoin: 'round' as const };
  const op = ghost ? 0.28 : 1;
  const band = b.t === 'grass' && z1 - z0 >= 0.9;
  return (
    <g opacity={op} className={pulse ? 'anim-build' : undefined} strokeDasharray={ghost ? '2 2' : undefined}>
      <polygon points={pts([[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]])} fill={left} {...common} />
      <polygon points={pts([[x1, y0, z1], [x1, y1, z1], [x1, y1, z0], [x1, y0, z0]])} fill={right} {...common} />
      {band && (
        <>
          <polygon points={pts([[x0, y1, z1], [x1, y1, z1], [x1, y1, z1 - 0.3], [x0, y1, z1 - 0.3]])} fill="#6fcf75" />
          <polygon points={pts([[x1, y0, z1], [x1, y1, z1], [x1, y1, z1 - 0.3], [x1, y0, z1 - 0.3]])} fill="#52b45d" />
        </>
      )}
      <polygon points={pts([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]])} fill={top} {...common} />
      {b.t === 'grass' && z1 - z0 >= 0.9 && (
        <rect
          x={px(x0 + 0.5, y0 + 0.5) - 1.5} y={py(x0 + 0.5, y0 + 0.5, z1) - 1} width={3} height={2}
          fill="#7bc67e" opacity={((x0 * 7 + y0 * 3) % 3) / 3}
        />
      )}
    </g>
  );
}

const depth = (b: Box) => (b.x0 + b.x1) / 2 + (b.y0 + b.y1) / 2 + (b.z0 + b.z1) / 2 * 1.01;

interface Props {
  xp: number;
  className?: string;
  /** Show the next building as a translucent preview that fills with XP. */
  preview?: boolean;
  /** Crop tighter around the middle of the village (for small cards). */
  tight?: boolean;
}

function IsoSceneBase({ xp, className, preview = true, tight }: Props) {
  const state = useMemo(() => buildState(xp), [xp]);

  const { solid, ghost, pulseIdx } = useMemo(() => {
    const solid: Box[] = [...groundFor(state.completed)];
    for (let i = 0; i < state.completed; i++) solid.push(...PIECES[i].boxes);
    const ghost: Box[] = [];
    let pulseIdx = -1;
    if (state.next) {
      const sorted = [...state.next.boxes].sort((a, b) => a.z0 - b.z0 || depth(a) - depth(b));
      const reveal = Math.floor(sorted.length * state.partial);
      sorted.forEach((b, i) => (i < reveal ? solid.push(b) : preview ? ghost.push(b) : null));
      if (reveal > 0 && reveal <= sorted.length) pulseIdx = reveal - 1;
      void pulseIdx;
    }
    return { solid, ghost, pulseIdx };
  }, [state, preview]);

  const all = useMemo(() => {
    const items = [
      ...solid.map((b) => ({ b, ghost: false })),
      ...ghost.map((b) => ({ b, ghost: true })),
    ];
    return items.sort((a, c) => depth(a.b) - depth(c.b));
  }, [solid, ghost]);

  const viewBox = tight ? '-150 -60 300 215' : '-172 -72 344 244';
  return (
    <svg viewBox={viewBox} className={className} shapeRendering="geometricPrecision" role="img" aria-label="Your voxel village">
      {all.map(({ b, ghost: g }, i) => (
        <BoxSvg key={i} b={b} ghost={g} />
      ))}
    </svg>
  );
}

export const IsoScene = memo(IsoSceneBase);
export type { BlockType };
