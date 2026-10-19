// The Android build has no service worker (the APK ships every file), so the PWA register module
// is replaced with this no-op at build time (vite.config.ts, isAndroid).
export function registerSW(_options?: unknown): (reloadPage?: boolean) => Promise<void> {
  return async () => undefined;
}
