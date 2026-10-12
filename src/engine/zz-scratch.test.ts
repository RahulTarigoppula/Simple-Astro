import { writeFileSync } from "node:fs";
import { it } from "vitest";
import { monthCalendar } from "./calendar";
import { DEFAULT_PRESET } from "./types";

it("x", () => {
  const out: string[] = [];
  const pl = { lat: 12.9716, lon: 77.5946, zone: "Asia/Kolkata" };
  let t = performance.now();
  monthCalendar(2026, 9, pl, DEFAULT_PRESET);
  out.push(`cold ${performance.now() - t}`);
  t = performance.now();
  const c = monthCalendar(2026, 10, pl, DEFAULT_PRESET);
  out.push(`warm ${performance.now() - t}`);
  out.push(JSON.stringify(c.sankranti), String(c.leadingBlanks));
  for (const d of c.days)
    out.push(
      [
        d.day,
        d.weekday,
        new Date(d.sunriseMs + 19800000).toISOString().slice(11, 16),
        d.tithi.index,
        d.tithi.name,
        d.kshaya ?? "",
        d.nakshatra,
        d.marks.join(","),
        d.moonK.toFixed(2),
      ].join(" "),
    );
  writeFileSync(
    "C:/Users/ttrah/AppData/Local/Temp/claude/C--Work-Personal-Projects-02-jyoti-astrology-palmistry/1ba283e9-ad27-4bdf-97f9-3ba2c104fd90/scratchpad/cal.txt",
    out.join("\n"),
  );
});
