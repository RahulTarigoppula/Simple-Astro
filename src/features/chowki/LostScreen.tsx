import { Link } from "react-router";
import { Page } from "../../components/ui/Page";

export default function LostScreen() {
  return (
    <Page label="Page not found" title="Page not found" lede="There is nothing at this address." back="/" backLabel="Home">
      <div>
        <Link className="v-btn" to="/">
          Go to Home
        </Link>
      </div>
    </Page>
  );
}
