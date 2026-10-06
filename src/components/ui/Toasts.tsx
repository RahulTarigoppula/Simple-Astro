import { useUi } from "../../state/ui";

/** Lac notes: info (ink), warning (haldi edge, ink text), danger (lac). Swipe or tap to dismiss. */
export function Toasts() {
  const toasts = useUi((s) => s.toasts);
  const dismiss = useUi((s) => s.dismiss);
  return (
    <div className="toast-wrap">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast${t.kind === "warn" ? " is-warn" : t.kind === "danger" ? " is-danger" : ""}`}
          role={t.kind === "danger" ? "alert" : "status"}
          onClick={() => dismiss(t.id)}
          onKeyDown={(e) => {
            if (e.key === "Escape") dismiss(t.id);
          }}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
