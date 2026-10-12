import { useEffect, useState } from "react";

/** A clock instant that holds still between ticks (so memos keyed on it survive re-renders) and
 *  advances every `everyMs`. */
export function useNowMs(everyMs = 60_000): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), everyMs);
    return () => window.clearInterval(id);
  }, [everyMs]);
  return now;
}
