// §10.1: nothing in src/engine reads the clock or Math.random. Greps every non-test source file.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd(), "src", "engine");

function sources(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === "__fixtures__" || name === "__oracle__") continue;
      out.push(...sources(p));
    } else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

/** Blank out comments (keeping line numbers) so prose such as "never uses Math.random" is not a hit. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

const BANNED: Array<[string, RegExp]> = [
  ["Date.now", /\bDate\s*\.\s*now\b/],
  ["Math.random", /\bMath\s*\.\s*random\b/],
  ["zero-argument new Date()", /\bnew\s+Date\s*\(\s*\)/],
];

describe("determinism (§10.1)", () => {
  it("src/engine never reads the clock or Math.random", () => {
    const files = sources(ROOT);
    expect(files.length).toBeGreaterThan(10);
    const hits: string[] = [];
    for (const f of files) {
      const lines = stripComments(readFileSync(f, "utf8")).split(/\r?\n/);
      lines.forEach((line, i) => {
        for (const [label, re] of BANNED) {
          if (re.test(line)) hits.push(`${relative(process.cwd(), f)}:${i + 1} uses ${label}: ${line.trim()}`);
        }
      });
    }
    expect(hits, hits.join("\n")).toEqual([]);
  });

  it("src/engine imports nothing from React, the DOM stores, Dexie, Zustand or Capacitor", () => {
    const hits: string[] = [];
    const re = /from\s+["'](react|react-dom|dexie|dexie-react-hooks|zustand|@capacitor\/[^"']+)["']/;
    for (const f of sources(ROOT)) {
      const src = readFileSync(f, "utf8");
      const m = re.exec(src);
      if (m) hits.push(`${relative(process.cwd(), f)} imports ${m[1]}`);
    }
    expect(hits, hits.join(" | ")).toEqual([]);
  });
});
