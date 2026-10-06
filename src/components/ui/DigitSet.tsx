import { useEffect, useState } from "react";

interface DigitSetProps {
  text: string;
  className?: string;
}

/** Numerals never fade: each character sets ink-faint → ink, 24 ms apart, in tabular cells. */
export function DigitSet({ text, className }: DigitSetProps) {
  const [settled, setSettled] = useState<string | null>(null);
  useEffect(() => {
    const id = requestAnimationFrame(() => setSettled(text));
    return () => cancelAnimationFrame(id);
  }, [text]);
  const chars = Array.from(text);
  return (
    <span className={`setting${settled === text ? " is-set" : ""}${className ? ` ${className}` : ""}`} key={text}>
      {chars.map((c, i) => (
        <i
          // biome-ignore lint/suspicious/noArrayIndexKey: characters are positional by nature
          key={i}
          className={"′″·".includes(c) ? "mut" : undefined}
          style={{ "--d": `${i * 24}ms` } as React.CSSProperties}
        >
          {c}
        </i>
      ))}
    </span>
  );
}
