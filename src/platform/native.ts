import { Capacitor } from "@capacitor/core";

export const isNative = (): boolean => Capacitor.isNativePlatform();
export const reducedMotion = (): boolean =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
