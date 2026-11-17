import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { horas } from "../../engine/muhurta";
import { computePanchang } from "../../engine/panchang";
import { computePatri, REFERENCE_PROFILE } from "../../engine/patri";
import { DEFAULT_PRESET } from "../../engine/types";
import { AskToday } from "./AskToday";
import { DayTimeline, hourKind } from "./DayTimeline";

const ZONE = "Asia/Kolkata";
const PLACE = { lat: 12.9716, lon: 77.5946 };
// Tuesday 17 November 2026, local noon in Bengaluru.
const NOON = Date.UTC(2026, 10, 17, 6, 30);
const p = computePanchang(NOON, PLACE, DEFAULT_PRESET);
const hours = horas(p.sunriseMs, p.sunsetMs, p.nextSunriseMs, p.vara.index).day;
const good = [hours[2], hours[3]].map((h) => ({ startMs: (h as { startMs: number }).startMs }));
const avoid: [number, number] = [(hours[9] as { startMs: number }).startMs + 60_000, (hours[10] as { endMs: number }).endMs - 60_000];

describe("DayTimeline", () => {
  it("names each hour's kind: good, the pause, or ordinary", () => {
    expect(hours.map((h) => hourKind(h, good, avoid))).toEqual([
      "plain",
      "plain",
      "good",
      "good",
      "plain",
      "plain",
      "plain",
      "plain",
      "plain",
      "pause",
      "pause",
      "plain",
    ]);
  });

  it("follows the clock until an hour is chosen, then reads the chosen hour and offers the way back", () => {
    const now = (hours[2] as { startMs: number }).startMs + 5 * 60_000;
    render(<DayTimeline hours={hours} good={good} avoid={avoid} nowMs={now} zone={ZONE} />);
    const slider = screen.getByRole("slider", { name: /Hours of daylight/ });
    expect(slider).toHaveAttribute("aria-valuenow", "3");
    expect(slider.getAttribute("aria-valuetext")).toMatch(/^\d{1,2}:\d\d am to \d{1,2}:\d\d am, \w+ hour\. A good hour\.$/);
    expect(screen.getByText(/^Now · /)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Back to now" })).toBeNull();

    fireEvent.keyDown(slider, { key: "End" });
    expect(slider).toHaveAttribute("aria-valuenow", "12");
    expect(slider.getAttribute("aria-valuetext")).toMatch(/An ordinary hour\.$/);
    fireEvent.keyDown(slider, { key: "ArrowLeft" });
    expect(slider.getAttribute("aria-valuetext")).toMatch(/Pause new starts\.$/);
    expect(screen.getByText(/^Rāhu Kāla runs .* Hold new starts/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back to now" }));
    expect(slider).toHaveAttribute("aria-valuenow", "3");
  });

  it("at night it opens on the first good hour and shows no 'now'", () => {
    render(<DayTimeline hours={hours} good={good} avoid={avoid} nowMs={p.sunsetMs + 3_600_000} zone={ZONE} />);
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "3");
    expect(screen.queryByText(/^Now · /)).toBeNull();
  });
});

describe("AskToday", () => {
  it("answers for today in a word, with a reason and the way to better days", () => {
    const patri = computePatri(REFERENCE_PROFILE, DEFAULT_PRESET, NOON);
    const dayStart = NOON - 43_200_000;
    render(
      <MemoryRouter>
        <AskToday patri={patri} profileId="abc" dayStartMs={dayStart} place={PLACE} zone={ZONE} preset={DEFAULT_PRESET} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Tap one for today's answer/)).toBeInTheDocument();
    const chip = screen.getByRole("button", { name: "Travel" });
    fireEvent.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/^(Strong|Good|Mixed|Go gently)$/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /See the best days to travel/ })).toHaveAttribute("href", "/pick/abc?for=travel");
    fireEvent.click(chip);
    expect(screen.getByText(/Tap one for today's answer/)).toBeInTheDocument();
  });
});
