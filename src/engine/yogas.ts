// Yogas as predicates (IMPLEMENTATION-PROMPT §6.10). Each rule is a small pure function plus a
// citation; no yoga is ever a string inside a UI component. runYogas() evaluates every rule, then a
// second pass rewrites any hit named in a fired rule's `cancels` list to strength 'cancelled'.
// Houses are whole-sign from the Lagna (the chart is always whole-sign).
import {
  EXALTATION_SIGN,
  isDebilitated,
  isExalted,
  isOwnSign,
  NATURAL_BENEFICS,
  NATURAL_MALEFICS,
  SEVEN,
  type SevenId,
  TARA_GRAHAS,
} from "../data/tables/rulership";
import {
  aspects,
  DUSTHANA,
  gName,
  houseFrom,
  joinNames,
  KENDRA,
  lordOfHouse,
  ord,
  signLord,
  signName,
  signOfHouse,
} from "./chart-helpers";
import { CITE } from "./citations";
import { MANGLIK_CANCELLATIONS, MANGLIK_REF_LABEL, manglikChartCancellations, manglikReferences } from "./manglik";
import { norm360, signedDelta } from "./math";
import { renderTemplate, type TemplateValues } from "./reading";
import type { Citation, Graha, GrahaId, PatriCore, SignIdx, YogaEvidence, YogaHit } from "./types";

export const YOGA_RULES_VERSION = 1;

/** What a rule sees: the chart plus short handles. */
export interface PatriContext {
  core: PatriCore;
  g: Record<GrahaId, Graha>;
  lagna: SignIdx;
}

/** A rule's verdict before the cancellation pass; `values` fill its reading template. */
export interface RuleOutcome {
  strength: "full" | "partial";
  because: YogaEvidence[];
  values: TemplateValues;
}

export interface YogaRule {
  id: string;
  name: string;
  nameDev: string;
  citation: Citation;
  test(p: PatriContext): RuleOutcome | null;
  cancels?: string[]; // ids this rule downgrades when both fire
}

// ─── shared predicates ───────────────────────────────────────────────────────

const inHouseFrom = (p: PatriContext, from: SignIdx, house: number, ids: readonly GrahaId[]): GrahaId[] =>
  ids.filter((id) => houseFrom(from, p.g[id].sign) === house);

/** Kemadruma's own condition: no tārā-graha in the 2nd or 12th from Candra. */
function kemadrumaHolds(p: PatriContext): boolean {
  const mo = p.g.MO.sign;
  return inHouseFrom(p, mo, 2, TARA_GRAHAS).length === 0 && inHouseFrom(p, mo, 12, TARA_GRAHAS).length === 0;
}

const AXIS_ORB_DEG = 1;

export interface KalaSarpaCheck {
  hemmed: boolean;
  direction: "rahu-to-ketu" | "ketu-to-rahu" | null;
  onAxis: GrahaId[];
  note: string | null;
}

/**
 * Are all seven grahas on one side of the Rāhu–Ketu axis? A graha within 1° of either node sits
 * on the axis: it is not counted as hemmed in, so the yoga does not fire, and the check carries a
 * "near boundary" note saying so.
 */
export function kalaSarpaCheck(core: PatriCore): KalaSarpaCheck {
  const ra = core.grahas.RA.lonSidereal;
  const onAxis: GrahaId[] = [];
  let forward = 0;
  let backward = 0;
  for (const id of SEVEN) {
    const d = norm360(core.grahas[id].lonSidereal - ra);
    const toAxis = Math.min(d, Math.abs(d - 180), 360 - d);
    if (toAxis < AXIS_ORB_DEG) onAxis.push(id);
    else if (d < 180) forward++;
    else backward++;
  }
  const others = SEVEN.length - onAxis.length;
  const oneSide = forward === others ? "rahu-to-ketu" : backward === others ? "ketu-to-rahu" : null;
  if (onAxis.length > 0) {
    const note =
      oneSide !== null
        ? `near boundary: ${joinNames(onAxis)} on the Rāhu–Ketu axis (within ${AXIS_ORB_DEG}°), so Kāla-Sarpa is not counted`
        : null;
    return { hemmed: false, direction: null, onAxis, note };
  }
  return { hemmed: oneSide !== null, direction: oneSide, onAxis, note: null };
}

