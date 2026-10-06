// GOAL success criterion 5 — the PyJHora oracle. Walks all 11 664 nakshatra-pada pairs of
// all_nak_pad_boy_girl.csv (imported to ashtakoota-oracle.bin by scripts/import-oracle.mjs) and
// compares every koota.
//
// Agreement contract:
//   • Varṇa, Yoni, Graha Maitrī, Gaṇa, Nāḍī — identical on every pair.
//   • Vaśya — the 5×5 table is identical on every pair once PyJHora's own class assignment is used;
//     Chowki's class assignment differs only in Dhanu/Makara (split at 15°, not by pada number).
//   • Tārā — PyJHora's column equals exactly 3 − Chowki's (it scores the unkind tārās; see ashtakoota.ts).
//   • Bhakūṭa — identical except PyJHora's Karka × Kumbha cell (7 where every 6/8 axis is 0).
// With those three documented PyJHora defects modelled, the TOTAL agrees on 11 664 / 11 664 pairs.
// Any other disagreement fails, listing the first ten by nakshatra-pada name.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { VASHYA, type VashyaClass, vashyaClass } from "../data/tables/koota";
import { NAKSHATRA_NAMES } from "../data/tables/names";
import { ashtakoota, kootas, type MoonPlacement, signOfPada } from "./ashtakoota";
import type { KootaId } from "./types";

const CODES = {
  vashya: [0, 0.5, 1, 2],
  tara: [0, 1.5, 3],
  maitri: [0, 0.5, 1, 3, 4, 5],
  gana: [0, 1, 5, 6],
} as const;

type Row = Record<KootaId, number> & { total: number };

function loadOracle(): Row[] {
  const buf = readFileSync(new URL("./__fixtures__/ashtakoota-oracle.bin", import.meta.url));
  if (buf.toString("ascii", 0, 4) !== "AKO1") throw new Error("bad oracle magic");
  const rows: Row[] = [];
  for (let i = 0; i < 11664; i++) {
    const r = buf.readUInt16LE(4 + 2 * i);
    const row = {
      varna: r & 1,
      vashya: CODES.vashya[(r >> 1) & 3] ?? Number.NaN,
      tara: CODES.tara[(r >> 3) & 3] ?? Number.NaN,
      yoni: (r >> 5) & 7,
      maitri: CODES.maitri[(r >> 8) & 7] ?? Number.NaN,
      gana: CODES.gana[(r >> 11) & 3] ?? Number.NaN,
      bhakoot: (r >> 13) & 1 ? 7 : 0,
      nadi: (r >> 14) & 1 ? 8 : 0,
      total: 0,
    };
    row.total = row.varna + row.vashya + row.tara + row.yoni + row.maitri + row.gana + row.bhakoot + row.nadi;
    rows.push(row);
  }
  return rows;
}

const moonOfPada = (idx: number): MoonPlacement => {
  const nak = Math.floor(idx / 4);
  const pada = ((idx % 4) + 1) as 1 | 2 | 3 | 4;
  return { nak, pada, sign: signOfPada(nak, pada) };
};

const label = (m: MoonPlacement): string => `${NAKSHATRA_NAMES[m.nak] ?? m.nak} ${m.pada}`;

/** PyJHora's Vaśya class: Dhanu and Makara split by pada number (1–2 | 3–4), whatever the nakshatra. */
function pyjhoraVashyaClass(m: MoonPlacement): VashyaClass {
  if (m.sign === 8) return m.pada <= 2 ? "manava" : "chatushpada";
  if (m.sign === 9) return m.pada <= 2 ? "chatushpada" : "jalachara";
  return vashyaClass(m.sign, 0);
}

describe("Aṣṭakūṭa vs the PyJHora oracle (all_nak_pad_boy_girl.csv)", () => {
  const oracle = loadOracle();

  it("agrees on all 11 664 pairs, koota by koota, with the three PyJHora defects modelled", { timeout: 2000 }, () => {
    const mismatches: string[] = [];
    let rawTotalAgree = 0;
    let modelledTotalAgree = 0;
    const deviations = { tara: 0, bhakoot: 0, vashyaClass: 0 };
    for (let bi = 0; bi < 108; bi++) {
      const a = moonOfPada(bi);
      for (let gi = 0; gi < 108; gi++) {
        const b = moonOfPada(gi);
        const o = oracle[bi * 108 + gi];
        if (!o) throw new Error("oracle row missing");
        const ks = kootas(a, b);
        const ours = Object.fromEntries(ks.map((k) => [k.id, k.score])) as Record<KootaId, number>;
        const total = ks.reduce((s, k) => s + k.score, 0);
        if (total === o.total) rawTotalAgree++;

        // Model PyJHora from our numbers.
        const model: Record<KootaId, number> = { ...ours };
        model.tara = 3 - ours.tara;
        if (model.tara !== ours.tara) deviations.tara++;
        if (a.sign === 3 && b.sign === 10) {
          model.bhakoot = 7; // PyJHora's Karka × Kumbha cell
          deviations.bhakoot++;
        }
        const pa = pyjhoraVashyaClass(a);
        const pb = pyjhoraVashyaClass(b);
        model.vashya = VASHYA[pa][pb];
        if (model.vashya !== ours.vashya) deviations.vashyaClass++;

        const bad = (Object.keys(model) as KootaId[]).filter((k) => model[k] !== o[k]);
        const modelTotal = Object.values(model).reduce((s, v) => s + v, 0);
        if (bad.length === 0 && modelTotal === o.total) modelledTotalAgree++;
        else if (mismatches.length < 10) {
          mismatches.push(
            `${label(a)} × ${label(b)}: ${bad.map((k) => `${k} ours ${ours[k]} (modelled ${model[k]}) vs oracle ${o[k]}`).join("; ")}`,
          );
        }
      }
    }
    expect(mismatches, mismatches.join("\n")).toEqual([]);
    expect(modelledTotalAgree).toBe(11664);
    // Pinned so any table change is noticed: raw total agreement and the size of each deviation.
    expect({ rawTotalAgree, ...deviations }).toMatchInlineSnapshot(`
      {
        "bhakoot": 81,
        "rawTotalAgree": 6436,
        "tara": 3888,
        "vashyaClass": 1830,
      }
    `);
  });

  it("the §6.11 showcase pair agrees exactly: Revatī × Rohiṇī = 19, acceptable", () => {
    const a: MoonPlacement = { nak: 26, pada: 1, sign: 11 };
    const b: MoonPlacement = { nak: 3, pada: 1, sign: 1 };
    const o = oracle[(26 * 4) * 108 + 3 * 4];
    const r = ashtakoota("a", "b", a, b, "x");
    expect(o?.total).toBe(19);
    expect(r.total).toBe(19);
    expect(r.band).toBe("acceptable");
  });

  it("every Vaśya table cell is pinned by the oracle", () => {
    const seen = new Map<string, number>();
    for (let bi = 0; bi < 108; bi++) {
      for (let gi = 0; gi < 108; gi++) {
        const key = `${pyjhoraVashyaClass(moonOfPada(bi))}|${pyjhoraVashyaClass(moonOfPada(gi))}`;
        const v = oracle[bi * 108 + gi]?.vashya ?? Number.NaN;
        const prev = seen.get(key);
        if (prev !== undefined) expect(v).toBe(prev);
        seen.set(key, v);
      }
    }
    expect(seen.size).toBe(25);
    for (const [key, v] of seen) {
      const [x, y] = key.split("|") as [VashyaClass, VashyaClass];
      expect(VASHYA[x][y], key).toBe(v);
    }
  });
});
