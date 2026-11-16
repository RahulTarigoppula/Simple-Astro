/** The Moon as it looks tonight: the lit part drawn from the Moon − Sun angle (0 new, 180 full). */
export function MoonDisc({ elongation, size = 56 }: { elongation: number; size?: number }) {
  const e = ((elongation % 360) + 360) % 360;
  const waxing = e < 180;
  const lit = (1 - Math.cos((e * Math.PI) / 180)) / 2;
  const r = 20;
  const rx = Math.abs(Math.cos((e * Math.PI) / 180)) * r;
  const crescent = lit < 0.5;
  const outer = waxing ? 1 : 0;
  const inner = waxing ? (crescent ? 0 : 1) : crescent ? 1 : 0;
  const d = `M24 4A${r} ${r} 0 0 ${outer} 24 44A${rx.toFixed(2)} ${r} 0 0 ${inner} 24 4Z`;
  return (
    <svg className="moon-disc" width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r={r} fill="var(--card-hi)" stroke="var(--card-edge-strong)" />
      {lit > 0.01 ? <path d={d} fill="var(--moon)" /> : null}
    </svg>
  );
}
