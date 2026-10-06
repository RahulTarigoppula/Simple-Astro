// The read side of the one-way data flow: Dexie live queries + memoised engine calls.
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { db } from "../data/db";
import { castPatri } from "../data/repo";
import { DEFAULT_SETTINGS, type EnginePreset, type Patri, type Profile, type Settings } from "../engine/types";

const mergeRow = (v: Partial<Settings>): Settings => ({ ...DEFAULT_SETTINGS, ...v, preset: { ...DEFAULT_SETTINGS.preset, ...v.preset } });

export function useSettings(): Settings {
  return useSettingsLoaded() ?? DEFAULT_SETTINGS;
}

/** undefined until IndexedDB has answered — use it where a default would be a wrong answer. */
export function useSettingsLoaded(): Settings | undefined {
  const row = useLiveQuery(async () => (await db.settings.get("app")) ?? null, []);
  if (row === undefined) return undefined;
  return row ? mergeRow(row.value) : DEFAULT_SETTINGS;
}

/** undefined while loading, [] when the bundle is empty. */
export function useProfiles(): Profile[] | undefined {
  return useLiveQuery(() => db.profiles.orderBy("updatedAt").reverse().toArray(), []);
}

/** undefined while loading, null when the leaf is not in the bundle. */
export function useProfile(id: string | undefined): Profile | null | undefined {
  return useLiveQuery(async () => (id ? ((await db.profiles.get(id)) ?? null) : null), [id]);
}

/** The active profile: the setting if it still exists, else the most recently touched leaf. */
export function useActiveProfile(): Profile | null | undefined {
  const settings = useSettings();
  const profiles = useProfiles();
  if (profiles === undefined) return undefined;
  if (profiles.length === 0) return null;
  return profiles.find((p) => p.id === settings.activeProfileId) ?? profiles[0] ?? null;
}

export interface PatriState {
  patri: Patri | null;
  error: Error | null;
  fromCache: boolean;
}

/** Cast (or read the cached) Patri for a profile under a preset. The draw is the wait. */
export function usePatri(profile: Profile | null | undefined, preset: EnginePreset, nonce = 0): PatriState {
  const [state, setState] = useState<PatriState>({ patri: null, error: null, fromCache: false });
  const key = profile ? `${profile.id}|${profile.updatedAt}|${JSON.stringify(preset)}|${nonce}` : "";
  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` captures profile + preset identity
  useEffect(() => {
    if (!profile) return;
    let live = true;
    const t0 = performance.now();
    castPatri(profile, preset, nonce > 0 ? { force: true } : {})
      .then((patri) => {
        if (live) setState({ patri, error: null, fromCache: performance.now() - t0 < 8 && patri.computedAt < Date.now() - 2000 });
      })
      .catch((error: unknown) => {
        if (live) setState((s) => ({ ...s, error: error instanceof Error ? error : new Error(String(error)) }));
      });
    return () => {
      live = false;
    };
  }, [key]);
  return state;
}