// ─── the rules ───────────────────────────────────────────────────────────────

export const gajaKesari: YogaRule = {
  id: "gaja-kesari",
  name: "Gaja-Kesari",
  nameDev: "गजकेसरी",
  citation: CITE.bphs36,
  test(p) {
    const fromMoon = houseFrom(p.g.MO.sign, p.g.JU.sign);
    if (!KENDRA.includes(fromMoon)) return null;
    const weak = p.g.JU.dignity === "debilitated" || p.g.JU.combust;
    const because: YogaEvidence[] = [
      { grahaId: "JU", house: fromMoon, note: `Guru in the ${ord(fromMoon)} from Candra` },
      { grahaId: "MO", sign: p.g.MO.sign, note: `Candra in ${signName(p.g.MO.sign)}` },
    ];
    if (weak) {
      because.push({
        grahaId: "JU",
        sign: p.g.JU.sign,
        note: p.g.JU.combust ? "Guru is combust, so the yoga is read as partial" : "Guru is debilitated, so the yoga is read as partial",
      });
    }
    return {
      strength: weak ? "partial" : "full",
      because,
      values: { house: ord(fromMoon), moonSign: signName(p.g.MO.sign) },
    };
  },
};

export const budhaAditya: YogaRule = {
  id: "budha-aditya",
  name: "Budha-Āditya",
  nameDev: "बुधादित्य",
  citation: CITE.saravali15,
  test(p) {
    if (p.g.SU.sign !== p.g.ME.sign) return null;
    const sep = Math.abs(signedDelta(p.g.SU.lonSidereal, p.g.ME.lonSidereal));
    const because: YogaEvidence[] = [
      { grahaId: "SU", sign: p.g.SU.sign, note: `Sūrya in ${signName(p.g.SU.sign)}` },
      { grahaId: "ME", sign: p.g.ME.sign, note: `Budha in ${signName(p.g.ME.sign)}, ${sep.toFixed(1)}° from Sūrya` },
    ];
    // Budha is seldom more than 28° from Sūrya, so the pairing is common; combustion (within 14°,
    // 12° when retrograde) weakens it — though some authors exempt Budha from combustion altogether.
    if (p.g.ME.combust) {
      because.push({
        grahaId: "ME",
        note: "Budha is combust, so the yoga is read as partial (some authors exempt Budha from combustion)",
      });
    }
    return { strength: p.g.ME.combust ? "partial" : "full", because, values: { sign: signName(p.g.SU.sign) } };
  },
};

export const candraMangala: YogaRule = {
  id: "candra-mangala",
  name: "Candra-Maṅgala",
  nameDev: "चन्द्र-मंगल",
  citation: CITE.saravali15,
  test(p) {
    const h = houseFrom(p.g.MO.sign, p.g.MA.sign);
    if (h !== 1 && h !== 7) return null;
    const together = h === 1;
    return {
      strength: together ? "full" : "partial",
      because: [
        { grahaId: "MO", sign: p.g.MO.sign, note: `Candra in ${signName(p.g.MO.sign)}` },
        {
          grahaId: "MA",
          sign: p.g.MA.sign,
          note: together ? `Maṅgala joins Candra in ${signName(p.g.MA.sign)}` : `Maṅgala opposite Candra, in ${signName(p.g.MA.sign)}`,
        },
      ],
      values: { relation: together ? "together" : "facing each other", sign: signName(p.g.MO.sign) },
    };
  },
};

function mahapurusha(id: string, name: string, nameDev: string, graha: SevenId): YogaRule {
  return {
    id,
    name,
    nameDev,
    citation: CITE.phaladipika6_1,
    test(p) {
      const gr = p.g[graha];
      const exalted = isExalted(graha, gr.sign);
      if (!exalted && !isOwnSign(graha, gr.sign)) return null;
      const house = houseFrom(p.lagna, gr.sign);
      if (!KENDRA.includes(house)) return null;
      const dignity = exalted ? "exaltation" : "its own sign";
      const because: YogaEvidence[] = [
        { grahaId: graha, sign: gr.sign, note: `${gName(graha)} in ${signName(gr.sign)}, ${dignity}` },
        { grahaId: graha, house, note: `${gName(graha)} in the ${ord(house)} house, a kendra from the Lagna` },
      ];
      if (gr.combust) because.push({ grahaId: graha, note: `${gName(graha)} is combust, so the yoga is read as partial` });
      return {
        strength: gr.combust ? "partial" : "full",
        because,
        values: { dignity, sign: signName(gr.sign), house: ord(house) },
      };
    },
  };
}

