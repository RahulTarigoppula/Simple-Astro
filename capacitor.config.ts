import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.rahul.jyoti", // immutable after the first install
  appName: "Vyomaphala",
  webDir: "dist",
  android: {
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: { backgroundColor: "#04050d", launchAutoHide: false, launchFadeOutDuration: 240 },
    StatusBar: { overlaysWebView: true, style: "DARK", backgroundColor: "#04050d" },
    Camera: { presentationStyle: "fullscreen" },
  },
};
export default config;
