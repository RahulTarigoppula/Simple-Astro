#!/usr/bin/env node
// Blocking privacy gate (§2.3.7): no real palm photo may ever enter the repo. Fails on any tracked
// JPEG/HEIC, any PNG over 200 kB, or any EXIF Make/GPS marker under src/, e2e/ or docs/.
import { execSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";

const tracked = execSync("git ls-files", { encoding: "utf8" }).split("\n").filter(Boolean);
const errors = [];
for (const f of tracked) {
  const lower = f.toLowerCase();
  if (lower.startsWith("fixtures-private/")) errors.push(`${f}: fixtures-private/ must never be tracked`);
  if (/\.(jpe?g|heic|heif)$/.test(lower)) errors.push(`${f}: photographs are never committed`);
  if (lower.endsWith(".png") && !lower.startsWith("e2e/visual/__screenshots__/") && !lower.startsWith("public/") && !lower.startsWith("android/")) {
    const size = statSync(f).size;
    if (size > 200 * 1024) errors.push(`${f}: PNG is ${(size / 1024).toFixed(0)} kB (> 200 kB)`);
  }
  if (/^(src|e2e|docs)\//.test(f) && /\.(png|webp|tiff?|jpe?g)$/.test(lower)) {
    const buf = readFileSync(f);
    if (buf.includes(Buffer.from("Exif")) && (buf.includes(Buffer.from("GPS")) || buf.includes(Buffer.from("Make")))) errors.push(`${f}: carries EXIF Make/GPS`);
  }
}
if (errors.length) {
  console.error(`check-no-biometrics: ${errors.length} problem(s)\n  ${errors.join("\n  ")}`);
  process.exit(1);
}
console.log(`check-no-biometrics: ${tracked.length} tracked files, no photographs, no EXIF.`);
