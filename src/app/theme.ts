// Night desk / morning terrace, the diya flicker and the tithi fill-light. The theme changes the
// desk, never the paper.
import * as A from "astronomy-engine";
import { useEffect } from "react";
import { saveSettings } from "../data/repo";
import { mulberry32 } from "../engine/math";
import { isNative, reducedMotion } from "../platform/native";
import { useUi } from "../state/ui";
import { useActiveProfile, useSettings } from "./hooks";

const BENGALURU = { lat: 12.9716, lon: 77.5946 };

function sunAltitude(lat: number, lon: number, when: Date): number {
  const t = A.MakeTime(when);
  const obs = new A.Observer(lat, lon, 0);
  const eq = A.Equator(A.Body.Sun, t, obs, true, true);
  return A.Horizon(t, obs, eq.ra, eq.dec, "normal").altitude;
}

function moonK(when: Date): number {
  return A.Illumination(A.Body.Moon, A.MakeTime(when)).phase_fraction;
}

export function useLamp() {
  const theme = useUi((s) => s.desk.resolvedTheme);
  return {
    toggle: () => {
      void saveSettings({ theme: theme === "night" ? "day" : "night" });
    },
  };
}

/** Mounted once in the Shell: resolves the theme, drives --flicker, --flame-k and --moon-k. */
export function ThemeController() {
  const settings = useSettings();
  const active = useActiveProfile();
  const setResolved = useUi((s) => s.setResolvedTheme);
  const place = active?.birth.place ?? BENGALURU;
  const lat = place.lat;
  const lon = place.lon;

  useEffect(() => {
    const apply = () => {
      const now = new Date();
      const resolved =
        settings.theme === "auto" ? (sunAltitude(lat, lon, now) > 0 ? "day" : "night") : settings.theme;
      const root = document.documentElement;
      root.dataset.theme = resolved;
      root.style.setProperty("--moon-k", moonK(now).toFixed(3));
      // The status-bar colour is the desk itself: read the token rather than repeating its hex here.
      const desk = getComputedStyle(root).getPropertyValue("--bg").trim();
      if (desk) document.querySelector('meta[name="theme-color"]')?.setAttribute("content", desk);
      setResolved(resolved);
      try {
        localStorage.setItem("chowki-theme", resolved);
      } catch {
        // storage is a convenience for the boot script only
      }
      if (isNative()) {
        void import("@capacitor/status-bar").then(({ StatusBar, Style }) =>
          StatusBar.setStyle({ style: resolved === "day" ? Style.Light : Style.Dark }).catch(() => undefined),
        );
      }
    };
    apply();
    const id = window.setInterval(apply, 60_000);
    return () => clearInterval(id);
  }, [settings.theme, lat, lon, setResolved]);

  const theme = useUi((s) => s.desk.resolvedTheme);
  useEffect(() => {
    const root = document.documentElement;
    const still = () => {
      root.style.setProperty("--flicker", "0px");
      root.style.setProperty("--flame-k", "1");
    };
    if (reducedMotion() || settings.calmDesk || theme === "day") {
      still();
      return;
    }
    // 1/f-ish flicker sampled every 80 ms; ONE variable drives every shadow in sync.
    const rng = mulberry32(0xd17a);
    let a = 0;
    let b = 0;
    let timer = 0;
    const step = () => {
      if (document.hidden) {
        still();
        timer = window.setTimeout(step, 400);
        return;
      }
      a = a * 0.72 + (rng() - 0.5) * 0.6;
      b = b * 0.93 + (rng() - 0.5) * 0.25;
      const n = Math.max(-1, Math.min(1, a + b));
      root.style.setProperty("--flicker", `${(n * 0.6).toFixed(2)}px`);
      root.style.setProperty("--flame-k", (0.5 + n * 0.5).toFixed(3));
      timer = window.setTimeout(step, 80);
    };
    step();
    return () => {
      clearTimeout(timer);
      still();
    };
  }, [settings.calmDesk, theme]);

  return null;
}