export const rucaka = mahapurusha("rucaka", "Rucaka", "रुचक", "MA");
export const bhadra = mahapurusha("bhadra", "Bhadra", "भद्र", "ME");
export const hamsa = mahapurusha("hamsa", "Haṃsa", "हंस", "JU");
export const malavya = mahapurusha("malavya", "Mālavya", "मालव्य", "VE");
export const sasa = mahapurusha("sasa", "Śaśa", "शश", "SA");

export const kemadruma: YogaRule = {
  id: "kemadruma",
  name: "Kemadruma",
  nameDev: "केमद्रुम",
  citation: CITE.bphs37,
  test(p) {
    if (!kemadrumaHolds(p)) return null;
    const mo = p.g.MO.sign;
    return {
      strength: "full",
      because: [
        { grahaId: "MO", sign: mo, note: `Candra in ${signName(mo)}` },
        { house: 2, sign: signOfHouse(mo, 2), note: "no graha but Sūrya or the nodes in the 2nd from Candra" },
        { house: 12, sign: signOfHouse(mo, 12), note: "no graha but Sūrya or the nodes in the 12th from Candra" },
      ],
      values: { moonSign: signName(mo) },
    };
  },
};

function kemadrumaBhanga(
  id: string,
  name: string,
  find: (p: PatriContext) => { grahas: GrahaId[]; because: YogaEvidence[]; values?: TemplateValues } | null,
): YogaRule {
  return {
    id,
    name,
    nameDev: "केमद्रुम भंग",
    citation: CITE.phaladipika6,
    cancels: ["kemadruma"],
    test(p) {
      if (!kemadrumaHolds(p)) return null;
      const f = find(p);
      if (!f || f.grahas.length === 0) return null;
      return { strength: "full", because: f.because, values: { grahas: joinNames(f.grahas), ...(f.values ?? {}) } };
    },
  };
}

export const kemadrumaBhangaKendraLagna = kemadrumaBhanga(
  "kemadruma-bhanga-kendra-lagna",
  "Kemadruma-bhaṅga (kendra from Lagna)",
  (p) => {
    const gs = TARA_GRAHAS.filter((id) => KENDRA.includes(houseFrom(p.lagna, p.g[id].sign)));
    return {
      grahas: gs,
      because: gs.map((id) => ({
        grahaId: id,
        house: houseFrom(p.lagna, p.g[id].sign),
        note: `${gName(id)} in the ${ord(houseFrom(p.lagna, p.g[id].sign))} from the Lagna, a kendra`,
      })),
    };
  },
);

export const kemadrumaBhangaKendraMoon = kemadrumaBhanga(
  "kemadruma-bhanga-kendra-moon",
  "Kemadruma-bhaṅga (kendra from Candra)",
  (p) => {
    const gs = TARA_GRAHAS.filter((id) => [4, 7, 10].includes(houseFrom(p.g.MO.sign, p.g[id].sign)));
    return {
      grahas: gs,
      because: gs.map((id) => ({
        grahaId: id,
        house: houseFrom(p.g.MO.sign, p.g[id].sign),
        note: `${gName(id)} in the ${ord(houseFrom(p.g.MO.sign, p.g[id].sign))} from Candra, a kendra`,
      })),
    };
  },
);

export const kemadrumaBhangaConjunct = kemadrumaBhanga(
  "kemadruma-bhanga-conjunct",
  "Kemadruma-bhaṅga (graha with Candra)",
  (p) => {
    const gs = TARA_GRAHAS.filter((id) => p.g[id].sign === p.g.MO.sign);
    return {
      grahas: gs,
      because: gs.map((id) => ({ grahaId: id, sign: p.g[id].sign, note: `${gName(id)} joins Candra in ${signName(p.g[id].sign)}` })),
    };
  },
);

