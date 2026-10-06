#!/usr/bin/env node
// Copies the MediaPipe Tasks Vision wasm runtime into public/mediapipe/ so it is served from our
// own origin (offline, CSP 'self'). Idempotent: a file is rewritten only when its size or bytes
// differ. Runs as npm "prebuild"; safe to run by hand any time.
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const dst = join(root, "public", "mediapipe");

if (!existsSync(src)) {
  console.error(`copy-mediapipe: ${src} is missing — run npm ci first.`);
  process.exit(1);
}
mkdirSync(dst, { recursive: true });

const digest = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

let copied = 0;
let kept = 0;
// FilesetResolver.forVisionTasks(base) (no ES-module flag) loads vision_wasm_internal.* or, on
// engines without wasm SIMD, vision_wasm_nosimd_internal.*. The *_module_internal pair is only for
// the ES-module loader we never use — skipping it keeps 12 MB out of the APK.
const SKIP = /_module_internal\./;
for (const name of readdirSync(dst)) if (SKIP.test(name)) rmSync(join(dst, name));
for (const name of readdirSync(src)) {
  if (SKIP.test(name)) continue;
  const from = join(src, name);
  if (!statSync(from).isFile()) continue;
  const to = join(dst, name);
  if (existsSync(to) && statSync(to).size === statSync(from).size && digest(to) === digest(from)) {
    kept++;
    continue;
  }
  copyFileSync(from, to);
  copied++;
}
console.log(`copy-mediapipe: ${copied} copied, ${kept} already current → public/mediapipe/`);
