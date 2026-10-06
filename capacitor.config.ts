import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.rahul.jyoti", // immutable after the first install
  appName: "Chowki",
  webDir: "dist",
  android: {
    adjustMarginsForEdgeToEdge: "auto",
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: { backgroundColor: "#1A110B", launchAutoHide: false, launchFadeOutDuration: 240 },
    StatusBar: { overlaysWebView: true, style: "DARK", backgroundColor: "#1A110B" },
    Camera: { presentationStyle: "fullscreen" },
  },
};
export default config;
