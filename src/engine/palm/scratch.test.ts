import { it } from "vitest";
import { loadFixture, loadTruth, type FixtureName } from "../../test/palm-fixtures";
import { runPalmPipeline } from "./pipeline";
import { sqDistToPolyline, type Pt } from "./label";
const rms = (path: Pt[], gt: Pt[]) => Math.sqrt(path.reduce((s, p) => s + sqDistToPolyline(p, gt), 0) / path.length);
it("eval", () => {
  const truth = loadTruth();
  for (const name of ["synthetic-clean", "synthetic-shadow", "synthetic-blur", "synthetic-henna"] as FixtureName[]) {
    const t0 = performance.now();
    const r = runPalmPipeline(loadFixture(name), truth.landmarks, { hand: "right" });
    const ms = performance.now() - t0;
    if (!r.ok) { console.log(name, "fail"); continue; }
    console.log(name, ms.toFixed(0) + "ms", "comps", r.stats.components, "p99", r.stats.p99.toFixed(3), "iter", r.stats.thinIterations, "trace", r.suggestTrace);
    for (const c of r.candidates) {
      const gt = (truth.lines as Record<string, Pt[]>)[c.id];
      console.log("  ", c.id, "conf", c.confidence.toFixed(3), "cov", c.coverage.toFixed(2), "score", c.score.score.toFixed(2), "contrast", c.contrast.toFixed(2), "rms", gt ? rms(c.path, gt).toFixed(1) : "-", "breaks", c.breaks, "br", c.branches);
    }
  }
});
