// Getting a drawn card out of the app: the system share sheet with the picture as a file where the
// browser has one, the Capacitor path the sky poster uses on Android, a plain download otherwise.
// Nothing is uploaded: the picture is handed to the device, and the person picks where it goes.
import { isNative } from "../../platform/native";
import { savePoster } from "../sky/poster";

export type ShareOutcome = "shared" | "saved" | "cancelled";

function pngFile(canvas: HTMLCanvasElement, filename: string): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(new File([blob], filename, { type: "image/png" }));
      else reject(new Error("The picture could not be encoded"));
    }, "image/png");
  });
}

const cancelled = (e: unknown): boolean =>
  typeof e === "object" && e !== null && ((e as { name?: string }).name === "AbortError" || /cancel/i.test(String((e as Error).message)));

/** Download the card (on Android: the share sheet, which is also where "save" lives). */
export async function saveCard(canvas: HTMLCanvasElement, filename: string, title: string): Promise<ShareOutcome> {
  try {
    await savePoster(canvas, filename, { title, dialogTitle: "Share the picture" });
  } catch (e) {
    if (cancelled(e)) return "cancelled";
    throw e;
  }
  return isNative() ? "shared" : "saved";
}

/**
 * Share the card as an image file. A browser that cannot share files saves the picture instead;
 * closing the share sheet without choosing is not an error.
 */
export async function shareCard(canvas: HTMLCanvasElement, filename: string, title: string): Promise<ShareOutcome> {
  if (isNative()) return saveCard(canvas, filename, title);
  const file = await pngFile(canvas, filename);
  const nav = typeof navigator === "undefined" ? undefined : navigator;
  if (nav && typeof nav.share === "function" && typeof nav.canShare === "function" && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title });
      return "shared";
    } catch (e) {
      if (cancelled(e)) return "cancelled";
      // refused for another reason (no user gesture left, a policy): fall through and save it
    }
  }
  return saveCard(canvas, filename, title);
}
