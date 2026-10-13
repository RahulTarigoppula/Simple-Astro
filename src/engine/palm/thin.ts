// Stage [6a]: Zhang-Suen thinning, exactly as §6.13 (ximgproc.thinning is not in the default
// OpenCV.js build). Operates in place on a 0/1 mask and returns it.

/** Thin `bin` (0/1, row-major) in place; returns the mask and the number of full iterations. */
export function zhangSuenStats(bin: Uint8Array, w: number, h: number): { mask: Uint8Array; iterations: number } {
  const at = (x: number, y: number): number => bin[y * w + x] ?? 0;
  let changed = true;
  let iterations = 0;
  while (changed) {
    changed = false;
    iterations++;
    for (const step of [0, 1]) {
      const kill: number[] = [];
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          if (!at(x, y)) continue;
          const p = [
            at(x, y - 1),
            at(x + 1, y - 1),
            at(x + 1, y),
            at(x + 1, y + 1),
            at(x, y + 1),
            at(x - 1, y + 1),
            at(x - 1, y),
            at(x - 1, y - 1),
          ]; // P2..P9 clockwise
          const B = p.reduce((s, v) => s + v, 0);
          if (B < 2 || B > 6) continue;
          let transitions = 0;
          for (let i = 0; i < 8; i++) if (!p[i] && p[(i + 1) % 8]) transitions++;
          if (transitions !== 1) continue;
          const [p2 = 0, , p4 = 0, , p6 = 0, , p8 = 0] = p;
          const c1 = step === 0 ? p2 * p4 * p6 : p2 * p4 * p8;
          const c2 = step === 0 ? p4 * p6 * p8 : p2 * p6 * p8;
          if (c1 === 0 && c2 === 0) kill.push(y * w + x);
        }
      }
      if (kill.length) {
        changed = true;
        for (const i of kill) bin[i] = 0;
      }
    }
  }
  return { mask: bin, iterations };
}

export function zhangSuen(bin: Uint8Array, w: number, h: number): Uint8Array {
  return zhangSuenStats(bin, w, h).mask;
}
