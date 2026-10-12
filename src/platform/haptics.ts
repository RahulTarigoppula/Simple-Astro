// Haptics through @capacitor/haptics on Android, navigator.vibrate on the web. Never on scroll.
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { isNative } from "./native";

let enabled = true;
export const setHapticsEnabled = (on: boolean): void => {
  enabled = on;
};

const coarse = (): boolean => typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches === true;

function vibrate(ms: number | number[]): void {
  if (!coarse()) return;
  try {
    navigator.vibrate?.(ms);
  } catch {
    // vibration is decorative; a refusal is not an error
  }
}

export const haptics = {
  selection(): void {
    if (!enabled) return;
    if (isNative()) void Haptics.selectionChanged().catch(() => undefined);
    else vibrate(5);
  },
  impact(style: "light" | "medium" | "heavy" = "medium"): void {
    if (!enabled) return;
    const map = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy } as const;
    if (isNative()) void Haptics.impact({ style: map[style] }).catch(() => undefined);
    else vibrate(style === "heavy" ? 40 : style === "medium" ? 22 : 10);
  },
  notify(kind: "success" | "warning"): void {
    if (!enabled) return;
    if (isNative())
      void Haptics.notification({ type: kind === "success" ? NotificationType.Success : NotificationType.Warning }).catch(() => undefined);
    else vibrate(kind === "success" ? [12, 60, 18] : [30, 40, 30]);
  },
};
