interface TurmericBandProps {
  dev?: string;
  title: React.ReactNode;
  meta?: React.ReactNode;
  plain?: boolean;
  level?: 1 | 2 | 3;
  id?: string;
}

/** A section head: turmeric-washed band, kumkum tick, vermilion hairline. Devanagari first. */
export function TurmericBand({ dev, title, meta, plain, level = 2, id }: TurmericBandProps) {
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
      </H>
      {meta != null ? <span className="meta">{meta}</span> : null}
    </div>
  );
}
