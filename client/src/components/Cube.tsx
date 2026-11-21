/** A tiny isometric cube. Used for checkboxes, decorations and loaders. */
export function Cube({
  size = 28, top = '#a6e3a1', left = '#b07a4f', right = '#8a5a38', className = '', style,
}: { size?: number; top?: string; left?: string; right?: string; className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 32 36" width={size} height={(size * 36) / 32} className={className} style={style} shapeRendering="crispEdges" aria-hidden>
      <polygon points="16,0 32,8 16,16 0,8" fill={top} />
      <polygon points="0,8 16,16 16,36 0,28" fill={left} />
      <polygon points="16,16 32,8 32,28 16,36" fill={right} />
      <polygon points="16,0 32,8 16,16 0,8" fill="none" stroke="rgba(0,0,0,.15)" strokeWidth="1" />
      <polyline points="0,8 16,16 32,8" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="1" />
    </svg>
  );
}

export const GrassCube = (p: { size?: number; className?: string }) => (
  <Cube {...p} top="#8fdc8f" left="#b07a4f" right="#8a5a38" />
);

/** Checkbox that is an empty block when unchecked and a grass block when checked. */
export function BlockCheck({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className="relative grid h-8 w-8 shrink-0 place-items-center rounded-sm transition-transform hover:scale-110 active:scale-90"
    >
      {checked ? (
        <span key="on" className="anim-pop">
          <Cube size={28} top="#9be79a" left="#58b865" right="#3f9150" />
          <svg viewBox="0 0 12 12" className="absolute left-[9px] top-[4px] h-[11px] w-[11px]" shapeRendering="crispEdges">
            <path d="M1 6l3 3 7-7" stroke="#fff" strokeWidth="2.4" fill="none" />
          </svg>
        </span>
      ) : (
        <Cube size={28} top="#fff4ea" left="#f3d8c6" right="#e7c3ab" />
      )}
    </button>
  );
}
