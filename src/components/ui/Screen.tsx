import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
import { takeOrigin } from "../../app/origin";

interface ScreenProps {
  className?: string;
  scroll?: boolean;
  label: string;
  children: React.ReactNode;
}

/** A route's surface. Arrives with object-open from the tapped desk object (or a short rise). */
export function Screen({ className, scroll, label, children }: ScreenProps) {
  const [style] = useState(takeOrigin);
  // Moving to another page of the same screen (next planet, another view) starts at its top.
  const ref = useRef<HTMLElement>(null);
  const { pathname, search } = useLocation();
  const where = pathname + search;
  const last = useRef(where);
  useEffect(() => {
    if (last.current === where) return;
    last.current = where;
    if (ref.current && typeof ref.current.scrollTo === "function") ref.current.scrollTo(0, 0);
  }, [where]);
  return (
    <main
      ref={ref}
      className={`screen screen-enter${scroll ? " screen--scroll" : ""}${className ? ` ${className}` : ""}`}
      style={style}
      aria-label={label}
    >
      {children}
    </main>
  );
}