export const kemadrumaBhangaGuruDrishti = kemadrumaBhanga(
  "kemadruma-bhanga-guru-drishti",
  "Kemadruma-bhaṅga (Guru's aspect on Candra)",
  (p) => {
    if (p.g.JU.sign === p.g.MO.sign || !aspects(p.g.JU, p.g.MO.sign)) return null;
    const h = houseFrom(p.g.JU.sign, p.g.MO.sign);
    return {
      grahas: ["JU"],
      because: [{ grahaId: "JU", sign: p.g.JU.sign, note: `Guru aspects Candra, the ${ord(h)} from Guru` }],
      values: { house: ord(h) },
    };
  },
);

function moonFlank(id: string, name: string, nameDev: string, want: "2" | "12" | "both"): YogaRule {
  return {
    id,
    name,
    nameDev,
    citation: CITE.bphs37,
    test(p) {
      const mo = p.g.MO.sign;
      const second = inHouseFrom(p, mo, 2, TARA_GRAHAS);
      const twelfth = inHouseFrom(p, mo, 12, TARA_GRAHAS);
      const shape = second.length > 0 && twelfth.length > 0 ? "both" : second.length > 0 ? "2" : twelfth.length > 0 ? "12" : null;
      if (shape !== want) return null;
      const because: YogaEvidence[] = [
        ...second.map((g) => ({ grahaId: g, house: 2, note: `${gName(g)} in the 2nd from Candra` })),
        ...twelfth.map((g) => ({ grahaId: g, house: 12, note: `${gName(g)} in the 12th from Candra` })),
      ];
      return { strength: "full", because, values: { grahas: joinNames([...second, ...twelfth]) } };
    },
  };
}

export const sunapha = moonFlank("sunapha", "Sunaphā", "सुनफा", "2");
export const anapha = moonFlank("anapha", "Anaphā", "अनफा", "12");
export const durudhara = moonFlank("durudhara", "Durudharā", "दुरुधरा", "both");

function sunFlank(id: string, name: string, nameDev: string, want: "2" | "12" | "both"): YogaRule {
  const flankers: readonly GrahaId[] = ["MA", "ME", "JU", "VE", "SA"];
  return {
    id,
    name,
    nameDev,
    citation: CITE.bphs38,
    test(p) {
      const su = p.g.SU.sign;
      const second = inHouseFrom(p, su, 2, flankers);
      const twelfth = inHouseFrom(p, su, 12, flankers);
      const shape = second.length > 0 && twelfth.length > 0 ? "both" : second.length > 0 ? "2" : twelfth.length > 0 ? "12" : null;
      if (shape !== want) return null;
      const because: YogaEvidence[] = [
        ...second.map((g) => ({ grahaId: g, house: 2, note: `${gName(g)} in the 2nd from Sūrya` })),
        ...twelfth.map((g) => ({ grahaId: g, house: 12, note: `${gName(g)} in the 12th from Sūrya` })),
      ];
      return { strength: "full", because, values: { grahas: joinNames([...second, ...twelfth]) } };
    },
  };
}

export const vesi = sunFlank("vesi", "Veśi", "वेशि", "2");
export const vasi = sunFlank("vasi", "Vāśi", "वाशि", "12");
export const ubhayacari = sunFlank("ubhayacari", "Ubhayacarī", "उभयचरी", "both");

export const kalaSarpa: YogaRule = {
  id: "kala-sarpa",
  name: "Kāla-Sarpa",
  nameDev: "कालसर्प",
  citation: CITE.kalaSarpa,
  test(p) {
    const k = kalaSarpaCheck(p.core);
    if (!k.hemmed || k.direction === null) return null;
    const label = k.direction === "rahu-to-ketu" ? "from Rāhu forward to Ketu" : "from Ketu forward to Rāhu";
    return {
      strength: "full",
      because: [
        { grahaId: "RA", sign: p.g.RA.sign, note: `Rāhu in ${signName(p.g.RA.sign)}` },
        { grahaId: "KE", sign: p.g.KE.sign, note: `Ketu in ${signName(p.g.KE.sign)}` },
        {
          note:
            k.direction === "rahu-to-ketu"
              ? "all seven grahas lie from Rāhu forward to Ketu"
              : "all seven grahas lie from Ketu forward to Rāhu (some manuals call this Kāla-Amṛta)",
        },
      ],
      values: { direction: label },
    };
  },
};

