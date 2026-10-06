// Hand a file to the person: an anchor download on the web; Filesystem (Cache) + the share sheet on
// Android. Used only for the encrypted wax envelope and the sky poster.
import { isNative } from "./native";

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export async function saveFile(blob: Blob, name: string, title = name): Promise<void> {
  if (isNative()) {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");
    const written = await Filesystem.writeFile({ path: name, data: toBase64(await blob.arrayBuffer()), directory: Directory.Cache });
    await Share.share({ title, files: [written.uri] });
    return;
  }
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
}
