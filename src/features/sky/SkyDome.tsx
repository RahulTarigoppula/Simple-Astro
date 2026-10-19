// SkyDome (§4.6, §6.14), the lazy 3D Rooftop: three r185 + R3F 9, frameloop "demand", DPR ≤ 1.5.
// Stars are one Points with per-vertex size/alpha on the celestial sphere; the sidereal zodiac is
// a brass torus with 12 rāśi dividers and 27 nakshatra ticks; grahas are brass billboards with
// Devanagari abbreviations; the Moon shows its phase with the lit limb turned towards the Sun;
// the Lagna is a sindoor beam at the eastern horizon; a parapet rings the roof.
//
// Nothing here animates by itself: a frame renders only when the sky changes (scrub), when the
// view is dragged (with BRASS inertia), or on resize, and never while the page is hidden.
// This module is the ONLY importer of three / @react-three/fiber, so they stay out of the entry.
// R3F through `createRoot` rather than <Canvas>: <Canvas> registers the entire THREE namespace in
// its catalogue (defeating tree-shaking, ~+40 kB gz). The scene is built imperatively and mounted
// as a <primitive>, so the catalogue can stay empty.
import { createRoot, type ReconcilerRoot, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  type Material,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Points,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  type Texture,
  TorusGeometry,
  Vector3,
} from "three";
import { GRAHA_ABBR_DEV, SIGN_DEV, SIGN_NAMES } from "../../data/tables/names";
import type { RooftopSky } from "../../engine/sky/rooftop";
import { type Mat3, mul3, type StarCatalog } from "../../engine/sky/stars";
import type { GrahaId } from "../../engine/types";
import { moonLitPath } from "./scene";

export interface SkyDomeProps {
  sky: RooftopSky;
  stars: StarCatalog;
  /** Initial look azimuth (degrees), the Lagna's, so the dome opens facing the eastern horizon. */
  lookAz: number;
  paused: boolean;
  noInertia: boolean;
  onReady: () => void;
  onLost: () => void;
}

const R_STARS = 100;
const R_RING = 92;
const R_BODIES = 90;
const R_WALL = 58;
const R_LAGNA = 50;
const D2R = Math.PI / 180;
const WALL_TOP = R_WALL * Math.tan(5 * D2R);
const MERLON_H = R_WALL * Math.tan(9 * D2R) - WALL_TOP;

const FONT_BODY = '"Tiro Devanagari Hindi", "Noto Serif Devanagari", Georgia, serif';
const FONT_MONO = '"Martian Mono Variable", "Martian Mono", Consolas, monospace';

type Tok = (name: string, fallback?: string) => string;
function tokens(): Tok {
  const css = getComputedStyle(document.documentElement);
  return (name, fallback = "gray") => css.getPropertyValue(name).trim() || fallback;
}

/** Row-major E/U/N matrix → three (x = East, y = Up, z = South). */
function toThree(m: Mat3, out: Matrix4): Matrix4 {
  return out.set(m[0], m[1], m[2], 0, m[3], m[4], m[5], 0, -m[6], -m[7], -m[8], 0, 0, 0, 0, 1);
}

function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (ctx) draw(ctx);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 2;
  return t;
}