export const manglik: YogaRule = {
  id: "manglik",
  name: "Kuja doṣa (Manglik)",
  nameDev: "मांगलिक",
  citation: CITE.kujaDosha,
  test(p) {
    const refs = manglikReferences(p.core);
    if (refs.length === 0) return null;
    const lead = refs.find((r) => r.ref === "lagna") ?? refs[0];
    if (!lead) return null;
    const because: YogaEvidence[] = (["lagna", "moon", "venus"] as const).map((ref) => {
      const fromSign = ref === "lagna" ? p.lagna : ref === "moon" ? p.g.MO.sign : p.g.VE.sign;
      const h = houseFrom(fromSign, p.g.MA.sign);
      const counted = refs.some((r) => r.ref === ref);
      return {
        grahaId: "MA" as const,
        house: h,
        note: `Maṅgala in the ${ord(h)} from ${ref === "lagna" ? "the Lagna" : MANGLIK_REF_LABEL[ref]}${counted ? " — counted" : " — not a Manglik house"}`,
      };
    });
    for (const c of MANGLIK_CANCELLATIONS) {
      const scope =
        c.scope === "chart" ? "checked in this chart" : c.scope === "pair" ? "checked in Guna Milan" : "recorded only, never applied";
      because.push({ note: `standard cancellation — ${c.description} (${scope})` });
    }
    return {
      strength: lead.ref === "lagna" ? "full" : "partial",
      because,
      values: {
        house: ord(lead.house),
        from: lead.ref === "lagna" ? "Lagna" : MANGLIK_REF_LABEL[lead.ref],
      },
    };
  },
};

function manglikBhanga(id: string): YogaRule {
  const c = MANGLIK_CANCELLATIONS.find((x) => x.id === id);
  return {
    id,
    name: c?.name ?? id,
    nameDev: "मांगलिक भंग",
    citation: CITE.kujaDoshaBhanga,
    cancels: ["manglik"],
    test(p) {
      if (manglikReferences(p.core).length === 0) return null;
      const hit = manglikChartCancellations(p.core).find((x) => x.id === id);
      if (!hit) return null;
      return { strength: "full", because: hit.because, values: hit.values };
    },
  };
}

export const manglikBhangaOwnSign = manglikBhanga("manglik-bhanga-own-sign");
export const manglikBhangaBudhaRashi = manglikBhanga("manglik-bhanga-budha-rashi");
export const manglikBhangaGuruDrishti = manglikBhanga("manglik-bhanga-guru-drishti");
export const manglikBhangaShaniKendra = manglikBhanga("manglik-bhanga-shani-kendra");

export const grahaYuddha: YogaRule = {
  id: "graha-yuddha",
  name: "Graha Yuddha",
  nameDev: "ग्रह युद्ध",
  citation: CITE.suryaSiddhanta7,
  test(p) {
    const fighters: readonly GrahaId[] = ["MA", "ME", "JU", "VE", "SA"];
    const wars: Array<{ a: GrahaId; b: GrahaId; sep: number; winner: GrahaId | null }> = [];
    for (let i = 0; i < fighters.length; i++) {
      for (let j = i + 1; j < fighters.length; j++) {
        const a = fighters[i];
        const b = fighters[j];
        if (!a || !b) continue;
        const sep = Math.abs(signedDelta(p.g[a].lonSidereal, p.g[b].lonSidereal));
        if (sep >= 1) continue;
        const la = p.g[a].latEcliptic;
        const lb = p.g[b].latEcliptic;
        // The graha lying further north in ecliptic latitude is the victor (Sūrya Siddhānta ch. 7).
        const winner = Math.abs(la - lb) < 1e-9 ? null : la > lb ? a : b;
        wars.push({ a, b, sep, winner });
      }
    }
    if (wars.length === 0) return null;
    wars.sort((x, y) => x.sep - y.sep);
    const because: YogaEvidence[] = [];
    for (const w of wars) {
      const arcsec = Math.round(w.sep * 3600);
      because.push({ grahaId: w.a, sign: p.g[w.a].sign, note: `${gName(w.a)} and ${gName(w.b)} ${arcsec}″ apart` });
      because.push({
        grahaId: w.winner ?? w.b,
        note:
          w.winner === null
            ? "equal latitudes — no clear victor"
            : `${gName(w.winner)} lies further north (${p.g[w.winner].latEcliptic.toFixed(2)}° latitude) and is the victor`,
      });
    }
    const first = wars[0];
    if (!first) return null;
    return {
      strength: "full",
      because,
      values: {
        pair: `${gName(first.a)} and ${gName(first.b)}`,
        winner: first.winner === null ? "neither" : gName(first.winner),
      },
    };
  },
};

