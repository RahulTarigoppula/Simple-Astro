// Under the chart's planet table: the nine grahas as medallions, each opening its myth and meaning.
import { Link } from "react-router";
import { GrahaGlyph } from "../../components/ui/GrahaGlyph";
import { GRAHA_LORE, RASHI_LORE } from "../../data/lore";
import type { Patri } from "../../engine/types";
import "./cosmic.css";

export function MeetGrahas({ patri }: { patri: Patri }) {
  return (
    <nav className="meet" aria-label="The nine grahas in this chart">
      <p className="meet__k">Meet the planets in this chart. Tap one for its story.</p>
      <ul>
        {GRAHA_LORE.map((g) => (
          <li key={g.id}>
            <Link to={`/explore/graha/${g.id}`}>
              <GrahaGlyph id={g.id} size={40} />
              <span className="meet__t">{g.english}</span>
              <span className="meet__s">in {RASHI_LORE[patri.grahas[g.id].sign]?.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
