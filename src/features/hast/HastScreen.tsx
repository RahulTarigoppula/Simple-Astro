// Hast Rekha — the loupe desk and the reading (§4.8, §3.7 E). The rectified print lies on the desk;
// detected lines draw in ink from the wrist outward with a/b/c callouts; confidence is ink darkness
// AND a number; below 0.6 the line is faint and the stylus is offered; Burn chars the print away.
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { useProfile, useSettings } from "../../app/hooks";
import { Colophon } from "../../components/ui/Colophon";
import { Screen } from "../../components/ui/Screen";
import { Sheet } from "../../components/ui/Sheet";
import { TurmericBand } from "../../components/ui/TurmericBand";
import { useHold } from "../../components/ui/useHold";
import { useInkDraw } from "../../components/ui/useInkDraw";
import { db } from "../../data/db";
import { deletePalmCapture, getBlobUrl, saveReading } from "../../data/repo";
import { guessLineId, LOW_CONFIDENCE, tracedLine } from "../../engine/palm/label";
import { applyH, type Mat3 } from "../../engine/palm/rectify";
import { framingNote, withLineReplaced } from "../../engine/palm/rules";
import type { HandCapture, PalmLine, PalmLineId, PalmReading } from "../../engine/types";
import { haptics } from "../../platform/haptics";
import { reducedMotion } from "../../platform/native";
import { play } from "../../platform/sound";
import { toast } from "../../state/ui";
import "./hast.css";

const S = 512; // canonical print frame
const Z = 2.4;
const R = 53;
const LETTER: Record<PalmLineId, string> = { heart: "a", head: "b", life: "c", fate: "d" };
const NAME: Record<PalmLineId, string> = { heart: "Heart", head: "Head", life: "Life", fate: "Fate" };
const ELEMENT: Record<string, string> = { earth: "Earth", air: "Air", fire: "Fire", water: "Water" };

const pathD = (pts: ReadonlyArray<readonly [number, number]>) =>
  pts.length ? `M${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L")}` : "";

