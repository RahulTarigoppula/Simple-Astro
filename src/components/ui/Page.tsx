// The one page frame every 2.0 screen is written in: a top bar (back or brand on the left, the
// person on the right), an optional heading, then a single centred column of cards.
import { Link, useNavigate } from "react-router";
import { PersonChip } from "./PersonChip";
import { Screen } from "./Screen";

interface PageProps {
  /** Accessible name of the screen. */
  label: string;
  /** Small line above the title. */
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  lede?: React.ReactNode;
  /** `true` goes back in history (Home when there is none); a string is a route. Omit on the five tabs. */
  back?: boolean | string;
  backLabel?: string;
  /** Hide the person chip (forms, settings). */
  noPerson?: boolean;
  /** Extra controls left of the person chip. */
  action?: React.ReactNode;
  /** 1080 px column for screens with two columns on a desk. */
  wide?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function ChevronLeft() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export function ChevronRight({ size = 18 }: { size?: number }) {
  return (
    <svg
      className="v-chev"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function Brand() {
  return (
    <Link to="/" className="v-brand" aria-label="Vyomaphala, home">
      <span className="v-brand__mark" aria-hidden="true" />
      Vyomaphala
    </Link>
  );
}

export function Page({ label, eyebrow, title, lede, back, backLabel = "Back", noPerson, action, wide, className, children }: PageProps) {
  const navigate = useNavigate();
  return (
    <Screen className={`v-screen${className ? ` ${className}` : ""}`} label={label}>
      <div className={`v-page${wide ? " v-page--wide" : ""}`}>
        <div className="v-top">
          <div className="v-top__left">
            {back === undefined || back === false ? (
              <Brand />
            ) : typeof back === "string" ? (
              <Link to={back} className="v-back">
                <ChevronLeft />
                {backLabel}
              </Link>
            ) : (
              <button
                type="button"
                className="v-back"
                onClick={() => {
                  if (window.history.length > 1) navigate(-1);
                  else navigate("/");
                }}
              >
                <ChevronLeft />
                {backLabel}
              </button>
            )}
          </div>
          <div className="v-top__right">
            {action}
            {noPerson ? null : <PersonChip />}
          </div>
        </div>
        {title || eyebrow || lede ? (
          <header className="v-head">
            {eyebrow ? <p className="v-eyebrow">{eyebrow}</p> : null}
            {title ? <h1 className="v-title">{title}</h1> : null}
            {lede ? <p className="v-lede">{lede}</p> : null}
          </header>
        ) : null}
        {children}
      </div>
    </Screen>
  );
}

/** A section heading inside a page, with an optional note under it and an action on the right. */
export function Section({
  title,
  note,
  action,
  id,
  as: Tag = "h2",
}: {
  title: React.ReactNode;
  note?: React.ReactNode;
  action?: React.ReactNode;
  id?: string;
  as?: "h2" | "h3";
}) {
  return (
    <div className="v-sec">
      <Tag id={id}>
        {title}
        {note ? <span className="v-sec__note">{note}</span> : null}
      </Tag>
      {action}
    </div>
  );
}

/** A tappable row for lists: icon, two lines, chevron. */
export function Row({
  to,
  icon,
  tone,
  title,
  sub,
  end,
  onClick,
}: {
  to?: string;
  icon?: React.ReactNode;
  tone?: "gold" | "cyan" | "rose" | "green";
  title: React.ReactNode;
  sub?: React.ReactNode;
  end?: React.ReactNode;
  onClick?: () => void;
}) {
  const inner = (
    <>
      {icon ? <span className={`v-row__icon${tone ? ` v-row__icon--${tone}` : ""}`}>{icon}</span> : null}
      <span className="v-row__body">
        <span className="v-row__t">{title}</span>
        {sub ? <span className="v-row__s">{sub}</span> : null}
      </span>
      {end ? <span className="v-row__end">{end}</span> : null}
      {to || onClick ? <ChevronRight /> : null}
    </>
  );
  if (to)
    return (
      <Link to={to} className="v-row" onClick={onClick}>
        {inner}
      </Link>
    );
  if (onClick)
    return (
      <button type="button" className="v-row" onClick={onClick}>
        {inner}
      </button>
    );
  return <div className="v-row">{inner}</div>;
}
