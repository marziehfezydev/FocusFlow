import type { TaskType } from '../../../shared/types';

export type AvatarAction = TaskType | 'idle' | 'celebrate';

const C = {
  skin: '#f4c7a1', skinD: '#e0a67f',
  hair: '#8b5a3c', hairD: '#6a3f27', hairL: '#a8724d',
  jk: '#9fd8cf', jkD: '#79bdb3', jkL: '#c3ece4',
  shirt: '#fff6ea', pants: '#454a63', pantsD: '#343850', pantsL: '#5b6180',
  boot: '#f3efe8', bootD: '#d3ccbf',
  eye: '#3a3f6b', cheek: '#f7a8a2', mouth: '#c97b6b', flower: '#ff9fc2',
};

function Px({ x, y, w, h, c, l, d }: { x: number; y: number; w: number; h: number; c: string; l?: string; d?: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={c} />
      {l && <rect x={x} y={y} width={w} height={0.6} fill={l} />}
      {d && (
        <>
          <rect x={x} y={y + h - 0.6} width={w} height={0.6} fill={d} />
          <rect x={x + w - 0.6} y={y} width={0.6} height={h} fill={d} />
        </>
      )}
    </g>
  );
}

const origin = (x: number, y: number): React.CSSProperties => ({ transformOrigin: `${x}px ${y}px` });

function Arm({ side, children }: { side: 'L' | 'R'; children?: React.ReactNode }) {
  const x = side === 'R' ? 12 : 1;
  const sx = x + 1.5;
  return (
    <g className={`part up${side}`} style={origin(sx, 9.5)}>
      <Px x={x} y={9} w={3} h={3.5} c={C.jk} l={C.jkL} d={C.jkD} />
      <g className={`part fore${side}`} style={origin(sx, 12.5)}>
        <Px x={x} y={12.5} w={3} h={1.6} c={C.jk} d={C.jkD} />
        <Px x={x} y={14.1} w={3} h={2.2} c={C.skin} d={C.skinD} />
        {children}
      </g>
    </g>
  );
}

