import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db, type JournalRow } from "../../data/db";
import { saveJournalEntry, saveSettings, upsertProfile } from "../../data/repo";
import { REFERENCE_PROFILE } from "../../engine/patri";
import { DEFAULT_PRESET } from "../../engine/types";
import { JournalPrompt } from "./JournalPrompt";
import JournalScreen from "./JournalScreen";
import {
  addDays,
  agreed,
  byMonth,
  dayKey,
  exportText,
  gridWeeks,
  headline,
  isSkipped,
  noonMs,
  promptState,
  summarize,
  weekdayOf,
  weeksToShow,
} from "./logic";

const ZONE = "Asia/Kolkata";
const ID = REFERENCE_PROFILE.id;
// Tuesday 17 November 2026 in India
const EVENING = Date.UTC(2026, 10, 17, 13, 30); // 7:00 pm
const MORNING = Date.UTC(2026, 10, 17, 4, 30); // 10:00 am
const TODAY = "2026-11-17";

const clock = vi.hoisted(() => ({ now: 0 }));
vi.mock("../../app/useNow", () => ({ useNowMs: () => clock.now }));

const row = (day: string, mood: 1 | 2 | 3 | 4, tone: JournalRow["predictedTone"], note?: string): JournalRow => ({
  profileId: ID,
  day,
  mood,
  predictedTone: tone,
  predictedScore: tone ? 0.1 : null,
  createdAt: 1,
  updatedAt: 1,
  ...(note ? { note } : {}),
});

