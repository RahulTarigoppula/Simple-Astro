export const DISCLAIMER =
  "Based on classical Jyotisha / Samudrika Shastra texts. For reflection and fun — not medical, legal or financial advice.";

interface ColophonProps {
  rows: Array<[string, React.ReactNode]>;
  children?: React.ReactNode;
}

/** The colophon renders the standing disclaimer itself, so no screen can omit it by accident. */
export function Colophon({ rows, children }: ColophonProps) {
  return (
    <footer className="colophon">
      <dl>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: "contents" }}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {children}
      <p className="disclaimer">{DISCLAIMER}</p>
      <p style={{ margin: "var(--space-2) 0 0" }}>All computation happened on this device. Nothing left it.</p>
    </footer>
  );
}
