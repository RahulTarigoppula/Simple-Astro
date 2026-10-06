import { readFileSync, writeFileSync } from "node:fs";
import { it } from "vitest";
import { loadGazetteerFromBytes, searchPlaces } from "./places";
it("timing", async () => {
  const bytes = new Uint8Array(readFileSync("src/data/geonames-in.json.gz"));
  const gc = (globalThis as { gc?: () => void }).gc ?? (() => {});
  gc(); gc();
  const h0 = process.memoryUsage().heapUsed;
  let t = performance.now();
  const g = await loadGazetteerFromBytes(bytes);
  const load = performance.now() - t;
  gc(); gc();
  const h1 = process.memoryUsage().heapUsed;
  const times: string[] = [];
  let worst = 0;
  for (const q of ["Ch", "Che", "Chen", "Ban", "Bang", "Ma", "Mad", "New Yo", "new york", "Vaith Koil", "Vaitheeswaran Koil", "Hyderabad Sindh", "Madurai", "Madurei", "Bengalru", "Bangalore", "Bombay", "Madras", "Calcutta", "Benares", "Allahabad", "Poona", "Trivandrum", "Rangoon", "Dacca", "eeswaran", "Rampur", "Kathmandu", "Colombo", "London", "Thiruvananthapuram", "Thiruvanantapuram", "Pondicheri", "Kanchipuram", "Sa", "pur", "abad", "Visakapatnam", "Kozhikkode"]) {
    t = performance.now();
    const r = searchPlaces(q, 3);
    const dt = performance.now() - t;
    worst = Math.max(worst, dt);
    times.push(`${q}: ${dt.toFixed(1)}ms -> ${r.map((p) => `${p.name}/${p.admin1}/${p.country}`).join("; ")}`);
  }
  writeFileSync(process.env.OUTF as string, JSON.stringify({ size: g.size, load, retainedMB: (h1 - h0) / 1e6, worst, gc: !!(globalThis as { gc?: unknown }).gc }) + "\n" + times.join("\n"));
}, 60000);