describe("journal logic", () => {
  it("day keys follow the reader's zone, and move by whole days", () => {
    expect(dayKey(EVENING, ZONE)).toBe(TODAY);
    expect(dayKey(Date.UTC(2026, 10, 17, 19, 0), ZONE)).toBe("2026-11-18"); // 00:30 next day in India
    expect(dayKey(Date.UTC(2026, 10, 17, 3, 0), "America/Denver")).toBe("2026-11-16");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(weekdayOf(TODAY)).toBe(1); // Tuesday, Monday = 0
    expect(weekdayOf("2026-11-22")).toBe(6);
  });

  it("noon of a day key is that day's local noon, wherever the zone is", () => {
    for (const zone of [ZONE, "America/Denver", "Pacific/Kiritimati", "Pacific/Pago_Pago", "UTC"]) {
      const t = noonMs(TODAY, zone);
      expect(dayKey(t, zone), zone).toBe(TODAY);
      expect(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: zone }).format(t), zone).toBe("12");
    }
  });

  it("agreed means the same half of the scale, and nothing when the sky's word is missing", () => {
    expect(agreed({ mood: 4, predictedTone: "bright" })).toBe(true);
    expect(agreed({ mood: 3, predictedTone: "bright" })).toBe(true);
    expect(agreed({ mood: 4, predictedTone: "steady" })).toBe(true);
    expect(agreed({ mood: 2, predictedTone: "testing" })).toBe(true);
    expect(agreed({ mood: 1, predictedTone: "mixed" })).toBe(true);
    expect(agreed({ mood: 2, predictedTone: "steady" })).toBe(false);
    expect(agreed({ mood: 3, predictedTone: "mixed" })).toBe(false);
    expect(agreed({ mood: 1, predictedTone: "bright" })).toBe(false);
    expect(agreed({ mood: 3, predictedTone: null })).toBeNull();
  });

  it("the sentence is a count from the data, and no statistic under five days", () => {
    expect(headline(summarize([]))).toBe("How did your day really go?");
    const four = [
      row("2026-11-10", 4, "bright"),
      row("2026-11-11", 3, "steady"),
      row("2026-11-12", 2, "mixed"),
      row("2026-11-13", 1, "testing"),
    ];
    expect(headline(summarize(four))).toBe("Note a few more days to see a pattern");
    const five = [...four, row("2026-11-14", 1, "bright")];
    expect(summarize(five)).toEqual({ noted: 5, compared: 5, agreed: 4 });
    expect(headline(summarize(five))).toBe("5 days noted. The sky and you agreed on 4.");
    // a day with no stored word from the sky is noted but not compared
    const six = [...five, row("2026-11-15", 3, null)];
    expect(summarize(six)).toEqual({ noted: 6, compared: 5, agreed: 4 });
    expect(headline(summarize(six))).toBe("6 days noted. The sky and you agreed on 4 of 5.");
    // five noted, only four comparable: still no statistic
    expect(headline(summarize([...four, row("2026-11-15", 3, null)]))).toBe("Note a few more days to see a pattern");
    for (const s of [headline(summarize(five)), headline(summarize(six))]) expect(s).not.toMatch(/right|wrong|prov|accura|correct/i);
  });

  it("the grid is whole weeks from Monday, ending with this week, five to eight of them", () => {
    const entries = [row("2026-11-02", 3, "steady"), row(TODAY, 4, "bright")];
    const weeks = gridWeeks(TODAY, 5, entries);
    expect(weeks).toHaveLength(5);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks[0]?.[0]?.day).toBe("2026-10-19");
    expect(weeks[4]?.[0]?.day).toBe("2026-11-16");
    expect(weeks[4]?.[1]).toMatchObject({ day: TODAY, today: true, future: false, entry: entries[1] });
    expect(weeks[4]?.[2]).toMatchObject({ day: "2026-11-18", future: true, entry: null });
    expect(weeks[2]?.[0]?.entry).toBe(entries[0]);
    expect(weeksToShow(TODAY, [])).toBe(5);
    expect(weeksToShow(TODAY, entries)).toBe(5);
    expect(weeksToShow(TODAY, [row("2026-10-01", 3, "steady")])).toBe(8);
    expect(weeksToShow(TODAY, [row("2026-01-01", 3, "steady")])).toBe(8);
    expect(gridWeeks(TODAY, 8, [])[0]?.[0]?.day).toBe("2026-09-28");
  });

  it("asks about today from 5 pm, about yesterday before that, and nothing once answered", () => {
    const none = () => false;
    expect(promptState(EVENING, ZONE, none)).toEqual({ kind: "ask", which: "today", day: TODAY });
    expect(promptState(Date.UTC(2026, 10, 17, 11, 30), ZONE, none)).toEqual({ kind: "ask", which: "today", day: TODAY }); // 5:00 pm
    expect(promptState(Date.UTC(2026, 10, 17, 11, 29), ZONE, none)).toEqual({ kind: "ask", which: "yesterday", day: "2026-11-16" });
    expect(promptState(MORNING, ZONE, (d) => d === "2026-11-16")).toEqual({ kind: "done", which: "yesterday", day: "2026-11-16" });
    expect(promptState(EVENING, ZONE, (d) => d === "2026-11-16")).toEqual({ kind: "ask", which: "today", day: TODAY });
    expect(promptState(MORNING, ZONE, (d) => d === TODAY)).toEqual({ kind: "done", which: "today", day: TODAY });
  });

  it("groups by month, newest first, and exports as plain text", () => {
    const entries = [row("2026-10-30", 2, "mixed"), row("2026-11-02", 3, "steady", "long walk"), row(TODAY, 4, null)];
    const months = byMonth(entries);
    expect(months.map((m) => m.label)).toEqual(["November 2026", "October 2026"]);
    expect(months[0]?.rows.map((r) => r.day)).toEqual([TODAY, "2026-11-02"]);
    expect(exportText("Rahul", entries)).toBe(
      [
        "Rahul's days, from Vyomaphala",
        "",
        "Tue, 17 Nov 2026: Great",
        "Mon, 2 Nov 2026: Good (the sky said Good)\n  long walk",
        "Fri, 30 Oct 2026: Mixed (the sky said Mixed)",
      ].join("\n"),
    );
  });
});

function renderPrompt(nowMs: number, props: Partial<React.ComponentProps<typeof JournalPrompt>> = {}) {
  const router = createMemoryRouter(
    [
      { path: "/", element: <JournalPrompt profile={REFERENCE_PROFILE} zone={ZONE} nowMs={nowMs} tone="bright" score={0.62} {...props} /> },
      { path: "*", element: <p>elsewhere</p> },
    ],
    { initialEntries: ["/"] },
  );
  return render(<RouterProvider router={router} />);
}

function renderScreen(path = "/journal") {
  const router = createMemoryRouter(
    [
      { path: "/journal", element: <JournalScreen /> },
      { path: "/journal/:id", element: <JournalScreen /> },
      { path: "*", element: <p>elsewhere</p> },
    ],
    { initialEntries: [path] },
  );
  return render(<RouterProvider router={router} />);
}

