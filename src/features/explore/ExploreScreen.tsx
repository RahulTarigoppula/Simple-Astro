// Explore: the library of the sky. The hub is one list (planets, signs, stars, numbers, the Chinese
// zodiac, the stories, the almanac, the wheel); each list page is plain rows; each detail page says
// what the thing stands for in one paragraph, where it is now and its facts, with the rest folded.
import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router";
import { useActiveProfile, usePatri, useProfiles, useSettings } from "../../app/hooks";
import { useNowMs } from "../../app/useNow";
import { InfoDot } from "../../components/ui/Explain";
import { GrahaGlyph } from "../../components/ui/GrahaGlyph";
import { ChevronLeft, ChevronRight, Page, Row, Section } from "../../components/ui/Page";
import { StoryPlayer } from "../../components/ui/StoryPlayer";
import { GRAHA_LORE, NAKSHATRA_LORE, RASHI_LORE } from "../../data/lore";
import { nakBoth, rashiBoth } from "../../data/regional";
import { EXALTATION, naturalRelation, OWN_SIGNS } from "../../data/tables/dignity";
import { GANA_BY_NAK, GANA_LABEL, YONI_BY_NAK, YONI_LABEL } from "../../data/tables/koota";
import { NAK_LORDS, NAKSHATRA_DEV, NAKSHATRA_NAMES, SIGN_MARK } from "../../data/tables/names";
import { transitsAt } from "../../engine/gochar";
import { mulberry32 } from "../../engine/math";
import { birthNumbers, CHINESE_ANIMALS, chineseZodiac, NUMBER_GRAHA, nameNumber, personalYear } from "../../engine/profile";
import { GRAHA_IDS, type GrahaId } from "../../engine/types";
import { countEvent } from "../../platform/stats";
import { IconMoon, IconNumbers, IconSky, IconStory, IconToday } from "../chowki/icons";
import { SkyWheel, type WheelSel } from "./SkyWheel";
import { StarPatch } from "./StarPatch";
import { panelFor, slidesFor } from "./skyStories";
import "./explore.css";
import "./wheel.css";

const lore = (id: GrahaId) => GRAHA_LORE.find((g) => g.id === id);
const NAK_SPAN = 360 / 27;
const cap = (s: string) => (s ? (s[0]?.toUpperCase() ?? "") + s.slice(1) : s);
/** The zodiac mark as text, never as a colour emoji. */
const signMark = (i: number) => `${SIGN_MARK[i] ?? ""}︎`;

function useSky() {
  const settings = useSettings();
  const now = useNowMs(10 * 60_000);
  return useMemo(() => transitsAt(now, settings.preset), [now, settings.preset]);
}

// ── shared pieces ─────────────────────────────────────────────────────────
/** A round disc holding a sign's mark, a star's number or a count. */
function Disc({ children, big }: { children: React.ReactNode; big?: boolean }) {
  return (
    <span className={`ex-disc${big ? " ex-disc--big" : ""}`} aria-hidden="true">
      {children}
    </span>
  );
}

/** The top of a detail page: the English name large, the Sanskrit small, the picture beside it. */
function Head({
  art,
  eyebrow,
  title,
  small,
  lead,
}: {
  art?: React.ReactNode;
  eyebrow: React.ReactNode;
  title: string;
  small?: React.ReactNode;
  lead?: React.ReactNode;
}) {
  return (
    <header className="ex-head">
      <div className="ex-head__top">
        <div className="ex-head__text">
          <p className="v-eyebrow">{eyebrow}</p>
          <h1 className="v-title">{title}</h1>
          {small ? <p className="ex-head__small">{small}</p> : null}
        </div>
        {art ? <span className="ex-head__art">{art}</span> : null}
      </div>
      {lead ? <p className="ex-lead">{lead}</p> : null}
    </header>
  );
}

function Card({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="v-card ex-card">
      <h2 className="v-card__title">{title}</h2>
      {children}
    </section>
  );
}

