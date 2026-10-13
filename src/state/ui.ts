// Ephemeral UI state only — no derived data, nothing persisted. One store, four slices.
import { create } from "zustand";
import type { GrahaId } from "../engine/types";

export type ToastKind = "info" | "warn" | "danger";
export interface Toast {
  id: number;
  kind: ToastKind;
  text: string;
}

interface UiState {
  // loupe slice
  loupe: { target: GrahaId | null };
  setLoupeTarget: (g: GrahaId | null) => void;
  // drums slice
  drums: { dragging: string | null };
  setDragging: (k: string | null) => void;
  // desk slice
  desk: { themeOverride: "night" | "day" | null; resolvedTheme: "night" | "day"; swUpdate: (() => void) | null };
  setResolvedTheme: (t: "night" | "day") => void;
  setSwUpdate: (fn: (() => void) | null) => void;
  // explain slice: the plain-English sheet for one glossary term
  explain: string | null;
  setExplain: (id: string | null) => void;
  // toast slice
  toasts: Toast[];
  toast: (text: string, kind?: ToastKind) => void;
  dismiss: (id: number) => void;
}

let toastSeq = 1;

export const useUi = create<UiState>()((set, get) => ({
  loupe: { target: null },
  setLoupeTarget: (target) => set({ loupe: { target } }),
  drums: { dragging: null },
  setDragging: (dragging) => set({ drums: { dragging } }),
  desk: { themeOverride: null, resolvedTheme: "night", swUpdate: null },
  setResolvedTheme: (resolvedTheme) => set((s) => ({ desk: { ...s.desk, resolvedTheme } })),
  setSwUpdate: (swUpdate) => set((s) => ({ desk: { ...s.desk, swUpdate } })),
  explain: null,
  setExplain: (explain) => set({ explain }),
  toasts: [],
  toast: (text, kind = "info") => {
    const id = toastSeq++;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, kind, text }] }));
    setTimeout(() => get().dismiss(id), 4000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Imperative helper for non-React callers. */
export const toast = (text: string, kind: ToastKind = "info"): void => useUi.getState().toast(text, kind);
