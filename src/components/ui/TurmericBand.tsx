import { InfoDot } from "./Explain";

interface TurmericBandProps {
  dev?: string;
  title: React.ReactNode;
  meta?: React.ReactNode;
  plain?: boolean;
  level?: 1 | 2 | 3;
  id?: string;
  /** Glossary id: adds a plain-English ⓘ after the title. */
  explain?: string;
}

/** A section head: turmeric-washed band, kumkum tick, vermilion hairline. Devanagari first. */
export function TurmericBand({ dev, title, meta, plain, level = 2, id, explain }: TurmericBandProps) {
  const H = `h${level}` as "h1" | "h2" | "h3";
  return (
    <div className={`band${plain ? " band--plain" : ""}`}>
      <H id={id}>
        {dev ? (
          <>
            <span lang="hi" className="dev">
              {dev}
            </span>{" "}
            ·{" "}
          </>
        ) : null}
        {title}
        {explain ? (
          <>
            {" "}
            <InfoDot id={explain} />
          </>
        ) : null}
      </H>
      {meta != null ? <span className="meta">{meta}</span> : null}
    </div>
  );
}