export function Avatar({
  action = 'idle', size = 140, className = '', sleepy = false,
}: { action?: AvatarAction; size?: number; className?: string; sleepy?: boolean }) {
  const closed = action === 'sleep' || action === 'meditate' || sleepy;
  const props = action === 'code' || action === 'study' || action === 'reading' || action === 'planning';
  const sitting = action === 'meditate';

  return (
    <svg
      viewBox="0 0 22 27"
      width={size}
      height={(size * 27) / 22}
      className={`av act-${action} ${className}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={`Character doing: ${action}`}
    >
      {action === 'meditate' && (
        <circle className="aura" cx="11" cy="14" r="10" fill="#d9ccff" opacity=".6" />
      )}
      <g transform="translate(3 1.5)">
        <g className="part all">
          <g className="breathe">
            {/* long hair behind */}
            <Px x={3} y={1} w={10} h={14} c={C.hairD} l={C.hair} />

            {/* legs */}
            {sitting ? (
              <>
                <Px x={2.5} y={16} w={11} h={3} c={C.pants} l={C.pantsL} d={C.pantsD} />
                <Px x={2.5} y={18.2} w={3.5} h={1.8} c={C.boot} d={C.bootD} />
                <Px x={10} y={18.2} w={3.5} h={1.8} c={C.boot} d={C.bootD} />
              </>
            ) : (
              <>
                <g className="part legL" style={origin(6, 16)}>
                  <Px x={4} y={16} w={4} h={4} c={C.pants} l={C.pantsL} d={C.pantsD} />
                  <Px x={4} y={20} w={4} h={2} c={C.boot} d={C.bootD} />
                </g>
                <g className="part legR" style={origin(10, 16)}>
                  <Px x={8} y={16} w={4} h={4} c={C.pants} l={C.pantsL} d={C.pantsD} />
                  <Px x={8} y={20} w={4} h={2} c={C.boot} d={C.bootD} />
                </g>
              </>
            )}

            {/* body */}
            <Px x={4} y={9} w={8} h={7} c={C.jk} l={C.jkL} d={C.jkD} />
            <rect x={7} y={9} width={2} height={7} fill={C.shirt} />
            <rect x={7} y={9} width={2} height={0.6} fill="#e9dccb" />
            <rect x={4} y={15} width={8} height={1} fill={C.jkD} />

            {/* head */}
            <g className="part head" style={origin(8, 9)}>
              <Px x={4} y={1} w={8} h={8} c={C.skin} d={C.skinD} />
              <Px x={4} y={1} w={8} h={2.2} c={C.hair} l={C.hairL} />
              <Px x={4} y={3} w={2} h={3} c={C.hair} />
              <Px x={10} y={3} w={2} h={3} c={C.hair} />
              <Px x={3} y={2} w={1.2} h={11} c={C.hair} d={C.hairD} />
              <Px x={11.8} y={2} w={1.2} h={11} c={C.hair} d={C.hairD} />
              {closed ? (
                <>
                  <rect x={5.5} y={5.7} width={1.8} height={0.5} fill={C.eye} />
                  <rect x={8.7} y={5.7} width={1.8} height={0.5} fill={C.eye} />
                </>
              ) : (
                <g className="blink">
                  <rect x={5.6} y={4.9} width={1.6} height={1.7} fill={C.eye} />
                  <rect x={8.8} y={4.9} width={1.6} height={1.7} fill={C.eye} />
                  <rect x={5.6} y={4.9} width={0.6} height={0.6} fill="#fff" />
                  <rect x={8.8} y={4.9} width={0.6} height={0.6} fill="#fff" />
                </g>
              )}
              <rect x={5} y={6.9} width={1.2} height={0.8} fill={C.cheek} opacity=".7" />
              <rect x={9.8} y={6.9} width={1.2} height={0.8} fill={C.cheek} opacity=".7" />
              <rect x={7.3} y={7.3} width={1.4} height={0.5} fill={C.mouth} />
              {/* flower */}
              <rect x={9.8} y={0.6} width={2.4} height={2.4} fill={C.flower} />
              <rect x={10.6} y={1.4} width={0.8} height={0.8} fill="#ffe27a" />
            </g>

            {/* arms */}
            <Arm side="L">
              {action === 'exercise' && <Dumbbell x={2.5} />}
              {action === 'planning' && (
                <g>
                  <rect x={-0.5} y={12} width={5} height={6.5} fill="#b07a4f" />
                  <rect x={0} y={12.7} width={4} height={5.3} fill="#fffaf0" />
                  <rect x={1.4} y={11.6} width={1.2} height={1} fill="#8a8a9c" />
                </g>
              )}
            </Arm>
            <Arm side="R">
              {action === 'exercise' && <Dumbbell x={13.5} />}
              {action === 'water' && (
                <g className="glass">
                  <rect x={12.5} y={15.4} width={2} height={4} fill="#d8efff" opacity=".85" />
                  <rect className="water" x={12.7} y={15.6} width={1.6} height={3.5} fill="#5fb8f0" />
                  <rect x={12.5} y={15.4} width={2} height={4} fill="none" stroke="#7fb8e0" strokeWidth=".4" />
                </g>
              )}
              {action === 'planning' && (
                <g className="pencil">
                  <rect x={13.2} y={14.2} width={0.8} height={3.6} fill="#f6c453" />
                  <rect x={13.2} y={17.8} width={0.8} height={0.8} fill="#e4795f" />
                </g>
              )}
            </Arm>

            {/* props held in front of the body, arms tucked behind */}
            {(action === 'code' || action === 'study') && <Laptop />}
            {action === 'reading' && <Book />}
            {action === 'planning' && <Notes />}
          </g>
        </g>

        {/* extras */}
        {action === 'water' && (
          <g className="bubble">
            <circle cx={8} cy={6.2} r={0.5} fill="#bfe6ff" />
            <circle cx={9.6} cy={5.2} r={0.35} fill="#bfe6ff" />
          </g>
        )}
        {action === 'german' && (
          <g className="bubble" style={origin(-0.5, 0)}>
            <rect x={-3.5} y={-1.5} width={9.5} height={4.6} fill="#fff" stroke="#e3b99d" strokeWidth=".4" />
            <rect x={1.5} y={3.1} width={1.4} height={1.2} fill="#fff" />
            <text x={1.25} y={1.7} fontSize="2.4" fontFamily="Pixelify Sans, monospace" fontWeight="700" textAnchor="middle" fill="#5b3a29">Hallo!</text>
          </g>
        )}
        {action === 'sleep' && (
          <g fontFamily="Pixelify Sans, monospace" fontWeight="700" fill="#8f7bd8">
            <text className="z" x={14} y={2} fontSize="2.6">Z</text>
            <text className="z" x={15.5} y={0.5} fontSize="2" style={{ animationDelay: '1s' }}>z</text>
            <text className="z" x={13} y={3.5} fontSize="1.6" style={{ animationDelay: '2s' }}>z</text>
          </g>
        )}
        {(action === 'code' || action === 'study') && (
          <g fontFamily="Pixelify Sans, monospace" fontWeight="700" fill="#4fa35a">
            <text className="sym" x={-0.5} y={4} fontSize="2.2">{'</>'}</text>
            <text className="sym" x={13.5} y={3} fontSize="2" style={{ animationDelay: '1.2s' }}>{'{ }'}</text>
          </g>
        )}
        {action === 'celebrate' && (
          <g>
            {[
              [-1, 0, '#ff9fc2'], [2, -1, '#ffd35c'], [6, -1.5, '#8fd3ff'], [10, -1, '#b69cf2'], [14, 0, '#7bc67e'], [16, -1, '#ff9fc2'],
            ].map(([x, y, c], i) => (
              <rect key={i} className="conf" x={x as number} y={y as number} width={1.1} height={1.1} fill={c as string} style={{ animationDelay: `${i * 0.25}s` }} />
            ))}
          </g>
        )}
        {props && null}
      </g>
    </svg>
  );
}

function Dumbbell({ x }: { x: number }) {
  return (
    <g>
      <rect x={x - 1.8} y={15.7} width={3.6} height={0.7} fill="#7d7d8f" />
      <rect x={x - 2.2} y={14.8} width={0.9} height={2.5} fill="#454a63" />
      <rect x={x + 1.3} y={14.8} width={0.9} height={2.5} fill="#454a63" />
    </g>
  );
}

function Laptop() {
  return (
    <g>
      <rect x={3.6} y={10} width={8.8} height={5} fill="#d8dbe6" />
      <rect x={3.6} y={10} width={8.8} height={0.6} fill="#f2f3f8" />
      <rect x={3.6} y={14.4} width={8.8} height={0.6} fill="#a9adbf" />
      <rect x={7} y={11.7} width={2} height={1.6} fill="#7bc67e" />
      <rect x={7} y={11.7} width={2} height={0.5} fill="#a6e8a0" />
      <rect x={2.8} y={15} width={10.4} height={0.9} fill="#a9adbf" />
      {/* floating code lines on the lid glow */}
      <rect className="line" x={4.4} y={10.8} width={2} height={0.4} fill="#7bc67e" />
    </g>
  );
}

function Book() {
  return (
    <g>
      <rect x={3.4} y={10.2} width={9.2} height={5.6} fill="#b07a4f" />
      <rect x={4} y={10.8} width={4} height={4.6} fill="#fffaf0" />
      <rect x={8} y={10.8} width={4} height={4.6} fill="#f7ecd8" />
      <rect x={7.9} y={10.8} width={0.2} height={4.6} fill="#c9a98a" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={4.6} y={11.6 + i} width={2.8} height={0.35} fill="#c9b8a4" />
          <rect x={8.6} y={11.6 + i} width={2.8} height={0.35} fill="#c9b8a4" />
        </g>
      ))}
      <rect className="flip" x={8} y={10.8} width={4} height={4.6} fill="#fffdf6" stroke="#e8d8c0" strokeWidth=".2" />
    </g>
  );
}

function Notes() {
  return (
    <g>
      <rect x={4.4} y={10.2} width={7.2} height={5.8} fill="#b07a4f" />
      <rect x={5} y={10.9} width={6} height={4.6} fill="#fffaf0" />
      <rect x={6.8} y={9.8} width={2.4} height={1.1} fill="#8a8a9c" />
      <rect className="wline" x={5.6} y={12} width={4.6} height={0.4} fill="#7bc67e" />
      <rect className="wline" x={5.6} y={13} width={3.6} height={0.4} fill="#f19a74" style={{ animationDelay: '.6s' }} />
      <rect className="wline" x={5.6} y={14} width={4.2} height={0.4} fill="#b69cf2" style={{ animationDelay: '1.2s' }} />
    </g>
  );
}
