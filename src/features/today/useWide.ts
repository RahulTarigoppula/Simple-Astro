import { useEffect, useState } from "react";

const QUERY = "(min-width: 900px)";

const list = (): MediaQueryList | null =>
  typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia(QUERY) : null;

/** True on the desk-wide layout, where the month grid lies beside the ledger instead of in a tab. */
export function useWide(): boolean {
  const [wide, setWide] = useState(() => list()?.matches === true);
  useEffect(() => {
    const mq = list();
    if (!mq) return;
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return wide;
}
