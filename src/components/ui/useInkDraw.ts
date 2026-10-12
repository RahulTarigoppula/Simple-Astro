import { useLayoutEffect } from "react";
import { reducedMotion } from "../../platform/native";

const EASE = "cubic-bezier(0.22, 0.8, 0.2, 1)";
const SPRING = "linear(0, 0.36 10%, 0.78 21%, 1.02 34%, 1.06 42%, 1.01 58%, 0.99 74%, 1)";

/**
 * ink-draw: every [data-ink] stroke draws pathLength 0→1 (frame first, `step` ms stagger, nib
 * wobble on stroke-width); every [data-settle] mark then settles with PAPER. Under reduced motion
 * the ink fades in 240 ms. `skip` renders the finished drawing at once (cached revisit).
 */
export function useInkDraw(root: React.RefObject<Element | null>, deps: unknown[], opts?: { step?: number; skip?: boolean }) {
  // Callers pass the values that change the drawing; their joined form is the effect's key.
  const sig = deps.map((d) => String(d)).join("|");
  const step = opts?.step;
  const skip = opts?.skip;
  // biome-ignore lint/correctness/useExhaustiveDependencies: `sig` stands for the caller's deps; `root` is a stable ref
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const stepMs = step ?? 60;
    const reduced = reducedMotion();
    const marks = Array.from(el.querySelectorAll<SVGGeometryElement>("[data-ink]"));
    const anims: Animation[] = [];
    marks.forEach((p, i) => {
      p.setAttribute("pathLength", "1");
      p.style.strokeDasharray = "1";
      if (skip) {
        p.style.strokeDashoffset = "0";
        return;
      }
      const delay = p.dataset.delay !== undefined ? Number(p.dataset.delay) : i * stepMs;
      if (reduced) {
        p.style.strokeDashoffset = "0";
        anims.push(p.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, fill: "backwards", easing: EASE }));
      } else {
        p.style.strokeDashoffset = "1";
        const dur = Math.min(1400, Math.max(400, Number(p.dataset.ink ?? 600) * 1.1));
        const a = p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
          duration: dur,
          delay,
          fill: "forwards",
          easing: EASE,
        });
        a.onfinish = () => {
          p.style.strokeDashoffset = "0";
        };
        anims.push(a);
        anims.push(
          p.animate([{ strokeWidth: "1.05px" }, { strokeWidth: "1.4px" }, { strokeWidth: "1.15px" }, { strokeWidth: "1.25px" }], {
            duration: 240,
            delay,
            iterations: Math.ceil(dur / 240),
            easing: "steps(4)",
          }),
        );
      }
    });
    if (!skip) {
      const bodies = Array.from(el.querySelectorAll<SVGElement | HTMLElement>("[data-settle]"));
      bodies.forEach((b, i) => {
        const d = marks.length * stepMs + 220 + i * 40;
        anims.push(
          reduced
            ? b.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, delay: 120, fill: "backwards", easing: EASE })
            : b.animate(
                [
                  { opacity: 0, transform: "translateY(6px)" },
                  { opacity: 1, transform: "none" },
                ],
                {
                  duration: 420,
                  delay: d,
                  fill: "backwards",
                  easing: SPRING,
                },
              ),
        );
      });
    }
    return () => {
      for (const a of anims) a.cancel();
    };
  }, [sig, step, skip]);
}
