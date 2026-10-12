import { describe, expect, it } from "vitest";
import { loadFixture, loadTruth } from "../../test/palm-fixtures";
import { type Pt, sqDistToPolyline } from "./label";
import { runPalmPipeline } from "./pipeline";
import {
  applyH,
  CANONICAL_DST,
  getPerspectiveTransform,
  homographyFromLandmarks,
  invert3,
  type Mat3,
  sourcePoints,
  warpPerspective,
} from "./rectify";

const truth = loadTruth();

/** +37° rotation and 0.6× scale about the image centre, as a 3 × 3 homography. */
function similarity(deg: number, s: number, cx: number, cy: number): Mat3 {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a) * s;
  const n = Math.sin(a) * s;
  return [c, -n, cx - c * cx + n * cy, n, c, cy - n * cx - c * cy, 0, 0, 1];
}

describe("rectification (§6.13 [3])", () => {
  it("the four source landmarks land on the canonical points within 1 px", () => {
    const H = homographyFromLandmarks(truth.landmarks, truth.width, truth.height);
    const src = sourcePoints(truth.landmarks, truth.width, truth.height);
    if (!H || !src) throw new Error("homography");
    src.forEach((p, i) => {
      const [x, y] = applyH(H, p);
      const [u, v] = CANONICAL_DST[i] ?? [0, 0];
      expect(Math.hypot(x - u, y - v)).toBeLessThan(1);
    });
  });

  it("is invertible: original → canonical → original round-trips within 0.5 px", () => {
    const H = homographyFromLandmarks(truth.landmarks, truth.width, truth.height);
    const Hi = H ? invert3(H) : null;
    if (!H || !Hi) throw new Error("homography");
    for (let y = 0; y <= truth.height; y += 37) {
      for (let x = 0; x <= truth.width; x += 41) {
        const [bx, by] = applyH(Hi, applyH(H, [x, y]));
        expect(Math.hypot(bx - x, by - y)).toBeLessThanOrEqual(0.5);
      }
    }
  });

  it("a general (perspective) quad maps exactly, and collinear points refuse", () => {
    const src: Pt[] = [
      [10, 10],
      [300, 40],
      [280, 260],
      [20, 300],
    ];
    const dst: Pt[] = [
      [0, 0],
      [512, 0],
      [512, 512],
      [0, 512],
    ];
    const H = getPerspectiveTransform(src, dst);
    if (!H) throw new Error("homography");
    src.forEach((p, i) => {
      const q = applyH(H, p);
      const d = dst[i] ?? [0, 0];
      expect(Math.hypot(q[0] - d[0], q[1] - d[1])).toBeLessThan(1e-6);
    });
    expect(
      getPerspectiveTransform(
        [
          [0, 0],
          [1, 1],
          [2, 2],
          [3, 3],
        ],
        dst,
      ),
    ).toBeNull();
  });

  it("a +37° / 0.6× copy of the synthetic palm rectifies to within 4 px RMS of the unrotated run", () => {
    const img = loadFixture("synthetic-clean");
    const S = similarity(37, 0.6, img.width / 2, img.height / 2);
    const rotated = warpPerspective(img, S, img.width, img.height);
    const lm = truth.landmarks.map((p) => {
      const [x, y] = applyH(S, [p.x * img.width, p.y * img.height]);
      return { x: x / img.width, y: y / img.height, z: p.z };
    });
    const a = runPalmPipeline(img, truth.landmarks, { hand: "right" });
    const b = runPalmPipeline(rotated, lm, { hand: "right" });
    if (!a.ok || !b.ok) throw new Error("pipeline");
    // the homographies agree on where every canonical point comes from
    for (const id of ["heart", "head", "life"] as const) {
      const la = a.lines.find((l) => l.id === id);
      const lb = b.lines.find((l) => l.id === id);
      if (!la || !lb) throw new Error(`${id} missing`);
      const rms = Math.sqrt(lb.path.reduce((s, p) => s + sqDistToPolyline(p, la.path), 0) / lb.path.length);
      expect(rms, id).toBeLessThanOrEqual(4);
    }
  });
});
