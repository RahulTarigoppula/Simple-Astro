// #/year and #/year/:id, "Your year ahead": the shape of one person's next twelve months as a
// full-screen, tap-through story of eight slides, every picture drawn from the engine's numbers.
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { useActiveProfile, useHere, usePatri, useProfiles, useSettings } from "../../app/hooks";
import { Page } from "../../components/ui/Page";
import { Screen } from "../../components/ui/Screen";
import { countEvent } from "../../platform/stats";
import { yearSlides } from "./slides";
import { useYear } from "./useYear";
import { YearPlayer } from "./YearPlayer";
import { YearMark } from "./YearTeaser";
import "./year.css";

export { YearTeaser } from "./YearTeaser";

function Empty() {
  return (
    <Page label="Your year ahead" title="Your year ahead" back>
      <section className="v-card v-empty" aria-labelledby="yr-empty-h">
        <span className="v-empty__art" aria-hidden="true">
          <YearMark size={30} />
        </span>
        <h2 id="yr-empty-h" className="v-card__title">
          The next twelve months, as a short story
        </h2>
        <p className="v-muted">
          Add your birth date, time and place once. Vyomaphala then draws your year ahead: the best months, the months to go gently, your
          life chapter and the days worth circling.
        </p>
        <Link to="/leaf/new" className="v-btn">
          Add your birth details
        </Link>
        <p className="v-small v-muted">Takes about a minute. Stays on this device.</p>
      </section>
    </Page>
  );
}

export default function YearScreen() {
  const { id } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const profiles = useProfiles();
  const active = useActiveProfile();
  const profile = (id ? profiles?.find((p) => p.id === id) : active) ?? active;
  const settings = useSettings();
  const { patri } = usePatri(profile, settings.preset);
  const { zone, lat, lon } = useHere(profile);
  // The story is a picture of the day it was opened on; it does not re-read itself every minute.
  const [nowMs] = useState(Date.now);
  const [run, setRun] = useState(0);
  // #/year?s=3 opens on the third slide.
  const from = search.get("s");
  const start = Math.max(0, Math.round(Number(from) || 1) - 1);

  const ready = patri && profile && patri.profileId === profile.id ? patri : null;
  const input = useMemo(
    () => (ready ? { patri: ready, nowMs, zone, lat, lon, preset: settings.preset } : null),
    [ready, nowMs, zone, lat, lon, settings.preset],
  );
  const data = useYear(input, profile ? `${profile.id}|${profile.updatedAt}` : "", "all");

  if (profiles === undefined) return <Screen label="Your year ahead">{null}</Screen>;
  if (!profile) return <Empty />;

  const close = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };
  const slides = yearSlides({
    name: profile.name,
    profileId: profile.id,
    patri: ready,
    data,
    onAgain: () => {
      countEvent("year-again");
      setRun((r) => r + 1);
    },
  });
  const first = data?.window[0];
  const last = data?.window[11];
  const caption = first && last ? `${first.label} ${first.year} to ${last.label} ${last.year}` : "The next twelve months";

  return (
    <Screen className="year-screen" label={`${profile.name}'s year ahead`}>
      <div className="year-screen__hold" />
      {createPortal(
        <YearPlayer
          key={`${profile.id}-${run}-${from ?? ""}`}
          label={`${profile.name}'s year ahead, a story in ${slides.length} slides`}
          caption={caption}
          slides={slides}
          start={run === 0 ? start : 0}
          onClose={close}
        />,
        document.body,
      )}
    </Screen>
  );
}
