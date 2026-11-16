// The good and bad slots (Choghaḍiyā) and the planet hours (Horā) as plain lists, day and night, on
// the place's clock. The running period says "now" in words; quality is a word plus a mark, never
// colour alone.
import { InfoDot } from "../../components/ui/Explain";
import { GRAHA_DEV, GRAHA_ENGLISH, GRAHA_NAMES } from "../../data/tables/names";
import { CHOGHADIYA_CITATION, HORA_CITATION } from "../../engine/muhurta";
import type { Choghadiya, Citation, Hora, MuhurtaQuality } from "../../engine/types";
import type { ZoneClock } from "./zone";

export const QUALITY_TEXT: Record<MuhurtaQuality, string> = { good: "good", neutral: "neutral", bad: "bad" };
const QUALITY_CHIP: Record<MuhurtaQuality, string> = { good: "v-chip--good", neutral: "", bad: "v-chip--care" };

export function QualityMark({ q }: { q: MuhurtaQuality }) {
  return (
    <svg className="alm-qmark" viewBox="0 0 12 12" aria-hidden="true" data-decorative="true">
      {q === "good" ? <path d="M2.4 6.4l2.4 2.4 4.8-5.4" /> : null}
      {q === "neutral" ? <path d="M2.6 6h6.8" /> : null}
      {q === "bad" ? <path d="M2.6 2.6l6.8 6.8M9.4 2.6l-6.8 6.8" /> : null}
    </svg>
  );
}

/** "9:14 pm to 10:44 pm", with "(next day)" once the period has crossed into the next civil day. */
export function spanLabel(clock: ZoneClock, a: number, b: number, dayMs: number): string {
  const dd = clock.dayNumber(b - 1) - clock.dayNumber(dayMs);
  return `${clock.hm12(a)} to ${clock.hm12(b)}${dd > 0 ? " (next day)" : ""}`;
}

interface Item {
  key: string;
  name: React.ReactNode;
  aside?: React.ReactNode;
  range: string;
  now: boolean;
}

function PeriodList({ title, meta, label, items }: { title: string; meta: string; label: string; items: Item[] }) {
  return (
    <div className="v-stack">
      <h3 className="alm-sub">
        {title} <span className="alm-sub__meta">{meta}</span>
      </h3>
      <ol className="v-list alm-periods" aria-label={label}>
        {items.map((it) => (
          <li key={it.key} className={it.now ? "is-now" : undefined} aria-current={it.now ? "time" : undefined}>
            {it.aside ? <span className="alm-periods__aside">{it.aside}</span> : null}
            <span className="alm-periods__name">
              {it.name}
              {it.now ? <span className="v-chip v-chip--gold">now</span> : null}
            </span>
            <span className="alm-periods__t">{it.range}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Cite({ c, children }: { c: Citation; children: React.ReactNode }) {
  return (
    <p className="v-small v-muted">
      {children}{" "}
      <cite>
        ({c.text}, {c.ref})
      </cite>
    </p>
  );
}

const inside = (nowMs: number | null, a: number, b: number): boolean => nowMs !== null && nowMs >= a && nowMs < b;

interface PanelProps {
  clock: ZoneClock;
  dayMs: number;
  /** The present instant when the day on show is today, else null. */
  nowMs: number | null;
}

export function ChoghadiyaPanel({ day, night, clock, dayMs, nowMs }: PanelProps & { day: Choghadiya[]; night: Choghadiya[] }) {
  const items = (list: Choghadiya[]): Item[] =>
    list.map((c) => ({
      key: `${c.half}${c.part}`,
      name: (
        <>
          {c.name}{" "}
          <span lang="hi" className="alm-dev">
            {c.dev}
          </span>
        </>
      ),
      aside: (
        <span className={`v-chip ${QUALITY_CHIP[c.quality]}`}>
          <QualityMark q={c.quality} /> {QUALITY_TEXT[c.quality]}
        </span>
      ),
      range: spanLabel(clock, c.startMs, c.endMs, dayMs),
      now: inside(nowMs, c.startMs, c.endMs),
    }));
  return (
    <section className="v-stack" aria-labelledby="chog-h">
      <h2 id="chog-h" className="alm-h">
        Good and bad slots
        <span className="alm-h__note">
          The day and the night, each cut into eight parts · Choghaḍiyā <InfoDot id="choghadiya" />
        </span>
      </h2>
      <div className="v-cols">
        <PeriodList title="Day" meta="sunrise to sunset" label="Day choghaḍiyā" items={items(day)} />
        <PeriodList title="Night" meta="sunset to sunrise" label="Night choghaḍiyā" items={items(night)} />
      </div>
      <Cite c={CHOGHADIYA_CITATION}>
        The day opens with the weekday lord's part and the night with the fifth weekday's. Amṛta, Śubha and Lābha are read as good, Cara as
        neutral, Udvega, Kāla and Roga as bad.
      </Cite>
    </section>
  );
}

export function HoraPanel({ day, night, clock, dayMs, nowMs }: PanelProps & { day: Hora[]; night: Hora[] }) {
  const items = (list: Hora[]): Item[] =>
    list.map((h) => ({
      key: `${h.half}${h.part}`,
      name: (
        <>
          <span className="alm-periods__n">{h.part}</span> {GRAHA_ENGLISH[h.lord]}{" "}
          <span className="alm-aside">
            {GRAHA_NAMES[h.lord]}{" "}
            <span lang="hi" className="alm-dev">
              {GRAHA_DEV[h.lord]}
            </span>
          </span>
        </>
      ),
      range: spanLabel(clock, h.startMs, h.endMs, dayMs),
      now: inside(nowMs, h.startMs, h.endMs),
    }));
  return (
    <section className="v-stack" aria-labelledby="hora-h">
      <h2 id="hora-h" className="alm-h">
        Planet hours
        <span className="alm-h__note">
          Each hour of the day and night belongs to a planet · Horā <InfoDot id="hora" />
        </span>
      </h2>
      <div className="v-cols">
        <PeriodList title="Day" meta="sunrise to sunset, twelve parts" label="Day horās" items={items(day)} />
        <PeriodList title="Night" meta="sunset to sunrise, twelve parts" label="Night horās" items={items(night)} />
      </div>
      <Cite c={HORA_CITATION}>
        The first horā after sunrise belongs to the weekday's lord; the rest follow the Chaldean order, Sūrya, Śukra, Budha, Candra, Śani,
        Guru, Maṅgala, on through the night.
      </Cite>
    </section>
  );
}