export const adhi: YogaRule = {
  id: "adhi",
  name: "Adhi",
  nameDev: "अधि",
  citation: CITE.bphs37,
  test(p) {
    const gs = NATURAL_BENEFICS.filter((id) => [6, 7, 8].includes(houseFrom(p.g.MO.sign, p.g[id].sign)));
    if (gs.length < 2) return null;
    return {
      strength: gs.length === NATURAL_BENEFICS.length ? "full" : "partial",
      because: gs.map((id) => {
        const h = houseFrom(p.g.MO.sign, p.g[id].sign);
        return { grahaId: id, house: h, note: `${gName(id)} in the ${ord(h)} from Candra` };
      }),
      values: { grahas: joinNames(gs) },
    };
  },
};

export const amala: YogaRule = {
  id: "amala",
  name: "Amalā",
  nameDev: "अमला",
  citation: CITE.bphs36,
  test(p) {
    const refs: Array<{ label: string; from: SignIdx }> = [
      { label: "Lagna", from: p.lagna },
      { label: "Candra", from: p.g.MO.sign },
    ];
    const found: Array<{ label: string; benefics: GrahaId[]; sign: SignIdx }> = [];
    for (const r of refs) {
      const tenth = signOfHouse(r.from, 10);
      const benefics = NATURAL_BENEFICS.filter((id) => p.g[id].sign === tenth);
      const malefics = NATURAL_MALEFICS.filter((id) => p.g[id].sign === tenth);
      if (benefics.length > 0 && malefics.length === 0) found.push({ label: r.label, benefics, sign: tenth });
    }
    const first = found[0];
    if (!first) return null;
    return {
      strength: "full",
      because: found.flatMap((f) =>
        f.benefics.map((id) => ({
          grahaId: id,
          sign: f.sign,
          house: 10,
          note: `${gName(id)} in the 10th from ${f.label === "Lagna" ? "the Lagna" : "Candra"}, with no malefic beside it`,
        })),
      ),
      values: { grahas: joinNames(first.benefics), from: found.map((f) => f.label).join(" and ") },
    };
  },
};

export const nicaBhangaRaja: YogaRule = {
  id: "nica-bhanga-raja",
  name: "Nīca-Bhaṅga Rāja",
  nameDev: "नीचभंग राज",
  citation: CITE.phaladipika7,
  test(p) {
    const lifted: SevenId[] = [];
    const conditions: string[] = [];
    const because: YogaEvidence[] = [];
    const inKendra = (id: SevenId): string | null => {
      if (KENDRA.includes(houseFrom(p.lagna, p.g[id].sign))) return "the Lagna";
      // Candra is always in the 1st from itself, so only the Lagna counts when Candra is the helper.
      if (id !== "MO" && KENDRA.includes(houseFrom(p.g.MO.sign, p.g[id].sign))) return "Candra";
      return null;
    };
    for (const id of SEVEN) {
      const gr = p.g[id];
      if (!isDebilitated(id, gr.sign)) continue;
      const found: string[] = [];
      const dispositor = signLord(gr.sign);
      const exLord = signLord(EXALTATION_SIGN[id]);
      const exaltedHere = SEVEN.find((x) => EXALTATION_SIGN[x] === gr.sign);
      const d1 = inKendra(dispositor);
      if (d1) found.push(`${gName(dispositor)}, lord of ${signName(gr.sign)}, in a kendra from ${d1}`);
      if (exLord !== id) {
        const d2 = inKendra(exLord);
        if (d2) found.push(`${gName(exLord)}, lord of its exaltation sign, in a kendra from ${d2}`);
      }
      if (exaltedHere && exaltedHere !== dispositor) {
        const d3 = inKendra(exaltedHere);
        if (d3) found.push(`${gName(exaltedHere)}, exalted in ${signName(gr.sign)}, in a kendra from ${d3}`);
      }
      if (isOwnSign(id, p.g[dispositor].sign)) found.push(`${gName(id)} and ${gName(dispositor)} exchange signs`);
      if (found.length === 0) continue;
      lifted.push(id);
      because.push({ grahaId: id, sign: gr.sign, note: `${gName(id)} debilitated in ${signName(gr.sign)}` });
      for (const f of found) because.push({ grahaId: id, note: f });
      conditions.push(found[0] ?? "");
    }
    if (lifted.length === 0) return null;
    return { strength: "full", because, values: { grahas: joinNames(lifted), condition: conditions[0] ?? "" } };
  },
};

