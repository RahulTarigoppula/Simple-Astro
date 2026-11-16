// The astrology behind a forecast, folded away: each fold has a plain summary and opens to the detail.
import { InfoDot } from "../../components/ui/Explain";
import { GrahaGlyph } from "../../components/ui/GrahaGlyph";
import { RASHI_LORE } from "../../data/lore";
import { CHAPTER_SHORT } from "../../data/traits";
import type { SkyEvent } from "../../engine/events";
import type { Forecast, ForecastLine, Period } from "../../engine/forecast";
import type { PersonalReading } from "../../engine/personal";
import { english, fmt, lore } from "./util";

function Fold({ title, sub, children }: { title: string; sub?: React.ReactNode; children: React.ReactNode }) {
  return (
    <details className="v-fold">
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

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function Lines({ lines }: { lines: ForecastLine[] }) {
  return (
    <ul className="fc-lines">
      {lines.map((l) => (
        <li key={l.graha}>
          <GrahaGlyph id={l.graha} size={32} />
          <span>{l.text}</span>
        </li>
      ))}
    </ul>
  );
}

export function TransitsFold({ lines }: { lines: ForecastLine[] }) {
  const good = lines.filter((l) => l.favourable);
  const care = lines.filter((l) => !l.favourable);
  return (
    <Fold
      title="What is helping and what needs care"
      sub={`${count(good.length, "planet helps", "planets help")} · ${count(care.length, "needs care", "need care")}`}
    >
      <h3 className="fc-h3 fc-h3--good">
        Working for you <InfoDot id="gochar" />
      </h3>
      {good.length ? (
        <Lines lines={good} />
      ) : (
        <p className="v-muted">No planet in a favourable house for this period. A time to rest and plan.</p>
      )}
      <h3 className="fc-h3 fc-h3--care">Go gently with</h3>
      {care.length ? <Lines lines={care} /> : <p className="v-muted">Nothing strained. Every listed planet is in a supportive house.</p>}
    </Fold>
  );
}

export function ContactsFold({ r }: { r: PersonalReading }) {
  if (!r.contacts.length) return null;
  const shown = r.contacts.slice(0, 5);
  return (
    <Fold title="Planets touching your birth chart" sub="Planets in the sky now sitting on planets you were born with">
      <ul className="fc-lines">
        {shown.map((c) => (
          <li key={`${c.transit}-${c.natal}`}>
            <span className="fc-pair" aria-hidden="true">
              <GrahaGlyph id={c.transit} size={32} />
              {c.natal === "LAGNA" ? <span className="fc-badge">Lg</span> : <GrahaGlyph id={c.natal} size={32} />}
            </span>
            <span>{c.text}</span>
          </li>
        ))}
      </ul>
    </Fold>
  );
}

export function StrengthFold({ r }: { r: PersonalReading }) {
  const top = [...r.strength].sort((a, b) => b.bindus - a.bindus)[0];
  return (
    <Fold title="How well each planet travels for you" sub="Points out of 8 your chart gives each planet where it is now">
      <ul className="fc-strength">
        {r.strength.map((s) => (
          <li key={s.graha} data-tone={s.bindus >= 5 ? "bright" : s.bindus <= 3 ? "mixed" : "steady"}>
            <span className="fc-strength__t">{english(s.graha)}</span>
            <span className="v-meter" aria-hidden="true">
              <span style={{ width: `${(s.bindus / 8) * 100}%` }} />
            </span>
            <span className="fc-strength__n">
              {s.bindus} of 8 · {s.bindus >= 5 ? "strong" : s.bindus <= 3 ? "weak" : "average"}
            </span>
          </li>
        ))}
      </ul>
      {top ? <p>{top.text}</p> : null}
      <p className="v-small v-muted">
        The points come from your own birth chart (aṣṭakavarga, BPHS ch. 66) <InfoDot id="ashtakavarga" />
      </p>
    </Fold>
  );
}

const LEVEL = { MD: "Chapter", AD: "Sub-chapter", PD: "Phase" } as const;

export function DashaFold({ dasha, zone }: { dasha: Forecast["dasha"]; zone: string }) {
  if (!dasha.length) return null;
  const date = (ms: number) => fmt(ms, zone, { day: "numeric", month: "short", year: "numeric" });
  const md = dasha.find((d) => d.level === "MD");
  return (
    <Fold title="Your life chapter" sub={md ? `${english(md.lord)}'s chapter: ${CHAPTER_SHORT[md.lord]}` : undefined}>
      <p className="v-small v-muted">
        Tradition divides a life into planet-ruled chapters (daśā). These run in this period. <InfoDot id="dasha" />
      </p>
      <ol className="fc-lines">
        {dasha.map((d) => (
          <li key={`${d.level}-${d.startMs}`} className={d.level === "MD" ? undefined : "fc-lines__sub"}>
            <GrahaGlyph id={d.lord} size={32} />
            <span>
              <strong>
                {LEVEL[d.level]}: {english(d.lord)} ({lore(d.lord)?.name})
              </strong>
              <span className="fc-lines__s">
                {date(d.startMs)} to {date(d.endMs)} · its theme: {CHAPTER_SHORT[d.lord]}.
              </span>
            </span>
          </li>
        ))}
      </ol>
    </Fold>
  );
}

type Sade = Forecast["sadeSati"];
/** Plain name first, the traditional one after. */
export function saturnName(s: Sade): string {
  return s === "kantaka" ? "Kaṇṭaka Śani" : s === "ashtama" ? "Aṣṭama Śani" : `Sāḍe Sātī, ${s} phase`;
}

export function SaturnFold({ sade }: { sade: Sade }) {
  if (sade === "none") return null;
  return (
    <Fold title="Your Saturn season" sub={saturnName(sade)}>
      <div className="fc-saturn">
        <GrahaGlyph id="SA" size={40} />
        <p>
          {sade === "kantaka"
            ? "Saturn is in a 'thorn' house (4th, 7th or 10th) from your Moon. Tradition reads extra effort at home, in partnerships or at work."
            : sade === "ashtama"
              ? "Saturn is in the 8th from your Moon, a stretch tradition associates with slow, deep change."
              : "Saturn is passing over your Moon sign's neighbourhood: a 7½-year season of responsibility and maturing. Everyone meets it about every 30 years."}{" "}
          <InfoDot id="sade-sati" />
        </p>
      </div>
    </Fold>
  );
}

function eventText(e: SkyEvent): string {
  const g = e.graha ? lore(e.graha) : undefined;
  const sign = e.sign !== undefined ? RASHI_LORE[e.sign] : undefined;
  switch (e.kind) {
    case "full":
      return "Full Moon (Pūrṇimā)";
    case "new":
      return "New Moon (Amāvasyā)";
    case "ekadashi":
      return `${e.shukla ? "Śukla" : "Kṛṣṇa"} Ekādaśī begins`;
    case "lunar-eclipse":
      return `${e.eclipse} lunar eclipse${e.visibleHere ? " (visible here)" : " (not visible here)"}`;
    case "solar-eclipse":
      return `${e.eclipse} solar eclipse${e.visibleHere ? " (visible here)" : " (not visible here)"}`;
    case "sankranti":
      return `Sun enters ${sign?.name} (${sign?.western})`;
    case "ingress":
      return `${g?.english} enters ${sign?.name} (${sign?.western})`;
    case "station":
      return `${g?.english} turns ${e.retro ? "retrograde" : "direct"}`;
  }
}

function keepEvent(p: Period, e: SkyEvent): boolean {
  if (p === "year")
    return e.kind.endsWith("eclipse") || ((e.kind === "ingress" || e.kind === "station") && ["JU", "SA", "RA"].includes(e.graha ?? ""));
  if (p === "quarter") return e.kind !== "ekadashi" && !(e.kind === "ingress" && e.graha === "ME");
  return true;
}

export function EventsFold({ f, zone }: { f: Forecast; zone: string }) {
  const events = f.events.filter((e) => keepEvent(f.period, e)).slice(0, 24);
  if (!events.length) return null;
  return (
    <Fold title={`In the sky this ${f.period}`} sub={count(events.length, "event", "events")}>
      <ul className="fc-events">
        {events.map((e) => (
          <li key={`${e.kind}-${e.ms}-${e.graha ?? ""}`}>
            <span className="fc-events__d">{fmt(e.ms, zone, { day: "numeric", month: "short" })}</span>
            <span>{eventText(e)}</span>
          </li>
        ))}
      </ul>
    </Fold>
  );
}

export function MethodFold({ name, moonSign }: { name: string; moonSign: string }) {
  return (
    <Fold title="How this is read" sub="The method, and a word on karma">
      <p>
        Read the classical way: where the planets are, counted from {name}'s Moon sign{moonSign ? ` (${moonSign})` : ""}, plus the running
        life chapter (daśā). <InfoDot id="gochar" />
      </p>
      <p>
        Each planet's house is counted from the natal Moon sign and checked against the classical table of favourable houses (Phaladīpikā
        ch. 26); days add the Moon's Tārā-bala and Candra-bala. It is a traditional reading for reflection. It is not a prediction of events
        and not advice.
      </p>
      <div className="v-note fc-karma">
        <p>
          <strong>Karma, not fate.</strong> A forecast shows what <em>could</em> happen, like the weather. What does happen is shaped by
          your karma: your own choices and actions. Use this to reflect and plan, never to fear.
        </p>
      </div>
    </Fold>
  );
}
