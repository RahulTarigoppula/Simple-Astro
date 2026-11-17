import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../data/db";
import { saveSettings, upsertProfile } from "../../data/repo";
import { REFERENCE_PROFILE } from "../../engine/patri";
import { DEFAULT_PRESET } from "../../engine/types";
import { resetYearCache } from "./useYear";
import { type StorySlide, YearPlayer } from "./YearPlayer";
import YearScreen, { YearTeaser } from "./YearScreen";

const ID = REFERENCE_PROFILE.id;
const WORD = /^(Strong|Good|Mixed|Go gently)$/;

function renderAt(path = "/year") {
  const router = createMemoryRouter(
    [
      { path: "/", element: <p>home</p> },
      { path: "/year", element: <YearScreen /> },
      { path: "/year/:id", element: <YearScreen /> },
      { path: "/teaser", element: <YearTeaser /> },
      { path: "*", element: <p>elsewhere</p> },
    ],
    { initialEntries: [path] },
  );
  return { router, ...render(<RouterProvider router={router} />) };
}

const heading = () => screen.getByRole("heading", { level: 1 });
const next = () => fireEvent.click(screen.getByRole("button", { name: "Next slide" }));

beforeEach(async () => {
  resetYearCache();
  await db.delete();
  await db.open();
});

describe("Your year ahead", () => {
  it("with nobody saved: a friendly way in", async () => {
    renderAt();
    expect(await screen.findByRole("heading", { name: "The next twelve months, as a short story" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add your birth details" })).toHaveAttribute("href", "/leaf/new");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens on the person's name at once and fills in the year: a word, a sentence, a ring of twelve months", async () => {
    await upsertProfile(REFERENCE_PROFILE);
    await saveSettings({ activeProfileId: ID, preset: DEFAULT_PRESET });
    renderAt();
    const story = await screen.findByRole("dialog", { name: /Rahul's year ahead, a story in 8 slides/ });
    expect(heading()).toHaveTextContent("Rahul's year ahead");
    // the first slide is a labelled region
    expect(within(story).getByRole("region", { name: "Rahul's year ahead" })).toHaveTextContent("Slide 1 of 8");
    const ring = await within(story).findByRole(
      "img",
      { name: /as a ring, each month as tall as its score: .+ Overall: / },
      { timeout: 12000 },
    );
    expect(ring).toHaveAccessibleName(/November (Strong|Good|Mixed|Go gently), December /);
    expect(within(story).getByText(WORD)).toBeInTheDocument();
    expect(within(story).getByText(/of the twelve months lean|All twelve months lean/)).toBeInTheDocument();
    expect(within(story).getByText(/^\w+ \d{4} to \w+ \d{4}$/)).toBeInTheDocument();
  }, 20000);

  it("moves with the buttons and the arrow keys, every slide with its words and a text for its picture", async () => {
    await upsertProfile(REFERENCE_PROFILE);
    await saveSettings({ activeProfileId: ID, preset: DEFAULT_PRESET });
    renderAt(`/year/${ID}`);
    const story = await screen.findByRole("dialog");
    await within(story).findByText(WORD, {}, { timeout: 12000 });
    expect(screen.getByRole("button", { name: "Previous slide" })).toBeDisabled();

    next();
    expect(heading()).toHaveTextContent("Your best months");
    expect(
      within(story).getByRole("img", { name: /The best months stand out: \w+ \((Strong|Good|Mixed|Go gently)\)/ }),
    ).toBeInTheDocument();
    expect(within(story).getAllByText(/ (supports|asks for care with) |More of the sky helps/).length).toBeGreaterThanOrEqual(2);

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(heading()).toHaveTextContent(/^The months? to go gently$/);
    expect(within(story).getByText(/A time for patience, not big starts\.|simply an easier pace/)).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(heading()).toHaveTextContent("Your best months");
    fireEvent.keyDown(window, { key: "ArrowRight" });

    next();
    expect(heading()).toHaveTextContent(/^You are in \w+'s chapter$/);
    expect(within(story).getByRole("img", { name: /Your life as an arc of nine chapters/ })).toBeInTheDocument();
    expect(within(story).getByText(/Tradition divides a life into planet-ruled chapters/)).toBeInTheDocument();

    next();
    expect(heading()).toHaveTextContent("Where Jupiter and Saturn travel");
    expect(
      await within(story).findByRole("img", { name: /twelve houses counted from your Moon.+Jupiter .+Saturn / }, { timeout: 12000 }),
    ).toBeInTheDocument();
    expect(within(story).getByText(/^Jupiter: your \d+(st|nd|rd|th) house from your Moon/)).toBeInTheDocument();

    next();
    expect(heading()).toHaveTextContent("Your strongest areas this year");
    expect(within(within(story).getByRole("list", { name: "Your three strongest areas" })).getAllByRole("listitem")).toHaveLength(3);
    expect(within(story).getByText("The one to tend")).toBeInTheDocument();

    next();
    expect(heading()).toHaveTextContent(/good days? to begin something/i);
    expect(
      await within(story).findByRole("img", { name: /days as a calendar, a column per week.+Ringed: / }, { timeout: 12000 }),
    ).toBeInTheDocument();
    expect(await within(story).findByText("Next festivals", {}, { timeout: 12000 })).toBeInTheDocument();

    next();
    expect(heading()).toHaveTextContent(/year by tradition's reckoning: lean into |^A year to go gently/);
    expect(within(story).getByText("For reflection: your choices write the rest.")).toBeInTheDocument();
    expect(within(story).getByRole("link", { name: "See the full forecast" })).toHaveAttribute("href", `/forecast/${ID}?p=year`);
    expect(screen.getByRole("button", { name: "Next slide" })).toBeDisabled();

    fireEvent.click(within(story).getByRole("button", { name: "Watch again" }));
    await waitFor(() => expect(heading()).toHaveTextContent("Rahul's year ahead"));
  }, 40000);

  it("opens on a given slide, and Escape or the close button leaves", async () => {
    await upsertProfile(REFERENCE_PROFILE);
    await saveSettings({ activeProfileId: ID, preset: DEFAULT_PRESET });
    const { router } = renderAt(`/year/${ID}?s=4`);
    await screen.findByRole("dialog");
    await waitFor(() => expect(heading()).toHaveTextContent(/chapter/));
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
    expect(screen.queryByRole("dialog")).toBeNull();
  }, 20000);

  it("the teaser row names the year's word and best month once they are read", async () => {
    await upsertProfile(REFERENCE_PROFILE);
    await saveSettings({ activeProfileId: ID, preset: DEFAULT_PRESET });
    renderAt("/teaser");
    const row = await screen.findByRole("link", { name: /Your year ahead/ });
    expect(row).toHaveAttribute("href", `/year/${ID}`);
    expect(row).toHaveClass("v-row");
    await waitFor(() => expect(row).toHaveTextContent(/(Strong|Good|Mixed|Go gently) overall · best month: \w+/), { timeout: 12000 });
  }, 20000);

  it("the teaser is nothing when nobody is saved", async () => {
    const { container } = renderAt("/teaser");
    await act(async () => {
      await new Promise((r) => setTimeout(r, 150));
    });
    expect(container.querySelector("a")).toBeNull();
  });
});

describe("the story player", () => {
  const slides = (ready = true): StorySlide[] =>
    ["one", "two", "three"].map((id) => ({ id, name: id, ready, node: <h1 id={`yr-h-${id}`}>Slide {id}</h1> }));

  it("moves on by itself, waits on a slide that is not ready, and stops at the last slide", async () => {
    const onClose = vi.fn();
    const { rerender } = render(<YearPlayer label="Story" caption="c" slides={slides(false)} auto slideMs={40} onClose={onClose} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 200));
    });
    expect(heading()).toHaveTextContent("Slide one");
    rerender(<YearPlayer label="Story" caption="c" slides={slides()} auto slideMs={40} onClose={onClose} />);
    await waitFor(() => expect(heading()).toHaveTextContent("Slide three"), { timeout: 10000 });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 200));
    });
    expect(heading()).toHaveTextContent("Slide three");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("pauses with its button; without a clock (reduced motion) it is still and shows the count instead", async () => {
    const { unmount } = render(<YearPlayer label="Story" caption="c" slides={slides()} auto slideMs={60} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Pause the story" }));
    expect(screen.getByRole("button", { name: "Play the story" })).toHaveAttribute("aria-pressed", "true");
    await act(async () => {
      await new Promise((r) => setTimeout(r, 250));
    });
    expect(heading()).toHaveTextContent("Slide one");
    unmount();

    render(<YearPlayer label="Story" caption="c" slides={slides()} auto={false} onClose={() => {}} />);
    expect(screen.queryByRole("button", { name: /^(Pause|Play) the story$/ })).toBeNull();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 200));
    });
    expect(heading()).toHaveTextContent("Slide one");
    fireEvent.keyDown(window, { key: " " });
    expect(heading()).toHaveTextContent("Slide two");
  });

  it("a tap on the right goes on, on the left goes back; the close button and a swipe down both leave", () => {
    const onClose = vi.fn();
    render(<YearPlayer label="Story" caption="c" slides={slides()} auto={false} onClose={onClose} />);
    const stage = screen.getByRole("region").parentElement as HTMLElement;
    stage.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 400,
      height: 700,
      right: 400,
      bottom: 700,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    const tap = (x: number, y0: number, y1 = y0) => {
      fireEvent.pointerDown(stage, { button: 0, clientX: x, clientY: y0 });
      fireEvent.pointerUp(stage, { button: 0, clientX: x, clientY: y1 });
    };
    tap(300, 300);
    expect(heading()).toHaveTextContent("Slide two");
    tap(40, 300);
    expect(heading()).toHaveTextContent("Slide one");
    tap(200, 200, 400);
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Close the story" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
