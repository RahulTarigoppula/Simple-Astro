import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { moonTransitAt } from "../../engine/gochar";
import { computePatri, REFERENCE_PROFILE } from "../../engine/patri";
import { resolveBirthMoment } from "../../engine/time";
import { DEFAULT_PRESET, type Place, type Profile } from "../../engine/types";
import { moonAcrossDay, moonDaySentence, TimeUnknownNote } from "./TimeUnknownNote";

const SANTIAGO: Place = { name: "Santiago", country: "CL", lat: -33.4489, lon: -70.6693, source: "manual" };

/** A time-unknown leaf cast for local noon on the given day. */
function noonLeaf(place: Place, y: number, mo: number, d: number): Profile {
  const birth = resolveBirthMoment({ localY: y, localMo: mo, localD: d, localH: 12, localMi: 0, place });
  return { ...REFERENCE_PROFILE, id: `t-${y}-${mo}-${d}`, birth, timeUnknown: true };
}

describe("TimeUnknownNote", () => {
  it("retries at 01:00 when midnight did not exist (Chile's clock change at 00:00)", () => {
    const leaf = noonLeaf(SANTIAGO, 2022, 9, 11);
    expect(() =>
      resolveBirthMoment({ localY: 2022, localMo: 9, localD: 11, localH: 0, localMi: 0, place: SANTIAGO, zoneOverride: leaf.birth.zone }),
    ).toThrow();
    const { dawn, dusk } = moonAcrossDay(leaf, DEFAULT_PRESET);
    const one = resolveBirthMoment({ localY: 2022, localMo: 9, localD: 11, localH: 1, localMi: 0, place: SANTIAGO });
    expect(dawn).toEqual(moonTransitAt(one.utcMs, DEFAULT_PRESET));
    expect(dusk).not.toBeNull();
  });

  it("does not claim the Moon stayed when an end of the day could not be checked", () => {
    const noon = { sign: 0, nakshatra: 1 } as const;
    const text = moonDaySentence(null, noon, noon);
    expect(text).toMatch(/could not be checked/);
    expect(text).not.toMatch(/stayed in|hold\./);
    expect(moonDaySentence(noon, noon, noon)).toMatch(/stayed in Bharaṇī/);
    expect(moonDaySentence(noon, { sign: 0, nakshatra: 2 }, noon)).toMatch(/moved that day/);
  });

  it("is a caveat that survives print", () => {
    const leaf = noonLeaf(REFERENCE_PROFILE.birth.place, 1994, 3, 14);
    const patri = computePatri(leaf, DEFAULT_PRESET, 0);
    render(<TimeUnknownNote profile={leaf} patri={patri} />);
    const note = screen.getByRole("note");
    expect(note).toHaveClass("note-haldi", "note--keep");
    expect(note).toHaveTextContent(/Birth time unknown — cast for local noon/);
  });
});
