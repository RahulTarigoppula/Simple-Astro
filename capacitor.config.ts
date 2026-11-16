import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.rahul.jyoti", // immutable after the first install
  appName: "Vyomaphala",
  webDir: "dist",
  android: {
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: { backgroundColor: "#0f0e0c", launchAutoHide: false, launchFadeOutDuration: 240 },
    StatusBar: { overlaysWebView: true, style: "DARK", backgroundColor: "#0f0e0c" },
    Camera: { presentationStyle: "fullscreen" },
  },
};
export default config;
