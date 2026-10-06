import { Link } from "react-router";
import { Screen } from "../../components/ui/Screen";

export default function LostScreen() {
  return (
    <Screen scroll label="Lost leaf">
      <div className="paper sheet-col" style={{ marginTop: "var(--space-9)" }}>
        <div className="band">
          <h1>
            <span lang="hi" className="dev">
              खोया पत्ता
            </span>{" "}
            · Lost leaf
          </h1>
        </div>
        <p className="p">This leaf is not in the bundle.</p>
        <p className="p">
          <Link className="linkish" to="/">
            Return to the Chowki
          </Link>
        </p>
      </div>
    </Screen>
  );
}
