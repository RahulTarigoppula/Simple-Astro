import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { ExplainSheet } from "../components/ui/Explain";
import { Toasts } from "../components/ui/Toasts";
import { Journey, markJourneySeen, shouldPlayJourney } from "../features/journey/Journey";
import { setHapticsEnabled } from "../platform/haptics";
import { isNative } from "../platform/native";
import { setCalmSound, setSoundEnabled } from "../platform/sound";
import { countView } from "../platform/stats";
import { useUi } from "../state/ui";
import { useSettings } from "./hooks";
import { Ledge } from "./Ledge";
import { ThemeController } from "./theme";

/** The desk: teak margins, the lamp's vignette, the routed screen, the Ledge. */
export function Shell() {
  const loc = useLocation();
  const navigate = useNavigate();
  const settings = useSettings();
  const swUpdate = useUi((s) => s.desk.swUpdate);
  const fullBleed = /\/capture$|\/sky$|\/journey$/.test(loc.pathname);
  // The opening journey plays once per visit when Vyom opens on Home.
  const [journey, setJourney] = useState(() => loc.pathname === "/" && shouldPlayJourney());

  useEffect(() => {
    setSoundEnabled(settings.sound);
    setCalmSound(settings.calmDesk);
    setHapticsEnabled(settings.haptics);
    document.documentElement.dataset.calm = settings.calmDesk ? "true" : "false";
  }, [settings.sound, settings.haptics, settings.calmDesk]);

  // One anonymous count per screen opened (ids stripped; see platform/stats.ts).
  useEffect(() => {
    countView(loc.pathname);
  }, [loc.pathname]);

  // Predictive back on Android returns home rather than exiting.
  useEffect(() => {
    if (!isNative()) return;
    let remove: (() => void) | undefined;
    let dead = false;
    void import("@capacitor/app").then(({ App }) => {
      void App.addListener("backButton", ({ canGoBack }) => {
        if (!canGoBack || window.location.hash === "#/" || window.location.hash === "") void App.exitApp();
        else navigate(-1);
      }).then((h) => {
        if (dead) void h.remove();
        else remove = () => void h.remove();
      });
    });
    return () => {
      dead = true;
      remove?.();
    };
  }, [navigate]);

  return (
    <div className="desk">
      <ThemeController />
      <div className="desk__top" aria-hidden="true" />
      {swUpdate ? (
        <button type="button" className="sw-tab paper" onClick={() => swUpdate()}>
          A newer version of Vyom is ready. Reload
        </button>
      ) : null}
      <div className="screens">
        <Outlet />
        <Toasts />
      </div>
      <ExplainSheet />
      {fullBleed ? null : <Ledge />}
      {journey ? (
        <Journey
          onDone={() => {
            markJourneySeen();
            setJourney(false);
          }}
          onAbout={() => {
            markJourneySeen();
            setJourney(false);
            navigate("/about");
          }}
        />
      ) : null}
    </div>
  );
}