function Fold({ title, sub, children }: { title: React.ReactNode; sub?: React.ReactNode; children: React.ReactNode }) {
  return (
    <details className="v-fold ex-fold">
      <summary>
        <span>
          {title}
          {sub ? <span className="v-fold__s">{sub}</span> : null}
        </span>
      </summary>
      <div className="v-fold__body">{children}</div>
    </details>
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

function Chips({ items, label }: { items: Array<{ to: string; text: string }>; label: string }) {
  return (
    <ul className="ex-chips" aria-label={label}>
      {items.map((it) => (
        <li key={it.to}>
          <Link to={it.to} className="ex-chip">
            {it.text}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Pager({ prev, next }: { prev: { to: string; text: string }; next: { to: string; text: string } }) {
  return (
    <nav className="ex-pager" aria-label="Previous and next">
      <Link to={prev.to} className="ex-pager__a">
        <ChevronLeft />
        <span>
          <span className="ex-pager__k">Previous</span>
          {prev.text}
        </span>
      </Link>
      <Link to={next.to} className="ex-pager__a">
        <span>
          <span className="ex-pager__k">Next</span>
          {next.text}
        </span>
        <ChevronRight size={20} />
      </Link>
    </nav>
  );
}

function Dev({ children }: { children: string | undefined }) {
  return children ? (
    <span lang="hi" className="ex-dev">
      {children}
    </span>
  ) : null;
}

// ── detail: a planet ──────────────────────────────────────────────────────
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
  const at = GRAHA_LORE.findIndex((x) => x.id === id);
  const prev = GRAHA_LORE[(at + GRAHA_LORE.length - 1) % GRAHA_LORE.length];
  const next = GRAHA_LORE[(at + 1) % GRAHA_LORE.length];
  return (
    <Page label={`${g.english}: the planet ${g.name}`} back="/explore/graha" backLabel="Planets">
      <Head
        art={<GrahaGlyph id={id} size={76} />}
        eyebrow={`Planet · ${g.title}`}
        title={g.english}
        small={
          <>
            {g.name} <Dev>{g.dev}</Dev> <InfoDot id="graha" />
          </>
        }
        lead={`${cap(g.signifies)}.`}
      />
      <Card title="Where it is right now">
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
      </Card>
      <Card title="In the tradition">
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
      </Card>
      <Fold title="The story">
        <p className="ex-prose">{g.myth}</p>
      </Fold>
      <Fold title="The real sky">
        <p className="ex-prose">{g.real}</p>
      </Fold>
      <Fold title="Its three birth stars">
        <p className="v-muted">Each graha rules three nakṣatras; they set the order of the daśā life chapters.</p>
        <Chips label={`Birth stars ruled by ${g.english}`} items={naks.map(({ n, i }) => ({ to: `/explore/nakshatra/${i}`, text: n }))} />
      </Fold>
      {prev && next ? (
        <Pager
          prev={{ to: `/explore/graha/${prev.id}`, text: prev.english }}
          next={{ to: `/explore/graha/${next.id}`, text: next.english }}
        />
      ) : null}
    </Page>
  );
}

// ── detail: a sign ────────────────────────────────────────────────────────
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
  const p = (i + 11) % 12;
  const n = (i + 1) % 12;
  return (
    <Page label={`${r.western}: the sign ${r.name}`} back="/explore/rashi" backLabel="Signs">
      <Head
        art={<Disc big>{signMark(i)}</Disc>}
        eyebrow={
          <>
            Sign {i + 1} of 12 <InfoDot id="rashi" />
          </>
        }
        title={r.western}
        small={
          <>
            {r.name} <Dev>{r.dev}</Dev> · {r.symbol}
          </>
        }
        lead={`${cap(r.nature)}.`}
      />
      <Card title="Who is here right now">
        <p>
          <strong>Now:</strong> {here.length ? here.map((g) => lore(g)?.english).join(", ") : "no graha is in this sign right now"}.
        </p>
        {active && patri ? (
          <p>
            <strong>In {active.name}'s chart:</strong> {mineHere.length ? mineHere.map((g) => lore(g)?.english).join(", ") : "empty"}
            {patri.lagna.sign === i ? ", and it is the rising sign" : ""}.
          </p>
        ) : null}
      </Card>
      <Card title="In the tradition">
        <Facts
          rows={[
            ["Element", r.element],
            ["Quality", `${r.quality}: ${r.quality === "Movable" ? "starts things" : r.quality === "Fixed" ? "holds steady" : "adapts"}`],
            ["Ruled by", <Link key="r" to={`/explore/graha/${r.ruler}`}>{`${lore(r.ruler)?.english} (${lore(r.ruler)?.name})`}</Link>],
            ["Body (Kāla-puruṣa)", r.body],
            ["Western sign", `${r.western}, about 24° ahead of this sidereal sign`],
          ]}
        />
      </Card>
      <Fold title="The real sky">
        <StarPatch from={i * 30} span={30} lat={24} label={`The real stars of ${r.name}`} />
      </Fold>
      <Fold title="Birth stars in this sign">
        <Chips
          label={`Birth stars in ${r.western}`}
          items={naks.map((k) => ({ to: `/explore/nakshatra/${k}`, text: NAKSHATRA_NAMES[k] ?? "" }))}
        />
      </Fold>
      <Pager
        prev={{ to: `/explore/rashi/${p}`, text: RASHI_LORE[p]?.western ?? "" }}
        next={{ to: `/explore/rashi/${n}`, text: RASHI_LORE[n]?.western ?? "" }}
      />
    </Page>
  );
}

// ── detail: a birth star ──────────────────────────────────────────────────
function NakshatraDetail({ i }: { i: number }) {
  const n = NAKSHATRA_LORE[i];
  const sky = useSky();
  if (!n) return null;
  const name = NAKSHATRA_NAMES[i] ?? "";
  const lord = NAK_LORDS[i % 9] ?? "KE";
  const a = i * NAK_SPAN;
  const s0 = Math.floor(a / 30);
  const s1 = Math.floor((a + NAK_SPAN - 0.001) / 30);
  const dms = (x: number) => `${Math.floor(x % 30)}°${String(Math.round(((x % 30) % 1) * 60)).padStart(2, "0")}′`;
  const here = GRAHA_IDS.filter((g) => sky[g].nakshatra === i);
  return (
    <Page label={`The birth star ${name}`} back="/explore/nakshatra" backLabel="Stars">
      <Head
        art={<Disc big>{i + 1}</Disc>}
        eyebrow={
          <>
            Birth star {i + 1} of 27 <InfoDot id="nakshatra" />
          </>
        }
        title={name}
        small={
          <>
            <Dev>{NAKSHATRA_DEV[i]}</Dev> “{n.meaning}” · {n.symbol}
          </>
        }
        lead={
          <>
            Presided over by <strong>{n.deity}</strong>. {n.story}
          </>
        }
      />
      <Card title="Who is here right now">
        {sky.MO.nakshatra === i ? <p>The Moon is in {name} right now.</p> : null}
        <p>
          <strong>Now:</strong> {here.length ? here.map((g) => lore(g)?.english).join(", ") : "no graha is in this star right now"}.
        </p>
      </Card>
      <Card title="In the tradition">
        <Facts
          rows={[
            ["Ruling graha", <Link key="l" to={`/explore/graha/${lord}`}>{`${lore(lord)?.english} (${lore(lord)?.name})`}</Link>],
            ["Gaṇa (nature)", GANA_LABEL[GANA_BY_NAK[i] ?? "deva"]],
            ["Yoni (animal)", YONI_LABEL[YONI_BY_NAK[i] ?? "horse"]],
            ["Stars", n.star],
            [
              "Span",
              `${RASHI_LORE[s0]?.name} ${dms(a)} → ${RASHI_LORE[s1]?.name} ${dms(a + NAK_SPAN) === "0°00′" ? "30°00′" : dms(a + NAK_SPAN)}`,
            ],
          ]}
        />
        <p className="v-small v-muted">
          Gaṇa and yoni are used in Guna Milan matching <InfoDot id="guna-milan" />.
        </p>
      </Card>
      <Fold title="The real sky">
        <StarPatch from={a} span={NAK_SPAN} lat={32} label={`The real stars of ${name}`} />
      </Fold>
      <Pager
        prev={{ to: `/explore/nakshatra/${(i + 26) % 27}`, text: NAKSHATRA_NAMES[(i + 26) % 27] ?? "" }}
        next={{ to: `/explore/nakshatra/${(i + 1) % 27}`, text: NAKSHATRA_NAMES[(i + 1) % 27] ?? "" }}
      />
    </Page>
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
  const card = (label: string, small: string | null, v: number, how: string) => {
    const g = NUMBER_GRAHA[v as 1];
    return (
      <li className="ex-num" key={label}>
        <span className="ex-num__n" aria-hidden="true">
          {v}
        </span>
        <div>
          <p className="ex-num__k">
            {label}
            {small ? <span className="ex-num__small"> · {small}</span> : null}
          </p>
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
      </li>
    );
  };
  const n = p ? birthNumbers(p.birth.localY, p.birth.localMo, p.birth.localD) : null;
  const nm = p ? nameNumber(p.name) : null;
  const nq = q ? birthNumbers(q.birth.localY, q.birth.localMo, q.birth.localD) : null;
  const rel = n && nq ? naturalRelation(NUMBER_GRAHA[n.root as 1], NUMBER_GRAHA[nq.root as 1]) : null;
  return (
    <Page label="Numerology: your numbers" back="/explore" backLabel="Explore">
      <Head
        eyebrow="Numerology · Aṅka Jyotiṣa"
        title="Your numbers"
        lead="Each digit 1-9 belongs to a graha. Just for fun. There is no scientific basis."
      />
      {profiles && profiles.length > 1 ? (
        <div className="v-seg" role="group" aria-label="Whose numbers">
          {profiles.map((x) => (
            <button key={x.id} type="button" aria-pressed={x.id === p?.id} onClick={() => setPid(x.id)}>
              {x.name}
            </button>
          ))}
        </div>
      ) : null}
      {p && n && nm ? (
        <ul className="v-list ex-nums" aria-label={`${p.name}'s numbers`}>
          {card(
            "Root number",
            "Mūlāṅka",
            n.root,
            `From the day of birth, ${p.birth.localD}, added to one digit. Said to show your nature.`,
          )}
          {card(
            "Destiny number",
            "Bhāgyāṅka",
            n.destiny,
            `From every digit of ${p.birth.localD}/${p.birth.localMo}/${p.birth.localY}. Said to show your path.`,
          )}
          {card(
            "Name number",
            null,
            nm.single,
            `"${p.name}" by the Chaldean letter values: ${nm.compound} → ${nm.single}. Said to show how others see you.`,
          )}
          {card(
            `Personal year ${year}`,
            null,
            personalYear(p.birth.localMo, p.birth.localD, year),
            `Birthday + month + ${year}, reduced. The theme of this year, birthday to birthday.`,
          )}
        </ul>
      ) : (
        <div className="v-card v-empty">
          <p>Add a person to see their numbers.</p>
          <Link to="/leaf/new" className="v-btn">
            Add a person
          </Link>
        </div>
      )}
      {p && n && profiles && profiles.length > 1 ? (
        <Fold title="Number friendship" sub="Compare two people's root numbers">
          <p className="v-muted">Compare root numbers through their grahas' classical friendships.</p>
          <div className="v-seg" role="group" aria-label={`Compare ${p.name} with`}>
            {profiles
              .filter((x) => x.id !== p.id)
              .map((x) => (
                <button key={x.id} type="button" aria-pressed={x.id === other} onClick={() => setOther(x.id)}>
                  {x.name}
                </button>
              ))}
          </div>
          {q && nq && rel ? (
            <p className="ex-lead" aria-live="polite">
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
        </Fold>
      ) : null}
      <Fold title="Why 108?">
        <p className="ex-prose">
          108 = 27 nakṣatras × 4 padas = 12 signs × 9 grahas. It's why a mālā has 108 beads, and why so many prayers are said 108 times.
          Pythagoras taught that "all is number" around 530 BCE; Indian numerology joined that idea to the nine grahas.
        </p>
        <Link to="/story" className="v-link ex-more">
          Read the whole story <ChevronRight size={16} />
        </Link>
      </Fold>
    </Page>
  );
}

// ── Chinese zodiac ────────────────────────────────────────────────────────
function Chinese() {
  const profiles = useProfiles();
  return (
    <Page label="The Chinese zodiac" back="/explore" backLabel="Explore">
      <Head
        eyebrow="Chinese zodiac · Shēngxiào"
        title="The twelve animals"
        lead="A neighbouring tradition: one animal per lunar year, in a 12-year cycle with five elements."
      />
      <Card title="Your circle">
        {profiles?.length ? (
          <Facts
            rows={profiles.map((p) => {
              const c = chineseZodiac(p.birth.utcMs);
              return [p.name, `${c.element} ${c.animal} (${c.yin ? "yin" : "yang"}), lunar year ${c.year}`];
            })}
          />
        ) : (
          <p className="v-muted">No one saved yet.</p>
        )}
        <p className="v-small v-muted">
          The year starts at Chinese New Year (a new moon between 21 January and 20 February), not on 1 January, so early-year birthdays
          often belong to the previous animal.
        </p>
      </Card>
      <Fold title="The Great Race" sub="How the animals won their order">
        <p className="ex-prose">
          The Jade Emperor called all the animals to a race across a great river; the order they arrived would name the years. The clever
          Rat rode on the Ox's back and leapt ashore first. The Ox came second, then the Tiger, the Rabbit hopping across stones, the Dragon
          (who stopped to bring rain), the Horse (startled at the bank by the Snake hidden on its hoof), the Goat, Monkey and Rooster
          sharing a raft, the Dog who stopped to bathe, and last the Pig, who had stopped to eat and nap.
        </p>
      </Fold>
      <Fold title="The cycle" sub="The twelve animals in order">
        <ol className="ex-cycle">
          {CHINESE_ANIMALS.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ol>
      </Fold>
    </Page>
  );
}

// ── lists: planets, signs, stars ──────────────────────────────────────────
const mark = (text: string | null) => (text ? <span className="v-chip">{text}</span> : undefined);

function ListPage({ kind }: { kind: "graha" | "rashi" | "nakshatra" }) {
  const sky = useSky();
  const active = useActiveProfile();
  const settings = useSettings();
  const { patri: p } = usePatri(active, settings.preset);
  const patri = p && active && p.profileId === active.id ? p : null;
  if (kind === "graha")
    return (
      <Page
        label="The nine planets"
        title="The nine planets"
        lede={
          <>
            Seven you can see, and the two shadow points where eclipses happen. <InfoDot id="graha" />
          </>
        }
        back="/explore"
        backLabel="Explore"
      >
        <ul className="v-list ex-list">
          {GRAHA_LORE.map((g) => (
            <li key={g.id}>
              <Row
                to={`/explore/graha/${g.id}`}
                icon={<GrahaGlyph id={g.id} size={42} />}
                title={g.english}
                sub={
                  <>
                    {g.name} <Dev>{g.dev}</Dev> · {g.title}
                  </>
                }
              />
            </li>
          ))}
        </ul>
      </Page>
    );
  if (kind === "rashi")
    return (
      <Page
        label="The twelve signs"
        title="The twelve signs"
        lede={
          <>
            Twelve equal slices of the sky that the Sun, Moon and planets travel through. <InfoDot id="rashi" />
          </>
        }
        back="/explore"
        backLabel="Explore"
      >
        <ol className="v-list ex-list">
          {RASHI_LORE.map((r, i) => (
            <li key={r.name}>
              <Row
                to={`/explore/rashi/${i}`}
                icon={<span className="ex-glyph">{signMark(i)}</span>}
                title={r.western}
                sub={
                  <>
                    {r.name} <Dev>{r.dev}</Dev>
                  </>
                }
                end={mark(
                  patri?.grahas.MO.sign === i
                    ? "Moon sign"
                    : patri?.lagna.sign === i
                      ? "Rising sign"
                      : sky.MO.sign === i
                        ? "Moon is here"
                        : null,
                )}
              />
            </li>
          ))}
        </ol>
      </Page>
    );
  return (
    <Page
      label="The 27 birth stars"
      title="The 27 birth stars"
      lede={
        <>
          The Moon visits one each day. The one it was in when you were born is your birth star. <InfoDot id="nakshatra" />
        </>
      }
      back="/explore"
      backLabel="Explore"
    >
      <ol className="v-list ex-list">
        {NAKSHATRA_LORE.map((n, i) => (
          <li key={NAKSHATRA_NAMES[i]}>
            <Row
              to={`/explore/nakshatra/${i}`}
              icon={<span className="ex-glyph">{i + 1}</span>}
              title={NAKSHATRA_NAMES[i] ?? ""}
              sub={
                <>
                  <Dev>{NAKSHATRA_DEV[i]}</Dev> {n.symbol}
                </>
              }
              end={mark(patri?.grahas.MO.nakshatra === i ? "Birth star" : sky.MO.nakshatra === i ? "Moon is here" : null)}
            />
          </li>
        ))}
      </ol>
    </Page>
  );
}

// ── the sky wheel (optional, a way to wander) ─────────────────────────────
function Wheel() {
  const sky = useSky();
  const active = useActiveProfile();
  const settings = useSettings();
  const { patri: p } = usePatri(active, settings.preset);
  const patri = p && active && p.profileId === active.id ? p : null;
  const [sel, setSel] = useState<WheelSel>(() => ({ kind: "nak", i: sky.MO.nakshatra }));
  const [playing, setPlaying] = useState(false);
  const surprise = () => {
    countEvent("explore-surprise");
    // Seeded from the clock (no unseeded randomness anywhere in Vyomaphala).
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
    <Page
      label="The sky wheel"
      title="The sky wheel"
      lede="Turn the wheel, or tap any part of it, to read about a planet, a sign or a star."
      back="/explore"
      backLabel="Explore"
      wide
    >
      <div className="v-seg ex-kinds" role="group" aria-label="Choose a ring">
        {kinds.map(([k, label]) => (
          <button key={k} type="button" aria-pressed={sel.kind === k} onClick={() => pick(k)}>
            {label}
          </button>
        ))}
      </div>

      <div className="v-actions">
        {patri && active ? (
          <>
            <button
              type="button"
              className="v-btn v-btn--ghost v-btn--sm"
              onClick={() => setSel({ kind: "nak", i: patri.grahas.MO.nakshatra })}
            >
              {active.name}'s birth star
            </button>
            <button
              type="button"
              className="v-btn v-btn--ghost v-btn--sm"
              onClick={() => setSel({ kind: "rashi", i: patri.grahas.MO.sign })}
            >
              Moon sign
            </button>
            <button type="button" className="v-btn v-btn--ghost v-btn--sm" onClick={() => setSel({ kind: "rashi", i: patri.lagna.sign })}>
              Rising sign
            </button>
          </>
        ) : null}
        <button type="button" className="v-btn v-btn--quiet v-btn--sm" onClick={surprise}>
          Surprise me
        </button>
      </div>

      <div className="ex-stage">
        <SkyWheel
          key={`${sel.kind}`}
          sky={sky}
          sel={sel}
          onSelect={setSel}
          onPlay={() => setPlaying(true)}
          natalMoon={patri?.grahas.MO.sign}
        />
        <article className="v-card ex-panel" aria-live="polite" key={JSON.stringify(sel)}>
          <div className="ex-panel__art">{panel.art}</div>
          <div className="ex-panel__head">
            <p className="ex-panel__k">{panel.kicker}</p>
            <h2 className="ex-panel__t">{panel.title}</h2>
            {panel.small || panel.dev ? (
              <p className="ex-panel__small">
                {panel.small} <Dev>{panel.dev}</Dev>
              </p>
            ) : null}
          </div>
          <p className="ex-lead">{panel.tagline}</p>
          {panel.now || panel.mine ? (
            <div className="ex-panel__now">
              {panel.now ? <p>{panel.now}</p> : null}
              {panel.mine ? <p>{panel.mine}</p> : null}
            </div>
          ) : null}
          <div className="v-actions">
            <button
              type="button"
              className="v-btn v-btn--sm"
              onClick={() => {
                countEvent("explore-play-story");
                setPlaying(true);
              }}
            >
              Play its story
            </button>
            <Link to={panel.to} className="v-btn v-btn--ghost v-btn--sm">
              Full page
            </Link>
          </div>
          <details className="ex-panel__more">
            <summary>Story and facts</summary>
            <p className="ex-prose">{panel.story}</p>
            <Facts rows={panel.facts} />
          </details>
        </article>
      </div>

      {playing ? (
        <StoryPlayer
          title={`${panel.small ?? panel.title} · ${panel.kicker.split("·")[0]?.trim()}`}
          slides={slidesFor(sel, panel)}
          onClose={() => setPlaying(false)}
        />
      ) : null}
    </Page>
  );
}

// ── hub: one calm list ────────────────────────────────────────────────────
function Hub() {
  const sky = useSky();
  const active = useActiveProfile();
  const settings = useSettings();
  const { patri: p } = usePatri(active, settings.preset);
  const patri = p && active && p.profileId === active.id ? p : null;
  const num = (n: React.ReactNode) => <span className="ex-glyph">{n}</span>;
  return (
    <Page label="Explore the sky" title="Explore" lede="Every planet, sign and star has a story. Pick one to read.">
      <ul className="v-list" aria-label="The sky">
        <li>
          <Row to="/explore/graha" icon={num(9)} title="Planets" sub="The Sun, the Moon and the seven others" />
        </li>
        <li>
          <Row to="/explore/rashi" icon={num(12)} title="Signs" sub="Aries to Pisces, the Indian way" />
        </li>
        <li>
          <Row
            to="/explore/nakshatra"
            icon={num(27)}
            title="Stars"
            sub={`The birth stars. The Moon is in ${NAKSHATRA_NAMES[sky.MO.nakshatra]} now`}
          />
        </li>
        <li>
          <Row to="/explore/numbers" icon={<IconNumbers />} title="Numbers" sub="What a birth date and a name add up to" />
        </li>
        <li>
          <Row to="/explore/chinese" icon={num(<span lang="zh">十二</span>)} title="Chinese zodiac" sub="The Great Race and your animal" />
        </li>
        <li>
          <Row to="/story" icon={<IconStory />} title="The story of the stars" sub="How Indian astrology began" />
        </li>
        <li>
          <Row to="/today" icon={<IconToday />} title="Today's almanac" sub="The Hindu calendar for today" />
        </li>
        <li>
          <Row to="/explore/wheel" icon={<IconSky />} title="The sky wheel" sub="Turn the whole sky and tap any part of it" />
        </li>
      </ul>

      {patri && active ? (
        <>
          <Section title={`${active.name}'s own sky`} note="Three places to start" />
          <ul className="v-list" aria-label={`${active.name}'s own sky`}>
            <li>
              <Row
                to={`/explore/rashi/${patri.grahas.MO.sign}`}
                icon={<IconMoon />}
                title={`${RASHI_LORE[patri.grahas.MO.sign]?.western} · ${rashiBoth(patri.grahas.MO.sign, active.tradition)}`}
                sub="Moon sign"
              />
            </li>
            <li>
              <Row
                to={`/explore/nakshatra/${patri.grahas.MO.nakshatra}`}
                icon={<IconSky />}
                title={nakBoth(patri.grahas.MO.nakshatra, active.tradition)}
                sub="Birth star"
              />
            </li>
            <li>
              <Row
                to={`/explore/rashi/${patri.lagna.sign}`}
                icon={
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M12 19V5M6 11l6-6 6 6M4 21h16" />
                  </svg>
                }
                title={`${RASHI_LORE[patri.lagna.sign]?.western} · ${rashiBoth(patri.lagna.sign, active.tradition)}`}
                sub="Rising sign"
              />
            </li>
          </ul>
        </>
      ) : null}
    </Page>
  );
}

export default function ExploreScreen() {
  const { kind, key } = useParams();
  const i = Number(key);
  if (kind === undefined) return <Hub />;
  if (key === undefined) {
    if (kind === "graha" || kind === "rashi" || kind === "nakshatra") return <ListPage kind={kind} />;
    if (kind === "numbers") return <Numbers />;
    if (kind === "chinese") return <Chinese />;
    if (kind === "wheel") return <Wheel />;
  } else {
    if (kind === "graha" && (GRAHA_IDS as readonly string[]).includes(key)) return <GrahaDetail id={key as GrahaId} />;
    if (kind === "rashi" && Number.isInteger(i) && i >= 0 && i < 12) return <RashiDetail i={i} />;
    if (kind === "nakshatra" && Number.isInteger(i) && i >= 0 && i < 27) return <NakshatraDetail i={i} />;
  }
  return <Navigate to="/explore" replace />;
}
