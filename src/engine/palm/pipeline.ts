// Stages [3]–[6] as one pure function: (ImageData-like, landmarks, settings) → print + lines.
// Byte-identical on repeat. The worker swaps in OpenCV for the warp, the enhancement and the
// closing via `ops`; everything else (ridge, NMS, hysteresis, thinning, labelling) is shared TS.
import type { Landmark, PalmLine, PalmLineId } from "../types";
import { enhanceGrey as enhanceGreyTs, luma8, maskEnhanced } from "./enhance";
import type { ImageLike } from "./image";
import { components, labelLines, LOW_CONFIDENCE, MAIN_LINES, toPalmLine, type Candidate } from "./label";
import { homographyFromLandmarks, type Mat3, PRINT_SIZE, warpPerspective } from "./rectify";
import { close3x3, ridgeMask } from "./ridge";
import { zhangSuenStats } from "./thin";

export interface PalmSettings {
  /** The hand in the photo (the owner's toggle). Recorded; the homography handles the mirroring. */
  hand: "right" | "left";
}

/** Swappable implementations of the OpenCV-shaped steps. Defaults are the pure-TS ones. */
export interface PalmOps {
  warp?: (img: ImageLike, H: Mat3, size: number) => ImageLike;
  enhanceGrey?: (grey: Uint8Array, w: number, h: number) => { blackHat: Float32Array; blurred: Float32Array };
  close?: (m: Uint8Array, w: number, h: number) => Uint8Array;
}

export interface PipelineResult {
  ok: true;
  /** original-pixel → canonical-512, row-major 3 × 3 */
  homography: number[];
  /** the rectified 512 × 512 RGBA print */
  print: ImageLike;
  lines: PalmLine[];
  /** true when any of heart/head/life is missing or below 0.6 — hand over the stylus */
  suggestTrace: boolean;
  /** every labelled candidate, including a sub-threshold fate line, for diagnostics */
  candidates: Candidate[];
  stats: { components: number; thinIterations: number; p99: number };
}

export type PipelineOutcome = PipelineResult | { ok: false; reason: "degenerate" };

export function runPalmPipeline(
  img: ImageLike,
  landmarks: readonly Landmark[],
  _settings: PalmSettings,
  ops: PalmOps = {},
): PipelineOutcome {
  const H = homographyFromLandmarks(landmarks, img.width, img.height);
  if (!H) return { ok: false, reason: "degenerate" };
  const print = (ops.warp ?? warpPerspective)(img, H, PRINT_SIZE);
  const { width: w, height: h } = print;
  const grey = luma8(print);
  const { blackHat, blurred } = (ops.enhanceGrey ?? enhanceGreyTs)(grey, w, h);
  const enh = maskEnhanced(print, grey, blackHat, blurred);
  const rm = ridgeMask(enh.ridgeInput, w, h, { close: ops.close ?? close3x3 });
  const thin = zhangSuenStats(Uint8Array.from(rm.mask), w, h);
  const comps = components(thin.mask, w, h);
  const candidates = labelLines({ skeleton: thin.mask, mask: rm.mask, blackHat: enh.blackHat, ridge: rm.response, width: w, height: h }, comps);
  // the fate line is optional: it is only shown when it is actually seen
  const lines = candidates.filter((c) => c.id !== "fate" || c.confidence >= LOW_CONFIDENCE).map(toPalmLine);
  return {
    ok: true,
    homography: [...H],
    print,
    lines,
    suggestTrace: needsTrace(lines),
    candidates,
    stats: { components: comps.length, thinIterations: thin.iterations, p99: rm.p99 },
  };
}

/** The stylus is offered when any main line is missing or below the confidence floor. */
export function needsTrace(lines: readonly PalmLine[]): boolean {
  return MAIN_LINES.some((id: PalmLineId) => {
    const l = lines.find((x) => x.id === id);
    return !l || l.confidence < LOW_CONFIDENCE;
  });
}
