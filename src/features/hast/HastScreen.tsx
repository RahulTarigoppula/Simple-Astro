// Palm reading for one person. Before a photo: three steps and one button. After a photo: the reading
// in plain sentences, line by line, each with how clearly the line was seen (in words and a number),
// then the traced print, retake and delete, and the measurements folded away.
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { useProfile, useSettings } from "../../app/hooks";
import { DISCLAIMER } from "../../components/ui/Colophon";
import { InfoDot } from "../../components/ui/Explain";
import { Page, Section } from "../../components/ui/Page";
import { useHold } from "../../components/ui/useHold";
import { useInkDraw } from "../../components/ui/useInkDraw";
import { db } from "../../data/db";
import { deletePalmCapture, getBlobUrl, saveReading } from "../../data/repo";
import { guessLineId, LINE_ORDER, LOW_CONFIDENCE, MAIN_LINES, tracedLine } from "../../engine/palm/label";
import { applyH, type Mat3 } from "../../engine/palm/rectify";
import { framingNote, withLineReplaced } from "../../engine/palm/rules";
import type { HandCapture, PalmLine, PalmLineId, PalmReading } from "../../engine/types";
import { haptics } from "../../platform/haptics";
import { play } from "../../platform/sound";
import { countEvent } from "../../platform/stats";
import { toast } from "../../state/ui";
import { IconPalm } from "../chowki/icons";
import "./hast.css";

const S = 512; // canonical print frame
const LETTER: Record<PalmLineId, string> = { heart: "a", head: "b", life: "c", fate: "d" };
const NAME: Record<PalmLineId, string> = { heart: "Heart", head: "Head", life: "Life", fate: "Fate" };
const ABOUT: Record<PalmLineId, string> = {
  heart: "Feelings and relationships",
  head: "Thinking style",
  life: "Energy, not length of life",
  fate: "Direction in work",
};
const GLOSS: Record<PalmLineId, string> = { heart: "heart-line", head: "head-line", life: "life-line", fate: "fate-line" };
const ELEMENT: Record<string, string> = { earth: "Earth", air: "Air", fire: "Fire", water: "Water" };
type Hand = "right" | "left";
type Hit = PalmReading["hits"][number];

const pathD = (pts: ReadonlyArray<readonly [number, number]>) =>
  pts.length ? `M${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L")}` : "";

/** How clearly a line was seen, in words; the number always sits beside it. */
function clarity(l: PalmLine): { word: string; chip: string } {
  if (l.source === "traced") return { word: "Traced by you", chip: "v-chip--gold" };
  if (l.confidence >= 0.8) return { word: "Clear", chip: "v-chip--good" };
  if (l.confidence >= LOW_CONFIDENCE) return { word: "Fairly clear", chip: "v-chip--calm" };
  return { word: "Unsure", chip: "v-chip--mixed" };
}

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
    <svg className="palm-lines" viewBox={`0 0 ${S} ${S}`} ref={ref} aria-hidden="true">
      {lines.length === 0
        ? landmarks.map(([x, y]) => <circle key={`${x}-${y}`} className="lm" cx={x} cy={y} r="4" data-settle="" />)
        : null}
      {lines.map((l, i) => {
        const d = pathD(l.path);
        const faint = l.confidence < LOW_CONFIDENCE;
        const mid = l.path[Math.floor(l.path.length / 2)] ?? [0, 0];
        return (
          <g key={l.id}>
            <path className="halo" d={d} data-ink="400" data-delay={String(i * 200)} />
            <path
              className={`ln${faint ? " ln--faint" : ""}${l.source === "traced" ? " ln--traced" : ""}`}
              d={d}
              data-ink="400"
              data-delay={String(i * 200)}
            />
            <text x={mid[0] + 10} y={mid[1] - 10} data-settle="">
              {LETTER[l.id]}
            </text>
          </g>
        );
      })}
      {live ? <path className="ln ln--traced" d={live} /> : null}
    </svg>
  );
}

