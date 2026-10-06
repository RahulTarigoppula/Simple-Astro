#!/usr/bin/env node
// Blocking licence gate (IMPLEMENTATION-PROMPT §2.2, §10.3, §11.12):
//  - every installed production dependency carries an allowed licence,
//  - no banned package name appears anywhere in package.json,
//  - README.md has an Attribution section and LICENSE is MIT.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ALLOWED = /^(MIT|ISC|Apache-2\.0|BSD-2-Clause|BSD-3-Clause|0BSD|MPL-2\.0|Unlicense|CC0-1\.0|OFL-1\.1|BlueOak-1\.0\.0|CC-BY-4\.0|Python-2\.0)$/i;
const BANNED = ["@kuntay/swisseph", "@swisseph/browser", "swisseph-wasm", "sweph-wasm", "@fusionstrings/swisseph-wasm", "swisseph", "pyswisseph", "PyJHora", "gsap", "rita"];
const errors = [];
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const all = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.optionalDependencies };
for (const name of Object.keys(all)) if (BANNED.includes(name)) errors.push(`banned package in package.json: ${name}`);
if (pkg.dependencies?.["@ishubhamx/panchangam-js"]) errors.push("@ishubhamx/panchangam-js must be a devDependency only");

function licenceOf(dir) {
  const p = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  const l = typeof p.license === "string" ? p.license : p.license?.type ?? (Array.isArray(p.licenses) ? p.licenses.map((x) => x.type).join(" OR ") : "");
  let licence = l;
  if (!licence) {
    // Some packages ship only a LICENSE file; read its first line.
    const f = readdirSync(dir).find((x) => /^licen[cs]e/i.test(x));
    const head = f ? readFileSync(join(dir, f), "utf8").slice(0, 200) : "";
    if (/^\s*MIT License/i.test(head)) licence = "MIT";
    else if (/Apache License/i.test(head)) licence = "Apache-2.0";
    else if (/ISC License/i.test(head)) licence = "ISC";
  }
  return { name: p.name, version: p.version, licence, deps: Object.keys(p.dependencies ?? {}) };
}
function okExpr(expr) {
  if (!expr) return false;
  const clean = expr.replace(/[()]/g, "");
  if (/ OR /i.test(clean)) return clean.split(/ OR /i).some((x) => ALLOWED.test(x.trim()));
  return clean.split(/ AND /i).every((x) => ALLOWED.test(x.trim()));
}

// Walk the production dependency closure only (devDependencies are build tools, never shipped).
const seen = new Set();
const queue = Object.keys(pkg.dependencies ?? {});
while (queue.length) {
  const name = queue.shift();
  if (seen.has(name)) continue;
  seen.add(name);
  const dir = join("node_modules", name);
  if (!existsSync(join(dir, "package.json"))) continue;
  const info = licenceOf(dir);
  if (!okExpr(info.licence)) errors.push(`${info.name}@${info.version}: licence "${info.licence || "none"}" is not on the allow-list`);
  queue.push(...info.deps);
}

const readme = readFileSync("README.md", "utf8");
if (!/^#{1,3} Attribution/m.test(readme)) errors.push("README.md has no Attribution section");
if (!/^MIT License/m.test(readFileSync("LICENSE", "utf8"))) errors.push("LICENSE is not MIT");

if (errors.length) {
  console.error(`check-licences: ${errors.length} problem(s)\n  ${errors.join("\n  ")}`);
  process.exit(1);
}
console.log(`check-licences: ${seen.size} production packages, all on the allow-list; no banned names.`);