const VIPARITA_NAME: Record<number, string> = { 6: "Harṣa", 8: "Sarala", 12: "Vimala" };

export const viparitaRaja: YogaRule = {
  id: "viparita-raja",
  name: "Viparīta Rāja",
  nameDev: "विपरीत राज",
  citation: CITE.phaladipika6,
  test(p) {
    const because: YogaEvidence[] = [];
    const lords: SevenId[] = [];
    for (const h of DUSTHANA) {
      const lord = lordOfHouse(p.lagna, h);
      const at = houseFrom(p.lagna, p.g[lord].sign);
      if (!DUSTHANA.includes(at)) continue;
      if (!lords.includes(lord)) lords.push(lord);
      because.push({
        grahaId: lord,
        house: at,
        note: `${gName(lord)}, lord of the ${ord(h)}, in the ${ord(at)} (${VIPARITA_NAME[h] ?? ""})`,
      });
    }
    if (lords.length === 0) return null;
    return { strength: "full", because, values: { lords: joinNames(lords) } };
  },
};

export const dharmaKarmadhipati: YogaRule = {
  id: "dharma-karmadhipati",
  name: "Dharma-Karmādhipati Rāja",
  nameDev: "धर्म-कर्माधिपति",
  citation: CITE.bphs39,
  test(p) {
    const l9 = lordOfHouse(p.lagna, 9);
    const l10 = lordOfHouse(p.lagna, 10);
    if (l9 === l10) return null; // one graha owning both is the yogakāraka idea, not this yoga
    const s9 = p.g[l9].sign;
    const s10 = p.g[l10].sign;
    let how: string | null = null;
    let strength: RuleOutcome["strength"] = "full";
    if (s9 === s10) how = `stand together in ${signName(s9)}`;
    else if (s9 === signOfHouse(p.lagna, 10) && s10 === signOfHouse(p.lagna, 9)) how = "exchange signs";
    else if (houseFrom(s9, s10) === 7) {
      how = "face each other across the chart";
      strength = "partial";
    }
    if (how === null) return null;
    return {
      strength,
      because: [
        { grahaId: l9, sign: s9, house: houseFrom(p.lagna, s9), note: `${gName(l9)}, lord of the 9th, in ${signName(s9)}` },
        { grahaId: l10, sign: s10, house: houseFrom(p.lagna, s10), note: `${gName(l10)}, lord of the 10th, in ${signName(s10)}` },
      ],
      values: { g9: gName(l9), g10: gName(l10), how },
    };
  },
};

export const parivartana: YogaRule = {
  id: "parivartana",
  name: "Parivartana",
  nameDev: "परिवर्तन",
  citation: CITE.phaladipika6,
  test(p) {
    const swaps: Array<{ a: SevenId; b: SevenId; kind: "Mahā" | "Khala" | "Dainya" }> = [];
    for (let i = 0; i < SEVEN.length; i++) {
      for (let j = i + 1; j < SEVEN.length; j++) {
        const a = SEVEN[i];
        const b = SEVEN[j];
        if (!a || !b) continue;
        if (!isOwnSign(b, p.g[a].sign) || !isOwnSign(a, p.g[b].sign)) continue;
        const ha = houseFrom(p.lagna, p.g[a].sign);
        const hb = houseFrom(p.lagna, p.g[b].sign);
        const kind = DUSTHANA.includes(ha) || DUSTHANA.includes(hb) ? "Dainya" : ha === 3 || hb === 3 ? "Khala" : "Mahā";
        swaps.push({ a, b, kind });
      }
    }
    if (swaps.length === 0) return null;
    const best = swaps.find((s) => s.kind === "Mahā") ?? swaps[0];
    if (!best) return null;
    return {
      strength: best.kind === "Mahā" ? "full" : "partial",
      because: swaps.flatMap((s) => [
        { grahaId: s.a, sign: p.g[s.a].sign, note: `${gName(s.a)} in ${signName(p.g[s.a].sign)}, ${gName(s.b)}'s sign` },
        {
          grahaId: s.b,
          sign: p.g[s.b].sign,
          note: `${gName(s.b)} in ${signName(p.g[s.b].sign)}, ${gName(s.a)}'s sign (${s.kind})`,
        },
      ]),
      values: { pairs: swaps.map((s) => `${gName(s.a)} and ${gName(s.b)}`).join("; "), kind: best.kind },
    };
  },
};

