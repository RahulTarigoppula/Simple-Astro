// The invitation on the palm screen: an open hand in one line, with the three lines the reader looks
// for (heart, head, life) drawing themselves in where they lie on a palm. Mirrored for the left hand.
import { motion, useReducedMotion } from "motion/react";

const EASE = [0.22, 0.8, 0.2, 1] as const;

// A right palm facing the reader: little finger on the left, thumb on the right.
const HAND =
  "M84 300C82 266 52 236 47 192L44 94A12 12 0 0 1 68 94L69 142Q71.500 149 74 142L74 58A13 13 0 0 1 100 58L100 138Q103 145 106 138L106 44A13 13 0 0 1 132 44L132 138Q135 145 138 138L138 64A13 13 0 0 1 164 64L165 150C167 170 177 178 187 167L207 133A13.100 13.100 0 0 1 229 147C223 172 209 200 197 222C186 248 162 264 159 300";
const LINES = [
  { id: "heart", d: "M52 188C82 198 122 192 148 160", at: [34, 192], side: -1 },
  { id: "head", d: "M171 188C142 192 102 204 70 228", at: [46, 240], side: -1 },
  { id: "life", d: "M171 188C140 198 122 242 136 290", at: [176, 292], side: 1 },
] as const;
const NAME = { heart: "Heart", head: "Head", life: "Life" } as const;

export function PalmArt({ hand }: { hand: "right" | "left" }) {
  const reduced = useReducedMotion();
  const still = !!reduced || import.meta.env.MODE === "test";
  const flip = hand === "left";
  const draw = (delay: number, duration: number) => ({
    initial: still ? (false as const) : { pathLength: 0, opacity: 0 },
    animate: { pathLength: 1, opacity: 1 },
    transition: { duration, delay, ease: EASE },
  });
  return (
    <svg className="palm-art" viewBox="-24 16 288 292" aria-hidden="true">
      <g transform={flip ? "translate(240 0) scale(-1 1)" : undefined}>
        <motion.path className="palm-art__hand" d={HAND} {...draw(0, 1.4)} />
        {LINES.map((l, n) => (
          <motion.path key={l.id} className="palm-art__line" d={l.d} {...draw(0.7 + n * 0.3, 1)} />
        ))}
      </g>
      {LINES.map((l, n) => {
        const x = flip ? 240 - l.at[0] : l.at[0];
        const end = (l.side === -1) !== flip;
        return (
          <motion.text
            key={l.id}
            x={x}
            y={l.at[1]}
            className="palm-art__name"
            textAnchor={end ? "end" : "start"}
            initial={still ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.3 + n * 0.3, ease: EASE }}
          >
            {NAME[l.id]}
          </motion.text>
        );
      })}
    </svg>
  );
}