beforeAll(() => {
  for (const m of ["showModal", "close"] as const) {
    if (!(m in HTMLDialogElement.prototype)) {
      Object.defineProperty(HTMLDialogElement.prototype, m, {
        configurable: true,
        value(this: HTMLDialogElement) {
          this.open = m === "showModal";
        },
      });
    }
  }
});

beforeEach(async () => {
  localStorage.clear();
  clock.now = EVENING;
  await db.delete();
  await db.open();
  await upsertProfile(REFERENCE_PROFILE);
  await saveSettings({ activeProfileId: ID, preset: DEFAULT_PRESET });
});

describe("JournalPrompt, the one-tap card", () => {
  it("in the evening: one tap saves today with what the sky had said, then note and undo", async () => {
    renderPrompt(EVENING);
    expect(await screen.findByRole("heading", { name: "How did today go?" })).toBeInTheDocument();
    const group = screen.getByRole("group", { name: "How did today go?" });
    expect(
      within(group)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(["Great", "Good", "Mixed", "Hard"]);
    fireEvent.click(within(group).getByRole("button", { name: "Good" }));

    expect(await screen.findByText(/The sky said Strong\. You said Good\./)).toBeInTheDocument();
    expect(screen.getByText("Thank you. Noted.")).toBeInTheDocument();
    expect(await db.journal.get([ID, TODAY])).toMatchObject({ mood: 3, predictedTone: "bright", predictedScore: 0.62 });
    expect(screen.getByRole("link", { name: /Your days/ })).toHaveAttribute("href", `/journal/${ID}`);

    fireEvent.click(screen.getByRole("button", { name: "Add a note" }));
    fireEvent.change(screen.getByRole("textbox", { name: /A few words about the day/ }), {
      target: { value: "  a long walk by the lake " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save note" }));
    await waitFor(async () => expect((await db.journal.get([ID, TODAY]))?.note).toBe("a long walk by the lake"));
    expect(await screen.findByRole("button", { name: "Edit note" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    await waitFor(async () => expect(await db.journal.count()).toBe(0));
    expect(await screen.findByRole("heading", { name: "How did today go?" })).toBeInTheDocument();
  });

  it("in the morning: asks about yesterday and works out yesterday's sky itself", async () => {
    renderPrompt(MORNING);
    expect(await screen.findByRole("heading", { name: "How did yesterday go?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Hard" }));
    expect(
      await screen.findByText(/The sky said (Strong|Good|Mixed|Go gently)\. You said Hard\./, {}, { timeout: 10000 }),
    ).toBeInTheDocument();
    const saved = await db.journal.get([ID, "2026-11-16"]);
    expect(saved?.mood).toBe(1);
    expect(["bright", "steady", "mixed", "testing"]).toContain(saved?.predictedTone);
    expect(saved?.predictedScore).toBeGreaterThanOrEqual(-1);
    expect(saved?.predictedScore).toBeLessThanOrEqual(1);
    expect(await db.journal.get([ID, TODAY])).toBeUndefined();
  });

  it("once answered it is one quiet line", async () => {
    await saveJournalEntry({ profileId: ID, day: TODAY, mood: 4, predictedTone: "steady", predictedScore: 0.1 });
    renderPrompt(EVENING);
    const line = await screen.findByRole("link", { name: "Your days. Today you said Great." });
    expect(line).toHaveAttribute("href", `/journal/${ID}`);
    expect(screen.queryByRole("group")).toBeNull();
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("never nags: Not today hides it for the day, also after coming back", async () => {
    const first = renderPrompt(EVENING);
    fireEvent.click(await screen.findByRole("button", { name: "Not today" }));
    expect(screen.queryByRole("heading", { name: "How did today go?" })).toBeNull();
    expect(isSkipped(ID, TODAY)).toBe(true);
    expect(Object.keys(localStorage).every((k) => k.startsWith("vyom-"))).toBe(true);
    first.unmount();
    const again = renderPrompt(EVENING);
    await waitFor(async () => expect(await db.profiles.count()).toBe(1));
    await new Promise((r) => setTimeout(r, 50));
    expect(again.container.querySelector(".jr-prompt")).toBeNull();
    again.unmount();
    // the next evening it may ask again
    renderPrompt(EVENING + 86_400_000);
    expect(await screen.findByRole("heading", { name: "How did today go?" })).toBeInTheDocument();
  });
});

describe("JournalScreen", () => {
  it("empty: explains the idea and lets you note today right there", async () => {
    renderScreen();
    expect(await screen.findByRole("heading", { level: 1, name: "How did your day really go?" })).toBeInTheDocument();
    expect(await screen.findByText(/Each evening, say in one tap how the day really went\./)).toBeInTheDocument();
    // the picture is there from the first day: five weeks, today marked
    expect(screen.getByRole("button", { name: /^Tuesday 17 November, today\. Not noted/ })).toBeInTheDocument();
    expect(screen.getAllByRole("list", { name: /^Week of/ })).toHaveLength(5);
    fireEvent.click(within(screen.getByRole("group", { name: "How did today go?" })).getByRole("button", { name: "Mixed" }));
    expect(await screen.findByText(/You said Mixed\./, { selector: ".jr-prompt__thanks span" }, { timeout: 10000 })).toBeInTheDocument();
    expect((await db.journal.get([ID, TODAY]))?.mood).toBe(2);
    expect(await screen.findByRole("heading", { level: 1, name: "Note a few more days to see a pattern" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: /November 2026/ })).toBeInTheDocument();
  });

  it("with days noted: the count on the band, the list by month, and a day can be changed or deleted", async () => {
    const days: Array<[string, 1 | 2 | 3 | 4, JournalRow["predictedTone"]]> = [
      ["2026-11-09", 4, "bright"],
      ["2026-11-10", 3, "steady"],
      ["2026-11-11", 2, "bright"],
      ["2026-11-12", 1, "testing"],
      ["2026-11-13", 3, "mixed"],
      ["2026-10-28", 2, "mixed"],
    ];
    for (const [day, mood, tone] of days) await saveJournalEntry({ profileId: ID, day, mood, predictedTone: tone, predictedScore: 0 });
    await saveJournalEntry({ profileId: ID, day: "2026-11-12", mood: 1, note: "a hard meeting" });
    renderScreen(`/journal/${ID}`);
    expect(await screen.findByRole("heading", { level: 1, name: "6 days noted. The sky and you agreed on 4." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Wednesday 11 November. You said Mixed. The sky said Strong." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: /November 2026/ })).toBeInTheDocument();
    // older months wait behind a fold
    expect(screen.getByText("Earlier days").closest("details")).toHaveTextContent("October 2026");
    expect(screen.getByText("a hard meeting")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/streak|proven|accuracy/i);

    // change a day's word: the sky's stored word stays
    fireEvent.click(
      screen.getByRole("button", { name: /^Thursday 12 November\. You said Hard\. The sky said Go gently\. Change or delete\.$/ }),
    );
    const dlg = await screen.findByRole("dialog", { name: "Your day, Thursday 12 November" });
    expect(within(dlg).getByText("The sky said Go gently.")).toBeInTheDocument();
    expect(within(dlg).getByRole("button", { name: "Hard" })).toHaveAttribute("aria-pressed", "true");
    expect(within(dlg).getByRole("textbox")).toHaveValue("a hard meeting");
    fireEvent.click(within(dlg).getByRole("button", { name: "Good" }));
    fireEvent.click(within(dlg).getByRole("button", { name: "Save" }));
    await waitFor(async () =>
      expect(await db.journal.get([ID, "2026-11-12"])).toMatchObject({ mood: 3, predictedTone: "testing", note: "a hard meeting" }),
    );
    expect(await screen.findByRole("heading", { level: 1, name: "6 days noted. The sky and you agreed on 3." })).toBeInTheDocument();

    // delete one from the grid
    fireEvent.click(screen.getByRole("button", { name: "Monday 9 November. You said Great. The sky said Strong." }));
    const dlg2 = await screen.findByRole("dialog", { name: "Your day, Monday 9 November" });
    fireEvent.click(within(dlg2).getByRole("button", { name: "Delete this day" }));
    await waitFor(async () => expect(await db.journal.get([ID, "2026-11-09"])).toBeUndefined());
    expect(await screen.findByRole("heading", { level: 1, name: "5 days noted. The sky and you agreed on 2." })).toBeInTheDocument();
  });
});
