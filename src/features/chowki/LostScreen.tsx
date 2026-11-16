import { Link } from "react-router";
import { Page } from "../../components/ui/Page";
import { IconSky } from "./icons";

export default function LostScreen() {
  return (
    <Page label="Page not found" back="/" backLabel="Home">
      <section className="v-card v-empty" aria-labelledby="lost-h">
        <span className="v-empty__art" aria-hidden="true">
          <IconSky size={30} />
        </span>
        <h1 id="lost-h" className="v-title">
          Page not found
        </h1>
        <p className="v-lede">There is nothing at this address.</p>
        <Link className="v-btn" to="/">
          Go to Home
        </Link>
      </section>
    </Page>
  );
}
