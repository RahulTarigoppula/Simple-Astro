// Desk objects as inline SVG on a 24-unit spirit: brass, paper, thread, lac. Colours are tokens.
import { useId } from "react";

function BrassGradient({ id, vertical = false }: { id: string; vertical?: boolean }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2={vertical ? "0" : "1"} y2={vertical ? "1" : "0"}>
      <stop offset="0" stopColor="var(--brass-lo)" />
      <stop offset=".18" stopColor="var(--brass-hi)" />
      <stop offset=".5" stopColor="var(--brass-mid)" />
      <stop offset="1" stopColor="var(--brass-dark)" />
    </linearGradient>
  );
}

export function LeafBundleArt({ count = 3 }: { count?: number }) {
  const leaves = Math.max(1, Math.min(4, count));
  return (
    <svg width="96" height="62" viewBox="0 0 96 62" aria-hidden="true">
      <rect x="4" y="6" width="88" height="7" rx="2" fill="var(--teak-light)" />
      {Array.from({ length: leaves }, (_, i) => {
        const y = 15 + i * (36 / leaves);
        const h = Math.max(6, 36 / leaves - 2);
        return (
          <g key={y}>
            <rect x={i % 2 ? 10 : 8} y={y} width={i % 2 ? 76 : 80} height={h} rx="3" fill={i % 2 ? "var(--leaf-face)" : "var(--surface-2)"} />
            <path d={`M16 ${y + h / 2}h${52 + ((i * 7) % 12)}`} stroke="var(--border)" strokeWidth="1" />
          </g>
        );
      })}
      <rect x="4" y="50" width="88" height="7" rx="2" fill="var(--teak-light)" />
      <path d="M48 3c-9 10-9 46 0 56" stroke="var(--accent)" strokeWidth="2.5" fill="none" />
      <circle cx="48" cy="58" r="3.4" fill="var(--accent)" />
    </svg>
  );
}

export function DialArt({ hourAngle = 0, minuteAngle = 0, rahuFrom = 0, rahuTo = 0 }: { hourAngle?: number; minuteAngle?: number; rahuFrom?: number; rahuTo?: number }) {
  const arc = (a0: number, a1: number, r: number) => {
    const p = (a: number) => [43 + r * Math.sin((a * Math.PI) / 180), 43 - r * Math.cos((a * Math.PI) / 180)] as const;
    const [x0, y0] = p(a0);
    const [x1, y1] = p(a1);
    const large = (a1 - a0 + 360) % 360 > 180 ? 1 : 0;
    return `M43 43L${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}Z`;
  };
  return (
    <svg width="86" height="86" viewBox="0 0 86 86" aria-hidden="true">
      <circle cx="43" cy="43" r="40" fill="var(--brass-dark)" />
      <circle cx="43" cy="43" r="37" fill="none" stroke="var(--brass-hi)" strokeWidth="2.5" />
      <circle cx="43" cy="43" r="33" fill="var(--brass-mid)" />
      <circle cx="43" cy="43" r="33" fill="none" stroke="var(--brass-lo)" strokeWidth="1" />
      {rahuTo !== rahuFrom ? <path d={arc(rahuFrom, rahuTo, 33)} fill="var(--warning)" opacity=".55" /> : null}
      <g stroke="var(--brass-shadow)" strokeWidth="1.2">
        <path d="M43 12v5M74 43h-5M43 74v-5M12 43h5M64.9 21.1l-3.5 3.5M64.9 64.9l-3.5-3.5M21.1 64.9l3.5-3.5M21.1 21.1l3.5 3.5" />
      </g>
      <circle cx="43" cy="43" r="20" fill="none" stroke="var(--brass-lo)" strokeWidth=".8" strokeDasharray="2 4.6" />
      <path d="M43 43V22" stroke="var(--brass-ink)" strokeWidth="2.2" strokeLinecap="round" transform={`rotate(${hourAngle} 43 43)`} />
      <path d="M43 43V16" stroke="var(--brass-ink)" strokeWidth="1.4" strokeLinecap="round" transform={`rotate(${minuteAngle} 43 43)`} />
      <circle cx="43" cy="43" r="3" fill="var(--brass-ink)" />
    </svg>
  );
}

export function RolledPatriArt({ blank = false }: { blank?: boolean }) {
  const g = useId();
  return (
    <svg width="212" height="88" viewBox="0 0 212 88" aria-hidden="true">
      <defs>
        <BrassGradient id={g} />
      </defs>
      <rect x="18" y="20" width="176" height="48" rx="3" fill="var(--surface)" />
      <rect x="18" y="20" width="176" height="48" rx="3" fill="none" stroke="var(--border)" />
      {blank ? (
        <>
          <path d="M32 34h120M32 42h120M32 50h120M32 58h120" stroke="var(--border)" strokeWidth=".8" />
          <path d="M120 66l46-30 6 4-46 30-8 2z" fill="var(--teak-light)" />
          <path d="M120 66l-2 6 8-2" fill="var(--ink)" />
        </>
      ) : (
        <>
          <path d="M32 34h60M32 42h84M32 50h48" stroke="var(--border)" strokeWidth="1" />
          <path d="M120 30h58v28h-58z" fill="var(--surface-2)" />
          <path d="M149 30l29 14-29 14-29-14z" fill="none" stroke="var(--ink)" strokeWidth="1" />
          <path d="M120 30l58 28M178 30l-58 28" stroke="var(--ink)" strokeWidth=".7" opacity=".65" />
        </>
      )}
      <rect x="0" y="12" width="20" height="64" rx="9" fill={`url(#${g})`} />
      <rect x="192" y="12" width="20" height="64" rx="9" fill={`url(#${g})`} />
      {blank ? null : (
        <>
          <circle cx="106" cy="44" r="9" fill="var(--accent)" />
          <path d="M106 8c-14 12-14 60 0 72" stroke="var(--accent)" strokeWidth="2" fill="none" opacity=".8" />
        </>
      )}
    </svg>
  );
}