/** Every rule, in evaluation order. A canceller listed earlier wins the `cancelledBy` slot. */
export const YOGA_RULES: readonly YogaRule[] = [
  gajaKesari,
  budhaAditya,
  candraMangala,
  rucaka,
  bhadra,
  hamsa,
  malavya,
  sasa,
  kemadruma,
  kemadrumaBhangaKendraLagna,
  kemadrumaBhangaKendraMoon,
  kemadrumaBhangaConjunct,
  kemadrumaBhangaGuruDrishti,
  sunapha,
  anapha,
  durudhara,
  vesi,
  vasi,
  ubhayacari,
  kalaSarpa,
  manglik,
  manglikBhangaOwnSign,
  manglikBhangaBudhaRashi,
  manglikBhangaGuruDrishti,
  manglikBhangaShaniKendra,
  grahaYuddha,
  adhi,
  amala,
  nicaBhangaRaja,
  viparitaRaja,
  dharmaKarmadhipati,
  parivartana,
];

const STRENGTH_ORDER: Record<YogaHit["strength"], number> = { full: 0, partial: 1, cancelled: 2 };

export function contextOf(core: PatriCore): PatriContext {
  return { core, g: core.grahas, lagna: core.lagna.sign };
}

/** Seed for a hit's sentence: the chart identity plus the rule, so the same chart always reads the same. */
const readingSeed = (core: PatriCore, id: string): string =>
  `${core.profileId}|${core.presetHash}|yogas-v${YOGA_RULES_VERSION}|${id}`;

/**
 * Evaluate every rule; then the cancellation pass; then order (full, partial, cancelled; by id).
 * Pure and deterministic.
 */
export function runYogas(core: PatriCore): YogaHit[] {
  const p = contextOf(core);
  const fired: Array<{ rule: YogaRule; out: RuleOutcome }> = [];
  for (const rule of YOGA_RULES) {
    const out = rule.test(p);
    if (out) fired.push({ rule, out });
  }
  const firedIds = new Set(fired.map((f) => f.rule.id));
  const cancellers = new Map<string, YogaRule[]>();
  for (const f of fired) {
    for (const target of f.rule.cancels ?? []) {
      if (!firedIds.has(target)) continue;
      const list = cancellers.get(target) ?? [];
      list.push(f.rule);
      cancellers.set(target, list);
    }
  }
  const hits: YogaHit[] = fired.map(({ rule, out }) => {
    const by = cancellers.get(rule.id);
    const first = by?.[0];
    if (by && first) {
      return {
        id: rule.id,
        name: rule.name,
        nameDev: rule.nameDev,
        strength: "cancelled",
        because: [...out.because, ...by.map((c) => ({ note: `set aside by ${c.name}` }))],
        citation: rule.citation,
        cancelledBy: first.id,
        reading: renderTemplate("cancelled", { yoga: rule.name, canceller: first.name }, readingSeed(core, rule.id)),
      };
    }
    return {
      id: rule.id,
      name: rule.name,
      nameDev: rule.nameDev,
      strength: out.strength,
      because: out.because,
      citation: rule.citation,
      reading: renderTemplate(rule.id, out.values, readingSeed(core, rule.id)),
    };
  });
  return hits.sort((a, b) => STRENGTH_ORDER[a.strength] - STRENGTH_ORDER[b.strength] || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
