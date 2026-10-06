# Oracle notes — `golden-charts.json`

Generated 2026-10-06. The oracle is Swiss Ephemeris, which is AGPL-3.0. It ran **only** in a throwaway
folder outside this repository (`%TEMP%\claude\swe-oracle\`, not a git working tree). No code, script or
package that imports it is committed here. Only the numbers it produced are committed, in `golden-charts.json`.

## Environment

| Item | Value |
|---|---|
| Python | 3.14.7 (venv in the scratch folder) |
| Binding | PyPI `pyswisseph` **2.10.3.2** → Swiss Ephemeris C library **2.10.03** (`swe.version`) |
| Ephemeris | **`SEFLG_MOSEPH`** (Moshier analytic theory) on every call. No `.se1` files were installed. Moshier is accurate to about 1″ for planets and a few arcseconds for the Moon over 1900–2030. A `SEFLG_SWIEPH` call without data files falls back to Moshier on its own, so the flag was set explicitly. The returned `iflag` was checked: 260 = MOSEPH + SPEED. |
| Sidereal mode | `swe.set_sid_mode(SE_SIDM_LAHIRI)` with default t0/ayan_t0 |
| ΔT | Swiss Ephemeris' own `swe_deltat` (stored per chart as `expected.deltaTSec`) |
| Offsets | Python `zoneinfo` + PyPI `tzdata` 2026.5, apart from the hand-coded rules below |

## How each number was produced (in prose — no script is committed)

For each chart:

1. **Local time → UTC.** The local wall time and the historical offset were combined to give the UTC instant (`input.utcIso`, `input.utcMs`).
   - **India:** +05:21:10 (Madras Mean Time) before 1906-01-01. **+06:30** for 1942-01-01 → 1942-05-14 and 1942-09-01 → 1945-10-14 (the brief's war-time spells). +05:30 at all other times.
   - **Bombay Time +04:51** (chart g19) is a manual override, as in TZ-8.
   - **Reykjavík 1927** is hand-coded to −01:00. Current tzdb aliases `Atlantic/Reykjavik` to Abidjan (GMT) and has lost Iceland's pre-1968 −01:00.
   - **Every other zone** comes from `zoneinfo`.

   Then `jdUt = utcMs / 86400000 + 2440587.5`, the same formula the engine uses.
2. **Ayanāṃśa.**
   - `ayanamsaTrue` = `swe.get_ayanamsa_ex_ut(jd, SEFLG_MOSEPH)[1]` (includes nutation).
   - `ayanamsaMean` = the same call with `| SEFLG_NONUT`.
3. **The seven grahas.** Each comes from `swe.calc_ut(jd, body, SEFLG_MOSEPH | SEFLG_SPEED)`: apparent geocentric longitude, true ecliptic and equinox of date. The tropical longitude, latitude and speed are stored.
   - `lonSidereal` = tropical − `ayanamsaTrue`, normalised. It was cross-checked for every body against a second call with `| SEFLG_SIDEREAL`, and agreed to 1e-6°.
   - `speedSidereal` comes from that `SEFLG_SIDEREAL` call.
4. **Nodes.**
   - The true node is `SE_TRUE_NODE` (osculating) and the mean node is `SE_MEAN_NODE`, both from the same `calc_ut` call.
   - Rāhu's sidereal longitude = node − `ayanamsaTrue`. Ketu = Rāhu + 180°.
   - Both node modes are recorded on every chart.
5. **Lagna and MC.** These come from `swe.houses_ex(jd, lat, lon, b'W', SEFLG_MOSEPH)`.
   - `ascmc[0]` is the ASC, `ascmc[1]` the MC and `ascmc[2]` the ARMC.
   - The sidereal values are tropical − `ayanamsaTrue`.
   - `obliquityTrue` and `nutationLongitudeArcsec` come from `calc_ut(jd, SE_ECL_NUT)`.
6. **Edge distances.** `edgeArcsec` records each body's distance to the nearest sign, nakshatra and pada edge in arcseconds (se-true). Charts with any graha or the Lagna within 2′ of a nakshatra edge list it in `nearNakshatraEdge`.
7. **Boundary search** (tag `nakshatra-boundary`; four charts):
   - Start from a nominal date and step forward to the body's next nakshatra crossing (se-true sidereal), then bisect to find it exactly.
   - Advance the time by a target margin (65″, or 115″ for Jupiter), divided by the body's speed.
   - Round to the local minute, then re-measure.

   The four results:
   - g06 Cairo 1915: Mercury 64.9″ inside Śatabhiṣā.
   - g26 Tokyo 1974: Moon 77.4″ inside Pūrva Bhādrapadā.
   - g34 Paris 1999: Sun 64.8″ inside Kṛttikā.
   - g48 Chicago 2027: Jupiter 89.2″ inside Maghā.

   The margins are larger than the 60″ engine tolerance, so the side of the edge is determinate while the 2′ badge must still fire.

   Three charts are also close to an edge by coincidence:
   - g03: Mars 10″ from an edge.
   - g23: Jupiter 20″ from an edge.
   - g28: Saturn 95″ from an edge.

   At ±60″ the engine may legitimately put **g03 Mars and g23 Jupiter on the other side**. Do not assert their nakshatra or pada exactly; they are real badge cases.

## Coverage

| Requirement | Charts |
|---|---|
| Decade bands | 10 charts in each band |
| Reference chart | **g01** (Rahul, 1994-03-14 01:55Z) |
| Six war-time IST charts (+06:30) | g12–g17 |
| The gap between the spells | g18 (+05:30) |
| Pre-1906 MMT | g02, g03 |
| Latitudes | −45.03° (Queenstown) to +64.15° (Reykjavík g10, g40), plus Oslo g20 and Stockholm g46 |
| Within 1° of the equator | Quito g22, Singapore g11/g42, Kampala g47 |
| Odd offsets | +05:45 Kathmandu, +06:30 Colombo 1996, +08:45 Eucla, +04:51 Bombay |
| Continents | Asia, Europe, Africa, North America, South America, Oceania |

**Tzdb discrepancy to know about.** tzdb starts India's first war spell on **1941-10-01**, while the brief starts it on 1942-01-01. The war-time charts sit inside the window both definitions agree on, so they are unaffected. Any chart between 1941-10-01 and 1941-12-31, such as TZ-5's "one day before", depends on which definition is used.

## V-2 — is SE Lahiri at 2000-01-01 0h UT equal to 23°51′11″ with nutation?

**Yes.**

- `get_ayanamsa_ex_ut(2451544.5)` with nutation = **23.8532035° = 23°51′11.53″**.
- With `SEFLG_NONUT` = 23.8570732° = 23°51′25.46″.
- Δψ = −13.931″.

`swetest -sid1` is the same library, so this is the swetest value. The doc's 23°51′11.3″ is 0.23″ low, which passes the ≤1″ criterion. JHora/PyJHora was not run. PyJHora computes through pyswisseph with Lahiri, so it inherits this value; that has not been checked against a JHora install.

## V-3 — true vs mean node, reference chart

| Node | Tropical | Sidereal (se-true) | Rāśi | Nakshatra · pada | Speed |
|---|---|---|---|---|---|
| **True** (`SE_TRUE_NODE`) | 235.60214° | **211.82193°** | **Vṛścika 1°49′19″** | **Viśākhā · 4** (lord Guru) | −0.14296°/d |
| Mean (`SE_MEAN_NODE`) | 237.27998° | 213.49977° | Vṛścika 3°29′59″ | Anurādhā · 1 (lord Śani) | −0.05299°/d |

The two modes are **1.678° apart**. **§0.1a's Rāhu 213.4956° (Anurādhā 1, D9 Siṃha) is the *mean* node** (15″ from SE mean), even though the table is headed "true node". §0.1a's Method line does say "mean node for Rāhu/Ketu".

Under the shipped default (true node), the reference chart reads:

- **Rāhu:** Viśākhā 4, D9 Karka.
- **Ketu:** 31.82193°, Vṛṣabha 1°49′19″, **Kṛttikā 2**, D9 Makara.

`reference-chart.json` and the demo Patri must use these values, or the reference chart must be shown with the mean-node preset.

## Other §0.1a discrepancies (reference chart, se-true, SE minus doc)

| Body | SE (sidereal) | §0.1a | Δ |
|---|---|---|---|
| Sun | 329.47808° | 329.4811° | −10.9″ |
| Moon | 349.16894° | 349.1688° | +0.5″ |
| **Mars** | **311.42714°** (Kumbha 11°25′38″) | 311.5233° | **−346″ (−5′46″)** |
| **Mercury** | **302.40977°** | 302.4901° | **−289″** |
| Jupiter | 200.59039° | 200.6030° | −45″ |
| **Venus** | **343.03364°** | 343.1253° | **−330″** |
| Saturn | 311.51343° | 311.5169° | −12.5″ |
| Lagna | 345.65697° | 345.6570° | −0.1″ |
| MC | 253.39068° | 253.3907° | 0.0″ |
| ARMC | 277.80818° | 277.8081° | +0.3″ |

The jdUt, ayanāṃśa (23.780212°, +0.2″), Moon, Lagna, MC and tithi all hold.

**Mars, Mercury and Venus are 5–6′ off.** This comes from the Keplerian mean-element method used for §0.1a. They would fail a 60″ golden test.

Their nakshatra and pada assignments do not change, but **the Graha Yuddha claim does**: Maṅgala and Śani are **5′11″ apart**, not 23″. That is still under 1°, so it is still a yuddha classically.

Use these SE values, not the §0.1a table, for `reference-chart.json`.

## §6.2 ayanāṃśa reference table, re-verified (0h UT, Moshier, SE 2.10.03)

| Instant | SE se-true | doc | Δ | SE se-mean | doc | Δ |
|---|---|---|---|---|---|---|
| 2000-01-01 | 23.8532035° = 23°51′11.53″ | 11.3″ | +0.23″ | 23.8570732° = 23°51′25.46″ | 25.3″ | +0.16″ |
| 2020-01-01 | 24.1318815° = 24°07′54.77″ | 54.6″ | +0.17″ | 24.1364631° = 24°08′11.27″ | 11.3″ | −0.03″ |
| 2025-01-01 | 24.2063981° = 24°12′23.03″ | 23.0″ | +0.03″ | 24.2063431° = 24°12′22.84″ | 22.8″ | +0.04″ |
| 2026-01-01 | 24.2218099° = 24°13′18.52″ | 18.4″ | +0.12″ | 24.2203040° = 24°13′13.09″ | 13.0″ | +0.09″ |

**Every row passes the ±1″ tolerance.**

**The J2000 base fails its own ±0.1″ assertion.** At JD 2451545.0 TT, SE's mean Lahiri is **23.8570923°**, while the doc's constant is 23.857054°, a difference of **+0.14″**. At 0h UT the same day, SE gives 23.8570732° against the doc's 23.857035°, again +0.14″.

**Either relax AY-1 to ±0.2″, or set `J2000_SE_MEAN = 23.857092`.**

The SE mean rate is 5028.797″ per century, which passes.

## Pre-check of the §6.2–§6.5 formulas (astronomy-engine 2.1.19 vs this fixture)

The doc's own algorithms were run through astronomy-engine 2.1.19 from `node_modules` against all 50 charts, as a scratch script outside the repo. The maximum |Δ| for each quantity:

| Quantity | Max |Δ| | Chart |
|---|---|---|
| Sun | 2.4″ | |
| Moon | 4.0″ | |
| Mars | 8.7″ | |
| Mercury | 8.9″ | |
| Jupiter | 10.2″ | |
| Venus | 19.5″ | g19 |
| Saturn | 10.4″ | |
| Ayanāṃśa | 0.35″ | |
| True node | 32.4″ | g24 |
| Mean node | 18.4″ | |
| Lagna | 0.3″ | |
| RAMC | 0.2″ | |
| ΔT | ≤ 8.6 s | g50 (2030 extrapolation) |

A correct implementation therefore has margin under the 60″ tolerance.
