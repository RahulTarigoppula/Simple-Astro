#!/usr/bin/env node
// Blocking bundle gate: nothing forbidden reached dist/, the entry stays within budget, and the
// Android build carries no service worker.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const DIST = "dist";
if (!existsSync(DIST)) {
  console.error("check-bundle: dist/ does not exist — run the build first");
  process.exit(1);
}
const files = [];
const walk = (d) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else files.push(p);
  }
};
walk(DIST);
const errors = [];
// Code patterns, not credit lines: the colophon may name the oracles, the bundle may not import them.
const FORBIDDEN = [
  /(?:require\(|import\(|from)\s*["']@ishubhamx\/panchangam/,
  /(?:require\(|import\(|from)\s*["'][^"']*swisseph/,
  /\bswe_calc(?:_ut)?\(/,
  /require\(["']fs["']\)/,
  /gtag\(|google-analytics\.com|@sentry\/|posthog|plausible\.io|sendBeacon\(/,
];
for (const f of files.filter((x) => x.endsWith(".js") && !x.includes(`${join(DIST, "mediapipe")}`))) {
  const src = readFileSync(f, "utf8");
  for (const re of FORBIDDEN) if (re.test(src) && !/opencv|cv-/.test(f)) errors.push(`${f} matches ${re}`);
}

// Initial JS = index.html's module entry plus its static imports (modulepreload links).
const html = readFileSync(join(DIST, "index.html"), "utf8");
const entry = [...html.matchAll(/(?:src|href)="[^"]*?(assets\/[^"]+\.js)"/g)].map((m) => m[1]);
let gz = 0;
for (const e of new Set(entry)) gz += gzipSync(readFileSync(join(DIST, e))).length;
const css = [...html.matchAll(/href="[^"]*?(assets\/[^"]+\.css)"/g)].map((m) => m[1]);
let cssGz = 0;
for (const c of new Set(css)) cssGz += gzipSync(readFileSync(join(DIST, c))).length;
console.log(
  `check-bundle: initial JS ${(gz / 1024).toFixed(1)} kB gz across ${new Set(entry).size} file(s); CSS ${(cssGz / 1024).toFixed(1)} kB gz`,
);
if (gz > 350 * 1024) errors.push(`initial JS ${(gz / 1024).toFixed(1)} kB gz exceeds 350 kB`);
if (cssGz > 30 * 1024) errors.push(`initial CSS ${(cssGz / 1024).toFixed(1)} kB gz exceeds 30 kB`);
for (const e of entry) {
  const src = readFileSync(join(DIST, e), "utf8");
  if (/HandLandmarker|cv\.Mat|WebGLRenderer/.test(src))
    errors.push(`${e}: a lazy-only module (MediaPipe/OpenCV/three) leaked into the entry graph`);
}
if (process.env.VITE_PLATFORM === "android" && existsSync(join(DIST, "sw.js"))) errors.push("android build contains sw.js");

if (errors.length) {
  console.error(`check-bundle: ${errors.length} problem(s)\n  ${errors.join("\n  ")}`);
  process.exit(1);
}
console.log("check-bundle: clean.");
