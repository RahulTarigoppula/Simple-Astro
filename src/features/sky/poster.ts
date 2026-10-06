// PosterAction's renderer: a 1080 × 1920 PNG of the painted sky on indigo cloth — the person's name
// in Yatra One, the birth line, the Lagna, the engraved strip and a colophon. Canvas 2D only, drawn
// from the same PaintedScene the SVG uses (both renderers export this one poster). No network:
// web saves through an anchor with a data: URL; Android writes to the cache and opens the share sheet.
import { SKY_R } from "../../engine/sky/projection";
import { GRAHA_ABBR_DEV, SIGN_DEV, SIGN_NAMES } from "../../data/tables/names";
import { isNative } from "../../platform/native";
import { ALT_RINGS, CARDINALS, moonLitPath, type PaintedScene, PARAPET } from "./scene";

export const POSTER_W = 1080;
export const POSTER_H = 1920;

export interface PosterText {
  name: string;
  birthLine: string;
  lagnaDev: string;
  lagnaLine: string;
  strip: string;
  colophon: string;
}

/** Token colours resolved once per poster; named fallbacks only (no hex outside tokens.css). */
function palette(): (name: string, fallback?: string) => string {
  const css = getComputedStyle(document.documentElement);
  return (name, fallback = "gray") => css.getPropertyValue(name).trim() || fallback;
}

const FONT_DISPLAY = '"Yatra One", "Noto Sans Devanagari", Georgia, serif';
const FONT_BODY = '"Tiro Devanagari Hindi", "Noto Serif Devanagari", Georgia, serif';
const FONT_MONO = '"Martian Mono Variable", "Martian Mono", Consolas, monospace';

async function fontsReady(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  await Promise.allSettled([
    document.fonts.load(`96px ${FONT_DISPLAY}`, "Aa"),
    document.fonts.load(`40px ${FONT_BODY}`, "Aa मीन"),
    document.fonts.load(`30px ${FONT_MONO}`, "07:25"),
  ]);
}