function HandChoice({ hand, onChange }: { hand: Hand; onChange: (h: Hand) => void }) {
  return (
    <div className="v-seg" role="radiogroup" aria-label="Which hand">
      {(["right", "left"] as const).map((h) => (
        <button key={h} type="button" role="radio" aria-checked={hand === h} onClick={() => onChange(h)}>
          {h === "right" ? "Right hand" : "Left hand"}
        </button>
      ))}
    </div>
  );
}

function DeleteHold({ onDelete }: { onDelete: () => void }) {
  const fill = useRef<HTMLSpanElement>(null);
  const hold = useHold({
    ms: 900,
    onProgress: (k) => {
      if (fill.current) fill.current.style.transform = `scaleX(${k})`;
    },
    onFire: onDelete,
  });
  return (
    <button type="button" className="v-btn v-btn--danger palm-delete" aria-label="Delete this palm photo (hold)" {...hold}>
      <span className="palm-delete__fill" ref={fill} aria-hidden="true" />
      <span>Hold to delete this photo</span>
    </button>
  );
}

export default function HastScreen() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const profile = useProfile(id);
  const settings = useSettings();
  const captures = useLiveQuery(async () => (id ? db.palms.where("profileId").equals(id).sortBy("capturedAt") : []), [id]);
  // The hand lives in the URL, so Back, a retake and a person switch all land on the right view.
  const hand: Hand = params.get("hand") === "left" ? "left" : params.get("hand") === "right" ? "right" : (profile?.handedness ?? "right");
  const capture: HandCapture | undefined = useMemo(() => [...(captures ?? [])].reverse().find((c) => c.hand === hand), [captures, hand]);
  const reading = useLiveQuery(async () => (capture ? db.readings.get(capture.id) : undefined), [capture?.id]);
  const [url, setUrl] = useState<string | null>(null);
  const [tracing, setTracing] = useState(params.get("trace") === "1");
  const [live, setLive] = useState<Array<[number, number]>>([]);
  const [selected, setSelected] = useState<PalmLineId>("life");
  // Tracing belongs to one person's photo: switching person with the chip puts the pencil down.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the person in the address changes
  useEffect(() => {
    setTracing(params.get("trace") === "1");
    setLive([]);
  }, [id]);

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

  const landmarks = useMemo<Array<[number, number]>>(() => {
    if (capture?.homography.length !== 9) return [];
    const H = capture.homography as Mat3;
    // Landmarks are normalised in the original frame; the homography maps original pixels → print.
    const [w, h] = capture.imageSize ?? [1, 1];
    return capture.landmarks
      .map((p) => applyH(H, [p.x * w, p.y * h]) as [number, number])
      .filter(([x, y]) => x >= 0 && y >= 0 && x <= S && y <= S);
  }, [capture]);

  const setHand = (h: Hand) => {
    setTracing(false);
    setParams({ hand: h }, { replace: true });
  };

  const lines = reading?.lines ?? [];
  const weak = lines.filter((l) => l.confidence < LOW_CONFIDENCE && l.source !== "traced");
  const missing = MAIN_LINES.filter((l) => !lines.some((x) => x.id === l));
  const inkKey = `${capture?.id ?? ""}|${reading?.computedAt ?? 0}`;

  const toCanon = (e: React.PointerEvent): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * S, ((e.clientY - r.top) / r.height) * S];
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
    toast(`Traced the ${NAME[id0].toLowerCase()} line. The reading was recomputed from your geometry.`);
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

  const remove = () => {
    if (!capture) return;
    void deletePalmCapture(capture.id).then(() => {
      haptics.impact("heavy");
      play("crackle");
      setTracing(false);
      toast("Palm photo deleted. The photo and its landmarks are gone from this device.", "danger");
    });
  };

  if (profile === null) {
    return (
      <Page label="Person not found" title="Person not found" back="/" backLabel="Home">
        <div className="v-card v-empty">
          <p>This person is not saved on this device.</p>
          <Link className="v-btn" to="/">
            Back home
          </Link>
        </div>
      </Page>
    );
  }

  const name = profile?.name ?? "";
  const captureTo = `/hast/${id ?? ""}/capture?hand=${hand}`;
  const loading = profile === undefined || captures === undefined;
  const hitsOf = (prefix: string) => (reading?.hits ?? []).filter((h) => h.ruleId.startsWith(`${prefix}-`));
  const shapeHits = (reading?.hits ?? []).filter((h) => !LINE_ORDER.some((l) => h.ruleId.startsWith(`${l}-`)));
  const foundLines = LINE_ORDER.map((lid) => lines.find((l) => l.id === lid)).filter((l): l is PalmLine => !!l);

  return (
    <Page label={`Palm reading: ${name}`} eyebrow={name || undefined} title="Palm reading" back wide={!!capture}>
      {loading ? null : (
        <>
          <HandChoice hand={hand} onChange={setHand} />

          {!capture ? (
            <>
              <section className="v-card v-card--hero palm-start" aria-labelledby="palm-start-h">
                <span className="v-empty__art" aria-hidden="true">
                  <IconPalm size={30} />
                </span>
                <h2 id="palm-start-h" className="palm-start__h">
                  One photo of {name ? `${name}'s` : "your"} {hand} palm
                </h2>
                <p className="v-lede">
                  Vyomaphala finds the heart, head and life lines in the photo and tells you what tradition says about each.{" "}
                  <InfoDot id="hast-rekha" label="palm reading" />
                </p>
                <ol className="palm-steps">
                  <li>
                    <span className="palm-steps__n" aria-hidden="true">
                      1
                    </span>
                    <span>
                      <b>Lay your palm flat in good light</b>
                      <span>Open hand, fingers together, near a window. No flash.</span>
                    </span>
                  </li>
                  <li>
                    <span className="palm-steps__n" aria-hidden="true">
                      2
                    </span>
                    <span>
                      <b>Take the photo</b>
                      <span>Fill the outline with the palm. The button lights up when the picture is sharp.</span>
                    </span>
                  </li>
                  <li>
                    <span className="palm-steps__n" aria-hidden="true">
                      3
                    </span>
                    <span>
                      <b>Read the lines</b>
                      <span>Each line gets a plain sentence, and how clearly it was seen.</span>
                    </span>
                  </li>
                </ol>
                <Link className="v-btn v-btn--block" to={captureTo} replace onClick={() => countEvent("palm-camera")}>
                  Open the camera
                </Link>
                <p className="v-small v-muted">The photo stays on this device. It is never uploaded, and you can delete it any time.</p>
              </section>
              <p className="v-small v-muted">{framingNote(hand, profile?.handedness ?? "right", settings.handFraming)}</p>
            </>
          ) : (
            <>
              {weak.length || missing.length ? (
                <div className="v-note v-note--warn">
                  <span>
                    {weak.length
                      ? `The ${weak.map((l) => NAME[l.id].toLowerCase()).join(" and ")} line${weak.length > 1 ? "s read" : " reads"} below 0.6, and the app will not read what it cannot see.`
                      : `The ${missing.join(", ")} line${missing.length > 1 ? "s were" : " was"} not found in this print.`}{" "}
                    Trace to confirm: the reading is recomputed from your stroke. Or retake the photo in better light.
                  </span>
                </div>
              ) : null}

              <div className="v-cols">
                <div className="v-stack palm-readcol">
                  <Section title="What your palm says" note={framingNote(hand, profile?.handedness ?? "right", settings.handFraming)} />
                  {reading ? (
                    <div className="v-stack" aria-live="polite">
                      {foundLines.map((l) => {
                        const c = clarity(l);
                        const hits = hitsOf(l.id);
                        return (
                          <section key={l.id} className="v-card palm-line" aria-labelledby={`palm-${l.id}`}>
                            <div className="palm-line__head">
                              <span className="palm-line__letter" aria-hidden="true">
                                {LETTER[l.id]}
                              </span>
                              <div className="palm-line__title">
                                <h3 id={`palm-${l.id}`}>
                                  {NAME[l.id]} line <InfoDot id={GLOSS[l.id]} />
                                </h3>
                                <p className="v-small v-muted">{ABOUT[l.id]}</p>
                              </div>
                              <span
                                className={`v-chip ${c.chip}`}
                                role="img"
                                aria-label={`${NAME[l.id]} line, ${c.word.toLowerCase()}, confidence ${l.confidence.toFixed(2)}`}
                              >
                                {c.word} · {l.confidence.toFixed(2)}
                              </span>
                            </div>
                            {hits.length ? (
                              hits.map((h) => <p key={h.ruleId}>{h.text}</p>)
                            ) : (
                              <p className="v-muted">The line was found, but none of the traditional rules applies to its shape.</p>
                            )}
                          </section>
                        );
                      })}
                      {missing.map((lid) => (
                        <section key={lid} className="v-card palm-line" aria-labelledby={`palm-${lid}`}>
                          <div className="palm-line__head">
                            <div className="palm-line__title">
                              <h3 id={`palm-${lid}`}>{NAME[lid]} line</h3>
                              <p className="v-small v-muted">{ABOUT[lid]}</p>
                            </div>
                            <span className="v-chip">Not found</span>
                          </div>
                          <p className="v-muted">This line could not be seen in the photo, so nothing is said about it.</p>
                        </section>
                      ))}
                      {shapeHits.length ? (
                        <section className="v-card palm-line" aria-labelledby="palm-shape">
                          <div className="palm-line__head">
                            <div className="palm-line__title">
                              <h3 id="palm-shape">Hand shape</h3>
                              <p className="v-small v-muted">Palm, fingers and thumb</p>
                            </div>
                            <span className="v-chip v-chip--violet">{ELEMENT[reading.element]} hand</span>
                          </div>
                          {shapeHits.map((h) => (
                            <p key={h.ruleId}>{h.text}</p>
                          ))}
                        </section>
                      ) : null}
                    </div>
                  ) : (
                    <div className="v-card">
                      <p>This photo has the hand marked but no reading yet. Retake it to read the lines.</p>
                    </div>
                  )}
                </div>

                <div className="v-stack">
                  <Section title="Your palm, traced" />
                  <div className="v-card palm-printcard">
                    <div
                      className={`palm-print${tracing ? " is-tracing" : ""}`}
                      onPointerDown={(e) => {
                        if (!url || !tracing) return;
                        e.currentTarget.setPointerCapture(e.pointerId);
                        setLive([toCanon(e)]);
                      }}
                      onPointerMove={(e) => {
                        if (!tracing || !live.length) return;
                        const p = toCanon(e);
                        setLive((pts) => [...pts, p]);
                      }}
                      onPointerCancel={() => setLive([])}
                      onPointerUp={() => {
                        if (!tracing || !live.length) return;
                        const raw = live;
                        setLive([]);
                        void commitTrace(raw);
                      }}
                    >
                      {url ? <img src={url} alt={`The ${hand} palm, flattened, with its lines traced`} draggable={false} /> : null}
                      <LineOverlay lines={lines} landmarks={landmarks} inkKey={inkKey} live={live.length > 1 ? pathD(live) : ""} />
                    </div>
                    {lines.length ? (
                      <ul className="palm-legend" aria-label="Lines on the photo">
                        {foundLines.map((l) => (
                          <li key={l.id}>
                            <span className="palm-line__letter" aria-hidden="true">
                              {LETTER[l.id]}
                            </span>
                            {NAME[l.id]}
                            {l.source === "traced" ? " (traced)" : l.confidence < LOW_CONFIDENCE ? " (unsure, dashed)" : ""}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <div className="v-actions">
                      <Link className="v-btn v-btn--sm" to={captureTo} replace>
                        Retake the photo
                      </Link>
                      {reading ? (
                        <button
                          type="button"
                          className="v-btn v-btn--ghost v-btn--sm"
                          aria-pressed={tracing}
                          onClick={() => setTracing((t) => !t)}
                        >
                          {tracing ? "Done tracing" : "Trace a line myself"}
                        </button>
                      ) : null}
                    </div>
                    {tracing && reading ? (
                      <div className="v-note palm-trace">
                        <p>
                          Draw along a line on the photo with your finger.{" "}
                          {weak[0] || missing[0]
                            ? `The ${NAME[(weak[0]?.id ?? missing[0]) as PalmLineId].toLowerCase()} line is traced first.`
                            : "The app works out which line you drew."}
                        </p>
                        {lines.length ? (
                          <fieldset className="palm-nudge">
                            <legend className="v-small">With a keyboard: choose a line, then move it with the arrow keys.</legend>
                            <div className="v-seg">
                              {foundLines.map((l) => (
                                <button key={l.id} type="button" aria-pressed={selected === l.id} onClick={() => setSelected(l.id)}>
                                  {NAME[l.id]}
                                </button>
                              ))}
                            </div>
                            <button
                              type="button"
                              className="v-btn v-btn--ghost v-btn--sm"
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
                              Focus here, then press the arrows
                            </button>
                          </fieldset>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="v-card palm-private">
                    <h3 className="v-card__title">Your photo is private</h3>
                    <p className="v-card__sub">
                      It stays on this device and is never uploaded. Deleting removes the photo and its reading.
                    </p>
                    <DeleteHold onDelete={remove} />
                  </div>
                </div>
              </div>

              {reading ? (
                <>
                  <Section title="Full detail" />
                  <details className="v-fold">
                    <summary>
                      <span>
                        Measurements
                        <span className="v-fold__s">What was measured for each sentence, and its source</span>
                      </span>
                    </summary>
                    <div className="v-fold__body">
                      <dl className="palm-facts">
                        <div>
                          <dt>Hand shape</dt>
                          <dd>
                            {ELEMENT[reading.element]} · width/length {reading.ratios.widthOverLength.toFixed(2)} · finger/palm{" "}
                            {reading.ratios.fingerOverPalm.toFixed(2)}
                          </dd>
                        </div>
                        <div>
                          <dt>Fingers</dt>
                          <dd>
                            index/ring {reading.ratios.indexOverRing.toFixed(2)} · thumb angle {reading.ratios.thumbAngleDeg.toFixed(0)}°
                          </dd>
                        </div>
                        {foundLines.map((l) => (
                          <div key={l.id}>
                            <dt>
                              {LETTER[l.id]}. {NAME[l.id]} line
                            </dt>
                            <dd>
                              length {l.metrics.length.toFixed(2)} · curve {l.metrics.curvature.toFixed(2)} · confidence{" "}
                              {l.confidence.toFixed(2)}
                              {l.source === "traced" ? " · traced" : ""}
                            </dd>
                          </div>
                        ))}
                      </dl>
                      <ol className="palm-sources">
                        {reading.hits.map((h: Hit) => (
                          <li key={h.ruleId}>
                            <span>{h.text}</span>
                            <span className="v-small v-muted">
                              Measured: {h.measured}. Source: {h.citation.text}, {h.citation.ref}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </details>
                </>
              ) : null}
            </>
          )}

          <details className="v-fold">
            <summary>How this was calculated</summary>
            <div className="v-fold__body">
              <dl className="palm-facts">
                <div>
                  <dt>Finding the hand</dt>
                  <dd>MediaPipe Hand Landmarker (Apache-2.0), on this device</dd>
                </div>
                <div>
                  <dt>Lines</dt>
                  <dd>rectified 512 px print · CLAHE · black-hat · Hessian ridge · Zhang-Suen</dd>
                </div>
                <div>
                  <dt>Tradition</dt>
                  <dd>Sāmudrika Śāstra, read as temperament, never as fate</dd>
                </div>
              </dl>
            </div>
          </details>
          <p className="v-foot">{DISCLAIMER} All computation happened on this device. Nothing left it.</p>
        </>
      )}
    </Page>
  );
}
