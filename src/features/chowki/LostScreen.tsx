import { Link } from "react-router";
import { Screen } from "../../components/ui/Screen";

export default function LostScreen() {
  return (
    <Screen scroll label="Page not found">
      <div className="paper sheet-col" style={{ marginTop: "var(--space-9)" }}>
        <div className="band">
          <h1>
            <span lang="hi" className="dev">
              खो गया
            </span>{" "}
            · Page not found
          </h1>
        </div>
        <p className="p">There is nothing at this address.</p>
        <p className="p">
          <Link className="linkish" to="/">
            Back home
          </Link>
        </p>
      </div>
    </Screen>
  );
}
