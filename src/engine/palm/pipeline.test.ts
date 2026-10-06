// Line extraction on SYNTHETIC fixtures only (scripts/make-palm-fixtures.mjs). The contract is
// honesty: a low-confidence result that says so is a pass; a confident wrong line is a failure.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { type FixtureName, fixturePath, loadFixture, loadTruth } from "../../test/palm-fixtures";
import type { PalmLine } from "../types";
import { asCv, type CvLike, makeCvOps } from "./cv-ops";
import { LOW_CONFIDENCE, sqDistToPolyline, type Pt } from "./label";
import { needsTrace, type PipelineResult, runPalmPipeline } from "./pipeline";

const truth = loadTruth();
const run = (name: FixtureName): PipelineResult => {
  const r = runPalmPipeline(loadFixture(name), truth.landmarks, { hand: "right" });
  if (!r.ok) throw new Error(`${name}: ${r.reason}`);
  return r;
};
const rmsToTruth = (l: PalmLine): number => {
  const gt = truth.lines[l.id as "heart" | "head" | "life"];
  if (!gt) return Number.POSITIVE_INFINITY;
  return Math.sqrt(l.path.reduce((s, p) => s + sqDistToPolyline(p, gt), 0) / l.path.length);
};
const MAIN = ["heart", "head", "life"] as const;
const summary = (r: PipelineResult): string => r.lines.map((l) => `${l.id} ${l.confidence.toFixed(2)}`).join(", ");

describe("fixtures are synthetic and small", () => {
  it("every fixture PNG is ≤ 200 kB (the biometrics guard) and generated, not photographed", () => {
    const dir = fixturePath("");
    for (const f of readdirSync(dir).filter((n) => n.endsWith(".png"))) {
      const bytes = readFileSync(join(dir, f)).length;
      expect(bytes, f).toBeLessThanOrEqual(200 * 1024);
    }
    expect(existsSync(fixturePath("synthetic.json"))).toBe(true);
  });
});

describe("line extraction on synthetic palms (§10.5)", () => {
  it("synthetic-clean → heart, head and life at ≥ 0.8, each within 6 px RMS of the truth", () => {
    const r = run("synthetic-clean");
    for (const id of MAIN) {
      const l = r.lines.find((x) => x.id === id);
      expect(l, `${id} (${summary(r)})`).toBeDefined();
      if (!l) continue;
      expect(l.confidence, id).toBeGreaterThanOrEqual(0.8);
      expect(rmsToTruth(l), id).toBeLessThanOrEqual(6);
      expect(l.path).toHaveLength(64);
      expect(l.source).toBe("detected");
    }
    expect(r.suggestTrace).toBe(false);
  });

  it("synthetic-shadow (40 % illumination ramp) → all three at ≥ 0.6", () => {
    const r = run("synthetic-shadow");
    for (const id of MAIN) {
      const l = r.lines.find((x) => x.id === id);
      expect(l?.confidence ?? 0, `${id} (${summary(r)})`).toBeGreaterThanOrEqual(0.6);
      if (l) expect(rmsToTruth(l), id).toBeLessThanOrEqual(6);
    }
  });

  it("synthetic-blur → at least one line below 0.6 and { suggestTrace: true }", () => {
    const r = run("synthetic-blur");
    const confs = MAIN.map((id) => r.lines.find((x) => x.id === id)?.confidence ?? 0);
    expect(Math.min(...confs)).toBeLessThan(LOW_CONFIDENCE);
    expect(r.suggestTrace).toBe(true);
    expect(needsTrace(r.lines)).toBe(true);
  });

  it("synthetic-henna → no spurious line above 0.6 (every confident line is a real crease)", () => {
    const r = run("synthetic-henna");
    for (const l of r.lines) {
      if (l.confidence <= LOW_CONFIDENCE) continue;
      expect(l.id, `confident ${l.id} (${summary(r)})`).not.toBe("fate"); // the synthetic hand has none
      expect(rmsToTruth(l), `${l.id} is confident, so it must be on the truth`).toBeLessThanOrEqual(6);
    }
  });

  it("is a pure function: byte-identical output on repeat", () => {
    const img = loadFixture("synthetic-henna");
    const a = runPalmPipeline(img, truth.landmarks, { hand: "right" });
    const b = runPalmPipeline(img, truth.landmarks, { hand: "right" });
    if (!a.ok || !b.ok) throw new Error("pipeline");
    expect(JSON.stringify(b.lines)).toBe(JSON.stringify(a.lines));
    expect(JSON.stringify(b.homography)).toBe(JSON.stringify(a.homography));
    expect(Buffer.from(b.print.data).equals(Buffer.from(a.print.data))).toBe(true);
  });

  it("a degenerate hand returns { ok: false } rather than a print of nothing", () => {
    const same = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
    expect(runPalmPipeline(loadFixture("synthetic-clean"), same, { hand: "right" })).toEqual({ ok: false, reason: "degenerate" });
  });

  it("an empty palm (no creases at all) finds no confident line", () => {
    const img = loadFixture("synthetic-clean");
    // flatten the palm to its mean colour: nothing left to find
    const data = Uint8ClampedArray.from(img.data);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 200;
      data[i + 1] = 160;
      data[i + 2] = 130;
    }
    const r = runPalmPipeline({ data, width: img.width, height: img.height }, truth.landmarks, { hand: "right" });
    if (!r.ok) throw new Error("pipeline");
    expect(r.lines.filter((l) => l.confidence > LOW_CONFIDENCE)).toHaveLength(0);
    expect(r.suggestTrace).toBe(true);
  });
});

