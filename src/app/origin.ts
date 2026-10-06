// object-open: the tapped desk object's rect is remembered so the next screen grows out of it.
let origin: { x: number; y: number; s: number } | null = null;

export function rememberOrigin(el: Element | null): void {
  if (!el) {
    origin = null;
    return;
  }
  const r = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  origin = { x: r.left + r.width / 2 - vw / 2, y: r.top + r.height / 2 - vh / 2, s: Math.min(0.9, Math.max(0.3, r.width / vw)) };
}

export function takeOrigin(): React.CSSProperties {
  const o = origin;
  origin = null;
  if (!o) return { "--ox": "0px", "--oy": "24px", "--os": "0.97" } as React.CSSProperties;
  return { "--ox": `${o.x.toFixed(0)}px`, "--oy": `${o.y.toFixed(0)}px`, "--os": o.s.toFixed(2) } as React.CSSProperties;
}
