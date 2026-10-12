import { useEffect, useState } from "react";

const QUERY = "(min-width: 900px)";

const list = (): MediaQueryList | null =>
  typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia(QUERY) : null;

/** True on the desk-wide layout (≥ 900 px): the month grid beside the ledger on Today, the two
 *  charts side by side on Milan. Older WebViews only have the legacy addListener/removeListener. */
export function useWide(): boolean {
  const [wide, setWide] = useState(() => list()?.matches === true);
  useEffect(() => {
    const mq = list();
    if (!mq) return;
    const on = () => setWide(mq.matches);
    on();
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", on);
      return () => mq.removeEventListener("change", on);
    }
    mq.addListener(on);
    return () => mq.removeListener(on);
  }, []);
  return wide;
}
