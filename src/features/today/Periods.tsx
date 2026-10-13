// Choghaḍiyā and Horā as ruled lists — day and night — on the leaf's clock. The running period
// wears the brass "now" clip and says "now" in words; quality is a word plus a mark, never colour.

import { TurmericBand } from "../../components/ui/TurmericBand";
import { GRAHA_DEV, GRAHA_NAMES } from "../../data/tables/names";
import { CHOGHADIYA_CITATION, HORA_CITATION } from "../../engine/muhurta";
import type { Choghadiya, Citation, Hora, MuhurtaQuality } from "../../engine/types";
import type { ZoneClock } from "./zone";

export const QUALITY_TEXT: Record<MuhurtaQuality, string> = { good: "good", neutral: "neutral", bad: "bad" };

export function QualityMark({ q }: { q: MuhurtaQuality }) {
  return (
    <svg className={`qmark qmark--${q}`} viewBox="0 0 12 12" aria-hidden="true" data-decorative="true">
      {q === "good" ? <circle cx="6" cy="6" r="4.2" /> : null}
      {q === "neutral" ? <circle cx="6" cy="6" r="3.8" /> : null}
      {q === "bad" ? <path d="M2.6 2.6l6.8 6.8M9.4 2.6l-6.8 6.8" /> : null}
    </svg>
  );
}

/** "21:14–22:44", with "+1" once the period has crossed into the next civil day. */
export function spanLabel(clock: ZoneClock, a: number, b: number, dayMs: number): string {
  const dd = clock.dayNumber(b - 1) - clock.dayNumber(dayMs);
  return `${clock.hm(a)}–${clock.hm(b)}${dd > 0 ? ` +${dd}` : ""}`;
}

interface Item {
  key: string;
  name: React.ReactNode;
  aside?: React.ReactNode;
  range: string;
  now: boolean;
}

function PeriodList({ label, items }: { label: string; items: Item[] }) {
  return (
    <ol className={`today-periods${items.some((it) => it.aside) ? "" : " today-periods--plain"}`} aria-label={label}>
      {items.map((it) => (
        <li key={it.key} className={it.now ? "is-now" : undefined} aria-current={it.now ? "time" : undefined}>
          <span className="today-periods__name">
            {it.name}
            {it.now ? <span className="today-periods__now">now</span> : null}
          </span>
          {it.aside ? <span className="today-periods__aside">{it.aside}</span> : null}
          <span className="mono today-periods__t">{it.range}</span>
        </li>
      ))}
    </ol>
  );
}

function Sub({ dev, title, meta }: { dev: string; title: string; meta: string }) {
  return (
    <h3 className="today-sub">
      <span lang="hi" className="dev">
        {dev}
      </span>{" "}
      · {title} <span className="today-sub__meta">{meta}</span>
    </h3>
  );
}

function Cite({ c, children }: { c: Citation; children: React.ReactNode }) {
  return (
    <p className="p p--muted today-cite">
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
  /** The present instant when the leaf is today's, else null. */
  nowMs: number | null;
}

export function ChoghadiyaPanel({ day, night, clock, dayMs, nowMs }: PanelProps & { day: Choghadiya[]; night: Choghadiya[] }) {
  const items = (list: Choghadiya[]): Item[] =>
    list.map((c) => ({
      key: `${c.half}${c.part}`,
      name: (
        <>
          {c.name}{" "}
          <span lang="hi" className="dev today-dev">
            {c.dev}
          </span>
        </>
      ),
      aside: (
        <>
          <QualityMark q={c.quality} /> {QUALITY_TEXT[c.quality]}
        </>
      ),
      range: spanLabel(clock, c.startMs, c.endMs, dayMs),
      now: inside(nowMs, c.startMs, c.endMs),
    }));
  return (
    <section aria-labelledby="chog-h">
      <TurmericBand id="chog-h" plain level={2} dev="चौघड़िया" title="Choghaḍiyā" explain="choghadiya" meta={clock.zone} />
      <Sub dev="दिन" title="Day" meta="sunrise → sunset, eighths" />
      <PeriodList label="Day choghaḍiyā" items={items(day)} />
      <Sub dev="रात्रि" title="Night" meta="sunset → sunrise, eighths" />
      <PeriodList label="Night choghaḍiyā" items={items(night)} />
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
          <span className="mono today-periods__n">{String(h.part).padStart(2, "0")}</span> {GRAHA_NAMES[h.lord]}{" "}
          <span lang="hi" className="dev today-dev">
            {GRAHA_DEV[h.lord]}
          </span>
        </>
      ),
      range: spanLabel(clock, h.startMs, h.endMs, dayMs),
      now: inside(nowMs, h.startMs, h.endMs),
    }));
  return (
    <section aria-labelledby="hora-h">
      <TurmericBand id="hora-h" plain level={2} dev="होरा" title="Horā · planetary hours" explain="hora" meta={clock.zone} />
      <Sub dev="दिन" title="Day" meta="sunrise → sunset, twelfths" />
      <PeriodList label="Day horās" items={items(day)} />
      <Sub dev="रात्रि" title="Night" meta="sunset → sunrise, twelfths" />
      <PeriodList label="Night horās" items={items(night)} />
      <Cite c={HORA_CITATION}>
        The first horā after sunrise belongs to the weekday's lord; the rest follow the Chaldean order, Sūrya, Śukra, Budha, Candra, Śani,
        Guru, Maṅgala, on through the night.
      </Cite>
    </section>
  );
}
