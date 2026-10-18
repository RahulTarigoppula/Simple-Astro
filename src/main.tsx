import "@fontsource-variable/sora";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource-variable/noto-sans-devanagari";
import "./index.css";
import { MotionConfig } from "motion/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { router } from "./app/router";
import { isNative } from "./platform/native";
import { unlockAudioOnFirstGesture } from "./platform/sound";

unlockAudioOnFirstGesture();

if (!isNative()) {
  void import("virtual:pwa-register").then(({ registerSW }) => {
    // Always run the latest deploy: check on load and every 30 minutes, and reload once when a new version
    // takes over. Only cached app files change; people, charts and settings live in IndexedDB.
    registerSW({
      immediate: true,
      onRegisteredSW: (_url, reg) => {
        if (reg) setInterval(() => void reg.update(), 30 * 60 * 1000);
      },
    });
    // The very first install also fires controllerchange (clientsClaim); only a real update should reload.
    // Never reload while a person is being added or edited, or while someone is typing: wait for the
    // next screen change and check again, so a half-filled form is never lost.
    let sawController = !!navigator.serviceWorker?.controller;
    let reloaded = false;
    const busy = () =>
      /^#\/leaf\//.test(window.location.hash) || !!document.activeElement?.matches("input, textarea, select, [contenteditable]");
    const reload = () => {
      if (reloaded) return;
      if (busy()) {
        window.addEventListener("hashchange", reload, { once: true });
        document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && reload(), { once: true });
        return;
      }
      reloaded = true;
      window.location.reload();
    };
    navigator.serviceWorker?.addEventListener("controllerchange", () => {
      if (!sawController) {
        sawController = true; // the first install taking control; nothing to replace yet
        return;
      }
      reload();
    });
  });
} else {
  void import("@capacitor/splash-screen").then(({ SplashScreen }) => SplashScreen.hide({ fadeOutDuration: 240 }));
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <MotionConfig reducedMotion="user">
        <RouterProvider router={router} />
      </MotionConfig>
    </StrictMode>,
  );
}
