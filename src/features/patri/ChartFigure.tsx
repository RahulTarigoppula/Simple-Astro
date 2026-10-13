// The D1 figure: the ink-drawn Kundli, the brass loupe that rises under the finger and snaps
// planet to planet (loupe-rise), the engraved readout, and the North ⇄ South paper flip.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DigitSet } from "../../components/ui/DigitSet";
import { GRAHA_CODE, GRAHA_ENGLISH, GRAHA_NAMES, NAKSHATRA_NAMES, SIGN_NAMES } from "../../data/tables/names";
import { formatArcmin, formatDms } from "../../engine/math";
import type { GrahaId, Patri } from "../../engine/types";
import { GRAHA_IDS } from "../../engine/types";
import { haptics } from "../../platform/haptics";
import { reducedMotion } from "../../platform/native";
import { play } from "../../platform/sound";
import { type ChartBody, type ChipPos, KundliChart, type KundliHandle } from "./KundliChart";

const Z = 2.4;
const R = 53; // glass radius (118 px loupe − 6 px rim)
const SPRING = "linear(0, 0.36 10%, 0.78 21%, 1.02 34%, 1.06 42%, 1.01 58%, 0.99 74%, 1)";

export function bodiesOf(p: Patri): ChartBody[] {
  return GRAHA_IDS.map((id) => {
    const g = p.grahas[id];
    return { id, sign: g.sign, degInSign: g.degInSign, retro: g.retrograde, nakshatra: g.nakshatra, pada: g.pada };
  });
}

interface ChartFigureProps {
  patri: Patri;
  style: "north" | "south";
  script: "devanagari" | "latin";
  inkKey: string;
  skipInk: boolean;
  lit: GrahaId | null;
  onLit: (g: GrahaId | null) => void;
  onFlip: () => void;
}

