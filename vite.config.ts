import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const pkg = JSON.parse(readFileSync("./package.json", "utf8")) as {
  version: string;
  dependencies: Record<string, string>;
};
const isAndroid = process.env.VITE_PLATFORM === "android";
const base = process.env.VITE_BASE_PATH ?? "/";
const empty = fileURLToPath(new URL("./src/shims/empty.ts", import.meta.url));

/** Keeps the CSP script hashes in step with the inline scripts actually shipped in index.html. */
function cspInlineHashes(): Plugin {
  return {
    name: "csp-inline-hashes",
    enforce: "post",
    transformIndexHtml(html) {
      const hashes = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(
        (m) =>
          `'sha256-${createHash("sha256")
            .update(m[1] ?? "")
            .digest("base64")}'`,
      );
      return html.replace(/(script-src [^;]*?)(?: 'sha256-[^']+')+/, `$1 ${hashes.join(" ")}`);
    },
  };
}

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __ENGINE_BUILD__: JSON.stringify(pkg.dependencies["astronomy-engine"]),
  },
  resolve: {
    // @techstark/opencv-js reaches for Node built-ins that never run in the browser.
    // Exact-match regexes only, so `node:fs` and our own paths are untouched.
    alias: [
      { find: /^fs$/, replacement: empty },
      { find: /^path$/, replacement: empty },
      { find: /^crypto$/, replacement: empty },
    ],
  },
  worker: { format: "es" },
  plugins: [
    react(),
    tailwindcss(),
    cspInlineHashes(),
    // No service worker inside the Capacitor WebView: the APK ships every asset.
    ...(isAndroid
      ? []
      : [
          VitePWA({
            registerType: "prompt",
            injectRegister: false,
            includeAssets: ["favicon.svg", "grain.svg", "seal-edge.svg", "icon.svg"],
            manifest: {
              name: "Vyom",
              short_name: "Vyom",
              description: "Your sky, explained — Indian astrology in plain English, private and offline",
              lang: "en-IN",
              theme_color: "#04050d",
              background_color: "#04050d",
              display: "standalone",
              orientation: "portrait",
              start_url: base,
              scope: base,
              icons: [
                { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
                { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
                { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
              ],
            },
            workbox: {
              globPatterns: ["**/*.{js,css,html,svg,png,woff2,webmanifest,webm,mp3,bin,gz}"],
              globIgnores: ["**/models/**", "**/mediapipe/**", "**/*.wasm", "**/opencv*.js", "**/cv-*.js", "**/SkyDome-*.js"],
              maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
              navigateFallback: `${base}index.html`,
              runtimeCaching: [
                {
                  urlPattern: /\/models\/.*\.task$/,
                  handler: "CacheFirst",
                  options: { cacheName: "chowki-models", expiration: { maxEntries: 4 } },
                },
                {
                  urlPattern: /\/(mediapipe|assets\/(opencv|cv)).*\.(wasm|js)$/,
                  handler: "CacheFirst",
                  options: { cacheName: "chowki-cv", expiration: { maxEntries: 12 } },
                },
                { urlPattern: /SkyDome-.*\.js$/, handler: "CacheFirst", options: { cacheName: "chowki-sky" } },
                { urlPattern: /geocoding-api\.open-meteo\.com/, handler: "NetworkOnly" },
                { urlPattern: /nominatim\.openstreetmap\.org/, handler: "NetworkOnly" },
              ],
            },
          }),
        ]),
  ],
  build: {
    target: "es2022",
    sourcemap: false,
    chunkSizeWarningLimit: 12000,
  },
});
