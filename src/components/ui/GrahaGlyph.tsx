// Navagraha medallions: one original line-glyph per graha inside a glowing disc, tinted by the graha's
// traditional colour (tokens --g-XX in astral.css).
import type { GrahaId } from "../../engine/types";

const PATHS: Record<GrahaId, React.ReactNode> = {
  // Sūrya: a disc with eight rays
  SU: (
    <>
      <circle cx="16" cy="16" r="5" />
      <path d="M16 5.5v3M16 23.5v3M5.5 16h3M23.5 16h3M8.6 8.6l2.1 2.1M21.3 21.3l2.1 2.1M8.6 23.4l2.1-2.1M21.3 10.7l2.1-2.1" />
    </>
  ),
  // Candra: a crescent
  MO: <path d="M20.5 7.5a9 9 0 1 0 0 17 7.2 7.2 0 1 1 0-17z" />,
  // Maṅgala: a spear-head over a triangle (the fire altar)
  MA: (
    <>
      <path d="M16 6l7 12H9z" />
      <path d="M16 18v8M12.5 26h7" />
    </>
  ),
  // Budha: an arrow of thought through a small disc
  ME: (
    <>
      <circle cx="16" cy="18" r="4.2" />
      <path d="M16 6v7.8M12.6 9.2L16 6l3.4 3.2M16 22.2V27M13 25h6" />
    </>
  ),
  // Bṛhaspati: a banded giant with a small moon
  JU: (
    <>
      <circle cx="15" cy="17" r="8" />
      <path d="M7.6 14.5h14.8M7.4 18.8h15.2" />
      <circle cx="25.5" cy="8" r="1.6" />
    </>
  ),
  // Śukra: the eight-pointed morning star
  VE: <path d="M16 5l2.3 8.7L27 16l-8.7 2.3L16 27l-2.3-8.7L5 16l8.7-2.3z" />,
  // Śani: the ringed planet
  SA: (
    <>
      <circle cx="16" cy="16" r="5.6" />
      <ellipse cx="16" cy="16" rx="11" ry="3.6" transform="rotate(-18 16 16)" />
    </>
  ),
  // Rāhu: the serpent's head with its open jaw
  RA: (
    <>
      <path d="M7 22c3-1 4-4 4-7a5 5 0 0 1 10 0c0 2-1 3-2.5 3.8L25 22l-7.5-.8" />
      <circle cx="17.2" cy="14" r="1.1" />
    </>
  ),
  // Ketu: the headless tail, a comet's banner
  KE: (
    <>
      <circle cx="21.5" cy="10.5" r="3" />
      <path d="M19.4 12.6L7 25M18 10.2L9 18M21.6 14.4L14 22" />
    </>
  ),
};

export function GrahaGlyph({ id, size = 40, label }: { id: GrahaId; size?: number; label?: string }) {
  return (
    <svg
      className={`graha-glyph graha-glyph--${id}`}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <circle className="graha-glyph__disc" cx="16" cy="16" r="15" />
      <g className="graha-glyph__mark" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {PATHS[id]}
      </g>
    </svg>
  );
}
