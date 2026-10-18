// Explore: the library of the sky, nine grahas, twelve rāśis, twenty-seven nakṣatras, numerology and
// the Chinese zodiac, each with its myth, its meaning, the real astronomy, and where it sits right now.
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { useActiveProfile, usePatri, useProfiles, useSettings } from "../../app/hooks";
import { useNowMs } from "../../app/useNow";
import { InfoDot } from "../../components/ui/Explain";
import { GrahaGlyph } from "../../components/ui/GrahaGlyph";
import { Screen } from "../../components/ui/Screen";
import { GRAHA_LORE, NAKSHATRA_LORE, RASHI_LORE } from "../../data/lore";
import { EXALTATION, naturalRelation, OWN_SIGNS } from "../../data/tables/dignity";
import { GANA_BY_NAK, GANA_LABEL, YONI_BY_NAK, YONI_LABEL } from "../../data/tables/koota";
import { NAK_LORDS, NAKSHATRA_DEV, NAKSHATRA_NAMES } from "../../data/tables/names";
import { transitsAt } from "../../engine/gochar";
import { mulberry32 } from "../../engine/math";
import { birthNumbers, CHINESE_ANIMALS, chineseZodiac, NUMBER_GRAHA, nameNumber, personalYear } from "../../engine/profile";
import { GRAHA_IDS, type GrahaId } from "../../engine/types";
import "../cosmic/cosmic.css";
import { StoryPlayer } from "../../components/ui/StoryPlayer";
import { StoryRings } from "../story/StoryRings";
import { SkyWheel, type WheelSel } from "./SkyWheel";
import { panelFor, slidesFor } from "./skyStories";
import "./explore.css";
import "./wheel.css";
import { nakName, rashiName } from "../../data/regional";
import { countEvent } from "../../platform/stats";

const lore = (id: GrahaId) => GRAHA_LORE.find((g) => g.id === id);
const NAK_SPAN = 360 / 27;
const ELEMENT_TONE = { Fire: "fire", Earth: "earth", Air: "air", Water: "water" } as const;

function useSky() {
  const settings = useSettings();
  const now = useNowMs(10 * 60_000);
  return useMemo(() => transitsAt(now, settings.preset), [now, settings.preset]);
}

function Back() {
  return (
    <Link to="/explore" className="ex-back">
      ← Explore
    </Link>
  );
}

