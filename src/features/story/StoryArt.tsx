// Small line illustrations for the story cards. Original artwork; colours from tokens only.
import type { StoryArt as Art } from "../../data/story";
import "./story.css";

// A fixed, hand-placed scatter of background stars (deterministic — no randomness at render).
const STARS: Array<[number, number, number]> = [
  [12, 14, 0.9],
  [34, 70, 0.6],
  [58, 22, 0.7],
  [80, 92, 0.5],
  [104, 10, 0.8],
  [128, 60, 0.6],
  [150, 24, 0.9],
  [170, 84, 0.5],
  [188, 40, 0.7],
  [22, 96, 0.5],
  [70, 50, 0.4],
  [142, 100, 0.6],
  [196, 12, 0.5],
  [6, 52, 0.4],
];

const RING27 = Array.from({ length: 27 }, (_, i) => i);
const RING9 = Array.from({ length: 9 }, (_, i) => i);

function Stars() {
  return (
    <g className="sa-stars">
      {STARS.map(([x, y, r]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={r} />
      ))}
    </g>
  );
}

function Motif({ art }: { art: Art }) {
  switch (art) {
    case "sky":
      return (
        <g>
          <path className="sa-line" d="M10 92 Q60 70 100 78 T200 70" />
          <circle className="sa-sun" cx="150" cy="40" r="14" />
          <path className="sa-thin" d="M150 16v-6M150 70v-6M126 40h-6M180 40h-6M133 23l-4-4M171 61l-4-4M133 57l-4 4M171 19l-4 4" />
          <path className="sa-moon" d="M64 26a14 14 0 1 0 14 22a11 11 0 1 1-14-22z" />
        </g>
      );
    case "moon":
      return (
        <g>
          <path className="sa-moon" d="M98 20a32 32 0 1 0 30 50a25 25 0 1 1-30-50z" />
          {RING27.map((i) => {
            const a = (i / 27) * Math.PI * 2;
            return (
              <circle
                key={`k${i}`}
                className={i === 3 ? "sa-gold" : "sa-dot"}
                cx={104 + Math.cos(a) * 50}
                cy={56 + Math.sin(a) * 38}
                r={i === 3 ? 3 : 1.6}
              />
            );
          })}
        </g>
      );
    case "pole":
      return (
        <g>
          {[14, 26, 38, 50].map((r) => (
            <circle key={r} className="sa-orbit" cx="104" cy="56" r={r} />
          ))}
          <path className="sa-gold-star" d="M104 44l3.5 8.5 9 .7-6.9 5.8 2.2 8.8-7.8-4.8-7.8 4.8 2.2-8.8-6.9-5.8 9-.7z" />
        </g>
      );
    case "dipper": {
      const pts: Array<[number, number]> = [
        [40, 40],
        [46, 76],
        [88, 84],
        [92, 52],
        [124, 44],
        [152, 38],
        [184, 58],
      ];
      return (
        <g>
          <path className="sa-line" d={`M${pts.map((p) => p.join(" ")).join(" L")} M40 40 L92 52`} />
          {pts.map(([x, y]) => (
            <circle key={`${x}`} className="sa-star" cx={x} cy={y} r="3.2" />
          ))}
          <circle className="sa-gold" cx="158" cy="30" r="1.8" />
        </g>
      );
    }
    case "eclipse":
      return (
        <g>
          <circle className="sa-corona" cx="104" cy="56" r="34" />
          <circle className="sa-sun" cx="104" cy="56" r="26" />
          <circle className="sa-shadow" cx="112" cy="54" r="26" />
        </g>
      );
    case "scroll":
      return (
        <g>
          <rect className="sa-card" x="54" y="20" width="100" height="72" rx="6" />
          <path className="sa-thin" d="M66 36h76M66 48h60M66 60h70M66 72h50" />
          <circle className="sa-gold" cx="140" cy="76" r="5" />
        </g>
      );
    case "sage":
      return (
        <g>
          <circle className="sa-line" cx="104" cy="36" r="12" />
          <path className="sa-line" d="M74 92c4-20 16-32 30-32s26 12 30 32z" />
          <path className="sa-orbit" d="M80 30a26 26 0 0 1 48 0" />
          <circle className="sa-gold" cx="104" cy="14" r="3" />
        </g>
      );
    case "ship":
      return (
        <g>
          <path className="sa-line" d="M50 74h108l-14 16H64z" />
          <path className="sa-line" d="M104 74V22l34 44H104" />
          <path className="sa-thin" d="M30 96q14-6 28 0t28 0 28 0 28 0 28 0 28 0" />
          <circle className="sa-star" cx="62" cy="28" r="2.4" />
        </g>
      );
    case "zero":
      return (
        <g>
          <ellipse className="sa-zero" cx="104" cy="56" rx="26" ry="34" />
          <text className="sa-digits" x="104" y="104" textAnchor="middle">
            १ २ ३ ४ ५ ६ ७ ८ ९
          </text>
        </g>
      );
    case "observatory":
      return (
        <g>
          <path className="sa-line" d="M40 96h128M64 96L104 26 144 96M104 26v70" />
          <path className="sa-orbit" d="M70 96a34 34 0 0 1 68 0" />
          <circle className="sa-sun" cx="168" cy="26" r="8" />
        </g>
      );
    case "wheel":
      return (
        <g>
          <circle className="sa-orbit" cx="104" cy="56" r="40" />
          {RING9.map((i) => {
            const a = (i / 9) * Math.PI * 2 - Math.PI / 2;
            return (
              <circle
                key={`k${i}`}
                className={i === 0 ? "sa-sun-sm" : "sa-star"}
                cx={104 + Math.cos(a) * 40}
                cy={56 + Math.sin(a) * 40}
                r={i === 0 ? 6 : 4}
              />
            );
          })}
          <circle className="sa-moon" cx="104" cy="56" r="10" />
        </g>
      );
    case "hand":
      return (
        <g>
          <path
            className="sa-line"
            d="M84 100V62l-8-14a5 5 0 0 1 9-5l9 13V22a5 5 0 0 1 10 0v30-36a5 5 0 0 1 10 0v36-30a5 5 0 0 1 10 0v34-24a5 5 0 0 1 10 0v42c0 18-10 30-28 30z"
          />
          <path className="sa-gold-line" d="M100 64q14-6 30-2M98 76q12 0 24 6M104 96q-4-16 4-34" />
        </g>
      );
    case "numbers":
      return (
        <g>
          {RING9.map((i) => {
            const a = (i / 9) * Math.PI * 2 - Math.PI / 2;
            return (
              <text key={`k${i}`} className="sa-num" x={104 + Math.cos(a) * 40} y={60 + Math.sin(a) * 40} textAnchor="middle">
                {i + 1}
              </text>
            );
          })}
          <text className="sa-num sa-num--big" x="104" y="64" textAnchor="middle">
            108
          </text>
        </g>
      );
    case "maker":
      return (
        <g>
          <rect className="sa-card" x="58" y="40" width="92" height="56" rx="6" />
          <path className="sa-thin" d="M48 100h112" />
          <path className="sa-line" d="M78 80l14-16 14 10 16-22 12 12" />
          <circle className="sa-star" cx="78" cy="80" r="2.6" />
          <circle className="sa-star" cx="92" cy="64" r="2.6" />
          <circle className="sa-star" cx="106" cy="74" r="2.6" />
          <circle className="sa-star" cx="122" cy="52" r="2.6" />
          <circle className="sa-star" cx="134" cy="64" r="2.6" />
          <path className="sa-gold-star" d="M150 14l2.4 5.6 6 .5-4.6 3.9 1.4 5.9-5.2-3.2-5.2 3.2 1.4-5.9-4.6-3.9 6-.5z" />
          <path className="sa-orbit" d="M40 30q50-26 104-14" />
        </g>
      );
    case "today":
      return (
        <g>
          <rect className="sa-card" x="74" y="18" width="60" height="84" rx="10" />
          <circle className="sa-moon" cx="104" cy="48" r="12" />
          <path className="sa-thin" d="M86 74h36M86 84h26" />
        </g>
      );
  }
}

export function StoryArt({ art }: { art: Art }) {
  return (
    <svg className="story-art" viewBox="0 0 208 112" aria-hidden="true" data-decorative="true">
      <Stars />
      <Motif art={art} />
    </svg>
  );
}
