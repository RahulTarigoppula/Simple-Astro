import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { haptics } from "../platform/haptics";
import { Ledge } from "./Ledge";

function renderAt(path: string) {
  const page = (name: string) => (
    <>
      <main className="screen" data-testid="screen">
        {name}
      </main>
      <Ledge />
    </>
  );
  const router = createMemoryRouter(
    [
      { path: "/", element: page("home") },
      { path: "/today", element: page("almanac") },
      { path: "/explore", element: page("explore") },
    ],
    { initialEntries: [path] },
  );
  return { router, ...render(<RouterProvider router={router} />) };
}

/** jsdom does not lay out or scroll: give the screen a scroll position and a scrollTo to watch. */
function scrolled(top: number) {
  const el = screen.getByTestId("screen");
  Object.defineProperty(el, "scrollTop", { value: top, configurable: true });
  const scrollTo = vi.fn();
  el.scrollTo = scrollTo as unknown as typeof el.scrollTo;
  return scrollTo;
}

afterEach(() => vi.restoreAllMocks());

describe("the tab bar", () => {
  it("marks the tab you are on, with one sliding mark", () => {
    const { container } = renderAt("/explore");
    const on = screen.getByRole("link", { name: "Explore the sky and its stories" });
    expect(on).toHaveAttribute("aria-current", "page");
    expect(container.querySelectorAll(".v-nav__pill")).toHaveLength(1);
    expect(on.querySelector(".v-nav__pill")).not.toBeNull();
  });

  it("scrolls the screen to its top when the tab you are on is tapped again", () => {
    const tick = vi.spyOn(haptics, "selection").mockImplementation(() => undefined);
    const { router } = renderAt("/explore");
    const scrollTo = scrolled(900);
    fireEvent.click(screen.getByRole("link", { name: "Explore the sky and its stories" }));
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
    expect(router.state.location.pathname).toBe("/explore");
    expect(router.state.historyAction).toBe("POP"); // nothing was pushed
    expect(tick).not.toHaveBeenCalled();
  });

  it("scrolls at once, without animation, when less motion is asked for", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({
      matches: q.includes("reduce"),
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
    }));
    renderAt("/explore");
    const scrollTo = scrolled(900);
    fireEvent.click(screen.getByRole("link", { name: "Explore the sky and its stories" }));
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "auto" });
    vi.unstubAllGlobals();
  });

  it("goes to another tab with a light tick, and does not scroll the old screen", () => {
    const tick = vi.spyOn(haptics, "selection").mockImplementation(() => undefined);
    const { router } = renderAt("/");
    const scrollTo = scrolled(400);
    fireEvent.click(screen.getByRole("link", { name: "Explore the sky and its stories" }));
    expect(router.state.location.pathname).toBe("/explore");
    expect(tick).toHaveBeenCalledTimes(1);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("takes you home from a page deeper in the same tab instead of scrolling", () => {
    const { router } = renderAt("/today");
    const scrollTo = scrolled(400);
    fireEvent.click(screen.getByRole("link", { name: "Today" }));
    expect(router.state.location.pathname).toBe("/");
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