const STAR_VERT = /* glsl */ `
attribute float aSize;
attribute float aAlpha;
uniform float uScale;
varying float vAlpha;
void main() {
  vAlpha = aAlpha;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uScale;
}`;
const STAR_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uFade;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.34, d) * vAlpha * uFade;
  if (a <= 0.003) discard;
  gl_FragColor = vec4(uColor, a);
  #include <colorspace_fragment>
}`;

interface Built {
  root: Group;
  starGroup: Group;
  zodiac: Group;
  ecliptic: Group;
  uFade: { value: number };
  uScale: { value: number };
  bodies: Map<GrahaId, Sprite>;
  moonTex: { tex: CanvasTexture; draw: (k: number) => void };
  lagna: Group;
}

function build(stars: StarCatalog, tok: Tok, dpr: number): Built {
  const root = new Group();

  // ── stars: J2000 unit vectors, rotated as a whole by the group matrix each frame ──
  const n = stars.count;
  const pos = new Float32Array(n * 3);
  const size = new Float32Array(n);
  const alpha = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    pos[3 * i] = (stars.xyz[3 * i] ?? 0) * R_STARS;
    pos[3 * i + 1] = (stars.xyz[3 * i + 1] ?? 0) * R_STARS;
    pos[3 * i + 2] = (stars.xyz[3 * i + 2] ?? 0) * R_STARS;
    const m = stars.mag[i] ?? 6;
    size[i] = Math.max(1.5, 5.6 * 10 ** (-0.11 * (m + 1)));
    alpha[i] = m < 4 ? 1 : Math.max(0.3, 1 - ((m - 4) / 2.5) * 0.7);
  }
  const sg = new BufferGeometry();
  sg.setAttribute("position", new BufferAttribute(pos, 3));
  sg.setAttribute("aSize", new BufferAttribute(size, 1));
  sg.setAttribute("aAlpha", new BufferAttribute(alpha, 1));
  const uScale = { value: dpr };
  const uFade = { value: 1 };
  const starMat = new ShaderMaterial({
    vertexShader: STAR_VERT,
    fragmentShader: STAR_FRAG,
    transparent: true,
    depthWrite: false,
    uniforms: { uColor: { value: new Color(tok("--star", "wheat")) }, uScale, uFade },
  });
  const starGroup = new Group();
  starGroup.matrixAutoUpdate = false;
  starGroup.add(new Points(sg, starMat));
  root.add(starGroup);

  // ── block-print cloth: a fixed lattice of faint paper dots (Fibonacci sphere) ──
  const cn = 2600;
  const cpos = new Float32Array(cn * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < cn; i++) {
    const y = 1 - (2 * (i + 0.5)) / cn;
    const r = Math.sqrt(1 - y * y);
    cpos[3 * i] = Math.cos(golden * i) * r * 110;
    cpos[3 * i + 1] = y * 110;
    cpos[3 * i + 2] = Math.sin(golden * i) * r * 110;
  }
  const cg = new BufferGeometry();
  cg.setAttribute("position", new BufferAttribute(cpos, 3));
  cg.setAttribute("aSize", new BufferAttribute(new Float32Array(cn).fill(2.2), 1));
  cg.setAttribute("aAlpha", new BufferAttribute(new Float32Array(cn).fill(0.07), 1));
  const clothMat = new ShaderMaterial({
    vertexShader: STAR_VERT,
    fragmentShader: STAR_FRAG,
    transparent: true,
    depthWrite: false,
    uniforms: { uColor: { value: new Color(tok("--cloth-ink", "wheat")) }, uScale, uFade: { value: 1 } },
  });
  const cloth = new Points(cg, clothMat);
  cloth.renderOrder = -1;
  root.add(cloth);

  // ── the sidereal zodiac: equator-of-date group → ecliptic group (ε about x, ayanāṃśa about z) ──
  const zodiac = new Group();
  zodiac.matrixAutoUpdate = false;
  const ecliptic = new Group();
  zodiac.add(ecliptic);
  const brass = new MeshBasicMaterial({ color: new Color(tok("--brass-mid", "goldenrod")) });
  const brassDark = new MeshBasicMaterial({ color: new Color(tok("--brass-ink", "black")) });
  ecliptic.add(new Mesh(new TorusGeometry(R_RING, 0.55, 8, 360), brass));
  const tickGeo = new BoxGeometry(0.4, 0.4, 3.6);
  const rasiGeo = new BoxGeometry(0.6, 0.6, 7.2);
  const ticks = new InstancedMesh(tickGeo, brassDark, 27);
  const rasis = new InstancedMesh(rasiGeo, brass, 12);
  const dummy = new Object3D();
  for (let k = 0; k < 27; k++) {
    const th = ((k * 360) / 27) * D2R;
    dummy.position.set(R_RING * Math.cos(th), R_RING * Math.sin(th), 0);
    dummy.rotation.set(0, 0, th);
    dummy.updateMatrix();
    ticks.setMatrixAt(k, dummy.matrix);
  }
  for (let k = 0; k < 12; k++) {
    const th = k * 30 * D2R;
    dummy.position.set(R_RING * Math.cos(th), R_RING * Math.sin(th), 0);
    dummy.rotation.set(0, 0, th);
    dummy.updateMatrix();
    rasis.setMatrixAt(k, dummy.matrix);
  }
  ecliptic.add(ticks, rasis);
  for (let k = 0; k < 12; k++) {
    const tex = canvasTexture(256, 128, (ctx) => {
      ctx.textAlign = "center";
      ctx.fillStyle = tok("--brass-hi", "khaki");
      ctx.font = `56px ${FONT_BODY}`;
      ctx.fillText(SIGN_DEV[k] ?? "", 128, 62);
      ctx.fillStyle = tok("--brass-mid", "goldenrod");
      ctx.font = `italic 34px ${FONT_BODY}`;
      ctx.fillText(SIGN_NAMES[k] ?? "", 128, 108);
    });
    const s = new Sprite(new SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    const th = (k * 30 + 15) * D2R;
    const b = 7 * D2R;
    s.position.set(R_RING * Math.cos(th) * Math.cos(b), R_RING * Math.sin(th) * Math.cos(b), R_RING * Math.sin(b));
    s.scale.set(11, 5.5, 1);
    ecliptic.add(s);
  }
  root.add(zodiac);

  // ── the roof: a parapet wall with 36 merlons, the roof below the horizon ──
  const parapet = new MeshBasicMaterial({ color: new Color(tok("--parapet", "black")), side: DoubleSide });
  const roof = new Mesh(new SphereGeometry(R_WALL, 48, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), parapet);
  const wall = new Mesh(new CylinderGeometry(R_WALL, R_WALL, WALL_TOP, 96, 1, true), parapet);
  wall.position.y = WALL_TOP / 2;
  const merlons = new InstancedMesh(new BoxGeometry(R_WALL * 5 * D2R, MERLON_H, 1.2), parapet, 36);
  for (let k = 0; k < 36; k++) {
    const a = (k * 10 + 4.5) * D2R;
    dummy.position.set(R_WALL * Math.sin(a), WALL_TOP + MERLON_H / 2, -R_WALL * Math.cos(a));
    dummy.rotation.set(0, -a, 0);
    dummy.updateMatrix();
    merlons.setMatrixAt(k, dummy.matrix);
  }
  root.add(roof, wall, merlons);
  for (const [az, lat, dev] of [
    [0, "N", "उ"],
    [90, "E", "पू"],
    [180, "S", "द"],
    [270, "W", "प"],
  ] as const) {
    const tex = canvasTexture(128, 64, (ctx) => {
      ctx.textAlign = "center";
      ctx.fillStyle = tok("--brass-mid", "goldenrod");
      ctx.font = `600 34px ${FONT_MONO}`;
      ctx.fillText(lat, 40, 44);
      ctx.fillStyle = tok("--cloth-ink", "wheat");
      ctx.font = `36px ${FONT_BODY}`;
      ctx.fillText(dev, 92, 46);
    });
    const s = new Sprite(new SpriteMaterial({ map: tex, transparent: true }));
    const a = az * D2R;
    s.position.set((R_WALL - 1.5) * Math.sin(a), WALL_TOP * 0.5, -(R_WALL - 1.5) * Math.cos(a));
    s.scale.set(4.4, 2.2, 1);
    root.add(s);
  }

  // ── grahas: brass billboards ──
  const bodies = new Map<GrahaId, Sprite>();
  const disc = (id: GrahaId): CanvasTexture =>
    canvasTexture(128, 128, (ctx) => {
      const node = id === "RA" || id === "KE";
      ctx.beginPath();
      ctx.arc(64, 64, node ? 50 : 56, 0, Math.PI * 2);
      if (!node) {
        ctx.fillStyle = id === "SU" ? tok("--sun-disc", "moccasin") : tok("--brass-mid", "goldenrod");
        ctx.fill();
      }
      ctx.lineWidth = node ? 7 : 5;
      ctx.strokeStyle = node ? tok("--brass-hi", "khaki") : tok("--brass-dark", "saddlebrown");
      ctx.stroke();
      ctx.textAlign = "center";
      ctx.fillStyle = node ? tok("--brass-hi", "khaki") : tok("--brass-label", "black");
      ctx.font = `60px ${FONT_BODY}`;
      ctx.fillText(GRAHA_ABBR_DEV[id], 64, 86);
    });
  for (const id of ["SU", "MA", "ME", "JU", "VE", "SA", "RA", "KE"] as const) {
    const s = new Sprite(new SpriteMaterial({ map: disc(id), transparent: true }));
    s.scale.setScalar(id === "SU" ? 5 : 4.2);
    bodies.set(id, s);
    root.add(s);
  }
  const moonCanvas = document.createElement("canvas");
  moonCanvas.width = 128;
  moonCanvas.height = 128;
  const moonTexture = new CanvasTexture(moonCanvas);
  moonTexture.colorSpace = SRGBColorSpace;
  const drawMoon = (k: number): void => {
    const ctx = moonCanvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, 128, 128);
    ctx.save();
    ctx.translate(64, 64);
    ctx.beginPath();
    ctx.arc(0, 0, 52, 0, Math.PI * 2);
    ctx.fillStyle = tok("--sky-night-1", "black");
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = tok("--moon", "lavender");
    ctx.stroke();
    ctx.fillStyle = tok("--moon", "lavender");
    // canvas y runs down, the sprite's up is +y: the Sun lies along +x either way
    ctx.fill(new Path2D(moonLitPath(52, k)));
    ctx.restore();
    moonTexture.needsUpdate = true;
  };
  const moon = new Sprite(new SpriteMaterial({ map: moonTexture, transparent: true }));
  moon.scale.setScalar(5);
  bodies.set("MO", moon);
  root.add(moon);

  // ── Lagna: a sindoor beam rising from the ascendant point on the eastern horizon ──
  const lagna = new Group();
  const sindoor = new MeshBasicMaterial({ color: new Color(tok("--accent", "firebrick")), transparent: true, opacity: 0.9 });
  const beamH = R_LAGNA * Math.tan(18 * D2R);
  const beam = new Mesh(new CylinderGeometry(0.22, 0.22, beamH, 8), sindoor);
  beam.position.set(0, beamH / 2, -R_LAGNA);
  const tilak = new Mesh(new SphereGeometry(0.9, 16, 12), sindoor);
  tilak.position.set(0, 0, -R_LAGNA);
  lagna.add(beam, tilak);
  root.add(lagna);

  return { root, starGroup, zodiac, ecliptic, uFade, uScale, bodies, moonTex: { tex: moonTexture, draw: drawMoon }, lagna };
}

function disposeAll(o: Object3D): void {
  o.traverse((c) => {
    const m = c as Partial<Mesh>;
    m.geometry?.dispose();
    const mats: Material[] = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
    for (const mat of mats) {
      const map = (mat as Material & { map?: Texture | null }).map;
      map?.dispose();
      mat.dispose();
    }
  });
}

interface Look {
  az: number;
  alt: number;
  vaz: number;
  valt: number;
}

function DomeScene({
  sky,
  stars,
  look,
  onReady,
  onLost,
  bindInvalidate,
}: {
  sky: RooftopSky;
  stars: StarCatalog;
  look: React.RefObject<Look>;
  onReady: () => void;
  onLost: () => void;
  bindInvalidate: (fn: () => void) => void;
}) {
  const { gl, invalidate, camera, viewport, scene } = useThree();
  const bg = useMemo(() => {
    const tok = tokens();
    return { night: new Color(tok("--sky-cloth", "midnightblue")), day: new Color(tok("--sky-day-0", "steelblue")) };
  }, []);
  const built = useMemo(() => build(stars, tokens(), Math.min(1.5, window.devicePixelRatio || 1)), [stars]);
  const lastK = useRef(-1);
  const readySent = useRef(false);
  const tmp = useMemo(() => ({ m: new Matrix4(), a: new Vector3(), b: new Vector3() }), []);

  useEffect(() => {
    bindInvalidate(invalidate);
    const el = gl.domElement;
    const lost = (e: Event): void => {
      e.preventDefault();
      onLost();
    };
    el.addEventListener("webglcontextlost", lost);
    return () => el.removeEventListener("webglcontextlost", lost);
  }, [gl, invalidate, onLost, bindInvalidate]);

  useEffect(() => () => disposeAll(built.root), [built]);

  useEffect(() => {
    built.uScale.value = viewport.dpr;
    invalidate();
  }, [viewport.dpr, built, invalidate]);

  // The sky changed (scrub): rotate the celestial groups, move the bodies, no tween.
  useLayoutEffect(() => {
    toThree(mul3(sky.toHorizon, sky.frame), built.starGroup.matrix);
    built.starGroup.matrixWorldNeedsUpdate = true;
    toThree(sky.toHorizon, built.zodiac.matrix);
    built.zodiac.matrixWorldNeedsUpdate = true;
    built.ecliptic.rotation.set(sky.eps * D2R, 0, sky.ayanamsa * D2R, "XYZ");
    for (const b of sky.bodies) {
      const s = built.bodies.get(b.id);
      if (!s) continue;
      s.position.set(b.v[0] * R_BODIES, b.v[1] * R_BODIES, -b.v[2] * R_BODIES);
    }
    if (Math.abs(sky.moonK - lastK.current) > 0.004) {
      lastK.current = sky.moonK;
      built.moonTex.draw(sky.moonK);
    }
    built.lagna.rotation.set(0, -sky.lagna.az * D2R, 0);
    const day = Math.max(0, Math.min(1, (sky.sunAlt + 12) / 12));
    built.uFade.value = 1 - 0.55 * day;
    // Daylight washes the cloth a little, exactly as the painted disc does (no glow, no gradient).
    const back = scene.background instanceof Color ? scene.background : new Color();
    scene.background = back.copy(bg.night).lerp(bg.day, 0.3 * day);
    invalidate();
  }, [sky, built, invalidate, scene, bg]);

  useFrame((state) => {
    const L = look.current;
    camera.rotation.set(L.alt * D2R, -L.az * D2R, 0, "YXZ");
    camera.updateMatrixWorld();
    // Turn the Moon's lit limb towards the Sun as seen on screen.
    const mo = built.bodies.get("MO");
    const su = built.bodies.get("SU");
    if (mo && su) {
      tmp.a.copy(mo.position).project(camera);
      tmp.b.copy(mo.position).lerp(su.position, 0.02).project(camera);
      const sm = mo.material as SpriteMaterial;
      sm.rotation = Math.atan2((tmp.b.y - tmp.a.y) * state.size.height, (tmp.b.x - tmp.a.x) * state.size.width);
    }
    if (!readySent.current) {
      readySent.current = true;
      requestAnimationFrame(() => onReady());
    }
  });

  return <primitive object={built.root} />;
}

export default function SkyDome({ sky, stars, lookAz, paused, noInertia, onReady, onLost }: SkyDomeProps) {
  const look = useRef<Look>({ az: lookAz, alt: 24, vaz: 0, valt: 0 });
  const inv = useRef<() => void>(() => undefined);
  const drag = useRef<{ id: number; x: number; y: number; t: number } | null>(null);
  const raf = useRef(0);
  const host = useRef<HTMLDivElement>(null);

  const bindInvalidate = useCallback((fn: () => void) => {
    inv.current = fn;
  }, []);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const root = useRef<ReconcilerRoot<HTMLCanvasElement> | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [configured, setConfigured] = useState(false);

  useLayoutEffect(() => {
    const el = host.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return;
    root.current = createRoot(canvas);
    const measure = (): void => {
      const r = el.getBoundingClientRect();
      setSize((s) => (s && s.width === r.width && s.height === r.height ? s : { width: r.width, height: r.height }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.current?.unmount();
      root.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    const r = root.current;
    if (!r || !size || size.width < 2 || size.height < 2) return;
    let live = true;
    void r
      .configure({
        frameloop: paused ? "never" : "demand",
        dpr: [1, 1.5],
        flat: true,
        gl: { antialias: true, alpha: false, powerPreference: "low-power" },
        camera: { fov: 80, near: 0.1, far: 400, position: [0, 0, 0] },
        size: { width: size.width, height: size.height, top: 0, left: 0 },
        onCreated: ({ scene }) => {
          scene.background = new Color(tokens()("--sky-cloth", "midnightblue"));
        },
      })
      .then(() => {
        if (live) setConfigured(true);
      });
    return () => {
      live = false;
    };
  }, [size, paused]);

  // The sky changed (a scrub frame): hand the new model to the scene, it invalidates once.
  useLayoutEffect(() => {
    if (!configured) return;
    root.current?.render(
      <DomeScene sky={sky} stars={stars} look={look} onReady={onReady} onLost={onLost} bindInvalidate={bindInvalidate} />,
    );
  }, [configured, sky, stars, onReady, onLost, bindInvalidate]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  useEffect(() => {
    if (paused) cancelAnimationFrame(raf.current);
    else inv.current();
  }, [paused]);

  const degPerPx = (): number => 80 / Math.max(240, host.current?.clientHeight ?? 600);

  const coast = (): void => {
    const L = look.current;
    const step = (): void => {
      L.vaz *= 0.94;
      L.valt *= 0.94;
      L.az = (L.az + L.vaz + 360) % 360;
      L.alt = Math.max(-4, Math.min(88, L.alt + L.valt));
      inv.current();
      if (Math.hypot(L.vaz, L.valt) > 0.02 && !document.hidden) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };

  return (
    <div
      ref={host}
      className="dome"
      onPointerDown={(e) => {
        cancelAnimationFrame(raf.current);
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp };
        look.current.vaz = 0;
        look.current.valt = 0;
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        const k = degPerPx();
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        const dt = Math.max(1, e.timeStamp - d.t);
        d.x = e.clientX;
        d.y = e.clientY;
        d.t = e.timeStamp;
        const L = look.current;
        // The sky follows the finger 1:1.
        L.az = (L.az - dx * k + 360) % 360;
        L.alt = Math.max(-4, Math.min(88, L.alt + dy * k));
        L.vaz = 0.6 * L.vaz + 0.4 * ((-dx * k) / dt) * 16.7;
        L.valt = 0.6 * L.valt + 0.4 * ((dy * k) / dt) * 16.7;
        inv.current();
      }}
      onPointerUp={(e) => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        drag.current = null;
        if (!noInertia && e.timeStamp - d.t < 80) coast();
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
    >
      <canvas ref={canvasRef} className="dome__canvas" aria-hidden="true" tabIndex={-1} />
    </div>
  );
}
