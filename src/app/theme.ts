// Dark or light. "Auto" follows the device's own light/dark setting, the way every other app does.
import { useEffect } from "react";
import { isNative } from "../platform/native";
import { useUi } from "../state/ui";
import { useSettings } from "./hooks";

const TEXT_SCALE = { normal: "100%", large: "112.5%", larger: "125%" } as const;

function deviceTheme(): "night" | "day" {
  return typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: light)").matches ? "day" : "night";
}

/** Mounted once in the Shell: resolves the theme and the text size onto <html>. */
export function ThemeController() {
  const settings = useSettings();
  const setResolved = useUi((s) => s.setResolvedTheme);

  useEffect(() => {
    const apply = () => {
      const resolved = settings.theme === "auto" ? deviceTheme() : settings.theme;
      const root = document.documentElement;
      root.dataset.theme = resolved;
      // The status-bar colour is the page itself: read the token rather than repeating its hex here.
      const bg = getComputedStyle(root).getPropertyValue("--bg").trim();
      if (bg) document.querySelector('meta[name="theme-color"]')?.setAttribute("content", bg);
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
    if (settings.theme !== "auto" || typeof matchMedia !== "function") return;
    const mq = matchMedia("(prefers-color-scheme: light)");
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
    mq.addListener(apply);
    return () => mq.removeListener(apply);
  }, [settings.theme, setResolved]);

  useEffect(() => {
    document.documentElement.style.fontSize = TEXT_SCALE[settings.textSize] ?? TEXT_SCALE.normal;
  }, [settings.textSize]);

  return null;
}
