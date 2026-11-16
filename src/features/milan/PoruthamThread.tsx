// The ten poruthams, inside the "South Indian check" fold: each simply agrees or does not. Every row
// is a button opening its rule. Agree / doesn't is always written out, colour is never the only signal.
import { ChevronRight } from "../../components/ui/Page";
import type { PoruthamResult } from "../../engine/porutham";

function Mark({ ok }: { ok: boolean }) {
  return (
    <svg className={`mm-mark${ok ? " is-ok" : ""}`} width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      {ok ? <path d="M7.5 12.5l3 3 6-6.5" /> : <path d="M8.5 12h7" />}
    </svg>
  );
}

export function PoruthamThread({ list, onOpen }: { list: PoruthamResult[]; onOpen: (p: PoruthamResult) => void }) {
  return (
    <>
      <p className="v-small v-muted">The South Indian way: ten checks, each simply agrees or doesn't. Tap a check to see its rule.</p>
      <ol className="mm-checks">
        {list.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              className="mm-check"
              aria-haspopup="dialog"
              onClick={() => onOpen(p)}
              aria-label={`${p.name}: ${p.pass ? "agrees" : "does not agree"}${p.weighty ? ", one of the two matters most" : ""}`}
            >
              <Mark ok={p.pass} />
              <span className="mm-check__name">
                {p.name}
                {p.weighty ? <span className="mm-check__s">matters most</span> : null}
              </span>
              <span className={`mm-check__state${p.pass ? " is-ok" : ""}`}>{p.pass ? "agrees" : "doesn't"}</span>
              <ChevronRight size={16} />
            </button>
          </li>
        ))}
      </ol>
    </>
  );
}
