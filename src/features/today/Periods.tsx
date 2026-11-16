// The good and bad slots (Choghaḍiyā) and the planet hours (Horā) as plain lists, day and night, on
// the place's clock. The running period says "now" in words; quality is a word plus a mark, never
// colour alone.
import { InfoDot } from "../../components/ui/Explain";
import { Section } from "../../components/ui/Page";
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

/** The same span in two parts, so a row can keep the clock times on one line. */
function spanParts(clock: ZoneClock, a: number, b: number, dayMs: number): { range: string; next: boolean } {
  return { range: `${clock.hm12(a)} to ${clock.hm12(b)}`, next: clock.dayNumber(b - 1) - clock.dayNumber(dayMs) > 0 };
}

interface Item {
  key: string;
  title: React.ReactNode;
  sub: React.ReactNode;
  end: React.ReactNode;
  now: boolean;
}

/** One half of the day as a fold; the half that holds the present moment opens by itself. */
function PeriodList({ title, meta, label, items, open }: { title: string; meta: string; label: string; items: Item[]; open: boolean }) {
  return (
    <details className="v-fold" open={open || undefined}>
      <summary>
        <span>
          {title}
          <span className="v-fold__s">{meta}</span>
        </span>
      </summary>
      <div className="v-fold__body">
        <ol className="alm-periods" aria-label={label}>
          {items.map((it) => (
            <li key={it.key} className={it.now ? "is-now" : undefined} aria-current={it.now ? "time" : undefined}>
              <span className="alm-periods__body">
                <span className="alm-periods__t">
                  {it.title}
                  {it.now ? <span className="v-chip v-chip--gold">now</span> : null}
                </span>{" "}
                <span className="alm-periods__s">{it.sub}</span>
              </span>
              {it.end ? <span className="alm-periods__end">{it.end}</span> : null}
            </li>
          ))}
        </ol>
      </div>
    </details>
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
    list.map((c) => {
      const t = spanParts(clock, c.startMs, c.endMs, dayMs);
      return {
        key: `${c.half}${c.part}`,
        title: t.range,
        sub: (
          <>
            {c.name} <span lang="hi">{c.dev}</span>
            {t.next ? " · next day" : ""}
          </>
        ),
        end: (
          <span className={`v-chip ${QUALITY_CHIP[c.quality]}`}>
            <QualityMark q={c.quality} /> {QUALITY_TEXT[c.quality]}
          </span>
        ),
        now: inside(nowMs, c.startMs, c.endMs),
      };
    });
  const atNight = night.some((c) => inside(nowMs, c.startMs, c.endMs));
  return (
    <section className="v-stack" aria-labelledby="chog-h">
      <Section
        id="chog-h"
        title="Good and bad slots"
        note={
          <>
            The day and the night, each cut into eight parts · Choghaḍiyā <InfoDot id="choghadiya" />
          </>
        }
      />
      <div className="v-cols">
        <PeriodList title="Day" meta="Sunrise to sunset" label="Day choghaḍiyā" items={items(day)} open={!atNight} />
        <PeriodList title="Night" meta="Sunset to sunrise" label="Night choghaḍiyā" items={items(night)} open={atNight} />
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
    list.map((h) => {
      const t = spanParts(clock, h.startMs, h.endMs, dayMs);
      return {
        key: `${h.half}${h.part}`,
        title: (
          <>
            {GRAHA_ENGLISH[h.lord]}{" "}
            <span className="alm-periods__s">
              {GRAHA_NAMES[h.lord]} <span lang="hi">{GRAHA_DEV[h.lord]}</span>
            </span>
          </>
        ),
        sub: (
          <span className="alm-periods__time">
            {t.range}
            {t.next ? " · next day" : ""}
          </span>
        ),
        end: null,
        now: inside(nowMs, h.startMs, h.endMs),
      };
    });
  const atNight = night.some((h) => inside(nowMs, h.startMs, h.endMs));
  return (
    <section className="v-stack" aria-labelledby="hora-h">
      <Section
        id="hora-h"
        title="Planet hours"
        note={
          <>
            Each hour of the day and night belongs to a planet · Horā <InfoDot id="hora" />
          </>
        }
      />
      <div className="v-cols">
        <PeriodList title="Day" meta="Sunrise to sunset, twelve parts" label="Day horās" items={items(day)} open={!atNight} />
        <PeriodList title="Night" meta="Sunset to sunrise, twelve parts" label="Night horās" items={items(night)} open={atNight} />
      </div>
      <Cite c={HORA_CITATION}>
        The first horā after sunrise belongs to the weekday's lord; the rest follow the Chaldean order, Sūrya, Śukra, Budha, Candra, Śani,
        Guru, Maṅgala, on through the night.
      </Cite>
    </section>
  );
}
