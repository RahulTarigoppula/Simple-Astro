import "fake-indexeddb/auto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../engine/patri", () => ({ computePatri: () => ({}) }));

import { TABLE_NAMES, db } from "./db";
import {
  type FetchLike,
  type Gazetteer,
  NOMINATIM_GAP_MS,
  NetError,
  canonName,
  isGazetteerLoaded,
  loadGazetteerFromBytes,
  mapNominatim,
  mapOpenMeteo,
  nominatimUrl,
  openMeteoUrl,
  parseGazetteerBytes,
  resetNominatimLimiter,
  searchOnline,
  searchPlaces,
} from "./places";
import { PLACE_CACHE_TTL, getPlaceCache, putPlaceCache, saveSettings } from "./repo";

const GZ = fileURLToPath(new URL("./geonames-in.json.gz", import.meta.url));

describe("bundled gazetteer", () => {
  let g: Gazetteer;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let firstSearchMs = Number.NaN;
  let loadMs = Number.NaN;
  let retainedBytes: number | null = null;

  beforeAll(async () => {
    fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() => {
      throw new Error("the bundle must never touch the network");
    });
    expect(searchPlaces("Madurai")).toEqual([]); // not loaded yet: empty, no throw, no fetch
    const bytes = new Uint8Array(readFileSync(GZ));
    expect(bytes.length).toBeLessThanOrEqual(1_800_000);
    // Retained heap is only measurable with --expose-gc (NODE_OPTIONS=--expose-gc).
    const gc = (globalThis as { gc?: () => void }).gc;
    gc?.();
    const h0 = process.memoryUsage().heapUsed;
    const tl = performance.now();
    g = await loadGazetteerFromBytes(bytes);
    loadMs = performance.now() - tl;
    if (gc) {
      gc();
      retainedBytes = process.memoryUsage().heapUsed - h0;
    }
    const t0 = performance.now();
    searchPlaces("Madurai");
    firstSearchMs = performance.now() - t0;
  });

  afterAll(() => {
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("loads tens of thousands of rows", () => {
    expect(isGazetteerLoaded()).toBe(true);
    expect(g.size).toBeGreaterThan(40_000);
  });

  it("first search after load is fast (target ≤ 20 ms; bound 50 for busy CI workers)", () => {
    expect(firstSearchMs).toBeLessThan(50);
  });

  it("loads fast and stays small (targets: ≤ 400 ms, ≤ 20 MB retained)", () => {
    // Generous CI bound; the measured figure on the dev box is ~370 ms.
    // ≈ 370 ms alone; the ceiling is generous because the whole suite runs in parallel workers.
    expect(loadMs).toBeLessThan(6000);
    if (retainedBytes !== null) expect(retainedBytes).toBeLessThanOrEqual(20e6);
  });

  const top = (q: string) => searchPlaces(q)[0];

  it.each([
    ["Madurai", "Madurai", "IN"],
    ["Vaitheeswaran Koil", "Vaithīsvarankoil", "IN"],
    ["vaitheeswarankoil", "Vaithīsvarankoil", "IN"],
    ["Bengaluru", "Bengaluru", "IN"],
    ["Bangalore", "Bengaluru", "IN"],
    ["Mumbai", "Mumbai", "IN"],
    ["Bombay", "Mumbai", "IN"],
    ["Chennai", "Chennai", "IN"],
    ["Madras", "Chennai", "IN"],
    ["Bengalru", "Bengaluru", "IN"],
    ["Kolkata", "Kolkata", "IN"],
    ["Calcutta", "Kolkata", "IN"],
    ["New Delhi", "New Delhi", "IN"],
    ["Kathmandu", "Kathmandu", "NP"],
    ["Colombo", "Colombo", "LK"],
    ["New York", "New York City", "US"],
    ["London", "London", "GB"],
  ])("%s resolves to %s (%s)", (q, name, country) => {
    const hit = top(q);
    expect(hit?.name).toBe(name);
    expect(hit?.country).toBe(country);
    expect(hit?.source).toBe("bundle");
    expect(hit?.geonameId).toBeTypeOf("number");
    expect(hit?.timezone).toBeTruthy();
  });

  it("returns well-formed Places with admin1 and zone", () => {
    const m = top("Madurai");
    expect(m).toMatchObject({ admin1: "Tamil Nadu", timezone: "Asia/Kolkata", geonameId: 1264521 });
    expect(m?.lat).toBeCloseTo(9.92, 1);
    expect(m?.lon).toBeCloseTo(78.12, 1);
  });

  it("is typo- and prefix-tolerant, accent-insensitive, and admin1-aware", () => {
    expect(top("Madurei")?.name).toBe("Madurai");
    expect(top("Bengal")?.name).toBe("Bengaluru");
    expect(top("Vaithisvarankoil")?.geonameId).toBe(1253530);
    expect(top("Hyderabad Telangana")?.admin1).toBe("Telangana");
    expect(top("Hyderabad Sindh")?.country).toBe("PK");
  });

  it("respects the limit and ignores one-letter noise", () => {
    expect(searchPlaces("Rampur", 3)).toHaveLength(3);
    expect(searchPlaces("R")).toEqual([]);
    expect(searchPlaces("   ")).toEqual([]);
  });

  it("typing-speed searches stay fast (≤ 20 ms each)", () => {
    const qs = ["V", "Va", "Vai", "Vait", "Vaith", "Vaithe", "Vaithee", "Vaithees", "Ch", "Che", "Chen", "Chenn", "Chenna",
      "Sa", "pur", "abad", "Bengalru", "Thiruvanantapuram", "Hyderabad Sindh", "New Yo"];
    const times = qs.map((q) => {
      const t0 = performance.now();
      searchPlaces(q);
      return performance.now() - t0;
    });
    // Measured worst ≈ 9 ms on the dev box; the max bound leaves room for a busy CI worker.
    const sorted = [...times].sort((a, b) => a - b);
    expect(sorted[Math.floor(sorted.length / 2)]).toBeLessThanOrEqual(20);
    expect(Math.max(...times)).toBeLessThan(50);
  });

  it("finds word starts and inner substrings", () => {
    expect(searchPlaces("York").map((p) => p.name)).toContain("New York City");
    expect(top("eeswaran")?.geonameId).toBe(1253530);
  });

  it("every sampled place is found by its own name (index ordering is sound)", async () => {
    const entries = await parseGazetteerBytes(new Uint8Array(readFileSync(GZ)));
    for (let i = 0; i < entries.length; i += 97) {
      const e = entries[i];
      if (!e || canonName(e.name).replace(/ /g, "").length < 2) continue;
      const hits = searchPlaces(e.name, 5000);
      expect(canonName(hits[0]?.name ?? "").length, e.name).toBeGreaterThan(0);
      expect(hits.some((h) => h.geonameId === e.id), e.name).toBe(true);
      expect(g.get(e.id)?.name).toBe(e.name);
    }
  });
});

// ─── online ladder ─────────────────────────────────────────────────────────────

const OM_MADURAI = {
  results: [
    {
      id: 1264521,
      name: "Madurai",
      latitude: 9.91868,
      longitude: 78.11983,
      elevation: 132,
      timezone: "Asia/Kolkata",
      country_code: "IN",
      admin1: "Tamil Nadu",
      population: 909908,
    },
  ],
};

const NOMINATIM_TINY = [
  {
    place_id: 1,
    lat: "10.9601",
    lon: "79.3845",
    name: "Tiny Hamlet",
    display_name: "Tiny Hamlet, Thanjavur, Tamil Nadu, 612001, India",
    address: { village: "Tiny Hamlet", state: "Tamil Nadu", country_code: "in" },
  },
];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("mappers", () => {
  it("mapOpenMeteo maps straight onto Place", () => {
    expect(mapOpenMeteo(OM_MADURAI)).toEqual([
      {
        name: "Madurai",
        admin1: "Tamil Nadu",
        country: "IN",
        lat: 9.91868,
        lon: 78.11983,
        elevation: 132,
        geonameId: 1264521,
        timezone: "Asia/Kolkata",
        source: "open-meteo",
      },
    ]);
    expect(mapOpenMeteo({})).toEqual([]);
    expect(mapOpenMeteo({ results: [{ name: "x" }, null, 3] })).toEqual([]);
    expect(mapOpenMeteo({ results: [{ name: "No zone", latitude: 51.5, longitude: -0.12, country_code: "gb" }] })[0])
      .toMatchObject({ country: "GB", timezone: "Europe/London" });
  });

  it("mapNominatim parses string coordinates and looks the zone up", () => {
    expect(mapNominatim(NOMINATIM_TINY)).toEqual([
      {
        name: "Tiny Hamlet",
        admin1: "Tamil Nadu",
        country: "IN",
        lat: 10.9601,
        lon: 79.3845,
        timezone: "Asia/Kolkata",
        source: "nominatim",
      },
    ]);
    expect(mapNominatim([{ lat: "abc", lon: "1", name: "x", address: { country_code: "in" } }])).toEqual([]);
    expect(mapNominatim([{ lat: "95", lon: "1", name: "x", address: { country_code: "in" } }])).toEqual([]);
    expect(mapNominatim({ not: "an array" })).toEqual([]);
  });

  it("builds the documented URLs, never with personal data beyond the query", () => {
    expect(openMeteoUrl("Madurai, Tamil Nadu")).toBe(
      "https://geocoding-api.open-meteo.com/v1/search?name=Madurai&count=5&language=en&format=json",
    );
    expect(nominatimUrl("Madurai")).toBe(
      "https://nominatim.openstreetmap.org/search?q=Madurai&format=jsonv2&limit=5&addressdetails=1&accept-language=en",
    );
  });
});

describe("searchOnline", () => {
  beforeEach(async () => {
    await Promise.all(TABLE_NAMES.map((t) => db.table(t).clear()));
    resetNominatimLimiter();
    await saveSettings({ onlineLookupAllowed: true });
  });

  const signal = () => new AbortController().signal;

  it("refuses to touch the network until the owner allowed online lookup", async () => {
    await saveSettings({ onlineLookupAllowed: false });
    const f = vi.fn<FetchLike>();
    await expect(searchOnline("Madurai", signal(), { fetch: f })).rejects.toMatchObject({ code: "NOT_ALLOWED" });
    expect(f).not.toHaveBeenCalled();
  });

  it("Open-Meteo first; result cached 90 days so the second lookup is offline", async () => {
    const f = vi.fn<FetchLike>(async () => json(OM_MADURAI));
    const a = await searchOnline("Madurai", signal(), { fetch: f });
    expect(a[0]?.source).toBe("open-meteo");
    expect(f).toHaveBeenCalledTimes(1);
    expect(f.mock.calls[0]?.[0]).toContain("geocoding-api.open-meteo.com");
    expect(f.mock.calls[0]?.[1]).toMatchObject({ credentials: "omit" });
    const b = await searchOnline("  MADURAI ", signal(), { fetch: f });
    expect(b).toEqual(a);
    expect(f).toHaveBeenCalledTimes(1);
    expect((await getPlaceCache("madurai"))?.results).toEqual(a);
  });

  it("falls back to Nominatim when Open-Meteo fails or finds nothing", async () => {
    const f = vi.fn<FetchLike>(async (url) =>
      url.startsWith("https://geocoding-api") ? json({ error: true }, 500) : json(NOMINATIM_TINY),
    );
    const r = await searchOnline("Tiny Hamlet", signal(), { fetch: f });
    expect(r[0]?.source).toBe("nominatim");
    expect(f).toHaveBeenCalledTimes(2);

    const g = vi.fn<FetchLike>(async (url) =>
      url.startsWith("https://geocoding-api") ? json({ generationtime_ms: 0.1 }) : json(NOMINATIM_TINY),
    );
    expect((await searchOnline("Tiny Hamlet 2", signal(), { fetch: g }))[0]?.source).toBe("nominatim");
  });

  it("Nominatim requests are spaced ≥ 1100 ms apart and identical queries share one request", async () => {
    const starts: number[] = [];
    const f = vi.fn<FetchLike>(async (url) => {
      if (url.startsWith("https://geocoding-api")) return json({}, 503);
      starts.push(performance.now());
      return json(NOMINATIM_TINY);
    });
    await Promise.all([
      searchOnline("Alpha", signal(), { fetch: f }),
      searchOnline("Alpha", signal(), { fetch: f }),
      searchOnline("Beta", signal(), { fetch: f }),
    ]);
    expect(starts).toHaveLength(2);
    expect((starts[1] ?? 0) - (starts[0] ?? 0)).toBeGreaterThanOrEqual(NOMINATIM_GAP_MS - 5);
  });

  it("rate limits and network failures surface as NetError; stale cache is served instead", async () => {
    const down = vi.fn<FetchLike>(async (url) => (url.includes("open-meteo") ? json({}, 429) : Promise.reject(new TypeError("offline"))));
    const err = await searchOnline("Nowhere", signal(), { fetch: down }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(NetError);
    expect(["RATE_LIMIT", "NETWORK"]).toContain((err as NetError).code);

    const old = [{ name: "Madurai", country: "IN", lat: 9.9, lon: 78.1, source: "open-meteo" as const }];
    await putPlaceCache("Madurai", old, Date.now() - PLACE_CACHE_TTL - 1);
    resetNominatimLimiter();
    expect(await searchOnline("Madurai", signal(), { fetch: down })).toEqual(old);
  });

  it("an answer of 'nothing found' is [] (not an error) and is not cached", async () => {
    const f = vi.fn<FetchLike>(async (url) => (url.includes("open-meteo") ? json({}) : json([])));
    expect(await searchOnline("Xyzzyplace", signal(), { fetch: f })).toEqual([]);
    expect(await getPlaceCache("Xyzzyplace")).toBeUndefined();
  });

  it("an aborted search returns [] quietly", async () => {
    const ac = new AbortController();
    const f = vi.fn<FetchLike>(async (_url, init) => {
      ac.abort();
      throw init.signal?.reason ?? new Error("aborted");
    });
    expect(await searchOnline("Madurai", ac.signal, { fetch: f })).toEqual([]);
  });
});
