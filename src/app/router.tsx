import { createHashRouter, Navigate } from "react-router";
import { RouteError } from "./RouteError";
import { Shell } from "./Shell";

type ScreenModule = { default: React.ComponentType };
const screens = import.meta.glob<ScreenModule>("../features/*/*Screen.tsx");

/** Lazy route module by feature/file name; every screen is its own chunk. */
const screen = (path: string) => async () => {
  const load = screens[`../features/${path}.tsx`];
  if (!load) throw new Error(`screen ${path} is missing from this build`);
  const m = await load();
  return { Component: m.default };
};

/** The twelve routes of §4, hash-based so Pages deep links need no rewrite. */
export const router = createHashRouter([
  {
    element: <Shell />,
    errorElement: <RouteError />,
    // The desk paints its own teak while the first lazy screen arrives; nothing to hydrate.
    hydrateFallbackElement: <div className="desk" aria-busy="true" />,
    children: [
      { index: true, lazy: screen("chowki/ChowkiScreen") },
      { path: "today", lazy: screen("today/TodayScreen"), errorElement: <RouteError /> },
      { path: "circle", lazy: screen("circle/CircleScreen"), errorElement: <RouteError /> },
      { path: "leaf/new", lazy: screen("leaf/LeafScreen"), errorElement: <RouteError /> },
      { path: "leaf/:id/edit", lazy: screen("leaf/LeafScreen"), errorElement: <RouteError /> },
      { path: "patri/:id", lazy: screen("patri/PatriScreen"), errorElement: <RouteError /> },
      { path: "patri/:id/sky", lazy: screen("sky/SkyScreen"), errorElement: <RouteError /> },
      { path: "hast/:id", lazy: screen("hast/HastScreen"), errorElement: <RouteError /> },
      { path: "hast/:id/capture", lazy: screen("hast/CaptureScreen"), errorElement: <RouteError /> },
      { path: "milan/:a/:b", lazy: screen("milan/MilanScreen"), errorElement: <RouteError /> },
      { path: "milan", lazy: screen("milan/MilanScreen"), errorElement: <RouteError /> },
      { path: "drawer", lazy: screen("drawer/DrawerScreen"), errorElement: <RouteError /> },
      { path: "lost", lazy: screen("chowki/LostScreen") },
      { path: "*", element: <Navigate to="/lost" replace /> },
    ],
  },
]);
