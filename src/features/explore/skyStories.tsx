// Turns a wheel selection into a story panel and a deck of story-mode slides.
import { GrahaGlyph } from "../../components/ui/GrahaGlyph";
import type { Slide } from "../../components/ui/StoryPlayer";
import { GRAHA_LORE, NAKSHATRA_LORE, RASHI_LORE } from "../../data/lore";
import { EXALTATION, OWN_SIGNS } from "../../data/tables/dignity";
import { GANA_BY_NAK, GANA_LABEL, YONI_BY_NAK, YONI_LABEL } from "../../data/tables/koota";
import { NAK_LORDS, NAKSHATRA_DEV, NAKSHATRA_NAMES } from "../../data/tables/names";
import type { TransitGraha } from "../../engine/gochar";
import { GRAHA_IDS, type GrahaId, type Patri } from "../../engine/types";
import type { WheelSel } from "./SkyWheel";
import { StarPatch } from "./StarPatch";

const SPAN = 360 / 27;
const lore = (id: GrahaId) => GRAHA_LORE.find((g) => g.id === id);
const cap = (s: string) => (s ? (s[0]?.toUpperCase() ?? "") + s.slice(1) : s);
const dm = (x: number) => `${Math.floor(x % 30)}°${String(Math.round(((x % 30) % 1) * 60)).padStart(2, "0")}′`;

export interface Panel {
  kicker: string;
  title: string;
  dev?: string | undefined;
  tagline: string;
  art: React.ReactNode;
  story: string;
  facts: Array<[string, string]>;
  now?: string | undefined;
  mine?: string | undefined;
  to: string;
  tone: "myth" | "sky" | "idea";
}