function Facts({ rows }: { rows: Array<[string, React.ReactNode]> }) {
  return (
    <dl className="ex-facts">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

// ── detail: graha ─────────────────────────────────────────────────────────
function GrahaDetail({ id }: { id: GrahaId }) {
  const g = lore(id);
  const sky = useSky();
  const active = useActiveProfile();
  const settings = useSettings();
  const { patri } = usePatri(active, settings.preset);
  if (!g) return null;
  const now = sky[id];
  const naks = NAKSHATRA_NAMES.map((n, i) => ({ n, i })).filter(({ i }) => NAK_LORDS[i % 9] === id);
  const own = OWN_SIGNS[id] ?? [];
  const ex = EXALTATION[id];
  const mine = patri && active && patri.profileId === active.id ? patri.grahas[id] : null;
  return (
    <article className="ex-detail">
      <Back />
      <header className="ex-hero">
        <GrahaGlyph id={id} size={96} />
        <div>
          <p className="ex-kicker">Graha · {g.title}</p>
          <h1>
            {g.name}{" "}
            <span lang="hi" className="ex-dev">
              {g.dev}
            </span>
          </h1>
          <p className="ex-sub">{g.english}</p>
        </div>
      </header>
      <section className="cosmic-card ex-story">
        <h2>The story</h2>
        <p>{g.myth}</p>
      </section>
      <section className="cosmic-card">
        <h2>What it stands for</h2>
        <p className="ex-big">{g.signifies[0]?.toUpperCase() + g.signifies.slice(1)}.</p>
        <Facts
          rows={[
            ["Day", g.day],
            ["Colour", g.colour],
            ["Gem", g.gem],
            ["Rides", g.vehicle],
            [
              "Mantra",
              <span key="m" className="ex-mantra">
                {g.mantra}
              </span>,
            ],
            ["Rules", own.length ? own.map((s) => RASHI_LORE[s]?.name).join(", ") : "no sign (a shadow graha)"],
            ["Exalted in", ex ? `${RASHI_LORE[ex[0]]?.name} (${RASHI_LORE[ex[0]]?.western})` : "-"],
          ]}
        />
      </section>
      <section className="cosmic-card">
        <h2>Where it is right now</h2>
        <p>
          {g.english} is in <Link to={`/explore/rashi/${now.sign}`}>{RASHI_LORE[now.sign]?.name}</Link> ({RASHI_LORE[now.sign]?.western}),{" "}
          {Math.floor(now.degInSign)}°, in the nakṣatra{" "}
          <Link to={`/explore/nakshatra/${now.nakshatra}`}>{NAKSHATRA_NAMES[now.nakshatra]}</Link>
          {now.retrograde && id !== "RA" && id !== "KE" ? ", moving retrograde" : ""}.
        </p>
        {mine && active ? (
          <p>
            In {active.name}'s birth chart it was in {RASHI_LORE[mine.sign]?.name}, {NAKSHATRA_NAMES[mine.nakshatra]} pada {mine.pada}
            {mine.retrograde && id !== "RA" && id !== "KE" ? ", retrograde" : ""}.
          </p>
        ) : null}
      </section>
      <section className="cosmic-card">
        <h2>The real sky</h2>
        <p>{g.real}</p>
      </section>
      <section className="cosmic-card">
        <h2>Its three birth stars</h2>
        <p className="p--muted">Each graha rules three nakṣatras; they set the order of the daśā life chapters.</p>
        <ul className="ex-chips">
          {naks.map(({ n, i }) => (
            <li key={n}>
              <Link to={`/explore/nakshatra/${i}`}>{n}</Link>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}

// ── detail: rāśi ──────────────────────────────────────────────────────────
function RashiDetail({ i }: { i: number }) {
  const r = RASHI_LORE[i];
  const sky = useSky();
  const active = useActiveProfile();
  const settings = useSettings();
  const { patri } = usePatri(active, settings.preset);
  if (!r) return null;
  const naks = Array.from({ length: 27 }, (_, k) => k).filter((k) => {
    const a = k * NAK_SPAN;
    const b = a + NAK_SPAN;
    return a < (i + 1) * 30 && b > i * 30;
  });
  const here = GRAHA_IDS.filter((g) => sky[g].sign === i);
  const mineHere = patri && active && patri.profileId === active.id ? GRAHA_IDS.filter((g) => patri.grahas[g].sign === i) : [];
  return (
    <article className="ex-detail">
      <Back />
      <header className="ex-hero">
        <span className={`ex-signorb ex-signorb--${ELEMENT_TONE[r.element]}`} aria-hidden="true">
          {i + 1}
        </span>
        <div>
          <p className="ex-kicker">
            Rāśi {i + 1} of 12 <InfoDot id="rashi" />
          </p>
          <h1>
            {r.name}{" "}
            <span lang="hi" className="ex-dev">
              {r.dev}
            </span>
          </h1>
          <p className="ex-sub">
            {r.western} · {r.symbol}
          </p>
        </div>
      </header>
      <section className="cosmic-card">
        <h2>Its nature</h2>
        <p className="ex-big">{r.nature[0]?.toUpperCase() + r.nature.slice(1)}.</p>
        <Facts
          rows={[
            ["Element", r.element],
            ["Quality", `${r.quality}: ${r.quality === "Movable" ? "starts things" : r.quality === "Fixed" ? "holds steady" : "adapts"}`],
            ["Ruled by", <Link key="r" to={`/explore/graha/${r.ruler}`}>{`${lore(r.ruler)?.name} (${lore(r.ruler)?.english})`}</Link>],
            ["Body (Kāla-puruṣa)", r.body],
            ["Western sign", `${r.western}, about 24° ahead of this sidereal sign`],
          ]}
        />
      </section>
      <section className="cosmic-card">
        <h2>Nakṣatras in this sign</h2>
        <ul className="ex-chips">
          {naks.map((k) => (
            <li key={k}>
              <Link to={`/explore/nakshatra/${k}`}>{NAKSHATRA_NAMES[k]}</Link>
            </li>
          ))}
        </ul>
      </section>
      <section className="cosmic-card">
        <h2>Who is here</h2>
        <p>
          <strong>Now:</strong> {here.length ? here.map((g) => lore(g)?.english).join(", ") : "no graha is in this sign right now"}.
        </p>
        {active && patri ? (
          <p>
            <strong>In {active.name}'s chart:</strong> {mineHere.length ? mineHere.map((g) => lore(g)?.english).join(", ") : "empty"}
            {patri.lagna.sign === i ? ", and it is the rising sign" : ""}.
          </p>
        ) : null}
      </section>
    </article>
  );
}

// ── detail: nakṣatra ──────────────────────────────────────────────────────
function NakshatraDetail({ i }: { i: number }) {
  const n = NAKSHATRA_LORE[i];
  const sky = useSky();
  if (!n) return null;
  const lord = NAK_LORDS[i % 9] ?? "KE";
  const a = i * NAK_SPAN;
  const s0 = Math.floor(a / 30);
  const s1 = Math.floor((a + NAK_SPAN - 0.001) / 30);
  const dms = (x: number) => `${Math.floor(x % 30)}°${String(Math.round(((x % 30) % 1) * 60)).padStart(2, "0")}′`;
  const moonHere = sky.MO.nakshatra === i;
  return (
    <article className="ex-detail">
      <Back />
      <header className="ex-hero">
        <span className="ex-nakorb" aria-hidden="true">
          <span>{i + 1}</span>
        </span>
        <div>
          <p className="ex-kicker">
            Nakṣatra {i + 1} of 27 <InfoDot id="nakshatra" />
          </p>
          <h1>
            {NAKSHATRA_NAMES[i]}{" "}
            <span lang="hi" className="ex-dev">
              {NAKSHATRA_DEV[i]}
            </span>
          </h1>
          <p className="ex-sub">
            “{n.meaning}” · {n.symbol}
          </p>
        </div>
      </header>
      {moonHere ? <p className="ex-now">☾ The Moon is in {NAKSHATRA_NAMES[i]} right now.</p> : null}
      <section className="cosmic-card ex-story">
        <h2>The story</h2>
        <p>
          Presided over by <strong>{n.deity}</strong>. {n.story}
        </p>
      </section>
      <section className="cosmic-card">
        <h2>In the sky</h2>
        <Facts
          rows={[
            ["Stars", n.star],
            [
              "Span",
              `${RASHI_LORE[s0]?.name} ${dms(a)} → ${RASHI_LORE[s1]?.name} ${dms(a + NAK_SPAN) === "0°00′" ? "30°00′" : dms(a + NAK_SPAN)}`,
            ],
            ["Ruling graha", <Link key="l" to={`/explore/graha/${lord}`}>{`${lore(lord)?.name} (${lore(lord)?.english})`}</Link>],
            ["Gaṇa (nature)", GANA_LABEL[GANA_BY_NAK[i] ?? "deva"]],
            ["Yoni (animal)", YONI_LABEL[YONI_BY_NAK[i] ?? "horse"]],
          ]}
        />
        <p className="p--muted ex-note">
          Gaṇa and yoni are used in Guna Milan matching <InfoDot id="guna-milan" />.
        </p>
      </section>
      <div className="ex-pager">
        <Link to={`/explore/nakshatra/${(i + 26) % 27}`}>← {NAKSHATRA_NAMES[(i + 26) % 27]}</Link>
        <Link to={`/explore/nakshatra/${(i + 1) % 27}`}>{NAKSHATRA_NAMES[(i + 1) % 27]} →</Link>
      </div>
    </article>
  );
}

// ── numbers ───────────────────────────────────────────────────────────────
const NUMBER_MEANING: Record<number, string> = {
  1: "a leader: independent, proud, original",
  2: "a feeler: gentle, imaginative, diplomatic",
  3: "a teacher: wise, generous, expansive",
  4: "a rebel: unconventional, inventive, restless",
  5: "a communicator: quick, witty, adaptable",
  6: "a lover: warm, artistic, home-making",
  7: "a seeker: inward, intuitive, spiritual",
  8: "a builder: patient, serious, enduring",
  9: "a warrior: brave, energetic, direct",
};

function Numbers() {
  const profiles = useProfiles();
  const active = useActiveProfile();
  const [pid, setPid] = useState<string | null>(null);
  const [other, setOther] = useState<string | null>(null);
  const p = profiles?.find((x) => x.id === (pid ?? active?.id)) ?? active ?? null;
  const q = profiles?.find((x) => x.id === other) ?? null;
  const year = new Date().getFullYear();
  const card = (label: string, v: number, how: string) => {
    const g = NUMBER_GRAHA[v as 1];
    return (
      <div className="ex-num" key={label}>
        <span className="cp-sign cp-sign--num ex-num__v">{v}</span>
        <div>
          <p className="ex-num__k">{label}</p>
          <p className="ex-num__p">
            {g ? (
              <Link to={`/explore/graha/${g}`}>
                {lore(g)?.english} ({lore(g)?.name})
              </Link>
            ) : null}{" "}
            is {NUMBER_MEANING[v] ?? ""}
          </p>
          <p className="ex-num__how">{how}</p>
        </div>
      </div>
    );
  };
  const n = p ? birthNumbers(p.birth.localY, p.birth.localMo, p.birth.localD) : null;
  const nm = p ? nameNumber(p.name) : null;
  const nq = q ? birthNumbers(q.birth.localY, q.birth.localMo, q.birth.localD) : null;
  const rel = n && nq ? naturalRelation(NUMBER_GRAHA[n.root as 1], NUMBER_GRAHA[nq.root as 1]) : null;
  return (
    <article className="ex-detail">
      <Back />
      <header className="ex-hero">
        <span className="cp-sign cp-sign--num ex-bignum" aria-hidden="true">
          108
        </span>
        <div>
          <p className="ex-kicker">Aṅka Jyotiṣa · Numerology</p>
          <h1>Your numbers</h1>
          <p className="ex-sub">Each digit 1-9 belongs to a graha. Just for fun. There is no scientific basis.</p>
        </div>
      </header>
      {profiles && profiles.length > 1 ? (
        <div className="fc-people" role="group" aria-label="Whose numbers">
          {profiles.map((x) => (
            <button key={x.id} type="button" aria-pressed={x.id === p?.id} onClick={() => setPid(x.id)}>
              {x.name}
            </button>
          ))}
        </div>
      ) : null}
      {p && n && nm ? (
        <section className="cosmic-card ex-nums">
          {card("Root number · Mūlāṅka", n.root, `From the day of birth, ${p.birth.localD}, added to one digit. Said to show your nature.`)}
          {card(
            "Destiny number · Bhāgyāṅka",
            n.destiny,
            `From every digit of ${p.birth.localD}/${p.birth.localMo}/${p.birth.localY}. Said to show your path.`,
          )}
          {card(
            "Name number",
            nm.single,
            `"${p.name}" by the Chaldean letter values: ${nm.compound} → ${nm.single}. Said to show how others see you.`,
          )}
          {card(
            `Personal year ${year}`,
            personalYear(p.birth.localMo, p.birth.localD, year),
            `Birthday + month + ${year}, reduced. The theme of this year, birthday to birthday.`,
          )}
        </section>
      ) : (
        <p className="p p--muted">
          <Link to="/leaf/new">Add a person</Link> to see their numbers.
        </p>
      )}
      {p && n && profiles && profiles.length > 1 ? (
        <section className="cosmic-card">
          <h2>Number friendship</h2>
          <p className="p--muted">Compare root numbers through their grahas' classical friendships.</p>
          <div className="fc-people">
            {profiles
              .filter((x) => x.id !== p.id)
              .map((x) => (
                <button key={x.id} type="button" aria-pressed={x.id === other} onClick={() => setOther(x.id)}>
                  {x.name}
                </button>
              ))}
          </div>
          {q && nq && rel ? (
            <p className="ex-big">
              {p.name}'s {n.root} ({lore(NUMBER_GRAHA[n.root as 1])?.english}) and {q.name}'s {nq.root} (
              {lore(NUMBER_GRAHA[nq.root as 1])?.english}):{" "}
              {rel === "self"
                ? "the same number, so like-minded"
                : rel === "friend"
                  ? "friends"
                  : rel === "neutral"
                    ? "neutral"
                    : "natural rivals"}
              .
            </p>
          ) : null}
        </section>
      ) : null}
      <section className="cosmic-card ex-story">
        <h2>Why 108?</h2>
        <p>
          108 = 27 nakṣatras × 4 padas = 12 signs × 9 grahas. It's why a mālā has 108 beads, and why so many prayers are said 108 times.
          Pythagoras taught that "all is number" around 530 BCE; Indian numerology joined that idea to the nine grahas.{" "}
          <Link to="/story">Read the whole story →</Link>
        </p>
      </section>
    </article>
  );
}

// ── Chinese zodiac ────────────────────────────────────────────────────────
function Chinese() {
  const profiles = useProfiles();
  return (
    <article className="ex-detail">
      <Back />
      <header className="ex-hero">
        <span className="cp-sign cp-sign--cn ex-bignum" aria-hidden="true">
          十二
        </span>
        <div>
          <p className="ex-kicker">Shēngxiào · Chinese zodiac</p>
          <h1>The twelve animals</h1>
          <p className="ex-sub">A neighbouring tradition: one animal per lunar year, in a 12-year cycle with five elements.</p>
        </div>
      </header>
      <section className="cosmic-card ex-story">
        <h2>The Great Race</h2>
        <p>
          The Jade Emperor called all the animals to a race across a great river; the order they arrived would name the years. The clever
          Rat rode on the Ox's back and leapt ashore first. The Ox came second, then the Tiger, the Rabbit hopping across stones, the Dragon
          (who stopped to bring rain), the Horse (startled at the bank by the Snake hidden on its hoof), the Goat, Monkey and Rooster
          sharing a raft, the Dog who stopped to bathe, and last the Pig, who had stopped to eat and nap.
        </p>
      </section>
      <section className="cosmic-card">
        <h2>Your circle</h2>
        {profiles?.length ? (
          <ul className="ex-cn">
            {profiles.map((p) => {
              const c = chineseZodiac(p.birth.utcMs);
              return (
                <li key={p.id}>
                  <strong>{p.name}</strong>: {c.element} {c.animal} ({c.yin ? "yin" : "yang"}), lunar year {c.year}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="p--muted">No one saved yet.</p>
        )}
        <p className="p--muted ex-note">
          The year starts at Chinese New Year (a new moon between 21 January and 20 February), not on 1 January, so early-year birthdays
          often belong to the previous animal.
        </p>
      </section>
      <section className="cosmic-card">
        <h2>The cycle</h2>
        <ol className="ex-chips ex-chips--ol">
          {CHINESE_ANIMALS.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ol>
      </section>
    </article>
  );
}

// ── hub: the Sky Wheel and its story panel ────────────────────────────────
function Hub() {
  const sky = useSky();
  const active = useActiveProfile();
  const settings = useSettings();
  const { patri: p } = usePatri(active, settings.preset);
  const patri = p && active && p.profileId === active.id ? p : null;
  const [sel, setSel] = useState<WheelSel>(() => ({ kind: "nak", i: sky.MO.nakshatra }));
  const [playing, setPlaying] = useState(false);
  const surprise = () => {
    countEvent("explore-surprise");
    // Seeded from the clock (Math.random is never used in Vyomaphala).
    const r = mulberry32(Date.now() % 2147483647)();
    const k = Math.floor(r * 48);
    if (k < 9) setSel({ kind: "graha", id: GRAHA_IDS[k] ?? "SU" });
    else if (k < 21) setSel({ kind: "rashi", i: k - 9 });
    else setSel({ kind: "nak", i: k - 21 });
  };
  const panel = panelFor(sel, sky, patri, active?.name ?? null);
  const kinds = [
    ["graha", "9 Planets"],
    ["rashi", "12 Signs"],
    ["nak", "27 Stars"],
  ] as const;
  const pick = (k: (typeof kinds)[number][0]) => {
    if (k === "graha") setSel({ kind: "graha", id: "MO" });
    else if (k === "rashi") setSel({ kind: "rashi", i: sky.MO.sign });
    else setSel({ kind: "nak", i: sky.MO.nakshatra });
  };
  return (
    <>
      <header className="ex-head ex-head--wheel">
        <p className="ex-kicker">Explore · अन्वेषण</p>
        <h1>The sky, and its stories</h1>
        <p className="ex-lede">
          Turn the wheel. Every planet, sign and star has a myth, a meaning in the tradition, and real stars behind it.
        </p>
      </header>

      <div className="seg ex-kinds" role="group" aria-label="Choose a ring">
        {kinds.map(([k, label]) => (
          <button key={k} type="button" aria-pressed={sel.kind === k} onClick={() => pick(k)}>
            {label}
          </button>
        ))}
      </div>

      {patri && active ? (
        <div className="ex-you" role="group" aria-label={`Start with ${active.name}'s sky`}>
          <button type="button" onClick={() => setSel({ kind: "nak", i: patri.grahas.MO.nakshatra })}>
            ★ {nakName(patri.grahas.MO.nakshatra, active.tradition)} <span>birth star</span>
          </button>
          <button type="button" onClick={() => setSel({ kind: "rashi", i: patri.grahas.MO.sign })}>
            ☾ {rashiName(patri.grahas.MO.sign, active.tradition)} <span>Moon sign</span>
          </button>
          <button type="button" onClick={() => setSel({ kind: "rashi", i: patri.lagna.sign })}>
            ↑ {rashiName(patri.lagna.sign, active.tradition)} <span>rising sign</span>
          </button>
        </div>
      ) : null}

      <button type="button" className="ex-surprise" onClick={surprise}>
        ✦ Surprise me
      </button>

      <div className="ex-stage">
        <SkyWheel
          key={`${sel.kind}`}
          sky={sky}
          sel={sel}
          onSelect={setSel}
          onPlay={() => setPlaying(true)}
          natalMoon={patri?.grahas.MO.sign}
        />
        <article className={`ex-panel ex-panel--${panel.tone}`} aria-live="polite" key={JSON.stringify(sel)}>
          <div className="ex-panel__art">{panel.art}</div>
          <p className="ex-kicker">{panel.kicker}</p>
          <h2 className="ex-panel__t">
            {panel.title}{" "}
            {panel.dev ? (
              <span lang="hi" className="ex-dev">
                {panel.dev}
              </span>
            ) : null}
          </h2>
          <p className="ex-panel__tag">{panel.tagline}</p>
          {panel.now || panel.mine ? (
            <div className="ex-panel__badges">
              {panel.now ? <span className="ex-badge ex-badge--now">{panel.now}</span> : null}
              {panel.mine ? <span className="ex-badge ex-badge--mine">{panel.mine}</span> : null}
            </div>
          ) : null}
          <p className="ex-panel__story">{panel.story}</p>
          <dl className="ex-panel__facts">
            {panel.facts.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <div className="ex-panel__actions">
            <button
              type="button"
              className="stamp"
              onClick={() => {
                countEvent("explore-play-story");
                setPlaying(true);
              }}
            >
              <span>▶ Play its story</span>
            </button>
            <Link to={panel.to} className="linkish">
              Full page →
            </Link>
          </div>
        </article>
      </div>

      {playing ? (
        <StoryPlayer
          title={`${panel.title} · ${panel.kicker.split("·")[0]?.trim()}`}
          slides={slidesFor(sel, panel)}
          onClose={() => setPlaying(false)}
        />
      ) : null}

      <section className="ex-sec" aria-labelledby="ex-roots">
        <h2 id="ex-roots">Stories to play</h2>
        <StoryRings />
      </section>

      <nav className="ex-learn" aria-label="More to explore">
        <Link to="/explore/numbers" className="ex-learn__card ex-learn__card--violet">
          <span className="ex-learn__k">Aṅka</span>
          <span className="ex-learn__t">Numerology</span>
          <span className="ex-learn__s">Root, destiny and name numbers</span>
        </Link>
        <Link to="/explore/chinese" className="ex-learn__card ex-learn__card--rose">
          <span className="ex-learn__k">Shēngxiào</span>
          <span className="ex-learn__t">Chinese zodiac</span>
          <span className="ex-learn__s">The Great Race and your animal</span>
        </Link>
      </nav>

      <details className="ex-browse">
        <summary>Browse everything as a list</summary>
        <h3>Navagraha</h3>
        <ul className="ex-grid ex-grid--graha">
          {GRAHA_LORE.map((g) => (
            <li key={g.id}>
              <Link to={`/explore/graha/${g.id}`} className="ex-tile">
                <GrahaGlyph id={g.id} size={44} />
                <span className="ex-tile__t">{g.name}</span>
                <span className="ex-tile__s">{g.english}</span>
              </Link>
            </li>
          ))}
        </ul>
        <h3>Rāśis</h3>
        <ul className="ex-grid ex-grid--rashi">
          {RASHI_LORE.map((r, i) => (
            <li key={r.name}>
              <Link to={`/explore/rashi/${i}`} className="ex-tile">
                <span className={`ex-signorb ex-signorb--sm ex-signorb--${ELEMENT_TONE[r.element]}`} aria-hidden="true">
                  {i + 1}
                </span>
                <span className="ex-tile__t">{r.name}</span>
                <span className="ex-tile__s">{r.western}</span>
              </Link>
            </li>
          ))}
        </ul>
        <h3>Nakṣatras</h3>
        <ol className="ex-naks">
          {NAKSHATRA_LORE.map((n, i) => (
            <li key={NAKSHATRA_NAMES[i]}>
              <Link to={`/explore/nakshatra/${i}`}>
                <span className="ex-naks__i">{i + 1}</span>
                <span className="ex-naks__t">{NAKSHATRA_NAMES[i]}</span>
                <span className="ex-naks__s">
                  {n.deity.split(",")[0]} · {n.symbol}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </details>
    </>
  );
}
export default function ExploreScreen() {
  const { kind, key } = useParams();
  const i = Number(key);
  let body: React.ReactNode;
  if (kind === "graha" && key && (GRAHA_IDS as readonly string[]).includes(key)) body = <GrahaDetail id={key as GrahaId} />;
  else if (kind === "rashi" && i >= 0 && i < 12) body = <RashiDetail i={i} />;
  else if (kind === "nakshatra" && i >= 0 && i < 27) body = <NakshatraDetail i={i} />;
  else if (kind === "numbers") body = <Numbers />;
  else if (kind === "chinese") body = <Chinese />;
  else body = <Hub />;
  return (
    <Screen className="explore" label="Explore the sky">
      {body}
    </Screen>
  );
}
