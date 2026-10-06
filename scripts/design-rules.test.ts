// Design rules that are tests, not opinions (IMPLEMENTATION-PROMPT §3.2–§3.3, §10.6 VT-3).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) {
      if (f === "__fixtures__" || f === "node_modules") continue;
      walk(p, out);
    } else if (/\.(tsx?|css)$/.test(f) && !/\.test\.tsx?$/.test(f)) out.push(p);
  }
  return out;
}

const files = walk("src").filter((f) => !f.split(String.fromCharCode(92)).join("/").endsWith("src/styles/tokens.css"));

describe("design rules", () => {
  it("no hex colour lives outside tokens.css", () => {
    const hits: string[] = [];
    for (const f of files) {
      readFileSync(f, "utf8")
        .split("\n")
        .forEach((line, i) => {
          const hex = new RegExp("(^|[^&\\w/])#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?(?:[0-9a-fA-F]{2})?\\b");
          const isRoute = line.includes('"#/') || line.includes("'#/") || line.includes(`${String.fromCharCode(96)}#/`);
          if (hex.test(line) && !isRoute) hits.push(`${f}:${i + 1}: ${line.trim()}`);
        });
    }
    expect(hits).toEqual([]);
  });

  it("no forbidden material: backdrop-filter, blur(), text-shadow, gradient text", () => {
    const hits: string[] = [];
    for (const f of files.filter((x) => x.endsWith(".css") || x.endsWith(".tsx"))) {
      const src = readFileSync(f, "utf8");
      for (const re of [/backdrop-filter/, /filter:\s*blur\(/, /text-shadow\s*:/, /background-clip:\s*text/]) if (re.test(src)) hits.push(`${f}: ${re}`);
    }
    expect(hits).toEqual([]);
  });

  it("Math.random is never used", () => {
    const hits = files.filter((f) => /Math\.random\(/.test(readFileSync(f, "utf8")));
    expect(hits).toEqual([]);
  });
});
