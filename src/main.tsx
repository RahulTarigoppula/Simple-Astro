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
import { useUi } from "./state/ui";

unlockAudioOnFirstGesture();

if (!isNative()) {
  void import("virtual:pwa-register").then(({ registerSW }) => {
    const update = registerSW({
      onNeedRefresh: () => useUi.getState().setSwUpdate(() => void update(true)),
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
