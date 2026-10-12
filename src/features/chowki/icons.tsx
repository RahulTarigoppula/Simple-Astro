// Line icons for the astral skin: 24-unit grid, 1.6 stroke, currentColor. Original artwork.
interface IconProps {
  size?: number;
}

function Svg({ size = 22, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** The North-Indian diamond: the Janam Patri. */
export const IconChart = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
    <path d="M3.5 3.5l17 17M20.5 3.5l-17 17M12 3.5L20.5 12 12 20.5 3.5 12z" />
  </Svg>
);
/** The circle of leaves (people). */
export const IconCircle = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" />
    <circle cx="17" cy="9" r="2.4" />
    <path d="M15.8 14.2c2.3.2 4 1.8 4.7 4.8" />
  </Svg>
);
/** Today: a sun with a crescent. */
export const IconToday = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M5.5 18.5l1.4-1.4M17.1 6.9l1.4-1.4" />
  </Svg>
);
/** The open palm. */
export const IconPalm = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 12V6.5a1.5 1.5 0 0 1 3 0V11M10 10.5V4.8a1.5 1.5 0 0 1 3 0V11M13 10.8V5.8a1.5 1.5 0 0 1 3 0v6.4M16 11.5V9a1.5 1.5 0 0 1 3 0v4.5c0 4.1-2.8 7.5-6.7 7.5-2.6 0-4.2-1.3-5.6-3.4L4.4 13a1.5 1.5 0 0 1 2.4-1.7L8 13" />
  </Svg>
);
/** Two interlinked rings: Guna Milan. */
export const IconMilan = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="12" r="5.5" />
    <circle cx="15" cy="12" r="5.5" />
  </Svg>
);
/** A telescope-less sky: star and orbit. */
export const IconSky = (p: IconProps) => (
  <Svg {...p}>
    <ellipse cx="12" cy="12" rx="9.5" ry="4.2" transform="rotate(-20 12 12)" />
    <path d="M12 7.2l1.2 2.6 2.8.3-2.1 1.9.6 2.8L12 13.4l-2.5 1.4.6-2.8L8 10.1l2.8-.3z" />
  </Svg>
);
/** Settings: the drawer. */
export const IconDrawer = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </Svg>
);
/** A new leaf: plus in a card. */
export const IconPlus = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <path d="M12 8.5v7M8.5 12h7" />
  </Svg>
);
export const IconArrow = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);
export const IconMoon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z" />
  </Svg>
);
