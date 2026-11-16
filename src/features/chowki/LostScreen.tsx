// Nothing lives at this address. The picture is the real northern sky: the stars that never set,
// turning around Dhruva, the Pole Star that travellers steered home by.
import { Link } from "react-router";
import { Page } from "../../components/ui/Page";
import { PoleStars } from "../explore/SkyArt";

export default function LostScreen() {
  return (
    <Page
      label="Page not found"
      back="/"
      backLabel="Home"
      wide
      sky="night"
      hero={
        <section className="bh bh--split" aria-labelledby="lost-h">
          <p className="bh__eyebrow">Page not found</p>
          <h1 id="lost-h" className="bh__title bh__title--md">
            Lost among the stars
          </h1>
          <div className="bh__pic">
            <PoleStars label="The real stars around the north pole of the sky, with Dhruva, the Pole Star, ringed in the middle" />
          </div>
          <p className="bh__line">
            There is nothing at this address. Travellers used to find their way home by Dhruva, the Pole Star. You have a button.
          </p>
          <div className="v-actions">
            <Link className="v-btn" to="/">
              Go to Home
            </Link>
          </div>
        </section>
      }
    >
      <p className="v-foot">The stars above are real: the northern sky, from the Yale Bright Star Catalogue.</p>
    </Page>
  );
}
