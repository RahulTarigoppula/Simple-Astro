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

const PALETTE = ["src/styles/tokens.css", "src/styles/astral.css"];
const files = walk("src").filter((f) => !PALETTE.some((p) => f.split(String.fromCharCode(92)).join("/").endsWith(p)));

describe("design rules", () => {
  it("no hex colour lives outside the palette files", () => {
    const hits: string[] = [];
    for (const f of files) {
      readFileSync(f, "utf8")
        .split("\n")
        .forEach((line, i) => {
          const hex = /(^|[^&\w/])#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?(?:[0-9a-fA-F]{2})?\b/;
          const isRoute = line.includes('"#/') || line.includes("'#/") || line.includes(`${String.fromCharCode(96)}#/`);
          if (hex.test(line) && !isRoute) hits.push(`${f}:${i + 1}: ${line.trim()}`);
        });
    }
    expect(hits).toEqual([]);
  });

  it("no gradient-filled text (it fails contrast checks)", () => {
    const hits = files.filter((f) => /background-clip:\s*text/.test(readFileSync(f, "utf8")));
    expect(hits).toEqual([]);
  });

  it("Math.random is never used", () => {
    const hits = files.filter((f) => /Math\.random\(/.test(readFileSync(f, "utf8")));
    expect(hits).toEqual([]);
  });
});