function LineOverlay({
  lines,
  landmarks,
  inkKey,
  live,
}: {
  lines: PalmLine[];
  landmarks: Array<[number, number]>;
  inkKey: string;
  live?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  useInkDraw(ref, [inkKey], { step: 200 });
  return (
    <svg className="print-lines" viewBox={`0 0 ${S} ${S}`} ref={ref} aria-hidden="true">
      {lines.length === 0
        ? landmarks.map(([x, y]) => <circle key={`${x}-${y}`} className="lm" cx={x} cy={y} r="4" data-settle="" />)
        : null}
      {lines.map((l, i) => {
        const pts = l.path;
        const d = pathD(pts);
        const faint = l.confidence < LOW_CONFIDENCE;
        const mid = pts[Math.floor(pts.length / 2)] ?? [0, 0];
        return (
          <g key={l.id}>
            <path className="halo" d={d} data-ink="400" data-delay={String(i * 200)} />
            <path
              className={`ln${faint ? " ln--faint" : ""}${l.source === "traced" ? " ln--traced" : ""}`}
              d={d}
              data-ink="400"
              data-delay={String(i * 200)}
              style={{ opacity: faint ? 0.55 : 0.55 + 0.45 * l.confidence }}
            />
            <text className="callout" x={mid[0] + 10} y={mid[1] - 10} data-settle="">
              {LETTER[l.id]}.
            </text>
          </g>
        );
      })}
      {live ? <path className="ln ln--traced" d={live} /> : null}
    </svg>
  );
}

export default function HastScreen() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const profile = useProfile(id);
  const settings = useSettings();
  const captures = useLiveQuery(async () => (id ? db.palms.where("profileId").equals(id).sortBy("capturedAt") : []), [id]);
  const [hand, setHand] = useState<"right" | "left">((params.get("hand") as "right" | "left" | null) ?? "right");
  const capture: HandCapture | undefined = useMemo(() => [...(captures ?? [])].reverse().find((c) => c.hand === hand), [captures, hand]);
  const reading = useLiveQuery(async () => (capture ? db.readings.get(capture.id) : undefined), [capture?.id]);
  const [url, setUrl] = useState<string | null>(null);
  const [tracing, setTracing] = useState(params.get("trace") === "1");
  const [live, setLive] = useState<Array<[number, number]>>([]);
  const [selected, setSelected] = useState<PalmLineId>("life");
  const [foot, setFoot] = useState<PalmReading["hits"][number] | null>(null);
  const frame = useRef<HTMLDivElement>(null);
  const loupe = useRef<HTMLDivElement>(null);
  const lens = useRef<HTMLDivElement>(null);
  const burnEdge = useRef<HTMLDivElement>(null);
  const [loupeUp, setLoupeUp] = useState(false);
  const [width, setWidth] = useState(356);

  useEffect(() => {
    if (profile && !params.get("hand")) setHand(profile.handedness);
  }, [profile, params]);

  useEffect(() => {
    let revoke: string | null = null;
    let liveFlag = true;
    setUrl(null);
    if (capture) {
      void getBlobUrl(capture.rectifiedBlobKey).then((u) => {
        if (!liveFlag) {
          if (u) URL.revokeObjectURL(u);
          return;
        }
        revoke = u;
        setUrl(u);
      });
    }
    return () => {
      liveFlag = false;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [capture]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: the print frame mounts once a capture exists
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, [capture]);

  const landmarks = useMemo<Array<[number, number]>>(() => {
    if (capture?.homography.length !== 9) return [];
    const H = capture.homography as Mat3;
    // Landmarks are normalised in the original frame; the homography maps original pixels → print.
    const [w, h] = capture.imageSize ?? [1, 1];
    return capture.landmarks
      .map((p) => applyH(H, [p.x * w, p.y * h]) as [number, number])
      .filter(([x, y]) => x >= 0 && y >= 0 && x <= S && y <= S);
  }, [capture]);

  const lines = reading?.lines ?? [];
  const weak = lines.filter((l) => l.confidence < LOW_CONFIDENCE && l.source !== "traced");
  const missing = (["heart", "head", "life"] as const).filter((l) => !lines.some((x) => x.id === l));
  const inkKey = `${capture?.id ?? ""}|${reading?.computedAt ?? 0}`;

  const toCanon = (e: React.PointerEvent): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * S, ((e.clientY - r.top) / r.height) * S];
  };
  const placeLoupe = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = Math.max(0, Math.min(r.width, e.clientX - r.left));
    const py = Math.max(0, Math.min(r.height, e.clientY - r.top));
    if (loupe.current) {
      loupe.current.style.left = `${px}px`;
      loupe.current.style.top = `${py}px`;
      loupe.current.style.transform = "translate(-50%, -50%)";
    }
    if (lens.current) lens.current.style.transform = `translate(${R - px * Z}px, ${R - py * Z}px)`;
  };

  const commitTrace = async (raw: Array<[number, number]>) => {
    if (!reading || raw.length < 8) return;
    const tracedIds = lines.filter((l) => l.source === "traced").map((l) => l.id);
    const id0 = weak[0]?.id ?? missing[0] ?? guessLineId(raw, tracedIds);
    const line = tracedLine(id0, raw);
    const next = withLineReplaced(reading, line, Date.now());
    await saveReading(next);
    play("snap", 0.6);
    haptics.selection();
    toast(`Traced the ${NAME[id0].toLowerCase()} line — the reading was recomputed from your geometry.`);
  };

  const nudge = async (dx: number, dy: number) => {
    if (!reading) return;
    const l = lines.find((x) => x.id === selected);
    if (!l) return;
    const moved = tracedLine(
      selected,
      l.path.map(([x, y]) => [x + dx, y + dy] as [number, number]),
      l.metrics.depth,
    );
    await saveReading(withLineReplaced(reading, moved, Date.now()));
  };

  const burn = useHold({
    ms: 900,
    disabled: !capture,
    onProgress: (k) => {
      if (burnEdge.current) burnEdge.current.style.opacity = String(k);
      if (k > 0.2 && k < 0.25) play("crackle");
    },
    onFire: () => {
      if (!capture) return;
      void deletePalmCapture(capture.id).then(() => {
        haptics.impact("heavy");
        play("crackle");
        toast("Palm photo deleted. The photo and its landmarks are gone from this device.", "danger");
        if (burnEdge.current) burnEdge.current.style.opacity = "0";
      });
    },
    onCancel: () => {
      burnEdge.current?.animate([{ opacity: burnEdge.current.style.opacity || "0" }, { opacity: 0 }], {
        duration: reducedMotion() ? 1 : 320,
      });
      if (burnEdge.current) burnEdge.current.style.opacity = "0";
    },
  });

  if (profile === null) {
    return (
      <Screen scroll label="Person not found">
        <div className="paper sheet-col" style={{ marginTop: "var(--space-9)" }}>
          <TurmericBand title="Person not found" level={1} />
          <p className="p">This person is not saved on this device.</p>
          <p className="p">
            <Link className="linkish" to="/">
              Back home
            </Link>
          </p>
        </div>
      </Screen>
    );
  }

  const conf = (l: PalmLine) => (
    <>
      <span className={`confbar${l.confidence < LOW_CONFIDENCE ? " is-low" : l.confidence >= 0.8 ? " is-good" : ""}`} aria-hidden="true">
        <i style={{ width: `${Math.round(l.confidence * 100)}%` }} />
      </span>{" "}
      <span className="num">{l.confidence.toFixed(2)}</span>
      {l.source === "traced" ? (
        <span className="pd"> traced</span>
      ) : l.confidence < LOW_CONFIDENCE ? (
        <span className="flag"> ⚑</span>
      ) : null}
    </>
  );

  return (
    <Screen scroll label={`Hast Rekha — ${profile?.name ?? ""}`}>
      <div className="paper sheet-col">
        <TurmericBand
          dev="हस्त रेखा"
          title={`${hand === "right" ? "Right" : "Left"} hand`}
          meta={capture ? (reading ? `${lines.length} lines` : "hand found") : "no photo yet"}
          level={1}
          explain="hast-rekha"
        />
        <div className="hast-hand" role="radiogroup" aria-label="Which hand">
          <span style={{ flex: 1, fontSize: "var(--text-sm)", color: "var(--ink-muted)" }}>{profile?.name}</span>
          <span className="seg">
            {(["right", "left"] as const).map((h) => (
              <button
                key={h}
                type="button"
                role="radio"
                aria-checked={hand === h}
                onClick={() => {
                  setHand(h);
                  setParams({ hand: h }, { replace: true });
                }}
              >
                {h}
              </button>
            ))}
          </span>
        </div>

        <div className="hast-two">
          <div>
            <div
              ref={frame}
              className={`printframe${capture && url ? "" : " is-empty"}${tracing ? " is-tracing" : ""}`}
              onPointerDown={(e) => {
                if (!capture || !url) return;
                e.currentTarget.setPointerCapture(e.pointerId);
                if (tracing) {
                  setLive([toCanon(e)]);
                  return;
                }
                setLoupeUp(true);
                placeLoupe(e);
              }}
              onPointerMove={(e) => {
                if (tracing && live.length) {
                  const p = toCanon(e);
                  setLive((pts) => [...pts, p]);
                  play("scratch", 0.5);
                } else if (loupeUp) placeLoupe(e);
              }}
              onPointerCancel={() => {
                setLive([]);
                setLoupeUp(false);
              }}
              onPointerUp={() => {
                if (tracing && live.length) {
                  const raw = live;
                  setLive([]);
                  void commitTrace(raw);
                }
                if (loupeUp) window.setTimeout(() => setLoupeUp(false), 900);
              }}
            >
              {capture && url ? (
                <>
                  <img className="print" src={url} alt={`Rectified print of the ${hand} palm`} />
                  <LineOverlay lines={lines} landmarks={landmarks} inkKey={inkKey} live={live.length > 1 ? pathD(live) : ""} />
                  <div className="burnedge" ref={burnEdge} aria-hidden="true" />
                  <div className={`loupe${loupeUp ? " is-up" : ""}`} ref={loupe} aria-hidden="true" data-decorative="true">
                    <div className="loupe__glass">
                      <div ref={lens} style={{ width: width * Z, height: width * Z }}>
                        <img src={url} alt="" style={{ width: "100%", height: "100%", filter: "grayscale(.35) contrast(1.15)" }} />
                        <svg className="print-lines" viewBox={`0 0 ${S} ${S}`} style={{ width: "100%", height: "100%" }}>
                          {lines.map((l) => (
                            <path
                              key={l.id}
                              className={`ln${l.confidence < LOW_CONFIDENCE ? " ln--faint" : ""}${l.source === "traced" ? " ln--traced" : ""}`}
                              d={pathD(l.path)}
                            />
                          ))}
                        </svg>
                      </div>
                    </div>
                    <div className="loupe__rim" />
                    <div className="loupe__flare" />
                  </div>
                </>
              ) : (
                <div className="empty-note">
                  <svg
                    width="74"
                    height="74"
                    viewBox="0 0 74 74"
                    fill="none"
                    stroke="var(--ink-muted)"
                    strokeWidth="1.4"
                    aria-hidden="true"
                  >
                    <path d="M22 62c-6-9-9-16-9-22V26a4 4 0 0 1 8 0v10V16a4 4 0 0 1 8 0v20V12a4 4 0 0 1 8 0v24V18a4 4 0 0 1 8 0v22c0 10-2 16-6 22" />
                  </svg>
                  <b>Lay your hand here</b>
                  <span style={{ fontSize: "var(--text-sm)" }}>Fill the frame · palm flat · even light</span>
                  <Link className="stamp" to={`/hast/${id ?? ""}/capture?hand=${hand}`} style={{ marginTop: 8, textDecoration: "none" }}>
                    <span>◉ &nbsp;Open the camera</span>
                  </Link>
                </div>
              )}
            </div>

            {capture ? (
              <div className="tools">
                <button
                  type="button"
                  className="tool"
                  aria-pressed={tracing}
                  onClick={() => {
                    setTracing((t) => !t);
                    toast(tracing ? "Stylus down." : "Stylus in hand — drag along a line; the faint one is traced first.");
                  }}
                >
                  ✎ Trace lines
                </button>
                <Link className="tool" to={`/hast/${id ?? ""}/capture?hand=${hand}`}>
                  ◉ Retake
                </Link>
                <button
                  type="button"
                  className="tool"
                  onClick={() => {
                    const h = hand === "right" ? "left" : "right";
                    setHand(h);
                    setParams({ hand: h }, { replace: true });
                  }}
                >
                  ⇄ Other hand
                </button>
              </div>
            ) : null}
            {tracing && lines.length ? (
              <div className="trace-keys" role="group" aria-label="Keyboard stylus">
                <span>Nudge</span>
                <span className="seg">
                  {lines.map((l) => (
                    <button key={l.id} type="button" aria-pressed={selected === l.id} onClick={() => setSelected(l.id)}>
                      {LETTER[l.id]}. {NAME[l.id]}
                    </button>
                  ))}
                </span>
                <button
                  type="button"
                  className="tool"
                  aria-label={`Nudge the ${NAME[selected]} line with the arrow keys; Shift moves 10 pixels`}
                  onKeyDown={(e) => {
                    const step = e.shiftKey ? 10 : 1;
                    const m: Record<string, [number, number]> = {
                      ArrowLeft: [-step, 0],
                      ArrowRight: [step, 0],
                      ArrowUp: [0, -step],
                      ArrowDown: [0, step],
                    };
                    const d = m[e.key];
                    if (d) {
                      e.preventDefault();
                      void nudge(d[0], d[1]);
                    }
                  }}
                >
                  ↔ arrows
                </button>
              </div>
            ) : null}
          </div>

          <div>
            {reading ? (
              <>
                <TurmericBand title="Findings" meta={weak.length ? `${weak.length} uncertain` : `${lines.length} lines`} plain level={2} />
                <table className="ledger findings">
                  <caption className="vh">Palm measurements and line confidence</caption>
                  <tbody>
                    <tr>
                      <th scope="row" style={{ textAlign: "left", fontWeight: 400, paddingLeft: "var(--paper-margin)" }}>
                        Element
                      </th>
                      <td>{ELEMENT[reading.element]}</td>
                      <td className="num pd" colSpan={2}>
                        W/L {reading.ratios.widthOverLength.toFixed(2)} · F/L {reading.ratios.fingerOverPalm.toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <th scope="row" style={{ textAlign: "left", fontWeight: 400, paddingLeft: "var(--paper-margin)" }}>
                        Fingers
                      </th>
                      <td className="num">2D:4D {reading.ratios.indexOverRing.toFixed(2)}</td>
                      <td className="num pd" colSpan={2}>
                        thumb {reading.ratios.thumbAngleDeg.toFixed(0)}°
                      </td>
                    </tr>
                    {lines.map((l) => (
                      <tr
                        key={l.id}
                        aria-label={`${NAME[l.id]} line, confidence ${l.confidence.toFixed(2)}${l.source === "traced" ? ", traced" : ""}`}
                      >
                        <th scope="row" style={{ textAlign: "left", fontWeight: 400, paddingLeft: "var(--paper-margin)" }}>
                          {LETTER[l.id]}. {NAME[l.id]}
                        </th>
                        <td className="num">len {l.metrics.length.toFixed(2)}</td>
                        <td className="num pd">curve {l.metrics.curvature.toFixed(2)}</td>
                        <td>{conf(l)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {weak.length || missing.length ? (
                  <p className="note-haldi">
                    <span aria-hidden="true">⚑</span>
                    <span>
                      {weak.length
                        ? `The ${weak.map((l) => NAME[l.id].toLowerCase()).join(" and ")} line${weak.length > 1 ? "s read" : " reads"} below 0.6 — the app will not read what it cannot see.`
                        : `The ${missing.map((m) => m.toLowerCase()).join(", ")} line${missing.length > 1 ? "s were" : " was"} not found in this print.`}{" "}
                      Trace to confirm: the reading is recomputed from your stroke.
                    </span>
                  </p>
                ) : null}
                <div className="hast-reading" aria-live="polite">
                  <p className="p p--muted">{framingNote(hand, profile?.handedness ?? "right", settings.handFraming)}</p>
                  {reading.hits.map((h, i) => (
                    <p className="hit" key={h.ruleId}>
                      {h.text}
                      <button
                        type="button"
                        className="cite"
                        aria-label={`Citation: ${h.citation.text}, ${h.citation.ref}`}
                        onClick={() => setFoot(h)}
                      >
                        {i + 1}
                      </button>
                      <span className="measured">{h.measured}</span>
                    </p>
                  ))}
                </div>
              </>
            ) : capture ? (
              <p className="p">This print has landmarks but no reading yet — retake it to read the lines.</p>
            ) : (
              <p className="p p--muted">
                Your palm is photographed and read on this device. The photo is kept only on this device and can be deleted with one hold.
              </p>
            )}

            {capture ? (
              <div className="tools" style={{ paddingBottom: "var(--space-4)" }}>
                <button type="button" className="tool danger-text" aria-label="Delete this palm photo — hold" {...burn}>
                  Delete this palm photo (hold)
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <Colophon
          rows={[
            ["Landmarks", "MediaPipe Hand Landmarker (Apache-2.0), on this device"],
            ["Lines", "rectified 512 px print · CLAHE · black-hat · Hessian ridge · Zhang–Suen"],
            ["Tradition", "Sāmudrika Śāstra, read as temperament, never as fate"],
          ]}
        />
      </div>

      <Sheet open={foot !== null} onClose={() => setFoot(null)} label="Citation">
        {foot ? (
          <div className="sheet-body">
            <TurmericBand title={foot.citation.text} meta={foot.citation.ref} level={2} />
            <p className="p">{foot.text}</p>
            <p className="p p--muted">Measured: {foot.measured}</p>
          </div>
        ) : null}
        <div className="tools" style={{ paddingBottom: "var(--space-3)" }}>
          <button type="button" className="linkish" onClick={() => setFoot(null)}>
            Close
          </button>
        </div>
      </Sheet>
    </Screen>
  );
}