export function ChartFigure({ patri, style, script, inkKey, skipInk, lit, onLit, onFlip }: ChartFigureProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const loupe = useRef<HTMLDivElement>(null);
  const lens = useRef<HTMLDivElement>(null);
  const chart = useRef<KundliHandle>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [up, setUp] = useState(false);
  const [chips, setChips] = useState<ChipPos[]>([]);
  const [width, setWidth] = useState(320);
  const active = useRef(false);
  const swipe = useRef<{ x: number; y: number; t: number } | null>(null);
  const hideTimer = useRef(0);
  const bodies = useMemo(() => bodiesOf(patri), [patri]);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // Tilak haptic: impact Medium when the dab lands, once per ink-draw.
  // biome-ignore lint/correctness/useExhaustiveDependencies: inkKey identifies a new drawing
  useEffect(() => {
    if (skipInk) return;
    const t = window.setTimeout(
      () => {
        haptics.impact("medium");
        play("pat");
      },
      reducedMotion() ? 240 : 1500,
    );
    return () => clearTimeout(t);
  }, [inkKey, skipInk]);

  const scale = width / 408; // viewBox is 408 wide (−4…404)
  const toPx = (x: number, y: number) => [(x + 4) * scale, (y + 4) * scale] as const;

  const place = useCallback((px: number, py: number) => {
    const l = loupe.current;
    const g = lens.current;
    if (l) {
      l.style.left = `${px}px`;
      l.style.top = `${py}px`;
    }
    if (g) g.style.transform = `translate(${R - px * Z}px, ${R - py * Z}px)`;
  }, []);

  const nearest = useCallback(
    (px: number, py: number) => {
      let best: GrahaId | null = null;
      let bd = 1e9;
      let at: readonly [number, number] = [0, 0];
      for (const c of chips) {
        const p = [(c.x + 4) * scale, (c.y + 4) * scale] as const;
        const d = Math.hypot(p[0] - px, p[1] - py);
        if (d < bd) {
          bd = d;
          best = c.id;
          at = p;
        }
      }
      return { id: best, d: bd, at };
    },
    [scale, chips],
  );

  const read = useCallback(
    (px: number, py: number, settle: boolean) => {
      place(px, py);
      const n = nearest(px, py);
      if (n.id && n.d < 74 && n.id !== lit) {
        onLit(n.id);
        haptics.selection();
        play("tick");
      }
      if (settle && n.id && n.d < 120) {
        const l = loupe.current;
        const g = lens.current;
        const [tx, ty] = n.at;
        const dur = reducedMotion() ? 160 : 420;
        const easing = reducedMotion() ? "ease-out" : SPRING;
        l?.animate(
          [
            { left: `${px}px`, top: `${py}px` },
            { left: `${tx}px`, top: `${ty}px` },
          ],
          { duration: dur, easing, fill: "forwards" },
        );
        g?.animate(
          [{ transform: `translate(${R - px * Z}px, ${R - py * Z}px)` }, { transform: `translate(${R - tx * Z}px, ${R - ty * Z}px)` }],
          {
            duration: dur,
            easing,
            fill: "forwards",
          },
        );
      }
    },
    [lit, nearest, onLit, place],
  );

  const raise = (px: number, py: number) => {
    clearTimeout(hideTimer.current);
    for (const a of loupe.current?.getAnimations() ?? []) a.cancel();
    for (const a of lens.current?.getAnimations() ?? []) a.cancel();
    setUp(true);
    loupe.current?.animate(
      [{ transform: "translate(-50%, -50%) translateY(24px) scale(.6)" }, { transform: "translate(-50%, -50%) scale(1)" }],
      { duration: reducedMotion() ? 1 : 240, easing: "cubic-bezier(0.22, 0.8, 0.2, 1)" },
    );
    read(px, py, false);
  };
  const lower = (ms: number) => {
    clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setUp(false), ms);
  };

  const flip = () => {
    const s = stage.current;
    if (!s || reducedMotion()) {
      onFlip();
      return;
    }
    const a = s.animate([{ transform: "rotateY(0deg)" }, { transform: "rotateY(90deg)" }], { duration: 220, easing: "ease-in" });
    a.onfinish = () => {
      onFlip();
      s.animate([{ transform: "rotateY(-90deg)" }, { transform: "rotateY(0deg)" }], { duration: 260, easing: SPRING });
    };
    play("scratch", 0.6);
  };

  const g = lit ? patri.grahas[lit] : null;

  return (
    <>
      <div
        className="chart-wrap"
        ref={wrap}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          swipe.current = { x: e.clientX, y: e.clientY, t: performance.now() };
          active.current = true;
          const r = e.currentTarget.getBoundingClientRect();
          raise(e.clientX - r.left, e.clientY - r.top);
        }}
        onPointerMove={(e) => {
          if (!active.current) return;
          const r = e.currentTarget.getBoundingClientRect();
          read(Math.max(0, Math.min(r.width, e.clientX - r.left)), Math.max(0, Math.min(r.height, e.clientY - r.top)), false);
        }}
        onPointerUp={(e) => {
          if (!active.current) return;
          active.current = false;
          const s = swipe.current;
          swipe.current = null;
          const r = e.currentTarget.getBoundingClientRect();
          if (s && Math.abs(e.clientX - s.x) > 90 && Math.abs(e.clientY - s.y) < 40 && performance.now() - s.t < 500) {
            setUp(false);
            flip();
            return;
          }
          read(Math.max(0, Math.min(r.width, e.clientX - r.left)), Math.max(0, Math.min(r.height, e.clientY - r.top)), true);
          lower(2600);
        }}
        onPointerCancel={() => {
          active.current = false;
          lower(400);
        }}
      >
        <div className="flip-stage" ref={stage}>
          <KundliChart
            ref={chart}
            title={`Rāśi chart D1, ${style === "north" ? "North Indian diamond" : "South Indian grid"}, Lagna in ${SIGN_NAMES[patri.lagna.sign]}`}
            style={style}
            script={script}
            lagnaSign={patri.lagna.sign}
            bodies={bodies}
            lit={lit}
            inkKey={inkKey}
            skipInk={skipInk}
            onChips={setChips}
          />
        </div>
        <div className="hit-layer">
          {chips.map((c) => {
            const [x, y] = toPx(c.x, c.y);
            return (
              <button
                key={c.id}
                type="button"
                style={{ left: x, top: y }}
                aria-label={`Read ${GRAHA_ENGLISH[c.id]} with the loupe`}
                onFocus={() => raise(x, y)}
                onBlur={() => lower(600)}
                onClick={(e) => {
                  e.stopPropagation();
                  raise(x, y);
                  lower(3200);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                tabIndex={0}
              />
            );
          })}
        </div>
        <div className={`loupe${up ? " is-up" : ""}`} ref={loupe} aria-hidden="true" data-decorative="true">
          <div className="loupe__glass">
            <div ref={lens} style={{ width: width * Z, height: width * Z }}>
              <KundliChart title="" style={style} script={script} lagnaSign={patri.lagna.sign} bodies={bodies} lit={lit} static />
            </div>
          </div>
          <div className="loupe__rim" />
          <div className="loupe__flare" />
        </div>
      </div>
      <div className="chart-tools">
        <button type="button" className="linkish" onClick={flip}>
          {style === "north" ? "Turn the paper: South grid ⇄" : "Turn the paper: North diamond ⇄"}
        </button>
      </div>
      <div className="readout" aria-live="polite">
        <div className="engraved">
          {g && lit ? (
            <>
              <b>{GRAHA_CODE[lit]}</b>
              <DigitSet text={formatDms(g.degInSign)} />
              <span className="sep">·</span>
              <span>
                {(NAKSHATRA_NAMES[g.nakshatra] ?? "").toUpperCase()} {g.pada}
              </span>
              <span className="sep">·</span>
              <span>LORD {(GRAHA_NAMES[g.nakshatraLord] ?? "").toUpperCase()}</span>
              {g.retrograde ? <span>℞</span> : null}
              {g.boundary ? (
                <span className="badge-bound">
                  ≤2′ · {formatArcmin(g.boundary.arcminutesTo)} to {g.boundary.otherSide}
                </span>
              ) : null}
            </>
          ) : (
            <span className="loupe-hint">Touch a graha to raise the loupe</span>
          )}
        </div>
      </div>
    </>
  );
}