// ─── the OpenCV path (the worker's), in Node ─────────────────────────────────
async function loadCv(): Promise<CvLike | null> {
  try {
    const require = createRequire(import.meta.url);
    const mod: unknown = require("@techstark/opencv-js");
    const m = mod as { Mat?: unknown; onRuntimeInitialized?: () => void };
    await new Promise<void>((resolve) => {
      if (m.Mat) resolve();
      else m.onRuntimeInitialized = () => resolve();
    });
    return asCv(mod);
  } catch {
    return null;
  }
}

describe("OpenCV ops (worker path)", async () => {
  const cv = await loadCv();
  it.skipIf(!cv)("every cv.Mat constructed is deleted (delta 0), and the cv path is as honest", () => {
    if (!cv) return;
    for (const name of ["synthetic-clean", "synthetic-blur"] as const) {
      const ops = makeCvOps(cv);
      const r = runPalmPipeline(loadFixture(name), truth.landmarks, { hand: "right" }, ops);
      if (!r.ok) throw new Error("pipeline");
      expect(ops.counter.created).toBeGreaterThan(0);
      expect(ops.counter.created - ops.counter.deleted).toBe(0);
      if (name === "synthetic-clean") {
        for (const id of MAIN) expect(r.lines.find((l) => l.id === id)?.confidence ?? 0).toBeGreaterThanOrEqual(0.8);
      } else {
        expect(r.suggestTrace).toBe(true);
      }
    }
  });

  it.skipIf(!cv)("the delta stays 0 when a step throws mid-way", () => {
    if (!cv) return;
    const ops = makeCvOps(cv);
    // a 3 × 3 image cannot be warped by a singular matrix; whatever cv does, nothing may leak
    try {
      ops.warp?.({ data: new Uint8ClampedArray(36), width: 3, height: 3 }, [0, 0, 0, 0, 0, 0, 0, 0, 0], 4);
    } catch {
      // expected on some builds
    }
    try {
      ops.enhanceGrey?.(new Uint8Array(4), 8, 8); // data shorter than the Mat: set() throws
    } catch {
      // expected
    }
    expect(ops.counter.created - ops.counter.deleted).toBe(0);
  });
});