function cloth(ctx: CanvasRenderingContext2D, c: (n: string, f?: string) => string, w: number, h: number): void {
  ctx.fillStyle = c("--bg-elevated", "midnightblue");
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = c("--surface", "wheat");
  ctx.globalAlpha = 0.08;
  for (let y = 8; y < h; y += 16) {
    for (let x = 8; x < w; x += 16) {
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

/** Draw the painted scene centred at (cx, cy) with the horizon at radius `radius` px. */
function drawSky(
  ctx: CanvasRenderingContext2D,
  c: (n: string, f?: string) => string,
  s: PaintedScene,
  cx: number,
  cy: number,
  radius: number,
): void {
  const k = radius / SKY_R;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(k, k);

  ctx.fillStyle = c("--sky-day-0", "steelblue");
  ctx.globalAlpha = s.daylight * 0.3;
  ctx.beginPath();
  ctx.arc(0, 0, SKY_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, SKY_R, 0, Math.PI * 2);
  ctx.clip();

  ctx.strokeStyle = c("--surface", "wheat");
  ctx.globalAlpha = 0.14;
  ctx.lineWidth = 0.6;
  ctx.setLineDash([2, 3]);
  ctx.stroke(new Path2D(ALT_RINGS));
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  ctx.fillStyle = c("--star", "wheat");
  const d = s.dots;
  for (let i = 0; i < d.n; i++) {
    ctx.globalAlpha = d.o[i] ?? 1;
    ctx.beginPath();
    ctx.arc(d.x[i] ?? 0, d.y[i] ?? 0, d.r[i] ?? 1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const ecl = new Path2D(s.ecliptic);
  ctx.lineCap = "round";
  ctx.strokeStyle = c("--brass-lo", "darkgoldenrod");
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = 8;
  ctx.stroke(ecl);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = c("--brass-hi", "khaki");
  ctx.lineWidth = 1;
  ctx.stroke(ecl);
  ctx.strokeStyle = c("--brass-ink", "black");
  ctx.lineWidth = 1;
  ctx.stroke(new Path2D(s.nakTicks));
  ctx.lineWidth = 1.6;
  ctx.stroke(new Path2D(s.rasiTicks));

  ctx.textAlign = "center";
  for (const r of s.rasiLabels) {
    ctx.fillStyle = c("--brass-hi", "khaki");
    ctx.font = `11px ${FONT_BODY}`;
    ctx.fillText(SIGN_DEV[r.sign] ?? "", r.x, r.y - 1);
    ctx.fillStyle = c("--brass-mid", "goldenrod");
    ctx.font = `italic 8px ${FONT_BODY}`;
    ctx.fillText(SIGN_NAMES[r.sign] ?? "", r.x, r.y + 9);
  }

  const disc = (x: number, y: number, r: number, fill: string, stroke: string, label: string, ink: string): void => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = ink;
    ctx.font = `11px ${FONT_BODY}`;
    ctx.fillText(label, x, y + 4);
  };
  if (s.sun.up)
    disc(s.sun.x, s.sun.y, 10, c("--sun-disc", "moccasin"), c("--brass-mid", "goldenrod"), GRAHA_ABBR_DEV.SU, c("--brass-label", "black"));
  for (const b of s.bodies) {
    if (!b.up || b.id === "SU" || b.id === "MO") continue;
    if (b.id === "RA" || b.id === "KE")
      disc(b.x, b.y, 8, "", c("--brass-hi", "khaki"), GRAHA_ABBR_DEV[b.id], c("--brass-hi", "khaki"));
    else
      disc(b.x, b.y, 9.5, c("--brass-mid", "goldenrod"), c("--brass-dark", "saddlebrown"), GRAHA_ABBR_DEV[b.id], c("--brass-label", "black"));
  }
  if (s.moon.up) {
    ctx.save();
    ctx.translate(s.moon.x, s.moon.y);
    ctx.fillStyle = c("--moon", "lavender");
    ctx.font = `11px ${FONT_BODY}`;
    ctx.fillText(GRAHA_ABBR_DEV.MO, 0, 20);
    ctx.rotate((s.moon.angle * Math.PI) / 180);
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fillStyle = c("--sky-night-1", "black");
    ctx.fill();
    ctx.strokeStyle = c("--moon", "lavender");
    ctx.lineWidth = 0.6;
    ctx.stroke();
    ctx.fillStyle = c("--moon", "lavender");
    ctx.fill(new Path2D(moonLitPath(8, s.moon.k)));
    ctx.restore();
  }
  ctx.restore(); // disc clip

  ctx.strokeStyle = c("--accent", "firebrick");
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(s.lagna.x, s.lagna.y);
  ctx.lineTo(s.lagna.bx, s.lagna.by);
  ctx.stroke();
  ctx.fillStyle = c("--parapet", "black");
  ctx.fill(new Path2D(PARAPET), "evenodd");
  for (const cd of CARDINALS) {
    ctx.fillStyle = c("--brass-mid", "goldenrod");
    ctx.font = `600 10px ${FONT_MONO}`;
    ctx.fillText(cd.lat, cd.x, cd.y + 3.5);
    ctx.fillStyle = c("--surface", "wheat");
    ctx.font = `12px ${FONT_BODY}`;
    ctx.fillText(cd.dev, cd.ox, cd.oy + 4);
  }
  ctx.beginPath();
  ctx.arc(s.lagna.x, s.lagna.y, 5.5, 0, Math.PI * 2);
  ctx.fillStyle = c("--accent", "firebrick");
  ctx.fill();
  ctx.strokeStyle = c("--accent-ink", "ivory");
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

/** Render the poster into a fresh canvas. */
export async function renderPoster(scene: PaintedScene, text: PosterText): Promise<HTMLCanvasElement> {
  await fontsReady();
  const canvas = document.createElement("canvas");
  canvas.width = POSTER_W;
  canvas.height = POSTER_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  const c = palette();
  cloth(ctx, c, POSTER_W, POSTER_H);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = c("--surface", "wheat");
  ctx.font = `92px ${FONT_DISPLAY}`;
  ctx.fillText(text.name, POSTER_W / 2, 196, POSTER_W - 120);
  ctx.font = `38px ${FONT_BODY}`;
  ctx.fillText(text.birthLine, POSTER_W / 2, 262, POSTER_W - 120);

  drawSky(ctx, c, scene, POSTER_W / 2, 860, 470);

  ctx.fillStyle = c("--surface", "wheat");
  ctx.font = `48px ${FONT_BODY}`;
  ctx.fillText(text.lagnaDev, POSTER_W / 2, 1470, POSTER_W - 120);
  ctx.font = `34px ${FONT_BODY}`;
  ctx.fillText(text.lagnaLine, POSTER_W / 2, 1524, POSTER_W - 120);

  // the engraved brass strip
  const pw = 900;
  const ph = 84;
  const px = (POSTER_W - pw) / 2;
  const py = 1600;
  const g = ctx.createLinearGradient(0, py, 0, py + ph);
  g.addColorStop(0, c("--brass-hi", "khaki"));
  g.addColorStop(0.4, c("--brass-mid", "goldenrod"));
  g.addColorStop(1, c("--brass-lo", "darkgoldenrod"));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, 6);
  ctx.fill();
  ctx.fillStyle = c("--brass-label", "black");
  ctx.font = `600 30px ${FONT_MONO}`;
  ctx.fillText(text.strip.toUpperCase(), POSTER_W / 2, py + 54, pw - 48);

  ctx.fillStyle = c("--surface", "wheat");
  ctx.globalAlpha = 0.78;
  ctx.font = `26px ${FONT_BODY}`;
  ctx.fillText(text.colophon, POSTER_W / 2, 1840, POSTER_W - 120);
  ctx.globalAlpha = 1;
  return canvas;
}

/** Save the poster: anchor download on the web, cache + share sheet on Android. */
export async function savePoster(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  const dataUrl = canvas.toDataURL("image/png");
  if (isNative()) {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import("@capacitor/filesystem"),
      import("@capacitor/share"),
    ]);
    const res = await Filesystem.writeFile({
      path: filename,
      data: dataUrl.slice(dataUrl.indexOf(",") + 1),
      directory: Directory.Cache,
    });
    await Share.share({ title: "Rooftop sky", url: res.uri, dialogTitle: "Share the poster" });
    return;
  }
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
