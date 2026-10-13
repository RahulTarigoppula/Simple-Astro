// Loads the bundled star catalogue once (a same-origin, precached asset, never the network).
import starsUrl from "../../data/bsc5.bin?url";
import { decodeStars, type StarCatalog } from "../../engine/sky/stars";

let pending: Promise<StarCatalog> | null = null;

export function loadStars(): Promise<StarCatalog> {
  pending ??= fetch(starsUrl)
    .then((r) => {
      if (!r.ok) throw new Error(`star catalogue: ${r.status}`);
      return r.arrayBuffer();
    })
    .then(decodeStars)
    .catch((e: unknown) => {
      pending = null;
      throw e;
    });
  return pending;
}