export function LoupeArt() {
  const g = useId();
  return (
    <svg width="88" height="76" viewBox="0 0 88 76" aria-hidden="true">
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--brass-hi)" />
          <stop offset=".5" stopColor="var(--brass-mid)" />
          <stop offset="1" stopColor="var(--brass-dark)" />
        </linearGradient>
      </defs>
      <rect x="52" y="46" width="30" height="9" rx="4.5" transform="rotate(38 52 46)" fill="var(--teak-light)" />
      <circle cx="36" cy="32" r="26" fill="var(--surface)" opacity=".5" />
      <circle cx="36" cy="32" r="26" fill="none" stroke={`url(#${g})`} strokeWidth="7" />
      <circle cx="36" cy="32" r="22" fill="none" stroke="var(--surface)" strokeWidth="1" opacity=".55" />
      <path d="M22 20a20 20 0 0 1 12-6" stroke="var(--accent-ink)" strokeWidth="3" opacity=".45" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function DiyaArt({ lit }: { lit: boolean }) {
  const glow = useId();
  const fl = useId();
  const bowl = useId();
  return (
    <svg width="88" height="80" viewBox="0 0 88 80" aria-hidden="true">
      <defs>
        <radialGradient id={glow}>
          <stop offset="0" stopColor="var(--flame-glow)" stopOpacity=".55" />
          <stop offset="1" stopColor="var(--flame-glow)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={fl} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="var(--accent)" />
          <stop offset=".45" stopColor="var(--flame-mid)" />
          <stop offset="1" stopColor="var(--flame-tip)" />
        </linearGradient>
        <linearGradient id={bowl} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--brass-hi)" />
          <stop offset=".5" stopColor="var(--brass-mid)" />
          <stop offset="1" stopColor="var(--brass-dark)" />
        </linearGradient>
      </defs>
      {lit ? (
        <>
          <ellipse className="diya-glow" cx="44" cy="30" rx="34" ry="26" fill={`url(#${glow})`} />
          <g className="flame" data-flame="">
            <path d="M44 16c7 8 9 12 9 17a9 9 0 0 1-18 0c0-5 2-9 9-17Z" fill={`url(#${fl})`} />
            <path d="M44 27c3 4 3.6 5.6 3.6 7.4A3.7 3.7 0 0 1 44 38a3.7 3.7 0 0 1-3.6-3.6c0-1.8.6-3.4 3.6-7.4Z" fill="var(--flame-core)" opacity=".85" />
          </g>
        </>
      ) : (
        <path d="M44 38c-2-6 3-9 1-15M46 30c3-3 1-7 3-10" stroke="var(--ink-faint)" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity=".7" />
      )}
      <path d="M40 40h8v6h-8z" fill="var(--brass-shadow)" />
      <path d="M14 46h60c0 10-13 18-30 18S14 56 14 46Z" fill={`url(#${bowl})`} />
      <path d="M14 46h60" stroke="var(--brass-hi)" strokeWidth="2" />
    </svg>
  );
}

export function DrawerKnobArt() {
  return (
    <svg width="120" height="34" viewBox="0 0 120 34" aria-hidden="true">
      <rect x="2" y="4" width="116" height="26" rx="3" fill="var(--teak-light)" />
      <rect x="2" y="4" width="116" height="26" rx="3" fill="none" stroke="var(--brass-shadow)" />
      <rect x="44" y="13" width="32" height="8" rx="4" fill="var(--brass-mid)" />
      <rect x="44" y="13" width="32" height="3" rx="1.5" fill="var(--brass-hi)" />
    </svg>
  );
}

// ── Ledge miniatures ────────────────────────────────────────────────────
export const LedgeArt = {
  scroll: (
    <svg width="26" height="18" viewBox="0 0 26 18">
      <rect x="3" y="3" width="20" height="12" rx="2" fill="var(--surface)" />
      <rect x="0" y="1" width="4" height="16" rx="2" fill="var(--brass-mid)" />
      <rect x="22" y="1" width="4" height="16" rx="2" fill="var(--brass-mid)" />
    </svg>
  ),
  leaves: (
    <svg width="24" height="18" viewBox="0 0 24 18">
      <rect x="1" y="2" width="22" height="5" rx="2.5" fill="var(--surface-2)" />
      <rect x="1" y="9" width="22" height="5" rx="2.5" fill="var(--surface-2)" opacity=".75" />
      <circle cx="12" cy="16" r="2" fill="var(--accent)" />
    </svg>
  ),
  dial: (
    <svg width="20" height="20" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="9" fill="var(--brass-mid)" />
      <circle cx="10" cy="10" r="9" fill="none" stroke="var(--brass-hi)" strokeWidth="1.2" />
      <path d="M10 10V4M10 10l4 3" stroke="var(--brass-ink)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  loupe: (
    <svg width="22" height="20" viewBox="0 0 22 20">
      <circle cx="9" cy="9" r="7" fill="none" stroke="var(--brass-mid)" strokeWidth="3" />
      <path d="M14 14l6 5" stroke="var(--teak-light)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
  lamp: (lit: boolean) => (
    <svg width="24" height="20" viewBox="0 0 24 20">
      <path d="M12 1c3 3.5 4 5 4 7a4 4 0 0 1-8 0c0-2 1-3.5 4-7Z" fill="var(--flame-mid)" opacity={lit ? 1 : 0.25} />
      <path d="M3 13h18c0 4-4 6-9 6s-9-2-9-6Z" fill="var(--brass-mid)" />
    </svg>
  ),
};