export function panelFor(sel: WheelSel, sky: Record<GrahaId, TransitGraha>, patri: Patri | null, name: string | null): Panel {
  if (sel.kind === "graha") {
    const g = lore(sel.id);
    const now = sky[sel.id];
    const own = OWN_SIGNS[sel.id] ?? [];
    const ex = EXALTATION[sel.id];
    const mine = patri?.grahas[sel.id];
    return {
      kicker: `Graha · ${g?.title ?? ""}`,
      title: g?.name ?? "",
      dev: g?.dev,
      tagline: `${g?.english}: ${g?.signifies}`,
      art: (
        <div className="panel-glyph">
          <span className="panel-glyph__orbit" />
          <GrahaGlyph id={sel.id} size={120} />
        </div>
      ),
      story: g?.myth ?? "",
      facts: [
        ["Day", g?.day ?? ""],
        ["Colour", g?.colour ?? ""],
        ["Gem", g?.gem ?? ""],
        ["Rides", g?.vehicle ?? ""],
        ["Rules", own.length ? own.map((s) => RASHI_LORE[s]?.name).join(", ") : "no sign (a shadow graha)"],
        ["Exalted in", ex ? `${RASHI_LORE[ex[0]]?.name}` : "–"],
        ["Mantra", g?.mantra ?? ""],
      ],
      now: `Now in ${RASHI_LORE[now.sign]?.name} (${RASHI_LORE[now.sign]?.western}), ${NAKSHATRA_NAMES[now.nakshatra]}${now.retrograde && sel.id !== "RA" && sel.id !== "KE" ? ", retrograde" : ""}.`,
      mine:
        mine && name
          ? `In ${name}'s chart: ${RASHI_LORE[mine.sign]?.name}, ${NAKSHATRA_NAMES[mine.nakshatra]} pada ${mine.pada}.`
          : undefined,
      to: `/explore/graha/${sel.id}`,
      tone: "myth",
    };
  }
  if (sel.kind === "rashi") {
    const r = RASHI_LORE[sel.i];
    const here = GRAHA_IDS.filter((g) => sky[g].sign === sel.i);
    const mineHere = patri ? GRAHA_IDS.filter((g) => patri.grahas[g].sign === sel.i) : [];
    const naks = Array.from({ length: 27 }, (_, k) => k).filter((k) => k * SPAN < (sel.i + 1) * 30 && (k + 1) * SPAN > sel.i * 30);
    return {
      kicker: `Rāśi ${sel.i + 1} of 12 · ${r?.element} · ${r?.quality}`,
      title: r?.name ?? "",
      dev: r?.dev,
      tagline: `${r?.western} · ${r?.symbol}: ${r?.nature}`,
      art: <StarPatch from={sel.i * 30} span={30} lat={24} label={`The real stars of ${r?.name}`} />,
      story: `${r?.name}, ${r?.symbol}, is ${r?.element === "Air" || r?.element === "Earth" ? "an" : "a"} ${r?.element.toLowerCase()} sign ruled by ${lore(r?.ruler ?? "SU")?.english} (${lore(r?.ruler ?? "SU")?.name}). In the body of the cosmic person, Kāla-puruṣa, it is the ${r?.body}. Its nakṣatras are ${naks.map((k) => NAKSHATRA_NAMES[k]).join(", ")}.`,
      facts: [
        ["Western", `${r?.western} (≈24° ahead of this sidereal sign)`],
        ["Element", r?.element ?? ""],
        ["Quality", r?.quality ?? ""],
        ["Ruler", `${lore(r?.ruler ?? "SU")?.english}`],
        ["Body", r?.body ?? ""],
      ],
      now: here.length ? `Here now: ${here.map((g) => lore(g)?.english).join(", ")}.` : "No graha is in this sign right now.",
      mine:
        patri && name
          ? `In ${name}'s chart: ${mineHere.length ? mineHere.map((g) => lore(g)?.english).join(", ") : "empty"}${patri.lagna.sign === sel.i ? ". This is the rising sign" : ""}${patri.grahas.MO.sign === sel.i ? ". This is the Moon sign" : ""}.`
          : undefined,
      to: `/explore/rashi/${sel.i}`,
      tone: "sky",
    };
  }
  const n = NAKSHATRA_LORE[sel.i];
  const lord = NAK_LORDS[sel.i % 9] ?? "KE";
  const a = sel.i * SPAN;
  const mineMoon = patri?.grahas.MO.nakshatra === sel.i;
  return {
    kicker: `Nakṣatra ${sel.i + 1} of 27 · “${n?.meaning}”`,
    title: NAKSHATRA_NAMES[sel.i] ?? "",
    dev: NAKSHATRA_DEV[sel.i],
    tagline: `${cap(n?.symbol ?? "")} · deity ${n?.deity}`,
    art: <StarPatch from={a} span={SPAN} lat={32} label={`The real stars of ${NAKSHATRA_NAMES[sel.i]}`} />,
    story: n?.story ?? "",
    facts: [
      ["Stars", n?.star ?? ""],
      [
        "Span",
        `${RASHI_LORE[Math.floor(a / 30)]?.name} ${dm(a)} → ${RASHI_LORE[Math.floor((a + SPAN - 0.001) / 30)]?.name} ${dm(a + SPAN) === "0°00′" ? "30°00′" : dm(a + SPAN)}`,
      ],
      ["Ruler", `${lore(lord)?.english} (${lore(lord)?.name})`],
      ["Nature (gaṇa)", GANA_LABEL[GANA_BY_NAK[sel.i] ?? "deva"]],
      ["Animal (yoni)", YONI_LABEL[YONI_BY_NAK[sel.i] ?? "horse"]],
    ],
    now: sky.MO.nakshatra === sel.i ? "☾ The Moon is passing through it right now." : undefined,
    mine: mineMoon && name ? `★ ${name}'s birth star.` : undefined,
    to: `/explore/nakshatra/${sel.i}`,
    tone: "myth",
  };
}

/** Four slides for story mode. */
export function slidesFor(sel: WheelSel, p: Panel): Slide[] {
  const id = sel.kind === "graha" ? sel.id : `${sel.kind}${sel.i}`;
  const factLine = p.facts.map(([k, v]) => `${k}: ${v}`).join(" · ");
  return [
    { id: `${id}-a`, kicker: p.kicker, title: p.title, dev: p.dev, body: [p.tagline], art: p.art, tone: "sky" },
    { id: `${id}-b`, kicker: "The story", title: p.title, dev: p.dev, body: [p.story], tone: "myth" },
    { id: `${id}-c`, kicker: "What the tradition says", title: "At a glance", body: [factLine], tone: "idea" },
    {
      id: `${id}-d`,
      kicker: "In the sky",
      title: "Right now",
      body: [p.now ?? "Look for it along the band of the zodiac.", ...(p.mine ? [p.mine] : [])],
      fact: "Every position here is computed for this moment on your device.",
      tone: "history",
    },
  ];
}
