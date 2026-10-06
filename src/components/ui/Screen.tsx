import { useState } from "react";
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
  return (
    <main
      className={`screen screen-enter${scroll ? " screen--scroll" : ""}${className ? ` ${className}` : ""}`}
      style={style}
      aria-label={label}
    >
      {children}
    </main>
  );
}
