import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GLOSSARY, glossary } from "./glossary";

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return sources(p);
    return /\.tsx?$/.test(n) && !/\.test\./.test(n) ? [p] : [];
  });
}

describe("plain-English glossary", () => {
  it("has unique ids and fills every field a reader sees", () => {
    const ids = GLOSSARY.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const g of GLOSSARY) {
      expect(g.plain.length, g.id).toBeGreaterThan(2);
      expect(g.plain.split(" ").length, `${g.id} plain should be a few words`).toBeLessThanOrEqual(6);
      expect(g.short.length, g.id).toBeGreaterThan(20);
      expect(g.long.length, g.id).toBeGreaterThan(40);
    }
  });

  it("every ⓘ and explain= in the app points at a real entry", () => {
    const used = new Set<string>();
    for (const f of sources("src/features").concat(sources("src/components"), sources("src/app"))) {
      const text = readFileSync(f, "utf8");
      for (const m of text.matchAll(/(?:InfoDot id|explain)="([a-z-]+)"/g)) used.add(m[1] ?? "");
      for (const m of text.matchAll(/:\s*\["[^"]*", "([a-z-]+)"\]/g)) used.add(m[1] ?? "");
    }
    expect(used.size).toBeGreaterThan(15);
    const missing = [...used].filter((id) => !glossary(id));
    expect(missing).toEqual([]);
  });
});
