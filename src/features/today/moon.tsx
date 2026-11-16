// The Moon as it really is that day: the terminator is an ellipse whose half-width is |1 − 2k| of
// the radius. The lit limb flips for a southern sky.
const R = 46;
const CX = 50;

/** The lit region as one SVG path: the lit limb plus the terminator half-ellipse. */
export function litPath(k: number, waxing: boolean, south: boolean): string {
  const kk = Math.min(1, Math.max(0, k));
  if (kk < 0.004) return "";
  const rightLit = waxing !== south;
  const rx = Math.abs(1 - 2 * kk) * R;
  const limb = rightLit ? 1 : 0;
  const term = kk < 0.5 === rightLit ? 0 : 1;
  return `M${CX} ${CX - R}A${R} ${R} 0 0 ${limb} ${CX} ${CX + R}A${rx.toFixed(2)} ${R} 0 0 ${term} ${CX} ${CX - R}Z`;
}

/** A small Moon face; decorative, the words beside it carry the meaning. */
export function MoonFace({ k, waxing, south, className }: { k: number; waxing: boolean; south: boolean; className?: string }) {
  const d = litPath(k, waxing, south);
  return (
    <svg className={`alm-moon${className ? ` ${className}` : ""}`} viewBox="0 0 100 100" aria-hidden="true" data-decorative="true">
      <circle className="alm-moon__dark" cx={CX} cy={CX} r={R} />
      {d ? <path className="alm-moon__lit" d={d} /> : null}
    </svg>
  );
}
